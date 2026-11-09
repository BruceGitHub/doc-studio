import fs from 'node:fs'
import path from 'node:path'

export interface StudioState {
  lastVisitAt: string | null
  seen: Record<string, string>
}

export function stateFilePath(root: string): string {
  return path.join(root, '.docstudio', 'state.json')
}

export function loadState(root: string): StudioState {
  try {
    const raw = fs.readFileSync(stateFilePath(root), 'utf8')
    const parsed = JSON.parse(raw) as Partial<StudioState>
    return {
      lastVisitAt: typeof parsed.lastVisitAt === 'string' ? parsed.lastVisitAt : null,
      seen:
        parsed.seen && typeof parsed.seen === 'object'
          ? (parsed.seen as Record<string, string>)
          : {},
    }
  } catch {
    return { lastVisitAt: null, seen: {} }
  }
}

export function saveState(root: string, state: StudioState): void {
  try {
    fs.mkdirSync(path.dirname(stateFilePath(root)), { recursive: true })
    fs.writeFileSync(stateFilePath(root), JSON.stringify(state, null, 2))
  } catch {
    // Local UI state is best-effort.
  }
}
