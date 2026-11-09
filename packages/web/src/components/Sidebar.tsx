import { NavLink } from 'react-router-dom'
import type { MetaDTO, ProjectSummaryDTO } from '@docstudio/core'
import { useApi } from '../lib/useApi'
import { LiveIndicator } from './LiveIndicator'

export function Sidebar() {
  const meta = useApi<MetaDTO>('/meta')
  const projects = useApi<ProjectSummaryDTO[]>('/projects')

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-surface/60 backdrop-blur-xl lg:flex">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-line px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3.5 2.5h6L12.5 5.5v8h-9v-11Z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <path
              d="M5.5 8h5M5.5 10.5h3.5"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-tight text-ink">Doc Studio</div>
          <div className="text-[10px] text-faint">local read model</div>
        </div>
      </div>

      <nav className="shrink-0 space-y-0.5 px-3 py-4">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M2.5 6.5 8 2.5l5.5 4v7h-11v-7Z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
          Overview
        </NavLink>
        <NavLink
          to="/search"
          className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.2" stroke="currentColor" strokeWidth="1.2" />
            <path d="m10.2 10.2 3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Search
        </NavLink>
        <NavLink
          to="/doctor"
          className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 2.2 13 4v4c0 3-2.2 5-5 5.8C5.2 13 3 11 3 8V4l5-1.8Z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <path d="M8 6v3M8 11h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Doctor
          {meta.data && meta.data.counts.errors > 0 && (
            <span className="ml-auto rounded bg-red/10 px-1.5 py-0.5 font-mono text-[9px] text-red">
              {meta.data.counts.errors}
            </span>
          )}
        </NavLink>
      </nav>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-4 pb-1.5 pt-2">
          <span className="section-label">Projects</span>
          <span className="font-mono text-[10px] text-faint">
            {projects.data?.length ?? 0}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {projects.data?.map((project) => (
            <NavLink
              key={project.name}
              to={`/p/${project.name}`}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
            >
              <span className="min-w-0 flex-1 truncate">{project.label}</span>
              {project.issueCount > 0 ? (
                <span className="rounded bg-amber/10 px-1.5 py-0.5 font-mono text-[9px] text-amber">
                  {project.issueCount}
                </span>
              ) : (
                <span className="font-mono text-[10px] text-faint">{project.docCount}</span>
              )}
            </NavLink>
          ))}
          {projects.data?.length === 0 && (
            <p className="px-2.5 py-2 text-xs text-faint">No projects yet.</p>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-line p-3">
        <div
          className="truncate font-mono text-[9px] text-faint"
          title={meta.data?.root ?? ''}
        >
          {meta.data?.root ?? 'connecting…'}
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="font-mono text-[9px] text-faint">
            v{meta.data?.version ?? '—'}
          </span>
          <LiveIndicator />
        </div>
      </div>
    </aside>
  )
}
