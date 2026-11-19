# Proposal — daily operations workspace (planning only)

**Status:** DO-1 locally implemented @ follow-on commit · staging/production apply, merge, FR-1, DO-2/DO-3, scheduler still **not** authorized  
**Proposal tip:** `4c828511` · **Base tip:** `187c49c9`  
**Local acceptance:** [`SERVICE_DAILY_OPS_DO1_LOCAL_ACCEPTANCE.md`](./SERVICE_DAILY_OPS_DO1_LOCAL_ACCEPTANCE.md)  
**Depends on (reuse, do not reopen):**  
Accepted B1–B7 ticket→job→visit→report→issue→ack→close path · Lane A/B/C closeouts · coverage/recurrence operational closeout COMPLETE @ `b65c4cd4` ([`COVERAGE_STAGING_CLOSEOUT.md`](./COVERAGE_STAGING_CLOSEOUT.md)) · journey-close join planning ([`SERVICE_ROUTINES_JOURNEY_CLOSE_MILESTONE_PROPOSAL.md`](./SERVICE_ROUTINES_JOURNEY_CLOSE_MILESTONE_PROPOSAL.md))  
**Does not begin:** squads · billing · stock · new workflow states · production release · remote schema apply · unattended coverage scheduler · **DO-2** · **DO-3**

**Rule:** Inventory existing screens first. Prefer count chips + deep links into accepted panels over new parallel journeys. **Count unit and matching filter population are defined together** — the chip integer equals the cardinality of the linked filtered set. Errors must never render as a successful **0**.

---

## 1. Existing screen inventory (reuse)

### 1.1 Role homes (already routed)

| Role | Home route | Host |
|------|------------|------|
| Admin | `/admin` (`?tab=…`) | `AdminDashboard.tsx` |
| Support | `/support/desk` | `SupportDeskPage.tsx` → `AdminTicketDashboard` |
| Technician | `/technician` | `TechnicianDashboard.tsx` |
| Customer | `/portal` (+ `/support` ticket list) | `CustomerPortal.tsx` / `CustomerSupport.tsx` |

Shared detail: `/support/tickets/:ticketId` → `TicketDetailPage.tsx` (jobs, visits, checklist, report, review, issued reports, ack, closure).

### 1.2 What already exists vs gaps

| Desired signal | Existing surface | Gap |
|----------------|------------------|-----|
| Overdue **service work** (generated) | Coverage schedule buckets under `/admin?tab=service-coverage` | No staff inbox of **generated** overdue occurrences tied to open tickets |
| **Unassigned jobs** | Per-ticket job panel; desk has unassigned **tickets** filter | No cross-ticket queue of `service_jobs.state = 'unassigned'` |
| Jobs **awaiting review** | Inline `ServiceReportReviewPanel` on a visit | No desk queue of `service_jobs.state = 'awaiting_review'` |
| Tickets **awaiting customer** | Status FSM includes `awaiting_customer` | No filtered queue / count chip |
| Tech / customer strips | See §3.2–3.3 | **DO-2 / DO-3 — explicitly deferred** |

### 1.3 Empty / error patterns to reuse

Short muted empty copy + `role="alert"` destructive errors + `Loader2` busy. Prefer that over a new EmptyState system. A failed count fetch shows error (or unavailable), **not** a green/zero chip.

---

## 2. Occurrence generation — current trigger model

| Question | Answer (as shipped) |
|----------|---------------------|
| How are occurrences created today? | **Operator-triggered** only: Admin/Support calls RPC `generate_machine_coverage_occurrences` from `ServiceMachineCoveragePanel` (“Generate”) or equivalent authenticated RPC. |
| Is there an unattended scheduler? | **No.** |
| Ungenerated schedule candidates | Visible via `list_machine_coverage_schedule` only; **excluded** from DO-1 overdue counts. |

**Decision boundary:** Generation remains a **separate manual action**. DO-1 overdue counts never auto-generate. Any unattended scheduler is a **separate** proposal.

---

## 3. Proposed product shape (thin)

**Working name:** Daily operations workspace (role worklists).

**Intent:** Role-scoped counts with one next-action link into existing workflows. No new ticket/job/visit/report states.

### 3.1 Admin / Support — DO-1 chip predicates (locked)

Host: `/support/desk` (+ `/admin?tab=support` if cheap).  
**Today** for date predicates = Africa/Cairo calendar date (`admin_private.cairo_today()` / equivalent).  
**Parent ticket open** = ticket `status` **not in** (`closed`, `cancelled`).

| Chip label | Count unit | Exact population (chip count = filter cardinality) | Destination |
|------------|------------|-----------------------------------------------------|-------------|
| Overdue service work | **Occurrences** (not distinct tickets) | Rows in `service_maintenance_occurrences` where `planned_due_date` **&lt;** Cairo today **and** linked `ticket_id` references a ticket whose status is not `closed`/`cancelled`. **Ungenerated** schedule candidates are **excluded**. | Filtered list of **that exact occurrence population** (each row links into the occurrence’s ticket / existing workflow). Generate is **not** this chip’s action. |
| Unassigned jobs | **Jobs** | Rows in `service_jobs` where `state = 'unassigned'` **and** parent ticket is not `closed`/`cancelled`. Includes jobs with no assignee (unassigned state is the predicate). | Filtered queue of **that exact job population** → ticket job-assignment UI. |
| Jobs awaiting review | **Jobs** (chip label must say jobs / awaiting review, not “reports” as the count unit) | Rows in `service_jobs` where `state = 'awaiting_review'` **and** parent ticket is not `closed`/`cancelled`. | Filtered queue of **that exact job population** → ticket → visit → review panel. |
| Awaiting customer | **Tickets** | Retained from base proposal: tickets with status **`awaiting_customer`** (the proposal’s named ticket predicate). | Filtered queue of **that exact ticket population** → `/support/tickets/:id`. |

