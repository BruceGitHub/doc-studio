# Doc Studio — task plan

Status legend: `todo` · `in progress` · `done` · `blocked`

| # | Task | Status |
| - | ---- | ------ |
| 1 | Real-time updates: edits must refresh the open views without a reload | done |
| 2 | Missing icon: add the browser favicon and consistent navigation icons | done |
| 3 | Navigation as a directory tree: root → folder → subfolder → document | done |
| 4 | Errors presentation: give error content room and expand details on click | done |
| 5 | Collapsible left sidebar to reclaim horizontal space | done |
| 6 | Document right column order: On this page first, then references/graph | done |
| 7 | Unit tests for the new server and web behaviour | done |

## Notes

- "Project" stays a semantic grouping derived from frontmatter / first path segment.
  Navigation itself becomes a filesystem tree of directories.
- Each task is completed and verified before the next one starts. This file is
  updated after every task.

## Task 1 — Real-time updates

Investigation notes:

- Server watcher: `packages/server/src/watcher.ts`
- SSE stream: `packages/server/src/app.ts` (`GET /api/events`)
- Client subscription: `packages/web/src/live.tsx`
- Refetch hook: `packages/web/src/lib/useApi.ts`

Outcome:

- API responses are sent with `Cache-Control: no-store`; fetches use
  `cache: 'no-store'`.
- The live provider keeps SSE as the fast path, adds a 10s revision poll over
  `/api/meta`, re-reads on reconnect and retries a dropped stream.
- The watcher supports `DOCSTUDIO_WATCH_POLL=1` (enabled in compose) for bind
  mounts that do not forward inotify events into the container.
- `changesSince(null)` now returns the whole vault, matching the copy on the
  overview ("No previous visit recorded: this is everything").

## Task 2 — Missing icon

- Added `packages/web/public/favicon.svg`, linked from `packages/web/index.html`.
- Added `theme-color` metas for light and dark so mobile chrome matches the UI.
- The same mark is used in the sidebar and the mobile top bar.

## Task 3 — Directory tree navigation

- Added `GET /api/tree` and `packages/server/src/nav.ts`.
- `DirNodeDTO` models root → folder → subfolder → document, with recursive
  document counts.
- `packages/web/src/components/NavTree.tsx` replaces the flat project list in
  the sidebar, persists expansion in `localStorage` and auto-expands the
  directories that contain the open document.
- "Project" remains a semantic frontmatter/path grouping used by the project
  pages and search filters.

## Task 4 — Errors presentation

- Added `packages/web/src/components/Issues.tsx`: rows expand in place to show
  the full message, the path and line, the help text and a document link.
- The overview now renders a full-width "Errors and warnings" panel instead of
  the clipped list in the narrow right column.

## Task 5 — Collapsible sidebar

- Shell owns the persisted `docstudio:sidebar` state.
- Topbar has a collapse/expand button; the sidebar collapses to a 64px icon
  rail with tooltips and the logo acts as a second expand control.
- Content padding follows the sidebar width.

## Task 6 — Right column order

- Document page order is now: On this page, References, Backlinks, Graph,
  Drill down.

## Task 7 — Unit tests

- `packages/server/test/nav.test.ts`: directory tree shape, counts, sorting,
  semantic project vs folder.
- `packages/core/test/vault.test.ts`: `changesSince(null)` returns everything
  newest first.
- `packages/web/test/nav-tree.test.ts`: ancestor expansion helper.
- `packages/web/test/issues.test.tsx`: full error content and empty state.
- Suite: 28 tests passing.
