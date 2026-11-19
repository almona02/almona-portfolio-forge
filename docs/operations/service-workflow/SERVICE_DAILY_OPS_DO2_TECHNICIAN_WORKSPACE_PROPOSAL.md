# Proposal — DO-2 technician daily ops workspace (planning only)

**Status:** Locally implemented · **staging closed** ([`DO2_STAGING_CLOSEOUT.md`](./DO2_STAGING_CLOSEOUT.md)) · production apply, merge, DO-3 implementation, scheduler still **not** authorized  
**Amends:** `44f3cbb3` (focus params in-scope · DO2-06 RLS chain · non-blocking clarifications) · tip `82f74069`  
**Local acceptance:** [`SERVICE_DAILY_OPS_DO2_LOCAL_ACCEPTANCE.md`](./SERVICE_DAILY_OPS_DO2_LOCAL_ACCEPTANCE.md)  
**Parent:** [`SERVICE_DAILY_OPERATIONS_WORKSPACE_PROPOSAL.md`](./SERVICE_DAILY_OPERATIONS_WORKSPACE_PROPOSAL.md) (DO-1 staff strip accepted / staging-passed separately)  
**Depends on (reuse, do not reopen):** B2 assignment · B3 visits · Lane B pins · Lane C checklist · B4 report submit · B5 return/issue · narrow technician ticket header (`get_technician_ticket_header` / T-G1) · DO-1 empty/error/count=filter rules · staging-equivalent `service_tickets` RLS (ENABLE + existing staff/owner SELECT; technicians via header RPC only)  
**Does not begin:** new workflow states · dispatch/squads · notifications · **DO-3** · coverage scheduler · production · remote schema apply · broadening direct `service_tickets` SELECT for technicians

**Rule (same as DO-1):** Count unit and matching filter population are defined together. Chip integer = cardinality of the linked filtered set. Errors must never render as a successful **0**. Viewing the workspace creates or changes nothing.

---

## 1. Intent

Add a **read-only technician worklist strip** on the existing `/technician` home that surfaces three caller-scoped queues and deep-links into **existing** ticket/job/visit/checklist/report panels and governed actions. No parallel technician journey.

**DO-2 also owns** destination focus handling on `/support/tickets/:ticketId` for the agreed query parameters (§2.1), and the smallest route/getter wiring needed so a historical attending technician can complete queue → header → report getter → permitted submit/resubmit under staging-equivalent RLS without direct ticket-table broadening (§6.1).

---

## 2. Existing surfaces to reuse

| Surface | Route / API | Role in DO-2 |
|---------|-------------|--------------|
| Technician home | `/technician` → `TechnicianDashboard.tsx` | Host for chips + filtered lists |
| Ticket detail | `/support/tickets/:ticketId` → `TicketDetailPage.tsx` | Destination shell + **focus-parameter handling** |
| Narrow ticket header | RPC `get_technician_ticket_header` | Technician page gate (no full-row `service_tickets` SELECT) |
| Jobs / visits | `ServiceJobAssignmentPanel`, `ServiceVisitPanel` + workflow-authorized job/visit reads | Assigned work + visit actions |
| Checklist | `ServiceVisitChecklistPanel` / `get_visit_checklist_workspace` | Lane C capture while visit `in_progress` |
| Report submit | `ServiceReportPanel` / `get_service_report_for_visit` / `submit_service_report_revision` | B4 submit / post-return resubmit |
| Job list helper (today) | `listServiceJobsForTechnician` | Reference for assignment ∪ historical-attendance reachability — DO-2 **must not** conflate those sets in one chip |

### 2.1 Deep-link + focus contract (in DO-2 scope)

**URL shape:**  
`/support/tickets/:ticketId?job=:jobId&visit=:visitId&panel=visit|checklist|report`

| Parameter | Meaning |
|-----------|---------|
| `ticketId` | Route ticket; must pass technician header (or existing staff/owner path) |
| `job` | Focus job id |
| `visit` | Focus visit id |
| `panel` | Which existing section to expand and bring into view: `visit` · `checklist` · `report` |

**Required UI behavior (TicketDetailPage + child panels):**

1. After the page gate succeeds, resolve `job` / `visit` **only** through authorized workflow data already readable to the caller (job/visit list or getters that use `can_read_ticket_workflow` / equivalent — **not** a privileged cross-ticket lookup).
2. On a valid, authorized match: expand the relevant job/visit section, mount/reveal the requested `panel`, and **scroll it into view** (existing `data-testid` mounts are acceptable anchors).
3. `panel=checklist` expands checklist UI for that visit; `panel=report` expands `ServiceReportPanel` for that visit; `panel=visit` expands visit controls.
4. **Invalid, unknown, cross-ticket, or unauthorized** `job` / `visit` / `panel` values → **safe fallback**: render the authorized ticket shell without focused expansion; **no** error copy that reveals whether the target exists, belongs to another ticket, or is forbidden. Do not load or display foreign job/visit/report content.
5. Missing optional params → no focus attempt (normal ticket render).
6. No new pages; focus is wiring on the existing route only.

