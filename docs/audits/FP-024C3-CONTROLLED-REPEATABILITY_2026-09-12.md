# FP-024C.3 — Controlled Fresh-Solve Repeatability

| Field | Value |
|-------|--------|
| Date | 12 September 2026 |
| Branch | `feature/fp024c-physical-parity` |
| HEAD at start | `243558a` — `audit: trace Fresh A stock mutation provenance` |
| PR #32 | Draft / **DO NOT MERGE** |
| Question | Do multiple genuinely fresh optimization solves under the same current input state produce the same bar-assignment topology? |
| Gate | ⏸ **CONTROLLED_REPEATABILITY_IN_PROGRESS** — 0 of 3 controlled runs ingested |
| Physical-length score | **Unchanged at 6.0/10** |
| Production formulas | **FROZEN** |
| 90° CONTROL_FIXTURE | **GATED** |

---

## Verdict

```
FP-024C   ⏸ STATE PROVENANCE INVESTIGATION
FP-024C.1 PAUSED BY STOCK_STATE_CHANGED
FP-024C.2 ✅ STOCK MUTATION PROVENANCE AUDIT COMPLETE
FP-024C.3 ⏸ CONTROLLED_REPEATABILITY_IN_PROGRESS

Controlled baseline:
FROZEN at current post-Fresh-A warehouse state

FP024C3_RUN_A: PENDING_OPERATOR_RUN
FP024C3_RUN_B: PENDING_OPERATOR_RUN
FP024C3_RUN_C: PENDING_OPERATOR_RUN

Repeatability classification:
NOT YET CLASSIFIABLE (0 of 3 runs)

Measured-input repeatability:
UNPROVEN

Complete-input equivalence:
UNPROVEN (offcut/remnant surface absent)

90° CONTROL_FIXTURE:
GATED

Physical-length correctness:
6.0/10

Production formulas:
FROZEN

PR #32:
DRAFT / DO NOT MERGE
```

This checkpoint establishes the controlled baseline, the stock-isolation rules, the intake gate, and the classification logic. It ingests **no** run. The three controlled solves require the licensed DoWin application on the operator PC and cannot be produced from this repository. No topology, hash, or provenance value below is invented.

---

## Inherited FP-024C.2 finding (locked; do not reopen)

| Event | Time (UTC+3, 12 Sep 2026) | Stock write |
|-------|---------------------------|-------------|
| Run Optimization — Success, 6 bars, 54.8% | 21:55:16 | **NOT_OBSERVED** (Stock Items still showed KASA 14 afterwards) |
| PDF export package | ~21:59:49 | **NOT_OBSERVED** |
| DC-600 machine export | 22:02:57 | **NOT_OBSERVED** |
| Dedicated stock-update operation | **22:17:20** | **WAREHOUSE WRITE PROVEN** |

Post-write quantities: CITA 48→46, KANAT 98→96, KASA 14→13, ORTA 0→0 (clamped).

Fresh A used bars: CITA 2, KANAT 2, KASA 1, ORTA 1. Observed deltas match used-bar counts for CITA, KANAT, and KASA. ORTA remained clamped at 0. No offcuts were imported.

| Class | Verdict |
|-------|---------|
| `OPTIMIZATION_RUN_MUTATES_STOCK` | **NOT_OBSERVED** |
| `EXPORT_MUTATES_STOCK` | **NOT_OBSERVED** |
| Dedicated stock-update workflow | **SUPPORTED** as the mutation path |
| Exact user-visible trigger at 22:17:20 | **AMBIGUOUS / UNOBSERVED** |

Do not reopen this causal question unless new contrary evidence appears.

**Consequence for repeatability:** warehouse state changed after Fresh A, so Fresh A can no longer serve as a member of a stock-equivalent triplicate. Future runs must not be compared to Fresh A as if they were stock-equivalent.

---

## New frozen control baseline

The **current** warehouse state is frozen as the FP-024C.3 baseline. Historical 48 / 98 / 14 is evidence, not a restoration target. ORTA is **not** to be replenished.

