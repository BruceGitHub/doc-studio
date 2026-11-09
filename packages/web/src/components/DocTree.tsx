import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { TreeNodeDTO } from '@docstudio/core'
import { relativeTime } from '../lib/format'
import { docHref } from '../lib/paths'
import { StatusDot, TypeBadge } from './Badge'

export function DocTree({ nodes }: { nodes: TreeNodeDTO[] }) {
  if (nodes.length === 0) {
    return <p className="px-3 py-8 text-sm text-faint">No documents in this project.</p>
  }
  return (
    <div className="py-1">
      {nodes.map((node) => (
        <TreeNode key={node.doc.id} node={node} depth={0} />
      ))}
    </div>
  )
}

function TreeNode({ node, depth }: { node: TreeNodeDTO; depth: number }) {
  const [open, setOpen] = useState(depth < 3)
  const { pathname } = useLocation()
  const active = pathname === docHref(node.doc.id)
  const hasChildren = node.children.length > 0

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-md pr-2 transition-colors ${
          active ? 'bg-accent-soft/60' : 'hover:bg-raised'
        }`}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? 'Collapse' : 'Expand'}
            className="flex h-6 w-5 shrink-0 items-center justify-center text-faint transition-colors hover:text-ink"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              className={`transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
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
        ) : (
          <span className="h-6 w-5 shrink-0" />
        )}

        <Link
          to={docHref(node.doc.id)}
          className="flex min-w-0 flex-1 items-center gap-2 py-1.5"
        >
          <StatusDot status={node.doc.status} />
          <span
            className={`truncate text-[13px] ${
              active ? 'text-ink' : 'text-dim group-hover:text-ink'
            }`}
          >
            {node.doc.title}
          </span>
          {node.doc.unread && <span className="h-1 w-1 rounded-full bg-accent" />}
          <span className="ml-auto hidden shrink-0 items-center gap-2 sm:flex">
            <span className="text-[10px] text-faint">
              {relativeTime(node.doc.updatedAt)}
            </span>
            <TypeBadge type={node.doc.type} />
          </span>
        </Link>
      </div>

      {hasChildren && open && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.doc.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
