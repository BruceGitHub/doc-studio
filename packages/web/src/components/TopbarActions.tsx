import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * Transient actions shown in the top bar while a document is open.
 *
 * DocPage writes them through the setter and clears them on cleanup; the
 * Topbar reads them and renders the buttons next to "Mark all read". Outside
 * a document page the top bar shows nothing extra.
 */
export interface TopbarActions {
  /** Absolute path shown by "Copy path", for the tooltip. */
  docPath: string | null
  openLabel: string
  onOpen: (() => void) | null
  copyLabel: string
  copied: boolean
  onCopy: (() => void) | null
  openResult: { ok: boolean; command: string; message?: string; url?: string } | null
}

interface CtxValue {
  actions: TopbarActions
  setActions: (next: TopbarActions) => void
}

const Ctx = createContext<CtxValue | null>(null)

const EMPTY: TopbarActions = {
  docPath: null,
  openLabel: 'Open in editor',
  onOpen: null,
  copyLabel: 'Copy path',
  copied: false,
  onCopy: null,
  openResult: null,
}

export { EMPTY }

export function TopbarActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<TopbarActions>(EMPTY)
  const value = useMemo<CtxValue>(() => ({ actions, setActions }), [actions])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTopbarActionsSet(): (next: TopbarActions) => void {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('TopbarActionsProvider is missing from the tree')
  return ctx.setActions
}

export function useTopbarActions(): TopbarActions {
  const ctx = useContext(Ctx)
  return ctx ? ctx.actions : EMPTY
}