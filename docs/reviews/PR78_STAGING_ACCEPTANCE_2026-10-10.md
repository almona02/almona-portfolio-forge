# PR #78 staging acceptance — 10 October 2026

**Composite score remains 88/100 provisional** (no raise without independent review).  
FP-027 remains **OPEN**; Caluminium evidence does not close DoWin ORTA. No production SQL applied.

## A. Identifiers

| Item | Value |
|---|---|
| PR | [#78](https://github.com/almona02/almona-portfolio-forge/pull/78) `fix/cut-ledger-fingerprint-parity` |
| Final SHA (PR head) | `ca820035ec9abdee73ac25c622d57bf948aa7e1f` |
| Staging merge tip | `1fc4b05e` (`staging/final-goal-dual-head`) |
| Staging-bound preview (use this) | https://almona-portfolio-forge-7ol204oud.vercel.app — dpl for `8b33b3ae` / staging env `apnmoevmvihfzcnttctx` |
| GitHub #78 preview (do not use for staging) | https://almona-portfolio-forge-k3wrumn5t.vercel.app — **prod** Supabase `shfsebdncjnncqqnewfj` baked in |
| Staging Supabase | `apnmoevmvihfzcnttctx` |
| Latest staging migration | `20261010161725_fix_delivery_ack_owner_ambiguity` |
| Phone-review worktree | untouched (`codex/workspace-setup` @ `f27f0317`) |

## B. Design × quantity matrix (independent area)

Formula: `(width_mm/1000) × (height_mm/1000) × quantity` → **m²**.  
Σ = **76.68 m²**, **18 units**, **10 distinct** pattern×size signatures.  
Artifact: `test-results/final-goal-staging/fg78-acceptance-matrix.json`.

Pack used: **caluminium-ps** (catalogue). Dedicated custom pack UI create: **not run** this pass (see F).

## C. Optimization / parity

| Metric | Value |
|---|---|
| designCutsWeighted | **489** |
| placedCuts | **489** |
| unplacedCuts | **0** |
| bars | 124 |
| kerfMm / trimMm | 4 / 0 |
| efficiency | 93.42% |
| classification | `estimate_only` |
| manufacturingEligible | false |
| ledgerParityAllAgree | **true** |
| fingerprint | `3b8b437af3688922` |

Optimize All remains estimate_only (no manufacturing-qualified convert from estimate path). Evidence recorded separately (scripted) for 10/10 poses after hardener clear.

## D. Workflow results

### Positive (browser on staging-bound preview)
- Vercel protection bypass ≠ app auth (cookie bypass then Supabase owner session)
- Aggregate BOM + Optimize All + reload + fresh login: **PASS** (`fg-local-ui-smoke.json`)

### Positive (scripted staging RPCs)
- Hardener request+admin approve all 10 poses
- `record_fabricator_optimization_evidence` **10/10**
- Prior pose-1 convert→QC→delivery chain (earlier session)

### Negatives
- Convert without evidence: blocked (prior `fg-mfg-chain-attempt`)
- Ordinary user cannot admin-approve hardener (admin RPC required)
- **Not re-run this pass:** hardener reject/revoke/override UI, cross-owner access, authority revocation browser walk

## E. Artifacts (local, sanitized)

- `test-results/final-goal-staging/fg78-acceptance-matrix.json`
- `test-results/final-goal-staging/fg-local-ui-smoke.json`
- `test-results/final-goal-staging/fg-ledger-optimize-metrics.json`
- `test-results/final-goal-staging/fg-evidence-all-poses.json`
- `test-results/final-goal-staging/fg-ledger-contract-report.json`
- Contract runner: `npm run test:ledger` → `scripts/fg-ledger-contract-suite.mjs` (9/9)

## F. Blockers (failed / blocked / not run)

| Item | Class | Cause |
|---|---|---|
| GitHub #78 preview uses **production** Supabase | **blocked** | Vercel preview env for PR branch injects `shfsebdncjnncqqnewfj`; staging acceptance must use staging-bound deploy or local `.env.local` |
| Dedicated custom system pack + Profile Studio Gold flexibility (mixed/asymmetric, undo, Egyptian/Turkish routes) | **not run** | Timeboxed; diverse caluminium patterns used instead; UI custom-pack create not completed |
| Browser order→release→QC→delivery for all 10 poses | **not run** | Evidence/hardener scripted; full browser manufacturing UI for 10 poses not driven |
| Hardener reject / revoke / override + cross-owner negatives (full matrix) | **not run** | Partial prior negatives only |
| Optimize classification `estimate_only` | **expected** | Project estimate path is non-qualifying; qualified evidence is server RPC, not Optimize All |
| FP-027 | **blocked** (open) | Requires separate DoWin ORTA evidence — Caluminium does not close |
| Production promotion | **not authorized** | Staging only |
| CI on `ca820035` | **pending** | Pushed; type deltas for TS7006/TS2352/TS2322 addressed — await Actions |

## Layer notes (do not flatten)

| Layer | Note |
|---|---|
| Implementation | Fingerprint preserve + multiset parity + browser-safe SHA-256 + contract suite |
| CI | Prior tip failed type delta; fix in `ca820035` — re-check Actions |
| Staging-browser | PASS on staging-bound preview; GitHub #78 preview unsafe for staging |
| Production | No promote; scorecard stays provisional 88 |
