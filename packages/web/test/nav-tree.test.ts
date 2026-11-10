import { describe, expect, it } from 'vitest'
import { ancestorPaths } from '../src/components/NavTree'

describe('ancestorPaths', () => {
  it('returns every directory that contains a document', () => {
    expect(ancestorPaths('alpha/specs/checkout')).toEqual(['alpha', 'alpha/specs'])
  })

  it('returns nothing for a document at the vault root', () => {
    expect(ancestorPaths('README')).toEqual([])
  })

  it('ignores empty segments and handles deep paths', () => {
    expect(ancestorPaths('/ops/runbooks/deploy/')).toEqual(['ops', 'ops/runbooks'])
    expect(ancestorPaths('a/b/c/doc')).toEqual(['a', 'a/b', 'a/b/c'])
  })
})
