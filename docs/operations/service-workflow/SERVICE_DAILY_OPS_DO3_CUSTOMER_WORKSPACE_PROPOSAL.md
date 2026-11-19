# Proposal — DO-3 customer daily ops workspace (planning only)

**Status:** Planning published · **not** authorized for implementation · **not** remote apply · **not** production · **not** merge · **not** scheduler  
**Amends:** `3a061646` / `4431366e` — resolves **B-DO3-1** (latest customer-visible issued head per report)  
**Proposal tip:** `fd0387c88b265a24dbd6b966d2cbc94b2e916539`
**Parent:** [`SERVICE_DAILY_OPERATIONS_WORKSPACE_PROPOSAL.md`](./SERVICE_DAILY_OPERATIONS_WORKSPACE_PROPOSAL.md)  
**Depends on (reuse, do not reopen):** B5 owner issued-report access · `admin_private.revision_is_customer_visible` · `get_service_report_for_visit` · B6 `effective_acknowledgment` / customer `accepted`/`refused` · B7 customer isolation · DO-1 empty/error/count=filter rules · DO-2 deep-link focus pattern on `/support/tickets/:ticketId` (extend for customer panels only) · coverage schedule RPC own-machine customer read ([`COVERAGE_RECURRENCE_BINDING_CHOICES.md`](./COVERAGE_RECURRENCE_BINDING_CHOICES.md)) · DO-2 staging closeout ([`DO2_STAGING_CLOSEOUT.md`](./DO2_STAGING_CLOSEOUT.md))  
**Does not begin:** new acknowledgment rules · notification delivery · billing · stock · squads · coverage scheduler / auto-generate · changing recurrence / pause / end behavior · new workflow states · production · remote schema apply · permission broadening · reopening B5/B6/B7 contracts

**Rule (same as DO-1 / DO-2):** Count unit and matching filter population are defined together. Chip integer = cardinality of the linked filtered set. Errors must never render as a successful **0**. **Viewing the workspace creates or changes nothing.**

---

## 1. Intent

Add a **read-only customer worklist strip** on the existing customer home (`/portal`, with optional mirror affordance on `/support` ticket list if cheap) that surfaces four caller-scoped queues and deep-links into **existing** ticket / issued-report / acknowledgment surfaces and **existing** B6 accept/refuse actions. No parallel customer journey. No new ack semantics.

---

## 2. Existing surfaces to reuse

| Surface | Route / API | Role in DO-3 |
|---------|-------------|--------------|
| Customer home | `/portal` → `CustomerPortal.tsx` | Host for chips + filtered lists |
| Customer support list | `/support` → `CustomerSupport.tsx` | Optional secondary host / entry to tickets |
| Ticket detail | `/support/tickets/:ticketId` → `TicketDetailPage.tsx` | Destination shell + **customer focus** (§3) |
| Issued reports UI | `CustomerIssuedReportsSection` / `CustomerIssuedReportView` | Mounts getter output; chips count **visible heads only** (§5.2) |
| Acknowledgment UI | `CustomerReportAcknowledgmentPanel` + `recordServiceAcknowledgment` | Existing accept / refuse only |
| Visibility helper | `admin_private.revision_is_customer_visible(revision_id)` | **Source of truth** for which issued revision is the customer-visible head **per `service_reports` row** |
| Report getter | `get_service_report_for_visit` | Customer path filters revisions with the same helper (unissued / superseded issued omitted) |
| Effective ack | `effective_acknowledgment` / `getEffectiveAcknowledgment` | Outstanding vs settled on the **visible head** |
| Coverage schedule | `list_machine_coverage_schedule` | Own-machine rows; DO-3 filters to `bucket ∈ {upcoming, due}` only |

---

## 3. Deep-link + focus contract (DO-3 extension)

**URL shape (customer destinations):**  
`/support/tickets/:ticketId?visit=:visitId&panel=issued&revision=:revisionId`

