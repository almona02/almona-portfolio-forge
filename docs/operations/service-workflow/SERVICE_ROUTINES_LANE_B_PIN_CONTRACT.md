# Service routines — Lane B version-pinning contract (planning only)

**Status:** Amended draft for Spark review · **no implementation until Spark PASS on this tip**  
**Depends on:** Lane A authoring **COMPLETE** (immutable published versions + applicability metadata)  
**FR-1 / production / merge / staging apply:** Untouched · not authorized by this draft  
**Out of this package:** Contracts/coverage entitlement · recurrence · squads · stock · technician checklist results / B4 submit wiring · future applicability exceptions for unlinked/uncatalogued machines  

---

## 1. Intent (smallest package)

Attach an **exact immutable published** `service_routine_versions.id` to an **existing** `service_jobs` row so field work has a stable routine identity.

- Machine context for applicability comes from the job’s **parent ticket** (B1: jobs inherit machine from ticket; no per-job machine override).
- This package does **not** implement checklist execution or `checklist_results`.
- B3 visit safety gate remains the minimum visit-start gate and is **not** replaced by routine pins.
- **A pin is optional:** starting a visit/job does **not** require a pin to exist.

---

## 2. In scope / out of scope

| In scope | Out of scope (explicit) |
|----------|-------------------------|
| Pin / replace / unpin one active published routine **version** on a **job** | Technician result capture / report submit |
| Applicability enforcement at pin time | Contract activation / paid coverage |
| Role authz (job-scoped) for pin mutations and reads | Recurrence / scheduling generation |
| Append-only pin history; atomic audit | Squads / multi-tech dispatch |
| Serialize races with visit start & version retire | Stock / parts |
| UI entry, errors, direct-write protection | Editing published payload in place |
| Testable acceptance scenarios | Customer access to internal routine content |
| Visits **read** the job’s active pin | Visit dual-write / visit pin column writes |

---

## 3. Pin store (decision — closed)

| Topic | Decision |
|-------|----------|
| Canonical store | **Job-only** pin table (illustrative name `service_job_routine_pins`) |
| Visits | **Read** the job’s active pin when needed; **no visit dual-write** in this slice |
| B3 `service_job_visits.pinned_routine_version_id` | Not written by this package; later results lane may copy/read job pin — out of scope |

---

## 4. Authorities (decision — closed)

### 4.1 Existing helpers / policies to cite (do not invent parallel auth)

| Helper / policy | Source | What it allows |
|-----------------|--------|----------------|
| `admin_private.caller_uid()` / `admin_private.caller_role()` | B1 / Slice0 security boundary | Actor identity + role |
| `admin_private.workflow_resolve_actor(p_actor_id)` | B1 | SECURITY DEFINER RPCs resolve actor |
| `admin_private.can_read_ticket_workflow(p_ticket_id)` | B1 (`20261111210000_…b1_data_contract.sql`), later refined in B4 attachment migration | **SELECT** path for tickets/jobs/visits when caller is ticket owner, `assigned_to`, **admin**, **support**, or assigned/attending technician |
| `service_jobs_select` | B1 | `USING (admin_private.can_read_ticket_workflow(ticket_id))` |
| `service_jobs_staff_insert` | B1 | `caller_role() IN ('admin','support') AND can_read_ticket_workflow(ticket_id)` |
| `service_jobs_no_client_update` / `_delete` | B1 | Direct client UPDATE/DELETE **denied** (`USING (false)`); mutations via RPCs only |
| Lane A routine RLS | Lane A migration | Admin/Support staff reads; technician published/retired preview only |

### 4.2 Critical gap (must close in implementation design — not optional)

**`can_read_ticket_workflow` alone must NOT grant pin mutation.**  
That helper is true for **customers** (ticket `user_id`), **ticket assignees**, and **technicians** on the ticket’s jobs — as well as admin/support. Ticket/job **read** access therefore **must not** imply pin/replace/unpin authority.

**Slice-1 mutation rule (frozen):**

```
admin_private.caller_role() IN ('admin', 'support')
AND admin_private.can_read_ticket_workflow(job.ticket_id)
```

There is **no** existing `can_mutate_job_pin` (or equivalent) helper today. Implementation **must** add an explicit SECURITY DEFINER assert (name illustrative: `admin_private.assert_can_mutate_job_routine_pin(p_job_id)`) that encodes the rule above — **before** coding RPCs that only check `can_read_ticket_workflow`.

### 4.3 Permission matrix

