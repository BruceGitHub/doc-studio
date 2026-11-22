import { Link, useParams } from 'react-router-dom'
import type { DirNodeDTO } from '@docstudio/core'
import { DocRow } from '../components/DocRow'
import { EmptyState, ErrorState, Loading } from '../components/States'
import { dirHref } from '../lib/paths'
import { useApi } from '../lib/useApi'
import { usePageTitle } from '../lib/usePageTitle'

function findDirectory(node: DirNodeDTO | null, path: string): DirNodeDTO | null {
  if (!node) return null
  if (node.path === path) return node
  for (const child of node.children) {
    const match = findDirectory(child, path)
    if (match) return match
  }
  return null
}

function parentPath(path: string): string {
  const index = path.lastIndexOf('/')
  return index === -1 ? '' : path.slice(0, index)
}

/**
 * Browses one real vault folder: the folders and documents directly inside it,
 * reached from the file-path breadcrumb of a document.
 */
export function DirectoryPage() {
  const params = useParams()
  const path = (params['*'] ?? '').replace(/^\/+|\/+$/g, '')
  const tree = useApi<DirNodeDTO>('/tree')
  const node = findDirectory(tree.data, path)

  const segments = path.split('/').filter(Boolean)
  const crumbs = segments.map((name, index) => ({
    name,
    path: segments.slice(0, index + 1).join('/'),
  }))

  usePageTitle(node?.label ?? (segments[segments.length - 1] ?? null))

  if (tree.loading && !tree.data) return <Loading label="Loading directory…" />
  if (tree.error) {
    return (
      <div className="space-y-4">
        <ErrorState message={tree.error} />
        <Link to="/" className="btn">
          Back to overview
        </Link>
      </div>
    )
  }
  if (!tree.data) return null

  if (!node) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="This directory is not in the vault."
          hint="It may have been renamed or removed. The sidebar tree always reflects the current files."
          action={
            <Link to="/" className="btn">
              Back to overview
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <nav
        aria-label="Directory path"
        className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-faint"
      >
        {path === '' ? (
          <span className="text-ink" aria-current="page">
            vault
          </span>
        ) : (
          <Link to={dirHref('')} className="transition-colors hover:text-ink">
            vault
          </Link>
        )}
        {crumbs.map((crumb, index) => {
          const current = index === crumbs.length - 1
          return (
            <span key={crumb.path} className="flex items-center gap-1.5">
              <span className="text-line">/</span>
              {current ? (
                <span className="text-ink" aria-current="page">
                  {crumb.name}
                </span>
              ) : (
                <Link
                  to={dirHref(crumb.path)}
                  className="transition-colors hover:text-ink"
                  title={crumb.path}
                >
                  {crumb.name}
                </Link>
              )}
            </span>
          )
        })}
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="section-label">Directory</p>
          <h1 className="mt-1.5 truncate text-[27px] font-semibold tracking-tight text-ink">
            {node.label}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-dim">
            <span>{node.docCount} documents</span>
            <span>
              {node.children.length} {node.children.length === 1 ? 'folder' : 'folders'}
            </span>
            <span className="font-mono text-[11px] text-faint">
              {node.path || 'vault root'}
            </span>
          </div>
        </div>
        {node.path !== '' && (
          <Link to={dirHref(parentPath(node.path))} className="btn">
            Up one level
          </Link>
        )}
      </header>

      <section className="panel p-0">
        <div className="panel-header">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">Contents</h2>
            <p className="mt-0.5 text-xs text-faint">
              Folders and documents directly inside this directory.
            </p>
          </div>
          <span className="font-mono text-[10px] text-faint">
            {node.children.length} folders · {node.docs.length} docs
          </span>
        </div>
        <div className="p-2">
          {node.children.map((child) => (
            <Link
              key={child.path}
              to={dirHref(child.path)}
              className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-raised"
            >
              <span className="shrink-0 text-faint group-hover:text-dim">
                <FolderIcon />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                {child.label}
              </span>
              <span className="shrink-0 font-mono text-[10px] text-faint">
                {child.docCount}
              </span>
            </Link>
          ))}
          {node.docs.map((doc) => (
            <DocRow key={doc.id} doc={doc} />
          ))}
          {node.children.length === 0 && node.docs.length === 0 && (
            <div className="px-2 py-3">
              <EmptyState
                title="This directory is empty."
                hint="Markdown documents added to this folder will show up here."
              />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 4.5h4l1.2 1.5H14v7.5H2v-9Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
