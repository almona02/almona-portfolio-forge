# Service Workflow Specification — Ticket → Job → Visit → Report

**Status:** Complete specification for review. **No implementation authorization is granted by this document.** Cursor owns implementation; this document changes no code and no schema.
**Version:** 1.0
**Builds on:** Slice 0 / R2 ticket governance — canonical ticket FSM (`open → assigned → in_progress → {awaiting_parts, awaiting_customer} → resolved → closed`; `closed`/`cancelled` terminal), current roles (`customer`, `admin`, `support`, `technician`, `sales_rep`), governed assignment (only `admin`/`support` may assign), and the recorded Journey A14–A15 policy that customer acknowledgment may be accepted, refused, or unavailable and must not alone block closure.
**Companion:** [Machine identity specification](machine-identity-spec.md) (tickets link to machines by identity; this workflow cites the machine, it does not redefine it).

Normative words follow RFC 2119 usage: **MUST** is required, **SHOULD** is a strong default, **MAY** is optional.

---

## 1. Purpose and scope

Define the bounded service-execution workflow that turns a customer ticket into completed, reviewed, acknowledged field work:

`Ticket → Service Job → Visit → Service Report (revisions) → Manager Review/Issue → Customer Acknowledgment → Ticket Closure`

### 1.1 Minimum working slice (in scope)

- Multiple service jobs per ticket, with the initial interface creating one job by default.
- Multiple visits per job.
- Assignment with current roles only.
- Technician findings, labour, evidence, verification outcome, and report submission.
- Manager review and issue, with immutable report revisions.
- Customer acknowledgment (accepted / refused / unavailable).
- Closure prerequisites evaluated across **all** required jobs, plus exception handling.

### 1.2 Explicitly out of scope (later work, Section 9)

Squads and multi-technician crews, contracts/SLA/billing, parts ordering and fulfillment, diagnostic content and repair instructions, customer e-signature beyond acknowledgment, offline visit capture, and reopening a closed ticket (which still requires a ticket-FSM change).

### 1.3 Principles

1. **Ticket is the customer contract; jobs are internal work.** The ticket FSM is unchanged. Jobs, visits, and reports have their own states and roll up into ticket transitions only through the governed paths in Section 7.
2. **History is immutable.** Reports are revised by appending revisions, reviews and acknowledgments are append-only records, and no submitted artifact is edited in place.
3. **Observations, not instructions.** Findings record what the technician observed and did. This workflow MUST NOT embed diagnostic decision trees or prescribe technical repair instructions.
4. **Closure is earned across the whole ticket.** A ticket closes only when every required job is satisfied (Section 7), not when the first job finishes.
5. **Operational rules stay reversible.** Rules marked *operational* (for example one active visit per job) are enforced in service logic and can be relaxed without redesigning the data model.

---

## 2. Relationships and data model

```text
Service Ticket (existing service_tickets, FSM owner)
  └── 1 ──< Service Job            (multiple jobs per ticket)
          ├── required flag        (required jobs gate ticket closure)
          └── 1 ──< Visit          (multiple visits per job)
                  └── 1 ──1 Service Report per completed visit
                          └── 1 ──< Report Revision (immutable, numbered)
                                  └── 1 ──< Manager Review (per revision)
                                  └── 0 ──1 Customer Acknowledgment (per issued report)
```

Cardinality rules:

- **Ticket → Job: one-to-many.** The data model MUST support multiple jobs per ticket from the start (for example, separate diagnostic, repair, and verification jobs, or work split across machines/specialisms). The initial interface creates **Job 1 by default** at first assignment as a convenience; staff may add further jobs before closure. No uniqueness constraint may enforce one job per ticket.
- **Job → Visit: one-to-many.** Repeat attendance (return with parts, verification visit, no-access retry) is modeled as additional visits, never by editing a completed visit.
- **Visit → Report: one-to-one per completed visit.** A completed visit has exactly one report; aborted/no-access visits record an outcome and reason and MAY carry a short report.
- **Report → Revision: one-to-many.** Revision 1 is the initial submission. Every manager return requires a new revision; prior revisions are immutable and remain readable.
- **Job completion** is governed by the job's **latest approved report** across its visits (Section 6), not by any single visit.
- **One active visit per job is an operational rule, not a data assumption.** The model permits multiple in-progress visits per job; the service layer SHOULD enforce at most one active visit per job in the minimum slice. Relaxing this rule later (parallel technicians) MUST NOT require a data-model change.

