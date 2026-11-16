# Service Workflow Specification — Manual Aluminium Machines

Status: implementation-ready specification, consistency revision R2. No code or schema change is made by this document.
Audience: conventional/manual aluminium machines first (saws, copy routers, end mills, crimpers, punching/assembly aids).
Owners: Wonder (this spec) → Supervisor approval → Cursor implementation → Spart verification.

## Status & reconciliation — 2026-11-16 (documentation only; no implementation authorization)

This section is the current status of record for this specification. The original specification (§§0–13) and the historical B3 verdict are preserved unchanged below except where a line is explicitly marked superseded here. Evidence: [SERVICE_ECOSYSTEM_PROGRESS_SCORECARD.md @ 1b567cdb](https://github.com/almona02/almona-portfolio-forge/blob/1b567cdb/docs/operations/service-workflow/SERVICE_ECOSYSTEM_PROGRESS_SCORECARD.md), the staging-program closeout `CORE_SERVICE_PROGRAM_STAGING_CLOSED.md` @ `65d6ff86`, and the phase acceptance records they link.

### A. Accepted current behavior (staging; not production)

- Core loop is staging-accepted through B7 closeout: Slice 0 + machine identity, B1/B2 jobs and assignment, B3 visits, B4 technician report submission (`f63c9145`), B5 manager review/issue (`2a4042ad`), B6 acknowledgment/closure (`da2132b6`), B7 permission/audit closeout (`32750762`). Production has not been applied. FR-1 is a separate Slice 0 + share/privacy release candidate, not the B1–B7 workflow.
- Current roles are `admin`, `support`, `technician`, `customer` (plus existing platform roles). There is no squad manager role, squad entity, or squad dashboard in accepted behavior. Every “Squad mgr / SM” duty in §§1–13 maps today to `admin`/`support` as follows: triage, assignment, report review/issue, and acknowledgment-unavailable determination are `admin`/`support`; the technician executes assigned work. Future squad behavior is in §B.
- Accepted ticket behavior uses the current FSM without a stored `triaged` state. `closed` is terminal in accepted behavior; reopening is future (§B). Visit start binds the attending/assigned technician (with admin/support able to record specified safety/outcome steps under the B3 contract); visit completion does not complete the job or close the ticket.
- Acknowledgment `unavailable` (accepted B6 contract, superseding §11’s two-attempt default): recordable only by `admin`/`support`, only with attributable contact-attempt evidence — at least one issue-time notification attempt plus at least two additional distinct attempts, each with `attempted_at`, `channel`, `outcome`, and `by_actor_id`, plus a rationale. Source: `B6_ACKNOWLEDGMENT_CONTACT_POLICY.md` and `B6_ACKNOWLEDGMENT_CLOSURE_CONTRACT.md` at accepted tip `da2132b6` (staging program records). §8 item 13 and §11 are to be read with this requirement, not the earlier two-attempt wording.
- Preserved limitation (historical, bounded; not reopened): the disposable SP-05/SP-05B FAIL against frozen B3 `9882a256` stands as recorded — with JWT claims cleared, a forged `p_actor_id` was trusted by the shared actor resolver. The hosted-shaped control SP-05C passed (claims `role=anon`, forged actor denied on 10/10 RPCs) and is the anonymous-denial evidence. Later B7 records (`32750762`, `b7_coverage_matrix.md`) carry this bounded disposable FAIL as a preserved limitation, not reopened, and no later green suite is treated as a fix for it: no accepted evidence redefines the resolver fail-closed for the claims-absent case. It does not block the staging acceptance above and is not, by itself, a reason to reopen the closed program.

### B. Future target behavior (specified below, not implemented)

Squad manager role and squad dashboards/dispatch; stored `triaged` ticket state and reopening; contracts, coverage, tiers, and recurring preventive generation; spare-parts compatibility/quote/stock fulfillment end to end; expanded passport/QR/transfers; manual fault-library content; configurable routines (§13, proposal only — implementation unauthorized).

### C. Proposed defaults awaiting a decision (not accepted, not implemented)

- Routine occurrence identity (authoritative, resolving §3 vs §13): one occurrence is identified by `(contract_machine_coverage, routine_assignment, occurrence_sequence)`. `planned_due_date` is a stored attribute of the occurrence (fixed once generated), not part of its identity, so cadence/version adoption can recompute future due dates without re-keying. This definition governs if routines are implemented; §3 and §13 are aligned to it below.
- Routine applicability enforcement (resolving §13.2 vs §13.9): machine-family mismatch is a hard block (cannot assign). Model or manufacturer mismatch is warning-only and requires an explicit recorded override by Admin (today: admin/support publisher) with reason. “Inapplicable cannot be assigned” in §13.2 means family-inapplicable only.
- Manufacturer contribution/review: NOT defined in accepted behavior and NOT part of the routines first slice. Proposed default awaiting decision: manufacturers have no system role; content arrives as external documents, Admin authors/publishes, and the recorded feasibility review (today admin/support; future squad manager) is unchanged. A manufacturer reviewer/contributor role, manufacturer-scoped applicability approval, and evidence sign-off require a separate supervisor decision before any implementation.
- All other §11 defaults and §13.9 defaults remain proposals unless an acceptance record above adopts them.

## 0. Locked assumptions

- Internal machine UUID (`machine_id`) is canonical. Serial is a business identifier: `manufacturer + normalized serial`.
- `ticket_number` is the operational reference. A ticket twin/reference code never grants access. Public access only via unguessable share token with expiry.
- No fabricated telemetry, runtime, health %, or uptime for manual machines. Condition is recorded observation with source + date.
- Online first. Failed saves surface explicit errors; no silent fake success.
- Calendar maintenance first. Proposed rolling horizon: 90 days.
- Tier definition changes never rewrite existing contract coverage. Coverage is snapshotted at activation.
- One ticket may need many jobs/visits. Preventive jobs may exist without a ticket.
- One ticket-state rule (target): triage, assignment, and work start are three distinct events. Ticket `open → triaged` only on triage. Ticket `triaged → assigned` only when a job is assigned to a technician. Ticket `assigned → in_progress` only when the first visit actually starts work (safety gate passed, visit `started`). Assignment alone never starts the ticket, and starting a later/return job never re-transitions a ticket already `in_progress`. Awaiting-parts, awaiting-customer, escalated, and overdue are overlay flags, not primary ticket states.
- Slice 0 boundary (approved security/governance scope only): the existing FSM `open → assigned → in_progress → resolved → closed` is unchanged. Slice 0 adds no `triaged` state or flag, no new triage prerequisite, and no reopening — in Slice 0 `closed` is terminal and a reopen attempt is denied. Target-only items (`triaged` as a stored state, reopening) belong to the future workflow and must not be implemented or tested as Slice 0 behaviour.
- Serial is detection-first: duplicate candidates are flagged and reconciled; no hard uniqueness rejection in this phase (see §11).

## 1. Priority delivery — Journey A: Corrective service

Flow: Register machine → Ticket+attachments → Triage → Assign squad+technician → Diagnose → Request part → Approve coverage/quote → Reserve/procure → Issue+install → Functional verification → Service report → Customer acknowledgment → Closure → Passport history.

| # | Step | Actor | Persisted result |
|---|---|---|---|
| A1 | Register machine (manufacturer, model, serial raw, site, commissioning, warranty) | Customer / Admin | `machine` UUID; serial normalized copy; `identity_status=verified\|unverified\|duplicate_review`; ownership+site history row |
| A2 | Create ticket, select machine, describe symptom, attach photos/docs | Customer | Ticket `open`; attachments linked to ticket/first message; SLA clocks started; ticket ref issued |
| A3 | Triage: confirm family/system/symptom, priority, safety flag, coverage check | Squad manager | Target: ticket `open → triaged`; fault dimensions (provisional); coverage hint shown, not promised. (Future workflow only; not a Slice 0 state or prerequisite) |
| A4 | Create job(s), assign squad + technician, schedule window | Squad manager | Job `assigned`; target: ticket `triaged → assigned`; assignee history row. Ticket is not yet in progress |
| A5 | Accept, travel/remote start, safety gate, actual work start | Technician | Job `in_progress`; visit `started`; on first visit start only, ticket `assigned → in_progress`; isolation checklist recorded before work |
| A6 | Diagnose: finding, measurements, photos | Technician | Visit findings; fault `finding`+`action` coded; report draft updated |
| A7 | Request part (if needed): part, qty, urgency, compatibility check | Technician | Part request `requested`; job `awaiting_parts` if blocked |
| A8 | Verify compatibility + coverage/quote decision | Sales (parts) + Squad mgr | Fitment outcome recorded; covered → approve; not covered → quote sent |
| A9 | Customer quote decision (if chargeable) | Customer | `approved` / `rejected` persisted with timestamp + actor |
| A10 | Reserve or procure | Sales / Stock holder | Reservation with expiry, or PO/lead-time record; no negative stock |
| A11 | Issue + install; record serial/batch if applicable | Stock holder → Technician | Consumption row linked to job+machine; installed-component record |
| A12 | Functional verification + return-to-service decision | Technician (+ Squad mgr if restricted) | Verification result; decision: `returned` / `restricted` / `out_of_service` |
| A13 | Submit, review, and issue service report | Technician submits → Squad mgr reviews and issues | Report `draft → in_review → issued` (immutable when issued); corrections repeat submit→review→issue before superseding (see §5.5) |
| A14 | Customer acknowledgment (or refusal/unavailable) | Customer responds; assigned technician records visit-time absence/refusal; squad manager records report-acknowledgment contact attempts and the final `unavailable` determination | `accepted` / `refused` / `unavailable` + attempt log (actor, timestamp, channel, outcome); never blocks closure alone |
| A15 | Close ticket when all jobs resolved | Squad mgr / Admin | Ticket `closed`; passport history appended; follow-up job/ticket if defects remain |

Passport after A15 shows: machine identity, site, warranty, active coverage snapshot, every ticket/job/visit/report, installed parts, open restrictions, next preventive due. No invented health score.

## 2. Priority delivery — Role / action matrix

R=responsible (does it), A=approver, C=consulted, I=informed, `—`=denied. Backend must enforce; UI hiding is not authorization.

| Action | Admin | Squad mgr | Technician | Sales (parts) | Customer |
|---|---|---|---|---|---|
| Register / correct machine identity | R/A | C | — | — | R (own) |
| Merge duplicate machines | A | C | — | — | I |
| Create / edit own ticket | A | R | — | — | R (own) |
| Triage, prioritize, set safety flag | A | R | C | C (parts) | I |
| Assign / reassign squad + technician (incl. post-consumption handover, §7) | A | R | Accept handover | — | I |
| Accept / start / pause job | A | A | R (assigned) | — | I |
| Diagnose, measure, attach evidence | A | C | R (assigned) | C | I |
| Request part | A | A | R | C | — |
| Verify compatibility | A | C | C | R | — |
| Approve covered part/labour | A | R | — | C | — |
| Issue quote / receive quote decision | A | C | — | R | A (chargeable) |
| Receive stock (goods-in) | R | — | — | R | — |
| Reserve stock | A | A | — | R | — |
| Issue stock to job | R | A | Receive only | R | — |
| Return unused part | A | A | R (initiate) | R (receive) | — |
| Adjust stock (count/loss) | A (approves every adjustment) | — | — | R (initiates only; no adjustment takes effect without Admin approval) | — |
| Consume / install part | A | C | R | I | I |
| Submit service report / correction | A | C | R (author/submitter) | C (parts section) | I |
| Review and issue service report / correction | A | R (reviewer + issuer) | — | C | I |
| Return-to-service decision | A | A | R (propose) | — | I |
| Record customer acknowledgment response | I | C | C (records own-visit outcomes) | — | R (own) |
| Record acknowledgment unavailability + contact attempts | I | R (final determination) | R (records visit-time and own contact attempts) | — | — |
| Close ticket | R | R | Request | — | Request |
| Reopen ticket | R (future target only; disabled in Slice 0) | R (future target only; disabled in Slice 0) | — | — | Request (future target only) |
| Manage contracts / tiers / users | R | C | — | C | View own |
| View own customer-visible information (own machines, tickets, messages, reports, invoices) | R | Squad scope | Assigned only | Need-to-know | R (own records only) |
| View internal notes (`is_internal_note`) | R | Squad scope | Assigned ticket only | Need-to-know only; never by default | Never |
| View another customer's information | R (audited support access) | — (own squad's customers only where assigned) | — | — | Never |

