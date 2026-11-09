# Roadmap

The current version is a working vertical slice: index, API, UI, CLI, live updates and
tests. The items below are ordered by how much they reduce context switching per unit of
work. None of them change the core bet: markdown is the source of truth, the UI reads.

## Near term

- **Saved views.** Pin a project, a filter or a search on the overview. A view is a small
  JSON file in `.docstudio/`, not a new database.
- **Diff since last visit.** The index already knows `mtime`; store the last seen content
  hash per document and show a rendered diff instead of a timestamp.
- **Graph page.** The API returns a local graph today. A full-vault view with filtering by
  kind and project would make cross-project coupling visible.
- **Keyboard navigation.** `g o` / `g d` / `g p` style jumps and a document switcher inside
  the palette.
- **Relation validation.** Warn on unknown reserved kinds and on `parent` edges that point
  to a document in another project.

## Medium term

- **Multi-vault.** Serve several roots and search across them, with per-vault state.
- **Editor round-trip.** A stable URL scheme (`docstudio://doc/<id>:<line>`) so the editor
  can link back into the UI.
- **Timeline view.** Group reviews, tickets and decisions by week for a project.
- **Convention profiles.** A `.docstudio/config.json` for type folders, reference headings,
  open statuses and stale thresholds.
- **Export.** A static HTML snapshot of the read model for sharing or archiving.

## Explicit non-goals

- Editing markdown in the browser.
- A hosted, multi-user service with authentication.
- Inferring relations from prose or embeddings.
- Replacing the tracker or the editor.

## References

- `relates-to`: [Doc Studio](../README.md)
- `relates-to`: [References convention](./references-convention.md)
- `derives-from`: [Demo vault](../fixtures/vault-demo/README.md)