Jobs on one ticket are independent: each has its own assignee, visits, and reports. Jobs MAY be worked in any order and in parallel unless staff record an explicit dependency note (free text in this slice; structured job dependencies are later work).

---

## 3. Minimum required fields

Only fields required for the minimum slice are listed. Implementations MUST NOT require later-scope fields (contract, parts SKUs, diagnostic codes) to complete this workflow.

### 3.1 Service job

| Field | Required | Notes |
| --- | --- | --- |
| Ticket reference | Yes | Parent ticket; immutable after creation. |
| Job sequence | Yes | System-assigned order within the ticket (Job 1, 2, …) for display; carries no execution-order meaning. |
| Title / work summary | Yes | Short human description of this job's work. |
| Required flag | Yes | Default `true`. Required jobs gate ticket closure (Section 7); optional jobs (for example advisory inspection) do not. Changing this flag is manager-only and audited. |
| Assigned technician | Yes, to start work | One accountable technician (Section 4). Unassigned jobs cannot start a visit. |
| Job state | Yes | Section 5.1. |
| Created by / at | Yes | Actor and timestamp; audited. |
| Machine reference | No | Inherited from the ticket's machine link where present; a job MAY cite a different machine only with a recorded reason. |

### 3.2 Visit

| Field | Required | Notes |
| --- | --- | --- |
| Job reference | Yes | Parent job; immutable. |
| Scheduled window | Yes, to schedule | Planned start/end; rescheduling appends a change record, it does not rewrite history silently. |
| Attending technician | Yes | Defaults to the job assignee; a substitute requires manager action and audit. |
| Actual arrival / departure | On completion | Recorded at visit start/end. |
| Visit state | Yes | Section 5.2. |
| Outcome reason | Conditional | Mandatory for `aborted` and `no_access` outcomes. |

### 3.3 Service report and revision

| Field | Required | Notes |
| --- | --- | --- |
| Visit reference + revision number | Yes | Revision 1 at first submission; increments per resubmission. Immutable once submitted. |
| Findings | Yes | Free-text observations: what was found and what was done. MUST NOT be structured as diagnostic or repair instructions in this slice. |
| Labour entries | Yes (≥1 to submit, explicit "no labour" allowed) | Each entry: technician, start, end or duration, activity type (for example travel, on-site work, verification). |
| Evidence attachments | No, encouraged | Photos/files reusing ticket-attachment storage; each with uploader and timestamp. Evidence is linked, never embedded in findings text. |
| Verification outcome | Yes | One of `verified_fixed`, `not_reproduced`, `further_work_required`, `not_verified` (with mandatory reason). Records the technician's verification observation only. |
| Parts note | No | Free-text observation (for example parts observed as needed or used, as reported by the technician). No SKU, stock, or fulfillment semantics in this slice. |
| Follow-up recommendation | No | Free text; creating follow-up work requires a new job or visit (Section 6), never an automatic side effect. |
| Submitted by / at | Yes | The visiting technician; system timestamp. |

### 3.4 Manager review

| Field | Required | Notes |
| --- | --- | --- |
| Report revision reference | Yes | Reviews attach to an exact revision, never to "the report" loosely. |
| Reviewer | Yes | `admin` or `support` (Section 4); never the report's author. |
| Decision | Yes | `approved_issued` or `returned` (Section 6). |
| Comments | Conditional | Mandatory on `returned`; the technician's resubmission brief. |
| Decided at | Yes | System timestamp. Append-only. |

### 3.5 Customer acknowledgment

| Field | Required | Notes |
| --- | --- | --- |
| Issued report reference | Yes | The revision that was issued to the customer. |
| Response | Yes | `accepted`, `refused` (comment mandatory), or `unavailable` (staff-recorded, Section 7.3). |
| Responded by / at | Yes | Customer user, or staff recording `unavailable` with the attempt evidence. Append-only; a later response supersedes by addition, never by editing. |

---

## 4. Assignment and permissions (current roles only)

Assignment reuses the approved R2 governance: only `admin`/`support` may assign, assignment actions go through the governed, audited path, and the existing partial-failure behavior for bulk operations is preserved.

