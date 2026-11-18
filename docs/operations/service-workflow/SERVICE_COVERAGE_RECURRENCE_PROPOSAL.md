# Proposal — service coverage & recurring maintenance (planning only)

**Status:** Amended proposal · decisions closed at `42862fdd` · **local implementation authorized** (see [`COVERAGE_RECURRENCE_LOCAL_ACCEPTANCE.md`](./COVERAGE_RECURRENCE_LOCAL_ACCEPTANCE.md)) · still **not** authorized for staging/production apply, merge, or FR-1  
**Base tip:** `9e6585f38ab29df1fea5b3802b188e1399dfe286`  
**Closed tip:** `42862fdd27636d2682ce81fc287ed3777f8005fb`  
**Depends on (reuse, do not reopen):**  
Lane A authoring · Lane B job pins · Lane C checklist execution · journey-close `JC-PASS-BOUNDED` ([`JOURNEY_CLOSE_STAGING_ACCEPTANCE.md`](./JOURNEY_CLOSE_STAGING_ACCEPTANCE.md)) · accepted B1–B7 ticket→job→visit→report→issue→ack→close path  
**Routine specification reuse:** Spec Status §C occurrence identity + §13 pinning/adoption/cadence defaults in [`SERVICE_WORKFLOW_SPECIFICATION_MANUAL_MACHINES.md`](../../specs/SERVICE_WORKFLOW_SPECIFICATION_MANUAL_MACHINES.md)  
**Preserved separate backlog (not this package):** O-JC-1 · O-JC-2 · O-JC-3  

**Does not begin:** billing · pricing tiers · contract-document system · squads · stock/parts · telemetry · FR-1 · production · remote schema apply · product implementation · cancel-and-reissue of generated occurrences

---

## 1. Intent (smallest package)

Give Admin/Support a **thin machine coverage** that schedules preventive work from a **pinned published routine version**, generates **one ticket + job per due occurrence** into the **already-accepted** assignment and execution workflows, and keeps retries, pause/end, and version adoption **non-destructive**.

This is the deferred “contracts/coverage + recurrence” concern from the first-slice proposal, **without** paid entitlement, tiers, or a contract document model. Naming note: earlier “Lane C” text for this concern was superseded when Lane C became checklist execution; this package is **coverage & recurrence**, not a Lane C reopen.

---

## 2. Preserve completed milestones

| Milestone | Record | Sense for this proposal |
|-----------|--------|-------------------------|
| Lane A | Authoring / publish / applicability metadata | Source of immutable published versions + optional cadence metadata; **publication and applicability authority unchanged** |
| Lane B | Job-only pin · `STAGING_PASS_BOUNDED` closeout | Generated jobs receive an **active pin** for the coverage’s pinned version via **existing** pin RPCs/rules |
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
4. **Occurrence generation** per the closed window rules (§5.1–§5.2): for each eligible ungenerated occurrence, create **one preventive ticket + Job 1**, bind occurrence identity, and **pin** the coverage’s routine version on that job (Lane B) — **atomically** (§5.4).
5. Staff then use **existing** B2 assignment, B3 visits, Lane C checklist, B4–B6 report/issue/ack/close — no parallel execution FSM.
6. Generator **idempotent** on `(coverage_id, sequence)`: retries / double-runs create **zero** duplicate tickets/jobs; uniqueness **enforced in the database**.
7. Staff UI: **upcoming**, **due**, and **overdue** occurrences for covered machines.
8. **Pause** and **end** coverage: stop new generation only; retain history; **do not** mutate already-generated tickets/jobs/pins.
9. **Explicit routine-version adoption** (version only) and a **separate explicit cadence-change** action; both affect only **future ungenerated** planned dates / version binding — never renumber sequences or alter generated work.

### Out of scope

| Excluded | Why |
|----------|-----|
| Billing, quotes, pricing tiers, visit allowances, SLA clocks | User-excluded; no entitlement gating |
| Full contract documents / multi-machine contract headers | Coverage is the thin entitlement stand-in |
| Squads / multi-tech dispatch | Map SM duties to Admin/Support (accepted roles) |
| Stock / parts reserve-order-consume | Spec §13 suggestions-only remains deferred |
| Telemetry / usage-based triggers | Calendar only |
| Job-without-ticket preventive model | Spec allows it; **accepted** path is ticket-centric — see §5 D1 |
| Cancel-and-reissue of generated occurrences under a new pin/version | Excluded; generated work keeps its pin for life of that occurrence |
| Changing Lane A publication / applicability authority | Unchanged; reuse accepted rules |
| O-JC-1 / O-JC-2 / O-JC-3 product fixes | Separate backlog items |
| Implementation, migrations, staging/production apply, merge, FR-1 | Proposal only |

