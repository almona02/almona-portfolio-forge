# B3 visit execution contract

**Status:** B3 corrections applied on **staging** at runtime `4e0ddd22` (see [`B3_STAGING_APPLY_RECORD.md`](./B3_STAGING_APPLY_RECORD.md)). **No merge / production / B4**.  
**Depends on:** B1/B2 accepted at `49c78969`.  
**Freeze:** `9882a256` · **Corrections:** see tip / `B3_CONDITIONAL_PASS_CORRECTIONS.md`  
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

## F-B3-01 — Authorization before idempotent return

`complete_service_job_visit` / `abort_service_job_visit` / `record_visit_no_access` validate caller identity, role, and visit/job scope **before** returning an already-terminal row. Authorized retries remain idempotent. Denied callers get `42501` (no row payload) with no writes/audit.

## D-B3-01 — First-start ticket transition

Starting the **first** authorized visit advances the ticket `assigned → in_progress` through the governed FSM (ticket governance audit + workflow audit) in the same transaction as visit/job start. Later visit starts do not repeat that transition or reset ticket clocks. Incompatible parent statuses (e.g. `open`, terminal) are rejected — no FSM bypass.

## D-B3-02 — Minimum safety prerequisite

Visit start requires **explicit** safety evidence:
1. `p_safety_attestation` matching `b3_minimum_safety_attestation()` from the **bound attending/assigned technician**, or
2. a previously recorded personal `passed` check that is still **latest** (`attested_at DESC, ordinal DESC`) and bound to this visit + technician + current `assignment_generation`.

`govern_visit_transition → in_progress` does **not** invent a passed attestation. Missing evidence fails clearly. A later explicit passed supersedes a prior failed; a later failed supersedes a prior passed. Abort/no-access do not fabricate a passed check. This gate does **not** assert machine-specific hazard clearance.

## F-B3-02 — Acknowledgment binding

Passed personal acknowledgments bind to visit + attending technician + assignment generation. Reassignment (including tech1→tech2→tech1) invalidates reuse while preserving history. Admin/support cannot substitute a personal passed ack; they may record failed checks/observations. See [`B3_F_B3_02_ACK_BINDING.md`](./B3_F_B3_02_ACK_BINDING.md).

## F-B3-03 — Lock order

All visit start / assignment / attendance / safety / first-start ticket paths acquire **ticket → job → visit** (visits by `id`). Parent IDs peeked before locking are revalidated after locks. See [`B3_F_B3_03_LOCK_ORDER.md`](./B3_F_B3_03_LOCK_ORDER.md).

## RPCs

| RPC | Who |
|-----|-----|
| `schedule_service_job_visit` | admin/support |
| `reschedule_service_job_visit` | admin/support; `scheduled` only |
| `start_service_job_visit` | assigned technician (or admin/support on-behalf) + safety attestation |
| `record_visit_safety_check` | assigned/attending tech or admin/support |
| `complete_service_job_visit` | attending/assigned tech or admin/support |
| `abort_service_job_visit` / `record_visit_no_access` | same; reason mandatory (except authorized idempotent retry) |

B1 `create_service_job_visit` / `govern_visit_transition` remain as facades (`in_progress` uses the minimum attestation).

## Configurable routine extension (B4 — not built in B3)

Visit execution stays **generic**. Columns reserved, unused by B3 logic:

- `service_job_visits.pinned_routine_version_id`
- `service_job_visits.checklist_results`

The B3 safety gate is the **minimum start gate**, not the completed model-specific routine system. Do not hardcode repair instructions or invent technical limits. Do not ship a routine editor/scheduler in B3.

## Migrations

- `supabase/migrations/20261112180000_service_workflow_b3_visit_execution.sql` (freeze)
- `supabase/migrations/20261112190000_service_workflow_b3_visit_corrections.sql` (F-B3-01 / D-B3-01 / D-B3-02)
- `supabase/migrations/20261112194500_service_workflow_b3_safety_path_final.sql` (no implicit ack; ordinal ordering; anon grants)
- `supabase/migrations/20261112200000_service_workflow_b3_f_b3_02_ack_binding.sql` (F-B3-02 ack binding)
- `supabase/migrations/20261112201500_service_workflow_b3_f_b3_03_lock_order.sql` (F-B3-03 lock order)

Disposable battery: `scripts/service-workflow/disposable_b3_battery.sql`
