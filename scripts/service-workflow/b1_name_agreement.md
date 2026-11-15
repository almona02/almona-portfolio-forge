# B1 name agreement request (Spark → Cursor) — confirm BEFORE implementing

Date: 2026-11-11. B1 implementation is authorized locally/disposably.
Spark's acceptance battery is frozen at `scripts/service-workflow/` and gates
on the names below. To avoid divergence: either adopt them verbatim, or reply
with a complete mapping (old → new) that Spark pastes into the battery's
alignment block before Cursor's frozen commit. Do not implement first and
rename later — signature drift FAILs as `42883 contract signature mismatch`.

Canonical battery sources (Spark workspace):
- `scripts/service-workflow/b1_contract.md` (acceptance rule + inventory)
- `scripts/service-workflow/disposable_b1_base.sql`
- `scripts/service-workflow/disposable_b1_battery.sql`
- `scripts/service-workflow/run_disposable_b1.py`
- Run: `python scripts/service-workflow/run_disposable_b1.py` (own PG17
  cluster :55442, stopped/removed after; never touches remotes)

## Proposed names (adopt or map 1:1)

Tables: `service_jobs`, `service_visits`, `service_reports`,
`service_report_revisions`, `service_report_reviews`,
`service_acknowledgments`, `service_workflow_audit`.

RPCs:
- `create_service_job(p_ticket_id, p_title, p_required=true, p_rationale)`
- `govern_job_transition(p_job_id, p_to_state, p_rationale, p_actor_id=NULL)`
- `create_service_visit(p_job_id, p_rationale, p_actor_id=NULL)`
- `govern_visit_transition(p_visit_id, p_to_state, p_rationale, p_actor_id=NULL)`
- `waive_service_job(p_job_id, p_reason, p_actor_id=NULL)`
- Later (battery DEFERs, do not build in B1): `submit_service_report`,
  `review_service_report`, `record_acknowledgment`, `reschedule_service_visit`.

States: job `unassigned|planned|in_progress|awaiting_review|completed|
cancelled|waived`; visit `scheduled|in_progress|completed|aborted|no_access`.
Error shape: authz `42501`, illegal transition `check_violation` (23514),
missing mandatory reason any error (battery-tolerant).

## Open alignment points (need Cursor's answer)

1. State column `state` vs `status` on jobs/visits (battery reads either).
2. `create_service_visit` scheduled-window args (battery calls 3-arg; window
   handling is the known gap — confirm or extend the proposal).
3. `create_service_job` actor semantics: battery assumes caller-identity via
   `auth.uid()` with no actor param (mirrors the ticket 4-arg form).
4. B1 audit table columns: battery needs an actor column
   (`actor_id`|`actor`|`actor_uid`), a timestamp column, and the transition
   facts (from/to/reason/role) discoverable in the row.
5. Revision/review/ack fixture columns: battery fills NOT NULL columns by
   type and FKs from parents. `state`-style columns with NOT NULL and no
   default plus CHECK literals break generic fixtures — either DEFAULT them
   or supply the valid literals here.
6. Technician job-transition agency at B1: battery pins DENY pre-assignment
   (B2 grants scoped agency). Confirm or correct.
7. `cancelled → waived` as the manager conversion path (battery interpretation).
8. Fail-closed resolve/close gate with unsatisfied jobs present, naming the
   job (B1 carries the gate; B6 refines per-report prerequisites). Confirm
   the gate lives in/around `govern_ticket_transition` (or name its locus).

## B1 acceptance rule (enforced by the runner)

Zero FAIL and zero required-SKIP across SQL + concurrency; DEFER excluded.
Exit 2 with `B1 BLOCKED: N required checks SKIP` until B1 lands.
Spark independently verifies the frozen result disposably. No remote apply.
