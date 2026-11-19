# Proposal — DO-2 technician daily ops workspace (planning only)

**Status:** Planning only · **not** authorized to implement · **not** remote-applied · **not** merge · **not** production  
**Parent:** [`SERVICE_DAILY_OPERATIONS_WORKSPACE_PROPOSAL.md`](./SERVICE_DAILY_OPERATIONS_WORKSPACE_PROPOSAL.md) (DO-1 staff strip accepted / staging-passed separately)  
**Depends on (reuse, do not reopen):** B2 assignment · B3 visits · Lane B pins · Lane C checklist · B4 report submit · B5 return/issue · narrow technician ticket header (`get_technician_ticket_header` / T-G1) · DO-1 empty/error/count=filter rules  
**Does not begin:** new workflow states · dispatch/squads · notifications · **DO-3** · coverage scheduler · production · remote schema apply

**Rule (same as DO-1):** Count unit and matching filter population are defined together. Chip integer = cardinality of the linked filtered set. Errors must never render as a successful **0**. Viewing the workspace creates or changes nothing.

---

## 1. Intent

Add a **read-only technician worklist strip** on the existing `/technician` home that surfaces three caller-scoped queues and deep-links into **existing** ticket/job/visit/checklist/report panels and governed actions. No parallel technician journey.

---

## 2. Existing surfaces to reuse

| Surface | Route / API | Role in DO-2 |
|---------|-------------|--------------|
| Technician home | `/technician` → `TechnicianDashboard.tsx` | Host for chips + filtered lists |
| Ticket detail | `/support/tickets/:ticketId` → `TicketDetailPage.tsx` | Destination shell |
| Narrow ticket header | RPC `get_technician_ticket_header` | Technician page gate (no full-row `service_tickets` SELECT) |
| Jobs / visits | `ServiceJobAssignmentPanel`, `ServiceVisitPanel` | Assigned work + visit actions |
| Checklist | `ServiceVisitChecklistPanel` / `get_visit_checklist_workspace` | Lane C capture while visit `in_progress` |
| Report submit | `ServiceReportPanel` / `submit_service_report_revision` | B4 submit / post-return resubmit |
| Job list helper (today) | `listServiceJobsForTechnician` | Reference for assignment ∪ historical-attendance reachability — DO-2 **must not** conflate those sets in one chip |

**Deep-link contract (minimal):**  
`/support/tickets/:ticketId?job=:jobId&visit=:visitId&panel=visit|checklist|report`  
Implementation may add cheap focus/scroll onto existing `data-testid` mounts. If focus params are not yet honored, the ticket route that already mounts those panels remains the destination — **no new pages**.

---

## 3. Timezone and default upcoming window (recommendation)

| Setting | Locked recommendation | Rationale |
|---------|----------------------|-----------|
| Timezone | **Africa/Cairo** | Align with DO-1 `admin_private.cairo_today()` / staff desk “today” |
| `as_of` | Cairo calendar date; default = Cairo today; optional read param only | Viewing must not mutate |
| Upcoming window | Cairo calendar dates **`[as_of, as_of + 7 days]` inclusive** (8 dates) | “Today plus one week ahead” — small default, operator-overridable later without schema change |
| Visit date used | `timezone('Africa/Cairo', scheduled_start)::date` | `scheduled_start` is timestamptz |

Window filters **Upcoming visits only**. Assigned-jobs and Needs-attention are not window-bounded (they are open-work queues).

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
| Sort | `updated_at` DESC, then `job_sequence` ASC |
| Destination | `/support/tickets/:ticketId?job=:jobId` → existing job/visit panels |
| Eligibility note | Current assignment only. Historical attendance alone does **not** enter this chip. |

### 5.2 Upcoming visits

| Field | Value |
|-------|-------|
| Count unit | **Visits** |
| Population | `service_job_visits` where `state = 'scheduled'` **and** parent job `assigned_technician_id = caller` **and** parent ticket open **and** Cairo date of `scheduled_start` ∈ `[as_of, as_of + 7 days]` |
| Sort | `scheduled_start` ASC, then `visit_sequence` ASC |
| Destination | `/support/tickets/:ticketId?job=:jobId&visit=:visitId&panel=visit` → `ServiceVisitPanel` (schedule/start governed actions) |
| Eligibility note | **Current assignment**, not attendance. A scheduled visit left with a stale `attending_technician_id` after reassignment follows the **new** assignee via the job FK, not the old attendee. |

### 5.3 Needs attention (composite visit queue)

| Field | Value |
|-------|-------|
| Count unit | **Visits** (distinct; a visit appears **once** even if multiple reasons apply) |
| Population | Union of the subtypes below, de-duplicated by `visit.id` |
| Sort | Reason priority (Report revision → Report submit → In-progress / checklist → Overdue scheduled), then `scheduled_start` ASC NULLS LAST, then `visit_sequence` ASC |
| Destination | Same ticket URL with `panel` set to the **primary** reason’s action |

#### Subtypes (eligibility + next action)

| Reason code | Visit / job predicate | Primary `panel` | Governed action (existing) |
|-------------|----------------------|-----------------|----------------------------|
| `overdue_scheduled` | `state = 'scheduled'` **and** `scheduled_end < now()` **and** job `assigned_technician_id = caller` **and** ticket open **and** job not terminal | `visit` | Start / reschedule via B3 visit RPCs |
| `in_progress_or_checklist` | `state = 'in_progress'` **and** `attending_technician_id = caller` **and** ticket open **and** job not terminal | `checklist` if active pin present, else `visit` | Lane C checklist capture / B3 complete |
| `report_submit` | `state = 'completed'` **and** `attending_technician_id = caller` **and** job `state = 'in_progress'` **and** **no** row in `service_report_revisions` for that visit’s report **and** ticket open | `report` | B4 `submit_service_report_revision` |
| `report_revision` | `state = 'completed'` **and** `attending_technician_id = caller` **and** job `state = 'in_progress'` **and** latest review on the latest revision has `decision = 'returned'` **and** ticket open | `report` | B4 resubmit after B5 return |

