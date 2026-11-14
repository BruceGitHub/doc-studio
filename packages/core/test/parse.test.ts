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

describe('parseDoc HTML', () => {
  it('indexes standalone HTML documents with metadata, headings and links', () => {
    vault = createTempVault({
      'alpha/reports/status.html': `<!doctype html>
<html>
  <head>
    <title>Status report</title>
    <meta name="docstudio:type" content="report" />
    <meta name="docstudio:status" content="active" />
    <meta name="docstudio:project" content="alpha" />
    <meta name="docstudio:tags" content="ops, 2026" />
  </head>
  <body>
    <h1>Status report</h1>
    <h2 id="details">Details</h2>
    <h2>Details</h2>
    <p>See <a href="../README.md#alpha">the project</a> and
      <a href="https://example.com">docs</a>.</p>
  </body>
</html>`,
    })

    const file = `${vault.root}/alpha/reports/status.html`
    const stat = fs.statSync(file)
    const parsed = parseDoc(file, 'alpha/reports/status.html', Math.round(stat.mtimeMs), stat.size)

    expect(parsed.format).toBe('html')
    expect(parsed.id).toBe('alpha/reports/status.html')
    expect(parsed.title).toBe('Status report')
    expect(parsed.type).toBe('report')
    expect(parsed.status).toBe('active')
    expect(parsed.project).toBe('alpha')
    expect(parsed.tags).toEqual(['ops', '2026'])
    expect(parsed.hasReferencesSection).toBe(false)
    expect(parsed.headings.map((heading) => heading.slug)).toEqual([
      'status-report',
      'details',
      'details-1',
    ])
    // Generated ids are injected into the body so the table of contents works.
    expect(parsed.body).toContain('id="details-1"')
    expect(parsed.body).not.toContain('<title>')
    expect(parsed.text).toContain('See the project and docs.')
    expect(parsed.refs.map((ref) => ref.target)).toEqual([
      '../README.md#alpha',
      'https://example.com',
    ])
  })

  it('falls back to the first h1 and folder type for HTML without metadata', () => {
    vault = createTempVault({
      'alpha/specs/landing.htm': '<!doctype html><html><body><h1>Landing page</h1></body></html>',
    })

    const file = `${vault.root}/alpha/specs/landing.htm`
    const stat = fs.statSync(file)
    const parsed = parseDoc(file, 'alpha/specs/landing.htm', Math.round(stat.mtimeMs), stat.size)

    expect(parsed.format).toBe('html')
    expect(parsed.id).toBe('alpha/specs/landing.htm')
    expect(parsed.title).toBe('Landing page')
    expect(parsed.type).toBe('spec')
  })
})
