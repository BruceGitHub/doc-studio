export interface Heading {
  depth: number
  text: string
  slug: string
  line: number
}

export type EdgeSource = 'references' | 'inline'

export interface RawRef {
  kind: string
  target: string
  label: string
  line: number
  source: EdgeSource
  external: boolean
}

export interface Edge extends RawRef {
  from: string
  to: string | null
  resolved: boolean
  anchor: string | null
  brokenAnchor: boolean
}

export type DocFormat = 'markdown' | 'html'

export interface ParsedDoc {
  id: string
  path: string
  absPath: string
  format: DocFormat
  title: string
  type: string
  status: string
  project: string
  tags: string[]
  frontmatter: Record<string, unknown>
  body: string
  text: string
  headings: Heading[]
  refs: RawRef[]
  hasReferencesSection: boolean
  parseError?: string
  mtimeMs: number
  size: number
  updatedAt: string
}

export interface DocRecord extends ParsedDoc {
  outgoing: Edge[]
  backlinks: Edge[]
  parent: string | null
  children: string[]
}

export type IssueKind =
  | 'broken-link'
  | 'broken-anchor'
  | 'missing-type'
  | 'missing-status'
  | 'missing-references'
  | 'orphan'
  | 'stale'
  | 'parse-error'

export interface Issue {
  kind: IssueKind
  severity: 'error' | 'warning'
  docId: string
  message: string
  line?: number
}

export interface ProjectSummary {
  name: string
  label: string
  path: string
  rootId: string | null
  docCount: number
  openCount: number
  byType: Record<string, number>
  byStatus: Record<string, number>
  updatedAt: string
  issueCount: number
}

export interface SearchFilters {
  project?: string
  type?: string
  status?: string
  limit?: number
}

export interface SearchHit {
  doc: DocRecord
  score: number
  snippet: string
  matched: string[]
}

export interface GraphLink {
  from: string
  to: string
  kind: string
}

export interface GraphData {
  focus: string
  nodes: DocRecord[]
  links: GraphLink[]
}

export interface RefreshResult {
  added: string[]
  updated: string[]
  removed: string[]
}

export interface VaultStats {
  docs: number
  projects: number
  open: number
  errors: number
  warnings: number
  byType: Record<string, number>
  byStatus: Record<string, number>
}