**Primary reason when multiple match:** `report_revision` > `report_submit` > `in_progress_or_checklist` > `overdue_scheduled`.

**Terminal job states** for exclusion: `completed`, `cancelled`, `waived`.  
Visits in `aborted` / `no_access` are **out** of Needs attention (no new states; reopen/schedule remains an existing staff path, not this chip).

---

## 6. UI / RPC shape (thin)

**Slice DO-2 — Technician worklist strip**

1. On `/technician`, render three count chips using §5 predicates (`as_of` + upcoming window defaults per §3).  
2. Chip click → filtered list of the **exact** counted population (id + title/when + reason + one next-action link).  
3. Add only **minimum technician read helpers** for these three populations (SECURITY DEFINER or equivalent; **no** new mutate path; helpers must not write).  
4. **Authorization:** caller must be able to act as technician subject (`role = technician`, or existing staff role opening the route still filtered to `auth.uid()`). Customer → **403** with distinct authz detail (never 200-zero).  
5. **Error vs empty vs loading:**  
   - Loading → busy indicator; no chips pretending to be zero.  
   - Success empty → muted empty copy; chips show **0**.  
   - Failure / 403 → `role="alert"` error/unavailable; **no** successful zero counts.  
6. Reuse DO-1 strip interaction patterns where cheap (`StaffDailyOpsStrip` lessons), but keep a **technician-specific** component (different populations/authz).

**Explicit non-goals:** new job/visit/report states · dispatch/squads · push/email notifications · DO-3 customer strip · scheduler / auto-generate · broadening `service_tickets` SELECT for technicians beyond the narrow header.

---

## 7. Acceptance scenarios (focused)

| ID | Scenario | Expected |
|----|----------|----------|
| DO2-01 | Technician with no assigned open jobs, no windowed scheduled visits, no needs-attention visits | Three chips **0**; muted empties; **not** an error |
| DO2-02 | Two jobs assigned to caller on open tickets (`planned` / `in_progress`); one assigned job on cancelled ticket; one completed assigned job | Assigned-jobs chip = **2**; list matches those two only |
| DO2-03 | Three scheduled visits for caller’s assigned jobs: Cairo dates `as_of−1`, `as_of+3`, `as_of+8` | Upcoming chip = **1** (only `as_of+3`); sorted by `scheduled_start` |
| DO2-04 | Default window uses Africa/Cairo; `as_of` omitted | Window = Cairo today through today+7 inclusive; no writes |
| DO2-05 | Job reassigned from Tech A → Tech B; scheduled future visit remains on job | A’s Assigned + Upcoming drop that job/visit; B’s Upcoming gains it; neither chip uses stale attendance alone |
| DO2-06 | Tech A completed a visit; job reassigned to Tech B before report submit | Needs-attention **report_submit** remains on **A** (attending); **B** does **not** see that visit for report submit; A retains ticket-header/report access |
| DO2-07 | Visit `in_progress`, attending = caller, active pin | Needs-attention counts the visit once; primary link `panel=checklist` |
| DO2-08 | Completed visit, attending = caller, no revisions, job `in_progress` | Needs-attention `report_submit` → report panel |
| DO2-09 | Latest review `returned`, job `in_progress`, attending = caller | Needs-attention `report_revision` → report panel; still one visit row |
| DO2-10 | Customer calls any new DO-2 read helper | **403**; no chip data; no **0** success body |
| DO2-11 | Helper/RPC failure | Error/unavailable UI; must **not** show successful zero counts |
| DO2-12 | Technician opens strip / expands queues / follows links | **Read-only** regarding creates: no new tickets, jobs, visits, revisions, reviews, or assignments from viewing |

---

## 8. Provisioning lesson (carry forward from DO-1)

DO-1 staging fixtures provisioned with **raw SQL inserts into `auth.users`** left GoTrue token columns **NULL**, which caused password-grant **500** (`confirmation_token` scan failure) until repaired to empty strings.

**DO-2 test-user rule:** provision technicians (and any co-fixtures) only via **supported Auth administration** — Supabase Auth Admin API / Dashboard “create user” (or project-approved helper that uses that API) — so GoTrue-owned columns receive the shapes Auth expects. **Do not** repeat malformed SQL-provisioned `auth.users` rows. Prefer the same empty-string token shape Auth uses for healthy users; verify password grant **200** before any workspace acceptance run.

---

## 9. Authorization sense (when later authorized)

| Allowed | Not allowed without a new decision |
|---------|-------------------------------------|
| Technician caller-scoped read helpers for §5 | New workflow states; dispatch/squads; notifications |
| Chips + matching lists + deep links into existing panels | DO-3 customer strip under DO-2 authorization |
| Distinct loading / empty / error | Successful **0** for unauthorized callers |
| Preserve R4-05 historical attending report access | Exposing reassigned work to the wrong technician |
| Cairo window default for upcoming only | Scheduler / auto-generation |

---

## 10. Recommendation

**Publish this DO-2 proposal only.** Do not implement until separately authorized. Do not remote-apply. Keep DO-3 and scheduler deferred. DO-1 staff strip and coverage/journey closeouts remain undisturbed.
