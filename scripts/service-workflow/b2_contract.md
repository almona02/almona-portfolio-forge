# B2 acceptance battery — agreed contract (frozen implementation 8f2acc4e)

Spec: `docs/service-workflow-spec.md` §2 (B2), §3–§5. Supervisor resolutions
(5 contract points) applied. B1 49-pass suite is the preserved regression
baseline and runs unchanged in the same battery. No staging/production work.

## Agreed B2 contract

RPCs (SECURITY DEFINER, Slice 0 governed pattern), confirmed against
`supabase/migrations/20261111220000_service_workflow_b2_assignment.sql`
at `8f2acc4e`:
- `assign_service_job(p_job_id uuid, p_technician_id uuid,
  p_rationale text DEFAULT NULL, p_actor_id uuid DEFAULT NULL)`
  — first assignment AND reassignment in one RPC. NULL tech → 22023.
- `decline_service_job(p_job_id uuid, p_reason text,
  p_actor_id uuid DEFAULT NULL)` — assigned-technician-only decline of own
  job → `unassigned`, assignee cleared. Reason mandatory (22023).
- `ensure_default_service_job(p_ticket_id uuid,
  p_technician_id uuid DEFAULT NULL, p_title text DEFAULT 'Job 1',
  p_rationale text DEFAULT NULL, p_actor_id uuid DEFAULT NULL)`
  — idempotent Job 1 create (+ optional assign). Concurrent-safe via
  ticket `FOR UPDATE`.
- History: `service_job_assignment_history(job_id, ticket_id,
  action ∈ {assign,reassign,decline}, from_technician_id, to_technician_id,
  actor_id, rationale, created_at)`; every assign/reassign/decline also
  writes one `service_workflow_audit` row (`job_assign`/`job_reassign`/
  `job_decline`). Same-tech re-assign = no-op, zero writes.
- `reassign_service_job` fallback name retained in the battery but not
  present in the freeze; all reassign calls go through `assign_service_job`.

Error shape (Slice 0 reuse): authz denials `42501`, illegal operations
`check_violation`; missing mandatory reason `22023`; missing rows `P0002`.

Agreed interpretations (supervisor-resolved; replace the earlier proposal):
1. Assignment auto-moves `unassigned`→`planned` only; otherwise state
   untouched. Decline always resets to `unassigned`.
2. Decline DENIED while any visit is `in_progress` (check_violation);
   visits untouched; assignee remains. Scheduled visits do not block.
   Terminal jobs (completed/waived/cancelled) deny decline; unassigned
   jobs deny decline (42501 owner-match). Reason mandatory.
3. Reassign denied ONLY while a visit is `in_progress`; scheduled visits
   allow reassign; terminal visits allow again; terminal jobs deny.
   Same-tech re-assign = idempotent no-op success.
4. Decline is assigned-technician-only: support/admin/customer/sales/anon
   and other techs denied (42501). Support reassigns instead of declining.
5. B2 agency = own-decline ONLY. Technicians are denied ALL job-FSM
   transitions (42501), including on own assigned jobs. Visit/job
   execution walks belong to B3.
6. Authorship lives in `service_job_assignment_history` (actor + rationale
   per action) plus one audit row per change; no `assigned_by` columns on
   `service_jobs`. History is client-append-only (REVOKE + no-write
   policies) and SELECT-scoped to staff + involved parties.
7. Read model = B1 `can_read_ticket_workflow` (verified held post-B2):
   ticket owner reads own tickets' jobs; assigned technicians read jobs on
   tickets where they hold an assignment (spec §2 "read", pre-satisfied by
   B1); staff read all; cross-customer reads denied. Tested by S13.
8. Ticket/job assignment fully independent both directions; assignment ops
   never touch activation, ticket status, or ticket assignee.
9. Opt-in entry (`ensure_default_service_job`): atomic create+assign+
   activation+audit; failures (bad tech, missing/terminal ticket, denied
   role) are traceless; retries return the same Job 1 with zero new rows.

## B2 check inventory (required; SKIP blocks B2 acceptance)

- `S1` first assignment (assignee + planned auto-move + history + audit).
- `S2` same-tech re-assign idempotent (success, audit ≤ +1).
- `S3` reassign tech1→tech2 (history + audit chain).
- `S4` scheduled-visit reassign allowed; in_progress denied; terminal-visit
  allowed again.
