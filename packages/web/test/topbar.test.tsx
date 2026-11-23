import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { LiveProvider } from '../src/live'
import { PaletteProvider } from '../src/palette'
import { PinsProvider } from '../src/pins'
import { Topbar, type TopbarActions } from '../src/components/Topbar'
import {
  EMPTY,
  TopbarActionsProvider,
} from '../src/components/TopbarActions'

vi.mock('../src/lib/useApi', () => ({
  useApi: () => ({
    data: { counts: { unread: 0 } },
    error: null,
    loading: false,
    reload: () => {},
  }),
}))

function renderTopbar(actions: TopbarActions = EMPTY): string {
  return renderToString(
    <MemoryRouter>
      <LiveProvider>
        <PaletteProvider>
          <PinsProvider>
            <TopbarActionsProvider>
              <Topbar
                sidebarCollapsed={false}
                onToggleSidebar={() => {}}
                asideHidden={false}
                onToggleAside={() => {}}
                actions={actions}
              />
            </TopbarActionsProvider>
          </PinsProvider>
        </PaletteProvider>
      </LiveProvider>
    </MemoryRouter>,
  )
}

const baseActions: TopbarActions = {
  docPath: 'alpha/specs/checkout.md',
  openLabel: 'Open in editor',
  onOpen: () => {},
  copyLabel: 'Copy path',
  copied: false,
  onCopy: () => {},
  openResult: null,
}

describe('topbar document actions', () => {
  it('does not render the document buttons by default', () => {
    const html = renderTopbar()

    expect(html).toContain('Mark all read')
    expect(html).not.toContain('Open in editor')
    expect(html).not.toContain('Copy path')
  })

  it('renders the open and copy buttons when actions are published', () => {
    const html = renderTopbar(baseActions)

    expect(html).toContain('Open in editor')
    expect(html).toContain('Copy path')
    expect(html).toContain('Mark all read')
    const markAllRead = html.indexOf('Mark all read')
    const open = html.indexOf('Open in editor')
    const copy = html.indexOf('Copy path')
    expect(open).toBeLessThan(markAllRead)
    expect(copy).toBeLessThan(markAllRead)
  })

  it('reflects the copied state with the Copied badge', () => {
    const html = renderTopbar({ ...baseActions, copied: true })

    expect(html).toContain('Copy path')
    expect(html).toContain('>Copied<')
  })

  it('renders the open result status when present', () => {
    const html = renderTopbar({
      ...baseActions,
      openResult: { ok: true, command: 'code' },
    })

    expect(html).toContain('Opened with: code')
  })
})
