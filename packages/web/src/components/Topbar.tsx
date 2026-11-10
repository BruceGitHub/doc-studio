import { Link, useNavigate } from 'react-router-dom'
import { usePalette } from '../palette'
import { useTheme } from '../theme'
import { LiveIndicator } from './LiveIndicator'

export function Topbar({
  sidebarCollapsed,
  onToggleSidebar,
}: {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}) {
  const palette = usePalette()
  const navigate = useNavigate()
  const theme = useTheme()
  const nextTheme = theme.theme === 'dark' ? 'light' : 'dark'

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-canvas/85 px-5 backdrop-blur-xl lg:px-7">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="btn btn-ghost hidden h-8 w-8 px-0 lg:inline-flex"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-pressed={!sidebarCollapsed}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <rect
            x="2.5"
            y="3"
            width="11"
            height="10"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M6 3v10"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-accent/25 bg-accent/10 text-accent">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M3.5 2.5h6L12.5 5.5v8h-9v-11Z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="text-[13px] font-semibold">Doc Studio</span>
      </div>

      <div className="hidden items-center gap-2 lg:flex">
        <span className="chip border-line bg-surface text-faint">read-only</span>
        <span className="text-[11px] text-faint">
          markdown is the source of truth
        </span>
      </div>

      <div className="flex items-center gap-1 sm:ml-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="btn btn-ghost h-8 w-8 px-0"
          aria-label="Go back"
          title="Back (←)"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path
              d="M9.5 3.5 5 8l4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => navigate(1)}
          className="btn btn-ghost h-8 w-8 px-0"
          aria-label="Go forward"
          title="Forward (→)"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path
              d="M6.5 3.5 11 8l-4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={palette.open}
          className="btn bg-surface/80"
          aria-label="Open search"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.2" stroke="currentColor" strokeWidth="1.2" />
            <path
              d="m10.2 10.2 3 3"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          <span className="hidden sm:inline">Search</span>
          <span className="kbd ml-1 hidden md:inline">⌘K</span>
        </button>

        <Link to="/doctor" className="btn btn-ghost hidden sm:inline-flex">
          Health
        </Link>

        <button
          type="button"
          onClick={theme.toggle}
          className="btn btn-ghost h-8 w-8 px-0"
          aria-label={`Switch to ${nextTheme} theme`}
          title={`Switch to ${nextTheme} theme`}
        >
          {theme.theme === 'dark' ? (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2.9" stroke="currentColor" strokeWidth="1.3" />
              <path
                d="M8 1.6v1.6M8 12.8v1.6M1.6 8h1.6M12.8 8h1.6M3.5 3.5l1.1 1.1M11.4 11.4l1.1 1.1M12.5 3.5l-1.1 1.1M4.6 11.4l-1.1 1.1"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path
                d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8Z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        <span className="pl-1">
          <LiveIndicator />
        </span>
      </div>
    </header>
  )
}
