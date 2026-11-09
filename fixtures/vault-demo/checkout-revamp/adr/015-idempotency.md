---
type: adr
status: proposed
project: checkout-revamp
date: 2026-10-28
---

# ADR-015 — Idempotency

## Context

Clients retry on timeout. Today a retry can create a second payment intent, which is
expensive to unwind and visible to the customer as a double hold.

## Decision

Every checkout session creation requires an `Idempotency-Key` header. The key is scoped to
the account and stored for 24 hours together with the response body.

```text
key = sha256(account_id + cart_id + delivery_slot + client_nonce)
```

Replays return the stored response with `Idempotent-Replay: true`.

## Consequences

- Positive: safe retries, fewer support tickets.
- Negative: storage of response bodies (small, TTL 24h).
- Open: do we need the same guarantee for the confirm step?

## References

- `parent`: [Checkout revamp](../README.md)
- `implements`: [Checkout v2](../specs/checkout-v2.md)
- `relates-to`: [ADR-014 — Payment provider](./014-payment-provider.md)
