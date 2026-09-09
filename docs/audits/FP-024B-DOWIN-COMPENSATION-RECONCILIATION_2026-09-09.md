# FP-024B — DoWin External Compensation Reconciliation

| Field | Value |
|-------|--------|
| Date | 9 September 2026 |
| Repository | `almona-portfolio-forge` |
| Branch | `feature/fp024-dowin-external-golden` |
| Depends on | FP-023A, FP-023B, FP-024A |
| Scope | Identify which **externally observable** settings explain nominal vs packed vs machine vs remainder. Not FP-016/017. No production formula retune. |
| Gate | ⚠️ **CONDITIONAL** |
| Physical-length score | **Unchanged at 6.0/10** |

---

## Verdict

⚠️ **CONDITIONAL**

The asdd fixture remains a valid baseline for **piece-layer observations**. This-run General Settings were **not** transcribed, so Welding Waste, Saw Thickness, and Trim Cut cannot be classified PROVEN. Isolation templates exist and are `PENDING_OPERATOR_RUN`. External KASA/KANAT bar leftover is **surfaced**, not absorbed. No `packed = nominal + 3` and no hidden `+7 mm` entered production. FP-024A still **FAIL**s represented categories. Nothing here raises the physical-length score.

---

## Phase A — FP-024A forensic inventory

| Concern | Path | Evidence |
|---------|------|----------|
| External fixture | `src/lib/fabricator/golden/dowinPhysicalLengthFixture.ts` | `DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION` L313; 21 physical rows |
| Comparator | same | `compareDowinGoldenLengths` L216; `dowinMachineParityPasses` L255 |
| Nominal / packed / machine | same L84–88; `cutLengthSemantics.ts` L18–32 | No fallback packed→nominal or machine→packed |
| Bar reconciliation | `src/lib/fabricator/barPackExternalReconciliation.ts` | `reconcileExternalBarPattern` L43; no `magicAllowanceMm` |
| ManufacturingSettings | `src/lib/fabricator/ManufacturingSettings.ts` | `resolveManufacturingSettings` L186; named parity remnant 500 / platform 300 |
| barPackAccounting | `src/lib/fabricator/barPackAccounting.ts` | `accountBarPack` L85; **unchanged** in FP-024B |
| SystemPack geometry | `src/types/fenestration.ts` L143–175 | microns; no Basma/Kaynak per profile |
| Parity categories | fixture L15–46 | 9 categories; glass UNPROVEN; angle NOT_APPLICABLE |
| MDB evidence | fixture `DOWIN_ASDD_MDB_PROFILE_CUTS` L387; `dowinCompensationEvidence.ts` `DOWIN_ASDD_MDB_TABLE1_EVIDENCE` | **No repo MDB parser.** Transcribed `Table1` fields only. Binary not committed. |

Runtime isolation: `UPVCCuttingEngine`, `AlmonaCuttingEngine`, and `LinearOptimizer` do not import the golden fixture or `dowinCompensationEvidence`. External millimetres remain test/reference data.

---

## Fixture schema (multi-run)

Each `DowinCalibrationRun` captures:

- `fixtureId`, parent baseline id
- `isolationVariable` (one at a time)
- design W×H, system, machine
- `observedSettings` — **null unless this run was transcribed**
- `intendedIsolation` — operator instruction only
- piece nominal / packed / machine
- bar stock / remainder
- provenance

Unknown fields stay null. Platform / `yilmazcad-parity` defaults are **not** copied into `observedSettings`.

---

## Controlled experiment plan (operator; DoWin is not executed here)

| Test | Kind | Isolation | Status | Required exports |
|------|------|-----------|--------|------------------|
| 1 Baseline | `BASELINE_SETTINGS_SNAPSHOT` | none — asdd as run | **MEASURED** for lengths; **NOT MEASURED** for General Settings | Settings screenshot still needed |
| 2 Welding Waste | `SINGLE_SETTING_ISOLATION` | only Welding Waste → `0` | `PENDING_OPERATOR_RUN` | Design Preview, Labels, Optimization, MDB |
| 3 Saw Thickness | `SINGLE_SETTING_ISOLATION` | only saw + known 1 mm | `PENDING_OPERATOR_RUN` | same; also remainder / used |
| 4 Trim Cut | `SINGLE_SETTING_ISOLATION` | only trim + known delta | `PENDING_OPERATOR_RUN` | remainder vs packed/machine |
| 5 90° control | `CONTROL_FIXTURE` | 90°/90° demand, settings unchanged; geometry/cut-angle may differ | `PENDING_OPERATOR_RUN` | three length layers |

