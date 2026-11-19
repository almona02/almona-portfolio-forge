# Proposal — DO-3 customer daily ops workspace (planning only)

**Status:** Planning published · **not** authorized for implementation · **not** remote apply · **not** production · **not** merge · **not** scheduler  
**Parent:** [`SERVICE_DAILY_OPERATIONS_WORKSPACE_PROPOSAL.md`](./SERVICE_DAILY_OPERATIONS_WORKSPACE_PROPOSAL.md)  
**Depends on (reuse, do not reopen):** B5 owner issued-report access · B6 customer `accepted`/`refused` on exact issued revision · B7 customer isolation · DO-1 empty/error/count=filter rules · DO-2 deep-link focus pattern on `/support/tickets/:ticketId` (extend for customer panels only) · coverage schedule RPC own-machine customer read ([`COVERAGE_RECURRENCE_BINDING_CHOICES.md`](./COVERAGE_RECURRENCE_BINDING_CHOICES.md)) · DO-2 staging closeout ([`DO2_STAGING_CLOSEOUT.md`](./DO2_STAGING_CLOSEOUT.md))  
**Does not begin:** new acknowledgment rules · notification delivery · billing · stock · squads · coverage scheduler / auto-generate · new workflow states · production · remote schema apply · reopening B5/B6/B7 contracts

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
| Issued reports UI | `CustomerIssuedReportsSection` / `CustomerIssuedReportView` | Read issued revisions; pending correction does not hide last issued |
| Acknowledgment UI | `CustomerReportAcknowledgmentPanel` + `recordServiceAcknowledgment` | Existing accept / refuse only |
| Report getter | `get_service_report_for_visit` | Customer-visible issued revisions only (unissued omitted) |
| Effective ack | `effective_acknowledgment` / `getEffectiveAcknowledgment` | Outstanding vs settled |
| Coverage schedule | `list_machine_coverage_schedule` | Own-machine upcoming/due rows only (customer already permitted) |

---

## 3. Deep-link + focus contract (DO-3 extension)

**URL shape (customer destinations):**  
`/support/tickets/:ticketId?visit=:visitId&panel=issued&revision=:revisionId`

| Parameter | Meaning |
|-----------|---------|
| `ticketId` | Route ticket; must be readable to caller as **owner** (existing customer ticket path) |
| `visit` | Optional focus visit whose issued-report mount should expand |
| `panel` | DO-3 uses **`issued`** only (scroll/expand customer issued-reports card / revision). DO-2 values `visit` \| `checklist` \| `report` remain staff/technician paths; customers must not be sent those panels by DO-3 chips |
| `revision` | Optional exact **issued** revision id to bring acknowledgment controls into view |

**Required UI behavior:**

1. After the page gate succeeds for the owner, resolve `visit` / `revision` **only** through authorized customer-visible data (owner ticket + `revision_is_customer_visible` / getter).
2. On a valid match: expand `customer-issued-reports-card`, focus the visit/revision block, scroll acknowledgment controls into view when `revision` is set.
3. **Invalid, unknown, cross-ticket, unissued, or unauthorized** params → **safe fallback**: authorized ticket shell without focused expansion; **no** copy that reveals foreign existence/authorization.
4. Missing optional params → normal ticket render (issued card if owner).
5. Reload / auth-return must preserve the query string the same way DO-2 focus preservation does for its params (pathname + search intact through auth return).
6. No new pages; focus is wiring on the existing route only.

---

## 4. Timezone (recommendation)

| Setting | Locked recommendation |
|---------|----------------------|
| Timezone | **Africa/Cairo** (align DO-1 / DO-2 / coverage) |
| `as_of` | Cairo calendar date; default = Cairo today; optional read param only |
| Upcoming schedule window | Same classification the existing `list_machine_coverage_schedule` uses for buckets `upcoming` and `due` at that `as_of` — **do not** invent a second calendar rule |

---

## 5. Chip predicates (locked)

**Caller** = authenticated customer (`auth.uid()`) who **owns** the ticket (`service_tickets.user_id = caller`) or **owns** the machine for schedule rows.  
**Parent ticket open (active)** = ticket `status` **not in** (`closed`, `cancelled`).  
Admin/support opening `/portal` (if allowed by route) still sees **caller-scoped** data for their own uid — never an all-customers desk. Technician / foreign customer → **403** on any new DO-3 read helper (no successful empty/zero body).

### 5.1 My active tickets

| Field | Value |
|-------|-------|
| Count unit | **Tickets** |
| Population | `service_tickets` where `user_id = caller` **and** status **not in** (`closed`, `cancelled`) |
| List fields | id · subject/title · **clear `status`** · updated_at |
| Sort | `updated_at` DESC, then `id` ASC |
| Destination | `/support/tickets/:ticketId` (no focus required) |
| After closure | Ticket **leaves** this chip when status becomes `closed` or `cancelled`. Closed tickets remain reachable from ordinary history lists if those already exist; they are **out** of this chip. |

