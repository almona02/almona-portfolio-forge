# STG-01 corrective staging apply plan (Spark review — apply held)

**Status:** Implementation frozen; Spark correction review **PASS**; **session clearance COMPLETE** (2026-11-16T20:58:11Z). **Staging schema apply still HELD** pending explicit bounded-apply authorization.  
**Do not** reapply `20261116180000_service_routines_lane_a_authoring`.  
**Do not** apply to production. No merge / FR-1 in this plan.

## Bindings to preserve

| Item | Value |
|------|--------|
| Lane A DB feature baseline | `e1345a0aef857e857fe5af50176c1fcb633aae70` |
| Live stamp (original Lane A) | `20261116192555` / `service_routines_lane_a_authoring` |
| Spark staging evidence | `SPARK_CONFIRM.json` STG-01 blocker + 32/32 API / 21/21 browser |
| Staging project | `apnmoevmvihfzcnttctx` only |
| Correction migration | `20261116213000_service_routines_lane_a_stg01_stale_conflict.sql` |

## Artifact

| Path | Role |
|------|------|
| [`supabase/migrations/20261116213000_service_routines_lane_a_stg01_stale_conflict.sql`](../../../supabase/migrations/20261116213000_service_routines_lane_a_stg01_stale_conflict.sql) | Canonical |
| [`applied-sql/lane-a-stg01/01_20261116213000_service_routines_lane_a_stg01_stale_conflict.sql`](./applied-sql/lane-a-stg01/01_20261116213000_service_routines_lane_a_stg01_stale_conflict.sql) | Review copy |

Proposed stamp after apply: `service_routines_lane_a_stg01_stale_conflict` (new stamp; original Lane A stamp retained in history).

## Preflight (operator — report before disrupt)

1. Identify lingering backends on staging (read-only). Filter `pg_stat_activity` for `authenticator` / `update_service_routine_draft` / long `query_start`.  
2. **Do not** auto-`pg_terminate_backend`. Report PID, state, `query_start`, truncated query to Spark/operator; wait for explicit approval before any terminate/restart.  
3. Confirm project ref `apnmoevmvihfzcnttctx` (never production `shfsebdncjnncqqnewfj`).

### Snapshot observed 2026-11-16T20:38:43Z (read-only; **no terminate**)

Staging `apnmoevmvihfzcnttctx` — backends whose query prefix matches PostgREST RPC shape for `p_version_id` / `p_expected_draft_revision` / `p_payload` (stale-conflict path):

| pid | usename | state | wait | query_start (UTC) |
|-----|---------|-------|------|-------------------|
| 2475341 | authenticator | idle in transaction (aborted) | ClientRead | 2026-11-16 20:38:43.188795+00 |
| 2476052 | authenticator | active | (none) | 2026-11-16 20:38:43.189581+00 |
| 2475263 | authenticator | active | Lock / transactionid | 2026-11-16 20:38:43.191127+00 |
| 2475170 | authenticator | active | Lock / tuple | 2026-11-16 20:38:43.192069+00 |
| 2476115 | authenticator | active | (none) | 2026-11-16 20:38:43.192985+00 |
| 2475223 | authenticator | idle | ClientRead | ABORT @ 20:38:43.193044+00 |
| 2476015 | authenticator | idle | ClientRead | ABORT @ 20:38:43.193348+00 |

Also present (not STG-01 RPC): pid **5709** `authenticator` idle `LISTEN "pgrst"` since 2026-10-23 (normal).

**Action:** Do **not** terminate automatically. Before applying STG-01, operator/Spark should decide whether to wait for drain, selectively terminate the listed PIDs, or restart the project — only after explicit approval.

## Apply steps (after Spark OK)

1. Apply **only** the STG-01 function-only SQL to staging.  
2. Re-`GRANT EXECUTE` already included in the migration; verify anon has no execute.  
3. Record apply SHA-256 of exact bytes + new stamp in apply record (new doc; do not rewrite original Lane A apply record body as if replayed).

## Targeted verification (STG-01 path only)

| Check | Expect |
|-------|--------|
| Stale `p_expected_draft_revision` | Prompt **HTTP 409** / code **`PT409`** / detail **`routine_draft_stale_revision`** (not 504) |
| Row after deny | Same `payload`, same `draft_revision` |
| Success audit | No new `routine_draft_updated` on deny |
| Fresh update | **200**; revision advances; one `routine_draft_updated` |
| Two-writer | Second writer wins; first token still conflicts |

No full Lane A restart required. Browser: conflict panel retains unsaved input; reconcile / labeled replace before save against new revision.

## Frontend

If UI ships in the same correction tip: redeploy protected preview against staging bindings only; keep Vercel Authentication on; secrets only in `_almona_handoff`.

## After Spark re-verify

Operator cleanup of `LA-STG-%` fixtures / bypass / shred per existing cleanup ownership; Spark `SPARK_ZERO_CONFIRM.json`.
