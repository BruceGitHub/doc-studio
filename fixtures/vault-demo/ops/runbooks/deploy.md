---
type: note
status: active
project: ops
owner: roberto
---

# Deploy runbook

## Pre-flight

```bash
kubectl config current-context
kubectl -n prod get pods | grep -v Running
```

## Deploy

```bash
kubectl -n prod rollout restart deploy/api
kubectl -n prod rollout status deploy/api --timeout=180s
```

## Rollback procedure

```bash
kubectl -n prod rollout undo deploy/api
```

Rollback is safe within one release. Beyond that, restore from the database snapshot.

## Verification

- [ ] `/healthz` returns 200
- [ ] error rate back to baseline within 5 minutes
- [ ] no stuck checkout sessions

## References

- `parent`: [Ops](../README.md)
- `relates-to`: [Ops rollback clock](./../README.md#rollback-clock)
