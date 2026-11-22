import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

/**
 * DirectoryPage reads the sidebar tree. Render-to-string never runs effects,
 * so useApi is replaced with a synchronous fixture, like the document tests.
 */
vi.mock('../src/lib/useApi', () => {
  const doc = (id: string, title: string) => ({
    id,
    path: `${id}.md`,
    title,
    type: 'spec',
    status: 'active',
    project: 'specs',
    tags: [],
    updatedAt: '2024-05-01T10:00:00.000Z',
    mtimeMs: 1_714_557_600_000,
    unread: false,
  })

  const tree = {
    name: 'vault',
    label: 'My Vault',
    path: '',
    docCount: 3,
    docs: [doc('README', 'Read me')],
    children: [
      {
        name: 'specs',
        label: 'Specs',
        path: 'specs',
        docCount: 2,
        docs: [doc('specs/checkout', 'Checkout v2')],
        children: [
          {
            name: 'deep',
            label: 'Deep',
            path: 'specs/deep',
            docCount: 1,
            docs: [doc('specs/deep/topic', 'Deep topic')],
            children: [],
          },
        ],
      },
    ],
  }

  return {
    useApi: () => ({ data: tree, error: null, loading: false, reload: () => {} }),
  }
})

const { DirectoryPage } = await import('../src/pages/DirectoryPage')

function renderDirectory(path: string): string {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dir/*" element={<DirectoryPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('directory browser', () => {
  it('lists subfolders and documents inside the directory', () => {
    const html = renderDirectory('/dir/specs')

    expect(html).toContain('Specs')
    expect(html).toContain('Checkout v2')
    expect(html).toContain('href="/doc/specs/checkout"')
    expect(html).toContain('href="/dir/specs/deep"')
    expect(html).toContain('Up one level')
    expect(html).toContain('href="/dir"')
  })

  it('renders the vault root at /dir', () => {
    const html = renderDirectory('/dir')

    expect(html).toContain('My Vault')
    expect(html).toContain('Read me')
    expect(html).not.toContain('Up one level')
  })

  it('reports a directory that is no longer in the tree', () => {
    const html = renderDirectory('/dir/gone')

    expect(html).toContain('not in the vault')
  })
})
