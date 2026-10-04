# Fabricator Design Studio and Apex Accuracy Execution Plan

**Plan ID:** FP-028  
**Status:** IN PROGRESS  
**Created:** 2026-10-04  
**Primary rule:** No output is manufacturing-ready unless system data, geometry, formula provenance, and piece reconciliation pass.

## Objective

Make Design Studio, templates, drafting, Apex, BOM, and optimization use one authoritative physical model:

authoritative position → design grid → physical geometry → manufacturing contract → BOM → optimization → QC

## Non-negotiable rules

1. Never invent profile dimensions, deductions, tolerances, stock lengths, prices, or hardware.
2. Missing approved system data blocks manufacturing output with a typed error.
3. Advisory recommendations cannot change saved manufacturing identity implicitly.
4. Do not alter an approved formula without source evidence and a golden fixture.
5. Use millimetres at UI and persistence boundaries. Use explicit helpers for micron conversion.
6. Include owner, project, position, source, and revision in caches and asynchronous commits.
7. Do not redesign the workspace until physical-output gates pass.
8. Screenshots and object-existence assertions are not accuracy evidence.
9. Each phase must pass focused tests, TypeScript, affected lint, build, and prior-phase tests.
10. Update this plan after every slice with status, commit, evidence, and remaining risk.

## Canonical acceptance fixtures

### F1 — ROCK 60 sliding

| Field | Required value |
| --- | --- |
| Overall size | 1210 × 1550 mm |
| System pack | rock60 |
| Layout | 1 row × 2 columns |
| Cells | Two sliding cells |
| Column widths | Sum exactly 1210 mm |
| Row heights | Sum exactly 1550 mm |
| Identity | Owner/project/position/source/revision required |

Required invariants:

- Measure, SmartDraw, Drafting, 3D, BOM, optimization, quote, production, and reload retain the identity and size.
- Both cells retain IDs, types, proportions, coordinates, and opening semantics.
- Required physical pieces reconcile one-to-one with optimized pieces.
- No generic profile, assumed tolerance, stale cache entry, or default system is accepted.

### F2 — Unequal casement/fixed

1500 × 1400 mm, one row, widths 900/600 mm, one casement and one fixed cell.

### F3 — Multi-row quantity

1800 × 2100 mm, 2 × 2 mixed grid, quantity 3.

## Confirmed baseline defects

| ID | Severity | Defect | Primary file |
| --- | --- | --- | --- |
| A1 | P0 | Apex V6 produces one frame and one sash regardless of grid | src/lib/fabricator/goldTier/ApexEngineV6.ts |
| A2 | P0 | Apex V6 invents generic manufacturing data for incomplete packs | ApexEngineV6.ts |
| A3 | P0 | Apex V6 cache omits system rules, profiles, quantity, glazing, and revision | ApexEngineV6.ts |
| A4 | P0 | Apex V2 gives every operable cell full-opening dimensions at 0,0 | ApexEngineV2.ts |
| A5 | P0 | Apex V2 loses source-cell opening direction | ApexEngineV2.ts |
| A6 | P0 | Apex V2 mixes mm and microns for mullion/transom stock | ApexEngineV2.ts |
| A7 | P0 | Thermal expansion has the wrong stored unit and is not applied | ApexEngineV2.ts |
| A8 | P0 | Pane, gasket, profile, and unit quantities do not reconcile | ApexEngineV2.ts |
| D1 | P0 | Physics UI claims standards verification while using assumptions | src/components/fabricator/EngineeringBay.tsx |
| D2 | P0 | Selecting a system can replace saved geometry | src/hooks/fabricator/useEngineeringEngine.ts |
| D3 | P1 | Late BOM responses can commit after identity/system changes | useEngineeringEngine.ts |
| T1 | P0 | Prestige templates reduce intent to row and column counts | drafting/prestige/presetApplication.ts |
| T2 | P0 | Invalid template strings silently become 1 × 1 | presetApplication.ts |
| T3 | P0 | Free-text recommendations do not map reliably to pack IDs | simplePresetsData.ts |
| T4 | P1 | Drafting conversion uses display pixels and array order | draftingToWindowGrid.ts |
| T5 | P0 | Template UI contains unverified authority claims | simplePresetsData.ts |

