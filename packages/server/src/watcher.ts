import path from 'node:path'
import { watch, type FSWatcher } from 'chokidar'
import type { RefreshResult, Vault } from '@docstudio/core'

const IGNORED_PARTS = new Set([
  'node_modules',
  '.git',
  '.docstudio',
  'dist',
  'build',
  'coverage',
  '.next',
  '.venv',
  'vendor',
])

export interface VaultWatcher {
  close: () => Promise<void>
}

export function startWatcher(
  vault: Vault,
  onChange: (result: RefreshResult) => void,
): VaultWatcher {
  let timer: NodeJS.Timeout | null = null
  let watcher: FSWatcher | null = null

  const schedule = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      try {
        onChange(vault.refresh())
      } catch (error) {
        console.error('[docstudio] reindex failed:', error)
      }
    }, 140)
  }

  const isMarkdown = (file: string): boolean => /\.(md|markdown)$/i.test(file)

  watcher = watch(vault.root, {
    ignoreInitial: true,
    // Polling is a safety net for bind mounts and network filesystems that do
    // not deliver inotify events into the container.
    usePolling: process.env.DOCSTUDIO_WATCH_POLL === '1',
    interval: 1_000,
    ignored: (candidate: string) =>
      candidate.split(path.sep).some((part) => IGNORED_PARTS.has(part)),
    awaitWriteFinish: {
      stabilityThreshold: 120,
      pollInterval: 40,
    },
  })

  watcher.on('add', (file) => {
    if (isMarkdown(file)) schedule()
  })
  watcher.on('change', (file) => {
    if (isMarkdown(file)) schedule()
  })
  watcher.on('unlink', (file) => {
    if (isMarkdown(file)) schedule()
  })
  watcher.on('error', (error) => {
    console.error('[docstudio] watcher error:', error)
  })

  return {
    close: async () => {
      if (timer) clearTimeout(timer)
      await watcher?.close()
    },
  }
}
