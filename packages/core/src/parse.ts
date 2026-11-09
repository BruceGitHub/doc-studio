import path from 'node:path'
import fs from 'node:fs'
import matter from 'gray-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { visit } from 'unist-util-visit'
import { toString } from 'mdast-util-to-string'
import GithubSlugger from 'github-slugger'
import type { Heading as MdHeading, Link, ListItem, Paragraph, Root, RootContent } from 'mdast'
import { normalizeHeading } from './anchors.js'
import type { Heading, ParsedDoc, RawRef } from './types.js'

const DEFAULT_REFERENCE_HEADINGS = [
  'references',
  'reference',
  'refs',
  'riferimenti',
  'riferimento',
]

const MAX_FILE_SIZE = 2 * 1024 * 1024

const TYPE_BY_DIR: Record<string, string> = {
  spec: 'spec',
  specs: 'spec',
  specification: 'spec',
  specifications: 'spec',
  adr: 'adr',
  adrs: 'adr',
  decision: 'adr',
  decisions: 'adr',
  review: 'review',
  reviews: 'review',
  ticket: 'ticket',
  tickets: 'ticket',
  issue: 'ticket',
  issues: 'ticket',
  task: 'task',
  tasks: 'task',
  todo: 'task',
  todos: 'task',
  plan: 'plan',
  plans: 'plan',
  runbook: 'note',
  runbooks: 'note',
  note: 'note',
  notes: 'note',
}

const TYPE_ALIASES: Record<string, string> = {
  specification: 'spec',
  specifications: 'spec',
  rfc: 'spec',
  decision: 'adr',
  decisions: 'adr',
  issue: 'ticket',
  issues: 'ticket',
  todo: 'task',
  todos: 'task',
  runbook: 'note',
  doc: 'note',
}

export interface ParseOptions {
  referenceHeadings?: string[]
  extensions?: string[]
}

export function stripExtension(relPath: string): string {
  return relPath.replace(/\.(md|markdown)$/i, '')
}

export function parseDoc(
  absPath: string,
  relPath: string,
  mtimeMs: number,
  size: number,
  options: ParseOptions = {},
): ParsedDoc {
  const id = stripExtension(relPath)
  const updatedAt = new Date(mtimeMs).toISOString()
  const base: ParsedDoc = {
    id,
    path: relPath,
    absPath,
    title: humanize(path.posix.basename(id)),
    type: 'unknown',
    status: 'unknown',
    project: projectFor(id),
    tags: [],
    frontmatter: {},
    body: '',
    text: '',
    headings: [],
    refs: [],
    hasReferencesSection: false,
    mtimeMs,
    size,
    updatedAt,
  }

  if (size > MAX_FILE_SIZE) {
    return { ...base, parseError: `File is larger than ${MAX_FILE_SIZE} bytes` }
  }

  let raw: string
  try {
    raw = fs.readFileSync(absPath, 'utf8')
  } catch (error) {
    return { ...base, parseError: errorMessage(error) }
  }

  raw = raw.replace(/^\uFEFF/, '')
  let frontmatter: Record<string, unknown> = {}
  let body = raw
  let parseError: string | undefined

  try {
    const parsed = matter(raw)
    frontmatter = isRecord(parsed.data) ? parsed.data : {}
    body = parsed.content
  } catch (error) {
    parseError = `Invalid frontmatter: ${errorMessage(error)}`
  }

  let tree: Root
  try {
    tree = unified().use(remarkParse).parse(body) as Root
  } catch (error) {
    return {
      ...base,
      frontmatter,
      body,
      parseError: parseError ?? `Invalid markdown: ${errorMessage(error)}`,
      ...metadataFromFrontmatter(frontmatter, id, relPath),
    }
  }

  const headings = collectHeadings(tree)
  const aliases = new Set(
    (options.referenceHeadings?.length
      ? options.referenceHeadings
      : DEFAULT_REFERENCE_HEADINGS
    ).map(normalizeHeading),
  )
  const section = findReferenceSection(tree, aliases, body)
  const refs = collectRefs(tree, section)

  const title =
    stringValue(frontmatter.title) ??
    headings.find((heading) => heading.depth === 1)?.text ??
    humanize(path.posix.basename(id))

  return {
    ...base,
    ...metadataFromFrontmatter(frontmatter, id, relPath),
    title,
    frontmatter,
    body,
    text: normalizeText(toString(tree)),
    headings,
    refs,
    hasReferencesSection: section !== null,
    ...(parseError ? { parseError } : {}),
  }
}

function metadataFromFrontmatter(
  frontmatter: Record<string, unknown>,
  id: string,
  relPath: string,
): Pick<ParsedDoc, 'type' | 'status' | 'project' | 'tags'> {
  const declaredType = stringValue(frontmatter.type)
  const type = declaredType ? normalizeType(declaredType) : inferType(relPath)
  const declaredStatus = stringValue(frontmatter.status)
  const status = declaredStatus ? normalizeStatus(declaredStatus) : 'unknown'
  const declaredProject = stringValue(frontmatter.project)
  return {
    type,
    status,
    project: declaredProject ? slugifyName(declaredProject) : projectFor(id),
    tags: tagsFrom(frontmatter.tags),
  }
}

function collectHeadings(tree: Root): Heading[] {
  const slugger = new GithubSlugger()
  const headings: Heading[] = []
  visit(tree, 'heading', (node: MdHeading) => {
    const text = toString(node).trim()
    if (!text) return
    headings.push({
      depth: node.depth,
      text,
      slug: slugger.slug(text),
      line: node.position?.start.line ?? 0,
    })
  })
  return headings
}