## Phase 0 — Characterization and authority boundary

**Status:** COMPLETE  
**Active slice:** Phase 6 / P6.2 operator live gates — blocked on approved ROCK60 authority seed + runbook execution

Deliverables:

- Add regressions for A1–A8, D2–D3, and T1–T4 before changing behavior.
- Identify every production caller for Apex V2 and V6.
- Mark existing ROCK 60 rules as evidence-backed or illustrative.
- Record expected pieces for F1–F3 without changing formulas.

Exit gate:

- Tests demonstrate defects independently. ✅
- Assertions verify exact identities, counts, lengths, units, and provenance. ✅
  (Piece lengths recorded as `pending_system_evidence` — no invented cut formulas.)

## Phase 1 — Authoritative manufacturing contract

**Status:** COMPLETE — 100/100

Scorecard:

| Slice | Score | Status |
| --- | ---: | --- |
| P1.1 Typed boundary: identity, dimensions, revision, quantity | 20 | Complete — 21 focused tests and TypeScript pass |
| P1.2 Normalized physical cells and geometry closure | 20 | Complete — 29 focused/fixture tests, lint and TypeScript pass |
| P1.3 Approved system, profile, cutting and tolerance evidence | 20 | Complete — 32 focused/fixture tests, lint, TypeScript and build pass |
| P1.4 Glazing, hardware and preview separation | 20 | Complete — 35 focused/fixture tests, lint and TypeScript pass |
| P1.5 Deterministic F1–F3 serialization and replay | 20 | Complete — F1–F3 deterministic replay; 40 focused tests, lint and TypeScript pass |

**Overall programme score:** 28/100 (`(Phase 0: 100 + Phase 1: 100) / 7 phases`, rounded down)

Create a strict immutable input containing:

- full workflow identity;
- overall dimensions in mm;
- normalized physical cells with exact bounds;
- approved system-pack revision;
- resolved profile roles and stock lengths;
- approved cutting and tolerance rule IDs;
- glazing and hardware selections;
- unit quantity.

Reject missing, non-finite, negative, inconsistent, or unapproved inputs. Preview estimates require a separate labelled contract that cannot reach manufacturing.

Suggested files:

- src/lib/fabricator/manufacturing/ManufacturingDesignContract.ts
- src/lib/fabricator/manufacturing/ManufacturingContractError.ts

Exit gate:

- Invalid input returns a typed blocking error.
- F1–F3 serialize and replay deterministically.

## Phase 2 — Template catalogue normalization

**Status:** COMPLETE — 100/100

Scorecard:

| Slice | Score | Status |
| --- | ---: | --- |
| P2.1 Versioned catalogue status, explicit grids and stable compatible pack IDs | 20 | Complete — 7 focused tests, lint and TypeScript pass |
| P2.2 Apply normalized grids losslessly and reject blocked/legacy schemas | 20 | Complete — 15 focused tests, lint, TypeScript and build pass |
| P2.3 Bind template identity to saved position and enforce compatibility | 20 | Complete — 13 focused tests, TypeScript and affected lint (0 errors) pass |
| P2.4 Remove unsupported authority claims and hide invalid templates | 20 | Complete — 12 focused tests, lint and TypeScript pass |
| P2.5 F1–F3 apply/save/reload/mode-round-trip acceptance | 20 | Complete — F1–F3 lossless; 23 focused tests, lint and TypeScript pass |

**Overall programme score:** 57/100 (`(Phase 0: 100 + Phase 1: 100 + Phase 2: 100 + Phase 3: 100) / 7 phases`, rounded down)

