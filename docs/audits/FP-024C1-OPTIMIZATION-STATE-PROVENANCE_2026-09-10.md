# FP-024C.1 — Optimization State Provenance Checkpoint

| Field | Value |
|-------|--------|
| Date | 10–12 September 2026 |
| Branch | `feature/fp024c-physical-parity` |
| Origin HEAD | `056f100` — `FP-024C: classify BASELINE_REPRODUCTION_RUN as REPRODUCED` |
| Prior local HEAD | `332914f` — `audit: record FP-024C.1 state provenance checkpoint` |
| Fresh A ingest | 12 September 2026 — valid newly solved package after failed Saw=5 pre-run |
| Fresh B attempt | 12 September 2026 — **STOPPED** before project/solve: warehouse stock ≠ Fresh A |
| FP-024C.2 | 12 September 2026 — stock-update **PROVEN** at 22:17:20; Run/Export did **not** write stock |
| FP-024C.3 | 12 September 2026 — new controlled triplicate opened against a frozen current-state baseline; Fresh A excluded |
| Gate | ⏸ **PAUSED BY STOCK_STATE_CHANGED** — A/B repeatability paused pending a clean stock method |
| Physical-length score | **Unchanged at 6.0/10** |
| PR #32 | Draft / **DO NOT MERGE** |

---

## Verdict

```
FP-024C ⏸ STATE PROVENANCE INVESTIGATION
FP-024C.1 PAUSED BY STOCK_STATE_CHANGED
FP-024C.2 STOCK MUTATION PROVENANCE AUDIT

Test 2 packed/machine:
✅ PROVEN — fixture-specific only

Test 3 remainder:
⚠️ AMBIGUOUS / UNPROVEN

Test 4 remainder:
⚠️ AMBIGUOUS

BASELINE_RESET_VALIDATION:
❌ topology REPRODUCTION_FAILED
✅ machine-length signature recovered

Failed pre-run (2026-09-12):
PRE_RUN_ENVIRONMENT_EVIDENCE only
Saw 5 — NOT Fresh A — no project — no solve

Fresh A:
MEASURED / NEWLY_SOLVED
topology OTHER vs 1B and vs later/reset
one run cannot claim repeatability

Fresh B:
INVALID_PRE_RUN / STOCK_STATE_CHANGED
not created — not solved — not ingested
A/B repeatability paused pending FP-024C.2

Fresh C:
CLOSED (not started)

90° CONTROL_FIXTURE:
GATED

Physical-length correctness:
6.0/10

Production formulas:
FROZEN

PR #32:
DRAFT / DO NOT MERGE
```

FP-024C.1 answers one question:

> **Why can identical visible geometry/settings produce different optimization remainder topology?**

Fresh A is ingested as one newly solved observation. Catalog classifier: **AMBIGUOUS** (`cannot claim repeatability`). This is **not** `PERSISTED_STATE_EFFECT_PROVEN`, **not** `ALTERNATIVE_OPTIMIZER_SOLUTION`, **not** `OPTIMIZER_NONDETERMINISM_OR_TIE_BREAKING`.

This audit does **not** claim an ALMONA source finding explains DoWin internals.

---

## Files changed (this checkpoint vs `332914f`)

| Path | Role |
|------|------|
| `src/lib/fabricator/dowinParity/canonicalFingerprint.ts` | Omit timestamp/result/project IDs from optimizer-input fingerprints |
| `src/lib/fabricator/dowinParity/optimizerStateProvenance.ts` | Fresh A/B/C intake, 3-run nondeterminism gate, ALMONA forensic table |
| `src/lib/fabricator/dowinParity/dowinCompensationEvidence.ts` | Fresh A/B/C pending templates; fail-closed ingest; 90° stays gated |
| `src/tests/fabricator/dowinCompensationReconciliation.test.ts` | Catalog length 10; 3-run classifier; 90° not opened by recovered reset |
| `src/tests/fabricator/dowinOptimizationStateProvenance.test.ts` | Fingerprint, freshness, grouping, Clear Screen, forensic surface proofs |
| `docs/audits/FP-024C-PHYSICAL-FORMULA-PARITY_2026-09-09.md` | Fresh A/B/C + fail-closed classifier rules |
| `docs/audits/FP-024C1-OPTIMIZATION-STATE-PROVENANCE_2026-09-10.md` | This checkpoint |