| Parameter | Meaning |
|-----------|---------|
| `ticketId` | Route ticket; must be readable to caller as **owner** (`service_tickets.user_id = caller`) |
| `visit` | Optional focus visit id (`service_job_visits.id`) whose issued-report mount should expand |
| `panel` | DO-3 uses **`issued`** only. DO-2 values `visit` \| `checklist` \| `report` remain staff/technician paths; customers must not be sent those panels by DO-3 chips |
| `revision` | Optional exact **customer-visible head** revision id (`service_report_revisions.id` where `revision_is_customer_visible`) |

**Required UI behavior:**

1. After the page gate succeeds for the owner, resolve `visit` / `revision` **only** through authorized customer-visible data (owner ticket + `revision_is_customer_visible` / getter).
2. On a valid match: expand card `data-testid="customer-issued-reports-card"`, land in `customer-issued-reports-section`, focus block `customer-issued-revision-{revision_number}`, and scroll `customer-ack-panel` (with `customer-ack-accept` / `customer-ack-refuse`) into view when `revision` is set.
3. **Invalid, unknown, cross-ticket, superseded, unissued, or unauthorized** params → **safe fallback**: authorized ticket shell without focused expansion; **no** copy that reveals foreign existence/authorization.
4. Missing optional params → normal ticket render (issued card if owner).
5. Reload / auth-return must preserve the query string the same way DO-2 focus preservation does for its params (pathname + search intact through auth return).
6. No new pages; focus is wiring on the existing route only.

---

## 4. Timezone (recommendation)

| Setting | Locked recommendation |
|---------|----------------------|
| Timezone | **Africa/Cairo** (align DO-1 / DO-2 / coverage) |
| `as_of` | Cairo calendar date; default = Cairo today; optional read param only (`p_as_of` on existing schedule RPC) |
| Upcoming schedule window | Same classification `list_machine_coverage_schedule` uses for buckets `upcoming` and `due` at that `as_of` — **do not** invent a second calendar rule |

---

## 5. Chip predicates (locked)

**Caller** = authenticated customer (`auth.uid()`) who **owns** the ticket (`service_tickets.user_id = caller`) or **owns** the machine (`machines.owner_id = caller`) for schedule rows.  
**Parent ticket open (active)** = ticket `status` **not in** (`closed`, `cancelled`).  
Admin/support opening `/portal` (if allowed by route) still sees **caller-scoped** data for their own uid — never an all-customers desk. Technician / foreign customer → **403** on any new DO-3 read helper (no successful empty/zero body).

### 5.0 Visible issued head (shared definition — B-DO3-1)

**Visible population** = set of `service_report_revisions` rows `r` such that:

1. Parent ticket `user_id = caller`, and  
2. `admin_private.revision_is_customer_visible(r.id)` is true.

That helper already means: `r` has a review with `decision = 'approved_issued'`, and **no later issued** revision exists on the **same** `r.report_id` (ordered by `revision_number`, then `id`). Therefore:

| Fact | Consequence for both report chips |
|------|-----------------------------------|
| One head per report | Count unit is **visible head revisions** — at most **one** per `service_reports.id` |
| Multiple visits | Each visit’s report may contribute **its own** head → multiple heads on one ticket |
| Revision 2 issues | Revision 1 **leaves** the visible population (superseded); chips drop rev 1 |
| Pending / returned / unissued correction | Does **not** displace the currently issued head; head stays counted until a newer revision is **approved_issued** |
| Getter alignment | Same predicate the customer path of `get_service_report_for_visit` uses — chips must not invent a broader “all historical issued” set |

### 5.1 My active tickets

| Field | Value |
|-------|-------|
| Count unit | **Tickets** |
| Population | `service_tickets` where `user_id = caller` **and** `status` **not in** (`closed`, `cancelled`) |
| List fields | `id` · `title` · **`status`** (clear badge/text) · `updated_at` |
| Sort | `updated_at` DESC, then `id` ASC |
| Destination | `/support/tickets/:ticketId` (no focus required) |
| After closure | Ticket **leaves** this chip when `status` becomes `closed` or `cancelled`. |

### 5.2 Issued reports available to read