---

## 4. Concepts (aligned to accepted routine specification)

| Concept | Meaning in this package |
|---------|-------------------------|
| **Machine coverage** | Operational cover for **one** canonical machine over an effective period. Replaces full `contract_machine_coverage` for this thin slice. No tier snapshot. |
| **Coverage routine pin** | Exact published `routine_version_id` on that coverage (operative schedule lives beside it as cadence fields). |
| **Maintenance occurrence** | Planned instance of the coverage’s routine. **Identity** (Status §C, adapted): `(coverage_id, sequence)`. `planned_due_date` is a **stored `DATE` attribute**, fixed once generated — **not** part of the identity. |
| **Generated work** | One ticket + Job 1 per generated occurrence, with Lane B active pin = coverage’s routine version **at generation time**. |

**Sequence rule:** `sequence` is monotonic per coverage (1, 2, 3, …). Reschedule of appointment/assignee never renumbers or re-keys. Late completion does not create catch-up duplicates. Database **UNIQUE (`coverage_id`, `sequence`)**.

---

## 5. Closed decisions (amended on `9e6585f3`)

### 5.1 Dates & calendar arithmetic — **closed**

| Rule | Decision |
|------|----------|
| Storage | Coverage `start_date`, optional `end_date`, and every `planned_due_date` are SQL **`DATE`** (no time-of-day). |
| “Today” / `as_of` | Evaluated in **`Africa/Cairo`**. Generator and upcoming/due/overdue classification use that civil date. |
| End date | **Inclusive.** An occurrence with `planned_due_date = end_date` is still eligible (subject to other window rules). |
| Monthly cadence | Advance by calendar months from the **original schedule anchor day-of-month** (the first planned due’s day). If the target month is shorter, **clamp to that month’s last day**. Example: anchor day 31 → Jan 31 → Feb 28 (or 29 in leap years) → Mar 31. |
| Day / week cadence | Add exact day or 7×interval days on the `DATE` line; no timezone shift. |

### 5.2 Generation window & pause/end — **closed**

For each coverage that is **`active`** (not `paused`, not `ended`):

1. Candidate planned dues are every sequence date from **coverage `start_date` through `as_of + 90 days`**, further bounded by the inclusive `end_date` when set.
2. Every **ungenerated** candidate in that range is generated **once** (including dates **before** `as_of`). Those past-due rows appear as **overdue** after generation.
3. Already-generated `(coverage_id, sequence)` → **no-op** (retry-safe).
4. **`paused`:** generate **nothing** (including overdue backlog).
5. **Resume from pause:** coverage returns to `active`; the next generator run **includes missed** ungenerated occurrences in the window (still once each; no duplicate, no renumber).
6. **`ended`:** generate **nothing**. **`ended` is terminal** — no resume-to-active path in this package (create a new coverage if cover must continue). Reaching an inclusive `end_date` without an explicit end still stops further generation past that date; explicit `ended` status is the terminal operational state.

**Pause/end affect generation only.** They do not edit, cancel, reassign, unpin, or otherwise mutate already-generated tickets, jobs, pins, or visits.

### 5.3 Adoption vs cadence — **closed**

| Action | Effect |
|--------|--------|
| **Adopt published routine version** | Changes the coverage’s **routine version only**. Applies to **future ungenerated** occurrences at generation time. Does **not** change cadence, renumber sequences, or alter generated work / existing job pins. |
| **Change cadence** (separate explicit Admin/Support action) | Updates operative interval/unit (and any explicit re-anchor rules supplied by that action). Recomputes **`planned_due_date` only for future ungenerated sequences** from the existing sequence index + new cadence math (§5.1). Does **not** renumber sequences, does **not** rewrite generated occurrences’ stored dues or pins, and does **not** by itself change the pinned routine version. |
| Publish N+1 without adopt | No effect on coverages or generated work. |

Cancel-and-reissue of an already-generated occurrence under a new version is **out of scope**.

### 5.4 Atomicity, uniqueness, and authorized generation path — **closed**

