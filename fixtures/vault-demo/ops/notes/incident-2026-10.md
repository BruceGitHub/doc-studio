# Incident 2026-10 — duplicate payment holds

Postmortem notes. This file was written during the incident and never normalized: no
frontmatter, no references. It is here on purpose to show what the doctor reports.

## Timeline

- 10:12 — first support ticket about a double hold
- 10:20 — identified retry storm from the mobile client
- 10:48 — idempotency patch deployed
- 11:30 — backlog of holds released

## Follow-ups

- Idempotency ADR.
- Client retry budget.
- Alert on duplicate PaymentIntents per cart.
