# Lane A STG-01 correction disposition

| Field | Value |
|-------|-------|
| Finding | STG-01 — stale `draft_revision` hung on staging REST (~125s / HTTP 504) instead of explicit conflict |
| Contract tip (amended §5.1) | see `SERVICE_ROUTINES_AUTHORING_IMPLEMENTATION_CONTRACT.md` |
| Prior DB feature baseline (retained) | `e1345a0aef857e857fe5af50176c1fcb633aae70` |
| Correction migration | `20261116213000_service_routines_lane_a_stg01_stale_conflict.sql` |
| Staging apply | **Held** — [`STG01_STAGING_APPLY_PLAN.md`](./STG01_STAGING_APPLY_PLAN.md) for Spark review |
| Scope | Function-only + client mapping + conflict UI + tests/docs. No original migration replay, production, merge, or FR-1 |

## Disposition

| ID | Finding | Disposition | Change |
|----|---------|-------------|--------|
| **STG-01** | Hosted stale path used SQLSTATE `40001`, correlating with documented PostgREST retry behavior and observed 504 | **Fixed in tip** (staging apply pending Spark) | Raise **`PT409`** + DETAIL **`routine_draft_stale_revision`**; client maps structured code/detail to 409 (no retries/timeout workaround); UI retains unsaved input, shows server content separately, requires reconcile or labeled replace confirmation |

## Evidence

- Mechanism explanation vs observation: [`STG01_STALE_CONFLICT_EVIDENCE.md`](./STG01_STALE_CONFLICT_EVIDENCE.md)
- Historical local `40001` results preserved under `spark-probes/SPARK_LANE_A_RESULTS_*.json` (pre-correction)
- Current disposable battery asserts **`PT409`** (`RA-A12`…`RA-A12e`)

## Evidence commands (local / disposable)

```bash
python scripts/service-workflow/run_disposable_routines.py
npx vitest run \
  src/lib/serviceRoutinesApi.test.ts \
  src/components/admin/panels/ServiceRoutinesAuthoringPanel.test.tsx
```

| Correction tip SHA | `af78914426b359fb6cfa22915d5ad56b5828245c` |