Historical FP-024C.1 files already on the branch (`dowinPhysicalLengthFixture.ts`, length/topology split) were not mutated for manufacturing formulas.

---

## ALMONA forensic file:line findings

These rows describe **ALMONA**. They do not explain DoWin.

| Surface | file:line | Classification | Defect? |
|---------|-----------|----------------|---------|
| New AdaptiveSolver per OptimizationPage run | `OptimizationPage.tsx:78-107` | INPUT_IDENTITY_ONLY | no |
| AlgorithmSelector / AdaptiveSolver algorithm choice | `AlgorithmSelector.ts:73`; `adaptiveSolver.ts:45-98` | TOPOLOGY_AFFECTING | no |
| FFD / equal-length sort | `OptimizationEngine.ts:116-117`; `greedyHeuristic.ts:100-129` | TOPOLOGY_AFFECTING | **ALMONA_REPRODUCIBILITY_DEFECT** (tie-break / sort stability) |
| Stock IDs `Date.now` + `Math.random` | `OptimizationEngine.ts:203` | RESULT_METADATA_ONLY | **ALMONA_REPRODUCIBILITY_DEFECT** (excluded from topology fingerprint) |
| Persist `optimizationResult` | `workflowStore.ts:106-219` | PERSISTENCE_ONLY | **ALMONA_REPRODUCIBILITY_DEFECT** (`fabricator-workflow-storage`) |
| `AlmonaCuttingEngine` remnantCache | `AlmonaCuttingEngine.ts:193-239` | TOPOLOGY_AFFECTING | if `setRemnants` used |
| Genetic / Math.random GA | `geneticOptimization.ts`; `RemnantFirstGeneticOptimizer.ts:700-706` | ADVISORY_ONLY | not Tier-3 |
| Project IDs on measurement create | `workflowStore.ts:127` | INPUT_IDENTITY_ONLY | container identity only |

Production optimizer behavior was **not** patched. Defects are evidence-infrastructure classifications only.

These ALMONA surfaces can contaminate **ALMONA** reproducibility evidence (persisted result reuse, equal-length sort order, remnant cache). They are not a DoWin causal claim.

---

## Input fingerprint / equivalence gate

- Canonical JSON: sorted object keys, arrays preserve semantic order, null stays null, undefined is rejected (not coerced to positive evidence).
- Optimizer-**input** fingerprints omit `timestampIso` / `timestamp` / `runId` / `optimizationResultId` / `optimizationHistoryId` / `projectId` / `designId` / `productionPlanId`.
- Result UUID/timestamp changes do not change topology identity.
- Same utilization with different bar assignment = different topology.
- Same total remainder with different distribution = different topology.
- Same pieces with different bar grouping = different topology.
- Missing snapshots/fingerprints ⇒ `UNPROVEN`. Missing provenance never becomes `IDENTICAL`.
- Machine-output reproduction and optimizer-topology reproduction remain separate verdicts.

---

## Topology-signature rules

Each bar: profile, stock-bar id (signature only), ordinal, stock length, piece sequence (physical/source/external IDs, role, packed mm, angles), remainder mm.

Fingerprint **excludes** stock-bar UUID and report timestamp. Comparison is not utilization, total waste, bar count, or summed remainder.

---

## External evidence (already measured; no new DoWin run)

1B original topology: KASA 965 / KANAT 2203 / ORTA 5080 / CITA 206 / 6160.

Later/reset topology: KASA 960 / KANAT 2198 / ORTA 5079 / CITA 3178×2.