Replace free-text patterns and recommendations with stable template ID, schema version, explicit cells/spans/ratios/directions, compatible pack IDs, dimensional constraints, and evidence status.

Remove unsupported testimonials, certifications, project counts, fire ratings, and authority language. Invalid templates are hidden or blocked, never converted to 1 × 1.

Exit gate:

- Every selectable template validates.
- Apply → save → reload → Drafting → Design is lossless for F1–F3.
- Incompatible system/template combinations cannot be approved.

## Phase 3 — Canonical physical geometry

**Status:** COMPLETE — 100/100

**Overall programme score:** 57/100 (`(Phase 0: 100 + Phase 1: 100 + Phase 2: 100 + Phase 3: 100) / 7 phases`, rounded down)

Scorecard:

| Slice | Score | Status |
| --- | ---: | --- |
| P3.1 Authoritative source-cell conversion in millimetres | 25 | Complete — stable IDs, directions and closed bounds |
| P3.2 Span/overlap/closure property matrix | 25 | Complete — 17 focused tests and affected lint pass |
| P3.3 Editing preserves metadata through undo/recovery | 25 | Complete — edit/convert/duplicate/recovery/undo/redo tests pass |
| P3.4 F1–F3 reload and mode acceptance | 25 | Complete — F1–F3 and decimal-mm closure pass; partial edits fail closed |

Build a deterministic grid-to-cell converter using millimetre dimensions and ratios, never display pixels or rectangle order.

Required invariants:

- bounds remain inside the opening;
- widths and heights close within approved rounding tolerance;
- spans do not overlap;
- stable cell IDs survive mode changes;
- fixed, sash, sliding, panel, and empty remain distinct.

Exit gate:

- F1–F3 match after reload and mode round trips.
- Property tests cover ratios, spans, counts, and rounding.

## Phase 4 — Apex consolidation

**Status:** COMPLETE — 100/100

**Overall programme score:** 71/100 (`(Phase 0: 100 + Phase 1: 100 + Phase 2: 100 + Phase 3: 100 + Phase 4: 100) / 7 phases`, floored)

Scorecard:

| Slice | Score | Status |
| --- | ---: | --- |
| P4.1 Production entry point and contract adapter | 20 | Complete — contract/snapshot authority mismatch blocks; 15 focused tests, lint and TypeScript pass |
| P4.2 Per-cell pieces, source linkage and deterministic ordering | 20 | Complete — F1 sash/glazing linkage and divider geometry; glass cuts stay explicitly blocked |
| P4.3 Quantity, explicit units and approved stock authority | 20 | Complete — stable mm pieces, contract quantity and approved profile stock |
| P4.4 Piece manifest, BOM and optimization reconciliation | 20 | Complete — every eligible linear piece is conserved exactly once; unsupported components remain blocked |
| P4.5 Cache isolation and F1–F3 caller acceptance | 20 | Complete — cache/F1–F3 + batch fail-closed; live authority table/RPC verified; 6 SQL cases pass on almona02 |

Choose one production Apex entry point and keep legacy adapters only at the boundary.

Implement per-cell sash/glass generation, mullion/transom placement, source-cell linkage, quantity propagation, explicit units, contract-hash cache keys, profile stock lengths, and deterministic ordering.

Do not apply thermal, seismic, welding, or compensation adjustments until units and formula evidence are approved.

Exit gate:

- Required-piece manifest equals Apex and BOM output by stable piece ID.
- Optimization conserves every piece exactly once.
- Cache cannot cross system, identity, revision, glazing, quantity, or rules.

## Phase 5 — Design Studio correctness and usability

**Status:** COMPLETE — 100/100

**Overall programme score:** 85/100 (`(Phase 0–4: 100×5 + Phase 5: 100) / 7 phases`, floored)

Scorecard:

