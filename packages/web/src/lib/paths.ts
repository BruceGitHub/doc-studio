export interface ResolvedDocHref {
  id: string
  anchor: string | null
}

const SCHEME = /^[a-z][a-z0-9+.-]*:/i

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function stripExtension(value: string): string {
  return value.replace(/\.(md|markdown)$/i, '')
}

function normalizePosix(value: string): string {
  const absolute = value.startsWith('/')
  const segments: string[] = []
  for (const segment of value.split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') {
      if (segments.length > 0 && segments[segments.length - 1] !== '..') segments.pop()
      else if (!absolute) segments.push('..')
      continue
    }
    segments.push(segment)
  }
  return `${absolute ? '/' : ''}${segments.join('/')}`
}

function dirname(value: string): string {
  const normalized = normalizePosix(value)
  const index = normalized.lastIndexOf('/')
  return index === -1 ? '' : normalized.slice(0, index)
}

/**
 * Turns an href found inside a markdown body into a document route.
 * Returns null for external links, in-page anchors and other schemes.
 */
export function resolveDocHref(fromPath: string, href: string): ResolvedDocHref | null {
  const raw = href.trim()
  if (!raw || raw.startsWith('#') || raw.startsWith('//') || SCHEME.test(raw)) return null

  const hashIndex = raw.indexOf('#')
  const pathWithQuery = hashIndex === -1 ? raw : raw.slice(0, hashIndex)
  const hash = hashIndex === -1 ? null : raw.slice(hashIndex + 1)
  const pathPart = safeDecode(pathWithQuery.split('?')[0] ?? '').replace(/^<|>$/g, '')
  if (!pathPart) return { id: stripExtension(fromPath), anchor: hash ? safeDecode(hash) : null }

  const joined = pathPart.startsWith('/')
    ? pathPart.replace(/^\/+/, '')
    : normalizePosix(`${dirname(fromPath)}/${pathPart}`)
  const id = stripExtension(joined).replace(/\/+$/, '')
  if (!id) return null
  return { id, anchor: hash ? safeDecode(hash) : null }
}

export function encodeDocId(id: string): string {
  return id
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

export function docHref(id: string, anchor?: string | null): string {
  return `/doc/${encodeDocId(id)}${anchor ? `#${encodeURIComponent(anchor)}` : ''}`
}
