import { useEffect, useLayoutEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { useLayout } from '../layout'
import { useHistoryKeys } from '../lib/useHistoryKeys'
import { PinnedBar } from './PinnedBar'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const scrollPositions = new Map<string, number>()
const RESTORE_FRAMES = 40

// Capture the outgoing scroll offset during commit, before the browser clamps
// it to the height of the incoming page.
const useSaveLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

function jumpTo(top: number): void {
  window.scrollTo({ top, behavior: 'instant' as ScrollBehavior })
}

export function Shell() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const latestScroll = useRef(0)
  const { sidebarCollapsed: collapsed, toggleSidebar, asideHidden, toggleAside } = useLayout()

  useHistoryKeys()

  // Remember the scroll offset of every history entry so Back and Forward
  // land where the reader left off.
  useSaveLayoutEffect(() => {
    const onScroll = (): void => {
      latestScroll.current = window.scrollY
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      scrollPositions.set(location.key, latestScroll.current)
    }
  }, [location.key])

  useEffect(() => {
    if (navigationType !== 'POP') {
      jumpTo(0)
      latestScroll.current = 0
      return
    }

    const target = scrollPositions.get(location.key)
    if (target === undefined) {
      jumpTo(0)
      latestScroll.current = 0
      return
    }

    // Content may still be loading, so keep re-applying the offset for a few
    // frames until the page is tall enough to reach it.
    let frame = 0
    let cancelled = false
    const restore = (): void => {
      if (cancelled) return
      jumpTo(target)
      frame += 1
      if (frame < RESTORE_FRAMES && Math.abs(window.scrollY - target) > 2) {
        requestAnimationFrame(restore)
      }
    }
    requestAnimationFrame(restore)
    return () => {
      cancelled = true
    }
  }, [location.key, navigationType])

  return (
    <div className="min-h-screen">
      <Sidebar collapsed={collapsed} onExpand={toggleSidebar} />
      <div className={collapsed ? 'lg:pl-16' : 'lg:pl-[248px]'}>
        <Topbar
          sidebarCollapsed={collapsed}
          onToggleSidebar={toggleSidebar}
          asideHidden={asideHidden}
          onToggleAside={toggleAside}
        />
        <main className="mx-auto w-full max-w-[1740px] px-3 py-6 lg:pl-4 lg:pr-6">
          <PinnedBar />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
