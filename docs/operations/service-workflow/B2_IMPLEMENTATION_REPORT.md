# B2 implementation report — job assignment

**Status:** Implemented on draft PR #156. **Local/disposable verification only.**  
**Depends on:** B1 accepted at `7a8307395b79df677a96f77cd993a77351b5805c`  
**Migration:** `supabase/migrations/20261111220000_service_workflow_b2_assignment.sql`  
**Contract:** [`B2_ASSIGNMENT_CONTRACT.md`](./B2_ASSIGNMENT_CONTRACT.md)  
**B2 freeze SHA:** `8f2acc4e806e70e12e87a24dcbebaef78e63e085`

**No staging/production apply. No merge. No B3+.**

## Ticket vs job (implemented)

- Ticket assignee = case contact via existing `govern_ticket_assign` (unchanged for jobless tickets; never silently moves job technicians).
- Job technician = `service_jobs.assigned_technician_id` via `assign_service_job` / `ensure_default_service_job` / `decline_service_job`.
- Opt-in Job 1 only (`ensure_default_service_job`); no blanket activation or Job 1 backfill.

## RPCs

| RPC | Role |
|-----|------|
| `ensure_default_service_job` | Idempotent Job 1 create (+ optional assign); ticket `FOR UPDATE` |
| `assign_service_job` | Assign/reassign; history + audit; deny in-progress visit |
| `decline_service_job` | Assigned technician only; mandatory reason → `unassigned` |

History table: `service_job_assignment_history` (append-only) + `service_workflow_audit`.

## UI

**Freeze `8f2acc4e`:** `TicketAssignmentDialog` opt-in checkbox **Start service workflow (Job 1)** — ticket assign then `ensure_default_service_job` (two RPCs; see `B2_OPTIN_TRANSACTION_BOUNDARY.md`).

**Correction (post-freeze):** `ServiceJobAssignmentPanel` in ticket details + technician workspace:

1. List all jobs with independent assignees/states  
2. Admin/support create additional jobs and assign/reassign  
3. Technician decline own eligible jobs (mandatory reason)  
4. Clear errors for active-visit + authorization failures  
5. Ticket case contact shown independently of job technicians  
6. Mutations refresh job list; repeated submits call RPCs again (DB idempotent where applicable)

No squads / visit execution / report / closure UI (B3+).

## Disposable results (Cursor supporting)

Harness: `python scripts/service-workflow/run_disposable_b1.py` (applies B1+B2, B1 full battery + B2 battery).

| Suite | Result |
|-------|--------|
| SQL | **59 PASS / 0 FAIL / 0 SKIP / 5 DEFER** (50 B1-full + 9 B2) |
| K1–K4 | PASS (B1 regressions) |
| K5 | PASS (concurrent ensure → one Job 1) |

B2 checks: B2S1, B2S2, B2A1, B2A2, B2D1, B2D2, B2R1, B2T1, B2L1.

## Spark handoff

Verify the B2 freeze tip of `feat/service-workflow-b1-planning` (this series). Keep #155 at `ca9f5067`. #156 stays draft. Independent battery must keep B1 green including W2–W4 / X5 / X6 / positive J1.
