# Machine identity — implementation proposal (revised)

**Against:** `docs/machine-identity-spec.md` Wonder **v0.2**  
**Status:** Supervisor decisions recorded; **PR1 implemented for local disposable verification**.  
**Authorized now:** code + migration + local disposable tests.  
**Not authorized:** staging migration apply, production apply, transfers/QR/passport UI/merges/cutover.  
**Decisions:** `docs/operations/machine-identity/PR1_SUPERVISOR_DECISIONS.md`  
**Baseline evidence:** `.artifacts/slice0/machine-identity/BASELINE_20261111.json` (redacted).  
**Disposable results:** `.artifacts/slice0/machine-identity/disposable_pr1_results.json` (15/15 × 2 shapes).

---

## 0. Decision summary

| Decision | Proposal |
|---|---|
| Canonical `machine_id` | Existing `public.machines.id` (UUID). Do **not** create a parallel identity table. |
| Ticket link | Reuse existing `service_tickets.machine_id` (prod FK → `machines.id`). Do **not** propose a second FK. Staging lacks both `machines` and the column — close drift additively after approval. |
| CNC `machine_profiles` | Remains the Fabricator Pro / technical profile registry. Optional later binding; **out of first PR**. |
| Hard `UNIQUE(serial_number)` | Must be **removed/replaced** in the authorized migration. Duplicates → detection + `duplicate_review`, not constraint failure as the sole control. |
| Manufacturer API | **Not required** for this slice. Validation status defaults to `unchecked`. |
| Transfers / passport / Identity QR | Deferred (Wonder §§6–8). Preserve current `owner_id` / site-ish fields as-is. |
| F1 / F2 (Wonder §14) | Still open for full QR/transfer approval. This slice only needs the **minimum** permission rules in §5–6 below; it does not close F1/F2. |

---

## 1. Verified baseline (resolved facts)

### 1.1 Canonical identity table = `public.machines`

**Production (`shfsebdncjnncqqnewfj`) — exists.**

| Item | Observed |
|---|---|
| PK | `id uuid DEFAULT gen_random_uuid()` |
| Required | `name text`, `model text`, `serial_number text NOT NULL` |
| Owner | `owner_id uuid NULL` → `auth.users(id) ON DELETE CASCADE` |
| Other | `purchase_date`, `warranty_expiry`, `installation_date`, `warranty_valid`, `photo_urls` |
| Brand | **Absent** |
| Identity/lifecycle columns | **Absent** (no review status, no retired, no ALM-, no manufacturer validation) |
| Constraints | PK; **`UNIQUE (serial_number)`** global; owner FK |
| Indexes | `machines_pkey`, `machines_serial_number_key`, `idx_machines_owner_id` |
| RLS | Single policy `machines_manage_own` (`ALL` for `authenticated`): non-anonymous **and** `owner_id = auth.uid()` |
| Rows (redacted) | 12 machines, 3 distinct owners, 0 null owners |

**Staging (`apnmoevmvihfzcnttctx`) — `to_regclass('public.machines') = NULL`.**  
Customer registration identity table is **missing** on staging. `machine_profiles` exists (0 rows) and must not be mistaken for the customer machine registry.

### 1.2 Ticket relationship

| Env | `service_tickets.machine_id` | Serial text |
|---|---|---|
| Production | **Present**, `uuid NULL`, FK `service_tickets_machine_id_fkey` → **`public.machines(id)`** | `machine_serial_number`, `machine_model` nullable |
| Staging | **Absent** | `machine_serial_number`, `machine_model` present |

Prod usage today: **0** tickets with `machine_id` set; **5** with serial text. Nullable link already works; tickets do not depend on a machine row.

### 1.3 Registration writers

1. **Web customer registration** — `src/lib/api.ts` `registerMachine` → `INSERT public.machines`.  
   - On unique violation (`23505` / `machines_serial_number_key`): if same `owner_id`, returns existing row (and may merge photos) — partial same-owner retry.  
   - If other owner: throws *"This serial number is already registered to another account."* — **existence disclosure** (must change).  
   - UI (`MachineRegistration.tsx`) currently requires serial + **catalog model** (Yilmaz catalog); free-text model blocked in that flow.
2. **Python CNC API** — `python_backend/apis/v2/machines.py` → `machine_profiles` (optional serial, brand enum, operational `status`). Separate surface.

### 1.4 Gaps vs Wonder v0.2 (baseline, not speculation)

