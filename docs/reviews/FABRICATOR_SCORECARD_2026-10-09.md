# Fabricator scorecard — 9–10 October 2026

**Assessment: 89/100 provisional** (implementation + CI + staging §5.2 + Phase B fail-closed gates + prod Phase C SQL smoke).  
**Live acceptance on almona02.com: not demonstrated.** Do not treat this score as FINAL GOAL completion.

Canonical prior scorecard: [FABRICATOR_UPGRADE_SCORECARD_2026-10-05.md](../plans/FABRICATOR_UPGRADE_SCORECARD_2026-10-05.md) (synced 10 Oct).  
Staging / promote plan: [FABRICATOR_STAGING_MIGRATION_PLAN_2026-10-09.md](../plans/FABRICATOR_STAGING_MIGRATION_PLAN_2026-10-09.md).

## Independent head verification (refreshed 10 Oct)

| Artifact | Status |
|---|---|
| `origin/main` tip | **`f27f0317`** — #75 docs on tip of #74→#71→#72→#70→#73 (`8a1ac7d7`) |
| Stack #61–#68 via #69 | **merged** (`f9954be9`) |
| PR #70–#74 | **merged** |
| PR #75 | **merged** (Phase B/C docs) |
| PR #64 empty-DB replay | open draft (parallel) |
| Open follow-ons | #76 evidence binding, #77 Approvals reachability, #78 cut-ledger fingerprint, #79 materials purchase |
| Vercel Production | deploy recorded for `f27f0317` / `8a1ac7d7` family |
| Railway | production deploy success for tip |
| Staging Supabase `apnmoevmvihfzcnttctx` | #71+#72 applied; §5.2 smoke **pass** |
| Prod Supabase `shfsebdncjnncqqnewfj` | #71+#72 applied; §5.2 reject-only smoke **pass**; `evil-no-hardener` **true** |
| Phase B fixture walk | fail-closed + cross-owner **PASS**; positive convert **OPEN** |

## Layer scores (separate — do not flatten)

| Layer | Score | Meaning |
|---|---|---|
| **Verified implementation** | **~94** | Product surface + stack code largely present |
| **Current-head CI** | **~96** | Merge chain landed; tip deploy green |
| **Local / staging acceptance** | **~68** | Estimate 10/18 + staging §5.2 + Phase B gates; §5.3 positive convert open |
| **Live acceptance** | **~55** | Prod SQL hardenings live; FINAL GOAL walk **not run** |
| **Production readiness** | **PARTIAL** | Phase C SQL done; live manufacturing walk still required |

Composite provisional **88 → 89/100** after Phase B fail-closed / isolation evidence. Raising further needs §5.3 positive convert and/or live FINAL GOAL.

## Phase B fixture walk (Batch 0 Owner A)

| Check | Result |
|---|---|
| Login Owner A | **pass** |
| Measure valid | **pass** |
| Design without approved authority | **`estimate_only`** (fail-closed) |
| BOM | **blocked** — prerequisites / unsupported pattern until authority |
| Stock / Optimize / Quote / Production–QC–Delivery | **locked** (expected under estimate) |
| Cross-owner position access | **reject** — “Position was not found for this owner and project.” |
| Positive convert-to-order | **not run** — blocked upstream of quote |

Artifacts: `/opt/cursor/artifacts/phaseb-walk-evidence.json`, `phaseb_*.webp`, `phaseb_gates_estimate_bom_cross_owner.mp4`.  
Fixture: project `ed7226b3-f51a-4903-8fca-ca2e69a46712`, position `cbb21cb0-5767-4e32-a9c0-9bab69477eee`.

## READ-ONLY deploy / DB audit (post Phase C)

Prod tip migrations include `fabricator_optimization_evidence_hardening` and `fabricator_hardener_applicability_metadata` (plus digest wrappers).  
Pre-apply: `system_pack_requires_hardener('evil-no-hardener')` was **false** (LIKE loophole). Post-apply: **true**.  
Evidence table row count at apply: **0**. `is_admin(uuid)` restored to profiles-based definition after smoke.

Also applied earlier (stack): manufacturing admin workflow, convert-to-order, hardener admin verification / gate hardening (see Phase B evidence `migrationsApplied`).

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
| Cuts per unit (ledger) | **23** |
| Placed / unplaced cuts | **414 / 0** |
| Bars | **74** (local artifact) / **75** (CI diverse-path note — use artifact for this row) |
| Kerf / trim | **4 mm / 0 mm** |
| Waste | **45057 mm** |
| Efficiency | **89.85%** |
| Reload re-BOM | **23** matches required |

### Diverse-pose fixture (local / CI verified)

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
| Reload / fresh login | **not run** (browser) |
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
| Dedicated user, customer, project | **partial** — Batch 0 fixtures; not custom live pack |
| Custom system pack + profiles/roles/stock | **not run** |
| 10 genuinely different poses / 18 units | **partial** — diverse estimate fixture |
| Complete BOM + optimize >100 placed cuts | **partial** — estimate 489 / 414 |
| Quantities, area, bars, trim, kerf, waste, zero unplaced | **partial** |
| Save + reload + fresh login | **not run** (live) |
| Hardener approve / override / reject / revoke / invalidation | **partial** — prod §5.2 reject paths; live walk open |
| Order → release → QC → delivery + negatives | **not run** |
| Egyptian / Turkish / custom Profile Studio | **partial** — #74 contract |
| Fail-closed without authority / cross-owner | **pass** — Phase B |

## Remaining blockers → next action

1. ~~Merge chain~~ **done** (`8a1ac7d7` / tip `f27f0317`).
2. ~~Staging Option A + §5.2~~ **done**.
3. ~~Phase C prod #71/#72~~ **done** (owner grant).
4. ~~Phase B fail-closed + isolation~~ **done**.
5. §5.3 positive convert on disposable fixture (approved authority + compatible pattern).
6. Live FINAL GOAL on almona02.com → honest scorecard close.
7. Optionally close superseded open PRs #54–#57; triage #76–#79.

## Explicit non-claims

- 89/100 ≠ workshop readiness.
- Prod SQL smoke ≠ manufacturing-qualified BOM.
- Phase B gate PASS ≠ positive convert or release→QC→delivery.
- Closing `%-no-hardener` ≠ full hardener approve/override/revoke walk.
- Diverse estimate 10/18 ≠ live custom-pack project on almona02.com.