---

## 3. Timezone and default upcoming window (recommendation)

| Setting | Locked recommendation | Rationale |
|---------|----------------------|-----------|
| Timezone | **Africa/Cairo** | Align with DO-1 `admin_private.cairo_today()` / staff desk “today” |
| `as_of` | Cairo calendar date; default = Cairo today; optional read param only | Viewing must not mutate |
| Upcoming window | Cairo calendar dates **`[as_of, as_of + 7 days]` inclusive** (8 dates) | “Today plus one week ahead” — small default, operator-overridable later without schema change |
| Visit date used | `timezone('Africa/Cairo', scheduled_start)::date` | `scheduled_start` is timestamptz |

Window filters **Upcoming visits only**. Assigned-jobs and Needs-attention are not window-bounded (they are open-work queues).

### 3.1 Non-blocking clarifications

| Topic | Clarification |
|-------|---------------|
| **Wall-clock overdue** | `overdue_scheduled` uses **`scheduled_end < now()`** (timestamptz / database `now()`), **not** a Cairo calendar-date comparison. Distinct from the Upcoming Cairo window. |
| **NULL-window exclusion** | Visits with **`scheduled_start IS NULL`** are **excluded** from Upcoming. Visits with **`scheduled_end IS NULL`** are **excluded** from `overdue_scheduled` (cannot satisfy `scheduled_end < now()`). |
| **Deterministic sort tie-breaks** | After the listed sort keys, break ties by **`visit.id` ASC** (Needs attention / Upcoming) or **`job.id` ASC** (Assigned jobs) so equal timestamps/sequences are stable. |

---

## 4. Assignment vs attendance (hard distinction)

| Concept | Source of truth | Used by |
|---------|-----------------|---------|
| **Current assignment** | `service_jobs.assigned_technician_id = caller` | My assigned jobs · Upcoming scheduled visits |
| **Historical attendance** | `service_job_visits.attending_technician_id = caller` | Needs-attention for `in_progress` / completed-visit report paths |

**Reassignment rules (must hold):**

1. After reassignment, the **former** assignee drops out of **My assigned jobs** and **Upcoming visits** for that job.
2. Reassignment must **not** expose the **new** assignee to report submit/revision for visits they did not attend.
3. Reassignment must **not** erase the **historical attending** technician’s Needs-attention rows (or ticket-header/report reachability) for completed visits they attended — B4 R4-05 / `is_ticket_visit_attending_technician` retained.
4. DO-2 helpers must not return other technicians’ assigned or attended work to the caller.

---

## 5. Chip predicates (locked)

**Parent ticket open** = ticket `status` **not in** (`closed`, `cancelled`).  
**Caller** = authenticated technician whose `auth.uid()` is the subject of every predicate.  
Admin/support may open `/technician` (existing route allow-list) but the strip remains **caller-scoped** (their own uid), never an all-technicians desk. Customer → **403** on any new DO-2 read helper (no successful empty/zero body).

### 5.1 My assigned jobs

| Field | Value |
|-------|-------|
| Count unit | **Jobs** |
| Population | `service_jobs` where `assigned_technician_id = caller` **and** `state` **not in** (`completed`, `cancelled`, `waived`) **and** parent ticket open |
| Sort | `updated_at` DESC, then `job_sequence` ASC, then `id` ASC |
| Destination | `/support/tickets/:ticketId?job=:jobId` → focus job section (§2.1) |
| Eligibility note | Current assignment only. Historical attendance alone does **not** enter this chip. |

### 5.2 Upcoming visits

| Field | Value |
|-------|-------|
| Count unit | **Visits** |
| Population | `service_job_visits` where `state = 'scheduled'` **and** `scheduled_start IS NOT NULL` **and** parent job `assigned_technician_id = caller` **and** parent ticket open **and** Cairo date of `scheduled_start` ∈ `[as_of, as_of + 7 days]` |
| Sort | `scheduled_start` ASC, then `visit_sequence` ASC, then `id` ASC |
| Destination | `/support/tickets/:ticketId?job=:jobId&visit=:visitId&panel=visit` → focused visit panel (§2.1) |
| Eligibility note | **Current assignment**, not attendance. A scheduled visit left with a stale `attending_technician_id` after reassignment follows the **new** assignee via the job FK, not the old attendee. |

### 5.3 Needs attention (composite visit queue)

