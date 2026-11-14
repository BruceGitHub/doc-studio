# Doc Studio — agent notes

Local read-only read model for markdown projects. `README.md` is the authoritative
reference for behaviour, vault conventions and the HTTP API; read it before changing
semantics. `docs/references-convention.md` details the `## References` grammar.

## Toolchain

- Node ≥ 22. `pnpm` is **not** on `PATH`: always call it through `corepack pnpm …`.
- Monorepo (pnpm workspace, `packages/*`):
  - `packages/core` — parsing, link resolution, index, search, graph, issues, DTOs.
  - `packages/server` — Fastify API, chokidar watcher, SSE, editor integration, state.
  - `packages/cli` — `docstudio` commands (`serve`, `index`, `doctor`, `search`, `new`).
  - `packages/web` — React 19 + Vite + Tailwind v4 UI.
- API types live in `@docstudio/core` and are imported **type-only** by server and web.
- No database: the index is rebuilt in memory; `<vault>/.docstudio/{cache,state}.json` are
  disposable and gitignored.

## Commands

```bash
corepack pnpm install
corepack pnpm build       # tsc -b (packages) + vite build (web)
corepack pnpm typecheck   # tsc -b + tsc -p packages/web --noEmit
corepack pnpm test        # vitest, all packages
corepack pnpm dev         # tsc watch + API watch + Vite, demo vault
```

Single test / focused run:

```bash
corepack pnpm vitest run packages/core/test/parse.test.ts
corepack pnpm vitest run packages/web/test/smoke.test.tsx
```

Tests live in `packages/*/test/**/*.test.{ts,tsx}`; `@docstudio/core` and
`@docstudio/server` are aliased to `src`, so no build is needed before testing.
`fixtures/vault-demo` intentionally contains broken links, orphans and missing
frontmatter: `doctor` exits 1 on it by design.

## Typecheck gotcha

The root `tsconfig.json` references only core, server and cli. `tsc -b` (and therefore the
Docker build stage) **does not typecheck `packages/web`**, and Vite only transpiles. Run
`corepack pnpm typecheck` before declaring web work done — undefined identifiers otherwise
survive into the bundle and fail at runtime.

## Docker

`Dockerfile` builds a sealed image: the entrypoint installs an egress firewall, the server
drops to the unprivileged `node` user, the vault is mounted `:ro` and the port is published
on `127.0.0.1` only. Do not loosen this (no public bind, no `--network host`). Use the
`make` targets (`build`, `start`, `stop`, `logs`, `instances`, `stop-all`) — they pass the
`DOCSTUDIO_*` env vars and give each port its own Compose project. CLI-only runs use
`--network none` plus `DOCSTUDIO_BLOCK_EGRESS=0`.

## Commits

- `git commit` is blocked by the harness: never run it, never retry it.
- When asked to **"commita"**, stage the intended files and reply with a ready-to-paste
  `git commit` command in a fenced `bash` block. No placeholders: the user copies it as-is.
  Prefer writing the message to a file and `git commit -F <file>`.
- Conventional Commits, imperative, e.g. `feat(web): …`, `fix(core): …` (see `git log`).
