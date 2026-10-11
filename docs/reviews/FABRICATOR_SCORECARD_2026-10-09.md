# Fabricator scorecard — 9–10 October 2026

**Assessment: 88/100 provisional** (implementation + CI + staging §5.2/§5.3 + prod Phase C SQL smoke; live FINAL GOAL open).  
**Live acceptance on almona02.com: not demonstrated.** Do not treat this score as FINAL GOAL completion.  
**Oct 10 execution pack:** [OCT10_READINESS_EXECUTION_2026-10-10.md](./OCT10_READINESS_EXECUTION_2026-10-10.md). Composite **held at 88**.  
Browser FINAL GOAL: Egyptian wizard project `FP-2HUUKV` / Pose 1 measuring on staging (caluminium-ps) — **not** custom pack; **not** 10 poses / 18 units.

Canonical prior scorecard: [FABRICATOR_UPGRADE_SCORECARD_2026-10-05.md](../plans/FABRICATOR_UPGRADE_SCORECARD_2026-10-05.md).  
Staging / promote plan: [FABRICATOR_STAGING_MIGRATION_PLAN_2026-10-09.md](../plans/FABRICATOR_STAGING_MIGRATION_PLAN_2026-10-09.md).

## Independent head verification (refreshed)

| Artifact | Status |
|---|---|
| `origin/main` tip | **`99fd2520`** including #76 and #77 |
| PR #74–#73 / #75 | **merged** |
| PR #76/#77 | **merged** in main `99fd2520`; production #76 SQL still gated |
| PR #64 empty-DB replay | open draft (parallel); empty-DB applied to staging via MCP |
| Main protection | One required approval restored after owner-authorized #76 merge; required checks retained |
| FP-027 machine export | **OPEN / UNPROVEN** — Caluminium 414/489 cannot close |
| Vercel Production | deploy recorded for `8a1ac7d7` |
| Staging `apnmoevmvihfzcnttctx` | #71/#72 + ledger/kerf + binding; §5.2 smoke + §5.3 positive chain **PASS** |
| Prod `shfsebdncjnncqqnewfj` | #71/#72 Phase C + §5.2 reject-only smoke **pass** (`evil-no-hardener` **true**); ledger/kerf + binding **not applied** |

## Layer scores (separate — do not flatten)