| Wonder expectation | Current fact |
|---|---|
| Immutable `machine_id` | `machines.id` already UUID PK — **reuse** |
| Brand + serial binding | No brand column; unique is serial-only |
| Missing serial / provisional + internal `ALM-` | Blocked by `serial_number NOT NULL` |
| Duplicate → review, no silent second row / no PII leak | Hard unique + existence-revealing error |
| Identity confidence ≠ operational status | No identity fields; `machine_profiles.status` is CNC operational |
| Ticket bind by identity with authz | Nullable FK exists on prod but unused; no access check on link |
| Append-only identity audit | No `machine_identity_events` / duplicate-case tables |
| Staging parity | Staging missing `machines` + ticket `machine_id` |

---

## 2. Scope of the first slice (additive)

### In

1. Treat `machines.id` as Wonder `machine_id`.  
2. Additive columns on `machines` for identity confidence, review/lifecycle, raw/canonical serial, brand, manufacturer validation, provisional `ALM-` (internal), gap markers, idempotency key.  
3. Replace hard `UNIQUE(serial_number)` with detection + `duplicate_review` cases (staff-visible).  
4. Request idempotency so same-request retries return the same machine.  
5. Authorization-safe duplicate **lookup** (no cross-customer disclosure).  
6. Reuse `service_tickets.machine_id`; add column on staging only if missing; **authorize link** before write.  
7. Minimum identity audit events (create + identity corrections).  
8. Preserve raw serial text; manufacturer-aware normalization helper (non-destructive).  
9. Support catalog-backed **and** uncatalogued / unknown-manufacturer / missing-plate / grandfathered records without inventing dates.

### Out (explicit)

- Ownership/site transfer workflows (Wonder §6), passport document model (§7), Identity/Event QR (§8).  
- Admin merge UI / destructive merges.  
- Forced re-registration or fleet backfill campaigns.  
- Speculative dual-write between `machines` and `machine_profiles`.  
- External manufacturer validation API.  
- Fuzzy matching as a gate (advisory only; may ship deferred).  
- Staging/production migration apply before written approval.

---

## 3. Exact proposed schema changes

All changes are **additive** except replacing the serial uniqueness constraint. No registry replacement. `machines.id` remains immutable.

### 3.1 `public.machines` alterations

```text
-- ADD (illustrative; final SQL only after approval + disposable tests)
ALTER TABLE public.machines
  ADD COLUMN IF NOT EXISTS brand text NULL,                    -- controlled list; NULL = unknown manufacturer
  ADD COLUMN IF NOT EXISTS catalog_model_id text NULL,         -- nullable: uncatalogued allowed
  ADD COLUMN IF NOT EXISTS serial_number_raw text NULL,        -- exact plate text; backfill from serial_number
  ADD COLUMN IF NOT EXISTS serial_canonical text NULL,         -- match key only; never hand-edited
  ADD COLUMN IF NOT EXISTS serial_normalization_version text NULL,
  ADD COLUMN IF NOT EXISTS provisional_asset_ref text NULL,    -- ALM-… internal only; UNIQUE when not null
  ADD COLUMN IF NOT EXISTS identity_lifecycle text NOT NULL DEFAULT 'active'
       CHECK (identity_lifecycle IN ('active','retired')),
  ADD COLUMN IF NOT EXISTS identity_review_status text NOT NULL DEFAULT 'clear'
       CHECK (identity_review_status IN ('clear','duplicate_review','serial_disputed')),
  ADD COLUMN IF NOT EXISTS identity_confidence text NOT NULL DEFAULT 'legacy_incomplete'
       CHECK (identity_confidence IN (
         'verified','unverified','unchecked','provisional','legacy_incomplete')),
  ADD COLUMN IF NOT EXISTS manufacturer_validation_status text NOT NULL DEFAULT 'unchecked'
       CHECK (manufacturer_validation_status IN ('verified','unverified','unchecked','not_applicable')),
  ADD COLUMN IF NOT EXISTS legacy_gaps jsonb NOT NULL DEFAULT '[]'::jsonb,  -- e.g. ["installation_date_unknown"]
  ADD COLUMN IF NOT EXISTS registration_source text NULL,
  ADD COLUMN IF NOT EXISTS registration_idempotency_key text NULL,
  ADD COLUMN IF NOT EXISTS site_label text NULL;               -- preserve/extend location without transfer UX
```

**Serial nullability (required for missing-plate):**

- Migrate `serial_number` to **nullable**.  
- Backfill `serial_number_raw` from current `serial_number`.  
- For provisional rows: manufacturer serial columns stay NULL; set `provisional_asset_ref = 'ALM-' || …`; `identity_confidence = 'provisional'`; **never** store `UNKNOWN`/`N/A`/`ALM-…` in manufacturer-serial fields.

**Constraint change:**

