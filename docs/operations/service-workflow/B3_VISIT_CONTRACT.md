# B3 visit execution contract

**Status:** Implementation frozen for Spark review. **No staging apply** until Spark PASS.  
**Depends on:** B1/B2 accepted at `49c78969`.  
**#155** frozen · **#156** draft · no merge / production.

## Scope

Schedule and execute `service_job_visits`: schedule/reschedule (append-only history), start, complete, abort, no-access. Multiple visits per job. One **active** (`in_progress`) visit per job enforced in RPC logic only (no permanent schema constraint).

Visit completion does **not** complete the job or close the ticket. Job completion / reports / closure remain B4+.

## Reassignment and scheduled attendance

**Start authority = current `service_jobs.assigned_technician_id`.**

On assign/reassign/decline:

1. Deny if any visit is `in_progress`.
2. Repoint every `scheduled` visit’s `attending_technician_id` to the new assignee (or `NULL` after decline).
3. Terminal / started visits keep frozen attending attribution.

A former assignee therefore cannot start a visit after reassignment.

## RPCs

| RPC | Who |
|-----|-----|
| `schedule_service_job_visit` | admin/support |
| `reschedule_service_job_visit` | admin/support; `scheduled` only |
| `start_service_job_visit` | assigned technician (or admin/support on-behalf) |
| `complete_service_job_visit` | attending/assigned tech or admin/support |
| `abort_service_job_visit` / `record_visit_no_access` | same; reason mandatory |

B1 `create_service_job_visit` / `govern_visit_transition` remain as facades.
Disposable S22 expectation is updated for B3: scheduled `attending_technician_id` is **repointed** on reassign/decline (no longer a frozen snapshot).

## Configurable routine extension (B4 — not built in B3)

Visit execution stays **generic**. Columns reserved, unused by B3 logic:

- `service_job_visits.pinned_routine_version_id`
- `service_job_visits.checklist_results`

Do not hardcode model-specific checks. Do not ship a routine editor/scheduler in B3. B4 may pin a routine version and persist checklist results against these fields.

## Migration

`supabase/migrations/20261112180000_service_workflow_b3_visit_execution.sql`  
Disposable battery: `scripts/service-workflow/disposable_b3_battery.sql`
