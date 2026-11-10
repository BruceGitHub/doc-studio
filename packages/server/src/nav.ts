import { compareDocs, type DirNodeDTO, type DocRecord, type Vault } from '@docstudio/core'
import { toSummary } from './mappers.js'
import type { StudioState } from './state.js'

interface MutableDir {
  name: string
  label: string
  path: string
  children: Map<string, MutableDir>
  docs: DocRecord[]
}

/**
 * Builds the navigation tree from the real directory layout of the vault.
 * Documents live at the leaf level; directories are pure filesystem entries.
 */
export function buildNavTree(vault: Vault, state: StudioState): DirNodeDTO {
  const root: MutableDir = {
    name: vault.name,
    label: vault.name,
    path: '',
    children: new Map(),
    docs: [],
  }
  const byPath = new Map<string, MutableDir>([['', root]])

  for (const doc of vault.allDocs()) {
    const segments = doc.path.split('/')
    const directories = segments.slice(0, -1)
    let current = root
    let prefix = ''

    for (const segment of directories) {
      prefix = prefix ? `${prefix}/${segment}` : segment
      let child = byPath.get(prefix)
      if (!child) {
        child = {
          name: segment,
          label: labelFromName(segment),
          path: prefix,
          children: new Map(),
          docs: [],
        }
        byPath.set(prefix, child)
        current.children.set(segment, child)
      }
      current = child
    }

    current.docs.push(doc)
  }

  const finalize = (directory: MutableDir): DirNodeDTO => {
    const children = [...directory.children.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(finalize)
    const docs = [...directory.docs]
      .sort(compareDocs)
      .map((doc) => toSummary(doc, state))
    const docCount =
      docs.length + children.reduce((total, child) => total + child.docCount, 0)

    return {
      name: directory.name,
      label: directory.label,
      path: directory.path,
      docCount,
      docs,
      children,
    }
  }

  return finalize(root)
}

function labelFromName(name: string): string {
  const words = name.replace(/[-_]+/g, ' ').trim()
  if (!words) return name
  return words
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
