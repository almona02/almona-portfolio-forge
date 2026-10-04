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

**Status:** IN PROGRESS

Deliverables:

- Add regressions for A1–A8, D2–D3, and T1–T4 before changing behavior.
- Identify every production caller for Apex V2 and V6.
- Mark existing ROCK 60 rules as evidence-backed or illustrative.
- Record expected pieces for F1–F3 without changing formulas.

Exit gate:

- Tests demonstrate defects independently.
- Assertions verify exact identities, counts, lengths, units, and provenance.

## Phase 1 — Authoritative manufacturing contract

**Status:** NOT STARTED

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

**Status:** NOT STARTED

Replace free-text patterns and recommendations with stable template ID, schema version, explicit cells/spans/ratios/directions, compatible pack IDs, dimensional constraints, and evidence status.

Remove unsupported testimonials, certifications, project counts, fire ratings, and authority language. Invalid templates are hidden or blocked, never converted to 1 × 1.

Exit gate:

- Every selectable template validates.
- Apply → save → reload → Drafting → Design is lossless for F1–F3.
- Incompatible system/template combinations cannot be approved.

## Phase 3 — Canonical physical geometry

**Status:** NOT STARTED

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

**Status:** NOT STARTED

Choose one production Apex entry point and keep legacy adapters only at the boundary.

Implement per-cell sash/glass generation, mullion/transom placement, source-cell linkage, quantity propagation, explicit units, contract-hash cache keys, profile stock lengths, and deterministic ordering.

Do not apply thermal, seismic, welding, or compensation adjustments until units and formula evidence are approved.

Exit gate:

- Required-piece manifest equals Apex and BOM output by stable piece ID.
- Optimization conserves every piece exactly once.
- Cache cannot cross system, identity, revision, glazing, quantity, or rules.

## Phase 5 — Design Studio correctness and usability

**Status:** NOT STARTED

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

**Status:** NOT STARTED

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
| 2026-10-04 | Phase 0 / T2 regression | COMPLETE — invalid and ambiguous template patterns fail closed without replacing the current grid | 34 focused tests passed; TypeScript passed; affected lint 0 errors; production build passed |