Machine lengths recovered at reset: 454 / 1433 / 1003 / 1503 / 1416.

Test 2: Welding Waste packed/machine PROVEN on asdd 45° KASA/KANAT; **not** a general `packed = nominal + WeldingWaste` formula; **not** “all 45° pieces receive WeldingWaste”; **not** `machine = nominal + WeldingWaste`; **no +3 encoded**.

Test 3 remainder: AMBIGUOUS / UNPROVEN after reset.

Test 4 remainder: AMBIGUOUS (not Trim).

Reset: combined `REPRODUCTION_FAILED`; length-layer `REPRODUCED`; topology `REPRODUCTION_FAILED`.

90° CONTROL_FIXTURE: GATED. Recovered 1B reset is not enough. Fresh A returning original topology does not open it. Fresh B/C (or an explicit non-PENDING/AMBIGUOUS classifier conclusion plus measured A/B/C) is required.

Clear Screen on `asdd` is not freshness.

---

## Failed pre-run (PRE_RUN_ENVIRONMENT_EVIDENCE — not Fresh A)

Correctly stopped before project creation / solve. Live General Settings showed **Saw Thickness = 5** (required 4). Do **not** reuse as Fresh A. Do **not** ingest as a solve. Do **not** assign an optimizer topology verdict.

| Artifact | SHA-256 |
|----------|---------|
| Start screenshot | `0cc6657cdf8a556f856e1e110d4b66d41c6d0ad787c595456fb73894dd89c4f9` |
| Settings screenshot (Saw 5) | `ad9cbc0d1dc6a883813babca48278564ebadab281e509cb2b955549ed54fa488` |
| Stock management screenshot | `5b5321c03b2b468c4ef5b750c325d202ed63b18d23f1e9c938ccc630a375bc4e` |

As-found warehouse cards (not modified; ORTA qty 0 left as-found):

| Profile | Length | Qty |
|---------|--------|-----|
| Deceuninck-KASA-70 | 6000 | 14 |
| Deceuninck-KANAT-70 | 6000 | 98 |
| Deceuninck-ORTA-KAYIT-70 | 6500 | **0** |
| Deceuninck-CITA-20 | 6500 | 48 |
| Deceuninck-DESTEK-SACI-2.0MM | 6500 | 15 |
| Deceuninck-KOSE-PLASTIK-01 | 6500 | 50 |
| Metal corner row (name truncated) | 6500 | 100 |

Offcut/remnant state at pre-run: **UNPROVEN**. Existing `asdd`/`asdasd` were not opened.

---

## Fresh A — valid newly solved package (2026-09-12 22:00 UTC+3)

Settings restored **Saw 5 → 4**, Save All Changes, left and re-entered General Settings. Persistence proven:

- Welding Waste **3**
- Saw Thickness **4**
- Trim Cut **0**
- Sash Offset **7**
- Glazing Clearance **2.5**
- Min offcut **500**
- Mullion Offset **0**
- DC-600 checked; **DC-550 SKH also globally enabled**

Fresh A settings screenshot SHA-256: `571dc804d0ec43d56969fa3d41d0eb482fd4bffb0e1b96eabf8034bdd2d7f6e9`

Stock was **not** modified. ORTA qty 0 did **not** block solve (hidden input: optimizer still used a 6500 ORTA bar remaining 5080).

### Identities (exposed only)

