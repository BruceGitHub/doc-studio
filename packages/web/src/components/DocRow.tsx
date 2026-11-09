import { Link } from 'react-router-dom'
import type { DocSummaryDTO } from '@docstudio/core'
import { absoluteTime, relativeTime } from '../lib/format'
import { docHref } from '../lib/paths'
import { StatusDot, TypeBadge, UnreadDot } from './Badge'

export function DocRow({
  doc,
  showProject = false,
}: {
  doc: DocSummaryDTO
  showProject?: boolean
}) {
  return (
    <Link
      to={docHref(doc.id)}
      className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-raised"
    >
      <StatusDot status={doc.status} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-ink">
            {doc.title}
          </span>
          {doc.unread && <UnreadDot />}
        </div>
        <div className="mt-0.5 truncate font-mono text-[10px] text-faint">
          {showProject ? `${doc.project} · ${doc.path}` : doc.path}
        </div>
      </div>
      <TypeBadge type={doc.type} />
      <span
        className="hidden w-14 shrink-0 text-right text-[10px] text-faint sm:block"
        title={absoluteTime(doc.updatedAt)}
      >
        {relativeTime(doc.updatedAt)}
      </span>
    </Link>
  )
}
