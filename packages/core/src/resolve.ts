import path from 'node:path'
import { anchorMatches, safeDecode } from './anchors.js'
import { isExternalTarget } from './parse.js'
import type { Edge, ParsedDoc, RawRef } from './types.js'

export function resolveRefs(
  from: ParsedDoc,
  refs: RawRef[],
  docs: Map<string, ParsedDoc>,
): Edge[] {
  return refs.map((ref) => resolveRef(from, ref, docs))
}

function resolveRef(from: ParsedDoc, ref: RawRef, docs: Map<string, ParsedDoc>): Edge {
  const base: Edge = {
    ...ref,
    from: from.id,
    to: null,
    resolved: false,
    anchor: null,
    brokenAnchor: false,
  }

  if (ref.external || isExternalTarget(ref.target.trim())) return base

  const raw = ref.target.trim().replace(/^<|>$/g, '')
  if (!raw) return base

  if (raw.startsWith('#')) {
    const anchor = safeDecode(raw.slice(1))
    const self = docs.get(from.id)
    return {
      ...base,
      to: from.id,
      resolved: true,
      anchor,
      brokenAnchor: self ? !anchorMatches(anchor, self.headings) : false,
    }
  }

  const [pathPartWithQuery, hashPart] = splitOnce(raw, '#')
  const pathPart = safeDecode(pathPartWithQuery.split('?')[0] ?? '')
  if (!pathPart) return base

  const anchor = hashPart ? safeDecode(hashPart) : null
  const targetId = lookupDocId(pathPart, from.path, docs)
  if (!targetId) return base

  const target = docs.get(targetId)
  return {
    ...base,
    to: targetId,
    resolved: true,
    anchor,
    brokenAnchor: anchor ? !target || !anchorMatches(anchor, target.headings) : false,
  }
}

function lookupDocId(
  target: string,
  fromPath: string,
  docs: Map<string, ParsedDoc>,
): string | null {
  const clean = target.replace(/\\/g, '/').trim()
  if (!clean) return null

  const base = clean.startsWith('/') ? '' : path.posix.dirname(fromPath)
  const joined = path.posix.normalize(
    path.posix.join(base, clean.replace(/^\/+/, '')),
  )
  const normalized = joined.replace(/^\.\//, '').replace(/\/+$/, '')
  const extension = /\.(md|markdown)$/i.exec(normalized)

  const candidates = new Set<string>()
  candidates.add(normalized)
  if (extension) {
    candidates.add(normalized.slice(0, -extension[0].length))
  } else {
    candidates.add(`${normalized}/README`)
    candidates.add(`${normalized}/index`)
  }

  for (const candidate of candidates) {
    if (docs.has(candidate)) return candidate
  }
  return null
}

function splitOnce(value: string, separator: string): [string, string | null] {
  const index = value.indexOf(separator)
  if (index === -1) return [value, null]
  return [value.slice(0, index), value.slice(index + separator.length)]
}