**Together rule:** Opening a chip must show the same set the integer counted. No silent extra filters, no collapsing occurrences to tickets for the overdue chip.

### 3.2 Technician (DO-2 — deferred)

| Queue | Intent (not in DO-1) |
|-------|----------------------|
| Assigned jobs / upcoming visits / unfinished checklist or report | Deferred strip on `/technician`. **Out of DO-1 authorization.** |

### 3.3 Customer (DO-3 — deferred)

| Queue | Intent (not in DO-1) |
|-------|----------------------|
| Own status / issued reports / pending acknowledgment | Deferred strip on `/portal` or `/support`. **Out of DO-1 authorization.** |

### 3.4 Non-goals (explicit)

- Squads, billing, stock, new workflow states, production release.
- DO-2 / DO-3 implementation under a DO-1 authorization.
- Counting ungenerated coverage schedule candidates as overdue service work.
- Auto-calling `generate_machine_coverage_occurrences`.
- Returning misleading **0** (or partial staff data) to technician/customer callers.

---

## 4. Smallest useful UI slice — DO-1 only

**Slice DO-1 — Staff desk worklist strip**

1. On `/support/desk` (mirror on `/admin?tab=support` if cheap), render four **count chips** using §3.1 predicates.  
2. Chip click → filtered list of the **exact counted population** (id + title + one next-action into existing routes).  
3. Add only **minimum Admin/Support read helpers** for these four populations (no new mutate path).  
4. **Authorization (server-side, every new staff read helper):** caller must be Admin or Support. Technician or customer calls return **403**. Helpers must **not** return successful empty payloads, partial rows, or **0** counts to unauthorized callers.  
5. **Error vs empty:** load failure → error/`unavailable` UI (`role="alert"`); successful empty population → muted empty copy with chip **0**. These states are distinct.

**Explicitly deferred:** DO-2, DO-3.

---

## 5. Acceptance scenarios (planning matrix)

### 5.1 DO-1 — Staff desk

| ID | Scenario | Expected |
|----|----------|----------|
| DO-01 | Admin opens desk; all four populations empty | Four chips **0**; muted empties; **not** an error |
| DO-02 | Two generated occurrences overdue (Cairo), both tickets open; one closed-ticket overdue occurrence exists | Overdue chip = **2** (occurrence units); filter lists those two only; closed-ticket occurrence excluded |
| DO-03 | Ungenerated schedule candidates overdue by calendar | Overdue chip **unchanged**; candidates never counted; Generate remains separate manual control |
| DO-04 | `service_jobs.state = 'unassigned'` on open ticket; another unassigned job on cancelled ticket | Unassigned-jobs chip counts only the open-ticket job; destination list includes jobs without assignee |
| DO-05 | `service_jobs.state = 'awaiting_review'` on open ticket | Jobs-awaiting-review chip counts **jobs**; label and linked queue match that job population |
| DO-06 | Ticket `status = 'awaiting_customer'` | Awaiting-customer chip counts that ticket; link opens that ticket |
| DO-07 | Technician calls any new staff read helper | **403**; no chip data, no **0** success body |
| DO-08 | Customer calls any new staff read helper | **403**; same as DO-07 |
| DO-09 | Staff helper errors (DB/RPC failure) | UI error/unavailable; must **not** display successful zero counts |
| DO-10 | Chip navigation | Read-only list + links into existing workflows; no ticket/job/occurrence creates |

### 5.2 Deferred increments (not DO-1)

| ID | Scenario | Slice |
|----|----------|-------|
| DO-11…DO-14 | Tech/customer strip scenarios from base proposal | **DO-2 / DO-3 only** — not accepted under DO-1 |

### 5.3 Generation / scheduler boundary

| ID | Scenario | Expected |
|----|----------|----------|
| DO-G1 | Staff views overdue chip without Generate | Counts/list only; **no** new occurrences |
| DO-G2 | Staff uses existing coverage Generate control | Operator-triggered RPC; workspace does not auto-call it |
| DO-G3 | Docs review | Ungenerated candidates excluded; unattended scheduler separate decision |

---

## 6. Authorization sense (when DO-1 later authorized)

| Allowed | Not allowed without a new decision |
|---------|-------------------------------------|
| Admin/Support-only read helpers for the four §3.1 populations | New workflow states; DO-2/DO-3 scope |
| Chips + matching filtered lists + deep links | 200 OK with empty/zero payload for tech/customer |
| Distinct error vs empty-zero UI | Silent/unattended occurrence generation |
| Reuse of existing ticket/job/visit/review panels | Squads, billing, stock, production release |

---

## 7. Recommendation

**Publish this amended DO-1 proposal only.** Do not implement until separately authorized. Keep DO-2/DO-3 deferred. Coverage closeout at `b65c4cd4` and L1–L4 remain undisturbed. Generation stays operator-triggered.
