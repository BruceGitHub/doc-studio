---
type: review
status: done
project: notifications
reviewer: roberto
date: 2026-10-22
---

# Digest v1 — review

Scope: [Digest v1](../specs/digest-v1.md).

## Findings

| # | Severity | Finding | Resolution |
| --- | --- | --- | --- |
| 1 | high | Timezone cut-off undefined for DST | use IANA zone, not offset |
| 2 | medium | Partial send resume unclear | added `last_sent_id` |
| 3 | low | Maximum items hard-coded | moved to config |

All findings resolved. Approved for implementation.

## References

- `parent`: [Notifications](../README.md)
- `derives-from`: [Digest v1](../specs/digest-v1.md)
- `reviewed`: [Digest v1](../specs/digest-v1.md)
