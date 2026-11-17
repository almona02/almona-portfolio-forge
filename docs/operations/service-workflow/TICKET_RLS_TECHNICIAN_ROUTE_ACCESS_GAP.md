# Ticket RLS reproducibility and technician route-access gap

**Status:** Documentation only · **no migration authored · no remote apply · no FR-1**  
**Triggered by:** Lane B staging Spark finding — **S-UI-02 NOT RUN** + non-blocking RLS fidelity notes in `STAGING_PASS_BOUNDED`  
**Related:** [`LANE_B_STAGING_CLOSEOUT.md`](./LANE_B_STAGING_CLOSEOUT.md) · Lane B `SPARK_CONFIRM.json` (`s_ui_02_cause`, `findings_not_blocking`)

---

## 1. Problem statement

Technician **job/visit/pin API** access can succeed while the **technician jobs/ticket route UI** fails closed with “Ticket not found or unavailable”, because the page **gates on a direct `service_tickets` SELECT**, and that table’s RLS policy (when enforced) does **not** include job-assigned technicians.

Separately, the reviewed **migration chain does not `ENABLE ROW LEVEL SECURITY` on `service_tickets`**, so local fresh stacks and staging can disagree on whether the policy matters at all.

---

## 2. Intended technician visibility (workflow model)

Authoritative workflow read helper (B1, refined B4):

`admin_private.can_read_ticket_workflow(p_ticket_id)` is true when the caller is:

- ticket `user_id` (owner), or
- ticket `assigned_to`, or
- role `admin` / `support`, or
- role `technician` **and** (
  - a `service_jobs` row on that ticket has `assigned_technician_id = caller`, **or**
  - caller is a historical/current visit attending technician on that ticket (`is_ticket_visit_attending_technician`)
)

**Jobs / visits / Lane B pin reads** use this helper (or equivalent job SELECT).  
**Intended product:** a technician assigned to a job on a customer-owned ticket can work that job/visit/pin **without** becoming ticket `assigned_to` and **without** seeing unrelated customers’ tickets.

Lane B staging already proved tech pin **API** read on that model (**J-05a**).

---

## 3. Existing staging / B1-accepted ticket policy

`service_tickets_select_own_or_staff` (e.g. `20261112170000_service_tickets_staff_select_via_caller_role.sql`):

```sql
USING (
  user_id = auth.uid()
  OR assigned_to = auth.uid()
  OR admin_private.caller_role() IN ('admin', 'support')
);
```

**Not included:** job-assigned technician · visit attending technician.

So when RLS is **on**, a tech who is only `service_jobs.assigned_technician_id` receives **zero** ticket rows for that customer-owned, support-assigned ticket.

### S-UI-02 manifestation (Spark, staging)

- Fixture: customer-owned ticket, `assigned_to = support`, job assigned to technician.
- Tech opens jobs/ticket UI → ticket SELECT `[]` → page gate → “Ticket not found or unavailable”.
- **NOT RUN** as a Lane B UI proof; **not** a Lane B pin-behavior defect (API J-05a PASS).

---

## 4. Missing migration-chain enforcement

| Environment | Observation |
|-------------|-------------|
| Staging `apnmoevmvihfzcnttctx` | Ticket RLS **enforced** (Spark: policies bite; S-UI-02 fails closed) |
| Reviewed supabase migration chain | Creates/replaces **policies** but **no** `ALTER TABLE public.service_tickets ENABLE ROW LEVEL SECURITY` in-chain |
| `docs/operations/slice0/staging_service_tickets_rls.sql` | Contains `ENABLE` — **not** a numbered chain migration |
| Local fresh chain (Spark fidelity note) | `relrowsecurity=false` → local tech page-render probes can PASS **only** because RLS is off |

**Reproducibility gap:** the same git migrations do not deterministically reproduce staging’s ticket RLS enablement. Secure direction on staging; chain should codify `ENABLE` so local/CI match.