Stock ownership rule: physical stock has exactly one accountable holder per movement (`received_by`, `reserved_by`, `issued_by`, `returned_by`, `adjusted_by`). Default holders: Admin + Sales. Technician never adjusts stock and only consumes against an issued quantity. Initially, every Sales-initiated stock adjustment requires Admin approval before it takes effect (no threshold exemption).

## 3. Journey B: Preventive service

Flow: Activate coverage → Select routines → Generate eligible squad jobs (90-day horizon) → Schedule+assign → Checklist+measurements → Report → Findings/follow-up → Retain next occurrence → Stop on suspension/cancellation/expiry.

| # | Step | Actor | Persisted result |
|---|---|---|---|
| B1 | Activate contract for 1..N machines; snapshot tier, covered services, exclusions, visit allowance, parts/labour rules, SLA clocks | Admin | Coverage rows per machine with `coverage_snapshot`; contract `active` |
| B2 | Select maintenance routine(s) per machine family (calendar interval, checklist version) | Admin / Squad mgr | Routine assignment; routine version pinned |
| B3 | Generator creates one job per maintenance occurrence whose planned due date falls in next 90 days | System | Job `scheduled` in owning squad queue, bound to a stable `occurrence_id` (see below); re-runs create zero duplicates |
| B4 | Schedule/reschedule appointment window + assign technician | Squad mgr | Job `assigned`; appointment window changes only — `occurrence_id` and planned due date never change; customer notified |
| B5 | Perform checklist, measurements, safety gate; record condition | Technician | Visit `completed`; checklist instance with routine version |
| B6 | Submit, review, and issue report (same report spec as corrective) | Technician submits → Squad mgr issues | Report `issued`; passport updated |
| B7 | Findings: none / monitor / corrective follow-up | Technician + Squad mgr | Follow-up ticket or job linked to visit; never edits the issued report |
| B8 | Retain next occurrence anchored to the planned due date (not completion or appointment date) unless the coverage snapshot explicitly says anchor=completion | System | Exactly one next occurrence when it enters horizon; a late or rescheduled occurrence does not shift, duplicate, or re-key the series |
| B9 | Suspend / cancel / expire (see §5.4 for the full rule) | Admin | Suspension pauses unstarted jobs; cancellation cancels unstarted jobs; expiry stops generation and closes unstarted occurrences past cover as expired (overdue handling in §5.2/§5.4); started visits finish or are explicitly cancelled |
| B10 | Renew | Admin | New coverage period + new snapshot; history and expired/paused occurrence history preserved |