| Slice | Score | Status |
| --- | ---: | --- |
| P5.1 Remove unverified standards claims (D1) + estimate labels on physics | 20 | Complete — `assessPhysicsAuthority` fail-closed; EngineeringBay shows ESTIMATE / missing inputs; CONFORMANT only when all approved inputs present |
| P5.2 Explicit system↔geometry conversion + silent overwrite guards | 20 | Complete — pending conversion/suggestion actions; selectSystem preserves grid; Suggest Layout requires confirm |
| P5.3 Persist template/grid/system identity on save; bind to position | 20 | Complete — `DesignCompletionPayload` carries components+grid+systemPackId+presetId; callers persist identity; manual grid edit clears template |
| P5.4 Late preview reject + estimate labels on 3D/BOM surfaces | 20 | Complete — preview identity key; clear-on-switch; late commit reject; ESTIMATE chrome on 3D + BOM (replaced unverified precision claim) |
| P5.5 Canvas-primary layout; collapsible secondary panels; a11y checks | 20 | Complete — `EngineeringBayWorkbenchLayout` canvas-primary; CollapsiblePanel rails Ctrl+[/]; main landmark; BOM collapse; Space/Enter + aria-expanded |

- Preserve saved geometry when changing systems; require explicit conversion if incompatible.
- Bind selected template to the saved position.
- Reject late BOM and preview results after input changes.
- Label preview values as estimates.
- Remove standards-verification language unless all approved inputs are present.
- Give the editable canvas primary desktop space; make secondary panels collapsible.

Exit gate:

- No action silently changes geometry.
- Blocking states name the missing authoritative input.
- Keyboard and screen-reader checks pass.

## Phase 6 — Production acceptance

**Status:** IN PROGRESS — 60/100 (automated + fail-closed live scaffold; operator live gates open)

Scorecard:

| Slice | Score | Status |
| --- | ---: | --- |
| P6.1 Automated gates (focused suite, TS, lint, build) | 40 | Complete — focused FP-028 acceptance/engine/preview/layout tests; TypeScript; lint 0 errors; production build |
| P6.2 Live Measure→QC scaffold (runbook, A→B identity test, golden length pending fixture) | 20 | Complete — runbook + identitySwitch + ROCK60 length fixture fail-closed (`PENDING_EXTERNAL_FIXTURE`) |
| P6.2 Live operator gates (F1 Measure→QC, hard reload, 2nd account, golden compare) | 0 | Open — requires approved ROCK60 authority seed + operator execution of runbook |

Automated gates:

- focused unit and integration tests;
- physical-length parity;
- required-piece conservation;
- identity/revision isolation;
- TypeScript, affected lint, build, and CI.

Live gates:

1. Execute F1 from Measure through QC.
2. Hard reload every operational screen.
3. Switch A → B while A preview/BOM runs.
4. Repeat with a second authorized account.
5. Compare documents with the approved golden job.

## Required test matrix

| Area | Minimum cases |
| --- | --- |
| Dimensions | zero, negative, NaN, infinity, min/max, decimal mm |
| Identity | owner/project/position/source/revision mismatch |
| Geometry | unequal cells, spans, empty, fixed, sliding pair, 2 × 2 mixed |
| Systems | missing/unknown pack, missing roles, stale pack revision |
| Units | mm↔micron round trip, stock, tolerance, deduction |
| Quantity | 1, 2, 3 units |
| Cache | every manufacturing field changes the key |
| Async | A→B switch during preview and BOM |
| Templates | invalid schema, incompatible pack, lossless round trip |
| Reconciliation | missing, duplicate, altered, unexpected pieces |

## Agent procedure

For each slice:

1. Read this plan and the latest relevant audit.
2. Check the working tree; do not absorb unrelated changes.
3. Mark one slice IN PROGRESS.
4. Add or strengthen the failing regression.
5. Make the smallest production change that passes it.
6. Run focused tests, affected lint, and TypeScript.
7. Run the production build for runtime changes.
8. Update this plan with commit, results, and remaining risks.
9. Stop when formula provenance or authoritative system data is missing.

