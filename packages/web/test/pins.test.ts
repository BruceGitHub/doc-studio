import { afterEach, describe, expect, it, vi } from 'vitest'
import { readPins, sortDocsWithPins, writePins } from '../src/lib/pins'

const docs = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]

describe('sortDocsWithPins', () => {
  it('keeps the original order when nothing is pinned', () => {
    expect(sortDocsWithPins(docs, new Set()).map((doc) => doc.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ])
  })

  it('moves pinned documents above the rest, keeping each group stable', () => {
    expect(sortDocsWithPins(docs, new Set(['c', 'a'])).map((doc) => doc.id)).toEqual([
      'a',
      'c',
      'b',
      'd',
    ])
  })

  it('does not mutate the input array', () => {
    const original = [...docs]
    sortDocsWithPins(docs, new Set(['d']))
    expect(docs).toEqual(original)
  })

  it('ignores pinned ids that are not in the folder', () => {
    expect(sortDocsWithPins(docs, new Set(['missing'])).map((doc) => doc.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ])
  })
})

describe('readPins / writePins', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips through localStorage', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    })

    writePins(new Set(['a', 'b']))
    expect(readPins()).toEqual(new Set(['a', 'b']))
  })

  it('ignores malformed stored values', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => '{"not":"a list"}',
      setItem: () => undefined,
    })
    expect(readPins()).toEqual(new Set())
  })

  it('falls back to an empty set when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    expect(readPins()).toEqual(new Set())
    expect(() => writePins(new Set(['a']))).not.toThrow()
  })
})
