#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import { APP_VERSION, isOpenStatus, Vault, type Issue, type IssueKind } from '@docstudio/core'
import { startServer } from '@docstudio/server'

const program = new Command()

program
  .name('docstudio')
  .description('Local read model and navigator for markdown-driven projects.')
  .version(APP_VERSION)

function resolveVault(candidate?: string): string {
  return path.resolve(candidate ?? process.env.DOCSTUDIO_VAULT ?? process.cwd())
}

function defaultWebDir(): string | null {
  const candidates = [
    fileURLToPath(new URL('../../web/dist', import.meta.url)),
    path.resolve(process.cwd(), 'packages/web/dist'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) return candidate
  }
  return null
}

function parsePort(value: string): number {
  const port = Number.parseInt(value, 10)
  if (!Number.isFinite(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid port: ${value}`)
  }
  return port
}

function relativePath(from: string, to: string): string {
  const value = path.relative(from, to).replace(/\\/g, '/')
  return value.startsWith('.') ? value : `./${value}`
}

function accent(value: string): string {
  return process.stdout.isTTY ? `\u001b[38;5;111m${value}\u001b[0m` : value
}

function dim(value: string): string {
  return process.stdout.isTTY ? `\u001b[2m${value}\u001b[0m` : value
}

function red(value: string): string {
  return process.stdout.isTTY ? `\u001b[31m${value}\u001b[0m` : value
}

function yellow(value: string): string {
  return process.stdout.isTTY ? `\u001b[33m${value}\u001b[0m` : value
}

function printIssues(issues: Issue[], vault: Vault, limit = 12): void {
  const byKind = new Map<IssueKind, Issue[]>()
  for (const issue of issues) {
    const list = byKind.get(issue.kind) ?? []
    list.push(issue)
    byKind.set(issue.kind, list)
  }
  for (const [kind, list] of [...byKind.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const severity = list[0]?.severity ?? 'warning'
    const mark = severity === 'error' ? red('✖') : yellow('▲')
    console.log(`\n${mark} ${kind} ${dim(`(${list.length})`)}`)
    for (const issue of list.slice(0, limit)) {
      const doc = vault.getDoc(issue.docId)
      console.log(`  ${doc?.title ?? issue.docId}`)
      console.log(`  ${dim(issue.docId)}`)
      console.log(`  ${issue.message}`)
    }
    if (list.length > limit) console.log(dim(`  … ${list.length - limit} more`))
  }
}

program
  .command('serve')
  .argument('[vault]', 'vault directory (default: DOCSTUDIO_VAULT or cwd)')
  .option('-p, --port <port>', 'port to listen on', '4321')
  .option('--host <host>', 'host to bind', '127.0.0.1')
  .option('--editor <command>', 'editor command', process.env.DOCSTUDIO_EDITOR ?? 'code')
  .option('--web-dir <dir>', 'directory of the built web UI')
  .option('--no-watch', 'disable file watching')
  .action(async (vaultArg: string | undefined, opts) => {
    const root = resolveVault(vaultArg)
    const webDir = opts.webDir ? path.resolve(opts.webDir) : defaultWebDir()
    const port = parsePort(String(opts.port))
    const host = String(opts.host)

    const handle = await startServer({
      root,
      port,
      host,
      editor: String(opts.editor),
      webDir,
      watch: opts.watch !== false,
    })

    const stats = handle.vault.stats()
    const urlHost = host === '0.0.0.0' ? '127.0.0.1' : host
    console.log('')
    console.log(`  ${accent('Doc Studio')} ${dim(`v${APP_VERSION}`)}`)
    console.log(`  vault   ${handle.vault.root}`)
    console.log(
      `  index   ${stats.docs} docs · ${stats.projects} projects · ${stats.open} open · ${red(String(stats.errors))} errors · ${yellow(String(stats.warnings))} warnings`,
    )
    console.log(`  editor  ${String(opts.editor)}`)
    console.log(`  watch   ${opts.watch === false ? 'off' : 'on'} · ${dim(handle.vault.lastIndexedAt)}`)
    if (webDir) {
      console.log(`\n  ${accent(`http://${urlHost}:${port}`)}\n`)
    } else {
      console.log(
        `\n  API     ${accent(`http://${urlHost}:${port}`)}\n  ${yellow('Web UI not built.')} Run \`pnpm build\` or \`pnpm dev\`.\n`,
      )
    }

    const shutdown = async (): Promise<void> => {
      await handle.close()
      process.exit(0)
    }
    process.once('SIGINT', shutdown)
    process.once('SIGTERM', shutdown)
  })

program
  .command('index')
  .argument('[vault]', 'vault directory', process.env.DOCSTUDIO_VAULT ?? '.')
  .option('--json', 'print JSON')
  .action((vaultArg: string, opts) => {
    const vault = Vault.open(resolveVault(vaultArg))
    const stats = vault.stats()
    if (opts.json) {
      console.log(
        JSON.stringify(
          {
            root: vault.root,
            lastIndexedAt: vault.lastIndexedAt,
            ...stats,
            projectNames: vault.projects().map((project) => project.name),
          },
          null,
          2,
        ),
      )
      return
    }
    console.log(`${accent('Indexed')} ${stats.docs} documents in ${vault.root}`)
    console.log(
      `${stats.projects} projects · ${stats.open} open · ${red(String(stats.errors))} errors · ${yellow(String(stats.warnings))} warnings`,
    )
  })

program
  .command('doctor')
  .argument('[vault]', 'vault directory', process.env.DOCSTUDIO_VAULT ?? '.')
  .option('--json', 'print JSON')
  .action((vaultArg: string, opts) => {
    const vault = Vault.open(resolveVault(vaultArg))
    const issues = vault.issues()
    const stats = vault.stats()

    if (opts.json) {
      console.log(JSON.stringify({ root: vault.root, stats, issues }, null, 2))
    } else if (issues.length === 0) {
      console.log(`${accent('✓')} No issues found in ${vault.root}`)
    } else {
      console.log(`${accent('Doc Studio doctor')} — ${vault.root}`)
      printIssues(issues, vault)
      console.log(
        `\n${red(`${stats.errors} errors`)} · ${yellow(`${stats.warnings} warnings`)} across ${stats.docs} documents`,
      )
    }

    if (stats.errors > 0) process.exitCode = 1
  })

program
  .command('search')
  .argument('<query>', 'full-text query')
  .argument('[vault]', 'vault directory', process.env.DOCSTUDIO_VAULT ?? '.')
  .option('--project <project>', 'filter by project')
  .option('--type <type>', 'filter by document type')
  .option('--limit <limit>', 'max results', '15')
  .action((query: string, vaultArg: string, opts) => {
    const vault = Vault.open(resolveVault(vaultArg))
    const limit = Number.parseInt(String(opts.limit), 10)
    const hits = vault.search(query, {
      project: opts.project,
      type: opts.type,
      limit: Number.isFinite(limit) ? limit : 15,
    })
    if (hits.length === 0) {
      console.log(`No results for ${JSON.stringify(query)}`)
      return
    }
    for (const hit of hits) {
      const mark = isOpenStatus(hit.doc.status) ? '●' : '○'
      console.log(
        `${mark} ${accent(hit.doc.title)}  ${dim(`${hit.doc.type}/${hit.doc.status}`)}`,
      )
      console.log(`  ${dim(hit.doc.path)}`)
      if (hit.snippet) console.log(`  ${hit.snippet}`)
      console.log('')
    }
  })

const TYPE_FOLDERS: Record<string, string> = {
  spec: 'specs',
  adr: 'adr',
  review: 'reviews',
  ticket: 'tickets',
  task: 'tasks',
  plan: 'plans',
  note: 'notes',
  project: '',
}

program
  .command('new')
  .argument('<type>', 'document type: spec, adr, review, ticket, task, plan, note')
  .argument('<title>', 'document title')
  .argument('[vault]', 'vault directory', process.env.DOCSTUDIO_VAULT ?? '.')
  .option('--project <project>', 'project to add the document to')
  .option('--dir <dir>', 'directory relative to the vault root')
  .action((type: string, title: string, vaultArg: string, opts) => {
    const normalizedType = type.trim().toLowerCase()
    if (!(normalizedType in TYPE_FOLDERS)) {
      throw new Error(`Unknown type "${type}". Use one of: ${Object.keys(TYPE_FOLDERS).join(', ')}`)
    }
    const root = resolveVault(vaultArg)
    const vault = Vault.open(root)
    const projectName =
      opts.project ??
      vault.projects().find((project) => project.name !== 'vault')?.name ??
      'vault'
    const project = vault.project(projectName)
    if (!project) throw new Error(`Project not found: ${projectName}`)

    const folder = TYPE_FOLDERS[normalizedType] ?? ''
    const baseDir = opts.dir
      ? path.resolve(root, String(opts.dir))
      : path.join(root, projectName === 'vault' ? '' : projectName, folder)
    const slug = slugify(title)
    const filename = normalizedType === 'project' ? 'README.md' : `${slug}.md`
    const target = path.join(baseDir, filename)
    if (fs.existsSync(target)) throw new Error(`File already exists: ${target}`)

    const rootDoc = project.rootId ? vault.getDoc(project.rootId) : null
    const parentLine =
      rootDoc && rootDoc.id !== stripExt(path.relative(root, target))
        ? `- \`parent\`: [${rootDoc.title}](${relativePath(baseDir, rootDoc.absPath)})\n`
        : ''

    const content = `---
type: ${normalizedType}
status: draft
project: ${projectName}
---

# ${title}

## References

${parentLine || '_No references yet._\n'}
`

    fs.mkdirSync(baseDir, { recursive: true })
    fs.writeFileSync(target, content)
    const relative = path.relative(root, target)
    console.log(`${accent('Created')} ${relative}`)
    console.log(dim(`  ${normalizedType} · ${project.label}`))
  })

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled'
  )
}

function stripExt(value: string): string {
  return value.replace(/\.(md|markdown)$/i, '').replace(/\\/g, '/')
}

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