| Action | Customer | Admin / Support | Technician | Sales rep |
| --- | --- | --- | --- | --- |
| Create ticket (existing) | Own | Yes | Yes | Yes |
| Create additional job on a ticket | No | Yes | No | No |
| Assign / reassign a job | No | Yes | No | No |
| Accept work (start visit) | No | On behalf, audited | Own jobs only | No |
| Decline assigned job | No | — | Own jobs, reason mandatory | No |
| Schedule / reschedule visit | No | Yes | Own jobs (propose; manager confirms change) | No |
| Submit report revision | No | No | Visit's technician only | No |
| Review / issue report | No | Yes, never own-authored | No | No |
| Acknowledge issued report | Own tickets only | Record `unavailable` only | No | No |
| Waive a required job | No | Yes, reason mandatory | No | No |
| Close ticket | No | Yes, when Section 7 passes | No | No |

Rules:

- **One accountable technician per job** in this slice. The job assignee is the default attending technician for its visits.
- **Decline** returns the job to `unassigned` with the technician's reason visible to assigners; it never deletes the job and never changes the ticket FSM directly (mirrors the existing technician-decline pattern).
- **Reassignment** is audited with before/after assignee. A job with a visit in progress cannot be reassigned until that visit ends or is aborted.
- **Visibility.** Customers see their ticket, its jobs' plain-language progress, issued reports, and acknowledgment actions. Draft reports, returned-review comments, labour detail, and other customers' data are never customer-visible. Technicians see jobs assigned to them (and, for continuity, prior reports on the same ticket). Sales reps have no job/visit/report access in this slice.

### 4.1 Future squad support (separate, later)

