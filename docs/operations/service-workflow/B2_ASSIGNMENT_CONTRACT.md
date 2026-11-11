# B2 assignment contract — ticket vs job

**Status:** Authorized for implementation + disposable testing only.  
**Depends on:** B1 accepted at `7a8307395b79df677a96f77cd993a77351b5805c`  
**Out of scope:** squads, visit execution UI, reports, closure UI, staging/production apply, merge.

## Ticket assignee vs job technician

| Concept | Meaning |
|---------|---------|
| **Ticket assignee** (`service_tickets.assigned_to`) | Case-level contact (who owns the ticket conversation / customer-facing case). Set via existing `govern_ticket_assign`. |
| **Job accountable technician** (`service_jobs.assigned_technician_id`) | Field worker accountable for that job’s visits/reports. Set via B2 job assignment RPCs only. |

Rules:

1. **First workflow assignment** MAY atomically create **Job 1** and assign its technician when staff explicitly enter the service workflow (opt-in). This activates `workflow_activated_at` via existing B1 create-job semantics.
2. **Later ticket reassignment** updates only the ticket case contact. It MUST NOT silently reassign existing jobs’ technicians.
3. **Job assignment / reassignment** updates only the named job. It MUST NOT grant the technician access to unrelated jobs on the ticket, nor to private/draft reports belonging to other jobs (B1 RLS remains authoritative).
4. **Additional jobs** are created with `create_service_job` (B1) and assigned independently; they remain independent of Job 1 and of the ticket assignee.
5. **Decline** is technician-only on **their own** assigned job, reason mandatory; returns job to `unassigned`, clears job technician, preserves ticket assignee and assignment history.
6. **Reassignment** is denied while the job has a visit in `in_progress`.
7. Assignment changes + workflow audit MUST commit atomically (same transaction); failure rolls both back.

## Legacy compatibility

| Ticket class | Behavior |
|--------------|----------|
| **Jobless / not activated** (`workflow_activated_at IS NULL`) | Existing ticket assign/transition/resolve/close paths unchanged. No automatic Job 1 backfill. |
| **Workflow-activated** (`workflow_activated_at IS NOT NULL`) | B1 gates apply. Full lifecycle (visits→reports→ack→close) is **not** complete until B3–B6; staff must not treat B2 alone as closure-ready. |

No blanket activation of existing tickets.

## RPCs (B2)

| RPC | Who | Behavior |
|-----|-----|----------|
| `ensure_default_service_job` | admin/support | Idempotent Job 1 create (+ optional assign). Concurrent/repeated calls → one Job 1. |
| `assign_service_job` | admin/support | Assign/reassign job technician; history + audit; deny if visit in progress. |
| `decline_service_job` | assigned technician | Own job only; reason mandatory; → `unassigned`. |

Ticket case assignment remains `govern_ticket_assign` (unchanged semantics for jobless tickets; no silent job reassignment).

## UI (minimal)

Reuse existing assignment dialog patterns (`TicketAssignmentDialog` / shared Select). Add an explicit opt-in to create/assign Job 1 when entering the workflow. No squads, visit execution, reports, or closure UI in B2.

## Required disposable tests (B2)

- Concurrent/repeated first assignment → one default job  
- Additional jobs independent  
- Unauthorized assign + forged actor denied  
- Decline scoped to authorized job; ticket/history preserved  
- Reassignment preserves prior attribution; rejects active visit  
- Assignment + audit roll back together on failure  
- B1 guards + legacy ticket regressions remain green  
