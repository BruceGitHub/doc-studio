import { spawn } from 'node:child_process'
import type { OpenResultDTO } from '@docstudio/core'

export function openInEditor(
  filePath: string,
  editorCommand: string,
  line?: number,
): Promise<OpenResultDTO> {
  const parts = editorCommand.trim().split(/\s+/).filter(Boolean)
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
