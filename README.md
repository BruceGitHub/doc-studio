# Doc Studio

A **local read model and navigator for markdown-driven projects**.

Markdown stays the source of truth. Doc Studio indexes a folder of documents, makes the
relations between them explicit, and gives you one place to answer the questions that
matter when many projects are open at once:

- What changed since I last looked?
- Where does this spec come from, and what is waiting on it?
- Which review or ticket is still open?
- Which links are broken, which documents are orphaned, which are stale?

The UI is read-only by design. To edit a document you open the file in your editor; the
index picks up the change on the next file event.

```
fixtures/vault-demo  ──scan──▶  index (in memory + JSON cache)  ──API/SSE──▶  web UI
        ▲                                                                      │
        └──────────────────────── open in editor ──────────────────────────────┘
```

## Quickstart

Requirements: Node.js ≥ 22 and `corepack` (shipped with Node).

```bash
corepack pnpm install
corepack pnpm build

# index + serve the bundled demo vault
corepack pnpm docstudio serve fixtures/vault-demo
```

Open <http://127.0.0.1:4321>. The demo vault contains four projects and a few intentional
problems so the Doctor view has something to show.

Point it at your own vault:

```bash
corepack pnpm docstudio serve ~/notes/work
# or
DOCSTUDIO_VAULT=~/notes/work corepack pnpm start
```

Development mode (TypeScript watch, API watch, Vite dev server with proxy):

```bash
corepack pnpm dev
```

## Docker

Run the whole tool without installing Node:

```bash
docker compose up --build
```

Or with the Makefile:

```bash
make build     # build the image
make start     # build + start on http://127.0.0.1:4321
make logs      # follow the container logs
make stop      # stop it
```

Open <http://127.0.0.1:4321>. The bundled demo vault is mounted read-only; to use a real
vault, point `VAULT` (or `DOCSTUDIO_VAULT` with compose) at it:

```bash
make start VAULT=$HOME/notes/work PORT=8080
# or
DOCSTUDIO_VAULT=$HOME/notes/work docker compose up --build
```

`make index` and `make doctor` run the CLI in a container with `--network none`, so they
have no network interface at all (`doctor` exits 1 when the vault has errors, on purpose).

The container is sealed by default. On startup the entrypoint installs an `OUTPUT`
firewall that only allows loopback and replies to connections opened from the host:

```text
-P OUTPUT ACCEPT
-A OUTPUT -o lo -j ACCEPT
-A OUTPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A OUTPUT -j REJECT --reject-with icmp-port-unreachable
```

The server then drops from root to the unprivileged `node` user (`uid 1000`). The port is
published on `127.0.0.1` only, the vault is mounted `:ro`, and the root filesystem is
read-only. The cache and the "seen" state live in memory inside the container.

For a completely offline CLI run (no network interface at all):

```bash
docker run --rm --network none \
  -e DOCSTUDIO_BLOCK_EGRESS=0 \
  -v "$PWD/fixtures/vault-demo:/vault:ro" \
  docstudio:local index /vault
```

`DOCSTUDIO_BLOCK_EGRESS=0` is only needed because `--network none` already removes every
route; without it the entrypoint refuses to start when it cannot install the firewall.

## The vault contract

Doc Studio works best when documents follow three conventions. Nothing is mandatory:
anything missing is reported by the Doctor as a gap to fix, not treated as a failure.

### 1. Frontmatter

```yaml
---
type: spec        # project | spec | adr | review | ticket | task | plan | note
status: active    # draft | open | active | blocked | in-progress | done | accepted | ...
project: checkout-revamp
tags: [checkout, payments]
---
```

- `type` falls back to the folder name (`specs/` → `spec`, `adr/` → `adr`, `reviews/` →
  `review`, `tickets/` → `ticket`, `tasks/` → `task`, `plans/` → `plan`, `notes/` → `note`).
  Aliases such as `specification`, `rfc`, `decision`, `issue`, `todo` are normalized.
- `project` falls back to the first path segment. Documents at the vault root belong to the
  `vault` project.
- `status` is free-form, lowercased. A known set drives the "open" counts and the stale
  check (`open`, `active`, `in-progress`, `wip`, `blocked`, `needs-review`, `review`,
  `todo`, `proposed`).

### 2. A `## References` section

Only **outgoing** relations are declared. Backlinks are always computed by the index.

```md
## References

- `parent`: [Checkout revamp](../README.md)
- `derives-from`: [ADR-014 — Payment provider](../adr/014-payment-provider.md)
- `depends-on`: [ADR-015 — Idempotency](../adr/015-idempotency.md)
- `ticket`: CHK-120
- `reviewed-by`: [Review round 1](../reviews/checkout-v2-r1.md)
```

Grammar: `` `kind`: target `` where the target is an inline link, a bare ticket id, or an
external URL. The section is detected by heading (`References`, `Reference`, `Refs`,
`Riferimenti`, `Riferimento`, case-insensitive); configure more names with the core
`referenceHeadings` option.

Reserved kinds with UI meaning:

| Kind | Meaning |
| --- | --- |
| `parent` | Hierarchy edge. Builds project trees and drill-up breadcrumbs. |
| `derives-from` | Provenance: this document comes from another one. |
| `supersedes` | Replaces an older document. |
| `implements` | Document realizes a spec/decision. |
| `follow-up` | Continues a previous review/thread. |
| `depends-on` / `blocks` | Scheduling relations. |
| `ticket` | External tracker id. |
| `relates-to` | Generic association. |

Any other kind is accepted and displayed with the same weight. The vocabulary is open.

### 3. Links inside the body

Any other markdown link outside the References section is indexed as an `untyped` edge.
This keeps imports from other tools connected without pretending to know the semantics.
Broken local links and missing anchors are reported as **errors**; missing conventions are
**warnings**.