- `S5` reassign denied on terminal jobs.
- `S6` own-job decline → unassigned; reason mandatory.
- `S7` decline denied: other's, unassigned, customer/sales/support/anon.
- `S8` decline DENIED with in_progress visit; visit + assignee intact.
- `S9` assign permissions: customer/sales/tech/anon denied, admin allowed,
  forged actor denied (assign + decline).
- `S10` multiple independent jobs (decline/reassign isolated per job).
- `S11` history chain assign→reassign→decline (actors/rationales) + audit.
- `S12` ticket/job assignment separation both directions + activation intact.
- `S13` visibility boundaries (tech-own visible, others/customer invisible,
  support all).
- `S14` tech job-FSM transitions denied (own/others/unassigned); staff
  control succeeds.
- `S15` atomic audit/history rollback on failed assign/decline/reassign.
- `S16` B1 objects preserved + B2 objects present + FSM walk intact.
- `S17` ensure atomicity: bad-tech / missing-ticket failures traceless.
- `S18` ensure idempotent retry: same Job 1, zero new rows on retry.
- `S19` ensure fenced: customer/tech/sales/anon/forged denied; closed/
  cancelled tickets rejected tracelessly.
- `S20` history append-only for clients; scoped reads (involved/tech,
  none/customer, all/staff).
- `K5` same-tech concurrent assign idempotent; `K6` different-tech
  concurrent assign serialized (last-wins, truthful history); `K7`
  concurrent ensure yields exactly one Job 1.
- `S21` opt-in transaction boundary: failed ticket-assign persists nothing;
  assign-OK + ensure-FAIL persists the ticket assignment only; dialog-retry
  (assign again + ensure) recovers to exactly one Job 1.
- `S22` scheduled visits block neither reassign nor decline; visit rows keep
  their attending snapshot; post-reassign visits stamp the new assignee;
  every move stays history-chained.

DEFER stays B3–B7 only (S14 is an active deny-check, not a deferral).
Runner reports `B1 BASELINE:` and `B2:` lines separately; exit 0 requires
zero FAIL and zero required-SKIP in both (DEFER excluded).

## Reconciliation (8f2acc4e reports)

Transaction boundary (S21 proves each row):

| Step fails | Persists | Does NOT persist |
|---|---|---|
| `govern_ticket_assign` (e.g. forged actor 42501) | nothing | assignee, status change, audit |
| `assignTicket` OK, `ensure_default_service_job` fails (e.g. bad tech 22023) | ticket `assigned_to` + status + one `ticket_governance_audit` row | job, activation, workflow-audit, history |
| retry: assign again (same assignee OK) + `ensure` OK | one Job 1 (seq 1, planned, tech), activation, audit + history | second Job 1 (retry returns the same id) |

So "atomic opt-in" holds WITHIN `ensure_default_service_job` (one RPC =
one transaction: create + assign + activation + audit commit or roll back
together), while the dialog flow is a TWO-RPC recoverable partial outcome
(assign, then ensure, in separate transactions). Both wordings describe the
same boundary at different levels; S21 + U4/U5 pin it.

Actor/time attribution (exact storage; per supervisor ruling, field names
are not mandatory — the attribution is):

| Requirement | Storage |
|---|---|
| who assigned/reassigned/declined | `service_job_assignment_history.actor_id` + `service_workflow_audit.actor_id` on the `job_assign`/`job_reassign`/`job_decline` row |
| when | `service_job_assignment_history.created_at` + audit `created_at` |
| from → to | `service_job_assignment_history.from_technician_id` / `.to_technician_id` (+ audit details jsonb) |
| why | `service_job_assignment_history.rationale` (+ audit rationale) |

No `assigned_by`/`assigned_at` columns exist on `service_jobs`; the history
table (client append-only, S20) plus audit carry the full chain (S1/S3/S11).
Cursor's alignment note predicting S1/S11 SKIP is superseded: attribution
verified PASS via history.

Scheduled-visit rule (S4 + S22): scheduled visits never block reassignment
or decline merely for being scheduled; `in_progress` visits block both
(check_violation). Reassignment never rewrites visit rows: earlier visits
keep their `attending_technician_id` snapshot, later visits stamp the
current assignee at creation, and the history chain explains every move.

Read-model correction (S13): B1's `service_jobs` SELECT policy was never
staff-only; it is `admin_private.can_read_ticket_workflow` (owner +
ticket-assignee + staff + assigned-technician). Cursor's alignment note
claiming "B1 staff-only SELECT remains" is factually superseded; S13
measures the real tuple (own/other/owner-own/cross-customer/staff).
