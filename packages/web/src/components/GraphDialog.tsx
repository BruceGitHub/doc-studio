import { useEffect } from 'react'
import type { GraphDTO } from '@docstudio/core'
import { MiniGraph } from './MiniGraph'

/**
 * Full-screen view of the local graph. The panel version is small on purpose:
 * labels need room before the neighbourhood becomes readable.
 */
export function GraphDialog({
  graph,
  onClose,
}: {
  graph: GraphDTO
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Document graph"
        className="panel w-[min(1100px,94vw)] p-0"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panel-header">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">
              Document graph
            </h2>
            <p className="mt-0.5 text-xs text-faint">
              {graph.nodes.length} documents · click a node to open it, Esc to close.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost h-8 w-8 px-0"
            aria-label="Close graph"
            title="Close (Esc)"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path
                d="m4 4 8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="p-4">
          <MiniGraph graph={graph} size="full" onNavigate={onClose} />
        </div>
      </div>
    </div>
  )
}
