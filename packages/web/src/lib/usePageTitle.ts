import { useEffect } from 'react'

const BASE_TITLE = 'Doc Studio'

/**
 * Keeps the browser tab in sync with the current view. The document title is
 * the most useful label when several tabs are open.
 */
export function usePageTitle(title?: string | null): void {
  useEffect(() => {
    const trimmed = title?.trim()
    document.title = trimmed ? `${trimmed} · ${BASE_TITLE}` : BASE_TITLE
    return () => {
      document.title = BASE_TITLE
    }
  }, [title])
}