| Field | Value |
|-------|--------|
| Project name | `FP024C1_FRESH_A` |
| Project list order | `100002` (list UI) |
| Design Preview Order No | `10002` (ingested `projectId`; list `100002` recorded as a discrepancy, not invented UUID) |
| Customer | `sdf` / Customer Code `1000002` |
| Design | `FRESH_A` — 1000×1500, Deceuninck 70'lik PVC Sistemi, double sash, quantity 1 |
| Production plan | `FRESH_A_PLAN`, designs 1, date 9/12/2026, quantity 1 |
| Optimization history before send | red X (not previously solved) |
| `optimizationResultId` | `OptimizationReport_20260912_215949` |
| `optimizationHistoryId` | `null` (not exposed) |
| `solveDisposition` | `NEWLY_SOLVED` |
| Solve timestamp | `2026-09-12T19:00:00.000Z` (PDF 12.09.2026 22:00 UTC+3) |
| Duration / bars / yield | 0.35 s / 6 bars / 54.8% / total offcut 16819 mm |
| Algorithm / seed / optimizer version | `null` |
| Production approval | **not** performed |

`asdd` / `asdasd` were not opened. Clear Screen was not used as freshness.

### Artifact SHA-256 (licensed files not committed)

| Artifact | SHA-256 |
|----------|---------|
| General Settings (Fresh A source) | `571dc804d0ec43d56969fa3d41d0eb482fd4bffb0e1b96eabf8034bdd2d7f6e9` |
| Design Preview PDF | `989304b59ca87aa66362f636ad197a7e4ca50b13798635564eda9f0bf077ba88` |
| Labels / Assembly PDF | `ce6e5fa5f654ef1f24ef0b0ac429352edd36746f2fde658dcdc2e11a1e34ff41` |
| Optimization Report PDF | `d9239261a96962d04569f1fcc6a4b4ef0ab7ea0b262c934c3f48d93d59228b13` |
| DC-600 `.dw` | `7c468479c2e1d87b268e38090d7c77faba6a0f59886bd28704a8af3e107bf34c` |
| Design created screenshot | `7e494ad4a7c8a33663aed1d1b5525018a3ba72a7ecabebad0522f93f1efc60f0` |
| Plan saved screenshot | `41e56493d73ecb5ea17060a4a2eff99ded412697876914a9aaed7dce28e10d3c` |
| Pre-run Optimization screenshot | `7487387c78cfb47901426e31e4224bfdaef1aef3604ac73c7191f61a5d90e609` |

### Required-parts (packed, pre-run; IDENTICAL to original asdd packed list)

KASA H 1003 ×2 45/45; KASA V 1503 ×2 45/45; ORTA 1416 ×1 90/90; KANAT H 454 ×4 45/45; KANAT V 1433 ×4 45/45; CITA H 334 ×4 45/45; CITA V 1313 ×4 45/45. Total 21 pieces / 20564 mm.

Nominal (Design Preview): KASA H 1000, KASA V 1500, KANAT H 451, KANAT V 1430, ORTA 1416, CITA H 331, CITA V 1310.

Fingerprint: `requiredPartsSnapshotFromPieces` of golden asdd rows (same packed/angles/qty).

SHA-256 (canonical optimizer-input fingerprints):

| Axis | SHA-256 |
|------|---------|
| Geometry | `fa7c2c6bd216d3cf5e290e70b3e76b9d2d3dcabced119c36e2cbdbe533d8a1fd` |
| Required-parts | `9160358a3f42cb6275e17cde14877c4df232e93efbd1911cd91ae01f9279dd86` |
| Settings | `ced7db453ae44a277cd5a874f7c8aaf102b8df6b4130982635a552721e4f63a5` |
| Optimizer stock | `b1901a7f8d94844f19887a811762f414f5f4fea491c2b06d757b1862e1f1da85` |
| Offcut/remnant (`[]` ingest-gate hash) | `646b8805113090ae522d2194aecc70d6937041b1ec51e1737e33853e931145e6` — operator axis still **UNPROVEN** |
| Topology (assignment signature) | `fac3b067816900c0413fd14e1a90b40d86e8e5baf88ee9ab0fd1928bd79c897d` |

### Optimizer stock (Optimization screen before Run — authority)

