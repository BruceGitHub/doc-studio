import fs from 'node:fs'
import path from 'node:path'
import { isOpenStatus, typeRank } from './constants.js'
import { parseDoc } from './parse.js'
import { resolveRefs } from './resolve.js'
import { scanVault } from './scan.js'
import { SearchIndex } from './search.js'
import type {
  DocRecord,
  GraphData,
  GraphLink,
  Issue,
  ParsedDoc,
  ProjectSummary,
  RefreshResult,
  SearchFilters,
  SearchHit,
  VaultStats,
} from './types.js'

const CACHE_VERSION = 3
const DEFAULT_STALE_DAYS = 21

export interface VaultOptions {
  ignore?: string[]
  referenceHeadings?: string[]
  extensions?: string[]
  staleDays?: number
  persistCache?: boolean
}

interface ResolvedOptions {
  ignore: string[]
  referenceHeadings: string[]
  extensions: string[]
  staleDays: number
  persistCache: boolean
}

interface CacheFile {
  version: number
  signature: string
  files: Record<string, ParsedDoc>
}

export class Vault {
  readonly root: string
  readonly name: string
  lastIndexedAt = new Date(0).toISOString()

  private readonly options: ResolvedOptions
  private readonly cacheDir: string
  private readonly cachePath: string
  private cache: CacheFile
  private parsed = new Map<string, ParsedDoc>()
  private docs = new Map<string, DocRecord>()
  private projectsList: ProjectSummary[] = []
  private issuesList: Issue[] = []
  private projectRoots = new Map<string, string | null>()
  private searchIndex: SearchIndex | null = null

  private constructor(root: string, options: VaultOptions) {
    this.root = path.resolve(root)
    this.name = path.basename(this.root)
    this.options = {
      ignore: options.ignore ?? [],
      referenceHeadings: options.referenceHeadings ?? [],
      extensions: options.extensions ?? ['.md'],
      staleDays: options.staleDays ?? DEFAULT_STALE_DAYS,
      persistCache: options.persistCache ?? true,
    }
    this.cacheDir = path.join(this.root, '.docstudio')
    this.cachePath = path.join(this.cacheDir, 'cache.json')
    this.cache = {
      version: CACHE_VERSION,
      signature: this.signature(),
      files: {},
    }
  }

  static open(rootInput: string, options: VaultOptions = {}): Vault {
    const vault = new Vault(rootInput, options)
    const stat = fs.existsSync(vault.root) ? fs.statSync(vault.root) : null
    if (!stat?.isDirectory()) {
      throw new Error(`Vault directory not found: ${vault.root}`)
    }
    vault.loadCache()
    vault.rescan()
    return vault
  }

  getDoc(id: string): DocRecord | null {
    return this.docs.get(id) ?? null
  }

  allDocs(): DocRecord[] {
    return [...this.docs.values()]
  }

  docsInProject(project: string): DocRecord[] {
    return this.allDocs().filter((doc) => doc.project === project)
  }

  projects(): ProjectSummary[] {
    return this.projectsList.map((project) => ({ ...project }))
  }

  project(name: string): ProjectSummary | null {
    return this.projectsList.find((project) => project.name === name) ?? null
  }

  issues(): Issue[] {
    return this.issuesList
  }

  stats(): VaultStats {
    const byType: Record<string, number> = {}
    const byStatus: Record<string, number> = {}
    let open = 0
    for (const doc of this.docs.values()) {
      byType[doc.type] = (byType[doc.type] ?? 0) + 1
      byStatus[doc.status] = (byStatus[doc.status] ?? 0) + 1
      if (isOpenStatus(doc.status)) open += 1
    }
    return {
      docs: this.docs.size,
      projects: this.projectsList.length,
      open,
      errors: this.issuesList.filter((issue) => issue.severity === 'error').length,
      warnings: this.issuesList.filter((issue) => issue.severity === 'warning').length,
      byType,
      byStatus,
    }
  }

