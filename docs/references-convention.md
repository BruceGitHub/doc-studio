# References convention

This document is the contract behind the graph. It is written in the same format it
describes: outgoing relations only, in a `## References` section at the end.

## Why a dedicated section

Prose links are ambiguous. "See the ADR" might mean *implements*, *supersedes*, *discussed
in*, or just *related*. When a tool has to guess, the graph becomes noise and nobody trusts
it.

Declaring relations in one place gives three benefits:

1. The author states the semantics once, explicitly.
2. The index can compute backlinks without heuristics.
3. The Doctor can tell "this document is not connected" from "this document is connected
   only by passing mentions".

Inline links are still indexed, but as `untyped`, so nothing is lost and nothing is
over-claimed.

## Grammar

A references section is a heading whose normalized text is one of `references`,
`reference`, `refs`, `riferimenti`, `riferimento`. The section ends at the next heading of
the same or higher level.

Inside it, each relation is a list item (or paragraph) of the form:

```md
- `kind`: [label](path/to/doc.md#anchor)
- `kind`: TICKET-123
- `kind`: https://example.com/spec
```

Rules:

- `kind` is written as inline code, followed immediately by `:`.
- The kind is lowercased and normalized: spaces and underscores become `-`, other
  characters are dropped. `Reviewed By` becomes `reviewed-by`.
- A target is either a markdown link or plain text.
- A plain target that looks like a tracker id (`CHK-120`, `NOT-88`) or a URL is treated as
  external and never checked on disk.
- Both list items and plain paragraphs are accepted. Use list items.

The parser also accepts the same syntax in a paragraph, but list items produce one relation
per line and read better in diffs.

## Reserved kinds

The vocabulary is open: unknown kinds are stored and displayed like any other. These ones
carry UI meaning:

| Kind | Direction | Used for |
| --- | --- | --- |
| `parent` | up | Project hierarchy. The first `parent` wins; cycles are broken. |
| `derives-from` | back | Provenance of a spec, review or plan. |
| `supersedes` | back | This document replaces the target. |
| `implements` | back | This document realizes a spec or decision. |
| `follow-up` | back | Continues a review or thread. |
| `depends-on` | across | Needs the target before it can proceed. |
| `blocks` | across | Prevents the target from proceeding. |
| `ticket` | out | External tracker reference (usually plain text). |
| `relates-to` | across | Generic association. |

`parent` is the only kind with structural behavior. A document without a resolvable
`parent` is reported as an orphan when its project has a project root document.

## Targets and resolution

Relative targets resolve from the directory of the source document. Examples for
`checkout/specs/v2.md`:

| Target | Resolves to |
| --- | --- |
| `../README.md` | `checkout/README` |
| `./split.md` | `checkout/specs/split` |
| `/checkout/adr/014.md` | `checkout/adr/014` |
| `split` | `checkout/specs/split` (extension optional) |
| `../adr` | `checkout/adr/README` or `checkout/adr/index` |
| `#open-questions` | anchor in the same document |

Resolution is extension-agnostic: `.md` and `.markdown` are stripped from ids, and a
directory target falls back to `README` or `index` inside it.

## Anchors

An anchor (`#section`) is checked against the headings of the target document.
Slugs follow GitHub's algorithm (`github-slugger`), the same one used by the UI, so a link
that works on GitHub works here.

- A link with an unknown anchor is a **broken-anchor** error.
- A link with a path that does not exist is a **broken-link** error.
- External links are never checked.

## Backlinks

The index reads only outgoing edges. For every resolved edge it appends the reverse edge to
the target's backlinks. Backlinks are never written to markdown: they are recomputed from
the files on every reindex.

This means a document can be discovered from both directions without duplicating
declarations. It also means that deleting a reference immediately removes its backlink.

## What the Doctor checks

| Issue | Severity | Fix |
| --- | --- | --- |
| `broken-link` | error | Correct the path or create the document. |
| `broken-anchor` | error | Correct the anchor or add the heading. |
| `parse-error` | error | Fix frontmatter or markdown. |
| `missing-type` | warning | Add `type` or move the file into a known folder. |
| `missing-status` | warning | Add `status`. |
| `missing-references` | warning | Add a `## References` section with at least one relation. |
| `orphan` | warning | Add a `parent` relation. |
| `stale` | warning | An open document untouched for 21+ days: confirm or close it. |

## Anti-patterns

- Putting relations in prose and expecting the graph to understand them. They will be
  `untyped`.
- Duplicating the reverse relation (`parent` here and `child` there). The index computes it.
- Using `parent` for "related". It builds the tree; a wrong parent is worse than no parent.
- Linking to a heading you renamed. The Doctor catches it, but only after a reindex.

## References

- `relates-to`: [Doc Studio](../README.md)
- `relates-to`: [Demo vault root](../fixtures/vault-demo/README.md)
- `derives-from`: [Checkout v2 spec](../fixtures/vault-demo/checkout-revamp/specs/checkout-v2.md)
- `relates-to`: [Roadmap](./roadmap.md)
