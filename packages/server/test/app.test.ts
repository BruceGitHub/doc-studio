import { afterEach, describe, expect, it } from 'vitest'
import { createServer, type ServerHandle } from '../src/index.js'
import { createTempVault, doc, type TempVault } from '../../core/test/helpers.js'

let vault: TempVault | null = null
let server: ServerHandle | null = null

afterEach(async () => {
  await server?.close()
  server = null
  vault?.cleanup()
  vault = null
})

async function setup(): Promise<{ handle: ServerHandle; root: string }> {
  vault = createTempVault({
    'README.md': doc({
      title: 'Workspace',
      type: 'project',
      status: 'active',
      project: 'vault',
    }),
    'alpha/README.md': doc({
      title: 'Alpha project',
      type: 'project',
      status: 'active',
      project: 'alpha',
      references: '- `parent`: [Workspace](../README.md)',
    }),
    'alpha/specs/checkout.md': doc({
      title: 'Checkout v2',
      type: 'spec',
      status: 'active',
      project: 'alpha',
      body: 'Two-step checkout with idempotency keys.',
      references: [
        '- `parent`: [Alpha project](../README.md)',
        '- `follow-up`: [Missing document](./missing.md)',
      ].join('\n'),
    }),
  })

  server = await createServer({ root: vault.root, webDir: null, watch: false })
  return { handle: server, root: vault.root }
}

describe('HTTP API', () => {
  it('exposes meta and project summaries', async () => {
    const { handle } = await setup()

    const meta = await handle.app.inject({ method: 'GET', url: '/api/meta' })
    expect(meta.statusCode).toBe(200)
    const metaBody = meta.json<Record<string, unknown>>()
    expect((metaBody.counts as { docs: number }).docs).toBe(3)
    expect((metaBody.counts as { errors: number }).errors).toBe(1)

    const projects = await handle.app.inject({ method: 'GET', url: '/api/projects' })
    expect(projects.statusCode).toBe(200)
    const list = projects.json<Array<{ name: string; rootId: string | null }>>()
    expect(list.find((project) => project.name === 'alpha')?.rootId).toBe('alpha/README')
  })

  it('returns a document with breadcrumb, references and issues', async () => {
    const { handle } = await setup()

    const response = await handle.app.inject({
      method: 'GET',
      url: '/api/docs/alpha/specs/checkout',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json<{
      doc: { title: string; body: string; hasReferencesSection: boolean }
      breadcrumb: Array<{ id: string }>
      outgoing: Array<{ kind: string; resolved: boolean }>
      issues: Array<{ kind: string }>
    }>()

    expect(body.doc.title).toBe('Checkout v2')
    expect(body.doc.hasReferencesSection).toBe(true)
    expect(body.doc.body).toContain('idempotency keys')
    expect(body.breadcrumb.map((entry) => entry.id)).toContain('alpha/README')
    expect(body.outgoing.some((edge) => edge.kind === 'parent' && edge.resolved)).toBe(true)
    expect(body.outgoing.some((edge) => edge.kind === 'follow-up' && !edge.resolved)).toBe(true)
    expect(body.issues.map((issue) => issue.kind)).toContain('broken-link')
  })

  it('returns 404 for unknown documents and projects', async () => {
    const { handle } = await setup()

    const missingDoc = await handle.app.inject({
      method: 'GET',
      url: '/api/docs/alpha/specs/nope',
    })
    expect(missingDoc.statusCode).toBe(404)

    const missingProject = await handle.app.inject({
      method: 'GET',
      url: '/api/projects/nope',
    })
    expect(missingProject.statusCode).toBe(404)
  })

  it('searches and filters the index', async () => {
    const { handle } = await setup()

    const response = await handle.app.inject({
      method: 'GET',
      url: '/api/search?q=idempotency&project=alpha',
    })
    expect(response.statusCode).toBe(200)
    const hits = response.json<Array<{ doc: { id: string } }>>()
    expect(hits[0]?.doc.id).toBe('alpha/specs/checkout')

    const filtered = await handle.app.inject({
      method: 'GET',
      url: '/api/search?q=idempotency&project=ops',
    })
    expect(filtered.json<unknown[]>()).toHaveLength(0)
  })

  it('marks documents as seen and records visits', async () => {
    const { handle } = await setup()

    const seen = await handle.app.inject({
      method: 'POST',
      url: '/api/seen',
      payload: { id: 'alpha/specs/checkout' },
    })
    expect(seen.statusCode).toBe(200)
    expect(seen.json<{ ok: boolean }>().ok).toBe(true)

    const attention = await handle.app.inject({ method: 'GET', url: '/api/attention' })
    const body = attention.json<{
      since: string | null
      unread: Array<{ id: string }>
    }>()
    expect(body.since).toBeNull()
    expect(body.unread.some((entry) => entry.id === 'alpha/specs/checkout')).toBe(false)

    const visit = await handle.app.inject({ method: 'POST', url: '/api/visit' })
    expect(visit.json<{ lastVisitAt: string }>().lastVisitAt).toBeTruthy()
  })

  it('returns graph data around a focus document', async () => {
    const { handle } = await setup()

    const response = await handle.app.inject({
      method: 'GET',
      url: '/api/graph?focus=alpha%2Fspecs%2Fcheckout',
    })
    expect(response.statusCode).toBe(200)
    const graph = response.json<{ focus: string; nodes: Array<{ id: string }> }>()
    expect(graph.focus).toBe('alpha/specs/checkout')
    expect(graph.nodes.map((node) => node.id)).toContain('alpha/README')

    const missing = await handle.app.inject({
      method: 'GET',
      url: '/api/graph?focus=does%2Fnot%2Fexist',
    })
    expect(missing.statusCode).toBe(404)
  })
})
