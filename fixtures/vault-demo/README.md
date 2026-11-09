---
type: project
status: active
project: vault
---

# Workspace overview

This vault is the read model for everything that happens between a spec and a shipped
feature: product specs, architecture decisions, reviews, tickets and the live task board.

The point is not to write more documents. It is to keep the **relations** between them
explicit, so a tool can answer "where does this come from?" and "what is waiting on this?"
without reading everything again.

## Projects

| Project | Focus | State |
| --- | --- | --- |
| [Checkout revamp](./checkout-revamp/README.md) | New checkout flow and payment split | active |
| [Notifications](./notifications/README.md) | Digest pipeline and delivery | active |
| [Ops](./ops/README.md) | Runbooks and infrastructure notes | steady |

## Conventions

Every document starts with a small frontmatter block:

```yaml
---
type: spec        # project | spec | adr | review | ticket | task | plan | note
status: active    # draft | open | active | blocked | done | accepted | superseded
project: checkout-revamp
---
```

Every document ends with a `## References` section:

```md
- `parent`: [Project overview](../README.md)
- `derives-from`: [ADR-014](../adr/014-payment-provider.md)
- `ticket`: CHK-120
```

Only outgoing relations are declared. Backlinks are computed by the index.

## References

- `relates-to`: [Checkout revamp](./checkout-revamp/README.md)
- `relates-to`: [Notifications](./notifications/README.md)
- `relates-to`: [Ops](./ops/README.md)
