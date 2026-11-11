import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import type { DocDetailDTO, GraphDTO, OpenResultDTO } from '@docstudio/core'
import { post } from '../api'
import { Markdown } from '../components/Markdown'
import { DocRow } from '../components/DocRow'
import { Disclosure } from '../components/Disclosure'
import { EdgeList } from '../components/EdgeList'
import { GraphDialog } from '../components/GraphDialog'
import { MiniGraph } from '../components/MiniGraph'
import { StatusLabel, TypeBadge } from '../components/Badge'
import { EmptyState, ErrorState, Loading } from '../components/States'
import { absoluteTime, ISSUE_HELP, relativeTime } from '../lib/format'
import { useApi } from '../lib/useApi'
import { usePageTitle } from '../lib/usePageTitle'
import { docHref, encodeDocId, pathCrumbs } from '../lib/paths'

export function DocPage() {
  const params = useParams()
  const location = useLocation()
  const id = (params['*'] ?? '').replace(/^\/+/, '')
  const detail = useApi<DocDetailDTO>(id ? `/docs/${encodeDocId(id)}` : null)
  const graph = useApi<GraphDTO>(
    detail.data ? `/graph?focus=${encodeURIComponent(detail.data.doc.id)}` : null,
  )
  const seenRef = useRef<string | null>(null)
  const [openResult, setOpenResult] = useState<OpenResultDTO | null>(null)
  const [copied, setCopied] = useState(false)
  const [graphOpen, setGraphOpen] = useState(false)

  usePageTitle(detail.data?.doc.title)

  useEffect(() => {
    if (!detail.data) return
    const docId = detail.data.doc.id
    if (seenRef.current === docId) return
    seenRef.current = docId
    void post('/seen', { id: docId }).catch(() => undefined)
  }, [detail.data])

  useEffect(() => {
    if (!detail.data || !location.hash) return
    let anchor = location.hash.slice(1)
    try {
      anchor = decodeURIComponent(anchor)
    } catch {
      // Keep the raw anchor.
    }
    const target = document.getElementById(anchor)
    if (target) {
      const timer = window.setTimeout(
        () => target.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        60,
      )
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [detail.data, location.hash])

  if (detail.loading && !detail.data) return <Loading label="Loading document…" />
  if (detail.error) {
    return (
      <div className="space-y-4">
        <ErrorState message={detail.error} />
        <div className="flex items-center gap-2">
          <Link to="/" className="btn">
            Back to overview
          </Link>
          <Link to="/search" className="btn btn-ghost">
            Search
          </Link>
        </div>
      </div>
    )
  }
  if (!detail.data) return null

  const { doc, breadcrumb, children, outgoing, backlinks, issues } = detail.data
  const frontmatter = doc.frontmatter
  const owner = frontmatterString(frontmatter, 'owner')
  const date = frontmatterString(frontmatter, 'date') ?? frontmatterString(frontmatter, 'updated')
  const ticket = frontmatterString(frontmatter, 'ticket')

  const openInEditor = async (): Promise<void> => {
    try {
      const result = await post<OpenResultDTO>('/open', { id: doc.id })
      setOpenResult(result)
      // In a container the server cannot spawn the host editor. The response
      // carries a vscode:// (or equivalent) URL that the browser can launch.
      if (!result.ok && result.url) {
        window.location.assign(result.url)
      }
      window.setTimeout(() => setOpenResult(null), 6000)
    } catch (error) {
      setOpenResult({
        ok: false,
        command: 'open',
        message: error instanceof Error ? error.message : String(error),
      })
      window.setTimeout(() => setOpenResult(null), 6000)
    }
  }

  const copyPath = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(doc.path)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <div className="space-y-5">
          <nav className="flex flex-wrap items-center gap-1.5 text-[11px] text-faint">
            <Link to="/" className="transition-colors hover:text-ink">
              Overview
            </Link>
            <span className="text-line">/</span>
            <Link
              to={`/p/${encodeURIComponent(doc.project)}`}
              className="transition-colors hover:text-ink"
            >
              {doc.project === 'vault' ? 'Vault' : doc.project}
            </Link>
            {breadcrumb.map((parent) => (
              <span key={parent.id} className="flex items-center gap-1.5">
                <span className="text-line">/</span>
                <Link to={docHref(parent.id)} className="transition-colors hover:text-ink">
                  {parent.title}
                </Link>
              </span>
            ))}
          </nav>

          {doc.parseError && <ErrorState message={doc.parseError} />}

          <header className="panel">
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={doc.type} />
              <StatusLabel status={doc.status} />
              {ticket && (
                <span className="chip border-line bg-raised text-dim">{ticket}</span>
              )}
              {doc.tags.map((tag) => (
                <span key={tag} className="chip border-line bg-raised text-faint">
                  #{tag}
                </span>
              ))}
            </div>

            <h1 className="mt-3 text-[27px] font-semibold leading-9 tracking-tight text-ink">
              {doc.title}
            </h1>

            <nav
              aria-label="File path"
              className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-faint"
            >
              <Link to="/" className="transition-colors hover:text-ink">
                vault
              </Link>
              {pathCrumbs(doc.path).map((crumb) => {
                const isProjectRoot = crumb.directory && crumb.path === doc.project
                return (
                  <span key={crumb.path} className="flex items-center gap-1.5">
                    <span className="text-line">/</span>
                    {crumb.directory ? (
                      isProjectRoot ? (
                        <Link
                          to={`/p/${encodeURIComponent(doc.project)}`}
                          className="transition-colors hover:text-ink"
                        >
                          {crumb.name}
                        </Link>
                      ) : (
                        <span title={crumb.path}>{crumb.name}</span>
                      )
                    ) : (
                      <span className="text-ink" aria-current="page">
                        {crumb.name}
                      </span>
                    )}
                  </span>
                )
              })}
            </nav>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3.5">
              <button type="button" onClick={openInEditor} className="btn btn-primary">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path
                    d="m6 4-4 4 4 4M10 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Open in editor
              </button>
              <button type="button" onClick={copyPath} className="btn">
                {copied ? 'Copied' : 'Copy path'}
              </button>
              <div className="ml-auto flex flex-wrap items-center gap-3 text-[11px] text-faint">
                {owner && <span>owner {owner}</span>}
                {date && <span>{date}</span>}
                <span title={absoluteTime(doc.updatedAt)}>
                  updated {relativeTime(doc.updatedAt)}
                </span>
              </div>
            </div>

            {openResult && (
              <div
                className={`mt-3 rounded-md px-3 py-2 ${
                  openResult.ok ? 'bg-green/10' : 'bg-red/10'
                }`}
              >
                <p
                  className={`font-mono text-[10px] ${
                    openResult.ok ? 'text-green' : 'text-red'
                  }`}
                >
                  {openResult.ok
                    ? `Opened with: ${openResult.command}`
                    : `Could not open: ${openResult.message ?? openResult.command}`}
                </p>
                {!openResult.ok && openResult.url && (
                  <a
                    href={openResult.url}
                    className="mt-1 inline-flex text-[10px] font-medium text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
                  >
                    Open with VS Code →
                  </a>
                )}
              </div>
            )}
          </header>

          {issues.length > 0 && (
            <Disclosure
              tone="amber"
              title={`Doctor · ${issues.length} ${
                issues.length === 1 ? 'issue' : 'issues'
              }`}
              subtitle="Issues found in this document. Expand the section to read them."
              meta={
                <span className="font-mono text-[10px] text-amber">
                  {issues.filter((issue) => issue.severity === 'error').length} errors
                </span>
              }
            >
              <ul className="space-y-2 px-5 py-3.5">
                {issues.map((issue, index) => (
                  <li key={`${issue.kind}-${index}`} className="text-[12px]">
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-amber">
                      {issue.kind}
                    </span>
                    <span className="text-dim"> — {issue.message}</span>
                    <span className="block text-[10px] text-faint">
                      {ISSUE_HELP[issue.kind]}
                    </span>
                  </li>
                ))}
              </ul>
            </Disclosure>
          )}

          <article className="panel px-6 py-6 lg:px-8">
            <Markdown body={doc.body} sourcePath={doc.path} />
            {!doc.hasReferencesSection && (
              <p className="mt-8 border-t border-line-soft pt-3 text-[11px] text-faint">
                No <span className="font-mono">## References</span> section: this document is
                not connected to the graph.
              </p>
            )}
          </article>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-[5.5rem] xl:max-h-[calc(100vh-7rem)] xl:self-start xl:overflow-y-auto xl:pr-1 xl:overscroll-contain">
          {doc.headings.length > 1 && (
            <section className="panel p-0">
              <div className="panel-header">
                <h2 className="text-[14px] font-semibold tracking-tight text-ink">
                  On this page
                </h2>
                <span className="font-mono text-[10px] text-faint">
                  {doc.headings.length}
                </span>
              </div>
              <nav className="space-y-0.5 p-2">
                {doc.headings
                  .filter((heading) => heading.depth > 1)
                  .map((heading) => (
                    <a
                      key={`${heading.slug}-${heading.line}`}
                      href={`#${heading.slug}`}
                      className="block truncate rounded-md py-1 pr-2 text-[12px] text-dim transition-colors hover:bg-raised hover:text-ink"
                      style={{ paddingLeft: `${(heading.depth - 2) * 12 + 10}px` }}
                    >
                      {heading.text}
                    </a>
                  ))}
              </nav>
            </section>
          )}

          <section className="panel p-0">
            <div className="panel-header">
              <h2 className="text-[14px] font-semibold tracking-tight text-ink">
                References
              </h2>
              <span className="font-mono text-[10px] text-faint">{outgoing.length}</span>
            </div>
            <div className="p-2">
              {outgoing.some((edge) => edge.kind === 'parent' && !edge.resolved) && (
                <p className="px-3 pb-1 pt-2 text-[10px] text-amber">
                  Parent reference is broken: this document will look like an orphan.
                </p>
              )}
              <EdgeList
                edges={outgoing}
                empty="No references. Add a `## References` section to declare relations."
              />
            </div>
          </section>

          {backlinks.length > 0 && (
            <section className="panel p-0">
              <div className="panel-header">
                <h2 className="text-[14px] font-semibold tracking-tight text-ink">
                  Backlinks
                </h2>
                <span className="font-mono text-[10px] text-faint">{backlinks.length}</span>
              </div>
              <div className="p-2">
                <EdgeList edges={backlinks} empty="Nothing links here yet." />
              </div>
            </section>
          )}

          <section className="panel p-0">
            <div className="panel-header">
              <h2 className="text-[14px] font-semibold tracking-tight text-ink">Graph</h2>
              <span className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-faint">
                  {graph.data ? graph.data.nodes.length : 0}
                </span>
                <button
                  type="button"
                  onClick={() => setGraphOpen(true)}
                  className="btn btn-ghost h-7 w-7 px-0"
                  aria-label="Enlarge graph"
                  title="Enlarge graph"
                  disabled={!graph.data}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M6 2.5H2.5V6M10 2.5h3.5V6M6 13.5H2.5V10M10 13.5h3.5V10"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </span>
            </div>
            <div className="p-3">
              {graph.data ? (
                <MiniGraph graph={graph.data} />
              ) : (
                <p className="px-1 py-6 text-center text-[11px] text-faint">Loading graph…</p>
              )}
            </div>
          </section>

          {children.length > 0 && (
            <section className="panel p-0">
              <div className="panel-header">
                <h2 className="text-[14px] font-semibold tracking-tight text-ink">
                  Drill down
                </h2>
                <span className="font-mono text-[10px] text-faint">{children.length}</span>
              </div>
              <div className="p-2">
                {children.map((child) => (
                  <DocRow key={child.id} doc={child} />
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      {children.length === 0 && outgoing.length === 0 && backlinks.length === 0 && (
        <EmptyState
          title="This document is isolated."
          hint="Add a parent reference so it can be reached from the project tree."
          action={
            <Link to={`/p/${encodeURIComponent(doc.project)}`} className="btn">
              Open project
            </Link>
          }
        />
      )}

      {graphOpen && graph.data && (
        <GraphDialog graph={graph.data} onClose={() => setGraphOpen(false)} />
      )}
    </div>
  )
}

function frontmatterString(
  frontmatter: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = frontmatter[key]
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return undefined
}
