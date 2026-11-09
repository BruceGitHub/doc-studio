---
type: project
status: active
project: checkout-revamp
---

# Checkout revamp

Replace the single-step checkout with a two-step flow, introduce split payments for
marketplaces, and keep the legacy API alive until Q1.

## Why now

- Cart abandonment is 31% on mobile versus 19% on desktop.
- Marketplace sellers need to route a share of each transaction to a connected account.
- The current flow cannot show delivery estimates before payment.

## Tracked work

- Spec: [Checkout v2](./specs/checkout-v2.md)
- Decisions: [ADR-014 payment provider](./adr/014-payment-provider.md) · [ADR-015 idempotency](./adr/015-idempotency.md)
- Reviews: [Round 1](./reviews/checkout-v2-r1.md) · [Round 2](./reviews/checkout-v2-r2.md)
- Current board: [WIP](./tasks/wip.md)
- Rollout: [Rollout plan](./plans/rollout.md)

## Status

| Area | State | Note |
| --- | --- | --- |
| Spec | approved | round 2 open on edge cases |
| Payments | in progress | provider sandbox working |
| Split payments | blocked | waiting on legal review |
| Rollout | draft | depends on load test |

## References

- `parent`: [Workspace overview](../README.md)
- `relates-to`: [Checkout v2 spec](./specs/checkout-v2.md)
- `relates-to`: [WIP board](./tasks/wip.md)