  search(query: string, filters: SearchFilters = {}): SearchHit[] {
    if (!this.searchIndex) this.searchIndex = new SearchIndex(this.docs)
    return this.searchIndex.search(query, filters)
  }

  changesSince(since: string | null): DocRecord[] {
    if (!since) return []
    const threshold = Date.parse(since)
    if (Number.isNaN(threshold)) return []
    return this.allDocs()
      .filter((doc) => doc.mtimeMs > threshold)
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
  }

  openThreads(): DocRecord[] {
    return this.allDocs()
      .filter(
        (doc) =>
          (doc.type === 'review' || doc.type === 'ticket') && isOpenStatus(doc.status),
      )
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
  }

  graph(focus: string, depth = 1): GraphData | null {
    const start = this.docs.get(focus)
    if (!start) return null

    const maxDepth = Math.max(1, Math.min(depth, 2))
    const nodes = new Map<string, DocRecord>([[focus, start]])
    const links = new Map<string, GraphLink>()
    let frontier = [focus]

    const addLink = (from: string, to: string, kind: string): void => {
      const key = `${from}|${to}|${kind}`
      if (!links.has(key)) links.set(key, { from, to, kind })
    }

    for (let level = 0; level < maxDepth; level += 1) {
      const next: string[] = []
      for (const id of frontier) {
        const doc = this.docs.get(id)
        if (!doc) continue
        for (const edge of doc.outgoing) {
          if (!edge.resolved || !edge.to) continue
          addLink(id, edge.to, edge.kind)
          if (!nodes.has(edge.to)) {
            const target = this.docs.get(edge.to)
            if (target) {
              nodes.set(edge.to, target)
              next.push(edge.to)
            }
          }
        }
        for (const edge of doc.backlinks) {
          addLink(edge.from, id, edge.kind)
          if (!nodes.has(edge.from)) {
            const source = this.docs.get(edge.from)
            if (source) {
              nodes.set(edge.from, source)
              next.push(edge.from)
            }
          }
        }
      }
      frontier = next
    }

    return {
      focus,
      nodes: [...nodes.values()],
      links: [...links.values()],
    }
  }

  refresh(): RefreshResult {
    return this.rescan()
  }

  private rescan(): RefreshResult {
    const files = scanVault(this.root, {
      ignore: this.options.ignore,
      extensions: this.options.extensions,
    })
    const next = new Map<string, ParsedDoc>()
    const added: string[] = []
    const updated: string[] = []
    const removed: string[] = []
    let cacheChanged = false

    for (const relative of files) {
      const absolute = path.join(this.root, relative)
      let stat: fs.Stats
      try {
        stat = fs.statSync(absolute)
      } catch {
        continue
      }
      if (!stat.isFile()) continue

      const mtimeMs = Math.round(stat.mtimeMs)
      const id = relative.replace(/\.(md|markdown)$/i, '')
      const cached = this.cache.files[relative]
      let doc: ParsedDoc

      if (
        cached &&
        cached.path === relative &&
        Math.round(cached.mtimeMs) === mtimeMs &&
        cached.size === stat.size
      ) {
        doc = cached
      } else {
        doc = parseDoc(absolute, relative, mtimeMs, stat.size, {
          referenceHeadings: this.options.referenceHeadings,
          extensions: this.options.extensions,
        })
        cacheChanged = true
      }

      next.set(id, doc)
      const previous = this.parsed.get(id)
      if (!previous) added.push(id)
      else if (Math.round(previous.mtimeMs) !== mtimeMs || previous.size !== stat.size) {
        updated.push(id)
      }
    }

    for (const id of this.parsed.keys()) {
      if (!next.has(id)) removed.push(id)
    }

    this.parsed = next
    this.build()
    if (cacheChanged || added.length > 0 || removed.length > 0) this.writeCache()
    return { added, updated, removed }
  }

