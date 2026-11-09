import GithubSlugger from 'github-slugger'
import type { Heading } from './types.js'

export function safeDecode(value: string | null | undefined): string {
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function normalizeHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[:#]+$/g, '')
    .trim()
}

export function anchorMatches(anchor: string, headings: Heading[]): boolean {
  const decoded = safeDecode(anchor).trim()
  if (!decoded) return false
  const slugger = new GithubSlugger()
  const candidate = slugger.slug(decoded)
  const lower = decoded.toLowerCase()
  return headings.some(
    (heading) =>
      heading.slug === candidate ||
      heading.slug === lower ||
      heading.text.trim().toLowerCase() === lower,
  )
}
