import fs from 'node:fs'
import path from 'node:path'
import picomatch from 'picomatch'

/** Documents Doc Studio indexes out of the box. */
export const DEFAULT_EXTENSIONS = ['.md', '.markdown', '.html', '.htm']

const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.docstudio/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.next/**',
  '**/.venv/**',
  '**/vendor/**',
]

export interface ScanOptions {
  ignore?: string[]
  extensions?: string[]
}

export function scanVault(root: string, options: ScanOptions = {}): string[] {
  const patterns = [...DEFAULT_IGNORE, ...(options.ignore ?? [])]
  const isIgnored = picomatch(patterns, { dot: true })
  const extensions = new Set(
    (options.extensions ?? DEFAULT_EXTENSIONS).map((extension) => extension.toLowerCase()),
  )
  const files: string[] = []

  function walk(directory: string, relative: string): void {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      if (entry.isSymbolicLink()) continue
      const childRelative = relative ? `${relative}/${entry.name}` : entry.name

      if (entry.isDirectory()) {
        if (isIgnored(`${childRelative}/`)) continue
        walk(path.join(directory, entry.name), childRelative)
        continue
      }

      if (!entry.isFile()) continue
      if (isIgnored(childRelative)) continue
      const extension = path.extname(entry.name).toLowerCase()
      if (!extensions.has(extension)) continue
      files.push(childRelative)
    }
  }

  walk(root, '')
  files.sort()
  return files
}
