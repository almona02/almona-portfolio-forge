# Service routines — Lane B version-pinning contract (planning only)

**Status:** Draft for Spark review · **no implementation until Spark PASS on this tip**  
**Depends on:** Lane A authoring **COMPLETE** (immutable published versions + applicability metadata)  
**FR-1 / production / merge / staging apply:** Untouched · not authorized by this draft  
**Out of this package:** Contracts/coverage entitlement · recurrence · squads · stock · technician checklist results / B4 submit wiring  

---

## 1. Intent (smallest package)

Attach an **exact immutable published** `service_routine_versions.id` to an **existing** `service_jobs` row so field work has a stable routine identity.

- Machine context for applicability comes from the job’s **parent ticket** (B1: jobs inherit machine from ticket; no per-job machine override).
- This package does **not** implement checklist execution or `checklist_results`.
- B3 visit safety gate remains the minimum visit-start gate and is **not** replaced by routine pins.

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

---

## 3. Relationship to B3 visit column

B3 reserved `service_job_visits.pinned_routine_version_id` for later execution. This contract’s canonical store is **job-scoped**.

| Topic | Recommendation (this proposal) | Unresolved / POLICY |
|-------|--------------------------------|---------------------|
| Canonical pin store | Job-scoped pin table (§5) | Confirm vs visit-only vs dual-write before coding |
| Visit column in this slice | **No visit pin writes** required for acceptance | Later results lane may inherit/copy job pin — out of scope |
| Checklist results | Deferred | Do not invent submit / version-skew submit rules here |

---

## 4. Authorities (recommended defaults)

Admin and Support may **manage** pins **only within their authorized job scope** (same job visibility rules as existing service-workflow job/ticket RLS — do not invent a wider pin surface).

| Action | Admin | Support | Assigned technician | Other techs | Customer / Sales / Anon |
|--------|-------|---------|---------------------|-------------|-------------------------|
| Create / replace / unpin (before work-start lock) | R (authorized jobs) | R (authorized jobs) | — | — | — |
| Read active pin + history on authorized job | R | R | R | — | — |
| Library picker (published / retired versions) | R | R | R (published/retired only) | — | — |
| Internal routine payload / unpublished drafts | Per Lane A | Per Lane A | Preview published/retired only | — | **No** unless separately specified |

Unauthorized → `42501` / API 403; **business unchanged**; deny may be audited. No unpublished draft content in picker responses. **No customer access to internal routine content** in this slice.

**Recommendation:** Admin + Support both may manage pins (job-scoped).  
**Unresolved:** Exact “authorized job scope” mapping if Support’s job SELECT policies differ from Admin — must cite existing B1–B3 policies in implementation, not widen them silently.

---

## 5. Data shape (conceptual)

### 5.1 Store (illustrative name `service_job_routine_pins`)

| Field | Rule |
|-------|------|
| `id` | Stable pin-history row id |
| `job_id` | FK → `service_jobs` |
| `routine_id` | Denormalized from version (for future multi-routine uniqueness) |
| `routine_version_id` | FK → `service_routine_versions` — **exact** pinned identity |
| `status` | `active` \| `replaced` \| `unpinned` |
| `reason` | Required on replace/unpin; optional on initial pin (**recommendation:** optional on first pin, **required** on replace/unpin) |
| `pinned_by` / `pinned_at` | Actor + time |
| `replaced_by_pin_id` / `unpinned_by` / `unpinned_at` | History linkage |
| `work_boundary_seq` or equivalent | See §9 — historical start boundary |

**Append-only history:** Replace/unpin **never deletes** prior rows; prior rows become `replaced` / `unpinned`.

**Pin identity:** Callers and audits always cite `routine_version_id`. Later publication of N+1 **never** updates an existing pin’s `routine_version_id`.

### 5.2 Cardinality — recommendation for this slice