Never weaken assertions, replace a blocking error with a fallback, use screenshots as accuracy evidence, mix layout work with formulas, or close the plan from one fixture.

## Verification commands

    npm run test -- --run <focused files>
    npm run type-check
    npx eslint <affected files>
    npm run build

Windows fallback:

    .\\node_modules\\.bin\\vitest.cmd run <focused files>
    .\\node_modules\\.bin\\tsc.cmd --noEmit
    .\\node_modules\\.bin\\eslint.cmd <affected files>
    .\\node_modules\\.bin\\vite.cmd build --mode production

## Progress log

| Date | Slice | Result | Evidence |
| --- | --- | --- | --- |
| 2026-10-04 | Baseline audit | 34 focused tests passed but did not cover physical discrepancies | Source audit of Design Studio, templates, Apex V2/V6, hydration, and identity |
| 2026-10-04 | Phase 0 / T2 regression | COMPLETE — invalid/ambiguous/empty/non-positive template patterns fail closed; EngineeringBay does not replace the current grid | 5 focused tests passed; TypeScript passed; affected lint 0 errors; production build passed |
| 2026-10-04 | Phase 0 / D2 regression | COMPLETE — `selectSystem` changes pack identity only; F1/F2 grids preserved (no `defaultGrid` / 1×2 overwrite) | 8 focused tests passed (T2+D2); TypeScript passed; affected lint 0 errors; production build passed |
| 2026-10-04 | Phase 0 / D3 regression | COMPLETE — BOM keyed by identity string; late A results discarded after system/grid change; prior BOM cleared on identity change | 11 focused tests passed (T2+D2+D3); TypeScript passed; affected lint 0 errors; production build passed |
| 2026-10-04 | Phase 0 / A1 characterization | COMPLETE — F1 documents single frame+sash; 1×2 vs 1×1 identical sash lengths; `it.fails` locks Phase 4 per-cell acceptance; callers inventoried | 3 A1 + prior focused tests passed; TypeScript passed; affected lint 0 errors; production build passed |
| 2026-10-04 | Phase 0 / A2 fail-closed | COMPLETE — incomplete SystemPack / GENERIC codes throw `ApexSystemAuthorityError`; GENERIC-60 invention removed | 5 A2 + Apex V6 suite passed; TypeScript passed; affected lint 0 errors; production build passed |
| 2026-10-04 | Phase 0 / A3 cache identity | COMPLETE — cache key includes system rules, profiles, quantity, glazing, revision; cross-field cache hits blocked | 3 A3 + Apex V6 suite passed; TypeScript passed; affected lint 0 errors; production build passed |
| 2026-10-04 | Phase 0 / A4 characterization | COMPLETE — F1/F2 document full-opening sash at 0,0; `it.fails` locks cell-bounds acceptance | 3 A4 tests passed; TypeScript passed; affected lint 0 errors; production build passed |
| 2026-10-04 | Phase 0 / A5 linkage fix | COMPLETE — sash id = source cell id; openingDirection preserved (top/bottom→up/down); A4 sizing untouched | 4 A5 + A4 + Apex V2 suite passed; TypeScript passed; affected lint 0 errors; production build passed |
| 2026-10-04 | Phase 0 / A6 unit fix | COMPLETE — `stockLengthMmToMicrons` for frame/sash/mullion/transom; no mm-as-microns; no invented 6000 mm fallback | 5 A6 + Apex V2 suite passed; TypeScript passed; affected lint 0 errors; production build passed |
| 2026-10-04 | Phase 0 / A7 characterization | COMPLETE — α mm/°C/m vs claimed microns; cuts unchanged; invented 25°C ΔT documented; `it.fails` locks evidenced apply | 4 A7 tests passed; TypeScript passed; affected lint 0 errors; production build passed |
| 2026-10-04 | Phase 0 / A8 characterization | COMPLETE — F1/F3 pane/gasket/cutList/unit.quantity mismatches documented; reconciler + `it.fails` acceptance lock | 4 A8 tests passed; TypeScript passed; affected lint 0 errors; production build passed |
| 2026-10-04 | Phase 0 / T1 characterization | COMPLETE — `1x2 sliding` loses sliding/openingDirection; equal split only; `it.fails` Phase 2 lock | 3 T1 tests passed |
| 2026-10-04 | Phase 0 / T3 fail-closed resolver | COMPLETE — exact pack-id resolve only; all SIMPLE_PRESETS recommendations UNKNOWN; `it.fails` Phase 2 lock | 4 T3 tests passed |
| 2026-10-04 | Phase 0 / T4 characterization | COMPLETE — multi-rect pixel widths, 25px Y-cluster, array-order IDs; `it.fails` Phase 3 lock | 5 T4 tests passed |
| 2026-10-04 | Phase 0 / ROCK60 evidence tags | COMPLETE — all cut formulas `pending_external_fixture` or `illustrative`; zero `evidence_backed` | 3 evidence tests passed |
| 2026-10-04 | Phase 0 / F1–F3 piece records | COMPLETE — slot manifests without invented lengths; geometry closed; F3 qty×3 scaling locked | 4 fixture tests passed |
| 2026-10-04 | Phase 0 exit | COMPLETE — T1/T3/T4 + ROCK60 + F1–F3 closed; 19 focused tests; TypeScript; lint 0; production build | Phase 0 exit gate met |
| 2026-10-04 | Phase 1 / P1.1–P1.2 | COMPLETE — immutable identity/dimension/quantity boundary and normalized non-overlapping physical cells | Typed blocking errors; focused tests, lint, TypeScript and build passed |
| 2026-10-04 | Phase 1 / P1.3–P1.4 | COMPLETE — approved system/profile/rule authority plus explicit glazing/hardware decisions; preview is estimate-only | Focused tests, lint and TypeScript passed |
| 2026-10-04 | Phase 1 / P1.5 exit | COMPLETE — canonical ordering and strict replay for F1–F3 | 40 focused tests passed; TypeScript; affected lint 0; production build passed |
| 2026-10-04 | Phase 2 exit | COMPLETE — normalized catalogue, explicit lossless grids, exact compatibility, blocked invalid entries, unsupported claims removed | 23 focused tests passed; TypeScript; affected lint 0 errors; production build passed |
| 2026-10-04 | Phase 3 / P3.1 | COMPLETE — Drafting→Design uses source-cell metadata and mm boundaries; metadata-free multi-rect conversion blocks | T4 acceptance enabled; 11 focused tests passed |
| 2026-10-04 | Phase 3 exit | COMPLETE — spans, overlap, closure, decimal mm, metadata edits, recovery and undo/redo are guarded | F1–F3 mode round trips and focused Phase 3 suite pass; production build passed |
| 2026-10-04 | Phase 4 / P4.1 | COMPLETE — one contract-bound Apex entry point verifies system, profile stock, cutting and tolerance authority before generation | 15 focused tests passed; TypeScript passed; affected lint 0 errors |
| 2026-10-04 | Phase 4 / P4.2 | COMPLETE — deterministic per-cell sash assemblies, glazing authority linkage and shared divider geometry preserve source IDs/bounds | 22 focused tests passed; TypeScript passed; affected lint 0 errors; unsupported glass cut dimensions remain blocked |
| 2026-10-04 | Phase 4 / P4.3 | COMPLETE — stable frame/sash piece IDs carry explicit mm cut/stock units, contract quantity and approved profile authority | Focused tests, TypeScript and affected lint pass; divider/glass cuts remain explicitly blocked |
| 2026-10-04 | Phase 4 / P4.4 | COMPLETE — required linear-piece manifest, BOM and stock optimization reconcile every quantity-expanded stable ID exactly once | 22 focused tests passed; TypeScript, affected lint and production build pass; oversized pieces fail closed |
| 2026-10-04 | Phase 4 / P4.5 cache isolation | COMPLETE — V6 cache namespace includes the full canonical contract; identical retries hit while owner changes miss | 23 focused tests passed; TypeScript, affected lint and production build pass; caller migration/F2–F3 still open |
| 2026-10-04 | Phase 4 / P4.5 F1–F3 | PARTIAL — F2/F3 preserve cells, continuous dividers, operable sashes and quantity; unsafe 3D/default-pack generation removed; Project Studio blocks without approved contracts | 22 focused tests passed; TypeScript, affected-file error lint and production build pass; approved live resolver and batch caller remain open |
| 2026-10-04 | Phase 4 / P4.5 authority source | READY TO APPLY — immutable authority revisions, owner/revision-scoped RPC, revocation, typed parser and reusable pgTAP test added | 13 focused resolver/Apex tests, TypeScript and affected lint pass; production migration and 6 SQL tests not yet executed |
| 2026-10-04 | Phase 4 / P4.5 batch caller | COMPLETE (code) — `runBatchOptimization` requires approved contract+snapshot jobs; SYSTEM_PACKS / invented 6000 mm stock removed; ProjectOptimizer blocks without jobs | 5 batch + 6 resolver + 7 Apex P4 + constitutional settings tests (23) passed; TypeScript; lint 0 errors; production build passed; commit: none |
| 2026-10-04 | Phase 4 / P4.5 live authority | COMPLETE — user applied `20261004_fabricator_manufacturing_authority.sql` on almona02; table + RPC present; pgtap enabled; 6 live cases pass and roll back clean | ok 1–6: unauthenticated, cross-owner, stale revision, missing authority, exact resolve, revoked authority |
| 2026-10-04 | Phase 4 exit | COMPLETE — Apex contract entry, per-cell pieces, quantity/stock, reconciliation, cache, batch fail-closed, live authority gate | Phase 4 = 100/100; commit: none |
| 2026-10-04 | Phase 5 / P5.1 D1 | COMPLETE — physics authority fail-closed; assumption path cannot claim Eurocode/ISO; ESTIMATE badge + missing-input description | 4 focused tests; TypeScript; lint 0 errors; production build; commit: none |
| 2026-10-04 | Phase 5 / P5.2 conversion | COMPLETE — incompatible system selection queues explicit conversion; layout suggestion requires confirm; dismiss keeps geometry | 9 focused P5.2+D2 tests; TypeScript; lint 0 errors; production build; commit: none |
| 2026-10-04 | Phase 5 / P5.3 persist identity | COMPLETE — `DesignCompletionPayload` on validate; ProjectStudio/Wrapper/Workflow/Wizard persist grid+system+preset; manual edit clears template | 3 focused P5.3 + prior engine tests; TypeScript; lint 0 errors; production build; commit: none |
| 2026-10-04 | Phase 5 / P5.4 preview/BOM | COMPLETE — preview identity key + clear-on-switch + late reject; ESTIMATE badges on 3D/BOM; removed unverified BOM precision claim | 4 focused P5.4 tests; TypeScript; lint 0 errors; production build; commit: none |
| 2026-10-04 | Phase 5 / P5.5 layout/a11y | COMPLETE — canvas-primary workbench; collapsible left/right rails; BOM collapse; Ctrl+[/] + Space/Enter + aria-expanded | 4 focused P5.5 + CollapsiblePanel tests; TypeScript; lint 0 errors; production build; commit: none |
| 2026-10-04 | Phase 5 exit | COMPLETE — physics claims, conversion guards, save identity, late preview, estimate chrome, canvas-primary layout | Phase 5 = 100/100; commit: none |
| 2026-10-04 | Phase 6 / P6.1 automated | COMPLETE — focused FP-028 acceptance + Phase 5 regressions green; TypeScript; lint 0 errors; production build | Live Measure→QC still open; no manufacturing-ready claim |
| 2026-10-04 | Phase 6 / P6.2 scaffold | COMPLETE — live runbook; A→B identitySwitch tests; ROCK60 physical-length golden fixture pending external evidence | Operator gates + authority seed still open; commit: `72180d4` |

