import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { DoctorDTO } from '@docstudio/core'
import { post } from '../api'
import { EmptyState, ErrorState, Loading } from '../components/States'
import { ISSUE_HELP, ISSUE_LABEL, relativeTime } from '../lib/format'
import { useApi } from '../lib/useApi'
import { docHref } from '../lib/paths'

type Filter = 'all' | 'error' | 'warning'

export function DoctorPage() {
  const doctor = useApi<DoctorDTO>('/doctor')
  const [filter, setFilter] = useState<Filter>('all')
  const [refreshing, setRefreshing] = useState(false)

  const groups = useMemo(() => {
    const list = doctor.data?.groups ?? []
    return filter === 'all' ? list : list.filter((group) => group.severity === filter)
  }, [doctor.data, filter])

  const reindex = async (): Promise<void> => {
    setRefreshing(true)
    try {
      await post('/refresh')
      doctor.reload()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label">Doctor</p>
          <h1 className="mt-1.5 text-[27px] font-semibold tracking-tight text-ink">
            Vault health
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-dim">
            Structural checks over the index: broken references, missing conventions, orphan
            documents and stale open work.
          </p>
        </div>
        <button type="button" onClick={reindex} className="btn" disabled={refreshing}>
          {refreshing ? 'Reindexing…' : 'Reindex vault'}
        </button>
      </header>

      {doctor.loading && !doctor.data && <Loading label="Running checks…" />}
      {doctor.error && <ErrorState message={doctor.error} />}

      {doctor.data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Documents" value={doctor.data.totals.docs} />
            <Stat label="Groups" value={doctor.data.totals.groups} />
            <Stat label="Errors" value={doctor.data.totals.errors} tone="text-red" />
            <Stat label="Warnings" value={doctor.data.totals.warnings} tone="text-amber" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'error', 'warning'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`chip ${
                  filter === value
                    ? 'border-accent/35 bg-accent/10 text-accent'
                    : 'border-line bg-surface text-faint hover:text-dim'
                }`}
              >
                {value === 'all' ? 'All' : value === 'error' ? 'Errors' : 'Warnings'}
                <span className="text-[9px] opacity-70">
                  {value === 'all'
                    ? doctor.data?.groups.length
                    : value === 'error'
                      ? doctor.data?.totals.errors
                      : doctor.data?.totals.warnings}
                </span>
              </button>
            ))}
          </div>

          {groups.length === 0 && (
            <EmptyState
              title="Nothing to report."
              hint="The vault satisfies every check in this group."
            />
          )}

          <div className="space-y-4">
            {groups.map((group) => (
              <section key={group.kind} className="panel p-0">
                <div className="panel-header items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          group.severity === 'error' ? 'bg-red' : 'bg-amber'
                        }`}
                      />
                      <h2 className="text-[15px] font-semibold tracking-tight text-ink">
                        {ISSUE_LABEL[group.kind] ?? group.kind}
                      </h2>
                      <span className="font-mono text-[10px] text-faint">
                        {group.issues.length}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-faint">{ISSUE_HELP[group.kind]}</p>
                  </div>
                  <span
                    className={`chip ${
                      group.severity === 'error'
                        ? 'border-red/25 bg-red/10 text-red'
                        : 'border-amber/25 bg-amber/10 text-amber'
                    }`}
                  >
                    {group.severity}
                  </span>
                </div>

                <div className="divide-y divide-line-soft">
                  {group.issues.map((issue, index) => (
                    <div
                      key={`${issue.doc.id}-${index}`}
                      className="flex flex-wrap items-start gap-3 px-5 py-3 transition-colors hover:bg-raised/60"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          to={docHref(issue.doc.id)}
                          className="text-[13px] font-medium text-ink transition-colors hover:text-accent"
                        >
                          {issue.doc.title}
                        </Link>
                        <p className="truncate font-mono text-[10px] text-faint">
                          {issue.doc.path}
                          {issue.line ? `:${issue.line}` : ''}
                        </p>
                        <p className="mt-1 text-[12px] text-dim">{issue.message}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 pt-0.5">
                        <span className="rounded bg-raised px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-faint">
                          {issue.doc.type}/{issue.doc.status}
                        </span>
                        <span className="text-[10px] text-faint">
                          {relativeTime(issue.doc.updatedAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
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
