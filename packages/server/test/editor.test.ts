import { describe, expect, it } from 'vitest'
import { editorScheme, editorUrl, toEditorUrl } from '../src/editor.js'

describe('editorScheme', () => {
  it('maps known editor commands to browser protocols', () => {
    expect(editorScheme('code')).toBe('vscode')
    expect(editorScheme('code -g')).toBe('vscode')
    expect(editorScheme('/usr/bin/code-insiders')).toBe('vscode-insiders')
    expect(editorScheme('"C:\\Program Files\\Microsoft VS Code\\bin\\code.cmd" -g')).toBe(
      'vscode',
    )
    expect(editorScheme('cursor --reuse-window')).toBe('cursor')
  })

  it('returns null for editors without a registered protocol', () => {
    expect(editorScheme('vim')).toBeNull()
    expect(editorScheme('')).toBeNull()
  })
})

describe('toEditorUrl', () => {
  it('builds a vscode file URL with a line number', () => {
    expect(toEditorUrl('vscode', '/home/me/vault/a note.md', 12)).toBe(
      'vscode://file/home/me/vault/a%20note.md:12',
    )
  })

  it('normalizes Windows paths', () => {
    expect(toEditorUrl('vscode', 'C:\\Users\\me\\vault\\a.md')).toBe(
      'vscode://file/C:/Users/me/vault/a.md',
    )
  })
})

describe('editorUrl', () => {
  it('needs a host root inside a container', () => {
    expect(
      editorUrl({ editorCommand: 'code', hostRoot: null, relativePath: 'a.md' }),
    ).toBeUndefined()
  })

  it('joins the host root and the vault-relative file', () => {
    expect(
      editorUrl({
        editorCommand: 'code',
        hostRoot: '/home/me/vault',
        relativePath: 'alpha/note.md',
        line: 3,
      }),
    ).toBe('vscode://file/home/me/vault/alpha/note.md:3')
  })

  it('supports a custom URL template', () => {
    expect(
      editorUrl({
        editorCommand: 'code',
        hostRoot: 'C:\\vault',
        relativePath: 'a.md',
        line: 7,
        template: 'vscode://file/{path}:{line}',
      }),
    ).toBe('vscode://file/C:\\vault/a.md:7')
  })
})