Read the full rules in [docs/references-convention.md](docs/references-convention.md).

## What the UI gives you

- **Overview** — vault counters, what changed since the last visit, open reviews/tickets,
  unread documents, a full-width expandable errors and warnings panel, project cards.
- **Directory tree** — the sidebar navigates the real vault layout: root → folder →
  subfolder → document. Expansion is remembered in `localStorage` and the folders that
  contain the open document are revealed automatically. "Project" stays a semantic
  grouping from frontmatter; it is not a folder rule.
- **Project** — document tree built from `parent` edges, recent work, project health and
  status mix.
- **Document** — rendered markdown, breadcrumb drill-up, child documents drill-down,
  explicit references, computed backlinks, local graph, per-document issues, and
  *Open in editor* (deep link to your editor at the right file). The right column reads
  On this page → References → Backlinks → Graph → Drill down.
- **Search** — full-text over titles, headings, paths and body, filtered by project, type
  and status.
- **Doctor** — grouped structural issues with explanations and jump-to-document links.
  Error rows expand in place to show the full message and help text.
- **Command palette** — `⌘K` / `Ctrl+K` over the same search index.
- **History navigation** — `←` / `→` (or the arrow buttons in the top bar) move back and
  forward through visited pages, restoring each page's scroll position.
- **Themes** — dark and light, toggled from the sun/moon button in the top bar. The choice
  is remembered in `localStorage`; the first visit follows the OS preference.
- **Collapsible sidebar** — the top-bar toggle shrinks the sidebar to a 64px icon rail to
  reclaim horizontal space. The choice is remembered in `localStorage`.

Live updates arrive over Server-Sent Events: edit a file, the index refreshes, the views
refetch. A 10-second revision poll over `/api/meta` backs up the stream (buffering proxies,
delayed file notifications), and the client refetches after a reconnect. API responses are
sent `no-store`, so a stale cache can never hide an edit. In containers, set
`DOCSTUDIO_WATCH_POLL=1` when the bind mount does not forward inotify events; the compose
file already does.

## CLI

```
docstudio serve [vault]        # index + serve UI/API (default port 4321)
docstudio index [vault]        # scan and report counters, optional --json
docstudio doctor [vault]       # grouped issues; exit 1 if there are errors
docstudio search <query> [vault]
docstudio new <type> <title> [vault] [--project alpha] [--dir path]
```

Options for `serve`: `--port`, `--host`, `--editor "code -g"`, `--web-dir`, `--no-watch`.
Defaults come from `DOCSTUDIO_VAULT` and `DOCSTUDIO_EDITOR`. Set
`DOCSTUDIO_WATCH_POLL=1` to poll instead of relying on native file events (useful for bind
mounts and network filesystems).

## HTTP API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/meta` | Vault name/root, counters, last index and visit. |
| `GET` | `/api/tree` | Filesystem navigation tree: root → folders → documents. |
| `GET` | `/api/projects` | Project summaries. |
| `GET` | `/api/projects/:name` | Tree, recent documents, issues. |
| `GET` | `/api/docs/*` | Document detail (body, headings, edges, issues). |
| `GET` | `/api/search?q=&project=&type=&status=` | Ranked search hits with snippets. |
| `GET` | `/api/attention` | Changed, unread, open threads, errors. |
| `GET` | `/api/doctor` | Grouped issues. |
| `GET` | `/api/graph?focus=&depth=` | Local graph around a document. |
| `POST` | `/api/seen` | Mark a document as read. |
| `POST` | `/api/visit` | Advance the last-visit marker. |
| `POST` | `/api/open` | Open the file in the configured editor. |
| `POST` | `/api/refresh` | Force a reindex. |
| `GET` | `/api/events` | SSE stream (`reindex` events). |

Document ids are vault-relative paths without the `.md` extension, for example
`checkout-revamp/specs/checkout-v2`.

## Architecture

Monorepo with four packages:

```
packages/core      parsing, link resolution, index, search, graph, issues, DTO types
packages/server    Fastify API, chokidar watcher, SSE, editor integration, state
packages/cli       docstudio commands and default web-dir resolution
packages/web       React 19 + Vite + Tailwind v4 UI
```

Design decisions:

- **No database.** The index is rebuilt in memory from the markdown files. Parsed
  documents are cached in `<vault>/.docstudio/cache.json` keyed by path, mtime and size;
  local state (last visit, seen documents) lives in `<vault>/.docstudio/state.json`.
  Both are disposable and gitignored.
- **Explicit relations.** Nothing is inferred from prose. Inline links are kept but marked
  `untyped`, so the graph never claims a semantics the author did not declare.
- **Single source of truth for DTOs.** API types live in `@docstudio/core` and are imported
  type-only by the server and the web app.
- **Local, single user, no auth.** The server binds to `127.0.0.1` by default and executes
  the configured editor command. Do not expose it on a public interface.

## Demo vault

`fixtures/vault-demo` contains 22 realistic documents across four projects. It deliberately
includes one broken link, one broken anchor, one orphan note, one document without
frontmatter/references and a few stale open documents, so every Doctor group is exercised.

```bash
corepack pnpm docstudio doctor fixtures/vault-demo
```

## Development

```bash
corepack pnpm build       # packages + web bundle
corepack pnpm typecheck   # strict TS across packages and web
corepack pnpm test        # vitest (parser, index, HTTP API)
corepack pnpm dev         # watch mode + Vite
```

## Roadmap

Ideas that fit the current design are tracked in [docs/roadmap.md](docs/roadmap.md).

## References

- `relates-to`: [References convention](docs/references-convention.md)
- `relates-to`: [Roadmap](docs/roadmap.md)
- `relates-to`: [Demo vault](fixtures/vault-demo/README.md)
