# Proposal — service coverage & recurring maintenance (planning only)

**Status:** Committed proposal · **not** authorized for implementation, migrations, staging/production apply, merge, or FR-1  
**Depends on (reuse, do not reopen):**  
Lane A authoring · Lane B job pins · Lane C checklist execution · journey-close `JC-PASS-BOUNDED` ([`JOURNEY_CLOSE_STAGING_ACCEPTANCE.md`](./JOURNEY_CLOSE_STAGING_ACCEPTANCE.md)) · accepted B1–B7 ticket→job→visit→report→issue→ack→close path  
**Routine specification reuse:** Spec Status §C occurrence identity + §13 pinning/adoption/cadence defaults in [`SERVICE_WORKFLOW_SPECIFICATION_MANUAL_MACHINES.md`](../../specs/SERVICE_WORKFLOW_SPECIFICATION_MANUAL_MACHINES.md)  
**Preserved separate backlog (not this package):** O-JC-1 · O-JC-2 · O-JC-3  

**Does not begin:** billing · pricing tiers · contract-document system · squads · stock/parts · telemetry · FR-1 · production · remote schema apply · product implementation

---

## 1. Intent (smallest package)

Give Admin/Support a **thin machine coverage** that schedules preventive work from a **pinned published routine version**, generates **one ticket + job per due occurrence** into the **already-accepted** assignment and execution workflows, and keeps retries, pause/end, and version adoption **non-destructive**.

This is the deferred “contracts/coverage + recurrence” concern from the first-slice proposal, **without** paid entitlement, tiers, or a contract document model. Naming note: earlier “Lane C” text for this concern was superseded when Lane C became checklist execution; this package is **coverage & recurrence**, not a Lane C reopen.

---

## 2. Preserve completed milestones

| Milestone | Record | Sense for this proposal |
|-----------|--------|-------------------------|
| Lane A | Authoring / publish / applicability metadata | Source of immutable published versions + optional cadence metadata |
| Lane B | Job-only pin · `STAGING_PASS_BOUNDED` closeout | Generated jobs receive an **active pin** for the coverage’s pinned version via existing pin RPCs/rules |
| Lane C | Checklist execution · closeout @ `e27f21a5` | Execution path after pin; no new closure rules |
| Journey-close | `JC-PASS-BOUNDED` | Continuous routines→issue→ack→close proven; not re-audited here |
| B1–B7 | Staging-closed core program | Ticket/job/visit/report/assignment/ack/close remain authoritative |

Do **not** reopen Lane A/B/C closeouts, B5–B7 acceptance, journey-close, or perform another broad audit.

---

## 3. Scope

### In scope

1. **Coverage** for one **canonical** `machine_id`, with effective `start_date` / optional `end_date`, created/managed by Admin or Support.
2. Coverage **pins exactly one** published `service_routine_versions.id` (immutable content; Lane A rules).
3. **Calendar cadence** on the coverage (interval + unit) and an explicit **first planned due date**.
4. **Occurrence generation** into the rolling horizon: for each due occurrence, create **one preventive ticket + Job 1**, bind occurrence identity, and **pin** the coverage’s routine version on that job (Lane B).
5. Staff then use **existing** B2 assignment, B3 visits, Lane C checklist, B4–B6 report/issue/ack/close — no parallel execution FSM.
6. Generator **idempotent** on occurrence identity: retries / double-runs create **zero** duplicate tickets/jobs.
7. Staff UI: **upcoming**, **due**, and **overdue** occurrences for covered machines.
8. **Pause** and **end** coverage: stop new generation; retain history; **do not** mutate already-generated tickets/jobs/pins.
9. **Explicit routine-version adoption** on a coverage: affects only **future ungenerated** occurrences; generated work keeps its pin.

### Out of scope

| Excluded | Why |
|----------|-----|
| Billing, quotes, pricing tiers, visit allowances, SLA clocks | User-excluded; no entitlement gating |
| Full contract documents / multi-machine contract headers | Coverage is the thin entitlement stand-in |
| Squads / multi-tech dispatch | Map SM duties to Admin/Support (accepted roles) |
| Stock / parts reserve-order-consume | Spec §13 suggestions-only remains deferred |
| Telemetry / usage-based triggers | Calendar only |
| Job-without-ticket preventive model | Spec allows it; **accepted** path is ticket-centric — see §5 D1 |
| O-JC-1 / O-JC-2 / O-JC-3 product fixes | Separate backlog items |
| Implementation, migrations, staging/production apply, merge, FR-1 | Proposal only |