Squads — named multi-technician crews with lead/helper roles, squad queues, and shared visit attendance — are a **later, separately specified** capability. This slice MUST NOT pre-build squad tables, squad fields, or multi-attendee visits as dormant features. When squads are specified, they extend assignment (a job's accountable party becomes a squad with a named lead) without changing the job/visit/report model above.

---

## 5. States

### 5.1 Job states

`unassigned → planned → in_progress → awaiting_review → completed`, with `cancelled` reachable from any non-terminal state (reason mandatory) and `waived` reachable only by manager action on a required job (reason mandatory, Section 7.2). `completed` and `waived` satisfy a required job; `cancelled` does not unless a manager converts it to `waived` with a reason.

- A job enters `in_progress` when its first visit starts.
- A job enters `awaiting_review` when a visit report is submitted and no visit is active.
- A job returns to `in_progress` when a report is returned and a new visit or revision is started.

### 5.2 Visit states

`scheduled → in_progress → completed`, with `aborted` (reason mandatory) and `no_access` (reason mandatory) as terminal outcomes. A completed visit MUST have a submitted report before the job can leave `awaiting_review`. Rescheduling a `scheduled` visit appends a schedule-change record; terminal visits are never rescheduled — a new visit is created.

### 5.3 Report states (derived, not stored loosely)

A report revision is `submitted` on creation, then exactly one review decides it: `approved_issued` or `returned`. A report (per visit) is *current* at its highest revision. There is no editable draft state visible to anyone except the author before first submission; autosaved drafts, if offered, are private to the author and are not acceptance artifacts.

---

## 6. Report submission, manager review, and issue

1. **Submission.** The visiting technician submits revision 1 with findings, labour, verification outcome, optional evidence and parts note (Section 3.3). Submission is atomic: a report missing a required field cannot be submitted, and a submitted revision can never be edited.
2. **Review.** A manager (`admin`/`support`, never the author) reviews the exact revision:
   - **Approve and issue** (`approved_issued`): the revision becomes the issued report, visible to the customer, and open to acknowledgment. If its verification outcome is `further_work_required`, approval completes this visit's report but the job MUST NOT complete — a follow-up visit or new job is created explicitly by staff.
   - **Return** (`returned`, comments mandatory): the revision stays immutable and readable by its author and managers. The technician responds with a **new revision** of the same visit's report or, where the return requires re-attendance, a new visit with its own report. The job returns to `in_progress`.
3. **Job completion.** A job completes when: its latest visit report is `approved_issued`, that report's verification outcome is not `further_work_required`, and no visit on the job is active or scheduled. Completion is recorded with the completing report reference.
4. **Issue integrity.** Issuing never alters the revision's content. Corrections after issue require a new revision and a new review; the customer sees the newly issued revision with its number, and prior issued revisions remain in history.

---

## 7. Ticket closure: prerequisites and exceptions

### 7.1 Closure prerequisites (all must hold)

Ticket closure continues through the existing governed FSM (`resolved → closed`, staff-executed). The service workflow adds these prerequisites, checked and displayed by name before closure is allowed:

1. **Every required job is satisfied** — state `completed` or `waived` (Section 5.1). Optional jobs never block closure, whatever their state; their state at closure is recorded. Adding a new required job to a `resolved` ticket returns the ticket to `in_progress` through the governed FSM (it does not silently reopen a `closed` ticket).
2. **No open work:** no job has an active or scheduled visit, and no report revision is awaiting review on any job of the ticket.
3. **Latest reports issued:** each completed job's completing report is `approved_issued`.
4. **Acknowledgment settled per issued final report:** `accepted`, `refused` with a recorded manager disposition, or `unavailable` per Section 7.3. Acknowledgment state alone — including a refusal without disposition — is the only acknowledgment-related blocker; per Journey A14–A15, acknowledgment never *forces* closure either.
5. **Resolution summary** present on the ticket, and the ticket is in `resolved` via the governed path (job completion across all required jobs is what permits `in_progress → resolved`; a ticket with unsatisfied required jobs cannot be resolved through this workflow).

Each failed prerequisite is reported by name ("Job 2 awaiting review", "acknowledgment outstanding on Report V1-R2") — never as a generic "cannot close."

### 7.2 Exception handling

| Exception | Handling |
| --- | --- |
| `no_access` / aborted visit | Job stays open; staff schedule a new visit. Ticket and other jobs are unaffected. Repeated no-access (threshold set by operations) escalates to a manager, who may waive the job or cancel the ticket with a reason. |
| Technician decline / reassignment mid-job | Completed visits and reports stand. The job returns to `unassigned`/`planned` under a new assignee; history shows both assignees. |
| Report repeatedly returned | No revision limit is hard-coded. Managers see the full revision chain; escalation (senior review, new assignee, new job) is a human decision, always audited. |
| Required job no longer needed | Manager waives it (`waived`, reason mandatory). Waiving is visible on the ticket and in audit; it is never a silent deletion or a flag flip by the assignee. |
| Customer refuses acknowledgment | Closure waits only for a manager disposition (accept the refusal and close, or create follow-up work). Refusal never auto-closes, auto-reopens, or deletes the report. |
| Customer unavailable | Section 7.3. Closure may proceed; unavailability is displayed honestly, not converted to acceptance. |
| Emergency / out-of-hours closure need | An `admin` may close from `resolved` with a mandatory reason **only if** prerequisites 1–3 and 5 hold. Acknowledgment may be settled as `unavailable` under Section 7.3. No exception skips unsatisfied required jobs — they must first be completed, waived, or the ticket cancelled with a reason. |
| Ticket cancelled with open jobs | Cancelling the ticket (governed FSM, reason mandatory) cancels all non-terminal jobs and visits in the same action, each stamped with the ticket-cancellation reason. Completed reports and audit remain readable. |

### 7.3 Customer unavailable for acknowledgment

Staff record `unavailable` only after documented contact attempts (at minimum: notification on issue plus two attempts over at least 7 days, channels logged). The record names the attempts; the customer may still acknowledge later, which appends a superseding response. `unavailable` is never back-converted silently and never displayed to the customer as acceptance.

---

## 8. Audit requirements

Every creation, assignment change, state transition, submission, review, issue, acknowledgment (including `unavailable` attempts), waiver, and closure-prerequisite override records: actor, role, timestamp, before/after state, and mandatory reason where this specification requires one. Submitted report revisions, reviews, and acknowledgments are immutable records; corrections are always new records. Audit history survives ticket closure and cancellation and is readable by `admin`/`support`, with customers seeing only their own issued-report and acknowledgment history.

---

## 9. Later scope (explicitly separated)

| Later capability | Why it is separate | Extension point reserved |
| --- | --- | --- |
| Squads / multi-technician crews | Changes assignment semantics and visit attendance | Job assignee becomes a squad with a named lead (Section 4.1); job/visit/report model unchanged. |
| Contracts, SLA entitlements, billing | Commercial rules, not field workflow | Labour entries already capture technician + time as neutral facts. |
| Parts fulfillment (SKU, stock, ordering, delivery) | Inventory system, not a report field | Parts note stays free text until a parts specification supersedes it. |
| Diagnostic content / repair guidance | Safety-reviewed content program; this workflow records observations only | Findings stay free text; no diagnostic fields are added here. |
| Multi-visit parallel attendance | Operational-rule relaxation | One-active-visit (Section 2) is service-enforced, not a data constraint. |
| Reopen closed ticket | Requires ticket-FSM + RPC change | Out of scope; governed-FSM work only. |

---

## 10. Testable acceptance scenarios

Each scenario is pass/fail observable without reference to internals.

- **S1 — Default single job.** First assignment of a ticket creates Job 1 automatically; the ticket shows one job. Staff then add Job 2 to the same ticket; both jobs exist independently. (Proves multi-job support with a one-job-default interface.)
- **S2 — Happy path, one job.** Technician starts a visit, submits findings, two labour entries, one evidence photo, and `verified_fixed`. Visit completes; job enters `awaiting_review`. Manager approves and issues; customer acknowledges `accepted`; ticket resolves and closes with all prerequisites shown satisfied.
- **S3 — Multi-job closure gate.** Ticket has required Job 1 (completed) and required Job 2 (in progress). Closure is refused naming Job 2. Job 2 completes; closure succeeds. An optional Job 3 left in progress does not block closure, and its state is recorded at closure.
- **S4 — Immutable revision.** Manager returns Report V1-R1 with comments. R1 is byte-identical afterward; the technician submits R2; the manager approves R2. The customer sees R2 as issued, with R1 visible in staff history only.
- **S5 — Multiple visits.** Visit 1 ends `no_access` with a reason. Visit 2 is created, completed, and reported. The job completes on Visit 2's approved report; both visits and their outcomes remain in history.
- **S6 — Further work required.** An approved report carries `further_work_required`. The job does not complete. Staff explicitly create a follow-up visit (or new job); no job or visit is created automatically by the approval itself.
- **S7 — Refusal with disposition.** Customer refuses acknowledgment with a comment. Closure is refused naming the missing disposition. A manager records a disposition; closure then succeeds. The refusal record is unchanged.
- **S8 — Unavailable customer.** After the documented attempts, staff record `unavailable` with the attempt log. Closure succeeds; the record still shows `unavailable`, never `accepted`. A late customer acknowledgment appends and supersedes.
- **S9 — Permission boundaries.** A non-assigned technician cannot submit on another's visit; a customer cannot read a draft report, a returned review comment, or another customer's ticket; a technician cannot review any report; the report author cannot review their own revision. Each denial is explicit.
- **S10 — Waiver and cancellation.** A manager waives a required job with a reason; closure proceeds and the waiver is visible. Separately, cancelling a ticket cancels its open jobs/visits with the same reason stamped, and completed reports remain readable.
- **S11 — Named closure failures.** With a revision awaiting review, closure is refused naming that revision; with a scheduled visit outstanding, closure is refused naming that visit. No refusal is a generic error.
- **S12 — Audit completeness.** Every transition in S1–S11 appears in the audit trail with actor, role, timestamp, and required reasons. No submitted revision, review, or acknowledgment can be edited after creation (attempted edits are denied).

---

## 11. Dependency-ordered backlog (for Cursor)

Small, sequential units. Each unit is independently reviewable; later units do not start until their dependencies are accepted. **This backlog is not implementation authorization.**

| Order | Unit | Depends on | Definition of done |
| --- | --- | --- | --- |
| B1 | Data contract and state guards: job/visit/report/revision/review/acknowledgment entities, state machines (Section 5), server-side transition validation reusing the governed-RPC pattern | — | Disposable-database battery proves legal/illegal transitions, multi-job per ticket, and revision immutability. |
| B2 | Assignment: Job 1 auto-creation on first assign, additional-job creation, assign/reassign/decline with audit | B1 | S1 and decline/reassign halves of S10 pass; no ticket-FSM change. |
| B3 | Visit execution: scheduling, start/complete/abort/no-access, one-active-visit operational rule in service logic | B1–B2 | S5 passes; rule proven removable without data change (documented, not necessarily demonstrated live). |
| B4 | Report submission: findings, labour, evidence links, verification outcomes, atomic submit | B3 | S2 submission half passes; incomplete reports cannot submit. |
| B5 | Manager review and issue: approve/return, immutable revisions, job completion rule | B4 | S4 and S6 pass; author-review and edit-after-submit denials proven. |
| B6 | Acknowledgment and closure gate: customer responses, unavailable path, multi-job prerequisites with named failures | B5 | S3, S7, S8, S11 pass across required/optional/waived jobs. |
| B7 | Permissions and audit hardening: role matrix (Section 4), visibility rules, full audit trail | B1–B6 | S9 and S12 pass; existing Slice 0 ticket-governance regression suite still passes. |

Highest risk is B1: if job states and ticket transitions can drift, every later unit inherits it. B1 therefore carries the first battery tests, including "adding a required job to a resolved ticket" and "closure across mixed required/optional/waived jobs."