| Profile | Length | Frozen quantity |
|---------|--------|-----------------|
| Deceuninck-CITA-20 | 6500 | **46** |
| Deceuninck-KANAT-70 | 6000 | **96** |
| Deceuninck-KASA-70 | 6000 | **13** |
| Deceuninck-ORTA-KAYIT-70 | 6500 | **0** |
| Deceuninck-KOSE-METAL-05 | 6500 | 100 |
| Deceuninck-KOSE-PLASTIK-01 | 6500 | 50 |
| Deceuninck-DESTEK-SACI-2.0MM | 6500 | 15 |

Encoded as `FP024C3_FROZEN_WAREHOUSE_BASELINE` in `src/lib/fabricator/dowinParity/optimizerStateProvenance.ts`.

Bound evidence for these quantities: Stock Management screenshot SHA-256 `480646001d0ab21ba4812bb09614db5764c097207f8ec76b16e13a4ec6f46a56` (captured during the blocked Fresh B pre-run). Each controlled run requires its **own** post-run capture; this hash is not reusable as post-run evidence.

---

## Non-negotiable stock rule

During FP-024C.3 the operator must not invoke any warehouse-write action:

```
Update Stock
Add Offcuts
Production Approval
Confirm Stock
Import Remnants
```

Encoded as `FP024C3_FORBIDDEN_WAREHOUSE_ACTIONS`. If an Update Stock confirmation appears it must be cancelled or closed, never accepted.

After **every** run, Stock Management is reopened immediately and compared to the frozen baseline:

| Postcheck outcome | Meaning |
|-------------------|---------|
| `PASS` | every baseline card present and unchanged |
| `STOCK_STATE_MUTATED` | any quantity delta, **or** any new card such as an imported remnant row → **STOP all experiments**, do not repair stock |
| `UNPROVEN` | stock screen not captured or incomplete → fail-closed, never a PASS |

Encoded as `evaluateControlledStockPostcheck`.

---

## Run identities

Three new experiments. These are **not** Fresh B / Fresh C from the previous protocol.

| Slot | Project | Design | Plan | Status |
|------|---------|--------|------|--------|
| `FP024C3_RUN_A` | `FP024C3_RUN_A` | `RUN_A` | `RUN_A_PLAN` | **PENDING_OPERATOR_RUN** |
| `FP024C3_RUN_B` | `FP024C3_RUN_B` | `RUN_B` | `RUN_B_PLAN` | **PENDING_OPERATOR_RUN** |
| `FP024C3_RUN_C` | `FP024C3_RUN_C` | `RUN_C` | `RUN_C_PLAN` | **PENDING_OPERATOR_RUN** |

The old `FP024C1_FRESH_B` remains **INVALID_PRE_RUN / STOCK_STATE_CHANGED** and `FP024C1_FRESH_C` remains closed. All three FP-024C.3 slots are registered in the existing catalog (`DOWIN_CALIBRATION_RUNS`, 13 entries, 6 pending) with empty pieces, empty bars, and `optimizerProvenance = null`. No placeholder topology exists.

Run B is authorized only after Run A's postcheck passes; Run C only after Run B's. No fourth run without explicit authorization.

---

## Required fixed settings (per run)

Re-entered and re-screenshot before **each** run:

| Field | Required |
|-------|----------|
| Welding Waste | 3 |
| Saw Thickness | 4 |
| Trim Cut | 0 |
| Sash Offset | 7 |
| Glazing Clearance | 2.5 |
| Minimum reusable / offcut | 500 |
| Export machine | DC-600 |
| DC-550 SKH | record separately as globally enabled; not the selected machine |

A **new** SHA-256 is required per run. A hash shared with a prior run means one screenshot was reused, so the settings axis for that pair is forced to `UNPROVEN` and intake is rejected. Prior hashes (`571dc804…` Fresh A, `10eb9dcd…` Fresh B pre-run) are **not** acceptable as current-state evidence.

---

## Required fixture signature

Each run must independently create 1000 × 1500 mm, Deceuninck 70. Cut lengths must arise from design generation and must not be forced by hand.

| Role | Nominal | Packed | Angles | Qty |
|------|---------|--------|--------|-----|
| KASA horizontal | 1000 | **1003** | 45 / 45 | 2 |
| KASA vertical | 1500 | **1503** | 45 / 45 | 2 |
| KANAT horizontal | 451 | **454** | 45 / 45 | 4 |
| KANAT vertical | 1430 | **1433** | 45 / 45 | 4 |
| ORTA | 1416 | **1416** | 90 / 90 | 1 |
| CITA horizontal | 331 | **334** | 45 / 45 | 4 |
| CITA vertical | 1310 | **1313** | 45 / 45 | 4 |

