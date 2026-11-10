import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { MetaDTO, ProjectSummaryDTO, SearchHitDTO } from '@docstudio/core'
import { StatusDot, TypeBadge } from '../components/Badge'
import { EmptyState, ErrorState, Loading, Spinner } from '../components/States'
import { relativeTime } from '../lib/format'
import { useApi } from '../lib/useApi'
import { usePageTitle } from '../lib/usePageTitle'
import { useDebounced } from '../lib/useDebounced'
import { docHref } from '../lib/paths'

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [project, setProject] = useState(params.get('project') ?? '')
  const [type, setType] = useState(params.get('type') ?? '')
  const [status, setStatus] = useState(params.get('status') ?? '')
  const debounced = useDebounced(query, 180)
  const trimmed = debounced.trim()
  const meta = useApi<MetaDTO>('/meta')
  const projects = useApi<ProjectSummaryDTO[]>('/projects')

  usePageTitle('Search')

  const search = useMemo(() => {
    if (!trimmed) return null
    const next = new URLSearchParams({ q: trimmed, limit: '60' })
    if (project) next.set('project', project)
    if (type) next.set('type', type)
    if (status) next.set('status', status)
    return `/search?${next.toString()}`
  }, [trimmed, project, type, status])

  const results = useApi<SearchHitDTO[]>(search)

  useEffect(() => {
    const next = new URLSearchParams()
    if (trimmed) next.set('q', trimmed)
    if (project) next.set('project', project)
    if (type) next.set('type', type)
    if (status) next.set('status', status)
    setParams(next, { replace: true })
  }, [trimmed, project, type, status, setParams])

  return (
    <div className="space-y-6">
      <header>
        <p className="section-label">Search</p>
        <h1 className="mt-1.5 text-[27px] font-semibold tracking-tight text-ink">
          Find anything in the vault
        </h1>
        <p className="mt-1.5 text-sm text-dim">
          Full-text over titles, headings, paths and body.
          {projects.data ? ` ${projects.data.length} projects indexed.` : ''}
        </p>
      </header>

      <div className="card p-3">
        <div className="flex items-center gap-2.5 px-1">
          <span className="text-faint">{results.loading ? <Spinner /> : <SearchIcon />}</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search documents, references, decisions…"
            className="h-9 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="btn btn-ghost px-2 py-1 text-[11px]"
            >
              Clear
            </button>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line-soft px-1 pt-2.5">
          <Filter label="Project">
            <select
              value={project}
              onChange={(event) => setProject(event.target.value)}
              className="select"
            >
              <option value="">All</option>
              {projects.data?.map((entry) => (
                <option key={entry.name} value={entry.name}>
                  {entry.label}
                </option>
              ))}
            </select>
          </Filter>

          <Filter label="Type">
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="select"
            >
              <option value="">All</option>
              {meta.data &&
                Object.entries(meta.data.types)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, count]) => (
                    <option key={name} value={name}>
                      {name} ({count})
                    </option>
                  ))}
            </select>
          </Filter>

          <Filter label="Status">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="select"
            >
              <option value="">All</option>
              {meta.data &&
                Object.entries(meta.data.statuses)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, count]) => (
                    <option key={name} value={name}>
                      {name} ({count})
                    </option>
                  ))}
            </select>
          </Filter>

          {(project || type || status) && (
            <button
              type="button"
              onClick={() => {
                setProject('')
                setType('')
                setStatus('')
              }}
              className="btn btn-ghost ml-auto text-[11px]"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {!trimmed && (
        <EmptyState
          title="Start typing to search."
          hint="Results include snippets from the matching document. Filters apply to the query."
        />
      )}

      {trimmed && results.error && <ErrorState message={results.error} />}

      {trimmed && results.loading && !results.data && <Loading label="Searching…" />}

      {trimmed && results.data && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] text-faint">
              {results.data.length} {results.data.length === 1 ? 'result' : 'results'} for{' '}
              <span className="text-dim">“{trimmed}”</span>
            </p>
            {results.loading && <Spinner />}
          </div>

          {results.data.length === 0 && (
            <EmptyState
              title={`Nothing matched “${trimmed}”.`}
              hint="Try a shorter term, a ticket id, or remove the filters."
            />
          )}

          <div className="space-y-2">
            {results.data.map((hit) => (
              <ResultRow key={hit.doc.id} hit={hit} tokens={hit.matched} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ResultRow({ hit, tokens }: { hit: SearchHitDTO; tokens: string[] }) {
  const { doc } = hit
  return (
    <Link to={docHref(doc.id)} className="card card-hover block px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusDot status={doc.status} />
        <span className="text-[14px] font-medium text-ink">{doc.title}</span>
        <TypeBadge type={doc.type} />
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
          {doc.status}
        </span>
        <span className="ml-auto shrink-0 text-[10px] text-faint">
          {relativeTime(doc.updatedAt)}
        </span>
      </div>
      <p className="mt-1 truncate font-mono text-[10px] text-faint">
        {doc.project} · {doc.path}
      </p>
      {hit.snippet && (
        <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-dim">
          <Highlight text={hit.snippet} tokens={tokens} />
        </p>
      )}
    </Link>
  )
}

function Highlight({ text, tokens }: { text: string; tokens: string[] }) {
  if (tokens.length === 0) return <>{text}</>
  const pattern = tokens
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(Boolean)
    .join('|')
  if (!pattern) return <>{text}</>
  const lowered = new Set(tokens.map((token) => token.toLowerCase()))
  const parts = text.split(new RegExp(`(${pattern})`, 'gi'))
  return (
    <>
      {parts.map((part, index) =>
        lowered.has(part.toLowerCase()) ? (
          <mark key={index} className="rounded bg-accent/20 px-0.5 text-ink">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  )
}

function Filter({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-faint">
      {label}
      {children}
    </label>
  )
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="4.2" stroke="currentColor" strokeWidth="1.2" />
      <path d="m10.2 10.2 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