---

## 4. Concepts (aligned to accepted routine specification)

| Concept | Meaning in this package |
|---------|-------------------------|
| **Machine coverage** | Operational cover for **one** canonical machine over an effective period. Replaces full `contract_machine_coverage` for this thin slice. No tier snapshot. |
| **Coverage routine pin** | Exact published `routine_version_id` + cadence + first/next sequence anchor on that coverage. |
| **Maintenance occurrence** | Planned instance of the coverage’s routine. **Identity** (Status §C, adapted): `(machine_coverage_id, occurrence_sequence)`. `planned_due_date` is a **stored attribute**, fixed once generated — **not** part of the identity. |
| **Generated work** | One ticket + Job 1 per generated occurrence, with Lane B active pin = coverage pin at generation time. |

**Sequence rule:** `occurrence_sequence` is monotonic per coverage (1, 2, 3, …). Reschedule of appointment/assignee never renumbers or re-keys. Late completion does not create catch-up duplicates.

---

## 5. Recommended defaults (and material decisions only)

### Defaults (adopt unless overturned)

| Topic | Default |
|-------|---------|
| Roles | Admin **and** Support create/pause/end coverage, set cadence, adopt versions; Technician executes assigned jobs; Customer sees own-machine upcoming/due/overdue summaries only (no internal pin mutate) |
| Cadence units | Calendar **days / weeks / months** only (Lane A may store cadence metadata; coverage holds the **operative** cadence) |
| Next-due anchor | Chain from **planned due dates** (not completion or appointment), matching Spec §11 calendar default |
| Rolling horizon | **90 days** ahead from generator run time |
| Work shape | **One ticket + Job 1** per occurrence; ticket carries the machine; job inherits machine via ticket (B1) |
| Technician at generation | Job left **unassigned**; staff assign via **B2** (no silent auto-assign) |
| Pin at generation | Generator **must** create the Lane B active pin for the coverage’s pinned version (reason audited, e.g. `coverage_occurrence_generated`) before treating the occurrence as generated |
| Applicability at coverage create / pin | Reuse Lane B / Status §C: **family mismatch → hard deny**; model/manufacturer mismatch → allow only with **attributable Admin override** + reason; unlinked / non-canonical machine → deny |
| Pause | `paused`: no new occurrences generated; overdue/upcoming already generated stay as-is |
| End | `ended` (or end_date reached): same non-generation rule; history retained |
| Version publish N+1 | **No** automatic effect on active coverages |
| Version adoption | Explicit Admin/Support action; applies from **next ungenerated** occurrence; may recompute **future** planned due dates from sequence + new cadence; past/generated untouched |
| Retired versions | May remain on existing coverage/jobs for history/execution; **cannot** newly pin a retired version onto a coverage |
| Audit | Append-only `service_workflow_audit` (and coverage/occurrence history tables as needed); successful mutate + audit atomic |

### Material decisions (flag — behavior changes if flipped)

| ID | Decision | Recommendation | If flipped |
|----|----------|----------------|------------|
| **D1** | Ticket+job vs job-only preventive | **Ticket+job** so generated work reuses the closed customer journey without a second FSM | Job-only would require new ticketless assignment/ack/close paths — out of thin-slice budget |
| **D2** | Operative cadence location | **Coverage** holds operative interval/unit/first due; routine-version cadence is **seed/default only** | Version-only cadence forces republish to change schedule and blurs adoption |
| **D3** | Auto Lane B pin at generation | **Required** | Optional pin leaves Lane C/B4 path “no checklist” and breaks the routines journey for preventive work |
| **D4** | One routine pin per coverage | **One** published version per coverage row (smallest) | Multi-routine-per-coverage needs assignment sub-rows and richer occurrence keys — defer |

No other open product forks are required to accept this proposal.

---

## 6. Behavior sketch (planning)

### 6.1 Create / configure coverage

Admin/Support selects canonical machine → sets effective dates → picks published routine version (applicability enforced) → sets cadence + first `planned_due_date` → activates.

Denied when: machine unlinked/non-canonical; family-inapplicable; retired/draft version; cadence ≤ 0; first due before coverage start (or otherwise incoherent with effective window).

### 6.2 Generate

Idempotent job (RPC/cron — implementation later):

1. For each **active** (not paused/ended) coverage whose window includes “now”.
2. Walk occurrence sequences whose `planned_due_date` falls in `[as_of, as_of + 90d]` (and ≥ coverage start, ≤ coverage end if set).
3. If occurrence identity not yet generated → create ticket + Job 1 + Lane B pin + bind `occurrence_id` / sequence / planned due on the job (and occurrence row).
4. If already generated → **no-op** (including concurrent double-run).

