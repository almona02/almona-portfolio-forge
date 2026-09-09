# FP-023A — Canonical Manufacturing Settings Contract

| Field | Value |
|-------|--------|
| Date | 9 September 2026 |
| Repository | `almona-portfolio-forge` |
| Branch | `main` |
| AICS-001 | Tier-3 manufacturing constants must resolve deterministically |
| Related | Dealer audit `docs/audits/DOWIN_VS_ALMONA_DEALER_AUDIT_2026-09-09.md`; institutional FP-012 update (Gate-1 proven, rotation unverified) |
| Scope | Manufacturing settings contract only. **Not** FP-023B, FP-024, FP-016, or FP-017. |
| Gate | ⚠️ **CONDITIONAL** — worth committing as a checkpoint; not a production-manufacturing score increase |

DoWin numbers in this document are licensed-dealer **reference settings**, not universal physical constants and not copied implementation.

---

## Mapping from the FP-012 update

The FP-012 update is accepted as the institutional frame for this work:

| FP-012 statement | FP-023A consequence |
|------------------|---------------------|
| Manufacturing correctness scored **60** after DoWin evidence (down from 66) | This task unifies **settings resolution**, not piece-length golden parity. The 60 score must not be raised here. |
| DoWin 4 / 3 / 7 / 500 mm must not be mixed into FP-016/017 | Settings live in `ManufacturingSettings.ts`. Genetic authority and QC identity were not changed as part of this gate. |
| Intended order was FP-023A → FP-024 → FP-016 → FP-017 | This report closes only FP-023A. Next is **FP-023B** (kerf accounting), then FP-024. |
| Gate-1 credential rotation remains UNVERIFIED | Unchanged. Not in scope. |
| P0.11 ticketing DB boundary PROVEN | Unchanged. Not in scope. |

DoWin is a **validated parity profile**, not ALMONA’s universal remnant/kerf truth. Platform remnant stays **300 mm**; `yilmazcad-parity` is **500 mm**.

---

## Checkpoint scores (9 September 2026)

The important outcome of FP-023A is architectural: one resolved settings contract instead of independent kerf assumptions. Manufacturing correctness is **not** raised on that basis alone.

| Area | Score now |
|------|----------:|
| Manufacturing settings governance | **8.0/10** |
| Physical length correctness | **6.0/10** |
| Optimization correctness | **7.0/10** |
| CAD/CAM manufacturing confidence | **5.5–6.0/10** |
| Industrial core overall | **~7.2–7.4/10** |
| Full platform overall | **~5.3/10** |

The first score increase toward 8+/10 manufacturing should come when **FP-023B + FP-024** prove the same job produces correct physical lengths **and** consistent bar consumption, not merely the same configured kerf millimetres.

---

## 1. Before-state constants

Evidence is from `HEAD` at the start of this gate (file:line). Two similarly named values were **not** treated as the same quantity.

