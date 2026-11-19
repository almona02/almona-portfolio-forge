# Proposal — daily operations workspace (planning only)

**Status:** Committed proposal · **not** authorized for implementation, migrations, staging/production apply, merge, or FR-1  
**Depends on (reuse, do not reopen):**  
Accepted B1–B7 ticket→job→visit→report→issue→ack→close path · Lane A/B/C closeouts · coverage/recurrence operational closeout COMPLETE @ `b65c4cd4` ([`COVERAGE_STAGING_CLOSEOUT.md`](./COVERAGE_STAGING_CLOSEOUT.md)) · journey-close join planning ([`SERVICE_ROUTINES_JOURNEY_CLOSE_MILESTONE_PROPOSAL.md`](./SERVICE_ROUTINES_JOURNEY_CLOSE_MILESTONE_PROPOSAL.md))  
**Does not begin:** squads · billing · stock · new workflow states · production release · remote schema apply · unattended coverage scheduler

**Rule:** Inventory existing screens first. Prefer count chips + deep links into accepted panels over new parallel journeys. Later green suites do not invent automation that was never shipped.

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
| Due / overdue **maintenance** | Admin `/admin?tab=service-coverage` schedule buckets (`upcoming` / `due` / `overdue`) via `list_machine_coverage_schedule` | No staff **inbox** of overdue maintenance; coverage tab only |
| **Unassigned jobs** | Per-ticket `ServiceJobAssignmentPanel` job state; desk has **unassigned tickets** filter | No cross-ticket **unassigned-jobs** worklist |
| **Reports awaiting review** | Inline `ServiceReportReviewPanel` on a visit | No desk/admin queue of pending manager reviews |
| Tickets **awaiting customer response** | Status FSM includes `awaiting_customer` | No filtered queue / count chip |
| Tech **assigned jobs** | `/technician` “My service jobs” | No due / upcoming prioritization strip |
| Tech **upcoming visits** | Visits nested under each job | No upcoming-visits queue |
| Tech **unfinished checklist / report** | Only when visit opened | No unfinished-work count |
| Customer **own status** | `/support` ticket stats + `/portal` | Partial |
| Customer **issued reports / pending ack** | Per-ticket `CustomerIssuedReportsSection` / ack panel | No portal **pending acknowledgment** inbox |

### 1.3 Empty / error patterns to reuse

Short muted empty copy + `role="alert"` destructive errors + `Loader2` busy (desk/tech/customer/coverage panels). Prefer that over a new EmptyState system.

---

## 2. Occurrence generation — current trigger model

| Question | Answer (as shipped) |
|----------|---------------------|
| How are occurrences created today? | **Operator-triggered** only: Admin/Support calls RPC `generate_machine_coverage_occurrences` from `ServiceMachineCoveragePanel` (“Generate”) or equivalent authenticated RPC. |
| Is there an unattended scheduler? | **No.** No coverage cron, queue worker, or background job generates occurrences. Unrelated `AutomationScheduler` is not coverage generation. |
| List/schedule without write? | `list_machine_coverage_schedule` is read-only; does not create work. |

**Decision boundary:** Any unattended / scheduled generator is a **separate** proposal. This workspace proposal must **not** imply automation already exists; daily-ops “due/overdue maintenance” counts may link into the existing coverage schedule / generate UI, but generation remains an explicit operator action until separately authorized.

---

## 3. Proposed product shape (thin)

**Working name:** Daily operations workspace (role worklists).

**Intent:** On each role home, show **role-scoped counts** for the queues above, with **one next-action link** per row into an **existing** workflow surface. No new ticket/job/visit/report states. No squads/billing/stock. External notifications deferred unless already implemented (none assumed for these queues).

### 3.1 Admin / Support (host: `/support/desk` + `/admin?tab=support`)

| Queue | Count semantics (planning) | Next-action target (existing) |
|-------|----------------------------|-------------------------------|
| Due / overdue maintenance | Occurrences or schedule rows with bucket `due` / `overdue` visible to staff | Deep link to `/admin?tab=service-coverage` (schedule / generate) or ticket opened from occurrence when already generated |
| Unassigned jobs | Jobs with no assigned technician on activated workflow tickets | `/support/tickets/:id` → job assignment panel |
| Reports awaiting review | Submitted revisions awaiting manager review | `/support/tickets/:id` → visit → report review panel |
| Tickets awaiting customer | Tickets in `awaiting_customer` (or equivalent accepted status) | `/support/tickets/:id` |

### 3.2 Technician (host: `/technician`)

| Queue | Count semantics | Next-action target |
|-------|-----------------|--------------------|
| Assigned jobs | Jobs assigned to caller (already listed) | Existing job row / ticket detail |
| Upcoming visits | Visits scheduled for caller in a near window | Visit panel on that job |
| Unfinished checklist / report | In-progress visits missing checklist complete or report submit | Checklist / report panel |

