import { afterEach, describe, expect, it } from 'vitest'
import { Vault } from '../src/index.js'
import { createTempVault, doc, type TempVault } from './helpers.js'

let vault: TempVault | null = null

afterEach(() => {
  vault?.cleanup()
  vault = null
})

function createVault(): Vault {
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
      references: [
        '- `parent`: [Alpha project](../README.md)',
        '- `derives-from`: [ADR-001](../adr/001.md)',
        '- `follow-up`: [Missing spec](../specs/missing.md)',
        '- `relates-to`: [Alpha project](../README.md#not-a-heading)',
      ].join('\n'),
    }),
    'alpha/adr/001.md': doc({
      title: 'ADR-001',
      type: 'adr',
      status: 'accepted',
      project: 'alpha',
      references: [
        '- `parent`: [Alpha project](../README.md)',
        '- `implements`: [Checkout v2](../specs/checkout.md)',
      ].join('\n'),
    }),
    'alpha/reviews/r1.md': doc({
      title: 'Review round 1',
      type: 'review',
      status: 'open',
      project: 'alpha',
      references: '- `reviewed`: [Checkout v2](../specs/checkout.md)',
    }),
    'ops/runbook.md': doc({
      title: 'Deploy runbook',
      type: 'note',
      status: 'active',
      project: 'ops',
      references: '- `parent`: [Workspace](../README.md)',
    }),
  })

  return Vault.open(vault.root, { persistCache: false })
}

describe('Vault index', () => {
  it('builds parent/children hierarchy and backlinks', () => {
    const index = createVault()
    const spec = index.getDoc('alpha/specs/checkout')
    const root = index.getDoc('alpha/README')
    const review = index.getDoc('alpha/reviews/r1')

    expect(spec?.parent).toBe('alpha/README')
    expect(root?.children.sort()).toEqual([
      'alpha/adr/001',
      'alpha/specs/checkout',
    ])

    const backlinkSources = spec?.backlinks.map((edge) => `${edge.from}:${edge.kind}`).sort()
    expect(backlinkSources).toEqual([
      'alpha/adr/001:implements',
      'alpha/reviews/r1:reviewed',
    ])

    expect(review?.parent).toBeNull()
  })

  it('reports broken references and anchors as errors', () => {
    const index = createVault()
    const issues = index.issues()

    const brokenLink = issues.find(
      (issue) =>
        issue.kind === 'broken-link' && issue.docId === 'alpha/specs/checkout',
    )
    expect(brokenLink?.severity).toBe('error')
    expect(brokenLink?.message).toContain('missing.md')

    const brokenAnchor = issues.find(
      (issue) =>
        issue.kind === 'broken-anchor' && issue.docId === 'alpha/specs/checkout',
    )
    expect(brokenAnchor?.severity).toBe('error')
    expect(brokenAnchor?.message).toContain('#not-a-heading')
  })

  it('reports orphan documents and missing conventions', () => {
    const index = createVault()
    const kindsOf = (docId: string): string[] =>
      index
        .issues()
        .filter((issue) => issue.docId === docId)
        .map((issue) => issue.kind)

    expect(kindsOf('alpha/reviews/r1')).toContain('orphan')

    const issuesForRoot = kindsOf('ops/runbook')
    expect(issuesForRoot).not.toContain('orphan')
    expect(issuesForRoot).not.toContain('missing-type')
  })

  it('groups documents into projects with a resolved root document', () => {
    const index = createVault()
    const alpha = index.project('alpha')

    expect(alpha?.rootId).toBe('alpha/README')
    expect(alpha?.docCount).toBe(4)
    expect(alpha?.openCount).toBe(3)
    expect(index.stats().projects).toBe(3)
  })

  it('searches titles and body text', () => {
    const index = createVault()
    const hits = index.search('checkout')

    expect(hits[0]?.doc.id).toBe('alpha/specs/checkout')
    expect(index.search('runbook', { type: 'note' }).map((hit) => hit.doc.id)).toEqual([
      'ops/runbook',
    ])
    expect(index.search('checkout', { project: 'ops' })).toHaveLength(0)
  })

  it('returns the local graph around a focus document', () => {
    const index = createVault()
    const graph = index.graph('alpha/specs/checkout')

    expect(graph).not.toBeNull()
    const ids = graph?.nodes.map((node) => node.id) ?? []
    expect(ids).toContain('alpha/specs/checkout')
    expect(ids).toContain('alpha/adr/001')
    expect(ids).toContain('alpha/reviews/r1')
    expect(graph?.links.some((link) => link.kind === 'implements')).toBe(true)
  })

  it('detects changes since a timestamp', () => {
    const index = createVault()
    const spec = index.getDoc('alpha/specs/checkout')
    const changed = index.changesSince('2020-01-01T00:00:00.000Z')
    const all = index.allDocs()

    expect(changed).toHaveLength(all.length)
    expect(changed.map((item) => item.id)).toContain(spec?.id)

    const future = index.changesSince('2999-01-01T00:00:00.000Z')
    expect(future).toHaveLength(0)
  })

  it('treats a missing last visit as everything changed', () => {
    const index = createVault()
    const all = index.allDocs()
    const changed = index.changesSince(null)

    expect(changed).toHaveLength(all.length)
    expect(new Set(changed.map((item) => item.id))).toEqual(
      new Set(all.map((item) => item.id)),
    )
    // Newest first.
    for (let position = 1; position < changed.length; position += 1) {
      expect(changed[position - 1]!.mtimeMs).toBeGreaterThanOrEqual(
        changed[position]!.mtimeMs,
      )
    }
  })
})
