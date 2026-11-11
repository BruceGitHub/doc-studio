import fs from 'node:fs'
import path from 'node:path'
import type { ServerResponse } from 'node:http'
import Fastify, { type FastifyInstance } from 'fastify'
import fastifyStatic from '@fastify/static'
import {
  APP_VERSION,
  compareDocs,
  safeDecode,
  Vault,
  type AttentionDTO,
  type DirNodeDTO,
  type DocDetailDTO,
  type DocRecord,
  type DoctorDTO,
  type DoctorGroupDTO,
  type GraphDTO,
  type IssueDTO,
  type IssueKind,
  type MetaDTO,
  type ProjectDetailDTO,
  type ProjectSummaryDTO,
  type RefreshResult,
  type SearchHitDTO,
} from '@docstudio/core'
import { openInEditor, editorUrl } from './editor.js'
import { toEdge, toIssue, toSummary } from './mappers.js'
import { buildNavTree } from './nav.js'
import { loadState, saveState, type StudioState } from './state.js'
import { buildProjectTree } from './tree.js'
import { startWatcher, type VaultWatcher } from './watcher.js'

export interface CreateServerOptions {
  root: string
  webDir?: string | null
  editor?: string
  watch?: boolean
}

export interface ServerHandle {
  app: FastifyInstance
  vault: Vault
  state: StudioState
  close: () => Promise<void>
}