Missed dates inside the horizon surface as **overdue**; they are not silently skipped, rescheduled, or duplicated.

### 6.3 Execute

Existing workflows only: B2 assign → B3 visit → Lane C checklist → B4 submit → B5 issue → B6 ack/close. Coverage does **not** invent visit/job completion rules.

### 6.4 Pause / end

Set status (and/or `end_date`). Generator stops. Occurrence history and generated tickets/jobs/pins **unchanged**. Resume (from pause) continues from the same sequence — no re-key, no backfill storm beyond the normal horizon rules.

### 6.5 Adopt routine version (and optional cadence change)

Explicit action with before/after version ids (and cadence if changed). Effect: coverage’s pin + operative cadence update for **ungenerated** future sequences only. Already-generated occurrences keep prior version on their jobs.

---

## 7. Acceptance matrix (proposed)

| ID | Scenario | Pass signal |
|----|----------|-------------|
| CR-01 | Admin/Support create coverage on canonical machine with published version, cadence, first due, effective dates | Coverage `active`; pin = exact version id |
| CR-02 | Family-inapplicable routine → create/pin denied; model mismatch only with audited Admin override | Hard deny / override path only |
| CR-03 | Generator run creates ticket+job+Lane B pin for first due in horizon | One occurrence seq=1; job pin matches coverage pin |
| CR-04 | Generator run **twice** (and concurrent retry) | Still exactly one ticket/job for that occurrence; zero duplicates |
| CR-05 | Staff list shows upcoming / due / overdue correctly for open occurrences | States match `planned_due_date` vs as-of |
| CR-06 | Pause coverage; generator re-runs | No new occurrences; existing generated work untouched |
| CR-07 | End coverage (or end_date passes); generator re-runs | Same as pause for generation; history retained |
| CR-08 | Publish routine N+1 without adoption | Coverage and generated jobs still on N; no silent change |
| CR-09 | Explicit adopt N+1 (optional cadence change) | Next **ungenerated** occurrence uses N+1 (+ new cadence dates); prior generated keep N and identity/sequence |
| CR-10 | Generated job assigned and executed through existing pin→checklist→submit path (smoke) | Lane B/C + B4 behave as accepted; no new execution RPCs required for pass |
| CR-11 | Customer/tech cannot create/pause/adopt coverage; unrelated customer denied schedule of others | Authz deny; no payload leak |
| CR-12 | Retire pinned version after generation | Existing job still readable/executable per Lane A/B rules; new coverage cannot pin retired version |

**Non-scenarios:** billing/tiers · contract PDF/header model · squads · stock · telemetry · O-JC-1/2/3 fixes · production/staging apply · re-proving full JC-01…08 matrix.

---

## 8. Explicit non-claims / backlog fence

- Does **not** authorize implementation, migrations, staging or production apply, merge, or FR-1.
- Does **not** reopen Lane A/B/C, B5–B7, or journey-close acceptance text beyond citing them as preserved.
- Does **not** schedule O-JC-1 (stranded completed visit), O-JC-2 (`create_follow_up` clearing), or O-JC-3 (unknown-revision ack 4xx); those remain **separate backlog** records under [`JOURNEY_CLOSE_FOLLOWUP_O_JC_1_STRANDED_COMPLETED_VISIT.md`](./JOURNEY_CLOSE_FOLLOWUP_O_JC_1_STRANDED_COMPLETED_VISIT.md), [`JOURNEY_CLOSE_FOLLOWUP_O_JC_2_CREATE_FOLLOW_UP_CLEARING.md`](./JOURNEY_CLOSE_FOLLOWUP_O_JC_2_CREATE_FOLLOW_UP_CLEARING.md), [`JOURNEY_CLOSE_FOLLOWUP_O_JC_3_UNKNOWN_REVISION_ACK_4XX.md`](./JOURNEY_CLOSE_FOLLOWUP_O_JC_3_UNKNOWN_REVISION_ACK_4XX.md).
- Does **not** claim Spec Journey B (full contracts) is in scope — only the thin coverage + recurrence subset needed for calendar preventive work on accepted roles and workflows.

---

## 9. Suggested next step (not authorized by this doc)

Separate implementation contract tip (Spark before runtime), then disposable + staging acceptance against CR-01…CR-12 — only after explicit authorization.
