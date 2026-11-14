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

export interface LayoutValue {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  /** Hides the right-hand details column to give the article the full width. */
  asideHidden: boolean
  toggleAside: () => void
}

export const LayoutContext = createContext<LayoutValue>({
  sidebarCollapsed: false,
  toggleSidebar: () => {},
  asideHidden: false,
  toggleAside: () => {},
})

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

  useEffect(() => {
    writeFlag(SIDEBAR_KEY, sidebarCollapsed ? 'collapsed' : 'open')
  }, [sidebarCollapsed])

  useEffect(() => {
    writeFlag(ASIDE_KEY, asideHidden ? 'hidden' : 'open')
  }, [asideHidden])

  const toggleSidebar = useCallback(() => setSidebarCollapsed((value) => !value), [])
  const toggleAside = useCallback(() => setAsideHidden((value) => !value), [])

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
    () => ({ sidebarCollapsed, toggleSidebar, asideHidden, toggleAside }),
    [asideHidden, sidebarCollapsed, toggleAside, toggleSidebar],
  )

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}

export function useLayout(): LayoutValue {
  return useContext(LayoutContext)
}