Occurrence identity (stable; authoritative definition per Status §C): each occurrence is keyed by `occurrence_id = (contract_machine_coverage, routine_assignment, occurrence_sequence)`. `planned_due_date` is a stored attribute, fixed once the occurrence is generated, and is not part of the identity. The job carries this identity for life. Rescheduling changes only the appointment window and assignee; it never creates a new occurrence or renumbers the sequence. Completion records the actual date against the same occurrence.

Generator rules: run idempotently on the occurrence key; skip generation if contract is not `active` (suspended contracts generate nothing new), machine coverage ended, or planned due date is after `end_date`; missed/overdue occurrences stay visible as overdue, are never silently rescheduled or re-keyed, and completing late creates no catch-up duplicates.

## 4. Record responsibilities

| Record | Purpose | Key relations | Must never |
|---|---|---|---|
| Machine | Physical asset identity + passport | UUID; manufacturer+normalized serial; owner/site history | Be keyed by serial alone; show fabricated telemetry |
| Ticket | Customer problem case to resolution | machine_id, reporter, SLA, status | Be overwritten by visits; grant access via its ref code |
| Job (work order) | Planned unit of work, assigned + scheduled | ticket_id nullable, contract coverage nullable, squad, assignee, occurrence_id nullable (preventive only) | Exist only inside ticket text; preventive jobs need no ticket |
| Maintenance occurrence | Stable planned instance of a routine for one machine coverage | identity = coverage + routine_assignment + sequence (Status §C); planned_due_date stored, not key; 1:1 with its preventive job | Be re-keyed by rescheduling, late completion, suspension, resume, or version adoption |
| Visit | One actual attendance / remote session | job_id, technician, started/ended, checklist | Overwrite a prior visit; one ticket may have many visits |
| Service report | Accountable account of one visit/job outcome | visit_id, machine_id, revision chain | Be silently edited after issue |
| Contract coverage | Agreed cover for one machine in a period | contract, machine, snapshot, routine | Change when tier definition later changes |
| Part request | Need raised from diagnosis | job/visit, part, qty, urgency | Directly decrement stock |
| Reservation | Stock held for a job until expiry | part, location, qty, job | Exceed available; survive job cancellation silently |
| Consumption | Part actually installed/used | job, machine, qty, installed-component link | Exceed issued qty; returns create a return record, not a negative edit |

## 5. Lifecycle tables

Notation: Audit = event-ledger entry with actor, timestamp, before/after. Notify: C=customer, T=technician, SM=squad mgr, S=sales, A=admin.

### 5.1 Ticket (corrective)

| State | Action | Role | Prerequisite | Next | Notify | Audit |
|---|---|---|---|---|---|---|
| — | Create | C/Admin/SM | Auth; machine selected or free-text flagged unverified | open | SM queue | ticket_created |
| open | Triage (future target workflow) | SM | Fault dimensions + priority + safety flag recorded | triaged. Future target only — in Slice 0 the ticket stays `open`, with no flag or new prerequisite | T pool | triage |
| triaged | Create job + assign technician | SM | Squad + technician + window | assigned. Ticket is not in progress | T, C | assignment |
| assigned | Actual work start (first visit starts, safety gate passed) | T (assigned) | Visit `started` | in_progress — first start only; later job starts cause no ticket transition | SM | work_start |
| assigned / in_progress | Add job / return visit | SM | Reason coded | unchanged (assigned if no visit has started, else in_progress) | T | job_created |
| in_progress | Await part / quote (overlay only) | T/S | Part request or quote pending | stays in_progress + `awaiting_parts`/`awaiting_customer` flag set/cleared | S, C | flag change |
| any active | Escalate (overlay only) | System/SM | SLA breach or safety flag | stays in current state + `escalated` flag | SM, A | escalation |
| in_progress | Resolve | SM | All jobs resolved + report(s) issued | resolved | C | resolution |
| resolved | Close | SM/Admin | Report issued; ack accepted/refused/unavailable recorded | closed | C | closure |
| closed | Reopen (future target only) | SM/Admin | Rationale required | triaged, then the normal triaged → assigned → in_progress rule applies again. Disabled in Slice 0: `closed` is terminal there and a reopen attempt is denied with no state change | T, SM | reopen (target only) |
| any non-closed | Cancel | SM/Admin | Reason coded; jobs handled | cancelled | C, T | cancellation |

### 5.2 Preventive job

| State | Action | Role | Prerequisite | Next | Notify | Audit |
|---|---|---|---|---|---|---|
| — | Generate (per occurrence) | System | Active coverage; planned due in horizon; occurrence not yet generated | scheduled, bound to occurrence_id | SM queue | generated |
| scheduled | Assign / reschedule appointment | SM | Technician + window | assigned — appointment changes never alter occurrence_id or planned due date | T, C | assignment/reschedule |
| assigned | Start visit | T | Safety gate passed (non-waivable) | in_progress | — | visit_start |
| in_progress | Complete checklist | T | Required items + measurements (waivers per §8 only) | visit completed → job completed against same occurrence | SM | completion |
| completed | Follow-up | SM | Finding flagged | follow-up ticket/job created | C | follow_up |
| scheduled/assigned (unstarted) | Pause on contract suspension | System/Admin | Contract suspended | paused — occurrence retained, excluded from dispatch, appointment lapses if its window passes while paused | SM | paused |
| paused | Resume on contract resume | System/SM | Contract active again | returns to its prior primary state (`scheduled` or `assigned`) under the same occurrence, with the `overdue` overlay set if the planned due date or appointment window passed while paused; new appointment required where the window lapsed; no duplicate generated | SM, T, C | resumed |
| scheduled/assigned/paused (unstarted) | Cancel on contract cancellation (or SM reason) | SM/Admin | Contract cancelled, or reason coded | cancelled (terminal), reason-coded; reservations released | T, C | cancellation |
| unstarted at expiry | Expire | System | Contract end_date passed and occurrence planned due date is past cover, or unstarted when cover ends | expired (terminal primary state, non-completion) — visible in history, never dispatched; any `overdue` overlay it carried is retained as a historical marker, not a state | SM, C | expiry |
| scheduled/assigned/paused (any primary state) | Overdue (clock, overlay only) | System | Planned due date (or appointment window) passed and work not started | primary state unchanged + `overdue` overlay set — overdue is never a primary state, including after suspension and resume; the job remains dispatchable while the contract is active, stays `paused` + `overdue` while suspended, and on expiry the primary state becomes `expired` with the overlay retained historically | SM | overdue_flag |

### 5.3 Part request → consumption