Total 21 pieces. Encoded as `FP024C3_EXPECTED_FIXTURE_ROWS` / `FP024C3_EXPECTED_PIECE_COUNT`, checked by `evaluateControlledFixtureSignature`:

- present-but-different layer → `GEOMETRY_OR_SYSTEM_INPUT_DIFFERENCE`, that run stops
- absent layer → `UNPROVEN`

These are transcriptions of previously measured DoWin output. They are **not** a formula. No `+3` / `+7` / Welding-Waste / Saw / Trim expression is encoded anywhere in the evidence code.

---

## Length layers (kept separate; not collapsed)

| Layer | RUN_A | RUN_B | RUN_C |
|-------|-------|-------|-------|
| NOMINAL | PENDING | PENDING | PENDING |
| PACKED | PENDING | PENDING | PENDING |
| MACHINE | PENDING | PENDING | PENDING |
| TOPOLOGY | PENDING | PENDING | PENDING |
| REMAINDER | PENDING | PENDING | PENDING |

Expected DC-600 machine rows (transcription target, not a claim): KANAT V 1433 ×4, KANAT H 454 ×4, KASA H 1003 ×2, KASA V 1503 ×2, ORTA 1416 ×1. CITA machine length stays `null` unless it actually appears in the export.

---

## Per-run provenance (all PENDING)

### FP024C3_RUN_A

| Axis | Value |
|------|-------|
| Project / design / plan identity | **PENDING_OPERATOR_RUN** |
| `optimizationResultId` / `optimizationHistoryId` | **PENDING** |
| `solveDisposition` | must be `NEWLY_SOLVED`; currently **PENDING** |
| Settings screenshot SHA-256 | **PENDING** (new capture required) |
| Required-parts list / fingerprint | **PENDING** |
| Optimizer Stock Items / fingerprint | **PENDING** |
| Offcut / remnant surface | **UNPROVEN** (fail-closed default) |
| Machine | DC-600 required; **PENDING** |
| Artifact hashes (Design Preview / Labels / Optimization Report / DC-600 `.dw`) | **PENDING** |
| Bar-by-bar topology + fingerprint | **PENDING** |
| Post-run stock check | **PENDING** — expected `46 / 96 / 13 / 0` |

### FP024C3_RUN_B

Identical intake requirements. **PENDING_OPERATOR_RUN.** Authorized only after Run A's postcheck is `PASS`. A geometric copy is acceptable only if no optimization state or history is inherited; a reused `optimizationResultId` is rejected by intake.

### FP024C3_RUN_C

Identical intake requirements. **PENDING_OPERATOR_RUN.** Authorized only after Run B's postcheck is `PASS`.

---

## Input-equivalence matrix

| Pair | geometry | requiredParts | settings | machine | optimizerStock | warehouseStock | offcutRemnant | freshness | MEASURED | COMPLETE |
|------|----------|---------------|----------|---------|----------------|----------------|---------------|-----------|----------|----------|
| A ↔ B | UNPROVEN | UNPROVEN | UNPROVEN | UNPROVEN | UNPROVEN | UNPROVEN | UNPROVEN | UNPROVEN | **UNPROVEN** | **UNPROVEN** |
| A ↔ C | UNPROVEN | UNPROVEN | UNPROVEN | UNPROVEN | UNPROVEN | UNPROVEN | UNPROVEN | UNPROVEN | **UNPROVEN** | **UNPROVEN** |
| B ↔ C | UNPROVEN | UNPROVEN | UNPROVEN | UNPROVEN | UNPROVEN | UNPROVEN | UNPROVEN | UNPROVEN | **UNPROVEN** | **UNPROVEN** |

Allowed per-axis values are `IDENTICAL` / `DIFFERENT` / `UNPROVEN`. Reduction order is `DIFFERENT` > `UNPROVEN` > `IDENTICAL`, so a concrete difference is never hidden by a missing axis, and a missing axis never becomes `IDENTICAL`.

Two concepts are kept explicitly separate and must not be substituted for one another:

1. **MEASURED_INPUT_EQUIVALENCE** — the seven axes the licensed UI exposes. Excludes offcut/remnant (`FP024C3_MEASURED_EQUIVALENCE_AXES`).
2. **COMPLETE_INPUT_EQUIVALENCE** — all eight axes including offcut/remnant (`FP024C3_EQUIVALENCE_AXES`).

Because no dedicated remnant/offcut surface has ever been observed in this application, `offcutRemnant` stays `UNPROVEN` and therefore complete input equivalence stays `UNPROVEN`. Absence of UI is never converted to `NONE`; the evidence type has only `MEASURED` and `UNPROVEN` states.

---

## Classification logic

Encoded as `classifyControlledRepeatability`, evaluated in this order:

| Condition | Verdict |
|-----------|---------|
| forbidden warehouse-write action invoked, or any postcheck `STOCK_STATE_MUTATED` | `STOCK_STATE_MUTATED` — **STOP**, do not repair |
| fewer than 3 controlled runs | `CONTROLLED_REPEATABILITY_IN_PROGRESS` |
| incomplete provenance, non-`NEWLY_SOLVED` run, uncaptured postcheck, or missing bar-by-bar topology | `AMBIGUOUS` |
| measured inputs `DIFFERENT` | `HIDDEN_INPUT_DIFFERENCE` |
| measured inputs `UNPROVEN` | `AMBIGUOUS` |
| measured inputs `IDENTICAL` + one topology | `MEASURED_INPUT_REPEATABILITY_PROVEN` |
| measured inputs `IDENTICAL` + >1 topology + complete equivalence `IDENTICAL` | `OPTIMIZER_NONDETERMINISM_OR_TIE_BREAKING` |
| measured inputs `IDENTICAL` + >1 topology + offcut `UNPROVEN` | `NONREPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS` |

`fullDeterminismClaimAllowed` is true only when every axis including offcut/remnant is `IDENTICAL` and exactly one topology was produced. `MEASURED_INPUT_REPEATABILITY_PROVEN` therefore never implies full determinism while the remnant axis is unproven, and more than one topology under an unproven remnant axis never becomes a pure nondeterminism claim.

Current evaluation with zero ingested runs: **`CONTROLLED_REPEATABILITY_IN_PROGRESS`**.

---

## Topology capture requirements

Per used bar: `profileCode`, `stockBarId` if exposed else `null`, `stockBarOrdinal`, `stockLengthMm`, the piece sequence in exact displayed order, and `remainderMm`. Per piece: role, source/external identity if exposed, `nominalLengthMm` if visible, `packedLengthMm`, `leftAngleDeg`, `rightAngleDeg`.

Topology equality **ignores** result UUID, report timestamp, and non-semantic random stock UUID. It **preserves** profile, bar grouping, piece sequence where semantically meaningful, packed lengths, stock length, and remainder distribution. Same utilization is not same topology; same total remainder with a different distribution is a different topology.

---

## Historical topology observations (comparison only)

These remain observational. Current runs must **not** be classified as historically input-equivalent, because warehouse provenance differs.

| Package | KASA | KANAT | ORTA | CITA |
|---------|------|-------|------|------|
| Original 1B | 965 | 2203 | 5080 | 206 / 6160 |
| Fresh A | 965.4 | 245.4 / 4161.4 | 5080.0 | 206.4 / 6160.3 |
| Later / reset | 960 | 2198 | 5079 | 3178 ×2 |
| RUN_A / RUN_B / RUN_C | PENDING | PENDING | PENDING | PENDING |

---

## ORTA quantity 0

ORTA remains at quantity 0 and must not be replenished. If the optimizer again offers or packs a 6500 ORTA bar despite warehouse quantity 0, record `WAREHOUSE_QTY_VS_OPTIMIZER_AVAILABILITY_DISCREPANCY` (encoded as `observeWarehouseQtyVsOptimizerAvailability`). If it occurs identically across A/B/C it is a supported repeatable observation. It is **not** a product defect without a separate audit.

Current state: **UNPROVEN** for the controlled runs (no run captured). Previously observed on Fresh A.

---

## Tests

