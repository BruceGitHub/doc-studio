import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { PINS_STORAGE_KEY, readPins, writePins } from './lib/pins'

export interface PinsValue {
  pinned: ReadonlySet<string>
  togglePin: (id: string) => void
}

const PinsContext = createContext<PinsValue | null>(null)

/**
 * Single source of truth for pinned documents. The navigation tree and the
 * pinned bar above the content share it, so a pin toggled in one is visible
 * everywhere and survives reloads through localStorage.
 */
export function PinsProvider({ children }: { children: ReactNode }) {
  const [pinned, setPinned] = useState<Set<string>>(readPins)

  const togglePin = useCallback((id: string) => {
    setPinned((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      writePins(next)
      return next
    })
  }, [])

  // Keep other tabs/windows in sync with the same vault.
  useEffect(() => {
    const onStorage = (event: StorageEvent): void => {
      if (event.key !== null && event.key !== PINS_STORAGE_KEY) return
      setPinned(readPins())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo<PinsValue>(() => ({ pinned, togglePin }), [pinned, togglePin])

  return <PinsContext.Provider value={value}>{children}</PinsContext.Provider>
}

export function usePins(): PinsValue {
  const value = useContext(PinsContext)
  if (!value) throw new Error('usePins must be used inside <PinsProvider>')
  return value
}