- `DROP CONSTRAINT machines_serial_number_key`.  
- Add **non-unique** index for staff matching, e.g. `(brand, serial_canonical) WHERE serial_canonical IS NOT NULL AND identity_lifecycle <> 'retired'`.  
- Partial unique on `provisional_asset_ref` where not null.  
- Partial unique on `registration_idempotency_key` where not null (per-owner or global — prefer `(owner_id, registration_idempotency_key)`).

**Do not** add a hard unique on `(brand, serial_canonical)` — that would block legitimate `duplicate_review` intake.

### 3.2 Duplicate case table (new, additive)

```text
public.machine_duplicate_cases (
  id uuid PK,
  created_at timestamptz,
  brand text NULL,
  serial_canonical text NULL,
  serial_raw text NULL,
  candidate_machine_id uuid NULL REFERENCES machines(id),  -- existing row if known to staff
  incoming_owner_id uuid NULL,
  status text CHECK (status IN ('open','resolved_same_machine','resolved_distinct','resolved_typing_error','dismissed')),
  resolution_notes text NULL,
  created_by uuid NULL,
  resolved_by uuid NULL,
  resolved_at timestamptz NULL
)
```

Customer-facing APIs never return `candidate_machine_id` or owner of another party.

### 3.3 Identity audit (minimum now)

```text
public.machine_identity_events (
  id uuid PK,
  machine_id uuid NOT NULL REFERENCES machines(id),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid NULL,
  actor_role text NULL,
  event_type text NOT NULL,  -- registered | serial_attached | serial_corrected | review_opened | review_resolved | gaps_marked | idempotent_replay
  provenance text NOT NULL,  -- web_registration | service_intake | admin | system_backfill
  before_values jsonb NULL,
  after_values jsonb NULL,
  reason text NULL,
  evidence_refs jsonb NULL
)
```

Append-only; no UPDATE/DELETE for non-admin maintenance roles.

### 3.4 `service_tickets.machine_id`

- **Production:** already exists → **reuse**; no second column.  
- **Staging (after approval):** `ADD COLUMN IF NOT EXISTS machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL` only after `machines` exists on staging.  
- Keep `machine_serial_number` / `machine_model` as customer-visible text forever (Wonder: preserve typed text).

### 3.5 Explicit non-goals for schema

- Do not rename `machines` or replace it with `machine_profiles`.  
- Do not auto-create passport/QR tables in the first PR.  
- Do not invent installation/warranty dates on grandfathered rows — record `legacy_gaps` instead.

---

## 4. Serial handling (raw + manufacturer-aware normalization)

### 4.1 Preserve raw text

- `serial_number_raw` (and display `serial_number` while transitional) always stores plate text trimmed of surrounding whitespace only.  
- Corrections append audit events; old raw values remain in `before_values`.

### 4.2 Canonical form — manufacturer-aware (avoid destructive conflation)

Wonder §4.1’s “strip all separators” is treated as a **default profile**, not a universal destructive rule.

| Rule | Behavior |
|---|---|
| Always | Uppercase for match key; trim ends; never mutate raw storage |
| Default profile | Remove spaces only; **retain** `-` `/` `.` unless a brand profile says otherwise |
| Brand profiles (config) | May define additional ignorable characters **per brand** after review |
| Leading zeros | Preserved |
| Versioning | `serial_normalization_version` required; changing rules requires collision re-scan before activate |
| ALM- | Never written into serial fields; never submitted as manufacturer serial |

Fuzzy matching: **advisory only** for staff; deferred from first PR if deterministic brand+canonical rules are insufficiently justified.

---

## 5. Duplicate handling & idempotency

### 5.1 Detection (not hard uniqueness)

On register:

1. Normalize to canonical (brand-aware).  
2. Staff-scoped search for existing non-retired rows with same `(brand, serial_canonical)` (or serial-only when brand unknown — staff path).  
3. Outcomes:
   - **None** → create machine (`identity_review_status=clear` or `provisional`).  
   - **Same owner, same machine intent** → return existing id (idempotent / soft).  
   - **Conflict / other owner / ambiguous** → create **`machine_duplicate_cases`** row; optionally create a **provisional** machine with `identity_review_status=duplicate_review` **only if** product requires a local handle; **never** expose the other customer’s machine. Prefer: block customer create with generic message *“This serial needs staff review”* without confirming another customer’s registration details.  
4. Distinct legitimate physical units sharing a serial → both may exist after staff resolution (`serial_disputed` / review resolved_distinct). Hard unique must not prevent that end state.

### 5.2 Idempotency

