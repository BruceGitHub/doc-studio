import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isTypingTarget } from './keyboard'

/**
 * Browser-like history navigation with the arrow keys:
 * left goes back, right goes forward.
 *
 * Plain arrows are ignored while typing in a field or inside the command palette,
 * and modified arrows (Ctrl/Cmd/Shift) are left to the browser.
 */
export function useHistoryKeys(): void {
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.defaultPrevented) return
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      if (event.ctrlKey || event.metaKey || event.shiftKey) return
      if (isTypingTarget(event.target)) return

      event.preventDefault()
      navigate(event.key === 'ArrowLeft' ? -1 : 1)
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])
}
