import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { IssueDTO } from '@docstudio/core'
import { ISSUE_HELP } from '../lib/format'
import { docHref } from '../lib/paths'

/**
 * Error rows that show the full message in place. The list never clips or
 * scrolls the content horizontally: a row expands to give the message and the
 * help text all the room they need.
 */
export function IssueList({
  issues,
  empty,
}: {
  issues: IssueDTO[]
  empty?: string
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set())

  const toggle = (key: string): void => {
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (issues.length === 0) {
    return <p className="px-3 py-4 text-xs text-faint">{empty ?? 'No issues.'}</p>
  }

  return (
    <div className="space-y-1.5 p-2">
      {issues.map((issue, index) => {
        const key = `${issue.doc.id}-${issue.kind}-${issue.line ?? 0}-${index}`
        const expanded = open.has(key)
        return (
          <div
            key={key}
            className={`rounded-lg border transition-colors ${
              expanded ? 'border-line bg-raised/40' : 'border-line-soft hover:border-line'
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(key)}
              aria-expanded={expanded}
              className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left"
            >
              <span
                className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] ${
                  issue.severity === 'error'
                    ? 'bg-red/10 text-red'
                    : 'bg-amber/10 text-amber'
                }`}
              >
                {issue.kind}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium text-ink">
                  {issue.doc.title}
                </span>
                <span
                  className={`mt-0.5 block text-[11px] leading-5 text-dim ${
                    expanded ? 'whitespace-pre-wrap break-words' : 'line-clamp-2'
                  }`}
                >
                  {issue.message}
                </span>
                <span className="mt-0.5 block truncate font-mono text-[9px] text-faint">
                  {issue.doc.path}
                  {issue.line ? `:${issue.line}` : ''}
                </span>
              </span>

              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                className={`mt-1 shrink-0 text-faint transition-transform duration-150 ${
                  expanded ? 'rotate-90' : ''
                }`}
                aria-hidden="true"
              >
                <path
                  d="M3 1.5 7 5 3 8.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {expanded && (
              <div className="space-y-2 border-t border-line-soft px-3 py-2.5">
                <p className="text-[11px] leading-5 text-faint">
                  {ISSUE_HELP[issue.kind] ?? 'Structural issue found by the doctor.'}
                </p>
                <Link
                  to={docHref(issue.doc.id)}
                  className="inline-flex text-[11px] font-medium text-accent transition-colors hover:underline"
                >
                  Open document →
                </Link>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
