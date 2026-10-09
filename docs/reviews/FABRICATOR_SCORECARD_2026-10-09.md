# Fabricator scorecard — 9 October 2026

**Assessment: 82/100 provisional** (implementation + local/CI stack).  
**Live acceptance on almona02.com: not demonstrated.** Do not treat this score as FINAL GOAL completion.

Canonical prior scorecard: [FABRICATOR_UPGRADE_SCORECARD_2026-10-05.md](../plans/FABRICATOR_UPGRADE_SCORECARD_2026-10-05.md).

## Independent head verification (this run)

| Artifact | Status |
|---|---|
| `origin/main` | `f9954be9` — Merge #69 (stack tip onto main) |
| Production deploy (GitHub `Production`) | `f9954be9` (2026-10-09 00:56 UTC) |
| `www.almona02.com` HTML | Vercel HIT; `last-modified` 2026-10-09 11:10:39 GMT; bundle `/assets/index-Bed1o7LH.js` |
| PR #70 head (pre this slice) | `d64a6769` — type-delta / build / constitutional **green** |
| PR #64 | Open draft — empty-DB migration replay (parallel) |
| Phases 0–7 polish PRs (#54–#60) | Open; not on manufacturing critical path |

## Layer scores (provisional)

| Layer | Score | Meaning |
|---|---|---|
| Implementation (Batches 1–6 + stack code on main) | **~94** | Unchanged product surface largely present |
| Manufacturing stack local/CI | **~82** | #69 on main; hardener/admin/convert RPCs in prod DB; measuring mobile #70 in flight |
| Live / staging acceptance | **~38** | Migrations present; full 10/18 manufacturing-qualified live walk **not run** on dedicated fixtures |
| Production readiness | **NOT READY** | Name-based hardener exemptions still live; authoritative optimize evidence hardening incomplete; FINAL GOAL checklist open |

Composite provisional **82/100** = weighted read of stack (~82) with live still far below exit. Raising above 90 requires FINAL GOAL evidence below.

## READ-ONLY deploy / DB audit (`shfsebdncjnncqqnewfj`)

**No repairs applied.**

### Confirmed applied (`schema_migrations`)

| Version | Name (MCP list) |
|---|---|
| `20261009001810` | fabricator_manufacturing_admin_workflow |
| `20261009001946` | fabricator_manufacturing_admin_workflow_rpcs |
| `20261009002042` | convert_pose_quote_to_order |
| `20261009002133` | fabricator_hardener_admin_verification |
| `20261009002244` | fabricator_hardener_gate_hardening |

Local filenames use different timestamps (`20261008120000_*`, `20261009120000_*`, …) — **name drift only**; #69 claim that manufacturing SQL is on production is **confirmed**.

### RPCs present (sample)

Admin manufacturing approve/reject/revoke/list; hardener propose/review/override/revoke; `assert_fabricator_hardener_cleared`; `get_fabricator_manufacturing_authority`; `request_fabricator_manufacturing_approval`.

### Tables + RLS

`fabricator_manufacturing_*`, `fabricator_hardener_*`, `fabricator_optimization_evidence`, `hardener_selections` — **RLS enabled**.

### Triggers

- `trg_assert_hardener_on_position_release` → `fabricator_position_releases`
- `trg_stale_hardener_proposals` → `fabricator_positions_v2`

### Drift / gaps (do not auto-fix)

1. **`system_pack_requires_hardener`** still name-lists `%-no-hardener` / `sandbox-no-hardener` (not versioned applicability metadata).
2. Frontend prod SHA is main tip; **PR #70 measuring confirm/pack-template separation not in production**.
3. Playwright `fabricator-project-1018-cut-chain` not in `fabricator-acceptance-e2e.yml` CI job list.
4. Local 10/18 Vitest metrics remain `estimate_only` classification until manufacturing-qualified convert evidence is proven live.

## PR #70 slice (this run)

| Item | Result |
|---|---|
| Type-delta / build / constitutional on `d64a6769` | **pass** |
| Layout templates vs certified pack | `patternPackCompatibility.ts` — donors = templates; certified = direct `compatibleSystems`; confirm required for templates |
| Unknown color/glazing | `measuringAppearance.ts` — no silent save; Confirm-step checkboxes |
| Mobile Vitest | `SmartMeasuringInterface.mobile.test.tsx` — 3/3 pass |
| Arabic/RTL measuring → BOM | **not run** this slice |
| Desktop measuring → reload → BOM | **not run** this slice (prior preview E2E existed for pattern sync) |

## Measured pooled E2E (prior local evidence — not re-run)

From 8 Oct scorecard / Vitest manufacturing chain (classification **`estimate_only`**):

| Metric | Value |
|---|---|
| Positions / units | 10 / 18 |
| Placed pieces | 414 (= 23×18) |
| Bars | 74 |
| Kerf | 4 mm |
| Waste | 45057 mm |
| Efficiency | 89.85% |
| Area (uniform 1200×1400) | 30.24 m² |

**Status:** helper evidence only. Diverse-pose area and live reload/fresh-login **not verified** this run.

## FINAL GOAL checklist

| Goal item | Status |
|---|---|
| Dedicated user, customer, project | **not run** (dedicated) |
| Custom system pack + profiles/roles/stock | **not run** |
| 10 genuinely different poses / 18 units | **not run** (uniform fixture only historically) |
| Complete project BOM + optimize >100 placed cuts | **partial** — local estimate 414 cuts; not live manufacturing-qualified |
| Quantities, area, bars, trim, kerf, waste, zero unplaced | **partial** — local estimate metrics; not re-verified |
| Save + reload + fresh login | **not run** (this run) |
| Hardener approve / override / reject / revoke / invalidation | **partial** — SQL + unit/pgTAP; live admin walk open |
| Order → release → QC → delivery + negatives | **not run** |
| Gold-tier flexibility (mixed/asymmetric, undo/redo) | **partial** — code present; not FINAL GOAL proven |
| Egyptian / Turkish / custom Profile Studio entry | **not run** |

## Remaining blockers → next action

1. Land PR #70 (measuring confirm + pack capability) after CI green on tip.
2. Harden authoritative optimization evidence (reject stale/wrong fingerprints; server-side placement checks) — new focused PR.
3. Replace `%-no-hardener` with versioned applicability metadata + denial tests — new focused PR (**requires explicit auth before any production SQL**).
4. Wire Playwright 1018 into CI acceptance; run diverse-pose measured E2E; record metrics artifact.
5. Staging then (only with approval) live FINAL GOAL walk on almona02.com; update this scorecard with digests.

## Explicit non-claims

- 82/100 is **not** workshop readiness.
- Green PR checks ≠ live manufacturing BOM.
- Production migrations present ≠ FINAL GOAL complete.