### Scorecard (updated after each phase / major slice)

Scoring rules: manufacturing-ready = 100 only when Phases 0–6 exit gates pass. Characterization without fix = half credit for that defect. No screenshot credit.

| Scope | Score | Notes |
| --- | ---: | --- |
| **Phase 0** | **100 / 100** | Exit gate met: all A/D/T regressions, callers, ROCK60 tags, F1–F3 piece records |
| **Phase 1** | **100 / 100** | Exit gate met: typed fail-closed contract; F1–F3 deterministic serialization and replay |
| **Phase 2** | **100 / 100** | Exit gate met: explicit schemas, exact packs, F1–F3 lossless round trip |
| **Phase 3** | **100 / 100** | Exit gate met: canonical mm geometry, spans, closure and metadata continuity |
| **Phase 4** | **100 / 100** | Exit gate met: contract Apex path, batch fail-closed, live authority RPC + 6 SQL cases |
| **Phase 5** | **100 / 100** | Exit gate met: D1/P5.2–P5.5 correctness + canvas-primary usability |
| **Phase 6** | **60 / 100** | P6.1 + P6.2 scaffold complete; operator live gates open |
| **FP-028 overall** | **94 / 100** | Phases 0–5 complete; Phase 6 at 60/100; no manufacturing-ready claim |

