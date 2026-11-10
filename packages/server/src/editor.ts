import { spawn } from 'node:child_process'
import type { OpenResultDTO } from '@docstudio/core'

export function openInEditor(
  filePath: string,
  editorCommand: string,
  line?: number,
): Promise<OpenResultDTO> {
  const parts = splitCommand(editorCommand)
  const bin = parts[0]
  if (!bin) {
    return Promise.resolve({
      ok: false,
      command: editorCommand,
      message: 'No editor configured',
    })
  }

  const [command, ...args] = parts as [string, ...string[]]
  const isVsCode = /(^|\/)code(-insiders)?$/.test(command)
  const target = line && line > 0 ? `${filePath}:${line}` : filePath
  const finalArgs = isVsCode && line && line > 0 ? ['-g', target] : [...args, target]
  const printable = [command, ...finalArgs].join(' ')

  return new Promise((resolve) => {
    try {
      const child = spawn(command, finalArgs, {
        detached: true,
        stdio: 'ignore',
      })
      child.once('error', (error) => {
        resolve({ ok: false, command: printable, message: error.message })
      })
      child.once('spawn', () => {
        child.unref()
        resolve({ ok: true, command: printable })
      })
    } catch (error) {
      resolve({
        ok: false,
        command: printable,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  })
}

/** Splits an editor command, keeping quoted paths with spaces intact. */
function splitCommand(command: string): string[] {
  const parts: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null

  for (const char of command.trim()) {
    if (quote) {
      if (char === quote) quote = null
      else current += char
    } else if (char === '"' || char === "'") {
      quote = char
    } else if (/\s/.test(char)) {
      if (current) {
        parts.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }
  if (current) parts.push(current)
  return parts
}

const EDITOR_SCHEMES: Record<string, string> = {
  code: 'vscode',
  'code-insiders': 'vscode-insiders',
  codium: 'vscodium',
  cursor: 'cursor',
  windsurf: 'windsurf',
}

/** The custom protocol a known editor registers with the browser. */
export function editorScheme(editorCommand: string): string | null {
  const bin = splitCommand(editorCommand)[0] ?? ''
  const name = bin
    .split(/[\\/]/)
    .pop()
    ?.replace(/\.(exe|cmd|bat|sh)$/i, '')
    .toLowerCase()
  return name ? (EDITOR_SCHEMES[name] ?? null) : null
}

/** `vscode://file/home/me/vault/note.md:12` */
export function toEditorUrl(scheme: string, absolutePath: string, line?: number): string {
  const forward = absolutePath.replace(/\\/g, '/')
  const withSlash = forward.startsWith('/') ? forward : `/${forward}`
  const encoded = withSlash
    .split('/')
    .map((segment) => encodeURIComponent(segment).replace(/%3A/gi, ':'))
    .join('/')
  const suffix = line && line > 0 ? `:${line}` : ''
  return `${scheme}://file${encoded}${suffix}`
}

export interface EditorUrlOptions {
  editorCommand: string
  /** Absolute path of the vault as the host (browser machine) sees it. */
  hostRoot: string | null
  /** Vault-relative path of the file to open. */
  relativePath: string
  line?: number
  /** Optional template with `{path}` and `{line}` placeholders. */
  template?: string | null
}

/**
 * Builds a browser-launchable URL for editors that register a custom protocol.
 * This is the fallback when the server runs where the editor cannot be spawned
 * (a container), while the browser still runs on the host.
 */
export function editorUrl(options: EditorUrlOptions): string | undefined {
  if (!options.hostRoot) return undefined
  const hostPath = options.hostRoot.endsWith('/') || options.hostRoot.endsWith('\\')
    ? `${options.hostRoot}${options.relativePath}`
    : `${options.hostRoot}/${options.relativePath}`

  if (options.template) {
    return options.template
      .replaceAll('{path}', hostPath)
      .replaceAll('{line}', options.line && options.line > 0 ? String(options.line) : '')
  }

  const scheme = editorScheme(options.editorCommand)
  return scheme ? toEditorUrl(scheme, hostPath, options.line) : undefined
}