| Check | Result |
|-------|--------|
| `npm run type-check` | **Pass** (`tsc --noEmit`) |
| `npx vitest run src/tests/fabricator/dowinCompensationReconciliation.test.ts` | **Pass** — 18 tests |
| `npx vitest run src/tests/fabricator/dowinOptimizationStateProvenance.test.ts` | **Pass** — 35 tests (13 new FP-024C.3 cases) |
| `npx vitest run src/tests/fabricator/dowinPhysicalLengthGolden.pending.test.ts` | **Pass** — 20 tests |
| `npx vitest run src/tests/constitutional/ManufacturingSettingsContract.test.ts` | **Pass** — 5 tests |
| Combined | 4 files, **78 tests passed** |
| `npm run build` | **Pass** (`vite build --mode production`) |

New FP-024C.3 coverage: frozen baseline values; postcheck PASS / mutated / partial / remnant-row-added / uncaptured; catalog slots pending and 90° gate closed; refusal to claim repeatability from A or A+B; measured repeatability separated from full determinism; no nondeterminism overclaim while offcuts are unproven; stop on stock movement or warehouse write; reused settings hash and reused result rejected; `HIDDEN_INPUT_DIFFERENCE` on a concrete optimizer-stock difference; fixture-signature match / drift / unproven; ORTA availability observation; and a no-mutation assertion on `resolveManufacturingSettings`.

---

## Formula freeze verification

No diff in `ManufacturingSettings.ts`, `barPackAccounting.ts`, `UPVCCuttingEngine.ts`, `src/lib/fabricator/production`, K-factor, Cut identity, CNC lengths, or `physicalCutAssignmentKey`.

Changes are confined to:

| Path | Role |
|------|------|
| `src/lib/fabricator/dowinParity/optimizerStateProvenance.ts` | FP-024C.3 baseline, postcheck, equivalence matrix, classifier, fixture-signature gate, intake gate |
| `src/lib/fabricator/dowinParity/dowinCompensationEvidence.ts` | three pending controlled slots, re-exports, 90° gate now also requires the controlled triplicate |
| `src/tests/fabricator/dowinOptimizationStateProvenance.test.ts` | FP-024C.3 test block |
| `src/tests/fabricator/dowinCompensationReconciliation.test.ts` | catalog counts 10 → 13, pending 3 → 6 |
| `docs/audits/*` | this audit and the FP-024C.1 update |

Test 2 authority is unchanged: Welding Waste affects packed/machine KASA/KANAT in the observed `asdd` fixture only. No generalization.

`FP-026 STOCK_COMMIT_BOUNDARY` is preserved as a future finding and **not** implemented. The ALMONA implication stands: solve and export must not silently commit warehouse truth; stock mutation belongs behind an explicit authoritative confirmation.

---

## Licensed-artifact exclusion

Committed: SHA-256 values, transcriptions, structured provenance, fingerprints, classification, tests, audit docs.

Not committed: PDFs, `.dw`, MDB, screenshots, machine binaries. No decompilation. The encrypted shop database was not opened.

---

## Limitations

- No controlled run has been executed. Every run-level value in this audit is `PENDING_OPERATOR_RUN`, not a measurement.
- The three solves require the licensed DoWin application on the operator PC and cannot be generated from this repository.
- The offcut/remnant axis has no evidence surface, so complete input equivalence can stay `UNPROVEN` even after three valid runs.
- The exact user-visible trigger of the 22:17:20 warehouse write remains `AMBIGUOUS` from FP-024C.2; the controlled protocol avoids the question rather than answering it.
- The frozen baseline is bound to a Fresh-B-era stock screenshot. Each run still needs its own contemporaneous post-run capture.
- Production-plan "approved" versus "optimized" UI flags remain `UNPROVEN` because Production Status is not to be clicked.

---

## Gating

| Item | Status |
|------|--------|
| FP024C3_RUN_A / B / C | **PENDING_OPERATOR_RUN** |
| Repeatability verdict | **NOT YET CLASSIFIABLE** |
| 90° CONTROL_FIXTURE | **GATED** — not to be run during FP-024C.3; the repeatability verdict comes first, then authorization is requested |
| Physical-length correctness | **6.0/10** |
| Production formulas | **FROZEN** |
| FP-016 / FP-017 | not started |
| FP-025B | do not start |
| FP-026 | future finding, not implemented |
| PR #32 | **Draft / DO NOT MERGE** |
