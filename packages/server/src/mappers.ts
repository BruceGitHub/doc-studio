import type { DocRecord, DocSummaryDTO, Edge, EdgeDTO, Issue, IssueDTO, Vault } from '@docstudio/core'
import type { StudioState } from './state.js'

export function toSummary(doc: DocRecord, state: StudioState): DocSummaryDTO {
  return {
    id: doc.id,
    path: doc.path,
    title: doc.title,
    type: doc.type,
    status: doc.status,
    project: doc.project,
    tags: doc.tags,
    updatedAt: doc.updatedAt,
    mtimeMs: doc.mtimeMs,
    unread: !state.seen[doc.id],
  }
}

export function toEdge(
  edge: Edge,
  direction: 'out' | 'in',
  vault: Vault,
  state: StudioState,
): EdgeDTO {
  const otherId = direction === 'out' ? edge.to : edge.from
  const other = otherId ? vault.getDoc(otherId) : null
  return {
    kind: edge.kind,
    target: edge.target,
    label: edge.label,
    line: edge.line,
    source: edge.source,
    external: edge.external,
    resolved: edge.resolved,
    anchor: edge.anchor,
    brokenAnchor: edge.brokenAnchor,
    direction,
    doc: other ? toSummary(other, state) : null,
  }
}

export function toIssue(
  issue: Issue,
  vault: Vault,
  state: StudioState,
): IssueDTO | null {
  const doc = vault.getDoc(issue.docId)
  if (!doc) return null
  return {
    kind: issue.kind,
    severity: issue.severity,
    doc: toSummary(doc, state),
    message: issue.message,
    ...(issue.line ? { line: issue.line } : {}),
  }
}
