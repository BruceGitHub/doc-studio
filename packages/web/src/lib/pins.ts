const STORAGE_KEY = 'docstudio:pinned'

export const PINS_STORAGE_KEY = STORAGE_KEY

/**
 * Pinned documents keep their folder order but move above the rest of the
 * folder, so the handful of documents a reader returns to stay within reach.
 */
export function sortDocsWithPins<T extends { id: string }>(
  docs: readonly T[],
  pinned: ReadonlySet<string>,
): T[] {
  if (pinned.size === 0) return [...docs]
  return [...docs].sort((a, b) => {
    const pinnedA = pinned.has(a.id) ? 0 : 1
    const pinnedB = pinned.has(b.id) ? 0 : 1
    return pinnedA - pinnedB
  })
}

export function readPins(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === 'string')
        : [],
    )
  } catch {
    return new Set()
  }
}

export function writePins(pins: ReadonlySet<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...pins]))
  } catch {
    // Pinning is a local convenience; losing it is acceptable.
  }
}