| State | Action | Role | Prerequisite | Next | Notify | Audit |
|---|---|---|---|---|---|---|
| — | Request | T | Job active; part+qty+urgency | requested | S, SM | request |
| requested | Compatibility check | S | Fitment evidence | verified / conditional / incompatible / unknown | T, SM | compatibility |
| verified/conditional | Coverage or quote decision | SM (covered) / C (chargeable) | Coverage snapshot or quote approved | approved | S | approval |
| approved | Reserve or procure | S | Stock available or PO placed | reserved / procuring | T | reservation/PO |
| reserved | Issue | Stock holder | Reservation valid | issued | T | issue |
| issued | Install / consume | T | Qty ≤ issued | consumed (+ installed component) | SM | consumption |
| issued | Return unused | T→S | Qty + condition | returned to stock | S | return |
| any | Reject / cancel | S/SM | Reason coded | rejected / cancelled; reservation released | T, SM | decision |

### 5.4 Contract

| State | Action | Role | Prerequisite | Next | Notify | Audit |
|---|---|---|---|---|---|---|
| draft | Activate | Admin | Machines + snapshot + routines + squad | active | SM, C | activation |
| active | Suspend | Admin | Reason + effective date | suspended; generation stops; unstarted jobs pause (§5.2); visits already in progress may finish and be reported | SM, C | suspension |
| suspended | Resume | Admin | — | active; paused occurrences return to their prior primary state under the same occurrence_id, with the `overdue` overlay set where their due date/window passed while suspended (overdue remains an overlay, never a state); horizon refills with zero duplicates | SM | resume |
| active/suspended | Cancel | Admin | Reason; started jobs decided explicitly | cancelled; unstarted jobs cancelled (terminal, reason-coded); in-progress visits finish or are explicitly cancelled; reservations released | SM, C, T | cancellation |
| active | Expire (clock) | System | end_date passed | expired; generation stopped; unstarted occurrences past cover become expired (§5.2); work already in progress may finish and be reported, but no new work starts under the expired cover | SM, C | expiry |
| expired/cancelled | Renew (new period) | Admin | New snapshot | new contract/coverage active; prior history, including expired and cancelled occurrences, kept | C | renewal |

### 5.5 Report

| State | Action | Role | Prerequisite | Next | Notify | Audit |
|---|---|---|---|---|---|---|
| draft | Edit | T (assigned/author) | Visit started | draft | — | draft saves |
| draft | Submit for review | T | Non-waivable items present (§8); waivable gaps either present or waiver-requested | in_review | SM | submission |
| in_review | Return with comments | SM (reviewer) | Comment required | draft (returned; technician edits and resubmits) | T | review_return |
| in_review | Issue | SM (reviewer, not the author) | Review passed; non-waivable items verified; waivers decided and recorded | issued (immutable) — only an issued report is the current report | C | issue |
| issued | Open correction | T or SM | Reason required | correction draft linked to the issued revision; the issued revision stays current and visible | SM/T | correction_opened |
| correction draft | Submit correction for review | T | Same completeness rules as an original submission | in_review (correction) | SM | correction_submitted |
| in_review (correction) | Return correction | SM (reviewer) | Comment required | correction draft (issued revision still current) | T | correction_returned |
| in_review (correction) | Issue correction | SM (reviewer, not the author) | Review passed | new revision issued and only now supersedes the prior revision; prior revision retained and readable | C | revision_issued |
| issued (current revision) | Acknowledge | C (response); T records visit-time absence/refusal; SM records acknowledgment contact attempts and the final unavailable determination | Auth ownership for a customer response; staff attempt entries carry actor, timestamp, channel, outcome | accepted (by customer) / refused (by customer, recorded by the receiving staff actor) / unavailable (recorded by SM after the required attempts) against that revision | SM | acknowledgment + attempt log |

## 6. Screen requirements

Every screen must implement: loading skeleton, empty state with next action, failed-save banner with retry (no fake success), unauthorized state (403 explanation, no data leak), overdue highlighting (SLA/due/window).

### Admin
- Dashboard: fleet, contracts expiring ≤30d, SLA breaches, stock alerts, audit feed. Decisions: approve merges, tier/routine versions, and every Sales-initiated stock adjustment.
- Machine detail (passport editor): identity + confidence, owner/site history, coverage, open restrictions. Detail must show data provenance and dates.
- Contract editor: machines picker, snapshot preview, routines, squad, SLA clocks (response/attendance/resolution, business hours, pause rules).

### Squad manager
- Dashboard: squad queue (unassigned, overdue, escalated, awaiting parts/customer), workload per technician, preventive due in 7/30d. Decisions: triage, assign/reassign, approve covered parts, review reports, escalate.
- Job detail: ticket context, fault dimensions, visit timeline, part requests, report review actions. Empty queue state offers preventive horizon view, not a blank page.

### Technician
- Dashboard: my jobs today/overdue, safety flags first. Decisions: accept, start, request part, submit report. No stock adjustment, no other squads' jobs.
- Job/visit screen: safety gate, symptom→finding pickers, measurements with units, photo evidence, labour/travel time, verification + return-to-service proposal. The technician submits; the squad manager reviews and issues. Failed uploads queue visibly. Only waivable evidence gaps may be SM-waived under §8; a failed safety gate, missing technician declaration, or missing verification can never be waived into a completed/returned outcome (the job instead stays blocked or closes as restricted/out-of-service).

### Spare-parts sales
- Dashboard: part requests awaiting compatibility, quotes awaiting customer, reservations expiring, procurement lead times, own stock adjustments pending Admin approval. Decisions: fitment outcome, quote, reserve/procure, issue, receive returns, initiate stock adjustments (each requires Admin approval before taking effect).
- Part detail: catalog data, fitments (verified/conditional/incompatible/unknown + evidence + approver), stock by location, supersession conditions.

### Customer
- Dashboard: my machines, open tickets, upcoming preventive windows, reports to acknowledge. Decisions: create ticket, approve/reject quote, acknowledge report, confirm visit window.
- Passport view (own records only): identity, warranty, coverage summary, full service history, installed parts, restrictions, next due. Customers can view all of their own customer-visible information (own machines, tickets, non-internal messages, reports, invoices). Prohibited at all times: internal notes (`is_internal_note`), staff-only fields, any other customer's information, and fabricated health figures.

## 7. Exception decisions