| Slice-1 rule | Detail |
|--------------|--------|
| **One active pin per job** | At most one row with `status = active` per `job_id` |
| Schema future-proofing | Prefer a unique partial index on `(job_id) WHERE status = 'active'` **or** `(job_id, routine_id) WHERE status = 'active'` with a slice-1 check that also enforces single active row — **do not** design a 1:1 job column that blocks later multiple-routine pins without migration pain |
| Later multi-routine | Out of slice-1; schema must not preclude adding “one active per routine_id per job” later |

**Recommendation:** Enforce **one active routine-version pin per job** initially; keep history append-only; avoid a schema that prevents later multiple-routine support.

---

## 6. Machine UUID and catalog applicability

### 6.1 Canonical machine

- Canonical machine UUID for a job = machine identity on the **parent ticket** (B1 inheritance).
- Pin RPCs resolve ticket → machine → catalog linkage for applicability.

### 6.2 Model-specific applicability (recommendation)

| Case | Behavior |
|------|----------|
| Linked canonical machine + family in routine’s family set + catalog/manufacturer coherent with Lane A metadata | Allow pin |
| Family not in routine family set | **Hard deny** |
| Catalog-model / manufacturer mismatch | **Hard deny** in this slice (no pin-time override RPC) |
| Explicit manufacturer restriction on routine | **Hard deny** |

### 6.3 Unlinked / uncatalogued — never inferred

| Situation | Recommendation |
|-----------|----------------|
| No linked canonical machine / unlinked ticket | **Clear denial** (e.g. `routine_pin_machine_unlinked`) — **never** inferred compatible |
| Machine present but uncatalogued / unknown family | **Clear denial** (e.g. `routine_pin_machine_uncatalogued`) — **never** inferred compatible |
| Explicit supported applicability for a special class | Only if product defines a **named** supported path later; **not** invented in this draft |

**Unresolved:** Whether a future Admin “supported applicability” path exists for unlinked machines — **out of slice-1** unless Spark/product names it; until then, deny.

---

## 7. Publication immutability

| Event | Pin behavior |
|-------|--------------|
| New version published for same routine | Existing pin **unchanged** |
| UX “use latest” | Requires **explicit replace** with reason (§8) |
| Draft / in_review | **Cannot** be pinned |

---

## 8. Retirement semantics

| Rule | Detail |
|------|--------|
| New pins | Retired versions → pin create **denied** |
| Existing authorized pins | Remain **readable** (retired badge); Lane A preview exact |
| Replace target | Must be **published** (non-retired) |

---

## 9. Replace / unpin and work-start boundary

### 9.1 Before first actual work start

Admin/Support (authorized job) may:

- **Replace** — old row `replaced`, new `active` row, reason **required**, history retained  
- **Unpin** — row `unpinned`, reason **required**, history retained  

### 9.2 First actual work start (historical boundary)

**Recommendation (S1):** First time **any** visit on the job enters `in_progress` (B3 start) establishes the pin lock for that job.

Once that boundary is set:

- Record it durably on the job/pin set (timestamp or sequence) so **reassignment** or a **later job/visit state change does not reset** the boundary.
- Replace / unpin → **denied** for all roles in this slice.
- **No privileged override after start** in this first slice.

**Unresolved alternatives (must not be coded as silent defaults):** S2 = job `in_progress`; S3 = first checklist result (couples to results lane — reject for this slice).

---

## 10. Atomicity, races, direct-write protection

| Topic | Required behavior |
|-------|-------------------|
| Pin vs retire of target version | Serialize on version row; pin only if still `published`; else deny |
| Pin/replace vs visit start | Serialize on job (or pin set); documented outcome: either pin lands then start locks, or start lands then pin denied — **never** half-applied |
| Two concurrent replaces | Exactly one `active` pin per job after commit |
| Success + audit | Same transaction; audit failure rolls back business write |
| Denied op | Business unchanged; explicit errcode |
| Direct writes | **REVOKE** INSERT/UPDATE/DELETE on pin table from `authenticated`/`anon`; mutations **only** via SECURITY DEFINER RPCs |

