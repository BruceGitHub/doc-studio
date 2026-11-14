import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PinsProvider } from '../src/pins'

/**
 * DocPage loads through useApi. Render-to-string never runs effects, so the
 * hook is replaced with a synchronous fixture: the page renders its loaded
 * state directly, which is exactly what these layout assertions need.
 */
vi.mock('../src/lib/useApi', () => {
  const summary = {
    id: 'alpha/specs/checkout',
    path: 'alpha/specs/checkout.md',
    title: 'Checkout v2',
    type: 'spec',
    status: 'active',
    project: 'alpha',
    tags: [],
    updatedAt: '2024-05-01T10:00:00.000Z',
    mtimeMs: 1_714_557_600_000,
    unread: false,
  }

  const withHeadings = {
    doc: {
      ...summary,
      format: 'markdown',
      body: 'Body',
      headings: [
        { depth: 1, text: 'Checkout v2', slug: 'checkout-v2', line: 1 },
        { depth: 2, text: 'Goals', slug: 'goals', line: 5 },
        { depth: 3, text: 'Details', slug: 'details', line: 9 },
      ],
      frontmatter: {},
      hasReferencesSection: true,
    },
    breadcrumb: [],
    children: [],
    outgoing: [],
    backlinks: [],
    issues: [],
  }

  const withoutSections = {
    ...withHeadings,
    doc: {
      ...withHeadings.doc,
      id: 'alpha/empty',
      path: 'alpha/empty.md',
      title: 'Empty',
      headings: [{ depth: 1, text: 'Empty', slug: 'empty', line: 1 }],
    },
  }

  const graph = { focus: summary.id, nodes: [], links: [] }

  return {
    useApi: (path: string | null) => {
      if (path?.startsWith('/docs/alpha/empty')) {
        return { data: withoutSections, error: null, loading: false, reload: () => {} }
      }
      if (path?.startsWith('/docs/')) {
        return { data: withHeadings, error: null, loading: false, reload: () => {} }
      }
      if (path?.startsWith('/graph')) {
        return { data: graph, error: null, loading: false, reload: () => {} }
      }
      return { data: null, error: null, loading: false, reload: () => {} }
    },
  }
})

const { DocPage } = await import('../src/pages/DocPage')

function renderPage(path: string): string {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <PinsProvider>
        <Routes>
          <Route path="/doc/*" element={<DocPage />} />
        </Routes>
      </PinsProvider>
    </MemoryRouter>,
  )
}

describe('document page actions', () => {
  it('renders open/copy at the top of "On this page", above the section links', () => {
    const html = renderPage('/doc/alpha/specs/checkout')

    const panel = html.indexOf('On this page')
    const open = html.indexOf('Open in editor')
    const copy = html.indexOf('Copy path')
    const firstSection = html.indexOf('href="#details"')

    expect(panel).toBeGreaterThanOrEqual(0)
    expect(open).toBeGreaterThan(panel)
    expect(copy).toBeGreaterThan(open)
    expect(firstSection).toBeGreaterThan(copy)
  })

  it('keeps the actions visible when the document has no sections', () => {
    const html = renderPage('/doc/alpha/empty')

    expect(html).toContain('On this page')
    expect(html).toContain('no sections to jump to')
    expect(html).toContain('Open in editor')
    expect(html).toContain('Copy path')
  })
})
