---
type: note
status: draft
project: checkout-revamp
---

# Spike — webhooks without ordering

Provider webhooks can arrive out of order. The spike evaluates a small state machine that
tolerates late events instead of assuming sequence.

## Idea

Store the last applied `event.created` per payment intent. Ignore events older than the last
applied one, except for refunds, which are additive.

## Open

- Refund events are not ordered either.
- Do we need a dead-letter queue?

## References

- `relates-to`: [Checkout v2](../specs/checkout-v2.md)
- `relates-to`: [ADR-015 — Idempotency](../adr/015-idempotency.md)
