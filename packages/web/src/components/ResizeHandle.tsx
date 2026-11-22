import { useRef, type KeyboardEvent, type PointerEvent } from 'react'

/**
 * Draggable divider between the page and one of the side columns.
 *
 * The edge names the side the panel grows from: a `left` handle sits at the
 * right edge of the left sidebar (drag right to widen it), a `right` handle
 * sits at the left edge of the details column (drag left to widen it). Arrow
 * keys resize it too, and holding Shift moves in bigger steps.
 */
export function ResizeHandle({
  label,
  edge,
  value,
  min,
  max,
  onResize,
  className = '',
}: {
  label: string
  edge: 'left' | 'right'
  value: number
  min: number
  max: number
  onResize: (width: number) => void
  className?: string
}) {
  const start = useRef<{ x: number; width: number } | null>(null)

  const finish = (event: PointerEvent<HTMLDivElement>): void => {
    if (!start.current) return
    start.current = null
    document.documentElement.removeAttribute('data-resizing')
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const step = event.shiftKey ? 64 : 16
    const grow = event.key === (edge === 'left' ? 'ArrowRight' : 'ArrowLeft')
    const next = Math.min(max, Math.max(min, value + (grow ? step : -step)))
    onResize(next)
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title={`${label}: drag, or use the arrow keys`}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        document.documentElement.setAttribute('data-resizing', '')
        start.current = { x: event.clientX, width: value }
      }}
      onPointerMove={(event) => {
        if (!start.current) return
        const delta = event.clientX - start.current.x
        const raw = start.current.width + (edge === 'left' ? delta : -delta)
        onResize(Math.min(max, Math.max(min, Math.round(raw))))
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={() => {
        start.current = null
        document.documentElement.removeAttribute('data-resizing')
      }}
      onKeyDown={onKeyDown}
      className={`cursor-col-resize touch-none select-none rounded-full bg-transparent transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 ${className}`}
    />
  )
}