  private build(): void {
    const docs = new Map<string, DocRecord>()
    for (const [id, parsed] of this.parsed) {
      docs.set(id, {
        ...parsed,
        outgoing: [],
        backlinks: [],
        parent: null,
        children: [],
      })
    }

    for (const doc of docs.values()) {
      doc.outgoing = resolveRefs(doc, doc.refs, this.parsed)
    }

    for (const doc of docs.values()) {
      for (const edge of doc.outgoing) {
        if (!edge.resolved || !edge.to || edge.to === doc.id) continue
        const target = docs.get(edge.to)
        if (!target) continue
        target.backlinks.push(edge)
        if (edge.kind === 'parent' && doc.parent === null) doc.parent = edge.to
      }
    }

    this.breakParentCycles(docs)

    for (const doc of docs.values()) {
      if (!doc.parent) continue
      docs.get(doc.parent)?.children.push(doc.id)
    }

    this.docs = docs
    this.projectsList = this.buildProjects(docs)
    this.projectRoots = new Map(
      this.projectsList.map((project) => [project.name, project.rootId]),
    )
    this.issuesList = this.buildIssues(docs)
    this.applyIssueCounts()
    this.searchIndex = null
    this.lastIndexedAt = new Date().toISOString()
  }

  private breakParentCycles(docs: Map<string, DocRecord>): void {
    for (const doc of docs.values()) {
      if (!doc.parent) continue
      const seen = new Set<string>([doc.id])
      let cursor: string | null = doc.parent
      while (cursor) {
        if (seen.has(cursor)) {
          doc.parent = null
          break
        }
        seen.add(cursor)
        cursor = docs.get(cursor)?.parent ?? null
      }
    }
  }