- Client sends `Idempotency-Key` (or body `registration_idempotency_key`) scoped to `owner_id`.  
- Replay with same key returns the **same** `machines.id` and writes `idempotent_replay` audit (or no-op).  
- Retries after network failure must not create a second row.

### 5.3 Authorization on lookup

| Actor | May see |
|---|---|
| Customer | Only **own** machines as candidates; never “registered to another account” with identifying detail |
| Support / admin | Broader reconciliation list (model, year, masked serial, case id) — still no unnecessary PII |
| Public / anon | Nothing |

Knowing a UUID or matching serial **never** grants ticket or passport access.

---

## 6. Ticket linking authorization

When setting `service_tickets.machine_id`:

1. Caller must be allowed to mutate the ticket (existing Slice 0 ticket authz).  
2. Caller must be authorized for that machine: `machines.owner_id = caller` **or** staff role (`admin`/`support` / assigned technician per existing ticket rules).  
3. Reject cross-customer links even if serial text matches.  
4. Ambiguous serial matches → do **not** auto-link; leave `machine_id` null; keep typed `machine_serial_number`.  
5. Existing null `machine_id` tickets continue to work unchanged.

---

## 7. Permission matrix (first slice)

| Action | Owner | Support/Admin | Technician | Anon |
|---|---|---|---|---|
| Register own machine | Yes | Yes (assisted) | Service-intake assisted | No |
| Read own machine | Yes | Yes | Assigned ticket only (later) | No |
| Duplicate lookup (customer API) | Own rows only | — | — | No |
| Duplicate reconciliation | No | Yes | No (unless explicitly assigned case) | No |
| Attach/correct serial on own provisional | Yes + evidence | Yes | Yes (intake) | No |
| Link ticket → machine_id | Own machine | Yes | Only if ticket+machine in scope | No |
| Read identity audit | Own summary | Full | Limited | No |
| Retire machine | Attestation | Yes | No | No |
| Transfer ownership/site | Deferred | Deferred | Deferred | — |

Wonder §14 F1/F2 remain open for QR resolver and transfer approvers; this matrix is sufficient for the registration/link slice only.

---

## 8. Exact API / UI changes (first PR boundary)

### 8.1 API

| Endpoint / RPC | Change |
|---|---|
| `POST /api/v2/machines/register` (or harden `api.registerMachine` + Edge/RPC) | Accept catalog **or** uncatalogued model; optional serial; brand/unknown; idempotency key; returns machine id; never leaks other owners |
| `POST …/machines/duplicate-check` | Authz-filtered; customer sees only safe own-side signals; staff sees review candidates |
| Ticket create/update | Optional `machine_id` with authz validation; preserve serial text fields |
| Audit read | Staff: by machine_id; owner: limited event types |

Prefer SECURITY DEFINER RPCs for register + duplicate-check so RLS cannot be bypassed into cross-tenant reads via PostgREST tricks.

### 8.2 UI (minimal)

- Registration: allow **uncatalogued** path + **missing plate** path (reason codes) alongside catalog path.  
- Show “Manufacturer serial: not recorded” for provisional; staff-only ALM- label.  
- Duplicate: generic customer message + support route; staff review queue later (can be admin-only table view in PR2 if needed).  
- Ticket form: optional machine picker limited to authorized machines; serial text remains.

### 8.3 First-PR boundary (small)

**PR1 (this proposal’s ship unit):**

1. Disposable migration: additive columns + drop serial unique + audit + duplicate_cases.  
2. Normalization helper + unit tests.  
3. Register RPC/API with idempotency + authz-safe duplicate behavior.  
4. Ticket `machine_id` authz on link; staging column only if missing.  
5. Grandfather backfill: copy raw serial, set `identity_confidence=legacy_incomplete`, mark gaps — **no invented dates**, validation=`unchecked`.  
6. Tests listed in §10.  

**Not in PR1:** transfer, QR, passport shell UI, fuzzy matcher, manufacturer API, `machine_profiles` merge, staging/prod apply.

---

## 9. Migration / backfill / recovery

### 9.1 Order (local disposable first)

1. Snapshot schema on disposable Postgres.  
2. Ensure `machines` exists (staging sync from prod DDL **without data** when authorized — separate change).  
3. Add columns / audit / duplicate_cases.  
4. Backfill `serial_number_raw` ← `serial_number`; set canonical via versioned helper; `manufacturer_validation_status='unchecked'`; `identity_confidence='legacy_incomplete'`; gaps for null installation_date etc.  
5. Drop `machines_serial_number_key` only after duplicate detection path is live in the same migration transaction or tightly coupled release.  
6. Add staging `service_tickets.machine_id` FK → `machines` if absent.  
7. Verify existing registration + ticket create still succeed.

