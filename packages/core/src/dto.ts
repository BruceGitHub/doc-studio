import type { IssueKind } from './types.js'

export interface HeadingDTO {
  depth: number
  text: string
  slug: string
  line: number
}

export interface DocSummaryDTO {
  id: string
  path: string
  title: string
  type: string
  status: string
  project: string
  tags: string[]
  updatedAt: string
  mtimeMs: number
  unread: boolean
}

export interface DocDetailDTO {
  doc: DocSummaryDTO & {
    body: string
    headings: HeadingDTO[]
    frontmatter: Record<string, unknown>
    hasReferencesSection: boolean
    parseError?: string
  }
  breadcrumb: DocSummaryDTO[]
  children: DocSummaryDTO[]
  outgoing: EdgeDTO[]
  backlinks: EdgeDTO[]
  issues: IssueDTO[]
}

export interface EdgeDTO {
  kind: string
  target: string
  label: string
  line: number
  source: 'references' | 'inline'
  external: boolean
  resolved: boolean
  anchor: string | null
  brokenAnchor: boolean
  direction: 'out' | 'in'
  doc: DocSummaryDTO | null
}

export interface ProjectSummaryDTO {
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

export interface TreeNodeDTO {
  doc: DocSummaryDTO
  children: TreeNodeDTO[]
}

export interface ProjectDetailDTO {
  project: ProjectSummaryDTO
  tree: TreeNodeDTO[]
  recent: DocSummaryDTO[]
  issues: IssueDTO[]
  types: Record<string, number>
}

export interface IssueDTO {
  kind: IssueKind
  severity: 'error' | 'warning'
  doc: DocSummaryDTO
  message: string
  line?: number
}

export interface MetaDTO {
  root: string
  name: string
  version: string
  lastIndexedAt: string
  lastVisitAt: string | null
  counts: {
    docs: number
    projects: number
    open: number
    errors: number
    warnings: number
    unread: number
  }
  types: Record<string, number>
  statuses: Record<string, number>
}

export interface AttentionDTO {
  since: string | null
  changed: DocSummaryDTO[]
  openThreads: DocSummaryDTO[]
  unread: DocSummaryDTO[]
  errors: IssueDTO[]
}

export interface SearchHitDTO {
  doc: DocSummaryDTO
  score: number
  snippet: string
  matched: string[]
}

export interface GraphNodeDTO {
  id: string
  title: string
  type: string
  status: string
  project: string
}

export interface GraphLinkDTO {
  from: string
  to: string
  kind: string
}

export interface GraphDTO {
  focus: string
  nodes: GraphNodeDTO[]
  links: GraphLinkDTO[]
}

export interface DoctorGroupDTO {
  kind: IssueKind
  severity: 'error' | 'warning'
  issues: IssueDTO[]
}

export interface DoctorDTO {
  totals: {
    errors: number
    warnings: number
    docs: number
    groups: number
  }
  groups: DoctorGroupDTO[]
}

export interface OpenResultDTO {
  ok: boolean
  command: string
  message?: string
}