| Field | Value |
|-------|-------|
| Count unit | **Visible head revisions** (one per report) |
| Population | Exactly the **§5.0 visible population** |
| Latest-issued vs pending-revision | Count **only** the current customer-visible issued head per `report_id`. When a newer revision is `approved_issued`, the prior head **leaves** this chip. A pending, draft, or `returned` revision **does not** remove or replace the current head. |
| Exclusions | Superseded issued revisions · unissued drafts · returned-only revisions · staff-only review comments · internal notes · checklist attempt history |
| Sort | Head `submitted_at` DESC, then `revision_number` DESC, then `id` ASC |
| Destination | `/support/tickets/:ticketId?visit=:visitId&panel=issued&revision=:revisionId` where `revisionId` is the **visible head** → anchors in §3 |
| After acknowledgment | Head **stays** in this chip (ack is not a visibility gate). |
| After ticket closure | Head **stays** while still §5.0-visible on an owned ticket (including closed). Mutate affordances follow existing B6 UI — **no new rules**. |

### 5.3 Reports awaiting my acknowledgment

| Field | Value |
|-------|-------|
| Count unit | **Visible head revisions** |
| Population | Subset of **§5.0** where `effective_acknowledgment(revision_id)` **IS NULL** (no effective `accepted` / `refused` / `unavailable`) |
| Link target | Same URL as §5.2 so existing **Accept** / **Refuse** (`customer-ack-accept` / `customer-ack-refuse`) are in view |
| Exclusions | Heads with any effective acknowledgment (including staff `unavailable`) · any revision **not** in §5.0 (superseded, unissued, foreign) |
| Sort | Oldest outstanding first: head `submitted_at` ASC, then `id` ASC |
| After customer `accepted` or `refused` | Head **leaves** this chip; remains in §5.2 |
| After staff `unavailable` | Head **leaves** this chip; late append stays an existing ticket-page B6 path — **not** re-queued here |
| After supersession | When rev 2 issues, **rev 1 leaves both chips**. Awaiting-ack for the report is evaluated **only** against rev 2 (null → counts; settled → excluded). Prior ack on rev 1 does **not** auto-settle rev 2 (existing B6: ack attaches to exact issued revision). |
| After ticket closure | Outstanding §5.0 heads remain in this chip until effective ack exists; DO-3 does not add respond paths. |

**Non-goal reminder:** DO-3 does **not** change when acknowledgment is required, refusal comment rules, unavailable policy, or closure prerequisites.

### 5.4 Upcoming service (own machines only)

| Field | Value |
|-------|-------|
| Count unit | **Schedule rows** (`items[]` from `list_machine_coverage_schedule`) |
| Population | Rows for machines **owned by caller** whose `bucket` at Cairo `as_of` is **`upcoming` or `due`**. **Overdue** remains out of this chip. |
| Paused coverage | **Remain visible.** The existing schedule RPC returns rows for coverages regardless of `coverage_status` (`active` / `paused` / `ended` as emitted today) and includes `coverage_status` on each item. DO-3 **must not** filter out `paused` (or otherwise alter recurrence classification). If a paused coverage still yields `upcoming`/`due` rows from the RPC, they **count**. |
| Recurrence | **Unchanged** — no new cadence, horizon, pause/resume, or generate behavior. |
| Row fields to surface | `coverage_id` · `machine_id` · `sequence` · `planned_due_date` · `bucket` · `coverage_status` · `generated` · `ticket_id` · `job_id` |
| Destination | Filtered read-only list on `/portal`. If `ticket_id` is present and owned/readable, offer `/support/tickets/:ticketId`. Otherwise machine/schedule summary only — **no** create/generate. |
| Viewing | Must **not** call `generate_machine_coverage_occurrences` or any coverage manage RPC. |

---

## 6. Count-to-destination agreement

