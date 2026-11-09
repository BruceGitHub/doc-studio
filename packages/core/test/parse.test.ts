import fs from 'node:fs'
import { describe, expect, it, afterEach } from 'vitest'
import { parseDoc } from '../src/index.js'
import { createTempVault, doc, type TempVault } from './helpers.js'

let vault: TempVault | null = null

afterEach(() => {
  vault?.cleanup()
  vault = null
})

describe('parseDoc', () => {
  it('reads frontmatter, normalizes type aliases and keeps tags', () => {
    vault = createTempVault({
      'alpha/specs/checkout.md': doc({
        title: 'Checkout v2',
        type: 'Specification',
        status: 'Active',
        project: 'Checkout Revamp',
        extraFrontmatter: 'tags: [payments, "split"]',
      }),
    })

    const file = `${vault.root}/alpha/specs/checkout.md`
    const stat = fs.statSync(file)
    const parsed = parseDoc(file, 'alpha/specs/checkout.md', Math.round(stat.mtimeMs), stat.size)

    expect(parsed.id).toBe('alpha/specs/checkout')
    expect(parsed.title).toBe('Checkout v2')
    expect(parsed.type).toBe('spec')
    expect(parsed.status).toBe('active')
    expect(parsed.project).toBe('checkout-revamp')
    expect(parsed.tags).toEqual(['payments', 'split'])
  })

  it('extracts typed references from the References section only', () => {
    vault = createTempVault({
      'alpha/specs/checkout.md': doc({
        title: 'Checkout v2',
        body: 'See [the goals](#goals) and [an inline doc](../adr/001.md).',
        type: 'spec',
        status: 'active',
        references: [
          '- `parent`: [Project overview](../README.md)',
          '- `derives-from`: [ADR-001](../adr/001.md)',
          '- `follow-up`: [Review round 1](../reviews/r1.md)',
          '- `ticket`: CHK-120',
          '- [Untyped list link](../ops/runbook.md)',
        ].join('\n'),
      }),
      'alpha/README.md': doc({ title: 'Project', type: 'project' }),
      'alpha/adr/001.md': doc({ title: 'ADR-001', type: 'adr' }),
      'alpha/reviews/r1.md': doc({ title: 'Review 1', type: 'review' }),
      'alpha/ops/runbook.md': doc({ title: 'Runbook', type: 'note' }),
    })

    const file = `${vault.root}/alpha/specs/checkout.md`
    const stat = fs.statSync(file)
    const parsed = parseDoc(file, 'alpha/specs/checkout.md', Math.round(stat.mtimeMs), stat.size)

    expect(parsed.hasReferencesSection).toBe(true)

    const fromSection = parsed.refs.filter((ref) => ref.source === 'references')
    expect(fromSection.map((ref) => ref.kind)).toEqual([
      'parent',
      'derives-from',
      'follow-up',
      'ticket',
      'untyped',
    ])

    const ticket = fromSection.find((ref) => ref.kind === 'ticket')
    expect(ticket?.target).toBe('CHK-120')
    expect(ticket?.external).toBe(true)

    const inline = parsed.refs.filter((ref) => ref.source === 'inline')
    expect(inline).toHaveLength(1)
    expect(inline[0]?.target).toBe('../adr/001.md')
    expect(inline[0]?.kind).toBe('untyped')
  })

  it('renders slugged headings that match the anchors used by references', () => {
    vault = createTempVault({
      'alpha/specs/checkout.md': doc({
        title: 'Checkout v2',
        body: ['## Open questions?', '### Rollback & recovery', 'Text.'].join('\n\n'),
        type: 'spec',
        status: 'active',
      }),
    })

    const file = `${vault.root}/alpha/specs/checkout.md`
    const stat = fs.statSync(file)
    const parsed = parseDoc(file, 'alpha/specs/checkout.md', Math.round(stat.mtimeMs), stat.size)

    expect(parsed.headings.map((heading) => heading.slug)).toContain('open-questions')
    expect(parsed.headings.map((heading) => heading.slug)).toContain('rollback--recovery')
  })
})