| Exception | Decision rule | Persisted outcome |
|---|---|---|
| No available technician | Job stays in squad queue flagged `unassigned_overdue`; SM may cross-assign with reason | Queue age + cross-assign audit |
| Reassignment (including after consumption) | Allowed SM/Admin at any stage, including after parts consumption, only as an audited handover: reason, outgoing/incoming technician, handover checklist of work done, open items, and machine state. Prior visits, findings, consumed parts, and report drafts stay attributed to the original technician and are never reassigned or rewritten. Issued-but-unconsumed parts transfer custody to the incoming technician or are returned first; the incoming technician must accept the handover before starting new work under a new visit | Handover record + assignee history; custody transfer/return rows; prior tech and SM notified; passport and report authorship unchanged for prior work |
| Part unavailable | Offer procure (lead time) or approved alternative fitment; job `awaiting_parts` | PO/alternative linked; SLA pause rule applied |
| Compatibility unknown | Never auto-approve; route to Sales verification; manual confirmation recorded with named approver | Fitment `unknown` + evidence request |
| Quote rejected | Job pauses; SM decides: re-quote, customer self-supply (warranty note), or close job as declined | Declined reason; ticket stays open for SM decision |
| Partial delivery | Consume delivered qty only; remainder stays reserved/procuring | Split consumption + open balance |
| Return visit needed | Create new job+visit under same ticket; prior report untouched | Linked job chain |
| Customer absent / refusal (visit) | The assigned technician who attended records `absent`/`refused` with timestamp, channel/method, and evidence of the attempt; SM reschedules per policy; visit counts per contract rules | Visit outcome coded by named actor; no fake completion |
| Customer refuses / unreachable for report ack | The staff actor receiving a refusal records it with note and timestamp. For unreachability, the assigned technician records visit-time attempts and the squad manager records follow-up contact attempts and makes the final `unavailable` determination after the required number of attempts (§11); closure is then allowed by SM with reason | Ack state + attempt log (actor, timestamp, channel, outcome) persisted, never blank |
| Unsafe machine | Stop-work: safety gate fails → job `blocked_safety`, machine restriction `out_of_service` until cleared by authorized decision. This is non-waivable (§8): no waiver, review, or customer acknowledgment can convert it into a successful completion or `returned` decision | Restriction on passport; escalation to SM/Admin |
| Cancellation (ticket/job) | Reason coded; reservations auto-released; issued parts require return or consumption decision. Contract cancellation additionally cancels unstarted preventive jobs (§5.2); contract suspension never cancels them, it pauses them | Release events audited |
| Reopening | Future target only: closed → triaged with rationale, then the normal triaged → assigned → in_progress rule; SLA restarts per policy flag (new clocks recorded, old preserved). Disabled in Slice 0 — closed is terminal and a reopen attempt is denied with no state change | Reopen event + clock history (target only; Slice 0 records only the denied attempt) |
| Expired coverage at job time | Job flagged `coverage_expired`; work proceeds only as chargeable quote or Admin exception with approver named | Exception audit; no silent free cover |
| Duplicate serial / machine | Detection only in this phase (no hard rejection): the registration or ticket proceeds against an `unverified`/flagged machine, the candidate duplicate enters the reconciliation queue, and any later merge preserves all history. A hard uniqueness constraint is a separate later migration decision (§11) | Duplicate-review entry; merge audit when reconciled |
| Failed save / upload | Explicit error + retry; record stays in prior state; no success toast without persisted confirmation | Error surfaced; draft retained locally only as draft |

## 8. Service-report specification

Completeness rule — there is no blanket waiver. Every requirement below is classified:

- Non-waivable (must be present and truthful before a successful completion can be submitted, reviewed, or issued): items 1 (identity/refs), 3 (diagnosis), 9 (safety checks, guard refit, and functional verification), 10 (return-to-service decision), 12 (technician declaration), and truthful parts consumption in item 6. A failed safety gate can never be waived into `completed` or `returned`; the only permitted outcomes are to fix and re-verify, or to close the work as `restricted`/`out_of_service` with that decision recorded. A missing technician declaration can never be waived; the named technician must declare.
- Waivable by SM only, with the waiver recorded (`waived_by`, reason, timestamp, visible in the issued report): specific non-critical photos/documents in item 8, individual non-critical measurements in item 5 recorded as `na` with rationale, non-critical checklist lines in item 4, and labour/travel detail in item 7 where an estimate basis is stated. Customer acknowledgment (item 13) is never waived; it is recorded as accepted, refused, or unavailable.
- Issue is blocked while any non-waivable item is missing or failed, or any waivable gap has neither content nor a recorded SM waiver.

Required sections:

1. Header: machine (UUID, manufacturer, model, serial), site, ticket/job/visit refs, technician, dates, report number + revision.
2. Complaint + observed condition (customer words kept separate from technician observation).
3. Diagnosis: fault dimensions (family/system/component/symptom/finding/action) + narrative.
4. Work performed + checklist instance (routine version for preventive).
5. Measurements: name, value, unit, tolerance source reference (document id, not invented numbers), before/after, pass/fail/na.
6. Parts: requested / issued / consumed / returned quantities; installed component + position; old part disposition.
7. Labour + travel time; coverage applied or quote ref.
8. Evidence: photos/documents linked; failed uploads resolved, or the specific non-critical item SM-waived with the waiver shown in the report.
9. Safety (non-waivable): isolation checks performed, guards refitted, functional verification steps + result. A failed or missing safety item blocks any `completed`/`returned` outcome (see the completeness rule above).
10. Return-to-service decision: `returned` / `restricted (conditions stated)` / `out_of_service`, decided by, timestamp. Distinct from customer acknowledgment.
11. Remaining defects + recommended follow-up (creates linked job/ticket when accepted by SM).
12. Technician declaration (non-waivable: signed identity + timestamp of the named technician). SM review outcome recorded separately by the reviewing squad manager.
13. Customer acknowledgment: `accepted` / `refused (note)` / `unavailable (attempts recorded)` — absence never blocks issue; it is recorded, never waived. Recording actors: the assigned technician records visit-time absence/refusal and own contact attempts; the squad manager records follow-up attempts and the final `unavailable` determination. Every attempt entry carries actor, timestamp, channel, and outcome.

Issued reports are immutable. Corrections follow the same route as an original: technician opens a correction draft with a reason, submits it, and a squad manager (not the author) reviews and issues it. The prior revision remains the current, customer-visible report until the correction is issued; only then does revision N+1 supersede it, with all revisions retained and readable.

## 9. Manual-machine fault structure

Dimensions (all coded, multi-select where noted): Machine family → System → Component → Symptom → Finding → Action.
Families: single-head saw, double-head saw, copy router, end mill, crimper, other-manual.
Systems: mechanical, alignment, calibration, pneumatic, bearing/drive, belts/transmission, electrical, guarding/safety, general.
Components (examples, extensible): blade, spindle, bearing, belt, clamp, valve, regulator, fence/stop, scale/encoder-free readout, switch, motor, guard, e-stop.
Symptoms (observed, start here): vibration, inaccurate cut, angle error, air leak, clamp slip, failure to start, tripping, unusual noise, burr/poor finish.
Findings (diagnosed): misalignment, wear, looseness, incorrect pressure, contamination, incorrect setting, damaged component.
Actions: observe/monitor, adjust, calibrate, clean/lubricate, repair, replace, escalate, restrict use, out of service.

Rules:
- Guidance content is structured data with `review_status=draft|reviewed|approved`, reviewer, source document, version. Only `approved` content is shown as instruction.
- No manufacturer tolerances, pressures, torques, or hazardous repair steps are invented in this spec. Content slots reference manufacturer documents by id; unfilled slots show “refer to manufacturer documentation”.
- Safety actions require task-specific isolation checklist + qualified-role check before the job can start; failure blocks start (Section 7, unsafe machine).
- Every completed diagnosis records symptom + finding + action, feeding passport history and parts linkage (finding may suggest parts, never auto-orders).

## 10. Acceptance scenarios (testable)

Format: Actor / Starting conditions / Action / Expected persisted result.