### 5.2 Issued reports available to read

| Field | Value |
|-------|-------|
| Count unit | **Issued revisions** (customer-visible) |
| Population | `service_report_revisions` where `admin_private.revision_is_customer_visible(id)` **and** parent ticket `user_id = caller` |
| Latest-issued vs pending-revision | **Include every issued revision** still customer-visible. A **pending / unissued correction** is **excluded** from the count and from destinations. The prior issued revision **remains** counted and readable (B5: pending correction does not hide last issued). |
| Exclusions | Unissued drafts · staff return comments not customer-visible · internal notes · checklist attempt history |
| Sort | `issued`/`submitted_at` DESC (getter’s issued ordering), then `revision_number` DESC, then `id` ASC |
| Destination | `/support/tickets/:ticketId?visit=:visitId&panel=issued&revision=:revisionId` → issued mount (§3) |
| After acknowledgment | Revision **stays** in this chip (still readable). Ack state is not a visibility gate. |
| After ticket closure | Revision **stays** in this chip while still customer-visible on an owned ticket (including closed). Read remains; mutate affordances follow existing B6 UI (`canRespond` / closed-ticket rules) — **no new rules**. |

### 5.3 Reports awaiting my acknowledgment

| Field | Value |
|-------|-------|
| Count unit | **Issued revisions** |
| Population | Customer-visible issued revisions on tickets owned by caller where `effective_acknowledgment(revision_id)` **IS NULL** (no effective `accepted` / `refused` / `unavailable` yet) |
| Link target | Same URL as §5.2 with `panel=issued&revision=…` so existing **Accept** / **Refuse** controls in `CustomerReportAcknowledgmentPanel` are in view |
| Exclusions | Revisions with any effective acknowledgment (including staff `unavailable`) · unissued revisions · other customers’ revisions |
| Sort | Oldest outstanding first: issued/submitted_at ASC, then `id` ASC |
| After customer `accepted` or `refused` | Revision **leaves** this chip immediately (effective ack exists). History remains append-only per B6; chip uses **effective** only. |
| After staff `unavailable` | Revision **leaves** this chip (settled for outstanding purposes). Late customer append remains an **existing** B6 path on the ticket page — **not** re-queued here as “awaiting”. |
| After ticket closure | If still outstanding at close, remains governed by existing closure/prereq rules; chip includes outstanding rows on **open or closed** owned tickets until an effective ack exists (closure does not invent auto-ack). If product UI disables respond on closed tickets today, DO-3 still **links** to the existing panel and does not add a new respond path. |

**Non-goal reminder:** DO-3 does **not** change when acknowledgment is required, refusal comment rules, unavailable policy, or closure prerequisites.

### 5.4 Upcoming service (own machines only)

| Field | Value |
|-------|-------|
| Count unit | **Schedule rows** as returned by existing `list_machine_coverage_schedule` |
| Population | Rows for machines **owned by caller** whose bucket at Cairo `as_of` is **`upcoming` or `due`** (existing classifier). **Overdue** bucket is customer-readable via the same RPC but **out of this chip** (keep the strip “upcoming”). |
| Exclusions | Other customers’ machines · manage/generate actions · unattended scheduler · inventing counts that the RPC would not return |
| Destination | Filtered read-only list on `/portal` (chip expansion). If a row already has a linked open `ticket_id` the caller can read, offer deep link `/support/tickets/:ticketId`. Otherwise show machine/schedule summary only — **no** create/generate from the chip. |
| After occurrence ticket opens | Row classification follows existing schedule RPC; active ticket also appears under §5.1 when owned and open. |
| Viewing | Must **not** call `generate_machine_coverage_occurrences` or any coverage manage RPC. |

---

## 6. Count-to-destination agreement

| Chip | Integer equals | Destination list must show |
|------|----------------|----------------------------|
| Active tickets | Number of owned open tickets (§5.1) | Exactly those tickets |
| Issued reports | Number of customer-visible issued revisions (§5.2) | Exactly those revisions (ticket + visit + revision identity) |
| Awaiting acknowledgment | Number of issued revisions with null effective ack (§5.3) | Exactly those revisions; each link lands on existing accept/refuse |
| Upcoming service | Number of own-machine `upcoming`∪`due` schedule rows (§5.4) | Exactly those rows |

Opening a chip must show the same set the integer counted. No silent extra filters, no collapsing revisions to tickets for chips whose unit is revisions.

---

## 7. Loading / error / empty / isolation