#### Phase 0 defect board

| ID | Status | Credit |
| --- | --- | ---: |
| T2 | FIXED (fail closed) | 1.0 |
| D2 | FIXED (preserve geometry) | 1.0 |
| D3 | FIXED (late BOM reject) | 1.0 |
| A1 | CHARACTERIZED (`it.fails` lock) | 0.5 |
| A2 | FIXED (no GENERIC invention) | 1.0 |
| A3 | FIXED (cache identity) | 1.0 |
| A4 | CHARACTERIZED (`it.fails` lock) | 0.5 |
| A5 | FIXED (source-cell direction linkage) | 1.0 |
| A6 | FIXED (stock mm→micron helper) | 1.0 |
| A7 | CHARACTERIZED (`it.fails` lock; not applied) | 0.5 |
| A8 | CHARACTERIZED (`it.fails` lock) | 0.5 |
| T1 | CHARACTERIZED (`it.fails` Phase 2 lock) | 0.5 |
| T3 | CHARACTERIZED + fail-closed resolver (`it.fails` Phase 2) | 0.5 |
| T4 | CHARACTERIZED (`it.fails` Phase 3 lock) | 0.5 |
| Callers inventory | DONE | — |
| ROCK60 evidence tags | DONE (0 evidence_backed) | — |
| F1–F3 expected pieces | DONE (lengths pending_system_evidence) | — |

### Apex callers (Phase 0)

See `docs/plans/FP-028_APEX_CALLERS.md`. V6 production: ProjectStudio, BatchOptimizationService, Window3DGenerator. V2 production: GoldTierOrchestrator.

### Remaining risk after Phase 6 / P6.2 scaffold

- Automated suite + fail-closed live scaffold are green; manufacturing-ready still blocked by operator live gates.
- See `docs/plans/FP-028_P6.2_LIVE_MEASURE_QC_RUNBOOK.md`.
- Pack conversion proposes catalog `defaultGrid` (illustrative) — still not manufacturing authority without approved evidence.
- No approved ROCK 60 authority revision rows seeded — RPC fails closed until an approved payload exists.
- ROCK60 physical-length golden fixture is `PENDING_EXTERNAL_FIXTURE` (all `expectedLengthMm: null`).
- Divider/glass cut formulas and thermal apply remain blocked pending evidence.
- Operator must execute: F1 Measure→QC, hard reload, A→B during preview/BOM, second authorized account, golden job document compare.
