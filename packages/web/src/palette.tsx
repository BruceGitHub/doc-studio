import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import type { SearchHitDTO } from '@docstudio/core'
import { relativeTime } from './lib/format'
import { docHref } from './lib/paths'
import { useApi } from './lib/useApi'
import { useDebounced } from './lib/useDebounced'
import { TypeBadge } from './components/Badge'
import { Spinner } from './components/States'

interface PaletteContextValue {
  open: () => void
}

const PaletteContext = createContext<PaletteContextValue>({ open: () => {} })

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handler = (event: globalThis.KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setIsOpen((value) => !value)
      }
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const value = useMemo(() => ({ open }), [open])

  return (
    <PaletteContext.Provider value={value}>
      {children}
      <CommandPalette open={isOpen} onClose={close} />
    </PaletteContext.Provider>
  )
}

export function usePalette(): PaletteContextValue {
  return useContext(PaletteContext)
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const debounced = useDebounced(query, 140)
  const trimmed = debounced.trim()
  const results = useApi<SearchHitDTO[]>(
    open && trimmed ? `/search?q=${encodeURIComponent(trimmed)}&limit=8` : null,
  )
  const hits = results.data ?? []

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
    }
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [trimmed])

  if (!open) return null

  const choose = (index: number): void => {
    const hit = hits[index]
    if (!hit) return
    navigate(docHref(hit.doc.id))
    onClose()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((value) => (hits.length === 0 ? 0 : (value + 1) % hits.length))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((value) => (hits.length === 0 ? 0 : (value - 1 + hits.length) % hits.length))
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      choose(active)
    }
    if (event.key === 'Escape') onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[14vh] backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-[640px] overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/50">
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <span className="text-faint">
            <Spinner />
          </span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search documents, references, headings…"
            className="h-14 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
          />
          <span className="kbd">esc</span>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {trimmed && results.loading && hits.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-6 text-xs text-faint">
              <Spinner /> Searching…
            </div>
          )}

          {trimmed && !results.loading && hits.length === 0 && (
            <p className="px-3 py-6 text-xs text-faint">
              No results for <span className="text-dim">“{trimmed}”</span>.
            </p>
          )}

          {!trimmed && (
            <div className="px-3 py-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-faint">Try</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {['idempotency', 'checkout', 'review', 'rollout', 'wip'].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setQuery(sample)}
                    className="chip border-line bg-raised text-dim hover:border-accent/30 hover:text-accent"
                  >
                    {sample}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-[10px] text-faint">
                Full-text over titles, headings, paths and body.
              </p>
            </div>
          )}

          {hits.map((hit, index) => (
            <button
              key={hit.doc.id}
              type="button"
              onClick={() => choose(index)}
              onMouseEnter={() => setActive(index)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                index === active ? 'bg-hover' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-ink">{hit.doc.title}</div>
                <div className="mt-0.5 truncate font-mono text-[10px] text-faint">
                  {hit.doc.path} · {relativeTime(hit.doc.updatedAt)}
                </div>
              </div>
              <TypeBadge type={hit.doc.type} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-line px-4 py-2.5 text-[10px] text-faint">
          <span>
            <span className="kbd mr-1">↑</span>
            <span className="kbd mr-1">↓</span>
            navigate
          </span>
          <span>
            <span className="kbd mr-1">↵</span>
            open
          </span>
          <span className="ml-auto font-mono">docstudio</span>
        </div>
      </div>
    </div>
  )
}