| State | UI |
|-------|----|
| Loading | Busy indicator; **do not** paint chips as **0** |
| Success empty | Muted empty copy; chips show **0** |
| Failure / 403 | `role="alert"` error/unavailable; **never** successful zero |
| Customer isolation | Helpers return **only** caller-owned tickets / machines / customer-visible revisions. Foreign ids → omitted or safe fallback; never leak existence |
| Unauthorized role | Technician (and non-owner) calling new DO-3 helpers → **403** with distinct authz detail; no **200**-empty success body |
| View-only | Expanding chips, following links, and rendering lists perform **no** inserts/updates/deletes and do not trigger generation |

---

## 8. UI / RPC shape (thin)

**Slice DO-3 — Customer worklist strip**

1. On `/portal`, render four count chips using §5 predicates.  
2. Chip click → filtered list of the **exact** counted population + one next-action link (§3 / §5).  
3. Add only **minimum customer read helpers** for these four populations (SECURITY DEFINER or equivalent; **no** new mutate path; helpers must not write). Prefer composing existing getters (`get_service_report_for_visit`, `effective_acknowledgment`, `list_machine_coverage_schedule`) over new visibility rules.  
4. Implement §3 focus handling for `panel=issued` (+ optional `revision`) on `TicketDetailPage` without disturbing DO-2 technician focus behavior.  
5. Reuse DO-1/DO-2 strip interaction patterns where cheap; keep a **customer-specific** component.

**Explicit non-goals:** new acknowledgment responses · push/email/SMS · billing · stock · squads · scheduler · auto-generate · staff desk chips on `/portal` · exposing internal notes, unissued reports, or checklist attempt history.

---

## 9. Acceptance scenarios (focused)

| ID | Scenario | Expected |
|----|----------|----------|
| DO3-01 | Customer with no open tickets, no issued revisions, no schedule upcoming/due | Four chips **0**; muted empties; **not** an error |
| DO3-02 | Two owned open tickets (`in_progress`, `awaiting_customer`); one owned `closed` | Active-tickets chip = **2**; list shows clear statuses; closed excluded |
| DO3-03 | Visit has issued rev 1; correction draft unissued; rev 1 still visible | Issued-reports chip counts **rev 1** only; destination opens issued mount for rev 1; unissued absent |
| DO3-04 | Issued rev 2 supersedes as latest issued; rev 1 remains customer-visible | Issued-reports chip counts **both** issued revisions; pending-unissued still excluded |
| DO3-05 | Issued revision with null effective acknowledgment | Awaiting-ack chip = **1**; link uses `panel=issued&revision=…`; existing Accept/Refuse visible |
| DO3-06 | Customer accepts that revision via existing action | Awaiting-ack drops to **0**; issued-reports still counts the revision; no new ack rule |
| DO3-07 | Customer refuses with comment via existing action | Same as DO3-06 for chip membership; refusal history per B6 unchanged |
| DO3-08 | Staff recorded `unavailable` on issued revision | Awaiting-ack excludes it; issued-reports still includes it |
| DO3-09 | Own-machine schedule: one `upcoming`, one `due`, one `overdue` at Cairo `as_of` | Upcoming-service chip = **2**; overdue excluded from chip; list matches RPC rows; **no** generate call |
| DO3-10 | Another customer’s ticket/revision/machine ids | Omitted from all chips; deep-link safe fallback; no content leak |
| DO3-11 | Technician calls any new DO-3 read helper | **403**; no chip data; no **0** success body |
| DO3-12 | Helper/RPC failure | Error/unavailable UI; must **not** show successful zero counts |
| DO3-13 | Customer opens strip / expands queues / reloads focused issued URL | **Read-only**: no ticket/job/visit/revision/ack/coverage writes from viewing; query preserved across reload/auth-return |
| DO3-14 | Closed ticket still has customer-visible issued revision | Active-tickets excludes ticket; issued-reports still counts revision; awaiting-ack only if effective ack still null |

---

## 10. Authorization sense (when later authorized)

| Allowed | Not allowed without a new decision |
|---------|-------------------------------------|
| Customer caller-scoped read helpers for §5 | New acknowledgment rules or closure predicates |
| Chips + matching lists + deep links with `panel=issued` focus | Notification delivery; billing; stock; squads |
| Distinct loading / empty / error | Successful **0** for unauthorized callers |
| Reuse of B5 issued UI + B6 accept/refuse | Scheduler / auto-generation / coverage manage for customers |
| Own-machine schedule upcoming/due read | Exposing internal notes, unissued revisions, checklist attempts |

---

## 11. Recommendation

**Publish this DO-3 proposal as planning only.** Do not implement until separately authorized. Do not remote-apply. DO-2 staging closeout and B5/B6/B7 acceptance remain undisturbed. Generation stays operator-triggered outside this strip.
