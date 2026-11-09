import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export interface TempVault {
  root: string
  write: (relative: string, content: string, mtime?: Date) => string
  cleanup: () => void
}

export function createTempVault(files: Record<string, string> = {}): TempVault {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'docstudio-test-'))

  const write = (relative: string, content: string, mtime?: Date): string => {
    const target = path.join(root, relative)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, content)
    if (mtime) fs.utimesSync(target, mtime, mtime)
    return target
  }

  for (const [relative, content] of Object.entries(files)) write(relative, content)

  return {
    root,
    write,
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  }
}

export function doc(options: {
  title: string
  body?: string
  type?: string
  status?: string
  project?: string
  references?: string
  extraFrontmatter?: string
}): string {
  const frontmatter = [
    options.type ? `type: ${options.type}` : '',
    options.status ? `status: ${options.status}` : '',
    options.project ? `project: ${options.project}` : '',
    options.extraFrontmatter ?? '',
  ]
    .filter(Boolean)
    .join('\n')

  return [
    frontmatter ? `---\n${frontmatter}\n---` : '',
    `# ${options.title}`,
    options.body ?? '',
    options.references ? `## References\n\n${options.references}` : '',
    '',
  ]
    .filter((part) => part !== '')
    .join('\n\n')
}