  private buildProjects(docs: Map<string, DocRecord>): ProjectSummary[] {
    const groups = new Map<string, ProjectSummary>()
    for (const doc of docs.values()) {
      let project = groups.get(doc.project)
      if (!project) {
        project = {
          name: doc.project,
          label: titleFromName(doc.project),
          path: doc.project === 'vault' ? '' : doc.project,
          rootId: null,
          docCount: 0,
          openCount: 0,
          byType: {},
          byStatus: {},
          updatedAt: doc.updatedAt,
          issueCount: 0,
        }
        groups.set(doc.project, project)
      }
      project.docCount += 1
      project.byType[doc.type] = (project.byType[doc.type] ?? 0) + 1
      project.byStatus[doc.status] = (project.byStatus[doc.status] ?? 0) + 1
      if (isOpenStatus(doc.status)) project.openCount += 1
      if (doc.updatedAt > project.updatedAt) project.updatedAt = doc.updatedAt
    }

    for (const project of groups.values()) {
      const candidates = [...docs.values()].filter(
        (doc) => doc.project === project.name && doc.type === 'project',
      )
      const preferredIds = [
        `${project.name}/README`,
        `${project.name}/readme`,
        `${project.name}/project`,
        `${project.name}/index`,
      ]
      const root =
        preferredIds
          .map((id) => candidates.find((doc) => doc.id === id))
          .find((doc) => doc !== undefined) ??
        candidates.sort((a, b) => a.id.split('/').length - b.id.split('/').length)[0] ??
        null
      project.rootId = root?.id ?? null
      if (root) project.label = root.title
    }

    return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label))
  }

  private buildIssues(docs: Map<string, DocRecord>): Issue[] {
    const issues: Issue[] = []
    const now = Date.now()
    const staleMs = this.options.staleDays * 86_400_000

    for (const doc of docs.values()) {
      if (doc.parseError) {
        issues.push({
          kind: 'parse-error',
          severity: 'error',
          docId: doc.id,
          message: doc.parseError,
        })
      }

      for (const edge of doc.outgoing) {
        if (edge.external) continue
        if (!edge.resolved) {
          issues.push({
            kind: 'broken-link',
            severity: 'error',
            docId: doc.id,
            message: `Broken reference \`${edge.kind}\` → ${edge.target}`,
            line: edge.line,
          })
        } else if (edge.brokenAnchor) {
          issues.push({
            kind: 'broken-anchor',
            severity: 'error',
            docId: doc.id,
            message: `Anchor not found: #${edge.anchor ?? ''}`,
            line: edge.line,
          })
        }
      }

      if (doc.type === 'unknown') {
        issues.push({
          kind: 'missing-type',
          severity: 'warning',
          docId: doc.id,
          message: 'No document type. Add `type` to frontmatter or use a known folder.',
        })
      }
      if (doc.status === 'unknown') {
        issues.push({
          kind: 'missing-status',
          severity: 'warning',
          docId: doc.id,
          message: 'No status. Add `status` to frontmatter.',
        })
      }
      if (
        !doc.hasReferencesSection &&
        doc.type !== 'project' &&
        !doc.outgoing.some((edge) => edge.source === 'references')
      ) {
        issues.push({
          kind: 'missing-references',
          severity: 'warning',
          docId: doc.id,
          message: 'No `## References` section: this document is not connected to the graph.',
        })
      }

      const rootId = this.projectRoots.get(doc.project) ?? null
      if (rootId && doc.type !== 'project' && doc.id !== rootId && !doc.parent) {
        issues.push({
          kind: 'orphan',
          severity: 'warning',
          docId: doc.id,
          message: 'No `parent` reference: this document is outside the project tree.',
        })
      }

      if (isOpenStatus(doc.status) && now - doc.mtimeMs > staleMs) {
        issues.push({
          kind: 'stale',
          severity: 'warning',
          docId: doc.id,
          message: `Open but untouched for ${Math.floor((now - doc.mtimeMs) / 86_400_000)} days.`,
        })
      }
    }

    return issues.sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1
      if (a.kind !== b.kind) return a.kind.localeCompare(b.kind)
      return a.docId.localeCompare(b.docId)
    })
  }

  private applyIssueCounts(): void {
    const counts = new Map<string, number>()
    for (const issue of this.issuesList) {
      const doc = this.docs.get(issue.docId)
      if (!doc) continue
      counts.set(doc.project, (counts.get(doc.project) ?? 0) + 1)
    }
    for (const project of this.projectsList) {
      project.issueCount = counts.get(project.name) ?? 0
    }
  }

  private signature(): string {
    return JSON.stringify({
      referenceHeadings: this.options.referenceHeadings,
      extensions: this.options.extensions,
    })
  }

  private loadCache(): void {
    if (!this.options.persistCache) return
    try {
      const raw = fs.readFileSync(this.cachePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<CacheFile>
      if (parsed.version !== CACHE_VERSION) return
      if (parsed.signature !== this.signature()) return
      if (!parsed.files || typeof parsed.files !== 'object') return
      this.cache = {
        version: CACHE_VERSION,
        signature: this.signature(),
        files: parsed.files as Record<string, ParsedDoc>,
      }
    } catch {
      // No cache yet, or unreadable: a full parse will rebuild it.
    }
  }

  private writeCache(): void {
    if (!this.options.persistCache) return
    try {
      fs.mkdirSync(this.cacheDir, { recursive: true })
      const files: Record<string, ParsedDoc> = {}
      for (const doc of this.parsed.values()) files[doc.path] = doc
      const payload: CacheFile = {
        version: CACHE_VERSION,
        signature: this.signature(),
        files,
      }
      fs.writeFileSync(this.cachePath, JSON.stringify(payload))
    } catch {
      // Cache is an optimization; never fail the index because of it.
    }
  }
}

export function compareDocs(a: DocRecord, b: DocRecord): number {
  const rank = typeRank(a.type) - typeRank(b.type)
  if (rank !== 0) return rank
  return a.title.localeCompare(b.title)
}

function titleFromName(name: string): string {
  if (name === 'vault') return 'Vault'
  return name
    .replace(/[-_]+/g, ' ')
    .replace(/\b\p{L}/gu, (char) => char.toUpperCase())
}
