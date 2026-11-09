---
type: spec
status: active
project: notifications
owner: giulia
---

# Digest v1

One email per account per day, assembled from unread notifications. Push stays immediate
but is grouped by thread.

## Rules

- Cut-off at 07:00 local time.
- Empty digest is not sent.
- Maximum 20 items, ordered by priority then recency.
- Users can mute a thread; muted threads never enter the digest.

## Data

```text
notification(id, account_id, thread_id, priority, created_at, read_at)
digest_run(account_id, run_at, item_ids, status)
```

## Failure handling

| Failure | Behaviour |
| --- | --- |
| queue unavailable | retry with backoff, max 3 |
| mail provider 5xx | retry, then mark run failed |
| partial send | resume from last sent id |

## References

- `parent`: [Notifications](../README.md)
- `derives-from`: [ADR-003 — Queue choice](../adr/003-queue-choice.md)
- `ticket`: NOT-88
- `reviewed-by`: [Digest review](../reviews/digest-r1.md)