interface ReferenceSection {
  start: number
  end: number
  nodes: RootContent[]
}

function findReferenceSection(
  tree: Root,
  aliases: Set<string>,
  body: string,
): ReferenceSection | null {
  const children = tree.children
  for (let index = 0; index < children.length; index += 1) {
    const node = children[index]
    if (!node || node.type !== 'heading') continue
    if (!aliases.has(normalizeHeading(toString(node)))) continue
    const nodes: RootContent[] = []
    let end = node.position?.end.offset ?? 0
    for (let cursor = index + 1; cursor < children.length; cursor += 1) {
      const next = children[cursor]
      if (!next) break
      if (next.type === 'heading' && next.depth <= node.depth) break
      nodes.push(next)
      end = next.position?.end.offset ?? end
    }
    return {
      start: node.position?.start.offset ?? 0,
      end: Math.min(end, body.length),
      nodes,
    }
  }
  return null
}

function collectRefs(tree: Root, section: ReferenceSection | null): RawRef[] {
  const refs: RawRef[] = []
  if (section) {
    for (const node of section.nodes) {
      if (node.type === 'list') {
        for (const item of node.children) {
          collectFromListItem(item, refs)
        }
      } else if (node.type === 'paragraph') {
        collectFromParagraph(node, refs, 'untyped')
      }
    }
  }

  const start = section?.start ?? Number.POSITIVE_INFINITY
  const end = section?.end ?? -1
  visit(tree, 'link', (node: Link) => {
    const offset = node.position?.start.offset
    if (offset != null && offset >= start && offset < end) return
    const target = node.url?.trim()
    if (!target || target.startsWith('#')) return
    refs.push({
      kind: 'untyped',
      target,
      label: toString(node).trim() || target,
      line: node.position?.start.line ?? 0,
      source: 'inline',
      external: isExternalTarget(target),
    })
  })

  return dedupe(refs)
}

function collectFromListItem(item: ListItem, refs: RawRef[]): void {
  const paragraph = item.children.find((child): child is Paragraph => child.type === 'paragraph')
  if (paragraph) {
    collectFromParagraph(paragraph, refs, 'untyped')
    return
  }
  const text = normalizeText(toString(item))
  if (!text) return
  refs.push({
    kind: 'untyped',
    target: text,
    label: text,
    line: item.position?.start.line ?? 0,
    source: 'references',
    external: isExternalTarget(text),
  })
}

function collectFromParagraph(
  paragraph: Paragraph,
  refs: RawRef[],
  fallbackKind: string,
): void {
  const line = paragraph.position?.start.line ?? 0
  let kind = fallbackKind
  let hasKindPrefix = false
  const first = paragraph.children[0]
  if (first && first.type === 'text') {
    const match = /^\s*`([^`]+)`\s*:\s*/.exec(first.value)
    if (match?.[1]) {
      kind = normalizeKind(match[1])
      hasKindPrefix = true
    }
  } else if (first && first.type === 'inlineCode') {
    const next = paragraph.children[1]
    if (next && next.type === 'text' && /^\s*:\s*/.test(next.value)) {
      kind = normalizeKind(first.value)
      hasKindPrefix = true
    }
  }

  const links: Link[] = []
  visit(paragraph, 'link', (node: Link) => {
    links.push(node)
  })

  if (links.length > 0) {
    for (const link of links) {
      const target = link.url?.trim()
      if (!target) continue
      refs.push({
        kind,
        target,
        label: toString(link).trim() || target,
        line,
        source: 'references',
        external: isExternalTarget(target),
      })
    }
    return
  }

  let plain = normalizeText(toString(paragraph))
  if (hasKindPrefix) plain = plain.replace(/^[^:]{1,40}:\s*/, '')
  plain = plain.trim()
  if (!plain) return
  refs.push({
    kind,
    target: plain,
    label: plain,
    line,
    source: 'references',
    external: isExternalTarget(plain),
  })
}

function dedupe(refs: RawRef[]): RawRef[] {
  const seen = new Set<string>()
  const out: RawRef[] = []
  for (const ref of refs) {
    const key = `${ref.source}|${ref.kind}|${ref.target}|${ref.line}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(ref)
  }
  return out
}

export function isExternalTarget(target: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(target) || /^[A-Z][A-Z0-9]{1,9}-\d{1,6}$/.test(target)
}

function normalizeKind(kind: string): string {
  return kind
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function normalizeType(type: string): string {
  const normalized = type.trim().toLowerCase().replace(/[\s_]+/g, '-')
  return TYPE_ALIASES[normalized] ?? normalized
}

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase().replace(/[\s_]+/g, '-')
}

function inferType(relPath: string): string {
  const segments = relPath.split('/')
  const file = segments.at(-1)?.toLowerCase() ?? ''
  const id = stripExtension(file)
  if ((id === 'readme' || id === 'project') && segments.length <= 2) return 'project'
  for (let index = segments.length - 2; index >= 0; index -= 1) {
    const segment = segments[index]?.toLowerCase()
    if (!segment) continue
    const type = TYPE_BY_DIR[segment]
    if (type) return type
  }
  if (id === 'readme') return 'project'
  return 'unknown'
}

function projectFor(id: string): string {
  const slash = id.indexOf('/')
  return slash === -1 ? 'vault' : slugifyName(id.slice(0, slash))
}

function slugifyName(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '') || 'vault'
  )
}

function tagsFrom(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim())
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function humanize(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\p{L}/gu, (char) => char.toUpperCase())
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