| Field | Value |
|-------|-------|
| Count unit | **Visits** (distinct; a visit appears **once** even if multiple reasons apply) |
| Population | Union of the subtypes below, de-duplicated by `visit.id` |
| Sort | Reason priority (Report revision → Report submit → In-progress / checklist → Overdue scheduled), then `scheduled_start` ASC NULLS LAST, then `visit_sequence` ASC, then `id` ASC |
| Destination | Same ticket URL with `panel` set to the **primary** reason’s action; focus must land on that panel (§2.1) |

#### Subtypes (eligibility + next action)

| Reason code | Visit / job predicate | Primary `panel` | Governed action (existing) |
|-------------|----------------------|-----------------|----------------------------|
| `overdue_scheduled` | `state = 'scheduled'` **and** `scheduled_end IS NOT NULL` **and** `scheduled_end < now()` **and** job `assigned_technician_id = caller` **and** ticket open **and** job not terminal | `visit` | Start / reschedule via B3 visit RPCs |
| `in_progress_or_checklist` | `state = 'in_progress'` **and** `attending_technician_id = caller` **and** ticket open **and** job not terminal | `checklist` if active pin present, else `visit` | Lane C checklist capture / B3 complete |
| `report_submit` | `state = 'completed'` **and** `attending_technician_id = caller` **and** job `state = 'in_progress'` **and** **no** row in `service_report_revisions` for that visit’s report **and** ticket open | `report` | B4 `submit_service_report_revision` |
| `report_revision` | `state = 'completed'` **and** `attending_technician_id = caller` **and** job `state = 'in_progress'` **and** latest review on the latest revision has `decision = 'returned'` **and** ticket open | `report` | B4 resubmit after B5 return |

**Primary reason when multiple match:** `report_revision` > `report_submit` > `in_progress_or_checklist` > `overdue_scheduled`.

**Terminal job states** for exclusion: `completed`, `cancelled`, `waived`.  
Visits in `aborted` / `no_access` are **out** of Needs attention (no new states; reopen/schedule remains an existing staff path, not this chip).

---

## 6. UI / RPC shape (thin)

**Slice DO-2 — Technician worklist strip + destination focus**

1. On `/technician`, render three count chips using §5 predicates (`as_of` + upcoming window defaults per §3).  
2. Chip click → filtered list of the **exact** counted population (id + title/when + reason + one next-action link with §2.1 params).  
3. Add only **minimum technician read helpers** for these three populations (SECURITY DEFINER or equivalent; **no** new mutate path; helpers must not write).  
4. **Authorization:** caller must be able to act as technician subject (`role = technician`, or existing staff role opening the route still filtered to `auth.uid()`). Customer → **403** with distinct authz detail (never 200-zero).  
5. **Error vs empty vs loading:**  
   - Loading → busy indicator; no chips pretending to be zero.  
   - Success empty → muted empty copy; chips show **0**.  
   - Failure / 403 → `role="alert"` error/unavailable; **no** successful zero counts.  
6. Implement §2.1 focus handling on `TicketDetailPage` / child panels.  
7. Reuse DO-1 strip interaction patterns where cheap (`StaffDailyOpsStrip` lessons), but keep a **technician-specific** component (different populations/authz).

### 6.1 Historical-attendee route chain (staging-equivalent RLS) — in scope if missing

Under staging-equivalent policy (`service_tickets` RLS **enabled**; technicians **denied** full-row ticket SELECT; workflow reads via existing helpers), DO-2 must prove and, if needed, land the **smallest** wiring so this chain works **without** broadening direct table access:

| Step | Existing authz | UI / API |
|------|----------------|----------|
| 1. Queue entry | DO-2 Needs-attention helper (attending-based) | Chip row for Tech A |
| 2. Narrow header | `get_technician_ticket_header` (job assignee **or** visit attending) | Ticket shell loads; no `service_tickets` `select('*')` for technicians |
| 3. Job/visit context | Existing workflow-authorized job/visit reads (`can_read_ticket_workflow` / equivalent RLS) | Focused job/visit visible for the attended visit |
| 4. Report getter | `get_service_report_for_visit` | Bundle loads for attending tech |
| 5. Permitted action | `submit_service_report_revision` (R4-05 attending authorship) | Submit or post-return resubmit UI enabled per existing rules |

**Explicitly out of bounds for this correction:** adding technicians to `service_tickets` SELECT · setting `assigned_to` to the former tech only to render · disabling RLS · new workflow states.

**In bounds if the chain breaks today:** the smallest TicketDetailPage / panel wiring so focus + report mount use the header + existing getters (same pattern as T-G1 for page gate), not a new privilege path.

**Explicit non-goals:** new job/visit/report states · dispatch/squads · push/email notifications · DO-3 customer strip · scheduler / auto-generate · broadening `service_tickets` SELECT for technicians beyond the narrow header.