| Setting | File:line | Current value (HEAD) | Execution role | Canonical? | Risk |
| ------- | --------- | -------------------: | -------------- | ---------- | ---- |
| Bar-pack kerf | `src/lib/fabricator/UPVCCuttingEngine.ts:261,289,315,395` | **3 mm** | Single-head UPVC pack + `calculateUPVCCutLength` cutting.kerfWidthMm | No — independent default | Same job packed at 3 mm while LinearOptimizer used 5 mm |
| Bar-pack kerf | `src/lib/algorithms/LinearOptimizer.ts:48` | **5 mm** | Best-fit-decreasing pack (`optimizeLinearCuts`) | No — independent default | Apex/Batch inherited 5 mm even when a system pack stored 1.5 mm |
| Bar-pack kerf | `src/lib/fabricator/production/BatchOptimizationService.ts:18` | **5 mm** (`KERF_MM`) | Cross-position Apex aggregation | No | Drift vs UPVC 3 mm and visual 10 mm |
| Bar-pack kerf | `src/lib/fabricator/AlmonaCuttingEngine.ts:121,166` | **10 mm** (`DEFAULT_SAW_KERF`) | Report pack + header “Saw Cut Deduction” | No | Workshop report disagreed with LinearOptimizer |
| Visual kerf | `src/components/fabricator/VisualCuttingPlan.tsx:7,23` | **10 mm** | Bar used/waste drawing | No | Optimizer 5 mm vs visual 10 mm |
| Visual/export kerf | `src/components/fabricator/AlmonaCutListViewer.tsx:43` | **10 mm** | Viewer default | No | Same visualization drift |
| Export kerf | `src/lib/fabricator/CutListExport.ts:507` | **10 mm** | Print/HTML header fallback | No | Report header vs pack |
| Cut-sheet kerf | `src/lib/fabricator/production/CutSheetGenerator.ts:137` | **4 mm** hardcoded `+ 4` | Class `generate()` positions only | No — magic number | Functional `generateCutSheets` added **no** kerf between pieces |
| UI print kerf | `src/components/fabricator/project/ProjectOptimizer.tsx:323` | **5 mm** | Print path override | No | Explicit 5 mm even after platform default moved |
| Local greedy kerf | `src/lib/api/pythonHeavyClient.ts:301,113` | **3 mm** | Local fallback + Python API default | No | Third packing default |
| Apex adapter kerf | `src/lib/fabricator/goldTier/ApexEngineV6.ts:119` | **1500 µm (1.5 mm)** | FenestrationSystem fallback; **unused by packing before this gate** | No | Silent independent kerf if wired naively |
| Welding / burn-off | `UPVCCuttingEngine` callers / tests | **3 mm** typical | Piece-length K-factor / weld, **not** saw kerf | Separate | Must not be replaced by saw kerf |
| Usable remnant | `src/lib/fabricator/AlmonaCuttingEngine.ts:124` | **300 mm** | Keep/drop on packed bars | Egypt keep/drop | Not DoWin 500 |
| Inventory remnant floor | `src/algorithms/remnantManagement.ts:42,318` | **200 mm** | In-memory remnant inventory | No | Third remnant threshold |
| Inventory remnant floor | `src/optimization/yilmaz-specific/RemnantTracker.ts:47` | **200 mm** | DC-series remnant tracker | No | Same |
| Warehouse remnant floor | `src/lib/inventory/RemnantManager.ts:100` | **200 mm** | Supabase remnant RPC | **Non-canonical / legacy** until FP-023B | Third remnant threshold; wire to `ManufacturingSettings` or keep explicitly out of the canonical path |
| Report end deduction | `AlmonaCuttingEngine` / `CutListExport.ts:507` | **20 mm** | Report header only | Not packing | **Not** DoWin `TrimCut` (0) |
| BOM piece kerf | `src/lib/fabricator/dualOutputConstants.ts:81` | **2 mm** | `ProductionUtils.applyKerfCompensation` on BOM lengths | Different concept | Piece-length compensation, not bar-pack saw kerf |
| Aluminum micron kerf | `src/lib/fabricator/MicronEngine.ts` / constants | **4.2 mm** + **15 mm**/end trim | Micron aluminum path | Machine-specific | Mapped as catalog `aluminum-micron`, not platform default |
| Python remnant min | `src/lib/api/pythonHeavyClient.ts:114` | **100 mm** | Heavy optimizer request default | Unchanged | Still not the cut-sheet threshold |

### Semantic stop conditions (traced, not guessed)

| Pair | Decision |
|------|----------|
| `trimCutMm` vs `endDeductionMm` | **Do not alias.** `endDeductionMm` (20) is report-header only. DoWin `TrimCut` is 0. Micron `barEndTrim` is 15 mm/end. Apex `barEndTrim` 5000 µm is 5 mm. |
| BOM 2 mm vs bar-pack kerf | Different operation. BOM compensation was **not** rewritten to 4 mm. |
| Inventory 200 vs cut-sheet 300 vs DoWin 500 | Ownership is **job manufacturing settings**. Warehouse `RemnantManager` default remains 200 unless constructed `fromManufacturingSettings`. |
| `calculateKFactor` vs Basma/Kaynak | Different length models. K-factor **not deleted**. Formula migration is FP-024. |

---

## 2. Canonical settings model

Module: `src/lib/fabricator/ManufacturingSettings.ts`

### Types

`ManufacturingSettings` fields:

- `sawKerfMm`
- `weldingWasteMm`
- `glazingClearanceMm`
- `sashOffsetMm`
- `pvcMullionOffsetMm`
- `trimCutMm` (bar-end trim reserved during packing)
- `endDeductionMm` (report header only)
- `minimumReusableLengthMm`
- `profileWasteMarginPercent`
- `robotSafetyLengthMm`
- `compLessThan90LeftMm` / `compLessThan90RightMm`
- `compGreaterThan90LeftMm` / `compGreaterThan90RightMm`

Resolved object also carries `namedProfileId`, optional `machineId`, and per-field `provenance`.

### Resolution hierarchy (deterministic)

1. explicit job/project (`job`)
2. selected machine (`machineId` catalog + `machineOverride`)
3. SystemPack / profile override (`systemPack`, including microns → mm)
4. named profile (`platform` or `yilmazcad-parity`)
5. platform default

No `Date.now()` / `Math.random()` in resolution.

### Platform default

Unifies the undocumented 3/5/10 mm **bar-pack kerf split** without forcing DoWin remnant 500 on every Egypt job:

| Field | Platform |
|------:|----------|
| sawKerfMm | 4 |
| weldingWasteMm | 3 |
| glazingClearanceMm | 2.5 |
| sashOffsetMm | 7 |
| pvcMullionOffsetMm | 0 |
| trimCutMm | 0 |
| endDeductionMm | 20 |
| minimumReusableLengthMm | **300** |
| remaining comps / waste / robot | 0 |

### YilmazCAD parity profile (`namedProfileId: 'yilmazcad-parity'`)

Same as platform except `minimumReusableLengthMm = 500`. Overridable. Not a claim that every Yilmaz machine or Egyptian system uses these values.

### Machine catalog overrides

| machineId | Override |
|-----------|----------|
| `yilmaz-dc-550-skh` | kerf 4 |
| `yilmaz-dc-600` | kerf 4 |
| `upvc-single-head` | kerf 3 |
| `aluminum-micron` | kerf 4.2, trimCut 15, robotSafety 50 |

---

## 3. Changed consumers

| Consumer | Change |
|----------|--------|
| `LinearOptimizer.ts` | Default kerf = `PLATFORM_MANUFACTURING_DEFAULTS.sawKerfMm` (was 5) |
| `BatchOptimizationService.ts` | `resolveManufacturingSettings(settingsInput).sawKerfMm` (was `KERF_MM = 5`) |
| `AlmonaCuttingEngine.ts` | Constructor/configure/report resolve settings; remnant keep/drop via `isReusableRemnantLength`; last-bar remnants cached; IDs `REM-{barNumber}` (no `Date.now`) |
| `UPVCCuttingEngine.ts` | Pack + `calculateUPVCCutLength` kerf from resolved settings; batch default platform 4 |
| `ApexEngineV6.ts` | Packing kerf from resolved settings; adapter fallback `sawKerf: 0` so unused 1.5 mm is **not** invented as packing kerf |
| `VisualCuttingPlan.tsx` / `CutListViewer.tsx` | Default `sawKerfMm` = platform 4; used-length via `visualBarUsedMm` |
| `AlmonaCutListViewer.tsx` | Default and pass-through from platform / project |
| `CutListExport.ts` | Header fallback platform 4 / endDeduction 20 |
| `CutSheetGenerator.ts` | Both APIs add resolved kerf between pieces (class path no longer `+ 4`) |
| `ProjectOptimizer.tsx` | Print path uses platform defaults (was kerf 5 / remnant 500 / end 10) |
| `pythonHeavyClient.ts` | Local greedy + API default kerf = platform 4 |
| `algorithms/remnantManagement.ts` | Constructor min length defaults to platform 300; `generateRemnantsFromWaste` same |
| `optimization/yilmaz-specific/RemnantTracker.ts` | Constructor min length defaults to platform 300 |
| `inventory/RemnantManager.ts` | Default warehouse floor **still 200**; `fromManufacturingSettings()` for job-scoped 300/500 |

Demo `BatchCutListDemo.tsx` still passes explicit `sawKerfMm: 10` as a **job override**. That is allowed.

---

## 4. Remaining formula risks

These are documented, not silently “fixed”:

1. **`calculateKFactor`** still owns ALMONA sash/frame miter length (`UPVCCuttingEngine.ts:57–70`). SystemPacks do not currently store Basma/Kaynak. Removing K-factor would change existing validated jobs. **Keep until FP-024.**
2. **Basma/Kaynak** exist only as future fixture *settings context* (`dowinPhysicalLengthFixture.ts`). No length formula uses them yet.
3. **`sashOffsetMm` / `pvcMullionOffsetMm` / angle comps** are on the contract and unused by the current length engines.
4. **Kerf accounting models differ:** LinearOptimizer applies kerf between cuts (**N−1**). AlmonaCuttingEngine and VisualCuttingPlan add kerf after every piece (**N**). The **millimetre kerf value** is now the same; the N vs N−1 packing model was **not** unified (would change LinearOptimizer / FP-010 packing).
5. **`trimCutMm` is not yet subtracted** in LinearOptimizer first-cut waste (comment already said first-cut trim is simplified).
6. **Warehouse remnant 200 mm** on `src/lib/inventory/RemnantManager` is **non-canonical / legacy**. Callers may pass `fromManufacturingSettings()`. FP-023B must either wire the default to resolved settings or keep this path explicitly outside canonical manufacturing remnant eligibility.
7. **Python heavy path** `min_usable_remnant_mm` default is still **100**.
8. **BOM `DEFAULT_KERF_MM = 2`** remains piece-length compensation.
9. **MicronEngine** still has its own 4.2 / 15 constants; catalog `aluminum-micron` is the contract mapping for canonical resolve, not a rewrite of MicronEngine internals.