Tests 2–4 must keep geometry, stock, quantity, system, and machine (`DC-600`) identical. The 90° run is **not** a single-setting isolation.

### Operator evidence package (required for each run)

Do **not** commit licensed PDFs, MDB binaries, or screenshots unless project policy later allows licensed internal images. Ingest SHA-256 + transcribed millimetres only.

1. Exact General Settings screenshot  
2. Design dimensions / system / profile  
3. Machine = DC-600  
4. Design Preview PDF  
5. Labels / Assembly PDF  
6. Optimization PDF  
7. MDB if generated  
8. Timestamp / run ID  
9. The one changed setting and old/new value (`SINGLE_SETTING_ISOLATION` only)  
10. SHA-256 of each external file  
11. Transcribed nominal / packed / machine / remainder values  

Cursor output after ingest: **delta table + classification only** (`PROVEN EFFECT` / `NO OBSERVED EFFECT` / `AMBIGUOUS` / `NOT MEASURED`). No formula patch.

First capture the **existing asdd** settings (Welding Waste, Saw Thickness, Trim Cut, angle compensation L/R, robot safety length, sash offset if exposed, glazing clearance, selected machine). Until that exists, the baseline +3 mm stays unattributed.

`ingestOperatorCalibrationRun` rejects incomplete packages, multi-setting isolation, geometry/stock/qty changes on the first three isolation runs, and setting changes on the 90° CONTROL_FIXTURE.

---

---

## Baseline evidence (asdd)

21 physical pieces. Machine: DC-600 where `Table1` has a row.

Piece-layer deltas (generic subtraction, not a production rule):

| Category | packed − nominal | machine − packed |
|----------|----------------:|-----------------:|
| frame/sash/bead 45° | **3** | 0 where MDB exists; **null** on beads |
| mullion 90° | **0** | 0 |

`FRAME_X`/`FRAME_Y` on every transcribed MDB row remain **1000 × 1500**. `LENGTH` is the machine layer. Beads/glass are not in `Table1` (13 rows).

This-run settings:

| Field | This run |
|-------|----------|
| Welding Waste | **null** |
| Saw Thickness | **null** |
| Trim Cut | **null** |
| Glazing clearance / sash offset / angle comps / remnant / robot / waste margin | **null** |
| Machine | `DC-600` |

Dealer-audit named-profile numbers (weld 3, kerf 4, remnant 500) are **not** this-run Settings.

---

## Difference matrix

| Fixture | Variable changed | Nominal delta | Packed Δ vs nominal (unique) | Machine − packed | Remainder delta | Interpretation |
|---------|------------------|--------------:|------------------------------:|----------------:|----------------:|----------------|
| asdd baseline | baseline | 0 | **0 and 3** | 0 (13 MDB rows) | not collapsed | **AMBIGUOUS** |
| weld-0 | weldingWaste | — | — | — | — | **NOT MEASURED** |
| saw+1 | sawThickness | — | — | — | — | **NOT MEASURED** |
| trim+Δ | trimCut | — | — | — | — | **NOT MEASURED** |
| 90° control | CONTROL_FIXTURE | — | — | — | — | **NOT MEASURED** |

No row is `PROVEN EFFECT`. The 3 mm 45° observation is **not** authority to set `packedLength = nominalLength + 3`.

---

## Machine evidence

Raw `Table1` names preserved in audit/test structure:

`STOCK_CODE`, `LENGTH`, `LEFT_ANGLE`, `RIGHT_ANGLE`, `FRAME_X`, `FRAME_Y`, `EXPLANATION2`

Normalized only into the test-only `DowinMdbTable1Evidence` object. No customer PII. No binary MDB/template in the repo. `expectedMachineLengthMm === null` still cannot pass machine parity.

---

## Bar reconciliation (diagnostic; `barPackAccounting` unchanged)

Candidate terms listed separately. This-run saw/trim are null, so N×4 kerf is a **hypothesis**, not a this-run proof.

