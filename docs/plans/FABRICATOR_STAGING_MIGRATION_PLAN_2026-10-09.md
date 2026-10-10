# Fabricator merge + staging readiness — 9–10 October 2026

**Status:** Phase A complete. Phase B/C §5.2 for #71/#72 complete. **Ledger/kerf evidence harden** implemented (code + staging smoke); §5.3 full fixture walk still open.  
Keep provisional scorecard at **88/100**.

Canonical scorecard: [FABRICATOR_SCORECARD_2026-10-09.md](../reviews/FABRICATOR_SCORECARD_2026-10-09.md).

---

## 1. Merge chain (executed)

#74 → #71 → #72 → #70 → #73 → tip `8a1ac7d7`.

---

## 2. Staging / prod DB

| Project | Ref | #71/#72 | Ledger/kerf (`20261010010000`) |
|---|---|---|---|
| Staging `almona02-staging` | `apnmoevmvihfzcnttctx` | applied (stub baseline) | **applied** + reject smoke |
| Prod `almona02` | `shfsebdncjnncqqnewfj` | applied (Phase C) | **not applied** (await merge + auth) |

---

## 3. Post-#71 review hardenings

### 3.1 Code / SQL

Migration `supabase/migrations/20261010010000_fabricator_optimization_evidence_ledger_kerf.sql` + TS mirror:

1. **Kerf/trim accounting** (FP-023B): overrun when `Σ(length)+N·kerf+trim > stock`
2. **Design-ledger reconciliation**: `requiredCuts` exact multiset vs placed cuts (missing / duplicate / substituted / wrongly sized)
3. **Rule version**: must match `canonical_approved_rule_version(authority.cuttingRules)` or content fingerprint — not free-form labels
4. **Ledger bind**: `designFp||placementFp` required

### 3.2 Tests

- Vitest: `validateOptimizationEvidencePayload.test.ts`, `recordOptimizationEvidence.test.ts` (18)
- Constitutional: GuaranteeVerification ledger/kerf case
- pgTAP: `fabricator_optimization_evidence_ledger_kerf_test.sql`; convert test fixtures bumped to schemaVersion 2

### 3.3 Staging reject smoke (recorded)

kerf overrun, missing, duplicate, substituted, wrong size, rule-label content-bound — all pass.

Artifact: `/opt/cursor/artifacts/staging-ledger-kerf-smoke.log`.

---

## 4. §5.3 fixture walk — status

| Step | Status |
|---|---|
| Approval → optimization evidence (reject paths) | **done** on staging smoke |
| Successful convert with ledger-bound evidence | **blocked** — stub staging lacks full manufacturing authority/convert stack parity |
| Release → QC → delivery | **blocked** — tables/RPCs absent on stub staging; needs #64 empty-DB replay or prod-parity staging |
| Reload + fresh login persistence | **not run** (needs Auth UI fixtures) |

**Next:** apply #64 empty-DB prerequisites onto staging (or branch when Pro available), seed disposable Auth users, then run convert→release→QC→delivery on a disposable project.

---

## 5. Phase C note

Prod #71/#72 smoke remains **owner-authorized / agent-recorded**. Ledger/kerf SQL must not ride that grant automatically — promote only after this PR merges and owner confirms.

---

## 6. Explicit non-claims

- Reject smoke ≠ successful manufacturing walk  
- Stub staging ≠ prod schema parity  
- 88/100 provisional unchanged until §5.3 + live FINAL GOAL  