Optimization quality **cannot** compensate for wrong physical piece lengths. A 4 mm vs 10 mm kerf on four 1400 mm pieces changes LinearOptimizer `totalWaste` (proven in tests). That is a correctness demonstration, not a benchmark.

---

## 5. Tests

Commands run 9 September 2026. Failures classified: **none introduced**. No tests were weakened.

| Command | Result |
|---------|--------|
| `npm run type-check` | **pass** (`tsc --noEmit`, exit 0) |
| `npm run build` | **pass** (Vite production, exit 0; existing chunk-size / PWA glob warnings) |
| `npx vitest run src/tests/fabricator` | **4 files, 55 passed / 0 failed** |
| `npx vitest run src/tests/constitutional` | **8 files, 81 passed / 0 failed** |
| Focused FP-023A (settings + constitutional contract + golden pending) | **3 files, 20 passed / 0 failed** |
| Engine suite (`ManufacturingSettings` + `AlmonaCuttingEngine` + `UPVCCuttingEngine` + `ApexEngineV6`) | **4 files, 34 passed / 0 failed** |

`src/tests/fabricator/gate2ManufacturingTruth.test.ts` (physical-cut `cutId` preservation on cut sheets, AdaptiveSolver identity) stayed green. That is a **regression guard**, not an FP-016/017 implementation in this task.

`npm run lint` was **not** rerun (same FP-012 caveat: warning count unverified).

---

## 6. Golden fixture readiness

**`READY_FOR_EXTERNAL_DOWIN_FIXTURE`**

| Item | State |
|-------|--------|
| Schema / types | `src/lib/fabricator/golden/dowinPhysicalLengthFixture.ts` |
| Harness test | `src/tests/fabricator/dowinPhysicalLengthGolden.pending.test.ts` |
| External expected lengths | `PENDING_EXTERNAL_FIXTURE`; `rows: []` |
| Invented DoWin cut list | **None** |
| ±0.1 mm parity claim | **Not made** |

Preferred future fixture (settings context only): Deceuninck 70 Z sash — horizontal Basma 12, vertical Basma 16, Kaynak 6/6, sash offset 7, welding waste 3, saw kerf 4.

---

## 7. Gate verdict

**⚠️ CONDITIONAL**

Accepted as the canonical **settings contract** for bar-pack kerf, remnant keep/drop on the cut-sheet path, and visualization/export defaults.

Not `PROVEN` as a complete manufacturing-accuracy closure because:

- LinearOptimizer still uses N−1 kerf accounting vs visualization N;
- warehouse remnant default remains 200 mm;
- piece-length formulas (K-factor, Basma/Kaynak, sash offset) are prepared on the type, not migrated;
- no real DoWin exported cut list exists.

Not `NOT ACCEPTED`: conflicting 3/5/10 mm **canonical-path defaults** are gone; machine override works; type-check and build are green; fabricator + constitutional suites passed.

---

## Acceptance checklist

| # | Criterion | Status |
|---|----------|--------|
| 1 | Canonical manufacturing paths no longer independently hard-code conflicting kerf defaults | Met (3/5/10 defaults removed from listed engines) |
| 2 | Single resolved `ManufacturingSettings` contract | Met |
| 3 | Kerf is machine-overridable | Met (3.2 override test; catalog 3.2/4.2) |
| 4 | Remnant threshold consistently resolved on cut-sheet / in-memory remnant when constructed from settings | Met for those paths; warehouse 200 remains |
| 5 | Visualization uses the same resolved kerf millimetres as execution | Met |
| 6 | Physical-cut identity tests remain green | Met (`gate2ManufacturingTruth`) |
| 7 | Type-check passes | Met |
| 8 | Build passes | Met |
| 9 | Fabricator + constitutional tests pass | Met |
| 10 | No claimed DoWin ±0.1 mm parity | Met |

---

## Next gates

Do **not** start ±0.1 mm DoWin parity while one canonical subsystem counts **N−1** kerfs and another counts **N**.

1. **FP-023B — Kerf accounting consistency.** For a bar with N physical cuts, how many kerf losses does the selected Yilmaz cutting process physically consume, and do optimizer, visual plan, CutSheet, remnant calculation and export all use that same rule? Do not blindly flip LinearOptimizer to N or VisualCuttingPlan to N−1. Also close the warehouse-200 remnant default (wire or classify). Leave BOM 2 mm and MicronEngine 4.2/15 mm untouched until their semantics are proven equivalent.
2. **FP-024** — physical-length golden parity against a real exported DoWin cut list.
3. **FP-016** — Tier-3 deterministic optimization authority (genetic advisory-only).
4. **FP-017** — QC by physical `cutId`, not `componentId`.
