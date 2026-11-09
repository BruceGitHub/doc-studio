import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { AttentionDTO, MetaDTO, ProjectSummaryDTO } from '@docstudio/core'
import { post } from '../api'
import { DocRow } from '../components/DocRow'
import { StatusDot, TypeBadge } from '../components/Badge'
import { EmptyState, ErrorState, Loading, SectionHeader } from '../components/States'
import { relativeTime } from '../lib/format'
import { useApi } from '../lib/useApi'
import { docHref } from '../lib/paths'

export function HomePage() {
  const meta = useApi<MetaDTO>('/meta')
  const projects = useApi<ProjectSummaryDTO[]>('/projects')
  const attention = useApi<AttentionDTO>('/attention')
  const [marking, setMarking] = useState(false)

  const markReviewed = async (): Promise<void> => {
    setMarking(true)
    try {
      await post('/visit')
      attention.reload()
      meta.reload()
    } finally {
      setMarking(false)
    }
  }

  const counts = meta.data?.counts

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label">Workspace</p>
          <h1 className="mt-1.5 text-[27px] font-semibold tracking-tight text-ink">
            {meta.data?.name ?? 'Doc Studio'}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-dim">
            Everything you need to pick up the thread: what changed, what is open, and what is
            broken.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={markReviewed}
            className="btn"
            disabled={marking || !attention.data}
            title="Advance the last-visit marker to now"
          >
            {marking ? 'Marking…' : 'Mark reviewed'}
          </button>
          <Link to="/doctor" className="btn btn-primary">
            Health check
          </Link>
        </div>
      </header>

      {meta.error && <ErrorState message={meta.error} />}

      {counts && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Documents" value={counts.docs} />
          <Stat label="Projects" value={counts.projects} />
          <Stat label="Open" value={counts.open} tone="text-green" />
          <Stat label="Unread" value={counts.unread} tone="text-accent" />
          <Stat label="Errors" value={counts.errors} tone="text-red" />
          <Stat label="Warnings" value={counts.warnings} tone="text-amber" />
        </div>
      )}

      {counts && (counts.errors > 0 || counts.warnings > 0) && (
        <Link
          to="/doctor"
          className="card card-hover flex items-center gap-3 px-4 py-3"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber/25 bg-amber/10 text-amber">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M8 2.5 14.5 14h-13L8 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M8 6.5v3.2M8 12h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </span>
          <div className="min-w-0 flex-1 text-[13px] text-dim">
            <span className="text-ink">{counts.errors} errors</span> and{' '}
            <span className="text-ink">{counts.warnings} warnings</span> in the vault index.
            Broken references, missing statuses and orphan documents.
          </div>
          <span className="shrink-0 font-mono text-[10px] text-faint">Open doctor →</span>
        </Link>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="panel p-0">
            <div className="panel-header">
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight text-ink">
                  Changed recently
                </h2>
                <p className="mt-0.5 text-xs text-faint">
                  {attention.data?.since
                    ? `Since your last visit, ${relativeTime(attention.data.since)}`
                    : 'No previous visit recorded: this is everything.'}
                </p>
              </div>
              <span className="font-mono text-[10px] text-faint">
                {attention.data?.changed.length ?? 0}
              </span>
            </div>
            <div className="p-2">
              {attention.loading && !attention.data && <Loading />}
              {attention.error && <ErrorState message={attention.error} />}
              {attention.data?.changed.length === 0 && (
                <div className="px-2 py-3">
                  <EmptyState
                    title="Nothing changed since your last visit."
                    hint="New or modified markdown files will show up here automatically."
                  />
                </div>
              )}
              {attention.data?.changed.map((doc) => (
                <DocRow key={doc.id} doc={doc} showProject />
              ))}
            </div>
          </section>

          <section className="panel p-0">
            <div className="panel-header">
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight text-ink">
                  Open threads
                </h2>
                <p className="mt-0.5 text-xs text-faint">
                  Reviews and tickets that are still open, newest first.
                </p>
              </div>
              <span className="font-mono text-[10px] text-faint">
                {attention.data?.openThreads.length ?? 0}
              </span>
            </div>
            <div className="p-2">
              {attention.data?.openThreads.length === 0 && (
                <p className="px-3 py-6 text-sm text-faint">
                  Nothing open. Either you are done, or the statuses are lying.
                </p>
              )}
              {attention.data?.openThreads.map((doc) => (
                <DocRow key={doc.id} doc={doc} showProject />
              ))}
            </div>
          </section>

          <section>
            <SectionHeader
              title="Projects"
              hint="Each project opens on its own tree, recent work and health."
              action={
                <Link to="/search" className="btn btn-ghost">
                  Search everything
                </Link>
              }
            />
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {projects.loading && !projects.data && <Loading />}
              {projects.data?.map((project) => (
                <ProjectCard key={project.name} project={project} />
              ))}
              {projects.data?.length === 0 && (
                <EmptyState
                  title="No projects found."
                  hint="A project is the first folder segment of a document path, or the `project` frontmatter field."
                />
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="panel p-0">
            <div className="panel-header">
              <h2 className="text-[14px] font-semibold tracking-tight text-ink">Unread</h2>
              <span className="font-mono text-[10px] text-faint">
                {attention.data?.unread.length ?? 0}
              </span>
            </div>
            <div className="p-2">
              {attention.data?.unread.length === 0 && (
                <p className="px-3 py-4 text-xs text-faint">Everything has been opened.</p>
              )}
              {attention.data?.unread.map((doc) => (
                <DocRow key={doc.id} doc={doc} />
              ))}
            </div>
          </section>

          <section className="panel p-0">
            <div className="panel-header">
              <h2 className="text-[14px] font-semibold tracking-tight text-ink">
                Blocking errors
              </h2>
              <span className="font-mono text-[10px] text-faint">
                {attention.data?.errors.length ?? 0}
              </span>
            </div>
            <div className="space-y-1 p-2">
              {attention.data?.errors.length === 0 && (
                <p className="px-3 py-4 text-xs text-faint">
                  No structural errors. The graph is consistent.
                </p>
              )}
              {attention.data?.errors.map((issue, index) => (
                <Link
                  key={`${issue.doc.id}-${issue.kind}-${index}`}
                  to={docHref(issue.doc.id)}
                  className="block rounded-md px-3 py-2 transition-colors hover:bg-raised"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-red/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-red">
                      {issue.kind}
                    </span>
                    <span className="min-w-0 truncate text-[12px] text-ink">
                      {issue.doc.title}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-dim">{issue.message}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2 className="text-[14px] font-semibold tracking-tight text-ink">
              Vault conventions
            </h2>
            <p className="mt-2 text-xs leading-5 text-dim">
              Status and type come from frontmatter. Relations come from the{' '}
              <code className="font-mono text-[11px] text-ink">## References</code> section:
            </p>
            <pre className="mt-2.5 overflow-x-auto rounded-lg border border-line bg-canvas p-3 font-mono text-[10px] leading-5 text-dim">
              {`- \`parent\`: [Overview](../README.md)\n- \`follow-up\`: [Review](./review-r1.md)\n- \`ticket\`: CHK-120`}
            </pre>
            <p className="mt-2.5 text-[11px] text-faint">
              Inline links are indexed as <span className="font-mono">untyped</span>. Backlinks
              are computed, never written.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  tone = 'text-ink',
}: {
  label: string
  value: number
  tone?: string
}) {
  return (
    <div className="card px-4 py-3">
      <div className={`text-xl font-semibold tabular-nums tracking-tight ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-faint">{label}</div>
    </div>
  )
}

function ProjectCard({ project }: { project: ProjectSummaryDTO }) {
  const topTypes = Object.entries(project.byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  return (
    <Link to={`/p/${project.name}`} className="card card-hover flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[14px] font-semibold text-ink">{project.label}</h3>
          <p className="mt-0.5 font-mono text-[10px] text-faint">
            {project.path === '' ? 'vault root' : project.path}
          </p>
        </div>
        <span className="shrink-0 font-mono text-[10px] text-faint">
          {relativeTime(project.updatedAt)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {topTypes.map(([type, count]) => (
          <span key={type} className="flex items-center gap-1">
            <TypeBadge type={type} />
            <span className="text-[10px] text-faint">{count}</span>
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center gap-3 border-t border-line-soft pt-2.5 text-[11px] text-faint">
        <span className="flex items-center gap-1.5">
          <StatusDot status="active" /> {project.openCount} open
        </span>
        <span>{project.docCount} docs</span>
        {project.issueCount > 0 ? (
          <span className="ml-auto text-amber">{project.issueCount} issues</span>
        ) : (
          <span className="ml-auto text-green/70">clean</span>
        )}
      </div>
    </Link>
  )
}