| Rule | Decision |
|------|----------|
| Atomic unit | For each newly generated occurrence: **occurrence row + preventive ticket + Job 1 + Lane B routine pin + success audit** commit in **one** transaction — or **all roll back**. |
| Failure | Pin failure, applicability failure, ticket/job create failure, or audit failure → **no partial work**; occurrence remains ungenerated and the next authorized run is **retry-safe**. |
| Uniqueness | Database enforces **`UNIQUE (coverage_id, sequence)`**. Concurrent generators collide on that key / equivalent serialization and produce at most one generated work bundle. |
| Authority | Generation must call **existing governed ticket/job creation and Lane B pin RPCs** under a real Admin/Support (or designated system role mapped to those RPC authz checks). **No** actor impersonation, **no** direct-write bypass of ticket/job/pin RLS or pin-mutate asserts. Publication and applicability checks remain the **accepted Lane A / Lane B** authorities — unchanged. |

### 5.5 Clarifying notes (remaining)

| Note | Sense |
|------|-------|
| Generated jobs | Remain fully under **existing** B2–B6 / Lane C workflows after generation; coverage does not invent completion, ack, or closure rules. |
| Preventive tickets | Retain **normal customer isolation** (owner / `can_read_ticket_workflow` / B7 boundaries). Coverage schedule summaries for customers stay own-machine only. |
| Ended | Terminal for that coverage row. |
| Publication / applicability | Unchanged from accepted Lane A metadata + Lane B pin-time enforcement. |

### 5.6 Defaults (still in force)

| Topic | Default |
|-------|---------|
| Roles | Admin **and** Support create/pause/end coverage, set cadence, adopt versions; Technician executes assigned jobs; Customer sees own-machine upcoming/due/overdue summaries only (no internal pin mutate) |
| Cadence units | Calendar **days / weeks / months** only (Lane A cadence metadata may **seed**; coverage holds the **operative** cadence) |
| Next-due anchor | Chain from **planned due dates** (not completion or appointment) |
| Horizon end | `as_of + 90 days` (Cairo `DATE`), inclusive of that end day for classification; window start is coverage `start_date` per §5.2 |
| Work shape | **One ticket + Job 1** per occurrence; ticket carries the machine; job inherits machine via ticket (B1) |
| Technician at generation | Job left **unassigned**; staff assign via **B2** |
| Pin at generation | Required via Lane B pin RPC for the coverage’s current pinned version (audited reason, e.g. `coverage_occurrence_generated`) |
| Retired versions | Existing jobs keep read/execute; **cannot** newly pin a retired version onto a coverage |

### 5.7 Material decisions (unchanged forks)

| ID | Decision | Closed choice | If flipped |
|----|----------|---------------|------------|
| **D1** | Ticket+job vs job-only preventive | **Ticket+job** | Job-only needs ticketless assignment/ack/close — out of thin-slice budget |
| **D2** | Operative cadence location | **Coverage** (version cadence = seed only) | Version-only cadence blurs adopt vs schedule change |
| **D3** | Auto Lane B pin at generation | **Required** (atomic with create) | Optional pin breaks routines journey for preventive work |
| **D4** | One routine pin per coverage | **One** published version per coverage row | Multi-routine needs richer keys — defer |

---

## 6. Behavior sketch (planning)

### 6.1 Create / configure coverage

Admin/Support selects canonical machine → sets `DATE` effective window → picks published routine version (applicability enforced under existing authority) → sets cadence + first `planned_due_date` → activates.

Denied when: machine unlinked/non-canonical; family-inapplicable; retired/draft version; cadence ≤ 0; first due before coverage start (or otherwise incoherent with effective window).

### 6.2 Generate

Authorized idempotent generator (RPC/cron — implementation later), `as_of` = Cairo today:

1. Skip coverages that are `paused` or `ended`.
2. For each `active` coverage, enumerate sequences whose planned dues fall in **[`start_date`, min(`as_of + 90 days`, inclusive `end_date` if set)]** using §5.1 arithmetic from the first due / original month anchor.
3. For each ungenerated `(coverage_id, sequence)`, in one transaction: insert occurrence → create ticket + Job 1 via governed RPCs → Lane B pin → audit. On any failure, roll back; leave ungenerated.
4. If row already exists for `(coverage_id, sequence)` → no-op.

Past-due sequences in the window generate once and list as **overdue**.

### 6.3 Execute

Existing workflows only: B2 assign → B3 visit → Lane C checklist → B4 submit → B5 issue → B6 ack/close. Coverage does **not** invent visit/job completion rules.

### 6.4 Pause / end / resume

- **Pause:** status `paused`; generation stops; generated work untouched.  
- **Resume:** status `active` again; next run includes missed ungenerated sequences in the window.  
- **End:** status `ended` (**terminal**); generation stops; generated work untouched. No resume.

### 6.5 Adopt version / change cadence

- **Adopt:** explicit Admin/Support action; coverage `routine_version_id` updates; future ungenerated generations use the new version; sequences and generated pins unchanged.  
- **Change cadence:** separate explicit action; recompute future ungenerated `planned_due_date` values only; sequences and generated work unchanged; version unchanged unless a separate adopt is also performed.

