import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface LiveState {
  version: number
  connected: boolean
}

const LiveContext = createContext<LiveState>({ version: 0, connected: false })

export function LiveProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const source = new EventSource('/api/events')
    source.onopen = () => setConnected(true)
    source.onerror = () => setConnected(false)

    const onReindex = (): void => setVersion((value) => value + 1)
    source.addEventListener('reindex', onReindex)

    return () => {
      source.removeEventListener('reindex', onReindex)
      source.close()
    }
  }, [])

  return (
    <LiveContext.Provider value={{ version, connected }}>{children}</LiveContext.Provider>
  )
}

export function useLive(): LiveState {
  return useContext(LiveContext)
}
