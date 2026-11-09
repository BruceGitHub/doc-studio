import { compareDocs, type DocRecord, type Vault } from '@docstudio/core'
import type { TreeNodeDTO } from '@docstudio/core'
import { toSummary } from './mappers.js'
import type { StudioState } from './state.js'

export function buildProjectTree(
  vault: Vault,
  projectName: string,
  state: StudioState,
): TreeNodeDTO[] {
  const project = vault.project(projectName)
  const docs = vault.docsInProject(projectName)
  const byId = new Map(docs.map((doc) => [doc.id, doc]))
  const rootId = project?.rootId ?? null
  const parentOf = new Map<string, string | null>()

  for (const doc of docs) {
    let parent: string | null = null
    if (doc.parent && doc.parent !== doc.id && byId.has(doc.parent)) {
      parent = doc.parent
    } else if (rootId && doc.id !== rootId && byId.has(rootId)) {
      parent = rootId
    }
    parentOf.set(doc.id, parent)
  }

  for (const doc of docs) {
    const seen = new Set<string>([doc.id])
    let cursor = parentOf.get(doc.id) ?? null
    while (cursor) {
      if (seen.has(cursor)) {
        parentOf.set(doc.id, null)
        break
      }
      seen.add(cursor)
      cursor = parentOf.get(cursor) ?? null
    }
  }

  const childrenOf = new Map<string, DocRecord[]>()
  for (const doc of docs) {
    const parent = parentOf.get(doc.id)
    if (!parent) continue
    const list = childrenOf.get(parent) ?? []
    list.push(doc)
    childrenOf.set(parent, list)
  }
  for (const list of childrenOf.values()) list.sort(compareDocs)

  const roots = docs.filter((doc) => !parentOf.get(doc.id)).sort(compareDocs)
  const visited = new Set<string>()

  const build = (doc: DocRecord, depth: number): TreeNodeDTO => {
    visited.add(doc.id)
    const children =
      depth >= 24
        ? []
        : (childrenOf.get(doc.id) ?? [])
            .filter((child) => !visited.has(child.id))
            .map((child) => build(child, depth + 1))
    return { doc: toSummary(doc, state), children }
  }

  const tree = roots.map((doc) => build(doc, 0))
  for (const doc of [...docs].sort(compareDocs)) {
    if (!visited.has(doc.id)) tree.push(build(doc, 0))
  }
  return tree
}
