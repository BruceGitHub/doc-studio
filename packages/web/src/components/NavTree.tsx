import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { DirNodeDTO } from '@docstudio/core'
import { useApi } from '../lib/useApi'
import { docHref } from '../lib/paths'
import { readPins, sortDocsWithPins, writePins } from '../lib/pins'
import { StatusDot } from './Badge'

const STORAGE_KEY = 'docstudio:nav-expanded'

function readExpanded(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : null
  } catch {
    return null
  }
}

function activeDocId(pathname: string): string | null {
  const prefix = '/doc/'
  if (!pathname.startsWith(prefix)) return null
  const raw = pathname.slice(prefix.length).split('#')[0] ?? ''
  try {
    return decodeURI(raw)
  } catch {
    return raw
  }
}

/** Every directory path that contains the document, root first. */
export function ancestorPaths(docId: string): string[] {
  const segments = docId.split('/').filter(Boolean)
  const paths: string[] = []
  for (let index = 1; index < segments.length; index += 1) {
    paths.push(segments.slice(0, index).join('/'))
  }
  return paths
}

export function NavTree() {
  const tree = useApi<DirNodeDTO>('/tree')
  const { pathname } = useLocation()
  const docId = activeDocId(pathname)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['']))
  const [pinned, setPinned] = useState<Set<string>>(readPins)
  const initialized = useRef(false)

  // Restore the last expansion, or open the first directory level on a first
  // visit so the tree is useful immediately.
  useEffect(() => {
    if (!tree.data || initialized.current) return
    initialized.current = true
    const stored = readExpanded()
    setExpanded((current) => {
      const next = new Set(current)
      next.add('')
      if (stored !== null) {
        for (const path of stored) next.add(path)
      } else {
        for (const child of tree.data?.children ?? []) next.add(child.path)
      }
      return next
    })
  }, [tree.data])

  // Always reveal the directories that contain the open document.
  useEffect(() => {
    if (!docId) return
    setExpanded((current) => {
      const next = new Set(current)
      next.add('')
      for (const path of ancestorPaths(docId)) next.add(path)
      if (next.size === current.size) return current
      return next
    })
  }, [docId])

  useEffect(() => {
    if (!initialized.current || !tree.data) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...expanded].filter(Boolean)))
    } catch {
      // Storage is optional.
    }
  }, [expanded, tree.data])

  const toggle = (path: string): void => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const togglePin = (id: string): void => {
    setPinned((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      writePins(next)
      return next
    })
  }

  const root = tree.data

  return (
    <div className="py-1">
      {tree.loading && !root && (
        <p className="px-2.5 py-2 text-xs text-faint">Loading tree…</p>
      )}
      {tree.error && <p className="px-2.5 py-2 text-xs text-red">{tree.error}</p>}
      {root && root.docCount === 0 && (
        <p className="px-2.5 py-2 text-xs text-faint">No documents in this vault yet.</p>
      )}
      {root && (
        <DirectoryNode
          node={root}
          depth={0}
          expanded={expanded}
          onToggle={toggle}
          pinned={pinned}
          onTogglePin={togglePin}
          activeId={docId}
          isRoot
        />
      )}
    </div>
  )
}

function DirectoryNode({
  node,
  depth,
  expanded,
  onToggle,
  pinned,
  onTogglePin,
  activeId,
  isRoot = false,
}: {
  node: DirNodeDTO
  depth: number
  expanded: Set<string>
  onToggle: (path: string) => void
  pinned: ReadonlySet<string>
  onTogglePin: (id: string) => void
  activeId: string | null
  isRoot?: boolean
}) {
  const open = expanded.has(node.path)
  const hasChildren = node.children.length > 0 || node.docs.length > 0
  const indent = depth * 12 + 4
  const docs = sortDocsWithPins(node.docs, pinned)

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(node.path)}
        aria-expanded={open}
        aria-label={`${open ? 'Collapse' : 'Expand'} ${node.label}`}
        className="group flex w-full items-center gap-1 rounded-md py-1.5 pr-2 text-left transition-colors hover:bg-raised"
        style={{ paddingLeft: `${indent}px` }}
      >
        <span className="flex h-4 w-3.5 shrink-0 items-center justify-center text-faint">
          {hasChildren && (
            <svg
              width="9"
              height="9"
              viewBox="0 0 10 10"
              className={`transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
            >
              <path
                d="M3 1.5 7 5 3 8.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>

        <span className={`shrink-0 ${isRoot ? 'text-accent' : 'text-faint group-hover:text-dim'}`}>
          {isRoot ? <RootIcon /> : <FolderIcon open={open} />}
        </span>

        <span
          className={`min-w-0 flex-1 truncate text-[13px] ${
            isRoot ? 'font-medium text-ink' : 'text-dim group-hover:text-ink'
          }`}
        >
          {isRoot ? `${node.label} · root` : node.label}
        </span>
        <span className="shrink-0 font-mono text-[9px] text-faint">{node.docCount}</span>
      </button>

      {open && (
        <div>
          {node.children.map((child) => (
            <DirectoryNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              pinned={pinned}
              onTogglePin={onTogglePin}
              activeId={activeId}
            />
          ))}
          {docs.map((doc) => {
            const active = doc.id === activeId
            const isPinned = pinned.has(doc.id)
            return (
              <div
                key={doc.id}
                className={`group flex items-center gap-1 rounded-md pr-1 transition-colors ${
                  active ? 'bg-accent-soft/60' : 'hover:bg-raised'
                }`}
                style={{ paddingLeft: `${(depth + 1) * 12 + 4}px` }}
              >
                <Link
                  to={docHref(doc.id)}
                  title={doc.path}
                  className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5"
                >
                  <span className="flex h-4 w-3.5 shrink-0 items-center justify-center text-faint">
                    <FileIcon />
                  </span>
                  <StatusDot status={doc.status} />
                  <span
                    className={`min-w-0 flex-1 truncate text-[13px] ${
                      active ? 'text-ink' : 'text-dim group-hover:text-ink'
                    }`}
                  >
                    {doc.title}
                  </span>
                  {doc.unread && <span className="h-1 w-1 shrink-0 rounded-full bg-accent" />}
                </Link>
                <button
                  type="button"
                  onClick={() => onTogglePin(doc.id)}
                  aria-label={isPinned ? `Unpin ${doc.title}` : `Pin ${doc.title} to the top`}
                  aria-pressed={isPinned}
                  title={isPinned ? 'Unpin from the top of the folder' : 'Pin to the top of the folder'}
                  className={`shrink-0 rounded p-0.5 transition-opacity ${
                    isPinned
                      ? 'text-accent'
                      : 'text-faint opacity-0 focus-visible:opacity-100 group-hover:opacity-100 hover:text-ink'
                  }`}
                >
                  <PinIcon filled={isPinned} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d={open ? 'M2 6.5h12l-1.5 6.5h-9L2 6.5Z' : 'M2 4.5h4l1.2 1.5H14v7.5H2v-9Z'}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {open && (
        <path d="M2 6.5V4.5h4l1.2 2" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      )}
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 2.5h5l3 3v8H4v-11Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M9 2.5v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function RootIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M8 2.8v3.4M8 9.8v3.4M2.8 8h3.4M9.8 8h3.4"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6 2.5h4l-.6 3.2 2.1 2.1H4.5l2.1-2.1L6 2.5Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M8 7.8v5.2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}
