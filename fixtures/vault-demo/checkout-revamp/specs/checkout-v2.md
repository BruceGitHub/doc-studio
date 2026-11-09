---
type: spec
status: active
project: checkout-revamp
owner: roberto
---

# Checkout v2

Two-step checkout with delivery estimates before payment, and a payment split that can
route a configurable share to a connected account.

## Goals

1. Reduce mobile abandonment by showing costs and delivery before the payment step.
2. Support split payments without forking the checkout flow.
3. Keep the legacy `/v1/checkout` contract until at least 2027-03.

## Non-goals

- Recurring payments.
- Multi-currency settlement (handled by the provider).
- Changing the cart service.

## Flow

```text
cart ──▶ delivery step ──▶ payment step ──▶ confirmation
             │                  │
             │                  ├─ card
             │                  └─ split (marketplace)
             └─ address + slot validation
```

The delivery step is authoritative for price: shipping, taxes and discounts are computed
there. The payment step never recomputes totals; it only executes.

## API sketch

```http
POST /v2/checkout/sessions
{
  "cart_id": "c_123",
  "delivery": { "slot_id": "slot_9", "address_id": "a_42" }
}
```

Response includes `total`, `currency`, `splits[]` and an idempotency key.

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Provider | Stripe Connect | already contracted, split support native |
| Totals | computed in delivery step | single source of truth |
| Retries | idempotency key per session | safe client retries |
| Feature flag | `checkout_v2` per account | staged rollout |

## Open questions

- [ ] What happens when the delivery slot expires between the two steps?
- [ ] Do we need a partial capture for split payments?
- [ ] How do refunds map back to splits?

## References

- `parent`: [Checkout revamp](../README.md)
- `derives-from`: [ADR-014 — Payment provider](../adr/014-payment-provider.md)
- `depends-on`: [ADR-015 — Idempotency](../adr/015-idempotency.md)
- `ticket`: CHK-120
- `reviewed-by`: [Review round 1](../reviews/checkout-v2-r1.md)
- `reviewed-by`: [Review round 2](../reviews/checkout-v2-r2.md)
