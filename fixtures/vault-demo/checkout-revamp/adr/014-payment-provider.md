---
type: adr
status: accepted
project: checkout-revamp
date: 2026-10-18
---

# ADR-014 — Payment provider

## Context

Checkout v2 needs a provider that supports marketplace splits without a second contract.
We already use Stripe for subscriptions and payouts in the seller dashboard.

Alternatives considered: Adyen (better EU fees, no native split in our plan), Mollie
(simpler, but requires a new commercial agreement), build on top of our ledger (too slow).

## Decision

Use Stripe Connect with destination charges. The platform is the merchant of record; the
seller receives a transfer after capture.

## Consequences

- Positive: one provider, one webhook surface, split support out of the box.
- Negative: fee is ~0.3% higher than Adyen at our volume.
- Risk: destination charges complicate refunds. Mitigated by ADR-015 idempotency and a
  reconciliation job.

## Invariants

1. A checkout session maps to exactly one PaymentIntent.
2. Transfers are created only after `payment_intent.succeeded`.
3. Refunds are always issued against the original PaymentIntent.

## References

- `parent`: [Checkout revamp](../README.md)
- `implements`: [Checkout v2](../specs/checkout-v2.md)
- `constrained-by`: [ADR-015 — Idempotency](./015-idempotency.md)
