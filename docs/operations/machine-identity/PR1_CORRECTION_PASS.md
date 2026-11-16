# Machine identity PR1 — correction pass (local only)

**Date:** 2026-11-11  
**Authorization:** local disposable testing only. **No staging/production apply.**  
**Base freeze:** `3953da31`  
**Correction commit:** (see git log after freeze)

## Corrections applied

### 1. Duplicate existence disclosure

Customer-visible duplicate results (detect RPC + register response + owner-visible audit) depend **only on authorized (own) records**.

| Signal | Customer | Staff |
|---|---|---|
| `own_matches` | own exact canonical | own exact |
| `review_flag_separator_insensitive` | own sep-variants only | fleet advisory |
| `foreign_match_exists` | always `null` | boolean |
| `staff_matches` | `[]` | includes retired |
| Register `identity_review_status` / `needs_staff_review` | own-only (e.g. own sep advisory) | n/a |
| Foreign exact / foreign sep match | **does not** flip customer review fields | opens `machine_duplicate_cases` + `staff_only` event |

Foreign matches create staff-only review cases. Customer registration response stays `clear` / `needs_staff_review=false` when the only match is foreign.

### 2. Identity audit / corrections

**PR1 choice:** defer authorized identity corrections; **block** ordinary client/direct updates to protected identity fields via `machines_enforce_identity_guards`.

- Protected: serials, brand, catalog fields, provisional ref, confidence/review/lifecycle, validation, owner_id, idempotency key, legacy_gaps, registration_source.
- Allowed without correction RPC: non-identity fields (e.g. `name`, `photo_urls`, `site_label`).
- `machines.id` is immutable **independently** of whether an audit/event FK references the row.
- Future correction RPC may `SET LOCAL machine_identity.allow_protected_update = 'on'` and must write before/after audit — not implemented in PR1.
- Silent identity edits are not permitted; audit for registration / link / replay / staff duplicate cases remains in scope. **Do not call edit-audit complete.**

### 3. Catalog status

Authoritative column: `catalog_link_status ∈ {linked, uncatalogued, uncertain}`.

| Status | Meaning |
|---|---|
| `linked` | `catalog_model_id` present; compatibility may use catalog |
| `uncatalogued` | honest free-text make/model; no catalog claim |
| `uncertain` | operator marked uncertainty; not a false link |

`catalog_uncertain` is a convenience mirror of `status = uncertain` only.

### 4. Ticket-link permission matrix (PR1)

| Actor | Ticket | Machine | Link |
|---|---|---|---|
| Customer (ticket owner) | own | own | **allow** |
| Admin / support | any | any | **allow** |
| Technician (assigned or not) | — | — | **deny (deferred)** |

Technician linking is **not** broadened to satisfy tests. UI/spec must treat technician link as deferred.

### 5. Staff-only duplicate audit

`machine_identity_events.visibility`:

- `owner_visible` — registration, idempotent replay, ticket link (no foreign case ids)
- `staff_only` — `duplicate_case_opened` with case id / match kind / candidate id

Owner RLS SELECT is limited to `owner_visible`. Staff sees both.

## Acceptance mapping (PR1 subset only)

| Wonder §13 | PR1 correction stance |
|---|---|
| 2 duplicate / no owner leak | Customer response non-disclosing; staff case + staff_only audit |
| 3 provisional ALM- | Unchanged |
| 7 legacy gaps honest | Unchanged; catalog status explicit |
| 8 PR1 audit partial | Reg/link/replay + staff duplicate cases; **corrections deferred/blocked** |
| 11 ticket auto-link | Unchanged; manual link matrix above |
| QR / transfer / merge / full passport | **Deferred — not claimed** |

## Spark targeted re-test focus

1. S5 non-disclosure: register+detect customer payloads; sep flag own-only; staff_only events.  
2. S3/S4 foreign exact & sep → customer `clear`, case row exists.  
3. S6 linked / uncatalogued / uncertain distinct.  
4. S7 technician deny (including assigned + own-machine edge).  
5. S8 protected edit blocked; UUID immutable; no false edit-audit claim.  

No staging apply.
