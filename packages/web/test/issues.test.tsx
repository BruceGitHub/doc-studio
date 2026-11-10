import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import type { IssueDTO } from '@docstudio/core'
import { IssueList } from '../src/components/Issues'

const issue: IssueDTO = {
  kind: 'broken-reference',
  severity: 'error',
  doc: {
    id: 'alpha/specs/checkout',
    path: 'alpha/specs/checkout.md',
    title: 'Checkout v2',
    type: 'spec',
    status: 'active',
    project: 'alpha',
    tags: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
    mtimeMs: 0,
    unread: false,
  },
  message: 'A deliberately very long message that must not be clipped but shown in full.',
  line: 12,
}

function render(node: ReactNode): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)
}

describe('IssueList', () => {
  it('renders the full message, path and line even while collapsed', () => {
    const html = render(<IssueList issues={[issue]} />)

    expect(html).toContain('broken-reference')
    expect(html).toContain('Checkout v2')
    expect(html).toContain('A deliberately very long message')
    expect(html).toContain('alpha/specs/checkout.md:12')
    expect(html).toContain('aria-expanded="false"')
  })

  it('explains the empty state', () => {
    const html = render(<IssueList issues={[]} empty="Nothing broken." />)
    expect(html).toContain('Nothing broken.')
  })
})
