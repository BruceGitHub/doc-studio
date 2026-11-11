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
| 8 | Page title: browser tab shows the document (and view) name | done |
| 9 | File path breadcrumbs on the document page | done |
| 10 | Reduce left margins to give content more room | done |
| 11 | "On this page" stays visible while scrolling | done |
| 12 | Make "Open in editor" work (including the Docker setup) | done |
| 13 | Issue lists inside accordions, closed by default | done |
| 14 | Markdown fidelity: raw HTML and mermaid diagrams must render | done |

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

## Task 8 — Page title

- Added `packages/web/src/lib/usePageTitle.ts`.
- Document pages set the tab title to the document title (`Checkout v2 · Doc
  Studio`); project, search, doctor and overview views also get meaningful
  titles.

## Task 9 — File path breadcrumbs

- Added `pathCrumbs()` in `packages/web/src/lib/paths.ts`.
- The document header shows `vault / folder / subfolder / file.md`, linking the
  top-level project folder to its project page.
- Removed a stray `.md` suffix that rendered `file.md.md`.

## Task 10 — Left margins

- Main content and top bar use a smaller left padding (`pl-4`, `lg:pl-5`) while
  keeping the right padding, reclaiming horizontal space for the content.

## Task 11 — Sticky "On this page"

- The document right column is sticky below the top bar on `xl` screens and
  scrolls internally when taller than the viewport, so "On this page" stays
  visible while the article scrolls.

## Task 12 — Open in editor

- The server now returns an optional `url` on `POST /api/open`.
- Known editors map to their browser protocol (`vscode://`, `vscode-insiders://`,
  `vscodium://`, `cursor://`); `DOCSTUDIO_EDITOR_URL` can override the template.
- `DOCSTUDIO_HOST_VAULT` maps the vault mount to the host path, so the container
  build can hand a `vscode://file/...` URL to the browser even though it cannot
  spawn the host editor. `make start` sets it automatically (with `wslpath` on
  WSL).
- The UI opens the URL when spawning fails and keeps a manual link as fallback.
- The editor command parser now respects quoted paths with spaces.

## Task 13 — Issue accordions

- Added `packages/web/src/components/Disclosure.tsx` (native `<details>`,
  closed by default).
- Overview "Doctor issues", document-level doctor issues and each doctor group
  are collapsed by default; the summary keeps counts and severity visible.

## Task 14 — Markdown fidelity

- Found while reading real vaults: raw HTML was escaped, so hand-written
  anchors (`<a id="s-abstract"></a>`), `<details>`, `<kbd>`, `<sub>`/`<sup>` and
  `<br>` showed up as literal text and in-page links had no target.
  - The renderer now runs `rehype-raw` and then `rehype-sanitize` with a schema
    based on the default one: scripts, styles, iframes and event handlers stay
    blocked; table alignment and image `loading` are allowed; id/name clobbering
    is disabled so explicit anchors keep working.
- ` ```mermaid ` fences were rendered as code. Added `MermaidChart`, which
  lazy-loads `mermaid` in its own chunk (no network at runtime), renders the SVG
  locally, follows the app theme (re-renders on toggle) and falls back to an
  error box plus the diagram source when the syntax is invalid. The rest of the
  document keeps rendering.
- Added styles for mermaid blocks, `<details>`, `<kbd>` and `<sub>`/`<sup>`.
- Unit tests for `codeLanguage`, `mermaidSource` and the sanitizer schema.

Test suite: 10 files, 43 tests.
