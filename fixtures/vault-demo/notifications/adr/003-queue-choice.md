---
type: adr
status: accepted
project: notifications
date: 2026-09-12
---

# ADR-003 — Queue choice

## Context

Digest jobs must run for every account at 07:00 local time. The current cron + table scan
does not scale past 50k accounts and has no retry semantics.

## Decision

Use the existing Redis-backed queue (BullMQ) with delayed jobs. One job per account, sharded
by timezone bucket.

## Consequences

- Positive: retries, visibility, no new infrastructure.
- Negative: Redis becomes a hard dependency for digests.
- Mitigation: a fallback sweep job runs hourly and catches jobs older than 2 hours.

## References

- `parent`: [Notifications](../README.md)
- `implements`: [Digest v1](../specs/digest-v1.md)
