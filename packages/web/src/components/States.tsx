import type { ReactNode } from 'react'

export function Spinner() {
  return (
    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-accent" />
  )
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5 py-12 text-sm text-faint">
      <Spinner /> {label}
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="card border-red/25 bg-red/5 p-5">
      <p className="text-[11px] uppercase tracking-[0.12em] text-red">Error</p>
      <p className="mt-2 font-mono text-xs text-dim">{message}</p>
    </div>
  )
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-6 py-10 text-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-raised text-faint">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 8.5 6.2 12 13 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="mt-3 text-sm text-dim">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs text-faint">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function SectionHeader({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
        {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
      </div>
      {action}
    </div>
  )
}
