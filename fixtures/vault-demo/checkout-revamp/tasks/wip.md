---
type: task
status: active
project: checkout-revamp
owner: roberto
---

# WIP board — Checkout revamp

Live board. Keep this file short; details belong to the tickets.

## In progress

| ID | Task | Owner | Since | Next |
| --- | --- | --- | --- | --- |
| CHK-120 | Session endpoint + idempotency | roberto | Nov 3 | contract tests |
| CHK-118 | Delivery slot validation | giulia | Nov 4 | error mapping |
| CHK-122 | Legacy shim | roberto | Nov 6 | review |

## Blocked

| ID | Task | Blocked by | Since |
| --- | --- | --- | --- |
| CHK-131 | Split payments legal review | legal | Oct 31 |

## Next

- [ ] Wire the reconciliation dry-run
- [ ] Decide the rollout gate with giulia
- [ ] Rename `total` → `gross` in the API draft

## Done this week

- [x] Provider spike (destination charges)
- [x] Session model migration
- [x] Feature flag skeleton

## References

- `parent`: [Checkout revamp](../README.md)
- `tracks`: [CHK-120](./../tickets/CHK-120.md)
- `tracks`: [CHK-131](./../tickets/CHK-131.md)
- `tracks`: [Rollout plan](../plans/rollout.md)
