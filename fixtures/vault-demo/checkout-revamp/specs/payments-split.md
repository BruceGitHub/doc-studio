---
type: spec
status: draft
project: checkout-revamp
owner: roberto
---

# Payments split

How a single checkout transaction is divided between the platform and a seller.

> This is a draft. It exists to unblock the provider integration and will be merged into
> [Checkout v2](./checkout-v2.md) once legal confirms the fee model.

## Model

```text
gross = items + shipping + tax
platform_fee = gross * fee_rate
seller_share = gross - platform_fee - provider_fee
```

Rounding happens once, on `seller_share`, in minor units. The platform absorbs the residual.

## Edge cases

| Case | Behaviour |
| --- | --- |
| seller_share < 0 | reject at session creation |
| refund after split | reverse proportionally |
| partial capture | not supported in v2 |
| currency mismatch | reject |

## References

- `parent`: [Checkout revamp](../README.md)
- `derives-from`: [Checkout v2](./checkout-v2.md)
- `relates-to`: [ADR-014 — Payment provider](../adr/014-payment-provider.md)
