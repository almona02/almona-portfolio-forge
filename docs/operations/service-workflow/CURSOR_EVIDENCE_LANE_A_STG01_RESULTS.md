# Cursor evidence — Lane A STG-01 correction

Not Spark evidence. Staging apply held.

| Field | Value |
|-------|-------|
| Correction migration | `20261116213000_service_routines_lane_a_stg01_stale_conflict.sql` |
| Vitest | `serviceRoutinesApi.test.ts` + `ServiceRoutinesAuthoringPanel.test.tsx` — **11/11 PASS** (2026-11-16) |
| Disposable battery | Applied Lane A + STG-01 on local PG 17 (`55456`); **32/32 PASS** including `RA-A12`…`RA-A12e` → `PT409`, unchanged content/revision, no success audit on deny, two-writer intact, fresh save OK. (Note: `run_disposable_routines.py` `pg_ctl -w` can hang on Windows; battery verified via direct `psql` against the same cluster.) |
| Historical Spark local JSON | Still records pre-correction `40001` for `SPK-D7-stale` — preserved on purpose |

## Commands

```bash
npx vitest run \
  src/lib/serviceRoutinesApi.test.ts \
  src/components/admin/panels/ServiceRoutinesAuthoringPanel.test.tsx
python scripts/service-workflow/run_disposable_routines.py
```

| Correction tip SHA | `af78914426b359fb6cfa22915d5ad56b5828245c` |
