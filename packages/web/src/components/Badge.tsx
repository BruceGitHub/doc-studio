import { STATUS_DOT, STATUS_TEXT, TYPE_STYLES } from '../lib/format'

export function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`chip ${TYPE_STYLES[type] ?? TYPE_STYLES.unknown}`}>{type}</span>
  )
}

export function StatusDot({
  status,
  className = '',
}: {
  status: string
  className?: string
}) {
  return (
    <span
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
        STATUS_DOT[status] ?? STATUS_DOT.unknown
      } ${className}`}
      title={status}
    />
  )
}

export function StatusLabel({ status }: { status: string }) {
  return (
    <span
      className={`font-mono text-[10px] uppercase tracking-[0.08em] ${
        STATUS_TEXT[status] ?? STATUS_TEXT.unknown
      }`}
    >
      {status}
    </span>
  )
}

export function UnreadDot() {
  return (
    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent shadow-[0_0_8px_var(--accent-glow)]" />
  )
}