### 3.3 Customer (host: `/portal` or `/support`)

| Queue | Count semantics | Next-action target |
|-------|-----------------|--------------------|
| Own service status | Open / in-progress owned tickets (reuse stats) | Ticket detail |
| Issued reports | Issued revisions on owned tickets | Issued report view |
| Pending acknowledgment | Issued revisions without customer disposition | Ack panel on that ticket |

### 3.4 Non-goals (explicit)

- Squads, billing, stock, new workflow states, production release.
- Replacing ticket desk, tech dashboard, or coverage admin with a second full app.
- Claiming unattended occurrence generation.
- External email/SMS/push for these queues (deferred unless an existing channel already covers a specific row).

---

## 4. Smallest useful UI slice (recommended first increment)

**Slice DO-1 — Staff desk worklist strip**

1. On `/support/desk` (and mirrored on `/admin?tab=support` if cheap), render four **count chips** with empty and error states:
   - Overdue maintenance  
   - Unassigned jobs  
   - Reports awaiting review  
   - Awaiting customer  
2. Chip click → filtered list (same page or light drawer) of **id + title + one next-action** link into existing ticket/coverage routes.  
3. Reuse existing RPCs / queries where they already exist; add only the **minimum read helpers** needed for cross-ticket counts (no new mutate path).  
4. Authz: admin/support only; technicians/customers must not see staff chips.

**Deferred to later increments (still this proposal’s scope map, not DO-1):**

- DO-2 — Technician upcoming visits + unfinished checklist/report strip on `/technician`.  
- DO-3 — Customer pending-acknowledgment strip on `/portal` or `/support`.

DO-1 alone is useful: support can see what needs attention without hunting tickets. Tech/customer strips reuse the same pattern after DO-1 acceptance.

---

## 5. Acceptance scenarios (planning matrix)

### 5.1 DO-1 — Staff desk (smallest slice)

| ID | Scenario | Expected |
|----|----------|----------|
| DO-01 | Admin opens `/support/desk` with zero queue items | Four chips show **0**; each empty state is a short muted line (no error) |
| DO-02 | Support opens desk with ≥1 overdue maintenance row | Overdue chip count ≥1; next-action reaches coverage schedule or linked ticket without a new workflow |
| DO-03 | Unassigned job exists on an activated ticket | Unassigned-jobs chip ≥1; next-action opens that ticket’s job assignment UI |
| DO-04 | Submitted revision awaits manager review | Reports-awaiting-review chip ≥1; next-action opens ticket → visit → review panel |
| DO-05 | Ticket in awaiting-customer | Awaiting-customer chip ≥1; next-action opens that ticket |
| DO-06 | Technician opens `/support/desk` or staff strip API | **Denied** / chips absent (role-scoped) |
| DO-07 | Customer attempts staff queue API | **Denied** |
| DO-08 | Staff queue query fails | `role="alert"` error; Refresh/retry; no false zeros claimed as success |
| DO-09 | Chip navigation does not create tickets/jobs/occurrences | Read-only list + links; generate remains explicit on coverage UI |

### 5.2 Later increments (specify, do not implement now)

| ID | Scenario | Slice |
|----|----------|-------|
| DO-10 | Tech sees upcoming visit count and opens visit panel | DO-2 |
| DO-11 | Tech sees unfinished checklist/report and resumes | DO-2 |
| DO-12 | Customer sees pending ack count and completes ack on issued revision | DO-3 |
| DO-13 | Customer other cannot see owner’s pending ack rows | DO-3 |

### 5.3 Generation / scheduler boundary checks

| ID | Scenario | Expected |
|----|----------|----------|
| DO-G1 | Staff views overdue maintenance with no generate click | Counts/list only; **no** new occurrences |
| DO-G2 | Staff uses existing coverage Generate control | Still operator-triggered RPC; workspace does not auto-call it |
| DO-G3 | Proposal review | Document states unattended scheduler is **out of scope** / separate decision |

---

## 6. Authorization sense (when later authorized)

| Allowed under a future implementation authorization | Not allowed without a new decision |
|-----------------------------------------------------|-------------------------------------|
| Read-only aggregation queries / RPCs for role-scoped counts | New ticket/job/visit/report states |
| UI chips + lists + deep links on existing role homes | Squads, billing, stock, production release |
| Reuse of existing panels for next actions | Silent/unattended occurrence generation |
| Empty/error states matching desk/tech patterns | External notification fan-out (unless already implemented for that path) |

---

## 7. Recommendation

**Commit this proposal only.** Do not implement DO-1 until separately authorized. Coverage/recurrence remains closed at `b65c4cd4` with L1–L4 preserved. Treat occurrence generation as **operator-triggered** until a dedicated scheduler proposal is accepted.
