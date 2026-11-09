import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App'
import { LiveProvider } from '../src/live'
import { PaletteProvider } from '../src/palette'
import { Markdown } from '../src/components/Markdown'

function render(node: ReactNode, path = '/'): string {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <LiveProvider>
        <PaletteProvider>{node}</PaletteProvider>
      </LiveProvider>
    </MemoryRouter>,
  )
}

describe('web render smoke test', () => {
  it('renders the overview shell without a browser', () => {
    const html = render(<App />, '/')

    expect(html).toContain('Doc Studio')
    expect(html).toContain('Workspace')
    expect(html).toContain('Changed recently')
    expect(html).toContain('Vault conventions')
  })

  it('renders the doctor and search views', () => {
    expect(render(<App />, '/doctor')).toContain('Vault health')
    expect(render(<App />, '/search')).toContain('Find anything in the vault')
    expect(render(<App />, '/404')).toContain('not in the vault')
  })

  it('renders markdown with local links and highlighted code', () => {
    const html = renderToString(
      <MemoryRouter>
        <Markdown
          sourcePath="alpha/notes/incident.md"
          body={[
            '# Incident',
            '',
            'See [the spec](../specs/checkout.md#goals) and [the runbook](./runbook.md).',
            '',
            '```text',
            'plain text block',
            '```',
            '',
            '```ts',
            'const x: number = 1',
            '```',
          ].join('\n')}
        />
      </MemoryRouter>,
    )

    expect(html).toContain('href="/doc/alpha/specs/checkout#goals"')
    expect(html).toContain('href="/doc/alpha/notes/runbook"')
    expect(html).toContain('language-text')
    expect(html).toContain('hljs')
  })
})
