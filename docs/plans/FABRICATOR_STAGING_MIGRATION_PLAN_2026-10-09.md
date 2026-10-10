# Fabricator merge + staging readiness — 9–10 October 2026

**Status:** Phase A complete. Phase B/C §5.2 for #71/#72 complete. **Authoritative binding + §5.3 staging positive chain complete** on `apnmoevmvihfzcnttctx`.  
Keep provisional scorecard at **88/100**. Draft **#76** retained — **no production promote** without separate authorization.

Canonical scorecard: [FABRICATOR_SCORECARD_2026-10-09.md](../reviews/FABRICATOR_SCORECARD_2026-10-09.md).

---

## 1. Merge chain (executed)

#74 → #71 → #72 → #70 → #73 → tip `8a1ac7d7`.

---

## 2. Staging / prod DB

| Project | Ref | #71/#72 | Ledger/kerf | Authoritative binding | §5.3 walk |
|---|---|---|---|---|---|
| Staging `almona02-staging` | `apnmoevmvihfzcnttctx` | applied | applied | **applied** (`20261010020000`) | **PASS** (SQL + Auth login) |
| Prod `almona02` | `shfsebdncjnncqqnewfj` | applied (Phase C) | **not applied** | **not applied** | n/a |

---

## 3. Authoritative binding (draft #76)

Migration `20261010020000_fabricator_evidence_authoritative_binding.sql` + TS mirror:

1. **No placement fallback** — missing BOM/design ledger fails closed
2. **Server-derived ledger** — `derive_required_cuts_from_position` from saved pose; record ignores client `requiredCuts`
3. **Kerf/trim/stock authority** — `manufacturingSettings` + catalogue stock lengths; zero-kerf / invented stock rejected
4. **Rule content fingerprint** — deductions / allowances / applicability (not IDs alone); TS/SQL parity via `pgJsonbText`

Prior ledger/kerf (`20261010010000_*`) remains: FP-023B accounting + multiset reconcile + `designFp||placementFp`.

### Tests

- Vitest: fabricated ledger, missing BOM, zero-kerf, invented stock, rule-content drift, free-form labels
- pgTAP: `fabricator_evidence_authoritative_binding_test.sql` + ledger/kerf suite
- Fixtures: authority payloads include `manufacturingSettings` + rule content

Artifacts: `/opt/cursor/artifacts/authoritative-binding-vitest.log`, `/opt/cursor/artifacts/staging-s53-positive-chain.log`.

---

## 4. §5.3 fixture walk — status

| Step | Status |
|---|---|
| Staging schema/RPC parity (empty-DB + manufacturing stack) | **done** on staging |
| Dedicated Auth fixtures (owner + admin) | **done** — password login HTTP 200 |
| Approval → optimization evidence (reject paths) | **done** |
| Successful convert with ledger-bound evidence | **done** |
| Release → QC → delivery | **done** |
| Reload + fresh login persistence | **done** (SQL reload + Auth password re-login) |

Script: `scripts/staging-s53-positive-chain.sql`.

---

## 5. Phase C note

**No production promote** of ledger/kerf or authoritative binding until merge + **separate owner authorization**. Phase C #71/#72 grant does not cover these files.

---

## 6. Explicit non-claims

- Staging §5.3 disposable fixture ≠ live FINAL GOAL on almona02.com  
- 88/100 provisional unchanged until live FINAL GOAL  
- Prod DB still lacks `20261010010000_*` / `20261010020000_*`  