---

## 7. Acceptance matrix (amended — focused tests)

| ID | Scenario | Pass signal |
|----|----------|-------------|
| CR-01 | Admin/Support create coverage on canonical machine with published version, cadence, first due, `DATE` effective window | Coverage `active`; pin = exact version id; dates stored as `DATE` |
| CR-02 | Family-inapplicable routine → create/pin denied; model mismatch only with audited Admin override | Hard deny / override path only; Lane A/B authority unchanged |
| CR-03 | Generator creates ticket+job+Lane B pin+audit for first due in one transaction | One occurrence seq=1; job pin matches coverage pin; all-or-nothing |
| CR-04 | Generator run **twice** and concurrent retry | Still exactly one ticket/job; DB `(coverage_id, sequence)` unique holds |
| CR-05 | Staff list upcoming / due / overdue using Cairo `as_of` | Classification matches Cairo civil date vs `planned_due_date` |
| CR-06 | Pause → generator no-op; resume → missed ungenerated in window generate once | No gen while paused; after resume overdue/missed appear once; no renumber |
| CR-07 | End coverage → generator no-op; status terminal (no resume) | Nothing new; history + generated work retained |
| CR-08 | Inclusive `end_date` and window from `start_date` through `as_of+90d` | Due on `end_date` eligible; past-due before `as_of` generate once as overdue; beyond end or horizon excluded |
| CR-09 | Monthly clamp: anchor day 31 across Jan→Feb→Mar (leap and non-leap) | Feb 28/29 then Mar 31; sequences stable |
| CR-10 | Adopt N+1 **without** cadence change | Future ungenerated use N+1; cadence/dates for ungenerated unchanged by adopt alone; generated keep N |
| CR-11 | Explicit cadence change **without** adopt | Future ungenerated dues recompute; sequences unchanged; generated dues/pins unchanged; version unchanged |
| CR-12 | Pin or applicability failure mid-generate | Zero partial ticket/job/occurrence; retry later succeeds once |
| CR-13 | Generation uses governed ticket/job + Lane B pin RPCs only | No impersonation; no direct-write bypass of pin/ticket guards |
| CR-14 | Customer isolation on preventive tickets; unrelated customer denied others’ schedule | Normal workflow isolation preserved |
| CR-15 | Publish N+1 without adopt; retire after generation | No silent coverage change; existing job still readable/executable; new coverage cannot pin retired |
| CR-16 | Smoke: assign generated job and run pin→checklist→submit | Existing Lane B/C + B4 path; no new execution FSM |

**Non-scenarios:** billing/tiers · contract PDF/header model · squads · stock · telemetry · cancel-and-reissue · O-JC-1/2/3 fixes · production/staging apply · re-proving full JC-01…08 matrix · broader redesign.

---

## 8. Explicit non-claims / backlog fence

- Does **not** authorize implementation, migrations, staging or production apply, merge, or FR-1.
- Does **not** reopen Lane A/B/C, B5–B7, or journey-close acceptance text beyond citing them as preserved.
- Does **not** schedule O-JC-1 (stranded completed visit), O-JC-2 (`create_follow_up` clearing), or O-JC-3 (unknown-revision ack 4xx); those remain **separate backlog** records under [`JOURNEY_CLOSE_FOLLOWUP_O_JC_1_STRANDED_COMPLETED_VISIT.md`](./JOURNEY_CLOSE_FOLLOWUP_O_JC_1_STRANDED_COMPLETED_VISIT.md), [`JOURNEY_CLOSE_FOLLOWUP_O_JC_2_CREATE_FOLLOW_UP_CLEARING.md`](./JOURNEY_CLOSE_FOLLOWUP_O_JC_2_CREATE_FOLLOW_UP_CLEARING.md), [`JOURNEY_CLOSE_FOLLOWUP_O_JC_3_UNKNOWN_REVISION_ACK_4XX.md`](./JOURNEY_CLOSE_FOLLOWUP_O_JC_3_UNKNOWN_REVISION_ACK_4XX.md).
- Does **not** claim Spec Journey B (full contracts) is in scope — only the thin coverage + recurrence subset needed for calendar preventive work on accepted roles and workflows.
- Does **not** authorize cancel-and-reissue, impersonation, or direct-write bypass of governed create/pin paths.

---

## 9. Suggested next step (not authorized by this doc)

Separate implementation contract tip (Spark before runtime), then disposable + staging acceptance against CR-01…CR-16 — only after explicit authorization.