**Proposed audit actions (agree before coding):**  
`routine_job_pinned` · `routine_job_pin_replaced` · `routine_job_unpinned` · `routine_job_pin_denied` · `routine_job_pin_authz_denied`  

**Unresolved:** Exact `entity_type` string vs B1–B7 ledger conventions.

---

## 11. UI entry points and errors

| Surface | Actor | Behavior |
|---------|-------|----------|
| Job detail — Routines panel | Admin/Support (authorized) | Show active pin + history; pin picker (published only); replace/unpin with **required reason** |
| Job detail — read | Assigned technician | Read-only active pin + retired badge if applicable; preview link |
| Errors | All | Exact, distinct codes/messages for: not published, retired, applicability deny, unlinked, uncatalogued, locked after start, authz, cardinality |

Acceptance must assert **exact** success state, **absence of error**, and **persisted** pin after reload — **never** substring-match action labels.

---

## 12. Acceptance scenarios (Spark matrix seed)

| ID | Scenario | Expect |
|----|----------|--------|
| RB-01 | Admin/Support pins published V1 on authorized job with linked applicable machine | One active pin `routine_version_id=V1`; audit |
| RB-02 | Pin draft / in_review | Denied; unchanged |
| RB-03 | Pin retired version | Denied |
| RB-04 | Family / model mismatch | Hard deny |
| RB-05 | Unlinked or uncatalogued machine | Clear deny; no inferred allow |
| RB-06 | Publish V2 after pin V1 | Pin still V1 |
| RB-07 | Replace V1→V2 before start + reason | V1 `replaced`, V2 `active`; history |
| RB-08 | Unpin before start + reason | `unpinned`; history |
| RB-09 | Replace/unpin after first visit `in_progress` | Denied; no override |
| RB-10 | Reassignment after start | Lock boundary **not** reset; still denied |
| RB-11 | Concurrent replace | One active pin |
| RB-12 | Concurrent pin vs retire | No pin to retired |
| RB-13 | Concurrent pin vs visit start | Documented serialized outcome |
| RB-14 | Second active pin on same job | Denied (slice-1 cardinality) |
| RB-15 | Tech reads pin; Customer denied internal content | Authz |
| RB-16 | Direct table write as authenticated | Denied |

Technician results / submit skew → **not** in this matrix.

---

## 13. Recommendations vs unresolved (summary)

### Recommendations (this proposal)

1. Job-scoped pin store; one **active** pin per job in slice-1.  
2. Append-only history; schema not hostile to later multi-routine pins.  
3. Admin + Support manage pins within **authorized job scope**.  
4. Linked canonical machine required; unlinked/uncatalogued → clear deny, never inferred.  
5. Exact immutable `routine_version_id`; publish never mutates pins.  
6. Retired: no new pins; existing pins readable.  
7. Replace/unpin requires reason; only before first visit `in_progress`; boundary not reset by reassignment.  
8. No privileged post-start override in this slice.  
9. RPC-only mutations; atomic audit; serialized races.  
10. No customer internal routine content.

### Unresolved (must close before implementation)

1. Job-only vs visit dual-write.  
2. Precise Support job-scope = existing SELECT policies (cite).  
3. Future named “supported applicability” for unlinked machines (if any).  
4. Audit `entity_type` / action string final names.  
5. Whether initial pin requires a reason (replace/unpin already required).

---

## 14. Implementation gate

| Gate | Rule |
|------|------|
| Spark | PASS / agree policies on this contract tip |
| Runtime | **No** migration/UI until gate |
| Staging / production / FR-1 / merge | Not authorized |

**Spark:** Review exact contract file SHA once delivered; build independent acceptance matrix from §12. Keep Lane B distinct from Lane A closeout.
