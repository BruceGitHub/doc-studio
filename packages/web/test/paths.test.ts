import { describe, expect, it } from 'vitest'
import { pathCrumbs } from '../src/lib/paths'

describe('pathCrumbs', () => {
  it('splits a file path into directory crumbs and a leaf', () => {
    expect(pathCrumbs('checkout-revamp/specs/checkout-v2.md')).toEqual([
      { name: 'checkout-revamp', path: 'checkout-revamp', directory: true },
      { name: 'specs', path: 'checkout-revamp/specs', directory: true },
      { name: 'checkout-v2.md', path: 'checkout-revamp/specs/checkout-v2.md', directory: false },
    ])
  })

  it('handles a document at the vault root', () => {
    expect(pathCrumbs('README.md')).toEqual([
      { name: 'README.md', path: 'README.md', directory: false },
    ])
  })

  it('ignores empty segments', () => {
    expect(pathCrumbs('/ops//runbooks/deploy.md')).toEqual([
      { name: 'ops', path: 'ops', directory: true },
      { name: 'runbooks', path: 'ops/runbooks', directory: true },
      { name: 'deploy.md', path: 'ops/runbooks/deploy.md', directory: false },
    ])
  })
})
