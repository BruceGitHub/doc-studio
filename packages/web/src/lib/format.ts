export const TYPE_STYLES: Record<string, string> = {
  project: 'border-accent/25 bg-accent/10 text-accent',
  spec: 'border-cyan/25 bg-cyan/10 text-cyan',
  adr: 'border-violet/25 bg-violet/10 text-violet',
  review: 'border-amber/25 bg-amber/10 text-amber',
  ticket: 'border-green/25 bg-green/10 text-green',
  task: 'border-cyan/25 bg-cyan/10 text-cyan',
  plan: 'border-pink/25 bg-pink/10 text-pink',
  note: 'border-line bg-raised text-dim',
  unknown: 'border-line bg-raised text-faint',
}

export const TYPE_BAR: Record<string, string> = {
  project: 'bg-accent',
  spec: 'bg-cyan',
  adr: 'bg-violet',
  review: 'bg-amber',
  ticket: 'bg-green',
  task: 'bg-cyan/70',
  plan: 'bg-pink',
  note: 'bg-faint',
  unknown: 'bg-line',
}

export const TYPE_COLOR: Record<string, string> = {
  project: 'var(--type-project)',
  spec: 'var(--type-spec)',
  adr: 'var(--type-adr)',
  review: 'var(--type-review)',
  ticket: 'var(--type-ticket)',
  task: 'var(--type-task)',
  plan: 'var(--type-plan)',
  note: 'var(--type-note)',
  unknown: 'var(--type-unknown)',
}

export const STATUS_DOT: Record<string, string> = {
  open: 'bg-amber',
  active: 'bg-green',
  'in-progress': 'bg-green',
  wip: 'bg-green',
  blocked: 'bg-red',
  done: 'bg-green/50',
  draft: 'bg-faint',
  accepted: 'bg-violet',
  proposed: 'bg-cyan',
  'needs-review': 'bg-amber',
  review: 'bg-amber',
  todo: 'bg-dim',
  superseded: 'bg-faint',
  archived: 'bg-faint',
  unknown: 'bg-line',
}

export const STATUS_TEXT: Record<string, string> = {
  open: 'text-amber',
  active: 'text-green',
  'in-progress': 'text-green',
  wip: 'text-green',
  blocked: 'text-red',
  done: 'text-green/70',
  draft: 'text-faint',
  accepted: 'text-violet',
  proposed: 'text-cyan',
  'needs-review': 'text-amber',
  review: 'text-amber',
  todo: 'text-dim',
  superseded: 'text-faint',
  archived: 'text-faint',
  unknown: 'text-faint',
}

export const ISSUE_LABEL: Record<string, string> = {
  'broken-link': 'Broken references',
  'broken-anchor': 'Broken anchors',
  orphan: 'Orphan documents',
  'missing-type': 'Missing type',
  'missing-status': 'Missing status',
  'missing-references': 'No references section',
  stale: 'Stale open documents',
  'parse-error': 'Parse errors',
}

export const ISSUE_HELP: Record<string, string> = {
  'broken-link': 'A declared reference points to a file that does not exist.',
  'broken-anchor': 'The target document exists, but the section anchor does not.',
  orphan: 'No parent reference, so the document sits outside the project tree.',
  'missing-type': 'Add type to frontmatter, or move the document into a known folder.',
  'missing-status': 'Add status to frontmatter so the document can enter the workflow.',
  'missing-references': 'Add a ## References section to connect the document to the graph.',
  stale: 'Open but untouched for a long time: confirm it is still relevant.',
  'parse-error': 'Frontmatter or markdown could not be parsed.',
}

export function relativeTime(iso: string): string {
  const timestamp = Date.parse(iso)
  if (Number.isNaN(timestamp)) return ''
  const diff = Date.now() - timestamp
  const minutes = Math.round(diff / 60_000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.round(months / 12)}y ago`
}

export function absoluteTime(iso: string): string {
  const timestamp = Date.parse(iso)
  if (Number.isNaN(timestamp)) return iso
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function plural(count: number, singular: string, pluralForm?: string): string {
  return `${count} ${count === 1 ? singular : (pluralForm ?? `${singular}s`)}`
}

export function truncate(value: string, max = 34): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}