export async function createServer(options: CreateServerOptions): Promise<ServerHandle> {
  const vault = Vault.open(options.root)
  const state = loadState(vault.root)
  const editor = options.editor ?? 'code'
  // Inside a container the editor lives on the host: a browser URL scheme is
  // the only way to reach it. `DOCSTUDIO_HOST_VAULT` maps the vault mount to
  // the host path; locally the served root already is the host path.
  const hostRoot =
    process.env.DOCSTUDIO_HOST_VAULT?.trim() || (isContainer() ? null : vault.root)
  const editorUrlTemplate = process.env.DOCSTUDIO_EDITOR_URL?.trim() || null
  const app = Fastify({ logger: false, bodyLimit: 1_000_000 })
  const clients = new Set<ServerResponse>()

  // Index data must never be served from a browser cache: every reindex has to
  // be visible on the next refetch.
  app.addHook('onSend', async (request, reply, payload) => {
    if (request.url.startsWith('/api/')) {
      reply.header('Cache-Control', 'no-store')
    }
    return payload
  })

  const broadcast = (payload: unknown): void => {
    const frame = `event: reindex\ndata: ${JSON.stringify(payload)}\n\n`
    for (const client of clients) {
      try {
        client.write(frame)
      } catch {
        clients.delete(client)
      }
    }
  }

  const meta = (): MetaDTO => {
    const stats = vault.stats()
    const unread = vault.allDocs().filter((doc) => !state.seen[doc.id]).length
    return {
      root: vault.root,
      name: vault.name,
      version: APP_VERSION,
      lastIndexedAt: vault.lastIndexedAt,
      lastVisitAt: state.lastVisitAt,
      counts: {
        docs: stats.docs,
        projects: stats.projects,
        open: stats.open,
        errors: stats.errors,
        warnings: stats.warnings,
        unread,
      },
      types: stats.byType,
      statuses: stats.byStatus,
    }
  }

  app.get('/api/meta', async () => meta())

  app.get('/api/projects', async () => vault.projects() satisfies ProjectSummaryDTO[])

  app.get('/api/tree', async () => buildNavTree(vault, state) satisfies DirNodeDTO)

  app.get('/api/projects/:name', async (request, reply) => {
    const { name } = request.params as { name: string }
    const project = vault.project(name)
    if (!project) return reply.code(404).send({ error: `Project not found: ${name}` })

    const docs = vault.docsInProject(name)
    const types: Record<string, number> = {}
    for (const doc of docs) types[doc.type] = (types[doc.type] ?? 0) + 1

    const recent = [...docs]
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, 10)
      .map((doc) => toSummary(doc, state))

    const issues = vault
      .issues()
      .filter((issue) => issue.docId.startsWith(`${name}/`) || name === docProject(issue.docId))
      .map((issue) => toIssue(issue, vault, state))
      .filter((issue): issue is IssueDTO => issue !== null)

    const payload: ProjectDetailDTO = {
      project,
      tree: buildProjectTree(vault, name, state),
      recent,
      issues,
      types,
    }
    return payload
  })

  app.get('/api/docs/*', async (request, reply) => {
    const wildcard = (request.params as { '*': string })['*'] ?? ''
    const id = normalizeDocId(wildcard)
    const doc = vault.getDoc(id)
    if (!doc) return reply.code(404).send({ error: `Document not found: ${id}` })

    const project = vault.project(doc.project)
    const breadcrumb: DocDetailDTO['breadcrumb'] = []
    const seen = new Set<string>([doc.id])
    let cursor = doc.parent
    while (cursor && !seen.has(cursor) && breadcrumb.length < 20) {
      seen.add(cursor)
      const parent = vault.getDoc(cursor)
      if (!parent) break
      breadcrumb.unshift(toSummary(parent, state))
      cursor = parent.parent
    }
    if (
      project?.rootId &&
      doc.id !== project.rootId &&
      !breadcrumb.some((entry) => entry.id === project.rootId)
    ) {
      const root = vault.getDoc(project.rootId)
      if (root) breadcrumb.unshift(toSummary(root, state))
    }

    const children = doc.children
      .map((childId) => vault.getDoc(childId))
      .filter((child): child is NonNullable<typeof child> => child !== null)
      .sort(compareDocRecords)
      .map((child) => toSummary(child, state))

    const payload: DocDetailDTO = {
      doc: {
        ...toSummary(doc, state),
        body: doc.body,
        headings: doc.headings,
        frontmatter: doc.frontmatter,
        hasReferencesSection: doc.hasReferencesSection,
        ...(doc.parseError ? { parseError: doc.parseError } : {}),
      },
      breadcrumb,
      children,
      outgoing: doc.outgoing.map((edge) => toEdge(edge, 'out', vault, state)),
      backlinks: [...doc.backlinks]
        .sort((a, b) => a.kind.localeCompare(b.kind))
        .map((edge) => toEdge(edge, 'in', vault, state)),
      issues: vault
        .issues()
        .filter((issue) => issue.docId === doc.id)
        .map((issue) => toIssue(issue, vault, state))
        .filter((issue): issue is IssueDTO => issue !== null),
    }
    return payload
  })

  app.get('/api/search', async (request) => {
    const query = request.query as {
      q?: string
      project?: string
      type?: string
      status?: string
      limit?: string
    }
    const limit = Number.parseInt(query.limit ?? '30', 10)
    const hits = vault.search(query.q ?? '', {
      project: query.project,
      type: query.type,
      status: query.status,
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 30,
    })
    return hits.map<SearchHitDTO>((hit) => ({
      doc: toSummary(hit.doc, state),
      score: Math.round(hit.score * 100) / 100,
      snippet: hit.snippet,
      matched: hit.matched,
    }))
  })

  app.get('/api/attention', async () => {
    const changed = vault
      .changesSince(state.lastVisitAt)
      .slice(0, 25)
      .map((doc) => toSummary(doc, state))

    const unread = vault
      .allDocs()
      .filter((doc) => !state.seen[doc.id])
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, 12)
      .map((doc) => toSummary(doc, state))

    const errors = vault
      .issues()
      .filter((issue) => issue.severity === 'error')
      .slice(0, 15)
      .map((issue) => toIssue(issue, vault, state))
      .filter((issue): issue is IssueDTO => issue !== null)

    const payload: AttentionDTO = {
      since: state.lastVisitAt,
      changed,
      openThreads: vault
        .openThreads()
        .slice(0, 12)
        .map((doc) => toSummary(doc, state)),
      unread,
      errors,
    }
    return payload
  })

  app.get('/api/doctor', async () => {
    const groups = new Map<IssueKind, IssueDTO[]>()
    for (const issue of vault.issues()) {
      const dto = toIssue(issue, vault, state)
      if (!dto) continue
      const list = groups.get(issue.kind) ?? []
      list.push(dto)
      groups.set(issue.kind, list)
    }

    const result: DoctorGroupDTO[] = [...groups.entries()]
      .map(([kind, issues]) => ({
        kind,
        severity: issues[0]?.severity ?? 'warning',
        issues,
      }))
      .sort((a, b) => {
        if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1
        return a.kind.localeCompare(b.kind)
      })

    const payload: DoctorDTO = {
      totals: {
        errors: vault.stats().errors,
        warnings: vault.stats().warnings,
        docs: vault.stats().docs,
        groups: result.length,
      },
      groups: result,
    }
    return payload
  })

  app.get('/api/graph', async (request, reply) => {
    const query = request.query as { focus?: string; depth?: string }
    if (!query.focus) return reply.code(400).send({ error: 'Missing focus' })
    const depth = Number.parseInt(query.depth ?? '1', 10)
    const graph = vault.graph(query.focus, Number.isFinite(depth) ? depth : 1)
    if (!graph) return reply.code(404).send({ error: `Document not found: ${query.focus}` })
    const payload: GraphDTO = {
      focus: graph.focus,
      nodes: graph.nodes.map((doc) => ({
        id: doc.id,
        title: doc.title,
        type: doc.type,
        status: doc.status,
        project: doc.project,
      })),
      links: graph.links,
    }
    return payload
  })

  app.post('/api/seen', async (request, reply) => {
    const body = request.body as { id?: string } | undefined
    const id = body?.id
    if (!id || !vault.getDoc(id)) {
      return reply.code(400).send({ error: 'Unknown document' })
    }
    state.seen[id] = new Date().toISOString()
    saveState(vault.root, state)
    broadcast({ added: [], updated: [], removed: [], seen: id })
    return { ok: true }
  })

  // Global counterpart of /api/seen: mark the whole current index as read so
  // the unread counters start from zero. Documents added later stay unread.
  app.post('/api/seen-all', async () => {
    const at = new Date().toISOString()
    const docs = vault.allDocs()
    for (const doc of docs) state.seen[doc.id] = at
    saveState(vault.root, state)
    broadcast({
      added: [],
      updated: [],
      removed: [],
      seen: docs.map((doc) => doc.id),
    })
    return { ok: true, marked: docs.length }
  })

  app.post('/api/visit', async () => {
    state.lastVisitAt = new Date().toISOString()
    saveState(vault.root, state)
    return { ok: true, lastVisitAt: state.lastVisitAt }
  })

  app.post('/api/open', async (request, reply) => {
    const body = request.body as { id?: string; line?: number } | undefined
    const doc = body?.id ? vault.getDoc(body.id) : null
    if (!doc) return reply.code(400).send({ error: 'Unknown document' })
    const result = await openInEditor(doc.absPath, editor, body?.line)
    const url = editorUrl({
      editorCommand: editor,
      hostRoot,
      relativePath: path.relative(vault.root, doc.absPath),
      line: body?.line,
      template: editorUrlTemplate,
    })
    return url ? { ...result, url } : result
  })

  app.post('/api/refresh', async () => {
    const result = vault.refresh()
    broadcast({ ...result, at: new Date().toISOString() })
    return result satisfies RefreshResult
  })

  app.get('/api/events', (request, reply) => {
    reply.hijack()
    const response = reply.raw
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    response.write(': connected\n\n')
    clients.add(response)

    const keepAlive = setInterval(() => {
      try {
        response.write(': ping\n\n')
      } catch {
        clients.delete(response)
      }
    }, 25_000)

    request.raw.on('close', () => {
      clearInterval(keepAlive)
      clients.delete(response)
      response.end()
    })
  })

  const webDir = options.webDir && isDirectory(options.webDir) ? options.webDir : null
  if (webDir) {
    await app.register(fastifyStatic, {
      root: webDir,
      prefix: '/',
      wildcard: true,
    })
  }

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.code(404).send({ error: `Not found: ${request.method} ${request.url}` })
    }
    if (webDir) return reply.sendFile('index.html')
    return reply
      .type('text/plain')
      .send('Doc Studio API is running. Build the web UI with `pnpm build`, or run `pnpm dev`.')
  })

  let watcher: VaultWatcher | null = null
  if (options.watch !== false) {
    watcher = startWatcher(vault, (result) => {
      broadcast({ ...result, at: new Date().toISOString() })
    })
  }

  return {
    app,
    vault,
    state,
    close: async () => {
      await watcher?.close()
      for (const client of clients) {
        try {
          client.end()
        } catch {
          // already closed
        }
      }
      clients.clear()
      await app.close()
    },
  }
}

export interface StartServerOptions extends CreateServerOptions {
  port: number
  host: string
}

export async function startServer(options: StartServerOptions): Promise<ServerHandle> {
  const handle = await createServer(options)
  await handle.app.listen({ port: options.port, host: options.host })
  return handle
}

function normalizeDocId(raw: string): string {
  return safeDecode(raw)
    .replace(/^\/+/, '')
    .replace(/\.(md|markdown)$/i, '')
}

function isDirectory(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isDirectory()
  } catch {
    return false
  }
}

function isContainer(): boolean {
  return fs.existsSync('/.dockerenv') || fs.existsSync('/run/.containerenv')
}

function docProject(docId: string): string {
  return docId.includes('/') ? (docId.split('/')[0] ?? 'vault') : 'vault'
}

function compareDocRecords(a: DocRecord, b: DocRecord): number {
  return compareDocs(a, b)
}