| Layer | Score | Meaning |
|---|---|---|
| **Verified implementation** | **~95** | Binding + ledger/kerf + manufacturing surface |
| **Current-head CI** | **~96** | Merge chain landed; tip deploy green |
| **Local / staging acceptance** | **~82** | §5.2 reject + §5.3 positive chain + Auth login on staging |
| **Live acceptance** | **~55** | Prod SQL hardenings (#71/#72) live; FINAL GOAL walk **not run** |
| **Production readiness** | **PARTIAL** | Phase C SQL done; staging gates green; binding promote **blocked** pending auth |

Composite provisional remains **88/100** after Phase C SQL + staging §5.3. Raising further needs live FINAL GOAL.

## READ-ONLY deploy / DB audit (post Phase C)

Prod tip migrations include `fabricator_optimization_evidence_hardening` and `fabricator_hardener_applicability_metadata` (plus digest wrappers).  
Pre-apply: `system_pack_requires_hardener('evil-no-hardener')` was **false** (LIKE loophole). Post-apply: **true**.  
Evidence table row count at apply: **0**. `is_admin(uuid)` restored to profiles-based definition after smoke.

## Evidence harden follow-up (post-#71 review)

| Gap | Status |
|---|---|
| Stock validation ignores kerf/trim | **fixed** — FP-023B; Vitest + staging |
| Placement not reconciled to design ledger | **fixed** — server-derived ledger; no placement fallback |
| Rule version is a free-form label | **fixed** — full rule-content fingerprint |
| Kerf/trim/stock client tampering | **fixed** — authority `manufacturingSettings` + catalogue stocks |
| Successful manufacturing path + §5.3 walk | **done on staging** — see `staging-s53-positive-chain.log` |
| Reload / fresh login persistence | **done on staging** — SQL reload + Auth password login |

## Measured pooled E2E (`estimate_only`)

Command:

```bash
MFG_E2E_METRICS_PATH=/opt/cursor/artifacts/e2e-1018-metrics.json \
MFG_E2E_DIVERSE_METRICS_PATH=/opt/cursor/artifacts/e2e-1018-diverse-metrics.json \
npm run test -- --run src/lib/fabricator/__tests__/manufacturingChain.caluminiumPs.e2e.test.ts
```

### Uniform fixture (regression)

| Metric | Value |
|---|---|
| Classification | `estimate_only` / not manufacturing-eligible |
| Positions / units | **10 / 18** |
| Placed / unplaced cuts | **414 / 0** |
| Bars | **75** |
| Kerf / trim | **4 mm / 0 mm** |
| Waste | **50157 mm** |
| Efficiency | **88.85%** |
| Area | **30.24 m²** (1200×1400 × 18) |

### Diverse-pose fixture (local verified)

| Metric | Value |
|---|---|
| Classification | `estimate_only` / not manufacturing-eligible |
| Positions / units | **10 / 18** |
| Distinct pattern×size signatures | **10** |
| Placed / unplaced cuts | **489 / 0** |
| Bars | **124** |
| Kerf / trim | **4 mm / 0 mm** |
| Waste | **47894 mm** |
| Efficiency | **93.56%** |
| Area | **76.68 m²** |
| Reload / fresh login | **staging fixture done**; live open |
| Live project persistence | **not run** |

CI workflow: `.github/workflows/fabricator-measured-pooled-e2e.yml`.

## PR #70 measuring verification

| Check | Result |
|---|---|
| Layout templates vs certified packs | **implemented** |
| Color/glazing confirm (no silent save) | **implemented** |
| Mobile / RTL Vitest | **pass** |
| Live save → reload → BOM (auth UI) | **partial** |

## FINAL GOAL checklist

| Goal item | Status |
|---|---|
| Dedicated user, customer, project | **staging fixture done**; live open |
| Custom system pack + profiles/roles/stock | **partial** — authority catalogue on staging |
| 10 genuinely different poses / 18 units | **partial** — diverse estimate fixture |
| Complete BOM + optimize >100 placed cuts | **partial** — estimate 489 / 414 |
| Quantities, area, bars, trim, kerf, waste, zero unplaced | **partial** — server kerf/trim + binding gates |
| Save + reload + fresh login | **staging done**; live open |
| Hardener approve / override / reject / revoke / invalidation | **staging approve path done**; prod §5.2 reject paths; full negatives/live open |
| Order → release → QC → delivery + negatives | **staging positive done**; negatives/live open |
| Gold-tier flexibility | **partial** — remains on checklist |
| Egyptian / Turkish / custom Profile Studio | **partial** — #74 contract |

## Remaining blockers → next action

1. ~~Merge chain~~ **done** (`8a1ac7d7` / tip `f27f0317`).
2. ~~Staging Option A + §5.2 / §5.3~~ **done**.
3. ~~Phase C prod #71/#72~~ **done** (owner grant).
4. **Owner:** apply main protection/rulesets (proposal only — not auto-applied).
5. Merge #76 after protection + review + green CI on post-fix tip.
6. **Separate owner authorization** before any prod apply of `20261010010000_*` / `20261010020000_*`.
7. FP-027 DoWin ORTA conservation evidence (export remains blocked).
8. Browser FINAL GOAL (staging then disposable prod) → honest scorecard close.

## Explicit non-claims

- 88/100 ≠ workshop readiness.
- Staging §5.3 disposable fixture ≠ live FINAL GOAL.
- Prod SQL smoke ≠ manufacturing-qualified BOM.
- Prod still lacks ledger/kerf and authoritative binding SQL.
- Closing `%-no-hardener` ≠ full hardener approve/override/revoke walk.
- Diverse estimate 10/18 ≠ live custom-pack project on almona02.com.
- No production promote of binding without separate authorization.

## 11 October verified status and next steps

This section supersedes stale current-state labels above; earlier dated artifacts remain historical evidence.

- Main **99fd2520** includes **#76 and #77**. One required approval was restored after the owner-authorized #76 exception; required checks retained. No further review bypass authorized.
- Composite remains **88/100 provisional**, controlled pre-production. Batch DONE labels describe implementation, not completed browser/manufacturing contracts. Partial DXF, soft stock reservation, flag-dependent customer persistence and quote/order integration remain bounded gaps.
- Staging-only reviewed delta **20261011094729** (`pr76_reviewed_staging_evidence_delta`) passed **39/39 SQL checks**: owner/stock 8, canonical 15, binding 8, ledger/kerf 8. Test transactions rolled back and no fixtures persisted. This supplements prior staging SQL/Auth evidence, not browser or full convert acceptance. Production #76 SQL remains separately gated.
- E2E is **paused by owner instruction**. No new FINAL GOAL or workshop-readiness claim. FP-027 remains a machine-export blocker. Staging security remains open: 14 public tables without RLS and 24 anonymous security-definer findings.

Execution order:
1. Verify the isolated BOM save/qualification repair against current main: failed saves and stale responses cannot publish; new revisions require fresh authority; saved sliding cuts require exact profile/length/angle multiset parity. Do not merge original #80 qualification rebinding.
2. Repair #78 conflicts and ledger test contracts, then independently review fingerprint preservation. Split upgrade documentation from functional patches.
3. Complete #81 phase-one production inspector wiring, stable occurrence IDs, DoWin generator parity and catalogue/rule cache invalidation before phases 2-5.
4. Keep Gold flexibility explicit: asymmetric and mixed openings; material-specific aluminum/UPVC accessories; per-occurrence frame/sash/glass editing; authored profile choices must not be silently replaced to force parity.
5. Address staging schema/security parity through reviewed migrations; no reset or blanket production SQL push.
6. Resume disposable browser FINAL GOAL only on owner instruction: ten distinct poses, eighteen units, >100 cuts, save/reload/fresh login, hardener negatives and order/release/QC/delivery. Keep 414 uniform cuts and 489 diverse cuts attached to their separate fixtures and dimensions.

Keep implementation, CI, staging SQL, staging browser, live acceptance and production readiness separate. See [the repair report](CURSOR_FABRICATOR_BOM_REPAIR_2026-10-11.md).
