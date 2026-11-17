# Lane B staging apply record

| Field | Value |
|-------|-------|
| **Status** | Applied on staging · Spark verification pending · **no production / merge / FR-1** |
| **Implementation** | `d0c311c9cfc9a65bf67f85ee95b14946224d0a7b` |
| **Local acceptance** | Spark independent PASS — [`LANE_B_LOCAL_ACCEPTANCE_d0c311c9.md`](./LANE_B_LOCAL_ACCEPTANCE_d0c311c9.md) |
| **Spark evidence (integrated)** | `5dc324e2c0108328c11ed8e00e87f575b1dfd1d7` (runtime unchanged) |
| **Target DB** | `apnmoevmvihfzcnttctx` (`almona02-staging`, eu-west-3, ACTIVE_HEALTHY) |
| **Operator apply** | MCP `apply_migration` single shot |

## Payload

| Check | Value |
|-------|-------|
| Source path @ `d0c311c9` | `supabase/migrations/20261117190000_service_routines_lane_b_job_pins.sql` |
| Bytes (LF) | 29255 |
| `lf_sha256` | `3d39d6a2741a3519bbb5e144c1d4ff201048b224d1877b138f4b3c1423b223a0` |
| Applied copy | `applied-sql/lane-b-staging/01_20261117190000_service_routines_lane_b_job_pins.sql` |

## Preflight (staging)

| Check | Result |
|-------|--------|
| Project | `almona02-staging` / `apnmoevmvihfzcnttctx` |
| Lane A stamp | `20261116192555` `service_routines_lane_a_authoring` |
| STG-01 stamp | `20261116210024` `service_routines_lane_a_stg01_stale_conflict` |
| `lock_job_hierarchy` / `can_read_ticket_workflow` / `start_service_job_visit` / `routine_family_set` | present |
| `service_job_routine_pins` / pin RPCs / `work_started_boundary_at` pre-apply | **absent** |
| Unexplained drift | **none** — proceed |

## Live stamp + deployed definitions

| Check | Result |
|-------|--------|
| `schema_migrations` | `20261117193033` / `service_routines_lane_b_job_pins` |
| Table | `public.service_job_routine_pins` · RLS **on** |
| Column | `service_jobs.work_started_boundary_at` (timestamptz, nullable) |
| Trigger | `trg_visit_in_progress_pin_freeze` on `service_job_visits` |
| RPCs | `pin_service_job_routine` · `replace_service_job_routine_pin` · `unpin_service_job_routine` · `get_service_job_routine_pin` · `list_service_job_routine_pin_history` |

## Effective grants

| Object | anon | authenticated |
|--------|------|---------------|
| Table `service_job_routine_pins` SELECT/INSERT/UPDATE/DELETE | all **false** | SELECT **true**; INSERT/UPDATE/DELETE **false** |
| Five public pin RPCs EXECUTE | **false** | **true** |

Policies: SELECT scoped to admin/support/technician + `can_read_ticket_workflow`; INSERT/UPDATE/DELETE `WITH CHECK`/`USING` **false**.

## Frontend preview

Filled after deploy in the same commit wave / handoff (see secure handoff + release notes below).

## Secure delivery to Spark

Credentials are **not** in git. Spark must read:

`C:\projects\_almona_handoff\lane-b-staging-verification\SPARK_LANE_B_STAGING_SECURE_HANDOFF.txt`

## Explicit non-goals

No production · no merge · no FR-1 · no Lane A reapply · no next-lane implementation.
