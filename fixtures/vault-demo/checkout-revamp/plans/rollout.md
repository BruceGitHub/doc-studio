---
type: plan
status: draft
project: checkout-revamp
owner: roberto
---

# Rollout plan — Checkout v2

Staged rollout driven by the `checkout_v2` feature flag per account.

## Phases

| Phase | Audience | Gate | Rollback trigger |
| --- | --- | --- | --- |
| 0 | internal accounts | smoke suite green | any 5xx on session creation |
| 1 | 1% of traffic | error rate < 0.5% for 48h | error rate > 1% |
| 2 | 10% | conversion not worse than -1% | conversion -3% |
| 3 | 100% | one week stable | manual only |

## Pre-flight

1. Load test at 3× current peak.
2. Reconciliation job running in dry-run for 72 hours.
3. Support macros updated.
4. Legacy shim deployed.

## Open decisions

- Do we gate by account or by cart value?
- Who is on call for phase 1?

## References

- `parent`: [Checkout revamp](../README.md)
- `derives-from`: [Checkout v2](../specs/checkout-v2.md)
- `depends-on`: [CHK-120 — Checkout session endpoint](../tickets/CHK-120.md)
- `discussed-in`: [Review round 2](../reviews/checkout-v2-r2.md)
- `runbook`: [Deploy runbook](../../ops/runbooks/deploy.md)