1. Customer / machine verified / creates ticket with 2 photos / ticket `open`, attachments linked, SLA set, passport lists ticket.
2. Customer / other customer's machine id / attempts ticket create / denied 403, no ticket row.
3. SM / ticket open (future target workflow) / triages, then creates a job and assigns squad+technician, then the technician starts the first visit / after triage the ticket is `triaged` and the job exists; after assignment the ticket is `assigned` and is not in progress; only after the first visit actually starts does the ticket become `in_progress`; notifications + audit rows exist at each step.
4. Technician / job assigned to another tech / attempts start / denied; job unchanged.
5. Technician / assigned job, safety gate failed / attempts start work / blocked, `blocked_safety` + machine restriction recorded.
6. Technician / in-progress job / requests part with unknown fitment / request `requested`, fitment `unknown`, no reservation created.
7. Sales / fitment verified, stock 1, two jobs request qty 1 concurrently / reserves / exactly one reservation succeeds; other sees unavailable.
8. Customer / chargeable quote pending / rejects quote / job paused `declined`, reservation none, SM task created.
9. Stock holder / reservation issued qty 2, tech installs 1 returns 1 / consumption=1, return=1, stock restored by return record only.
10. Technician + SM / report complete; technician submits and SM (not the author) reviews and issues; later a correction is opened / revision 1 is issued and immutable and stays the current report while the correction is drafted, submitted, and returned once with comments; only when SM issues the correction does revision 2 supersede revision 1; both revisions remain readable.
11. Customer + staff / report issued, customer refuses ack; separately, a second customer is unreachable / the receiving staff actor records the refusal with note and timestamp and SM closes that ticket with reason; for the unreachable customer, the technician's visit-time attempts and the SM's follow-up attempts are logged (actor, timestamp, channel, outcome), SM records the final `unavailable` determination, and only then may SM close; passport shows refusal/unavailable with its attempt log.
12. System + SM / active coverage, occurrence planned due in 90d / generator runs twice, then SM reschedules the appointment twice / exactly one job bound to one stable occurrence_id; re-runs and reschedules create zero new occurrences and never change the planned due date.
13. System + Admin / contract with unstarted jobs is suspended, then resumed after a due date has passed, and (separately) a second contract is cancelled / on suspend: zero new jobs generated and unstarted jobs are `paused`, not cancelled (a job whose due date passes while paused also carries the `overdue` overlay while staying `paused`); on resume: the same occurrences return to their prior primary state under the same occurrence_id, the past-due one keeping the `overdue` overlay (never becoming an `overdue` state) with a new appointment, no duplicates; on cancel: unstarted jobs are `cancelled` (terminal, reason-coded) and reservations released.
14. System / contract expired yesterday; one unstarted occurrence carried the `overdue` overlay before expiry, another was due past the end_date / completion of already-started work is recorded; the unstarted occurrence's primary state becomes `expired` (its `overdue` overlay retained only as history) and it is never dispatched, and no next occurrence is generated beyond end_date.
15. SM / closed ticket (future target workflow only) / reopens with rationale / ticket `triaged`; it reaches `in_progress` again only through a new assignment and an actual first-visit start of the reopened work; reopen audit + new SLA clocks, old clocks preserved. (Slice 0 behaviour for the same attempt is specified only in §10A, scenario S0-5.)
16. Anon / valid share token / opens shared ticket / sees minimized DTO only: no internal notes, no PII; expired token denied.
17. Technician / offline/failed save simulated by server error / submits report / explicit failure shown, report remains `draft`, no success state.
18. Sales / partial delivery 1 of 2 / records receipt / consumption allowed for 1; balance remains `procuring`.
19. SM + Technicians / job in progress, one part already consumed by Tech A, one issued part unconsumed / SM reassigns to Tech B through the handover flow / handover record with reason, checklist, and custody transfer for the unconsumed part; Tech A's visit, consumption, and report draft remain attributed to Tech A; Tech B accepts and works under a new visit.
20. Technician + SM / visit done but safety verification failed, technician declaration present / technician requests, and SM attempts, waiver into a completed report / both blocked; the report cannot issue as completed/`returned`; permitted outcomes are re-verify after fixing, or issue recording `restricted`/`out_of_service`. Separately, a missing non-critical photo with a recorded SM waiver (approver, reason, timestamp, shown in the report) does not block issue.
21. SM / technician report lacks the technician declaration / SM attempts to issue / issue is denied and the report stays `in_review` until the named technician declares; no waiver path exists.
22. Customer + Admin / a machine is registered with a manufacturer+serial that matches an existing machine / registration proceeds in this phase (no hard uniqueness rejection), the candidate is flagged `duplicate_review` and queued for reconciliation; a later Admin-approved merge preserves all tickets, visits, and reports from both records.

## 10A. Slice 0 acceptance (dedicated — security/governance only)

Scope reminder: Slice 0 covers only the approved security/governance slice (§0). It adds no `triaged` state or flag, no new triage prerequisite, no jobs/visits/reports workflows, and no reopening. The scenarios in §10 are future target-workflow acceptance and must not be used as Slice 0 pass criteria. Format as in §10.

- S0-1. Anon / valid, unexpired share token / opens shared ticket / minimized DTO only: customer-visible ticket fields, no internal notes (`is_internal_note`), no contact PII, no staff-only fields; access is audited.
- S0-2. Anon / expired or revoked share token / opens shared ticket / denied; no ticket data returned.
- S0-3. Customer / owns ticket A, another customer owns ticket B / views A, then attempts B by direct id / A is fully visible (own customer-visible information, excluding internal notes); B is denied with no data leak and no ticket row exposed.
- S0-4. Technician / ticket assigned to another technician, and a second ticket assigned to them / attempts an invalid transition (e.g. `assigned → open`, direct `open → in_progress`, or any status write bypassing governance) / denied; both tickets unchanged; the permitted governed transition on their own ticket succeeds with an audit event.
- S0-5. SM or Admin / ticket `closed` / attempts to reopen / denied; ticket stays `closed` with no state change (reopening disabled in Slice 0; the denied attempt may be audited).
- S0-6. Admin or SM / bulk assignment over a set of tickets including one outside their scope or in a state that forbids assignment / runs bulk assign / each in-scope, FSM-valid ticket is assigned through governance with its own audit event; the invalid ticket is unchanged and reported per-id; no ticket is mutated by a direct bulk update.
- S0-7. Customer / authenticated, no staff role / opens the technician dashboard route / denied (403/redirect with no technician data); an assigned technician opening the same route succeeds.
- S0-8. Staff / ticket containing an internal note and a customer reply / customer views the ticket, then an anon share view is opened / the customer sees their own messages and ticket but never the internal note; the share view shows neither the internal note nor PII (consistent with S0-1/S0-3).

## 11. Unresolved business decisions (recommend defaults)

