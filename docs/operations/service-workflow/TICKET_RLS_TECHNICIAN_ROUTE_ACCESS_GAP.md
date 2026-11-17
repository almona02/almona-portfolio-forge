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

## 6. Correction proposal (planning — not applied)

**Supervisor direction (T-G1):** use a **narrowly defined technician ticket-header view/RPC** for the job/checklist route. **Do not** add full-row `service_tickets` SELECT merely to render the page. “SELECT-only policy broadening” still exposes every column on a matched row — that does **not** satisfy the privacy decision.

### 6.1 Enable RLS in-chain (reproducibility) — still required

```sql
ALTER TABLE public.service_tickets ENABLE ROW LEVEL SECURITY;
```

Idempotent if already enabled. Makes existing policies real on fresh chains. **Does not** grant technicians new columns.

### 6.2 Technician ticket-header RPC / view (closed — replaces full-row SELECT broadening)

| Topic | Decision |
|-------|----------|
| Mechanism | SECURITY DEFINER RPC (illustrative: `get_technician_ticket_header(p_ticket_id uuid)`) **or** a narrow view that only projects approved columns, callable by `authenticated` |
| Authz predicate | Same scope as workflow read for technicians: caller is **current** job assignee on the ticket **or** visit attending tech (`can_read_ticket_workflow` tech branches) — **not** blanket staff |
| Owner / admin / support | Keep **existing** authorized paths (`service_tickets` SELECT policies as today for owner/`assigned_to`/admin/support). Do not force them through the tech header RPC |
| Direct table SELECT for technicians | **Unchanged deny** under current policy (or remain without tech predicate). Tech UI for this route **must** use the header RPC/view, not `select('*')` |

#### Minimum fields the tech job/checklist screen needs

| Field | Include? | Justification |
|-------|----------|---------------|
| `id` | **Yes** | Route key / joins to jobs |
| `ticket_number` | **Yes** | Primary human identifier on screen |
| `title` | **Yes** | Work context header |
| `status` | **Yes** | Workflow state for the job page |
| `priority` | **Yes** | Operational triage display already on tech lists |
| `type` | **Yes** | Ticket kind for field context |
| `description` | **Yes** | Needed to perform the assigned work (operational content, not customer contact PII) |
| `machine_id` | **Yes** | Links job/pin applicability / machine context |
| `machine_serial_number` | **Yes** | Field identification of the asset |
| `site_location` | **Yes** | Navigate to site; operational, not phone/email |
| `created_at` | **Yes** | Display age / ordering |
| `maintenance_type` | **Yes if column present** | Badge already on ticket header UI |
| `contact_email` / `contact_phone` / `contact_name` | **No** | Customer/contact PII **not** required to execute checklist or open job pin UI; staff/owner retain existing full-row paths |
| `user_id` | **No** in header | Owner uuid not required for header; message “customer vs staff” uses existing message APIs/policies |
| Other columns (escalation, governance internals, etc.) | **No** | Not needed for this route |

#### Historical attendance / former assignee (header)

| Actor | Header RPC |
|-------|------------|
| Current job-assigned tech | Allowed |
| Historical visit attending tech on that ticket | Allowed (retain route for B4/history) |
| Former assignee, not attending | **Denied** |
| Unrelated tech / customer / anon | **Denied** |

### 6.3 What not to change

| Keep unchanged |
|----------------|
| `service_tickets` **UPDATE** (owner / `assigned_to` / admin / support only) |
| Message send/share policies (existing); tech gains **no** new UPDATE |
| Lane B pin mutate matrix |
| Production apply / FR-1 |

### 6.4 Acceptance / negative tests (staging-equivalent policy set)

Assume: `ENABLE ROW LEVEL SECURITY` on `service_tickets` **and** current SELECT/UPDATE policies **plus** header RPC. Fresh local chain must match.

| ID | Check |
|----|-------|
| TR-01 | Fresh chain: `relrowsecurity = true` on `service_tickets` |
| TR-02 | Customer table SELECT own = 1; other customer = 0 |
| TR-03 | Job-assigned tech: header RPC returns **only** approved columns for parent ticket; unrelated ticket → empty/deny |
| TR-04 | Attending-only tech (after job reassignment) retains header RPC; **former assignee without attendance** denied |
| TR-05 | Support/admin existing table SELECT unchanged |
| TR-06 | Anon denied |
| TR-07 | Tech job UI loads via header RPC **without** `assigned_to = tech` and **without** `select('*')` |
| TR-08 | Lane B pin API authz unchanged |
| TR-09 | Tech **UPDATE** on `service_tickets` denied (negative) |
| TR-10 | Tech cannot read `contact_email` / `contact_phone` / `contact_name` via header RPC (negative; columns absent from payload) |
| TR-11 | Tech message/internal-note access follows **existing** message policies only — header RPC grants **no** extra message rights (negative) |
| TR-12 | OOS ticket/job: header RPC deny; pin/checklist deny |

---

## 7. Disposition relative to Lane B / Lane C

| Item | Disposition |
|------|-------------|
| Lane B `STAGING_PASS_BOUNDED` | **Unchanged / closed** — S-UI-02 remains a documented bound; pin behavior not reopened |
| Prior “full-row SELECT via `can_read_ticket_workflow`” proposal | **Superseded** by §6.2 narrow header RPC (supervisor T-G1) |
| Lane C checklist contract | Consumes header RPC for route reachability; does not broaden ticket columns |
| Implementation of §6 | **Blocked** until Spark PASS on this tip; planning only |
