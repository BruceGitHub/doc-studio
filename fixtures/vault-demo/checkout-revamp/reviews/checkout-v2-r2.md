---
type: review
status: open
project: checkout-revamp
reviewer: giulia
date: 2026-11-05
---

# Review round 2 — Checkout v2

Follow-up to [round 1](./checkout-v2-r1.md). Q1 and Q2 answered in the spec; one new
blocker appeared during the provider spike.

## Resolution of round 1

| # | Status | Note |
| --- | --- | --- |
| 1 | fixed | session expiry now explicit, 15 minutes |
| 2 | fixed | splits frozen at creation |
| 3 | fixed | glossary added to the spec |
| 4 | open | rollback trigger still missing |

## New findings

1. **Blocker** — the provider sandbox returns `transfer_group` only after capture, but the
   confirmation UI needs it before. We need a fallback identifier.
2. Webhook ordering is not guaranteed. Reconciliation must be idempotent on its own.
3. The legacy endpoint will need a compatibility shim for `splits[]`.

> The rollback trigger is the only thing preventing the feature flag from going to 5%.

## Next steps

- [ ] Add `checkout_reference` generated client-side as the fallback identifier.
- [ ] Write the reconciliation runbook.
- [ ] Decide the rollout gate in [the rollout plan](../plans/rollout.md).

## References

- `parent`: [Checkout revamp](../README.md)
- `follow-up`: [Review round 1](./checkout-v2-r1.md)
- `derives-from`: [Checkout v2](../specs/checkout-v2.md)
- `depends-on`: [ADR-015 — Idempotency](../adr/015-idempotency.md)
- `follow-up`: [Checkout v3 spec](../specs/checkout-v3.md) — not written yet