| Decision | Recommended default | Alternative consequence |
|---|---|---|
| Serial uniqueness (deferred) | This phase: detection + reconciliation only — flag candidates on (manufacturer, normalized serial), queue for review, never hard-reject. Hard uniqueness (scoped per manufacturer) is a later migration decision after the duplicate backlog is measured and merged | Enforcing now would block legitimate registrations, multi-brand serial collisions, and missing-plate machines |
| Missing serial plate | Allow `unverified` machine with site+photo identity; verify later | Blocking registration loses service cases |
| SLA clocks | Separate response / attendance / resolution; business-hours calendar per contract; pause in `awaiting_customer`/`awaiting_parts` only if snapshot says so | Single clock misreports field performance |
| Preventive anchor | Next occurrence planned from the prior occurrence's planned due date (occurrence sequence), never from appointment or completion dates | Completion/appointment anchoring drifts and re-keys the series after late or rescheduled visits |
| Visit allowance overage | Extra visits become chargeable quote flow | Unlimited visits erode contract margin |
| Ack absence limit | SUPERSEDED by the accepted B6 contract (Status §A): `unavailable` only by `admin`/`support` with ≥3 attributable attempts (1 issue-time notification + 2 additional distinct attempts, each with attempted_at/channel/outcome/by_actor_id) plus rationale; closure then allowed. This row’s earlier 2-attempt/SM default is retained for history only and must not be implemented | Implementing the superseded default would contradict the accepted B6 contract |
| Reservation expiry | 7 days, auto-release with notice | Long holds starve stock |
| Restricted-use authority | SM confirms technician proposal; Admin for safety restrictions | Uncontrolled restrictions or unsafe returns |
| Stock adjustment approval | Initially every Sales-initiated adjustment requires Admin approval before it takes effect (no threshold exemption); any threshold relaxation is a later decision | Unapproved adjustments would allow shrinkage without control |
| Public share lifetime | 7 days, revocable, minimized DTO | Long-lived links leak case data |

Active handoff (2026-11-16): The Slice 0 → B7 staging program is closed. Current references are the staging-closeout records and the scorecard linked in “Status & reconciliation” above (`CORE_SERVICE_PROGRAM_STAGING_CLOSED.md`, `SERVICE_ECOSYSTEM_PROGRESS_SCORECARD.md`, FR-1 release-candidate packet). There is no active “begin Slice 0/B3” instruction: no merge, no production apply, and no routines implementation is authorized by this document. Future work starts only from a new supervisor authorization naming its scope. (Historical handoff, superseded: Cursor was to implement Slice 0 against §0/§5–§7/§10A with Spark acceptance from §10A — completed and preserved in the change log.)

## 12. Change log

- 2026-11-16 reconciliation (documentation only): Added “Status & reconciliation” (accepted current / future target / proposed defaults) with acceptance-record links; current-role mapping (admin/support/technician, no squad manager); triage/reopening marked future against the accepted FSM; §11 acknowledgment default superseded by the accepted B6 contract (≥3 attributable attempts, admin/support only) citing `da2132b6`; one authoritative routine occurrence identity (Status §C) aligned in §3/§4/§13; family-hard-block vs model/manufacturer-warning applicability clarified; manufacturer contribution/review flagged as an undecided proposal (no manufacturer role); active handoff replaced with staging-closeout references (historical handoff retained in-line as superseded); routines kept as a proposal with first-slice scenarios 1–8 mapped to RA-1–RA-10 in §13.10 (excluded marked deferred). Historical B3 verdict and §§0–13 otherwise preserved.
- R2 Addendum A: Configurable service routines added as §13 (concepts, configurable fields, requirement classes, authoring/pinning/change-impact, execution binding, permissions, screens, RA-1–RA-10 acceptance, defaults). No existing section changed in substance.
- R2 (this revision; cleanup only, no new scope): Slice 0 reopening fixed as disabled with `closed` terminal and all `triaged`-flag/prerequisite language removed from Slice 0 (§0, §1 A3, §2, §5.1, §7, §10 scenario 15). Customer visibility split into own customer-visible information vs prohibited internal notes and other-customer information (§2, §6, §10A S0-3/S0-8). Admin approval required for every Sales stock adjustment initially (§2, §6, §11). Staff actors for recording customer unavailability and contact attempts named — assigned technician and squad manager (§1 A14, §2, §5.5, §7, §8 item 13, §10 scenario 11, §11). Overdue kept as an overlay in all primary states, including paused/resumed/expired handling (§5.2, §5.4, §10 scenarios 13–14). Dedicated Slice 0 acceptance added as §10A (S0-1–S0-8), separate from the future-workflow scenarios in §10.
- R1: Target-state consistency for ticket states, suspension vs cancellation, report submit/review/issue and corrections, stable occurrence identity, waivable vs non-waivable report items, detection-first serial handling, and post-consumption handover.
- R0: Initial specification (journeys, role matrix, record responsibilities, lifecycles, screens, exceptions, report, fault structure, acceptance scenarios, decisions).

## 13. Addendum A — Configurable service routines

Scope: preventive-maintenance routine definitions for manual aluminium machines. This addendum configures *what* is done and *how often*; it does not change §3 occurrence identity, §5 lifecycles, §8 waivers, or Slice 0 (§10A). No tolerances, pressures, or hazardous steps are defined here — measurement limits reference manufacturer documents by id (§9 rule).

### 13.1 Concepts

| Concept | Meaning | Mutability |
|---|---|---|
| Routine template | Reusable maintenance definition (e.g. quarterly saw inspection) with a stable code | Code never reused after retirement |
| Routine version | Immutable published snapshot of a template: cadence, checklist, measurements, rules | Never edited after publish; changes create version N+1 |
| Checklist item | One executable step in a version: type, requirement class, evidence, finding mapping | Fixed within a version |
| Measurement definition | Named reading: unit, before/after, optional limit with mandatory tolerance-source document ref | A limit without a source ref cannot be published |
| Coverage routine assignment | Link from one machine coverage to a routine, pinning one version + cadence anchor | Version pinned at activation (§13.4) |

### 13.2 What is configurable

- Identity: code, name (EN/AR), description, status (draft/in_review/published/retired), owner.
- Applicability: machine families (saw, copy router, end mill, crimper, other-manual), optional systems/models/manufacturers. Enforcement per Status §C: family-inapplicable routines cannot be assigned (hard block); model/manufacturer mismatch is warning-only with a recorded Admin override and reason. Manufacturer applicability data may be referenced, but no manufacturer contributor/reviewer role exists unless separately decided (Status §C).
- Cadence (calendar only in this phase): interval value + unit (days/weeks/months), anchor = coverage start or prior planned due date (§11 default), earliest/latest window in days, estimated duration, default squad, required skill/qualification.
- Checklist sections and items. Item types: `safety_gate`, `inspection` (pass/fail/na), `measurement`, `photo_evidence`, `task` (done/not-done), `note`. Each item carries: instruction text or manufacturer-doc reference, requirement class (§13.3), evidence required (none/photo/measurement), and an optional finding mapping (system/component/finding/action from §9) plus follow-up trigger (`none`, `monitor`, `create_follow_up`).
- Suggested consumables/parts: informational only. Execution may raise a part request (§5.3); a routine never reserves, orders, or consumes stock.
- Report mapping: which items and measurements appear in the §8 report, and which findings require a follow-up job/ticket proposal for SM decision.

### 13.3 Requirement classes (inherits §8, no new waivers)

- `safety_gate` items are non-waivable. A fail blocks work start or successful completion exactly as in §7/§8.
- `required` items must be completed, or recorded `na` with rationale where the item allows it.
- `optional` items may be skipped; the skip is recorded.
- SM waiver applies only where §8 already permits it (specific non-critical evidence/measurements). Configuring an item can never make a safety gate, the technician declaration, or functional verification waivable.

