import { afterEach, describe, expect, it } from 'vitest'
import { Vault } from '@docstudio/core'
import { createTempVault, doc, type TempVault } from '../../core/test/helpers.js'
import { buildNavTree } from '../src/nav.js'

let vault: TempVault | null = null

afterEach(() => {
  vault?.cleanup()
  vault = null
})

function state() {
  return { lastVisitAt: null, seen: {} }
}

describe('buildNavTree', () => {
  it('mirrors the real directory layout instead of frontmatter projects', () => {
    vault = createTempVault({
      'README.md': doc({
        title: 'Vault home',
        type: 'project',
        status: 'active',
        project: 'vault',
      }),
      'alpha/README.md': doc({
        title: 'Alpha home',
        type: 'project',
        status: 'active',
        project: 'alpha',
      }),
      'alpha/notes/zeta.md': doc({ title: 'Zeta note', type: 'note', status: 'active' }),
      'alpha/notes/alpha.md': doc({ title: 'Alpha note', type: 'note', status: 'active' }),
      'alpha/specs/checkout.md': doc({ title: 'Checkout', type: 'spec', status: 'active' }),
      'beta/README.md': doc({
        title: 'Beta home',
        type: 'project',
        status: 'active',
        // Semantic project does not have to match the folder name.
        project: 'alpha',
      }),
    })

    const index = Vault.open(vault.root)
    const tree = buildNavTree(index, state())

    expect(tree.path).toBe('')
    expect(tree.name).toBe(index.name)
    expect(tree.docCount).toBe(6)
    expect(tree.docs.map((entry) => entry.id)).toEqual(['README'])
    expect(tree.children.map((entry) => entry.name)).toEqual(['alpha', 'beta'])

    const alpha = tree.children[0]
    expect(alpha?.path).toBe('alpha')
    expect(alpha?.label).toBe('Alpha')
    expect(alpha?.docCount).toBe(4)
    expect(alpha?.docs.map((entry) => entry.id)).toEqual(['alpha/README'])
    expect(alpha?.children.map((entry) => entry.path)).toEqual(['alpha/notes', 'alpha/specs'])

    const notes = alpha?.children[0]
    expect(notes?.docCount).toBe(2)
    // Documents in a directory are ordered by type rank, then title.
    expect(notes?.docs.map((entry) => entry.title)).toEqual(['Alpha note', 'Zeta note'])
    expect(notes?.docs.map((entry) => entry.project)).toEqual(['alpha', 'alpha'])

    const beta = tree.children[1]
    expect(beta?.label).toBe('Beta')
    expect(beta?.docs[0]?.project).toBe('alpha')
  })

  it('counts descendants and skips empty branches', () => {
    vault = createTempVault({
      'docs/a/b/one.md': doc({ title: 'One', type: 'note', status: 'draft' }),
    })

    const index = Vault.open(vault.root)
    const tree = buildNavTree(index, state())

    expect(tree.docCount).toBe(1)
    expect(tree.docs).toHaveLength(0)
    expect(tree.children.map((entry) => entry.path)).toEqual(['docs'])
    expect(tree.children[0]?.children[0]?.path).toBe('docs/a')
    expect(tree.children[0]?.children[0]?.children[0]?.path).toBe('docs/a/b')
    expect(tree.children[0]?.children[0]?.children[0]?.docs[0]?.id).toBe('docs/a/b/one')
  })

  it('builds an empty root for a vault with no documents', () => {
    vault = createTempVault({})
    const index = Vault.open(vault.root)
    const tree = buildNavTree(index, state())

    expect(tree.docCount).toBe(0)
    expect(tree.docs).toEqual([])
    expect(tree.children).toEqual([])
  })
})
