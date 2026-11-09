import { Link, useParams } from 'react-router-dom'
import type { ProjectDetailDTO } from '@docstudio/core'
import { DocRow } from '../components/DocRow'
import { DocTree } from '../components/DocTree'
import { StatusDot, TypeBadge } from '../components/Badge'
import { EmptyState, ErrorState, Loading, SectionHeader } from '../components/States'
import { ISSUE_HELP, relativeTime } from '../lib/format'
import { useApi } from '../lib/useApi'
import { docHref } from '../lib/paths'

export function ProjectPage() {
  const { project = '' } = useParams<{ project: string }>()
  const detail = useApi<ProjectDetailDTO>(
    project ? `/projects/${encodeURIComponent(project)}` : null,
  )

  if (detail.loading && !detail.data) return <Loading label="Loading project…" />
  if (detail.error) {
    return (
      <div className="space-y-4">
        <ErrorState message={detail.error} />
        <Link to="/" className="btn">
          Back to overview
        </Link>
      </div>
    )
  }
  if (!detail.data) return null

  const { project: summary, tree, recent, issues, types } = detail.data
  const typeEntries = Object.entries(types).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-[11px] text-faint">
        <Link to="/" className="transition-colors hover:text-ink">
          Overview
        </Link>
        <span>/</span>
        <span className="text-dim">{summary.label}</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            Project · {summary.path === '' ? 'vault root' : summary.path}
          </p>
          <h1 className="mt-1.5 truncate text-[27px] font-semibold tracking-tight text-ink">
            {summary.label}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-dim">
            <span className="flex items-center gap-1.5">
              <StatusDot status="active" /> {summary.openCount} open
            </span>
            <span>{summary.docCount} documents</span>
            <span>updated {relativeTime(summary.updatedAt)}</span>
            {summary.issueCount > 0 ? (
              <span className="text-amber">{summary.issueCount} issues</span>
            ) : (
              <span className="text-green/70">no issues</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {typeEntries.map(([type, count]) => (
            <span key={type} className="flex items-center gap-1">
              <TypeBadge type={type} />
              <span className="font-mono text-[10px] text-faint">{count}</span>
            </span>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="panel p-0">
          <div className="panel-header">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-ink">
                Document tree
              </h2>
              <p className="mt-0.5 text-xs text-faint">
                Built from <span className="font-mono text-dim">parent</span> references. Click
                to drill down.
              </p>
            </div>
            {summary.rootId && (
              <Link to={docHref(summary.rootId)} className="btn btn-ghost">
                Project root
              </Link>
            )}
          </div>
          <div className="p-2">
            <DocTree nodes={tree} />
          </div>
        </section>

        <div className="space-y-6">
          <section className="panel p-0">
            <div className="panel-header">
              <h2 className="text-[14px] font-semibold tracking-tight text-ink">Recent</h2>
              <span className="font-mono text-[10px] text-faint">{recent.length}</span>
            </div>
            <div className="p-2">
              {recent.length === 0 && (
                <p className="px-3 py-4 text-xs text-faint">Nothing yet.</p>
              )}
              {recent.map((doc) => (
                <DocRow key={doc.id} doc={doc} />
              ))}
            </div>
          </section>

          <section className="panel p-0">
            <div className="panel-header">
              <h2 className="text-[14px] font-semibold tracking-tight text-ink">Issues</h2>
              <span className="font-mono text-[10px] text-faint">{issues.length}</span>
            </div>
            <div className="space-y-1 p-2">
              {issues.length === 0 && (
                <p className="px-3 py-4 text-xs text-faint">
                  Clean. Every document is typed, referenced and reachable.
                </p>
              )}
              {issues.map((issue, index) => (
                <Link
                  key={`${issue.doc.id}-${issue.kind}-${index}`}
                  to={docHref(issue.doc.id)}
                  className="block rounded-md px-3 py-2 transition-colors hover:bg-raised"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] ${
                        issue.severity === 'error'
                          ? 'bg-red/10 text-red'
                          : 'bg-amber/10 text-amber'
                      }`}
                    >
                      {issue.kind}
                    </span>
                    <span className="min-w-0 truncate text-[12px] text-ink">
                      {issue.doc.title}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-dim">{issue.message}</p>
                  <p className="mt-0.5 text-[10px] text-faint">{ISSUE_HELP[issue.kind]}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="panel">
            <SectionHeader
              title="Status mix"
              hint="Documents by lifecycle state."
            />
            <div className="mt-3 space-y-1.5">
              {Object.entries(summary.byStatus)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (
                  <div key={status} className="flex items-center gap-2">
                    <StatusDot status={status} />
                    <span className="text-[12px] text-dim">{status}</span>
                    <span className="ml-auto font-mono text-[10px] text-faint">{count}</span>
                  </div>
                ))}
              {Object.keys(summary.byStatus).length === 0 && (
                <EmptyState title="No statuses recorded." />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