### 9.2 Recovery

- Forward-only preferred.  
- Rollback: restore unique constraint only if no duplicate_review rows require two serials; otherwise keep non-unique and disable new review intake via flag.  
- Never delete `machines.id` or rewrite ownership in rollback.  
- Audit events retained even if feature flagged off.

### 9.3 Environments

| Env | Now | After approval |
|---|---|---|
| Local/disposable | Primary test bed | Required green before any remote apply |
| Staging | Missing `machines` — **blocked** until schema sync approved | Apply PR1 migration |
| Production | Source of truth for current `machines` | **Not authorized** by this document |

---

## 10. Tests (acceptance-mapped)

| # | Acceptance | Test type |
|---|---|---|
| A1 | Catalog-backed registration creates one `machines.id` | API/integration |
| A2 | Uncatalogued registration succeeds (`catalog_model_id` null, model text kept) | API |
| A3 | Missing serial → provisional + ALM- internal; serial fields null; ticket create still works | API |
| A4 | Legacy row backfill marks gaps; no invented dates; validation unchecked | Migration test |
| A5 | Duplicate candidate → review case; customer response has **no** other-owner identity | API authz |
| A6 | Same idempotency key retry → same machine id | API |
| A7 | Authorized owner can link ticket `machine_id` | API |
| A8 | Cross-customer link denied even with matching serial / known UUID | API |
| A9 | Tickets with null `machine_id` still create/list/get | Regression |
| A10 | Identity create/correct events have actor, time, provenance, before/after | Unit/integration |
| A11 | `machines.id` unchanged across correction | Integration |
| A12 | Normalization unit tests: raw preserved; brand profile does not conflate distinct serials | Unit |
| A13 | Canonicalization version recorded | Unit |

Run on disposable DB first. Official Vitest live suite / staging apply not part of this proposal’s authorization.

---

## 11. Revised acceptance criteria (gate for PR1)

1. Catalog **and** uncatalogued registration both succeed without forced catalog id.  
2. Missing serial and grandfathered/legacy records remain serviceable; gaps recorded, not fabricated.  
3. Duplicate candidates enter review **without** unauthorized disclosure of another customer’s machine.  
4. Same-request retries (idempotency key) return the same machine UUID.  
5. Ticket linking requires machine access; cross-customer denial holds.  
6. Existing nullable ticket↔machine links (and null links) continue to work.  
7. Identity-change audit recorded; machine UUIDs and ownership/site fields preserved; no transfer behavior introduced.  
8. No staging/production apply until this revised proposal is approved in writing.

---

## 12. Mapping to Wonder v0.2

| Wonder section | How this proposal complies / defers |
|---|---|
| §1.5 Manual first | Uncatalogued + missing plate + typed serial; no connectivity required |
| §2 `machine_id` | `machines.id` |
| §3 Registration fields | Additive columns; catalog optional in this slice (Wonder R2 catalog pause = product follow-up if strict) |
| §4 Serial / duplicate / ALM- | Raw + manufacturer-aware canonical; review not hard-unique; ALM- internal |
| §5 Lifecycle | `identity_lifecycle` separate from CNC operational status and from `identity_review_status` / confidence |
| §6–8 Transfers/passport/QR | Deferred |
| §9 Privacy | Duplicate lookup + ticket link authz |
| §10 Legacy | Grandfather + gap markers; no service penalty |
| §12 Audit | Minimum events now |
| §13 Criteria 1–3,7,8,11 (partial) | Targeted by PR1; 4–6,9–10 deferred with QR/transfer |
| §14 F1/F2 | Open — called out; PR1 uses narrow matrix only |

**Deviations recorded:**

1. Wonder’s separator-stripping default is **narrowed** to manufacturer-aware rules to avoid conflating distinct serials (supervisor: confirm).  
2. Strict “catalog model required / free text prohibited” (Wonder R2) is **relaxed in PR1** to allow uncatalogued machines as required by this revision; catalog remains the preferred path.  
3. Staging lacks `machines` today — identity work on staging cannot start until schema sync is separately approved.

---

## 13. Relation to Slice 0

Slice 0 ticket governance stays closed. This proposal must not reopen production authorization or broaden Slice 0 RLS. Ticket link authz builds on existing owner/staff boundaries.

---

## 14. Approval ask

Approve **in principle** this revised PR1 boundary and baseline.  
Do **not** authorize implementation or staging/production migration apply until:

1. Supervisor sign-off on deviations in §12,  
2. Written go-ahead for disposable migration dry-run results,  
3. Separate decision on staging `machines` schema sync.
