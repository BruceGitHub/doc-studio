import type { ReactNode } from 'react'

/**
 * Native `<details>` wrapper for noisy panels (issue lists, health groups).
 * Closed by default so the summary is visible without the content taking over
 * the page.
 */
export function Disclosure({
  title,
  subtitle,
  meta,
  children,
  defaultOpen = false,
  tone = 'line',
}: {
  title: ReactNode
  subtitle?: ReactNode
  meta?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  tone?: 'line' | 'amber'
}) {
  return (
    <details
      open={defaultOpen}
      className={`group rounded-[14px] border bg-surface ${
        tone === 'amber' ? 'border-amber/25' : 'border-line'
      }`}
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 px-5 py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="mt-0.5 flex h-5 w-4 shrink-0 items-center justify-center text-faint">
          <svg
            width="9"
            height="9"
            viewBox="0 0 10 10"
            className="transition-transform duration-150 group-open:rotate-90"
            aria-hidden="true"
          >
            <path
              d="M3 1.5 7 5 3 8.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold tracking-tight text-ink">
            {title}
          </span>
          {subtitle && (
            <span className="mt-0.5 block text-xs font-normal text-faint">{subtitle}</span>
          )}
        </span>

        {meta && <span className="flex shrink-0 items-center gap-2">{meta}</span>}
      </summary>

      <div className="border-t border-line-soft">{children}</div>
    </details>
  )
}