---

## 5. Customer isolation constraint (non-negotiable)

Any correction **must** preserve:

| Actor | May see |
|-------|---------|
| Customer | Own tickets only |
| Technician | Only tickets where they are job-assigned and/or visit-attending (workflow-readable), **not** all tickets |
| Admin / support | Staff scope (existing) |
| Anon | Nothing |

**Out of bounds “fixes”:**

- Assigning `service_tickets.assigned_to` to the technician **only** so the page renders.
- Granting technicians SELECT on **all** tickets.
- Disabling ticket RLS.
- Changing Lane B pin auth to bypass ticket row reads in the UI without fixing ticket policy fidelity.

---

## 6. Smallest correction proposal (planning — not applied)

### 6.1 Enable RLS in-chain (reproducibility)

Add a dedicated, reviewable migration (name illustrative):

```sql
ALTER TABLE public.service_tickets ENABLE ROW LEVEL SECURITY;
```

Idempotent / safe if already enabled. Does **not** by itself grant tech access; it makes existing policies real everywhere.

### 6.2 Align ticket SELECT with workflow read model (route access)

**Smallest semantic fix:** make `service_tickets` **SELECT** for `authenticated` use the same predicate as workflow reads, via the existing SECURITY DEFINER helper (bypasses RLS recursion safely — the helper reads `service_tickets` as definer):

```sql
DROP POLICY IF EXISTS service_tickets_select_own_or_staff ON public.service_tickets;
CREATE POLICY service_tickets_select_own_or_staff ON public.service_tickets
FOR SELECT TO authenticated
USING (admin_private.can_read_ticket_workflow(id));
```

**Why this is smallest:**

- Reuses the already-accepted B1/B4 visibility function (owner / assignee / staff / job tech / attending).
- Preserves customer isolation (tech still limited to tickets tied to their jobs/attendance).
- Unblocks technician route UI that SELECTs the ticket row **without** broadening to all tickets.
- Avoids fixture-only hacks (`assigned_to = tech`).

**Explicit non-broadening:** this changes **SELECT only**. Ticket **UPDATE**/governance mutation policies stay owner / `assigned_to` / admin / support. Technicians do not gain ticket reassignment, status edits, or staff-wide ticket lists.

### 6.3 What not to change in the same slice

| Keep unchanged unless separately justified |
|--------------------------------------------|
| `service_tickets` **UPDATE** policy (owner / `assigned_to` / admin / support) — S-UI-02 needs SELECT, not tech ticket mutation |
| Lane B pin mutate matrix |
| Customer message visibility rules beyond SELECT of the ticket header row |
| Production apply / FR-1 |

### 6.4 Acceptance checks (for a future correction tip)

| ID | Check |
|----|-------|
| TR-01 | Fresh chain: `relrowsecurity = true` on `service_tickets` |
| TR-02 | Customer SELECT own = 1; other customer = 0 |
| TR-03 | Job-assigned tech SELECT parent ticket = 1; unrelated ticket = 0 |
| TR-04 | Attending-only tech (after reassignment) retains SELECT per `can_read_ticket_workflow` |
| TR-05 | Support/admin SELECT unchanged |
| TR-06 | Anon SELECT empty / denied |
| TR-07 | Tech jobs UI can load ticket header for assigned job **without** setting `assigned_to` to the tech |
| TR-08 | Lane B pin API authz unchanged (customer still excluded from internal pin content) |

---

## 7. Disposition relative to Lane B / Lane C

| Item | Disposition |
|------|-------------|
| Lane B `STAGING_PASS_BOUNDED` | **Unchanged** — S-UI-02 remains a documented bound, not a reopen of pin behavior |
| Lane C checklist contract | May assume tech can reach visit UI once TR correction lands; contract itself does **not** implement TR |
| Implementation of §6 | **Blocked** until explicitly scheduled; this file is planning/evidence only |