| Profile | Length | Qty | Ordinal |
|---------|--------|-----|---------|
| Deceuninck-KOSE-METAL-05 | 6500 | 100 | 0 |
| Deceuninck-KOSE-PLASTIK-01 | 6500 | 50 | 1 |
| Deceuninck-DESTEK-SACI-2.0MM | 6500 | 15 | 2 |
| Deceuninck-CITA-20 | 6500 | 48 | 3 |
| Deceuninck-ORTA-KAYIT-70 | 6500 | **0** | 4 |
| Deceuninck-KANAT-70 | 6000 | 98 | 5 |
| Deceuninck-KASA-70 | 6000 | 14 | 6 |

Warehouse cards ≠ used-bar 1B helper (`stockSnapshotFromBars`). Optimizer-offered stock is authority for this experiment.

### Offcut / remnant

Dedicated remnant/offcut list **not visible**. `offcutRemnantSnapshot = []` is ingest-gate form only. Operator axis: **UNPROVEN**. Do not convert “not visible” to “none”.

### Machine

Export Select Machine: **DC-600 selected**. DC-550 SKH also listed/enabled globally. Not treated as automatically identical concepts.

### Length layers

**NOMINAL:** KASA H 1000, KASA V 1500, KANAT H 451, KANAT V 1430, ORTA 1416, CITA H 331, CITA V 1310

**PACKED:** KASA H 1003, KASA V 1503, KANAT H 454, KANAT V 1433, ORTA 1416, CITA H 334, CITA V 1313

**MACHINE (DC-600 Table1 LENGTH):** KANAT V 1433 ×4, KANAT H 454 ×4, KASA H 1003 ×2, KASA V 1503 ×2, ORTA 1416 ×1, CITA **null** (not in Table1; 13 rows)

### Bar-by-bar topology

| Ordinal | Profile | Stock | Packed sequence | Remaining | Yield |
|---------|---------|-------|-----------------|-----------|-------|
| 0 | Deceuninck-CITA-20 | 6500 | 334, 1313, 334, 1313, 1313, 334, 1313 | 206.4 | 96.8% |
| 1 | Deceuninck-CITA-20 | 6500 | 334 | 6160.3 | 5.2% |
| 2 | Deceuninck-KANAT-70 | 6000 | 1433 ×4 | 245.4 | 95.9% |
| 3 | Deceuninck-KANAT-70 | 6000 | 454 ×4 | 4161.4 | 30.6% |
| 4 | Deceuninck-KASA-70 | 6000 | 1003, 1003, 1503, 1503 | 965.4 | 83.9% |
| 5 | Deceuninck-ORTA-KAYIT-70 | 6500 | 1416 | 5080.0 | 21.8% |

`identifyAsddAssignmentTopology` = **OTHER**.

Fresh A vs 1B (KASA 965 / KANAT 2203 / ORTA 5080 / CITA 206 / 6160): **DIFFERENT** (KANAT 245.4 / 4161.4, not 2203).

Fresh A vs later/reset (KASA 960 / KANAT 2198 / ORTA 5079 / CITA 3178×2): **DIFFERENT**.

Do **not** call this 1B reproduced. Do **not** call this Test 3 topology.

### Input-equivalence vs original 1B helper (`compareOptimizerInputFingerprints`)

| Axis | Verdict | Note |
|------|---------|------|
| Geometry | IDENTICAL | 1000×1500 Deceuninck 70 |
| Required-parts | IDENTICAL | packed/angles/qty match asdd golden rows |
| Settings | IDENTICAL | Weld 3 / Saw 4 / Trim 0 / sash 7 / glazing 2.5 / remnant 500 / DC-600 |
| Machine (this export) | IDENTICAL field | DC-600 selected; DC-550 SKH also globally enabled (recorded separately) |
| Stock | DIFFERENT | optimizer cards (accessories + ORTA qty 0) vs 1B used-bar identity counts |
| Offcut/remnant | UNPROVEN | no remnant UI; empty ingest list is not proven-none |
| Overall (comparator, empty offcut hashed) | DIFFERENT | stock fingerprint mismatch |
| Overall (fail-closed operator rule: missing remnant UI) | UNPROVEN | missing offcut evidence cannot yield IDENTICAL |

