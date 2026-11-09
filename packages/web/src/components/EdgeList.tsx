import { Link } from 'react-router-dom'
import type { EdgeDTO } from '@docstudio/core'
import { docHref } from '../lib/paths'

export function EdgeList({
  edges,
  empty = 'Nothing yet.',
}: {
  edges: EdgeDTO[]
  empty?: string
}) {
  if (edges.length === 0) {
    return <p className="px-3 py-2 text-xs text-faint">{empty}</p>
  }
  return (
    <div className="space-y-0.5">
      {edges.map((edge, index) => (
        <EdgeRow
          key={`${edge.kind}-${edge.doc?.id ?? edge.target}-${edge.line}-${index}`}
          edge={edge}
        />
      ))}
    </div>
  )
}

function EdgeRow({ edge }: { edge: EdgeDTO }) {
  const broken = !edge.resolved && !edge.external
  const href = edge.doc ? docHref(edge.doc.id, edge.anchor) : null

  return (
    <div className="group rounded-md px-3 py-2 transition-colors hover:bg-raised">
      <div className="flex items-center gap-2">
        <span className="shrink-0 rounded bg-raised px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-faint group-hover:bg-hover">
          {edge.kind}
        </span>
        {href ? (
          <Link
            to={href}
            className="min-w-0 truncate text-[12px] text-ink transition-colors hover:text-accent"
          >
            {edge.doc?.title}
          </Link>
        ) : (
          <span
            className={`min-w-0 truncate text-[12px] ${
              broken ? 'text-red' : 'text-dim'
            }`}
          >
            {edge.label || edge.target}
          </span>
        )}
        {edge.external && (
          <span className="ml-auto shrink-0 text-[9px] uppercase tracking-wide text-faint">
            external
          </span>
        )}
        {broken && (
          <span className="ml-auto shrink-0 text-[9px] uppercase tracking-wide text-red">
            broken
          </span>
        )}
      </div>
      {(broken || edge.external) && (
        <div className="mt-0.5 truncate pl-1 font-mono text-[9px] text-faint">
          {edge.target}
        </div>
      )}
    </div>
  )
}
