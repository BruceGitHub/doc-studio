export const APP_VERSION = '0.1.0'

export const OPEN_STATUSES = new Set([
  'open',
  'active',
  'in-progress',
  'wip',
  'blocked',
  'needs-review',
  'review',
  'todo',
  'proposed',
])

export const OPEN_STATUS_LIST = [...OPEN_STATUSES]

export const TYPE_ORDER = [
  'project',
  'spec',
  'adr',
  'review',
  'ticket',
  'task',
  'plan',
  'note',
  'unknown',
]

export function typeRank(type: string): number {
  const index = TYPE_ORDER.indexOf(type)
  return index === -1 ? TYPE_ORDER.length : index
}

export function isOpenStatus(status: string): boolean {
  return OPEN_STATUSES.has(status)
}