### Hidden input findings

- ORTA warehouse/optimizer qty **0** yet a 6500 ORTA bar was used (remaining 5080). Not `FRESH_A_BLOCKED_BY_CURRENT_STOCK_STATE`. Not optimizer nondeterminism.
- DC-550 SKH globally enabled in addition to DC-600 selected for this export.
- Project list order `100002` vs Design Preview Order No `10002`.
- Accessory profiles offered to the optimizer (KOSE-METAL, KOSE-PLASTIK, DESTEK-SACI).
- Dedicated offcut/remnant UI absent.
- Failed pre-run Saw=5 is **not** this solve’s settings.

### Phase classification

Allowed after Fresh A only: `PENDING_MORE_FRESH_RUNS` / `HIDDEN_INPUT_DIFFERENCE` / `AMBIGUOUS` / `INVALID_FRESH_RUN`.

Recorded: catalog **AMBIGUOUS** (one newly solved run cannot claim repeatability). Stock vs 1B helper is a concrete fingerprint difference, recorded as a hidden-input **finding**, not as a global provenance verdict. Fresh B/C required before global provenance claims.

---

## Fresh A/B/C operator package required

Catalog: `FP024C1_FRESH_A` **MEASURED**; `FP024C1_FRESH_B` remains `PENDING_OPERATOR_RUN` after **INVALID_PRE_RUN / STOCK_STATE_CHANGED** (not ingested); `FP024C1_FRESH_C` remains `PENDING_OPERATOR_RUN` and **CLOSED**.

Each run must supply:

- `runId`, timestamp, projectId, designId, productionPlanId
- optimizationResultId and/or optimizationHistoryId if exposed
- `solveDisposition = NEWLY_SOLVED`
- optimizer/version, algorithm, seed if knowable (otherwise `null` / NOT_MEASURED)
- machine = DC-600
- settings: Welding Waste 3 mm, Saw Thickness 4 mm, Trim Cut 0 mm
- geometry / required-parts / stock / offcut-remnant snapshots (empty offcut list allowed; `null` is not)
- SHA-256 of General Settings screenshot, Design Preview, Labels/Assembly, Optimization report; machine export if generated, else `null` / NOT_MEASURED
- bar-by-bar transcription: profile, stock identity if exposed, ordinal, stock length, piece sequence, Cut identity where available, packed mm, angles, remainder

Unavailable external values stay `null` / NOT_MEASURED / UNPROVEN. Do not invent values.

Intake rejects or downgrades to AMBIGUOUS when project/design/plan/result is reused, provenance is missing, fingerprints are incomplete, settings/geometry/machine/stock/parts/offcut differ, hashes are missing, only utilization/waste is provided, or the operator claims equivalence without evidence.

Classifier:

- `PENDING_OPERATOR_RUN` until measured Fresh A/B/C exist
- `PERSISTED_STATE_EFFECT_PROVEN` only with proven-identical inputs + reused later topology B + genuinely fresh original topology A
- `ALTERNATIVE_OPTIMIZER_SOLUTION` only after ≥3 newly solved IDENTICAL fresh runs all later topology
- `OPTIMIZER_NONDETERMINISM_OR_TIE_BREAKING` only after ≥3 newly solved IDENTICAL fresh runs with more than one topology
- `HIDDEN_INPUT_DIFFERENCE` only with a concrete fingerprint/snapshot difference
- `AMBIGUOUS` for incomplete provenance, reused without counterpart, missing fingerprints, or fewer than three fresh runs

One fresh run must never be described as consistent.

---

## Tests and freeze