### 13.4 Authoring, pinning, and change impact

Authoring lifecycle: `draft → in_review → published → retired`. Admin authors; a squad manager reviews operational feasibility; the publisher is never the sole author without a recorded review. Published versions are immutable. Retired versions cannot be newly assigned but remain readable on every job that used them.

Pinning rule: activation pins `routine_version` on the coverage assignment (§3 B2). Publishing version N+1 never alters an active coverage, a generated job, or an occurrence. Adopting N+1 for an active coverage is an explicit SM/Admin action that takes effect from the next *ungenerated* occurrence only; already-generated jobs keep the pinned version, or are cancelled and reissued under the same occurrence identity with the change audited (never silently edited).

| Change | Draft coverages | Active coverages | Generated jobs | In-progress visits |
|---|---|---|---|---|
| Edit a draft version | Uses latest draft | No effect | No effect | No effect |
| Publish version N+1 | May select N+1 | No effect until explicitly adopted | No effect | No effect |
| Adopt N+1 on a coverage | n/a | Applies from next ungenerated occurrence | Unchanged (pinned version) | Unchanged |
| Change cadence via adoption | n/a | Future planned due dates recomputed from the occurrence sequence; past occurrences untouched | Ungenerated only | Unchanged |
| Retire a version | Cannot select | Existing pins keep working | Unchanged | Unchanged |

Occurrence stability (§3/§5.2, identity per Status §C): `occurrence_id` keys on `(contract_machine_coverage, routine_assignment, occurrence_sequence)` — not on the routine version and not on `planned_due_date` (a stored attribute). A version adoption therefore never re-keys, renumbers, or duplicates an occurrence; the job records which version it executed.

### 13.5 Execution binding

A generated job carries a read-only snapshot reference: routine code, pinned version, checklist items, and measurement definitions. Technicians execute that snapshot (§6 job/visit screen); mid-visit configuration edits are impossible by construction. Findings recorded against items feed the §8 report (sections 3–5) and, where the item's follow-up trigger fires, propose a follow-up that only an SM decision creates (§3 B7). Measurements without a configured limit are recorded as values with `pass/fail = na`; the system never invents a tolerance judgement.

### 13.6 Configuration permissions

| Action | Admin | Squad mgr | Technician | Sales | Customer |
|---|---|---|---|---|---|
| Author/edit draft routine | R | C | — | — | — |
| Review for publish | A | R (feasibility) | — | C (consumables) | — |
| Publish / retire version | R | C | — | — | — |
| Assign/pin to coverage; adopt new version | R | R | — | — | I |
| Execute checklist | — | — | R (assigned job) | — | — |
| View routine summary/schedule | R | R | Assigned jobs | — | Own machines only |

### 13.7 Screens (additions to §6)

- Routine library (Admin): searchable by code/family/system/status; shows current published version, pin count, retirement state. Empty state offers template creation; retired items are visibly marked, never hidden from history.
- Routine editor (Admin): section/item builder with requirement class, evidence, finding mapping, and measurement source refs. Publish is blocked with itemised errors (missing safety section, limit without source, interval ≤ 0, duplicate code). A read-only preview renders exactly what a technician will see.
- Coverage assignment (Admin/SM in contract editor): applicability-filtered picker showing pinned version, cadence, and — on adoption — a diff summary between pinned and candidate versions before confirmation.
- Job/visit (Technician, per §6): checklist grouped by section, safety gates first, measurement inputs with unit and source-ref display, follow-up flags surfaced to SM. Configuration itself is never editable here.

### 13.8 Acceptance scenarios (addendum; future workflow, not Slice 0)

Format as in §10.

- RA-1. Admin / draft routine with a measurement limit but no tolerance-source ref / attempts publish / publish denied with the item identified; version stays `draft`.
- RA-2. Admin / routine with no safety-gate item / attempts publish / publish denied; adding a safety gate and recorded SM feasibility review allows publish as version 1.
- RA-3. SM / active coverage pinned to version 1 with two generated jobs / Admin publishes version 2 / both generated jobs and the coverage still execute version 1; nothing is silently changed.
- RA-4. SM / coverage from RA-3 / adopts version 2 / adoption applies from the next ungenerated occurrence; prior occurrences keep their identity, sequence, and version; no duplicate occurrence is created.
- RA-5. Technician / job pinned to a version whose safety-gate item fails / attempts to complete the visit / blocked as in §8; SM cannot waive the gate; outcome is fix-and-re-verify or `restricted`/`out_of_service`.
- RA-6. Technician / job with a measurement that has no configured limit / records the value / report shows value + unit with `na` judgement; no tolerance verdict is fabricated.
- RA-7. Technician / completes an item mapped to `create_follow_up` with a defect finding / submits report / a follow-up proposal is visible to SM; no follow-up job exists until SM creates it.
- RA-8. Admin / routine version pinned by an active coverage / retires the version / existing jobs still display and execute the retired version read-only; the version cannot be pinned to a new coverage.
- RA-9. Sales or Customer / routine library / attempts to edit, publish, or assign a routine / denied; Customer sees only own machines' routine summaries and schedule.
- RA-10. System / coverage adopted to a new cadence (RA-4) / generator runs twice / future occurrences follow the new cadence from the sequence anchor, past occurrences unchanged, zero duplicates.

### 13.9 Addendum decisions (defaults; no scope beyond this addendum)

| Decision | Default |
|---|---|
| Who may publish | Admin, after a recorded SM feasibility review |
| Cadence units | Calendar only (days/weeks/months); usage-based triggers deferred until a credible reading source exists |
| Version adoption | Explicit per coverage, from the next ungenerated occurrence; never automatic |
| Routine-level parts | Suggestions only; stock flow always via §5.3 |
| Applicability enforcement | Hard block on inapplicable family; warning only on model-level mismatch |

### 13.10 First-slice scenario mapping (routines remain a proposal; implementation unauthorized)

Mapping of the eight first-slice proposal scenarios (`SERVICE_ROUTINES_FIRST_SLICE_PROPOSAL.md`, staging program records) to §13.8. Excluded means deferred to the routines implementation slice, not covered by §13.8.

| First-slice scenario | §13.8 mapping | Status |
|---|---|---|
| 1. Publish V1, draft locked, stable id | RA-1 (tolerance-source publish block), RA-2 (safety-gate publish block) | Covered (publish integrity) |
| 2. Catalog model applicability / no default for unrelated model | No RA covers catalog-model default suggestion | Deferred (excluded) |
| 3. Pin version on a visit; unpin policy | RA-3/RA-4 cover coverage pinning/adoption, not visit pin/unpin | Deferred (excluded) |
| 4. Submit with pin requires matching checklist results | RA-7 only (follow-up proposal on submit) | Deferred (excluded) |
| 5. Submit without pin unchanged; results must be NULL | No RA | Deferred (excluded) |
| 6. Version skew (results cite V2, pin is V1) denied | No RA | Deferred (excluded) |
| 7. Visibility: no unpublished content to customer/share | RA-9 in part (customer routine visibility) | Partially covered; draft-payload share case deferred |
| 8. Authz: unrelated tech cannot submit; no forged attending identity | RA-9 in part (Sales/Customer denied) | Partially covered; unrelated-technician checklist case deferred |




