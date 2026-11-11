import { describe, expect, it } from 'vitest'
import { codeLanguage, markdownSchema, mermaidSource } from '../src/lib/markdown'

describe('codeLanguage', () => {
  it('reads the language from the class list rehype adds', () => {
    expect(codeLanguage('hljs language-mermaid')).toBe('mermaid')
    expect(codeLanguage('language-ts')).toBe('ts')
    expect(codeLanguage('hljs language-TypeScript')).toBe('typescript')
  })

  it('returns null when there is no language', () => {
    expect(codeLanguage(undefined)).toBeNull()
    expect(codeLanguage('hljs')).toBeNull()
  })
})

describe('mermaidSource', () => {
  it('returns the trimmed source only for mermaid fences', () => {
    expect(mermaidSource('hljs language-mermaid', '\nflowchart LR\n  A --> B\n')).toBe(
      'flowchart LR\n  A --> B',
    )
    expect(mermaidSource('hljs language-bash', 'ls -la')).toBeNull()
    expect(mermaidSource(undefined, 'plain')).toBeNull()
  })
})

describe('markdownSchema', () => {
  it('keeps explicit anchors usable from in-page links', () => {
    expect(markdownSchema.clobber).toEqual([])
  })

  it('keeps table alignment on header and body cells', () => {
    const rules = markdownSchema.attributes?.td ?? []
    const style = rules.find(
      (rule): rule is [string, RegExp] => Array.isArray(rule) && rule[0] === 'style',
    )
    expect(style?.[1].test('text-align: center')).toBe(true)
    expect(style?.[1].test('position: fixed')).toBe(false)
  })
})