| Check | Result |
|-------|--------|
| `npm run type-check` | Pass (`tsc --noEmit`) |
| `npx vitest run src/tests/fabricator/dowinCompensationReconciliation.test.ts` | Pass |
| `npx vitest run src/tests/fabricator/dowinPhysicalLengthGolden.pending.test.ts` | Pass |
| `npx vitest run src/tests/constitutional/ManufacturingSettingsContract.test.ts` | Pass |
| `npx vitest run src/tests/fabricator/dowinOptimizationStateProvenance.test.ts` | Pass |
| Combined above | 4 files, **65 tests passed** |
| `npm run build` | Pass (`vite build --mode production`) |
| Formula freeze this ingest | No diff in `barPackAccounting.ts`, `UPVCCuttingEngine.ts`, `ManufacturingSettings.ts`, `src/lib/fabricator/production` |
| Licensed artifacts | Excluded (SHA-256 only; PDFs/MDB/DW/screenshots not committed) |

No evidence code mutates `ManufacturingSettings`, `barPackAccounting`, or production Cut lengths. No runtime `+3` / `+7` constants were introduced.

---

---

## Fresh B — STOPPED (2026-09-12). Not created. Not solved. Not ingested.

Authorized to run after Fresh A. **Stopped at Step 2** before project creation / design / plan / solve.

### Settings (Step 1) — contemporaneous, MATCH Fresh A required values

Re-entered Management Panel → General Settings. English UI. No field was edited. Save was not clicked.

| Field | Live |
|-------|------|
| Welding Waste | 3 |
| Saw Thickness | 4 |
| Trim Cut | 0 |
| Sash Offset | 7 |
| Glazing Clearance | 2.5 |
| Minimum offcut | 500 |
| Mullion Offset | 0 |
| DC-600 | checked |
| DC-550 SKH | also globally enabled |

Fresh B settings screenshot SHA-256 (new; **not** reused Fresh A hash):  
`10eb9dcdb8dc2f4c339c6d91235e62b0e88ff09b3e1509358b5393d42db22a83`

Start/New Project screenshot SHA-256:  
`acec4e5eed9d51059107bf59d4584b6dcb55fddddf24c504a47a6c0074bf591f`  
Saved list visible: `100002 / FP024C1_FRESH_A` and `100001 / asdasd`. Neither was opened. New Project form blank.

### Stock (Step 2) — DOES NOT MATCH Fresh A. STOP.

Stock Management captured as-found. No Add / Save / Delete / remnant import. Management Panel closed without save.

Stock screenshot SHA-256:  
`480646001d0ab21ba4812bb09614db5764c097207f8ec76b16e13a4ec6f46a56`

| Profile | Length | Fresh A required | Live now | Delta |
|---------|--------|------------------|----------|-------|
| Deceuninck-KOSE-METAL-05 | 6500 | 100 | 100 | 0 |
| Deceuninck-KOSE-PLASTIK-01 | 6500 | 50 | 50 | 0 |
| Deceuninck-DESTEK-SACI-2.0MM | 6500 | 15 | 15 | 0 |
| Deceuninck-CITA-20 | 6500 | **48** | **46** | **-2** |
| Deceuninck-ORTA-KAYIT-70 | 6500 | 0 | 0 | 0 |
| Deceuninck-KANAT-70 | 6000 | **98** | **96** | **-2** |
| Deceuninck-KASA-70 | 6000 | **14** | **13** | **-1** |

The live deltas equal Fresh A **used-bar counts** (CITA 2, KANAT 2, KASA 1). ORTA remains qty 0 (Fresh A used one 6500 ORTA bar against qty 0; still 0). This is consistent with post-solve warehouse consumption of Fresh A, not with “stock unrepaired.” ORTA qty 0 was **not** added. Quantities were **not** restored to Fresh A.

Classification: **HIDDEN_INPUT_DIFFERENCE / STOCK_STATE_CHANGED**.  
Fresh B: **INVALID_PRE_RUN**. Do not solve. Do not compare topology. Do not call this optimizer nondeterminism.

### What was not done

