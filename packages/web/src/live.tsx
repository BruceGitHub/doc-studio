import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'

export interface LiveState {
  version: number
  connected: boolean
}

const LiveContext = createContext<LiveState>({ version: 0, connected: false })

const POLL_INTERVAL = 10_000

export function LiveProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let disposed = false
    let source: EventSource | null = null
    let retry: number | null = null
    let revision: string | undefined

    const bump = (): void => setVersion((value) => value + 1)

    // SSE is the fast path. A slow revision poll covers proxies that buffer
    // event streams and deployments where file notifications are delayed.
    const poll = async (): Promise<void> => {
      try {
        const meta = await api<{ lastIndexedAt: string }>('/meta')
        if (disposed) return
        if (revision !== undefined && revision !== meta.lastIndexedAt) bump()
        revision = meta.lastIndexedAt
      } catch {
        // The next tick retries.
      }
    }
    void poll()
    const timer = window.setInterval(() => void poll(), POLL_INTERVAL)

    const open = (): void => {
      if (disposed) return
      source = new EventSource('/api/events')
      source.onopen = () => {
        setConnected(true)
        // Pick up anything that changed while the stream was down.
        if (revision !== undefined) bump()
        void poll()
      }
      source.onerror = () => {
        if (disposed) return
        setConnected(false)
        source?.close()
        source = null
        if (retry !== null) window.clearTimeout(retry)
        retry = window.setTimeout(open, 3_000)
      }

      const onReindex = (): void => {
        void poll()
        bump()
      }
      source.addEventListener('reindex', onReindex)
    }
    open()

    return () => {
      disposed = true
      window.clearInterval(timer)
      if (retry !== null) window.clearTimeout(retry)
      source?.close()
    }
  }, [])

  return (
    <LiveContext.Provider value={{ version, connected }}>{children}</LiveContext.Provider>
  )
}

export function useLive(): LiveState {
  return useContext(LiveContext)
}