| Action | Admin | Support | Assigned technician | Customer / other | Anon |
|--------|-------|---------|---------------------|------------------|------|
| Pin / replace / unpin (before freeze) | R if §4.2 | R if §4.2 | — | — | — |
| Read active pin + history on authorized job | R | R | R (via job SELECT) | — (no internal routine content) | — |
| Library picker published/retired | R | R | R (Lane A preview rules) | — | — |

Unauthorized → SQLSTATE **`42501`**, DETAIL **`routine_job_pin_authz_denied`**; business unchanged; optional deny audit.

---

## 5. Data shape

### 5.1 Job pin rows (append-only history)

| Field | Rule |
|-------|------|
| `id` | Stable pin-history row id |
| `job_id` | FK → `service_jobs` |
| `routine_id` | Denormalized from version (future multi-routine uniqueness) |
| `routine_version_id` | Exact pinned published version id |
| `status` | `active` \| `replaced` \| `unpinned` |
| `reason` | **Required** on initial pin, replace, and unpin |
| `pinned_by` / `pinned_at` | Actor + time |
| `replaced_by_pin_id` / `unpinned_by` / `unpinned_at` | History |
| `work_started_boundary_at` (job- or pin-set-level) | Set once at first work start; never cleared |

**Cardinality (slice-1):** at most one `status = active` row per `job_id`.  
**Schema future-proofing:** prefer a partial unique index design that can later allow one active pin per `(job_id, routine_id)` without a hostile 1:1 job column.

**Publication:** later publish of N+1 **never** mutates an existing pin’s `routine_version_id`.

---

## 6. Machine / applicability (decision — closed)

| Case | Behavior |
|------|----------|
| Linked canonical machine (ticket) + family/model coherent with Lane A applicability | Allow |
| Family / catalog-model / manufacturer mismatch | **Deny** — DETAIL `routine_pin_applicability_denied` |
| Unlinked machine / no canonical machine | **Deny** — DETAIL `routine_pin_machine_unlinked` |
| Uncatalogued / unknown family | **Deny** — DETAIL `routine_pin_machine_uncatalogued` |
| Future applicability exceptions | **Outside this slice** |

Never infer compatibility.

---

## 7. Retirement

| Rule | Detail |
|------|--------|
| New pins to retired versions | **Denied** — DETAIL `routine_pin_version_retired` |
| Existing authorized pins after version retire | Remain **readable**; UI retired badge; Lane A preview exact |
| Replace target | Must be `published` (not draft/in_review/retired) |

---

## 8. Reasons + first work start freeze (decision — closed)

### 8.1 Reasons

**Required** on **initial pin**, **replacement**, and **unpin**. Missing/blank → deny DETAIL `routine_pin_reason_required`.

### 8.2 First work start → permanent pin freeze

**Start signal (frozen):** the first time **any** visit on the job enters `in_progress` via B3 start (`public.start_service_job_visit` / equivalent).

When that happens, persist `work_started_boundary_at` (or equivalent) on the job pin boundary **once**.

Thereafter, for this slice:

- **Initial pin**, **replacement**, and **unpin** are **all denied** — DETAIL `routine_pin_locked_after_start`
- **No privileged override** after start
- **Aborted / cancelled / completed visits**, **technician reassignment**, **job state changes**, and any later visit transitions **never reset** that boundary

**Non-requirement:** jobs may start **without** a pin; freeze only blocks pin mutations after historical start, it does not mandate a pin before start.

---

## 9. Atomicity, races, direct-write protection

| Topic | Required behavior |
|-------|-------------------|
| Pin vs retire of target version | Lock version row; pin only if still `published` |
| Pin/replace/unpin vs visit start | Serialize on job (e.g. `admin_private.lock_job_hierarchy`); documented outcome only — never half-applied |
| Concurrent replaces | Exactly one `active` pin per job |
| Success + audit | Same transaction |
| Denied op | Business unchanged |
| Direct writes | REVOKE client INSERT/UPDATE/DELETE on pin table; RPC-only (mirror `service_jobs` pattern) |

Use existing `admin_private.lock_job_hierarchy(p_job_id)` (B3 F-B3-03) where appropriate for job-scoped serialization.

---

## 10. Frozen audit names + error codes

### 10.1 Audit (append-only `public.service_workflow_audit`)

| Field | Frozen value |
|-------|----------------|
| `entity_type` | `service_job_routine_pin` |
| Success `action` | `routine_job_pinned` · `routine_job_pin_replaced` · `routine_job_unpinned` |
| Deny `action` | `routine_job_pin_denied` · `routine_job_pin_authz_denied` |
| `entity_id` | Pin row id when a pin row exists; otherwise `job_id` with details naming the attempt |
| Details JSON (minimum) | `job_id`, `routine_id`, `routine_version_id`, `reason` (when supplied), deny `detail_code` |

