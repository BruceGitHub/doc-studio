import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { isTypingTarget } from './lib/keyboard'

const SIDEBAR_KEY = 'docstudio:sidebar'
const ASIDE_KEY = 'docstudio:aside'
const SIDEBAR_WIDTH_KEY = 'docstudio:sidebar-width'
const ASIDE_WIDTH_KEY = 'docstudio:aside-width'

export const SIDEBAR_WIDTH_DEFAULT = 248
export const ASIDE_WIDTH_DEFAULT = 340

export interface LayoutValue {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  /** Width of the expanded left sidebar, in pixels. */
  sidebarWidth: number
  setSidebarWidth: (width: number) => void
  /** Hides the right-hand details column to give the article the full width. */
  asideHidden: boolean
  toggleAside: () => void
  /** Width of the right-hand details column, in pixels. */
  asideWidth: number
  setAsideWidth: (width: number) => void
}

export const LayoutContext = createContext<LayoutValue>({
  sidebarCollapsed: false,
  toggleSidebar: () => {},
  sidebarWidth: SIDEBAR_WIDTH_DEFAULT,
  setSidebarWidth: () => {},
  asideHidden: false,
  toggleAside: () => {},
  asideWidth: ASIDE_WIDTH_DEFAULT,
  setAsideWidth: () => {},
})

/** Widths follow the pointer: no fixed cap, just a sane, finite pixel value. */
function normalizeWidth(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : fallback
}

function readWidth(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return fallback
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? normalizeWidth(parsed, fallback) : fallback
  } catch {
    return fallback
  }
}

function readFlag(key: string, enabled: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(key) === enabled
  } catch {
    return false
  }
}

function writeFlag(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Persisting the layout is optional.
  }
}

/**
 * Layout switches shared by the shell, the sidebar and the document page.
 *
 * `[` collapses the left navigation and `]` hides the right column, so the
 * reader can reach a distraction-free, full-width view from the keyboard.
 * Both choices survive reloads in localStorage, like the theme.
 */
export function LayoutProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    readFlag(SIDEBAR_KEY, 'collapsed'),
  )
  const [asideHidden, setAsideHidden] = useState(() => readFlag(ASIDE_KEY, 'hidden'))
  const [sidebarWidth, setSidebarWidthValue] = useState(() =>
    readWidth(SIDEBAR_WIDTH_KEY, SIDEBAR_WIDTH_DEFAULT),
  )
  const [asideWidth, setAsideWidthValue] = useState(() =>
    readWidth(ASIDE_WIDTH_KEY, ASIDE_WIDTH_DEFAULT),
  )

  useEffect(() => {
    writeFlag(SIDEBAR_KEY, sidebarCollapsed ? 'collapsed' : 'open')
  }, [sidebarCollapsed])

  useEffect(() => {
    writeFlag(ASIDE_KEY, asideHidden ? 'hidden' : 'open')
  }, [asideHidden])

  // Widths change on every pointer move during a drag: persist them once the
  // gesture pauses instead of hammering localStorage.
  useEffect(() => {
    const timer = window.setTimeout(() => writeFlag(SIDEBAR_WIDTH_KEY, String(sidebarWidth)), 200)
    return () => window.clearTimeout(timer)
  }, [sidebarWidth])

  useEffect(() => {
    const timer = window.setTimeout(() => writeFlag(ASIDE_WIDTH_KEY, String(asideWidth)), 200)
    return () => window.clearTimeout(timer)
  }, [asideWidth])

  const toggleSidebar = useCallback(() => setSidebarCollapsed((value) => !value), [])
  const toggleAside = useCallback(() => setAsideHidden((value) => !value), [])
  const setSidebarWidth = useCallback(
    (width: number) => setSidebarWidthValue(normalizeWidth(width, SIDEBAR_WIDTH_DEFAULT)),
    [],
  )
  const setAsideWidth = useCallback(
    (width: number) => setAsideWidthValue(normalizeWidth(width, ASIDE_WIDTH_DEFAULT)),
    [],
  )

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.defaultPrevented) return
      // AltGr reports as Ctrl+Alt on some platforms but still produces `[`/`]`,
      // which is exactly how those keys are typed on Italian layouts.
      const altGraph = event.getModifierState?.('AltGraph') ?? false
      if (event.metaKey || (event.ctrlKey && !altGraph) || event.shiftKey) return
      if (isTypingTarget(event.target)) return

      if (event.key === '[') {
        event.preventDefault()
        setSidebarCollapsed((value) => !value)
      } else if (event.key === ']') {
        event.preventDefault()
        setAsideHidden((value) => !value)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const value = useMemo<LayoutValue>(
    () => ({
      sidebarCollapsed,
      toggleSidebar,
      sidebarWidth,
      setSidebarWidth,
      asideHidden,
      toggleAside,
      asideWidth,
      setAsideWidth,
    }),
    [
      asideHidden,
      asideWidth,
      setAsideWidth,
      setSidebarWidth,
      sidebarCollapsed,
      sidebarWidth,
      toggleAside,
      toggleSidebar,
    ],
  )

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}

export function useLayout(): LayoutValue {
  return useContext(LayoutContext)
}