---

## 7. Acceptance scenarios (focused)

| ID | Scenario | Expected |
|----|----------|----------|
| DO2-01 | Technician with no assigned open jobs, no windowed scheduled visits, no needs-attention visits | Three chips **0**; muted empties; **not** an error |
| DO2-02 | Two jobs assigned to caller on open tickets (`planned` / `in_progress`); one assigned job on cancelled ticket; one completed assigned job | Assigned-jobs chip = **2**; list matches those two only |
| DO2-03 | Three scheduled visits for caller’s assigned jobs: Cairo dates `as_of−1`, `as_of+3`, `as_of+8` | Upcoming chip = **1** (only `as_of+3`); sorted by `scheduled_start`, then sequence, then `id` |
| DO2-04 | Default window uses Africa/Cairo; `as_of` omitted | Window = Cairo today through today+7 inclusive; no writes |
| DO2-05 | Job reassigned from Tech A → Tech B; scheduled future visit remains on job | A’s Assigned + Upcoming drop that job/visit; B’s Upcoming gains it; neither chip uses stale attendance alone |
| DO2-06 | **Staging-eq RLS.** Tech A completed a visit; job reassigned to Tech B before report submit. A still attending on that completed visit. | (1) Needs-attention **report_submit** for **A** only; **B** excluded from that submit queue. (2) A follows link → **narrow header succeeds** (no direct `service_tickets` SELECT). (3) Focused visit context loads via authorized job/visit reads. (4) **`get_service_report_for_visit` succeeds** for A. (5) Permitted **submit** UI/action available to A under R4-05. (6) **B (new assignee)** retains legitimate **read/focus** where existing workflow/header policy permits (current assignee arm) — **do not** add a new read denial; B still **must not** receive report **submit/revision** for visits they did not attend. Invalid/foreign focus params → safe fallback without content leak. No SELECT broadening. |
| DO2-07 | Visit `in_progress`, attending = caller, active pin; caller follows Needs-attention link | Chip counts once; URL includes `panel=checklist`; **checklist section is expanded and scrolled into view** for that `visit` (not merely ticket URL present) |
| DO2-08 | Completed visit, attending = caller, no revisions, job `in_progress`; caller follows link | URL includes `panel=report`; **report panel for that visit is expanded and in view**; submit affordance visible per B4 |
| DO2-09 | Latest review `returned`, job `in_progress`, attending = caller; caller follows link | URL includes `panel=report`; **report panel focused in view** for resubmit; one visit row in the queue |
| DO2-10 | Customer calls any new DO-2 read helper | **403**; no chip data; no **0** success body |
| DO2-11 | Helper/RPC failure | Error/unavailable UI; must **not** show successful zero counts |
| DO2-12 | Technician opens strip / expands queues / follows links | **Read-only** regarding creates: no new tickets, jobs, visits, revisions, reviews, or assignments from viewing |
| DO2-13 | Authorized ticket; `job`/`visit` ids invalid, cross-ticket, or not readable to caller; or unknown `panel` | Safe fallback ticket render; **no** foreign content; no existence/authorization leak in copy |

---

## 8. Provisioning lesson (carry forward from DO-1)

DO-1 staging fixtures provisioned with **raw SQL inserts into `auth.users`** left GoTrue token columns **NULL**, which caused password-grant **500** (`confirmation_token` scan failure) until repaired to empty strings.

**DO-2 test-user rule:** provision technicians (and any co-fixtures) only via **supported Auth administration** — Supabase Auth Admin API / Dashboard “create user” (or project-approved helper that uses that API) — so GoTrue-owned columns receive the shapes Auth expects. **Do not** repeat malformed SQL-provisioned `auth.users` rows. Prefer the same empty-string token shape Auth uses for healthy users; verify password grant **200** before any workspace acceptance run.

---

## 9. Authorization sense (when later authorized)

| Allowed | Not allowed without a new decision |
|---------|-------------------------------------|
| Technician caller-scoped read helpers for §5 | New workflow states; dispatch/squads; notifications |
| Chips + matching lists + deep links with **focus handling** | DO-3 customer strip under DO-2 authorization |
| Distinct loading / empty / error | Successful **0** for unauthorized callers |
| Preserve R4-05 historical attending report access via header + getters | Exposing reassigned work to the wrong technician; `service_tickets` SELECT broadening |
| Smallest route/getter wiring if DO2-06 chain gaps appear | Scheduler / auto-generation |
| Cairo window default for upcoming only | |

---

## 10. Recommendation

**Publish this amended DO-2 proposal.** Do not implement until separately authorized. Do not remote-apply. Keep DO-3 and scheduler deferred. DO-1 staff strip and coverage/journey closeouts remain undisturbed.