| Chip | Integer equals | Destination list must show |
|------|----------------|----------------------------|
| Active tickets | Cardinality of §5.1 | Exactly those tickets (`id`, `title`, `status`) |
| Issued reports | Cardinality of §5.0 | Exactly those **visible heads** (ticket + visit + report + revision identity) |
| Awaiting acknowledgment | Cardinality of §5.3 | Exactly those outstanding heads; each link lands on existing accept/refuse |
| Upcoming service | Cardinality of §5.4 | Exactly those schedule rows |

### 6.1 Exact assertions — supersession (B-DO3-1)

| Step | Issued-reports count | Awaiting-ack count | Destination must include / exclude |
|------|---------------------:|-------------------:|------------------------------------|
| Report A: only rev 1 `approved_issued`; effective ack null | **1** (rev 1) | **1** (rev 1) | List/link **rev 1** only |
| Correction draft / `returned` rev 2 exists; rev 1 still head | **1** (rev 1) | **1** if still null else **0** | Still **rev 1**; rev 2 **absent** |
| Rev 2 `approved_issued` (supersedes); rev 2 ack null | **1** (rev 2) | **1** (rev 2) | **rev 2** only; **rev 1 excluded** from both chips and both destination lists |
| Customer accepts rev 2 | **1** (rev 2) | **0** | Issued list still **rev 2**; awaiting list empty |

### 6.2 Exact assertions — multi-visit / multi-report

| Fixture | Issued-reports count | Awaiting-ack (both heads null) | Destination |
|---------|---------------------:|-------------------------------:|-------------|
| Ticket T: visit V1 report R1 head rev1; visit V2 report R2 head rev1 | **2** | **2** | Two rows — `(T,V1,R1,rev1)` and `(T,V2,R2,rev1)`; never collapsed to one ticket row for these chips |
| Same, then R1 gets rev2 issued; R2 unchanged | **2** (R1→rev2, R2→rev1) | **2** if both heads null | R1 destination uses **rev2**; R1 rev1 absent |

Opening a chip must show the same set the integer counted. No silent extra filters; no counting superseded issued revisions; no collapsing multiple reports to one ticket for chips whose unit is visible heads.

---

## 7. Loading / error / empty / isolation

| State | UI |
|-------|----|
| Loading | Busy indicator; **do not** paint chips as **0** |
| Success empty | Muted empty copy; chips show **0** |
| Failure / 403 | `role="alert"` error/unavailable; **never** successful zero |
| Customer isolation | Helpers return **only** caller-owned tickets / machines / §5.0 heads. Foreign ids → omitted or safe fallback; never leak existence |
| Unauthorized role | Technician (and non-owner) calling new DO-3 helpers → **403** with distinct authz detail; no **200**-empty success body |
| View-only | Expanding chips, following links, and rendering lists perform **no** inserts/updates/deletes and do not trigger generation |

---

## 8. UI / RPC shape (thin) — implementation notes

**Slice DO-3 — Customer worklist strip**

1. On `/portal`, render four count chips using §5 predicates.  
2. Chip click → filtered list of the **exact** counted population + one next-action link (§3 / §5).  
3. Add only **minimum customer read helpers** (SECURITY DEFINER or equivalent; **no** new mutate path; helpers must not write). Compose:
   - tickets: `service_tickets.user_id`, `status`, `title`, `updated_at`
   - report chips: `revision_is_customer_visible` (+ `effective_acknowledgment` for §5.3) — **do not** reimplement supersession with ad-hoc `MAX(revision_number)` that disagrees with the helper
   - schedule: existing `list_machine_coverage_schedule(p_as_of, …)` then filter `bucket` client- or helper-side to `upcoming`∪`due` **without** dropping `coverage_status = 'paused'`
4. Implement §3 focus using these anchors only:
   - `customer-issued-reports-card`
   - `customer-issued-reports-section`
   - `customer-issued-revision-{revision_number}`
   - `customer-ack-panel` / `customer-ack-accept` / `customer-ack-refuse`
5. Reuse DO-1/DO-2 strip interaction patterns where cheap; keep a **customer-specific** component.

**Explicit non-goals:** new acknowledgment responses · push/email/SMS · billing · stock · squads · scheduler · auto-generate · changing pause/resume/end recurrence · staff desk chips on `/portal` · exposing internal notes, unissued/superseded revisions, or checklist attempt history · permission broadening.