- Project `FP024C1_FRESH_B` was **not** created.
- Design `FRESH_B` / plan `FRESH_B_PLAN` were **not** created.
- No optimization. No export. No production approval. No remnant import.
- `asdd` / `asdasd` / Fresh A were not opened.
- Catalog template `FP024C1_FRESH_B` remains `PENDING_OPERATOR_RUN` (not a fake MEASURED ingest).
- Production formulas unchanged.

### Fresh B vs Fresh A (inputs)

| Axis | Verdict |
|------|---------|
| Settings (visible General Settings) | IDENTICAL (Weld 3 / Saw 4 / Trim 0 / sash 7 / glazing 2.5 / min offcut 500 / DC-600) |
| Warehouse stock | **DIFFERENT** |
| Optimizer stock | **UNPROVEN** (Optimization screen not opened; warehouse already differed) |
| Offcut/remnant | **UNPROVEN** |
| Geometry / required-parts / topology | **UNPROVEN** (no Fresh B design/solve) |
| Overall | **DIFFERENT** / fail-closed **UNPROVEN** for unmeasured axes |

---

## Why Fresh A cannot join the controlled triplicate (FP-024C.3)

Fresh A was solved against warehouse quantities CITA 48 / KANAT 98 / KASA 14 / ORTA 0. A **proven** warehouse write at 22:17:20 (FP-024C.2) then moved those quantities to CITA 46 / KANAT 96 / KASA 13 / ORTA 0.

Consequences:

- Fresh A's `warehouseStock` axis can never again be `IDENTICAL` to any later run. Using it as one member of an A/B/C triplicate would compare solves taken under **different** stock state and would produce a false `HIDDEN_INPUT_DIFFERENCE` or a false repeatability claim.
- Future runs must **not** be treated as stock-equivalent to Fresh A.
- Restoring 48 / 98 / 14 is **not** the remedy. Historical stock is evidence, not a target, and a manual restore would itself be an unlogged warehouse write.

**FP-024C.3** therefore freezes the **current** post-Fresh-A warehouse state as a new controlled baseline (CITA 46 / KANAT 96 / KASA 13 / ORTA 0, plus KOSE-METAL 100 / KOSE-PLASTIK 50 / DESTEK-SACI 15) and establishes three brand-new runs — `FP024C3_RUN_A`, `FP024C3_RUN_B`, `FP024C3_RUN_C` — all solved against that frozen state with no warehouse write between them. See `docs/audits/FP-024C3-CONTROLLED-REPEATABILITY_2026-09-12.md`.

Fresh A remains valid as a **standalone measured observation** and as a historical topology comparison. It is not a triplicate member.

The old `FP024C1_FRESH_B` keeps its classification **INVALID_PRE_RUN / STOCK_STATE_CHANGED** and is not renamed or reused as a controlled run. `FP024C1_FRESH_C` stays closed.

---

## Remaining operator evidence

1. Fresh A remains the only ingested fresh solve. Fresh B was **blocked by stock-state contamination**. A/B repeatability under the original protocol is **closed**, superseded by the FP-024C.3 controlled triplicate.
2. FP-024C.2: warehouse write is **PROVEN** at 22:17:20 (CITA 46 / KANAT 96 / KASA 13 / ORTA clamped 0). Run Optimization and machine/PDF export did **not** write stock on this timeline. The 22:17:20 user-visible trigger is **AMBIGUOUS**. See `docs/audits/FP-024C2-STOCK-MUTATION-PROVENANCE_2026-09-12.md`.
3. Do **not** restore CITA/KANAT/KASA/ORTA quantities. Current warehouse is the frozen FP-024C.3 baseline.
4. Fresh B and Fresh C stay **BLOCKED**. The controlled triplicate is **PENDING_OPERATOR_RUN**. 90° stays **GATED** until the FP-024C.3 repeatability verdict exists.
5. Do not merge PR #32. Physical-length score stays 6.0/10. Production formulas stay FROZEN.
