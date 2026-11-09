---
type: review
status: open
project: checkout-revamp
reviewer: giulia
date: 2026-10-29
---

# Review round 1 — Checkout v2

Scope: [Checkout v2](../specs/checkout-v2.md), sections *Flow*, *API sketch*, *Decisions*.

## Summary

The shape is right. Delivery as the authoritative price computation is the key decision and
it holds. Three issues need a decision before implementation starts.

## Findings

| # | Severity | Area | Finding |
| --- | --- | --- | --- |
| 1 | high | API | Session creation has no expiry contract. |
| 2 | medium | Data | Splits are not versioned; a fee change rewrites history. |
| 3 | low | Docs | `total` and `gross` are used interchangeably. |
| 4 | medium | Ops | No rollback trigger for the feature flag. |

## Questions

- **Q1** — If the slot expires while the user is on the payment step, do we create a new
  session or mutate the current one?
- **Q2** — Is `splits[]` immutable after creation?
- **Q3** — Who owns refund reconciliation?

## Verdict

Changes requested. Re-review after Q1 and Q2 are answered.

## References

- `parent`: [Checkout revamp](../README.md)
- `derives-from`: [Checkout v2](../specs/checkout-v2.md)
- `reviewed`: [Checkout v2](../specs/checkout-v2.md)
