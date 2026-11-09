---
type: ticket
status: blocked
project: notifications
owner: giulia
ticket: NOT-88
---

# NOT-88 — Daily digest job

Implement the delayed job that assembles and sends the daily digest.

## Checklist

- [x] Job skeleton with BullMQ
- [x] Timezone bucketing
- [ ] Template rendering
- [ ] Partial send resume
- [ ] Metrics and alerts

## Blocker

Waiting for the mail provider to approve the new sender domain. ETA unknown.

## References

- `parent`: [Digest v1](../specs/digest-v1.md)
- `implements`: [Digest v1](../specs/digest-v1.md)
- `depends-on`: [ADR-003 — Queue choice](../adr/003-queue-choice.md)