Do not invent synonyms.

### 10.2 Error codes (frozen)

| Condition | SQLSTATE | DETAIL (exact) |
|-----------|----------|----------------|
| Authz (role/scope) | `42501` | `routine_job_pin_authz_denied` |
| Not published / wrong lifecycle | `22023` | `routine_pin_version_not_published` |
| Retired version new pin | `22023` | `routine_pin_version_retired` |
| Unlinked machine | `22023` | `routine_pin_machine_unlinked` |
| Uncatalogued machine | `22023` | `routine_pin_machine_uncatalogued` |
| Applicability mismatch | `22023` | `routine_pin_applicability_denied` |
| Missing reason | `22023` | `routine_pin_reason_required` |
| Second active pin / cardinality | `22023` | `routine_pin_cardinality` |
| After work-start freeze | `22023` | `routine_pin_locked_after_start` |

API mapping: authz → 403; validation DETAIL codes → 400/422 as existing client conventions; never silent success.

---

## 11. UI entry points

| Surface | Actor | Behavior |
|---------|-------|----------|
| Job detail — Routines | Admin/Support (§4.2) | Active pin + history; pin/replace/unpin with **required reason** |
| Job detail — read | Assigned technician | Read-only active pin; retired badge; preview |
| Visits | Any authorized visit reader | Display job pin as read-only reference; no visit write |
| Errors | All | Exact DETAIL codes above; no substring toast matching for acceptance |

---

## 12. Acceptance scenarios

| ID | Scenario | Expect |
|----|----------|--------|
| RB-01 | Admin/Support pins published V1 with reason on authorized job + linked applicable machine | One active pin; audit `routine_job_pinned` |
| RB-02 | Pin without reason | Deny `routine_pin_reason_required` |
| RB-03 | Pin draft/in_review | Deny `routine_pin_version_not_published` |
| RB-04 | Pin retired version | Deny `routine_pin_version_retired` |
| RB-05 | Family/model mismatch | Deny `routine_pin_applicability_denied` |
| RB-06 | Unlinked / uncatalogued machine | Deny unlinked/uncatalogued DETAIL |
| RB-07 | Publish V2 after pin V1 | Pin still V1 |
| RB-08 | Replace V1→V2 before start + reason | History; one active |
| RB-09 | Unpin before start + reason | `unpinned`; history |
| RB-10 | After first visit `in_progress`: initial pin / replace / unpin | All deny `routine_pin_locked_after_start` |
| RB-11 | Abort/cancel visit, reassign tech, change job state after boundary | Boundary intact; pin mutations still denied |
| RB-12 | Start visit with **no** pin present | Allowed (pin not required to start) |
| RB-13 | Concurrent pin vs retire / start | Serialized valid outcome |
| RB-14 | Second active pin | Deny `routine_pin_cardinality` |
| RB-15 | Technician mutation attempt | Deny `routine_job_pin_authz_denied` |
| RB-16 | Customer / out-of-scope mutation attempt | Deny `routine_job_pin_authz_denied` |
| RB-17 | Technician/customer read internal unpublished routine via pin UI | Denied (no internal content) |
| RB-18 | Existing pin remains readable after version retirement | Read OK; new pin to that version denied |
| RB-19 | Initial pin after historical work start (never had a pin) | Deny `routine_pin_locked_after_start` |
| RB-20 | Direct table write as authenticated | Denied |

---

## 13. Closed decisions vs remaining gaps

### Closed in this amendment

1. Job-only pin store; visits read job pin; no visit dual-write.  
2. Mutation = admin/support **and** `can_read_ticket_workflow`; read alone insufficient; missing mutate helper must be added before coding.  
3. Unlinked/uncatalogued denied; future exceptions out of slice.  
4. Reason required for pin/replace/unpin; audit names + DETAIL codes frozen (§10).  
5. First visit `in_progress` permanently freezes pin/replace/unpin; never reset; pin not required to start.  
6. Acceptance coverage for tech/customer denials, post-retire readability, post-start initial-pin denial (§12).

### Remaining before coding (non-policy, implementation binding)

- Exact RPC signatures / UI routes (not product-policy).  
- Whether `work_started_boundary_at` lives on `service_jobs` vs pin-set side table (schema placement only).

---

## 14. Implementation gate

| Gate | Rule |
|------|------|
| Spark | PASS on this amended tip |
| Runtime | **No** migration/UI until gate |
| Staging / production / FR-1 / merge | Not authorized |