| Pattern | Stock | Σ packed | Reported remaining | extra after packed labels | N×4 hypothesis | leftover after that hypothesis | External bar |
|---------|------:|---------:|-------------------:|--------------------------:|---------------:|-------------------------------:|--------------|
| KASA-70 | 6000 | 5012 | 965 | **23** | 16 | **7** | **CONDITIONAL** |
| KANAT-70 | 6000 | 3774 | 2203 | **23** | 16 | **7** | **CONDITIONAL** |
| ORTA-KAYIT-70 | 6500 | 1416 | 5080 | 4 | 4 | **0** | RECONCILED (under that hypothesis) |
| CITA-20 A/B | 6500 | graphic labels | 206 / 6160 | non-zero | — | not isolated | CONDITIONAL |

The 7 mm figure is a **hypothesis leftover**. It is not a production constant. Trim Cut remains a candidate until Test 4. Welding is **not** subtracted again (packed labels may already include it).

---

## Term authority (FP-024C proposal gate)

| Term | Class | Propose for FP-024C? |
|------|--------|------------------------|
| 45° packed−nominal = 3 mm on asdd | SUPPORTED (this job only) | **No** — not isolated |
| 90° mullion all layers 1416 | SUPPORTED (this job only) | **No** — not an isolated control design |
| DC-600 LENGTH = packed graphic (13 rows) | SUPPORTED (this job / this machine) | **No** — beads still null |
| Welding Waste | **UNPROVEN** | No |
| Saw Thickness | **UNPROVEN** | No |
| Trim Cut | **UNPROVEN** | No |
| Hidden +3 / +7 | **UNPROVEN** / forbidden | No |

No production formula was changed. `calculateKFactor` remains.

---

## Tests

```bash
npm run type-check
npm run build
npx vitest run src/tests/fabricator
npx vitest run src/tests/constitutional
npx vitest run src/tests/fabricator -t "FP-024"
npx vitest run src/tests/fabricator/kerfAccountingInvariant.test.ts
```

Covered: multiple runs; fixture-specific null settings; separate layers; deterministic matrix; fixture mutation does not change `resolveManufacturingSettings`; null machine cannot pass; leftover 7 mm surfaced as hypothesis; FP-024A still fails; FP-023B N-kerf remains green.

Recorded on this branch (9 Sep 2026):

| Command | Result |
|---------|--------|
| `npm run type-check` | exit 0 |
| `npm run build` | exit 0 |
| `npx vitest run src/tests/fabricator` | 6 files, 85 tests, 0 failed |
| `npx vitest run src/tests/constitutional` | 8 files, 83 tests, 0 failed |
| `npx vitest run src/tests/fabricator -t "FP-024"` | 28 passed |
| FP-023B kerf invariant | green |

---

## Remaining evidence needed

1. Screenshot / transcription of **this-run** General Settings (Test 1).
2. Welding Waste = 0 isolation export (Test 2).
3. Saw Thickness +1 mm isolation (Test 3).
4. Trim Cut isolation vs the 23 mm extra-after-packed and the 7 mm hypothesis leftover (Test 4).
5. Separate 90° **CONTROL_FIXTURE** (not a single-setting isolation).
6. Bead machine instruction (not in DC-600 `Table1`).
7. Glass production dimension.

Until those exist, do not implement FP-024C formula changes.

## Program state

```
FP-023A ⚠️ CONDITIONAL
→ FP-023B ✅ PROVEN internally
→ FP-024A ❌ parity failed
→ FP-024B ⚠️ CONDITIONAL calibration evidence
→ FP-025A ✅ ACCEPTED UI (main; manufacturing truth unchanged)
→ operator isolation runs required
→ FP-024C formula implementation + ±0.1 mm external parity
→ FP-016
→ FP-017
```

The first manufacturing score increase waits for FP-024C. FP-025B polish must not interrupt this sequence.

---

---

## Legal / IP

Licensed PDFs and ordinary readable MDB table fields only. No binary decompilation, no SQLCipher/DPAPI, no guessed Basma/Kaynak, no DoWin UI clone.

---

## Scores (unchanged)

| Area | Score |
|------|------:|
| Manufacturing settings governance | 8.0/10 |
| Physical-length correctness | **6.0/10** |
| Optimization correctness | 7.0/10 |