---

## 9. Acceptance scenarios (focused)

| ID | Scenario | Expected |
|----|----------|----------|
| DO3-01 | Customer with no open tickets, no §5.0 heads, no schedule upcoming/due | Four chips **0**; muted empties; **not** an error |
| DO3-02 | Two owned open tickets (`in_progress`, `awaiting_customer`); one owned `closed` | Active-tickets chip = **2**; list shows `title` + clear `status`; closed excluded |
| DO3-03 | Visit has issued rev 1 head; correction draft / returned rev 2 unissued | Issued-reports = **1** (rev 1); awaiting follows rev 1 effective-ack; destinations **rev 1** only; rev 2 absent |
| DO3-04 | Rev 2 `approved_issued` on same report (supersedes rev 1) | Issued-reports = **1** (**rev 2 only**); rev 1 **leaves** counted population and destination list; awaiting-ack evaluates **rev 2** only (§6.1) |
| DO3-05 | Visible head with null effective acknowledgment | Awaiting-ack = **1**; link `panel=issued&revision=…`; `customer-ack-accept` / `customer-ack-refuse` visible |
| DO3-06 | Customer accepts that head via existing action | Awaiting-ack **0**; issued-reports still **1** (same head); no new ack rule |
| DO3-07 | Customer refuses with comment via existing action | Same chip membership as DO3-06; refusal history per B6 unchanged |
| DO3-08 | Staff recorded `unavailable` on visible head | Awaiting-ack excludes it; issued-reports still includes it |
| DO3-09 | Own-machine schedule: one `upcoming`, one `due`, one `overdue` at Cairo `as_of` | Upcoming-service = **2**; overdue excluded; list matches RPC rows; **no** generate call |
| DO3-09b | Paused coverage still returns `upcoming`/`due` rows from existing RPC | Those rows **remain counted**; `coverage_status` may show `paused`; recurrence behavior unchanged |
| DO3-10 | Another customer’s ticket/revision/machine ids | Omitted from all chips; deep-link safe fallback; no content leak |
| DO3-11 | Technician calls any new DO-3 read helper | **403**; no chip data; no **0** success body |
| DO3-12 | Helper/RPC failure | Error/unavailable UI; must **not** show successful zero counts |
| DO3-13 | Customer opens strip / expands queues / reloads focused issued URL | **Read-only**; query preserved across reload/auth-return |
| DO3-14 | Closed ticket still has §5.0 head | Active-tickets excludes ticket; issued-reports counts head; awaiting-ack only if effective ack null |
| DO3-15 | Two completed visits → two reports → two visible heads on one ticket | Issued-reports = **2**; destination lists **two** head rows (§6.2); not collapsed to one |
| DO3-16 | After DO3-15, only first report’s rev 2 issues | Issued-reports stays **2** with updated head on report 1; destinations swap that row to rev 2; superseded rev 1 absent from both report chips |

---

## 10. Authorization sense (when later authorized)

| Allowed | Not allowed without a new decision |
|---------|-------------------------------------|
| Customer caller-scoped read helpers for §5 | New acknowledgment rules or closure predicates |
| Chips + matching lists + deep links with `panel=issued` focus | Notification delivery; billing; stock; squads |
| Distinct loading / empty / error | Successful **0** for unauthorized callers |
| Reuse of B5 visibility helper + B6 accept/refuse | Scheduler / auto-generation / coverage manage; recurrence/pause changes |
| Own-machine schedule upcoming/due read (paused rows as RPC returns) | Exposing internal notes, unissued/superseded revisions, checklist attempts; permission broadening |

---

## 11. Recommendation

**Publish this amended DO-3 proposal (B-DO3-1) as planning only.** Do not implement until separately authorized. Do not remote-apply. Do not broaden permissions. DO-2 staging closeout and B5/B6/B7 acceptance remain undisturbed. Generation and coverage pause/resume stay outside this strip’s write surface.
