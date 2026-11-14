import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { DirNodeDTO, DocSummaryDTO } from '@docstudio/core'
import { docHref } from '../lib/paths'
import { useApi } from '../lib/useApi'
import { usePins } from '../pins'
import { StatusDot } from './Badge'

function collectDocs(node: DirNodeDTO, out: Map<string, DocSummaryDTO>): void {
  for (const doc of node.docs) out.set(doc.id, doc)
  for (const child of node.children) collectDocs(child, out)
}

/**
 * Dedicated block above the central content listing every pinned document.
 * Rendering order follows the pin order, so the last pinned item stays last.
 */
export function PinnedBar() {
  const { pinned, togglePin } = usePins()
  // Only load the tree when there is something to show.
  const tree = useApi<DirNodeDTO>(pinned.size > 0 ? '/tree' : null)

  const docs = useMemo(() => {
    const index = new Map<string, DocSummaryDTO>()
    if (tree.data) collectDocs(tree.data, index)
    return index
  }, [tree.data])

  const items = [...pinned]
    .map((id) => docs.get(id))
    .filter((doc): doc is DocSummaryDTO => doc !== undefined)

  if (items.length === 0) return null

  return (
    <section aria-label="Pinned documents" className="panel mb-5 p-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-3 py-2.5">
        <span className="flex items-center gap-1.5 pr-1 text-[10px] font-medium uppercase tracking-[0.12em] text-faint">
          <PinIcon />
          Pinned
          <span className="font-mono text-[10px] tracking-normal text-faint">
            {items.length}
          </span>
        </span>
        <span className="hidden h-3.5 w-px bg-line-soft sm:block" />
        {items.map((doc) => (
          <span
            key={doc.id}
            className="group inline-flex max-w-full items-center gap-1 rounded-md border border-line bg-raised py-0.5 pl-2 pr-0.5 transition-colors hover:border-faint/40 sm:max-w-[22rem]"
          >
            <Link
              to={docHref(doc.id)}
              title={doc.path}
              className="flex min-w-0 items-center gap-1.5 py-0.5 text-[12px] text-dim transition-colors group-hover:text-ink"
            >
              <StatusDot status={doc.status} />
              <span className="truncate">{doc.title}</span>
            </Link>
            <button
              type="button"
              onClick={() => togglePin(doc.id)}
              aria-label={`Unpin ${doc.title}`}
              title="Unpin"
              className="shrink-0 rounded p-0.5 text-faint transition-colors hover:bg-hover hover:text-ink"
            >
              <CloseIcon />
            </button>
          </span>
        ))}
      </div>
    </section>
  )
}

function PinIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6 2.5h4l-.6 3.2 2.1 2.1H4.5l2.1-2.1L6 2.5Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M8 7.8v5.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="m3 3 6 6M9 3l-6 6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}
