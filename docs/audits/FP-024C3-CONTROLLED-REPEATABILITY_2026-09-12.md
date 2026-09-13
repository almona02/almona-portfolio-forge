# FP-024C.3 — Controlled Fresh-Solve Repeatability

| Field | Value |
|-------|--------|
| Date | 12 September 2026, re-baselined 13 September 2026, controlled triplicate executed 13 September 2026 |
| Branch | `feature/fp024c-physical-parity` |
| HEAD at start | `243558a` — `audit: trace Fresh A stock mutation provenance` |
| HEAD at re-baseline | `cb05ab0` |
| PR #32 | Draft / **DO NOT MERGE** |
| Question | Do multiple genuinely fresh optimization solves under the same current input state produce the same bar-assignment topology? |
| Active baseline | **V2** — frozen 12 Sep 23:58:45 +03, `MANUAL_STOCK_CARD_EDIT_CONTAMINATED_V1` |
| Gate | ✅ **ACCEPTED AS EVIDENCE CHECKPOINT** — 3 of 3 controlled runs ingested; independent review 13 September 2026 accepted the verdict with one wording correction, applied below |
| Physical-length score | **Unchanged at 6.0/10** |
| Production formulas | **FROZEN** |
| 90° CONTROL_FIXTURE | **GATED** |

---

## Verdict

```
FP-024C   ⏸ STATE PROVENANCE INVESTIGATION
FP-024C.1 PAUSED BY STOCK_STATE_CHANGED
FP-024C.2 ✅ STOCK MUTATION PROVENANCE AUDIT COMPLETE
FP-024C.3 ✅ PROVEN as NONREPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS
          (accepted at independent review, 13 September 2026)

Controlled baseline V1:
INVALIDATED BEFORE RUN_A — HISTORICAL_ONLY
reason: MANUAL_STOCK_CARD_EDIT_CONTAMINATED_V1

Controlled baseline V2:
FROZEN — CITA 46 / KANAT 96 / KASA 13 / ORTA 100
source hash: c8626da5166731e393a74ae731b663410ef77f2bde2b05bcfa572531e6c32012

FP024C3_RUN_A: MEASURED (OptimizationRun Id=9,  NEWLY_SOLVED)
FP024C3_RUN_B: MEASURED (OptimizationRun Id=10, NEWLY_SOLVED)
FP024C3_RUN_C: MEASURED (OptimizationRun Id=11, NEWLY_SOLVED)

Repeatability classification:
NONREPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS

  runCount                    3
  uniqueTopologyCount         2
  topology distribution       X / Y / X
  MEASURED_INPUT_EQUIVALENCE  IDENTICAL  (all three pairs)
  COMPLETE_INPUT_EQUIVALENCE  UNPROVEN   (offcut/remnant axis)
  fullDeterminismClaimAllowed false

NOT OPTIMIZER_NONDETERMINISM_OR_TIE_BREAKING
— that requires complete input equivalence.

Stochastic mechanism authority:
POSSIBLE_NONDETERMINISTIC_MECHANISM
(NOT PROVEN_NONDETERMINISM)

A_B_C_MACHINE_LENGTH_LAYER:
IDENTICAL (Table1 read from all three .dw files,
13 rows field-for-field, 39 columns compared)

OPTIMIZATION_REQUIRED_PARTS_CONSERVATION_VIOLATION:
REPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS
(21 required → 24 planned, +3 ORTA, all three runs)

SURPLUS_PLAN_REMAINDER_PROPAGATES_TO_MACHINE_OUTPUT:
REPEATABLE_OBSERVATION
(ORTA REMAINING_LENGTH 820.0 mm in all three files)

Warehouse immutability:
IMMUTABLE_VERIFIED (all three runs) (identical surplus signature)

RUN_A warehouse immutability:
IMMUTABLE_VERIFIED (UI byte-identical to V2 + zero stock-write log lines)

OVERPRODUCTION_BEYOND_REQUIRED_QUANTITY:
OBSERVED on RUN_A, RUN_B, RUN_C — 24 pieces planned against 21 required

+3 ORTA ROOT CAUSE:
UNPROVEN — repeatable, uncorrelated with the stochastic CITA
variation, so a deterministic or upstream conservation defect is
supported; the layer that introduces 1 -> 4 is not yet identified.
Next gate: FP-027 (forensics only, no fix).

POST_EXPORT_STOCK_UPDATE_DIALOG_IS_THE_WRITE_TRIGGER:
SUPPORTED_BY_CONTROLLED_COMPARISON (resolves the FP-024C.2 AMBIGUOUS trigger)

DoWin solver stages:
Column Generation + MIP + SIMULATED ANNEALING (stochastic; no seed exposed)

ORTA_ZERO_QTY_CONTROL_OBSERVABILITY:
LOST_BY_MANUAL_STOCK_EDIT

MANUAL_STOCK_CARD_EDIT_IS_UNLOGGED:
PROVEN FOR OBSERVED PATH

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

This checkpoint establishes the controlled baseline, the stock-isolation rules, the intake gate, and the classification logic, and ingests the **complete controlled triplicate**. No fourth solve is authorized. The three controlled solves require the licensed DoWin application on the operator PC and cannot be produced from this repository. No topology, hash, or provenance value below is invented.

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

## Baseline V1 — invalidated before RUN_A (historical evidence only)

V1 froze the post-Fresh-A warehouse state. It was superseded **before any controlled run was created**, so no run was ever solved against it.

| Profile | Length | V1 quantity |
|---------|--------|-------------|
| Deceuninck-CITA-20 | 6500 | 46 |
| Deceuninck-KANAT-70 | 6000 | 96 |
| Deceuninck-KASA-70 | 6000 | 13 |
| Deceuninck-ORTA-KAYIT-70 | 6500 | **0** |
| Deceuninck-KOSE-METAL-05 | 6500 | 100 |
| Deceuninck-KOSE-PLASTIK-01 | 6500 | 50 |
| Deceuninck-DESTEK-SACI-2.0MM | 6500 | 15 |

| Field | Value |
|-------|-------|
| `baselineVersion` | 1 |
| `baselineReason` | `POST_FRESH_A_OPTIMIZATION_STOCK_WRITE` |
| `baselineSourceHash` | `a1881bba3df98e15eb73adf3958a0fcc6d312cbbb1b025e5999f25db0ba8ae31` |
| `status` | **HISTORICAL_ONLY** |
| Verified at | 12 Sep 2026 23:24:05 +03 |

V1 must not be used as a comparison target for input equivalence, and must not be restored. `evaluateBaselineEquivalenceClaim(1)` returns `REJECTED_BASELINE_SUPERSEDED`.

---

## Manual stock mutation that invalidated V1

Between the Management Panel opening at **23:57:36** and an independent capture at **23:58:45**, a manual Stock Management card edit raised one quantity:

| Profile | Length | V1 | Observed | Δ |
|---------|--------|----|----------|---|
| Deceuninck-ORTA-KAYIT-70 | 6500 | 0 | **100** | **+100** |

All six other cards were unchanged, with no missing and no unexpected rows. Running the observed snapshot through `evaluateControlledStockPostcheck` against V1 returned `STOCK_STATE_MUTATED` with exactly one non-zero delta.

The edit produced **no stock-write log line**; `ExecuteStockUpdateCoreAsync` occurrences stayed at 6. See `MANUAL_STOCK_CARD_EDIT_IS_UNLOGGED` in the FP-024C.2 audit.

Per protocol the mutation was **not repaired**: ORTA was not returned to 0 by hand. Restoring would itself be a warehouse write, and historical stock is evidence rather than a target.

`FP024C3_RUN_A` was **never created** and **never solved** under either baseline.

---

## Baseline V2 — active frozen control baseline

The current observed warehouse state is frozen as V2. ORTA 100 is now the accepted controlled value, not an anomaly.

| Profile | Length | Frozen quantity |
|---------|--------|-----------------|
| Deceuninck-CITA-20 | 6500 | **46** |
| Deceuninck-KANAT-70 | 6000 | **96** |
| Deceuninck-KASA-70 | 6000 | **13** |
| Deceuninck-ORTA-KAYIT-70 | 6500 | **100** |
| Deceuninck-KOSE-METAL-05 | 6500 | 100 |
| Deceuninck-KOSE-PLASTIK-01 | 6500 | 50 |
| Deceuninck-DESTEK-SACI-2.0MM | 6500 | 15 |

| Field | Value |
|-------|-------|
| `baselineVersion` | 2 |
| `baselineReason` | `MANUAL_STOCK_CARD_EDIT_CONTAMINATED_V1` |
| `baselineSourceHash` | `c8626da5166731e393a74ae731b663410ef77f2bde2b05bcfa572531e6c32012` |
| `status` | **ACTIVE** |
| Frozen at | 12 Sep 2026 23:58:45 +03 |

Encoded as `FP024C3_BASELINE_V2` / `FP024C3_FROZEN_WAREHOUSE_BASELINE_V2` in `src/lib/fabricator/dowinParity/optimizerStateProvenance.ts`. `FP024C3_FROZEN_WAREHOUSE_BASELINE` now aliases the **active** snapshot, and `FP024C3_ACTIVE_BASELINE_VERSION` is `2`.

The V2 source hash is a **pre-run** capture and is not reusable as post-run evidence. Each controlled run still requires its own contemporaneous post-run capture.

### Why the experiment survives

A/B/C answer whether repeated fresh solves under the **same current** measured input state produce the same topology. They never needed the historical ORTA-0 state. Under V2 the question is unchanged:

```
same geometry (1000×1500 Deceuninck 70)
+ same Weld 3 / Saw 4 / Trim 0
+ same machine (DC-600)
+ same required parts
+ same optimizer stock
+ warehouse baseline V2
+ no stock mutation between runs
= does topology repeat?
```

---

## Warehouse verification now requires two sources

`verifyWarehouseImmutability` demands **both** checks for every controlled run:

| Source | Role |
|--------|------|
| Direct Stock Management quantity comparison | **Authoritative** for detecting drift |
| Diagnostic log review | **Supplementary** only |

Resulting rules, all covered by tests:

| Situation | Verdict |
|-----------|---------|
| UI matches V2, log reviewed, no write logged | `IMMUTABLE_VERIFIED` |
| UI mismatch, log silent | `STOCK_STATE_MUTATED` — log silence cannot override the UI |
| UI matches, stock write logged | `STOCK_STATE_MUTATED` — a write occurred |
| Manual stock-card edit observed | `STOCK_STATE_MUTATED` regardless of the log |
| UI matches, log not reviewed | `UNPROVEN` — a UI match alone is not verification |
| UI capture missing or partial | `UNPROVEN` |

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

Added 13 September 2026: **editing a stock card in the Management Panel is equally forbidden**, including any quantity change and any Save on the stock form. That path is unlogged, so it is invisible to the diagnostic log and detectable only by UI capture. It is the mutation that invalidated baseline V1.

After **every** run, Stock Management is reopened immediately and compared to the **active** frozen baseline (V2):

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
| `FP024C3_RUN_A` | `FP024C3_RUN_A` Id=3 (No 100003) | `RUN_A` Id=5 | `RUN_A_PLAN` Id=3 | **MEASURED** — `OptimizationRun` Id=9 |
| `FP024C3_RUN_B` | `FP024C3_RUN_B` Id=4 (No 100004) | `RUN_B` Id=6 | `RUN_B_PLAN` Id=4 | **MEASURED** — `OptimizationRun` Id=10 |
| `FP024C3_RUN_C` | `FP024C3_RUN_C` Id=5 (No 100005) | `RUN_C` Id=7 | `RUN_C_PLAN` Id=5 | **MEASURED** — `OptimizationRun` Id=11 |

All three must be solved against baseline **V2**. A run declaring baseline V1 is rejected at intake, and classification returns `BASELINE_SUPERSEDED`.

The old `FP024C1_FRESH_B` remains **INVALID_PRE_RUN / STOCK_STATE_CHANGED** and `FP024C1_FRESH_C` remains closed. All three FP-024C.3 slots are registered in the existing catalog (`DOWIN_CALIBRATION_RUNS`, 13 entries, 3 pending — Fresh B, Fresh C and the 90° control). RUN_A and RUN_C carry five bar patterns each and RUN_B four, all with full `optimizerProvenance`. No placeholder topology exists anywhere.

RUN_A is deliberately **excluded** from `classifyProvenanceFreshStateExperiment`. Fresh A solved against V1-era optimizer stock (48 / 98 / 14 / 0) and RUN_A against V2 (46 / 96 / 13 / 100), so comparing them would be a cross-baseline category error — the same error `BASELINE_SUPERSEDED` guards at intake. FP-024C.3 runs are classified only by `classifyControlledRepeatability`.

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

## Per-run provenance

### FP024C3_RUN_A — MEASURED

| Axis | Value |
|------|-------|
| Project / design / plan identity | Project Id=3 `FP024C3_RUN_A` (No 100003, OrderNo 10003) / Design Id=5 `RUN_A` / Plan Id=3 `RUN_A_PLAN` ItemCount=1 |
| `optimizationResultId` / `optimizationHistoryId` | `OptimizationRun_9_1af599d5` / none |
| `solveDisposition` | `NEWLY_SOLVED` — solved 00:57:08 +03, 0.09 s |
| Settings screenshot SHA-256 | `8597b36c1dba0e0d21113597bdeaba6e0a09d5d8eb0c83dcd3b09b8c3c92a3ae` |
| Required-parts list | 21 cuttable rows / 20 564 mm — signature **MATCH**, all 21 rows visually measured across three captures |
| Optimizer Stock Items | 7 SKUs mirroring V2 exactly, including ORTA-KAYIT-70 6500 qty **100** |
| Offcut / remnant surface | **UNPROVEN** (fail-closed; see below) |
| Machine | DC-600 double head cutting machine |
| Artifact hashes | Design Preview `c24c91ce…` / Labels `2d19d010…` / Optimization `466c0168…` / DC-600 `.dw` `4b1974bc…` |
| Bar-by-bar topology | 5 patterns / 6 bars — transcribed below |
| Pre-run stock check | **PASS** — live re-read, byte-identical to V2 `c8626da5…` |
| Post-run stock check | **PASS** — byte-identical to V2 |
| Post-export stock check | **PASS** — byte-identical to V2 after a full DoWin restart (pid 2536 → 31040) |
| Warehouse immutability | **IMMUTABLE_VERIFIED** — UI authoritative + zero `ExecuteStockUpdateCoreAsync` lines |

Reported result: yield **66.2 %**, 6 stock bars used, **0 unplaced**, total offcut **12 559 mm**.

#### Measured topology

| Bar | Profile | Stock | Applications | Packed segments (mm) | Remaining (mm) | Yield |
|-----|---------|-------|--------------|----------------------|----------------|-------|
| 1 | CITA-20 | 6500 | 1 | 1313 × 4, 334 × 3 | 206.40 | 96.8 % |
| 2 | CITA-20 | 6500 | 1 | 334 | 6160.34 | 5.2 % |
| 3 | KANAT-70 | 6000 | 2 | 1433 × 2, 454 × 2 | 2203.37 each | 63.3 % |
| 4 | KASA-70 | 6000 | 1 | 1503 × 2, 1003 × 2 | 965.37 | 83.9 % |
| 5 | ORTA-KAYIT-70 | 6500 | 1 | **1416 × 4** | 820.00 | 87.4 % |

Every bar except the ORTA bar reproduces the original 1B topology exactly. This is **not** the Fresh A topology, which split KANAT into verticals-only (remaining 245.4) and horizontals-only (remaining 4161.4). No repeatability claim follows from either observation: Fresh A and RUN_A were solved against different warehouse states.

#### Machine export

`MachineExportRecord RunId=9, Machine=DC-600` wrote **13 pieces** (8 KANAT + 4 KASA + 1 ORTA). The eight CITA-20 glazing beads are excluded from DC-600 export; Fresh A also exported 13, so this is consistent behaviour and not a RUN_A defect.

The post-export **Stock Update** dialog was answered **No**. No warehouse write occurred.

---

## OVERPRODUCTION_BEYOND_REQUIRED_QUANTITY — observed on RUN_A, reproduced in RUN_B

The RUN_A cutting plan cuts **24 pieces where the design requires 21**.

| Piece | Required | Cut by plan | Surplus | Surplus length |
|-------|----------|-------------|---------|----------------|
| ORTA-KAYIT-70 1416 mm mullion, 90°/90° | **1** | **4** | 3 | **4248 mm** |

Confirmed three independent ways:

1. **Arithmetic** — plan consumes 24 812 mm of piece length against 20 564 mm required; 24 812 / 37 500 = 66.2 %, matching DoWin's own reported yield exactly.
2. **Visual** — the ORTA bar strip renders `1416 | 1416 | 1416 | 1416 | Remaining Piece` in the same frame as *Required Parts Quantity: 1*.
3. **DoWin's own diagnostic** — the DC-600 export emitted `3 piece(s) in the optimization plan could not be matched to the detailed production list`.

### Why this matters, and where it stops

The surplus is confined to the **cutting plan**. The machine file is unaffected: the DC-600 export wrote 13 pieces and silently dropped the 3 unmatched mullions. So this is not a "machine will cut wrong parts" defect on this path.

The real consequence is **material accounting**. The plan reports 820 mm remaining on the ORTA bar. Producing the one required mullion leaves 5080 mm. The plan therefore understates reusable material by **4260 mm** (3 × 1416 mm + 3 × 4 mm saw kerf). With the observed Reusable Offcut minimum of 500 mm, a 5080 mm remainder is reusable and an 820 mm remainder is also reusable but worth far less — so any *Add Offcuts to Stock* decision taken from this plan is wrong by 4260 mm.

It also means **yield is not comparable across runs**. RUN_A's 66.2 % against Fresh A's 54.8 %, and the offcut drop from 16 819 mm to 12 559 mm, are artifacts of surplus being counted as output. They are **not** evidence of better packing.

### What is not claimed

- **Not** proven to be caused by ORTA quantity rising from 0 to 100. That is the most obvious candidate — the solver is logged as `Maliyet ve Stok Limiti Odaklı` (cost- and stock-limit-driven) and V2 removed the ORTA stock limit — but one run cannot establish causation. Testing it would require deliberately changing stock, which the FP-024C.3 protocol forbids.
- **Not** proven to be reproducible. It may or may not appear in RUN_B and RUN_C.
- **Not** proven to affect any other profile. Only the ORTA mullion over-produced.

---

## DoWin solver internals (observed, not proven deterministic)

The RUN_A log exposes the solve pipeline for the first time:

```
HİBRİT Column Generation Loop (High-Performance Modu)
Tamsayılı Çözücü (MIP Solver) — Maliyet ve Stok Limiti Odaklı  → OPTIMAL
TAVLAMA BENZETİMİ (simulated annealing), MaxIter 210/220, Sıcaklık 100
```

Simulated annealing is a **stochastic metaheuristic**. This is the first concrete mechanism by which DoWin could legitimately return different topologies for identical inputs. No seed is logged and no determinism guarantee is documented, so whether DoWin seeds it reproducibly is **UNPROVEN** — and that is precisely what the controlled triplicate is designed to answer.

RUN_A logged a **fourth** MIP stage at `Toplam Maliyet: 6.50` that is absent from both Fresh A and the stray Id=8 run. Recorded as an observation only.

### FP024C3_RUN_B — MEASURED

| Axis | Value |
|------|-------|
| Project / design / plan identity | Project Id=4 `FP024C3_RUN_B` (No 100004, OrderNo 10004) / Design Id=6 `RUN_B` / Plan Id=4 `RUN_B_PLAN` ItemCount=1 |
| `optimizationResultId` | `OptimizationRun_10_343040d6` |
| `solveDisposition` | `NEWLY_SOLVED` — solved 01:42:08 +03; `önceki sonuçlar temizlendi` confirms no inherited state |
| Settings screenshot SHA-256 | `8597b36c1dba0e0d21113597bdeaba6e0a09d5d8eb0c83dcd3b09b8c3c92a3ae` — **new capture**, byte-identical render to RUN_A |
| Required-parts list | 21 cuttable rows / 20 564 mm — all 21 rows visually measured, **IDENTICAL** to RUN_A |
| Optimizer Stock Items | same 7 SKUs mirroring V2, ORTA 6500 qty **100** |
| Optimizer Required Parts view | ORTA qty **1** — the surplus does not originate in the input |
| Offcut / remnant surface | **UNPROVEN** (no remnant source row exposed) |
| Machine | DC-600 double head cutting machine; DC-550 SKH globally enabled |
| Artifact hashes | Design Preview `c3626e4b…` / Labels `2ee33658…` / Optimization `4c908def…` / DC-600 `.dw` `25734a04…` |
| Pre-run stock check | **PASS** — live re-read after panel reload (`SERVICE_INIT` 01:25:37), byte-identical to V2 |
| Post-export stock check | **PASS** — byte-identical to V2 after a full DoWin restart (session `a1377777268a`) |
| Stock Update modal | **SHOWN**; response **NO** |
| Warehouse immutability | **IMMUTABLE_VERIFIED** — UI authoritative + zero `ExecuteStockUpdateCoreAsync` lines |

Reported result: yield **66.2 %**, 6 stock bars, **4 patterns**, **0 unplaced**, total offcut **12 559 mm**.

#### Measured topology

| Bar | Profile | Stock | Applications | Packed segments, in shown order (mm) | Remaining (mm) | Yield |
|-----|---------|-------|--------------|--------------------------------------|----------------|-------|
| 1 | CITA-20 | 6500 | **2** | 1313, 1313, 334, 334 | **3183.37** each | 51.0 % |
| 2 | KANAT-70 | 6000 | 2 | 454, 454, 1433, 1433 | 2203.37 each | 63.3 % |
| 3 | KASA-70 | 6000 | 1 | 1503, 1503, 1003, 1003 | 965.37 | 83.9 % |
| 4 | ORTA-KAYIT-70 | 6500 | 1 | **1416, 1416, 1416, 1416** | 820.00 | 87.4 % |

6 bars, 24 pieces, 24 812 mm used, 12 558.85 mm remainder — every figure reconciles with the reported totals.

#### Machine export

`MachineExportRecord RunId=10, Machine=DC-600` wrote **13 pieces**, with the identical warning `3 piece(s) in the optimization plan could not be matched to the detailed production list.` The machine-export behaviour also reproduced.

---

## A ↔ B comparison

### Input equivalence

| Axis | Verdict | Basis |
|------|---------|-------|
| Geometry | **IDENTICAL** | 1000×1500, Deceuninck 70 (Id 1), `DESIGN_VALIDATION VALID` in both |
| Required parts | **IDENTICAL** | 21 rows, every length / angle / quantity, 20 564 mm total, all rows measured |
| Settings | **IDENTICAL** | new capture per run; both render to `8597b36c…`, i.e. pixel-level equality |
| Machine | **IDENTICAL** | DC-600 selected; DC-550 SKH enabled in both |
| Optimizer stock | **IDENTICAL** | same 7 SKUs, same order, same quantities |
| Warehouse stock | **IDENTICAL** | both `c8626da5…` = baseline V2 |
| Offcut / remnant | **UNPROVEN** | no evidence surface in either run |
| Freshness | **IDENTICAL** | both `NEWLY_SOLVED`, new project/design/plan/result |

`MEASURED_INPUT_EQUIVALENCE = IDENTICAL`. `COMPLETE_INPUT_EQUIVALENCE = UNPROVEN`, because the offcut/remnant axis has no evidence surface. Complete equivalence is **not** upgraded.

### Output comparison

| # | Axis | Verdict |
|---|------|---------|
| 1 | Nominal lengths | **IDENTICAL** |
| 2 | Packed lengths | **IDENTICAL** |
| 3 | Machine lengths | **IDENTICAL** — `Table1` read directly from both `.dw` files: 13 rows matching field-for-field, including `BAR_NO`/`PICE_NO` order, `LENGTH`, angles, `FRAME_X/Y`, `TOTAL_SIZE`, `REMAINING_LENGTH` |
| 4 | Required-piece count | **IDENTICAL** — 21 = 21 |
| 5 | Optimization-plan piece count | **IDENTICAL** — 24 = 24 |
| 6 | Surplus signature | **IDENTICAL** — 3 × ORTA 1416 mm = 4248 mm in both |
| 7 | Bar-assignment topology | **DIVERGENT** — `CONTENT_DIVERGENT` on CITA-20 |
| 8 | Remainder distribution | **DIVERGENT on CITA**; identical elsewhere; totals equal |
| 9 | Machine export represented pieces | **IDENTICAL** — 13 = 13, same warning text |
| 10 | Stock immutability | **IDENTICAL** — `IMMUTABLE_VERIFIED` in both |

Note the deliberate omission: **total utilization is not used as evidence of equality.** It would have concealed finding 7 entirely.

### The divergence, precisely

| | RUN_A | RUN_B |
|---|-------|-------|
| CITA bar 1 | 1313×4 + 334×3, remaining **206.40** | 1313×2 + 334×2, remaining **3183.37** |
| CITA bar 2 | 334×1, remaining **6160.34** | 1313×2 + 334×2, remaining **3183.37** |
| CITA patterns | 2 distinct | 1 pattern × 2 |
| Plan patterns | 5 | 4 |
| CITA total remainder | 6366.74 | 6366.74 |
| Total offcut | 12 559 mm | 12 559 mm |
| Overall yield | 66.2 % | 66.2 % |

Same eight glazing beads, same two 6500 mm bars, exactly the same total remainder — distributed differently. RUN_A concentrated the beads into one nearly-full bar plus one nearly-empty bar; RUN_B split them evenly.

**These are not economically equivalent.** RUN_A yields one 6160 mm offcut, reusable and long enough to host another full bead set, plus a 206 mm piece that falls below the 500 mm minimum and is therefore scrap. RUN_B yields two 3183 mm offcuts, both above the minimum but neither able to host a full bead set. Identical yield, materially different value.

### Where the divergence arose

The MIP stages were identical in both runs, stage for stage:

| Stage | Cost | Stock / layouts | Annealing | Profile (by unit price) |
|-------|------|-----------------|-----------|------------------------|
| 1 | 6000.00 | 1 / 1 | MaxIter 210, T 100 | KASA-70 (6 m × 1000) |
| 2 | 6.50 | 1 / 1 | MaxIter 210, T 100 | ORTA-KAYIT-70 |
| 3 | 18000.00 | 2 / 2 | MaxIter 220, T 100 | KANAT-70 (2 × 6 m × 1500) |
| 4 | 6500.00 | 2 / 2 | MaxIter 220, T 100 | CITA-20 (2 × 6.5 m × 500) |

Both runs allocated **two** CITA bars at the same cost. The divergence is therefore **not** in the MIP allocation but in the intra-bar assignment produced afterwards — which is exactly where `TAVLAMA BENZETİMİ` (simulated annealing) operates. KANAT also received two bars and packed identically in both runs, so the instability is not simply "any profile allocated two bars".

### What is NOT claimed

- **Not** `OPTIMIZER_NONDETERMINISM`. Two runs cannot support that; RUN_C is required. Recorded as `NONREPEATABLE_OBSERVATION_PENDING_RUN_C`. *(Correct as written after RUN_B. Superseded by the triplicate verdict below, which is `NONREPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS` — still not `OPTIMIZER_NONDETERMINISM`.)*
- **Not** attributable to the annealing seed. No seed is logged. Simulated annealing is a *plausible mechanism*, not a demonstrated cause.
- **Not** a claim that either plan is "correct". Both are valid solver outputs of equal reported yield.
- **Not** full determinism in either direction — the offcut/remnant axis stays `UNPROVEN`.

---

## Bar-sequence measurement limitation (RUN_A) — RESOLVED by RUN_C

*Recorded after RUN_B, resolved after RUN_C. Retained for the audit trail.*

Only the CITA and ORTA bar strips were captured for RUN_A, so the within-bar strip order for its KANAT and KASA bars was never measured; the recorded order came from the asdd baseline convention. After RUN_B this was carried as an open limitation, since RUN_B showed DoWin uses no single rendering convention.

RUN_C resolves it: the strip order is **presentation only** and is not the machine cut sequence — see *The bar layout strip is not the machine cut sequence* below. An uncaptured strip order therefore cannot affect any verdict, and this limitation is closed rather than merely mitigated.

The bar *contents* were in any case fixed by unique arithmetic: 4 pieces totalling 3774 mm drawn from {454, 1433} admits only {1433, 1433, 454, 454}, and 5012 mm from {1003, 1503} admits only {1503, 1503, 1003, 1003}.

---

## Correction to the RUN_A over-production finding

RUN_A's write-up said the surplus was "confined to the cutting plan" and that "the machine file is unaffected". Reading `Table1` directly from both `.dw` files corrects this:

- The exported **piece list** is unaffected — one 1416 mm mullion, correctly, in both runs.
- The **`REMAINING_LENGTH` field is affected** — the ORTA row carries `8200` (820.0 mm) in both files, when cutting one mullion actually leaves 5080 mm.

So the 4260 mm misstatement does reach the machine file. The DC-600 does not cut from that field, so there is still no wrong-parts risk on this path, but any downstream offcut tracking that reads `REMAINING_LENGTH` inherits the error. The original claim was too narrow.

---

### FP024C3_RUN_C — MEASURED

| Axis | Value |
|------|-------|
| Project / design / plan identity | Project Id=5 `FP024C3_RUN_C` (No 100005, CustomerCode 1000005, OrderNo 10005) / Design Id=7 `RUN_C` / Plan Id=5 `RUN_C_PLAN` ItemCount=1 |
| `optimizationResultId` | `OptimizationRun_11_5efde5d4` |
| `solveDisposition` | `NEWLY_SOLVED` — solved 15:14:48 +03; `önceki sonuçlar temizlendi` confirms no inherited state |
| Settings screenshot SHA-256 | `8597b36c1dba0e0d21113597bdeaba6e0a09d5d8eb0c83dcd3b09b8c3c92a3ae` — **new post-restart capture** (`runC-settings-20260913-145945`) |
| Required-parts list | 21 rows / 20 564 mm — all 21 rows measured, **IDENTICAL** to A and B |
| Optimizer Stock Items | 7 SKUs in the same ordinal order mirroring V2; captures byte-identical to A and B |
| Optimizer Required Parts view | ORTA qty **1** — the surplus does not originate in the input |
| Offcut / remnant surface | **UNPROVEN** — solver Stock Items shows whole bars only; `Add Offcuts to Stock` greyed pre-solve |
| Machine | DC-600 double head cutting machine; DC-550 SKH globally enabled = **yes** |
| Artifact hashes | Cut list `cf30d6b2…` / `fbcf1947…` / `a5429416…` · Optimizer stock `22dbf885…` / `4dc06de6…` · Result `55fd5937…` · DC-600 `.dw` `fc244acb…` |
| Bar-strip hashes | CITA-1pc `467283ab…` · KANAT `e6eae6b0…` · KASA `4ebd1ac3…` · ORTA `4574b49e…` |
| Pre-run stock check | **PASS** — `c8626da5…`, byte-identical to V2, all seven cards re-verified visually |
| Post-export stock check | **PASS** — `c8626da5…`, live re-read (`SERVICE_INIT` 15:32:18, new hwnd) |
| Stock Update modal | **SHOWN**; response **NO** |
| Warehouse immutability | **IMMUTABLE_VERIFIED** |

Reported result: yield **66.2 %**, 6 stock bars, **5 patterns**, **0 unplaced**, total offcut **12 559 mm**, duration 0.57 s.

RUN_C carries the strongest pre-run liveness of the triplicate: baseline V2 survived a ~13 hour gap and **two** full application restarts (sessions `dd38bbb2fcf2` at 14:50:52 and `927e98bb02f6` at 14:58:12) and still rendered byte-identical, re-read live with a fresh `RawMaterialsViewModel` load on a new window handle.

#### Measured topology — every strip captured

| Bar | Profile | Stock | Applications | Packed segments, strip order (mm) | Used | Remaining | Yield |
|-----|---------|-------|--------------|-----------------------------------|------|-----------|-------|
| 1 | CITA-20 | 6500 | 1 | 1313, 1313, 1313, 1313, 334, 334, 334 | 6254.00 | **206.40** | 96.8 % |
| 2 | CITA-20 | 6500 | 1 | 334 | 334.00 | **6160.34** | 5.2 % |
| 3 | KANAT-70 | 6000 | 2 | 1433, 1433, 454, 454 | 3774.00 | 2203.37 | 63.3 % |
| 4 | KASA-70 | 6000 | 1 | 1503, 1503, 1003, 1003 | 5012.00 | 965.37 | 83.9 % |
| 5 | ORTA-KAYIT-70 | 6500 | 1 | 1416, 1416, 1416, 1416 | 5664.00 | 820.00 | 87.4 % |

6 bars, 24 pieces, 24 812 mm used, 12 558.85 mm remaining — reconciles with the reported totals. Unlike RUN_A, **all five strips were captured**, including KANAT and KASA.

#### Solver-stage trace (Step 11)

All four MIP stages are identical across **all three** runs — same stock counts, same layout counts, same objective costs, same annealing parameters, all `OPTIMAL`:

| Stage | Cost | Stock / layouts | Annealing | Profile (by unit price) |
|-------|------|-----------------|-----------|------------------------|
| 1 | 6000.00 | 1 / 1 | MaxIter 210, T 100 | KASA-70 (6 m × 1000) |
| 2 | 6.50 | 1 / 1 | MaxIter 210, T 100 | ORTA-KAYIT-70 |
| 3 | 18000.00 | 2 / 2 | MaxIter 220, T 100 | KANAT-70 (2 × 6 m × 1500) |
| 4 | 6500.00 | 2 / 2 | MaxIter 220, T 100 | CITA-20 (2 × 6.5 m × 500) |

Every run allocated **two** CITA bars at the same cost, then produced different intra-bar groupings (A and C: 7 + 1; B: 4 + 4).

`DIVERGENCE_LOCALIZED_AFTER_BAR_COUNT_ALLOCATION = SUPPORTED`. Not `PROVEN`: the logs show the allocation and the annealing invocation, but they do not expose the assignment step's internal state, so the localisation is inferred from identical allocations plus differing outcomes rather than demonstrated directly.

No seed is logged in any run.

---

## Correction — RUN_A CITA bar 1 remainder was misread

RUN_A's first CITA bar was recorded as remaining **206.43**. During RUN_C the same cell read **206.40**, so the original RUN_A capture was re-magnified: it also reads **206.40**. The cell sits under the row-selection highlight in both runs, and the first transcription was made without magnifying it.

| Value | As committed | Corrected |
|-------|--------------|-----------|
| RUN_A CITA bar 1 remainder | 206.43 | **206.40** |
| RUN_A CITA total remainder | 6366.77 | **6366.74** |
| RUN_A total remainder | 12 558.88 | **12 558.85** |

Consequences:

- All three runs share **exactly** 12 558.85 mm total remainder and **exactly** 6366.74 mm CITA remainder. The 0.03 mm A/B gap previously reported never existed.
- The A↔B divergence is unaffected — it rests on grouping, bar count and per-bar remainders, not on a hundredth of a millimetre. Exactly equal totals make the "same utilization ≠ same topology" point stronger.
- This is a correction of a measurement transcription, evidenced by re-reading the original RUN_A artifact. No RUN_A verdict changed.

---

## The bar layout strip is not the machine cut sequence

RUN_C settles a question left open after RUN_B. Its KANAT strip renders **1433, 1433, 454, 454**, while the same run's DC-600 `Table1` carries `PICE_NO` order **454, 454, 1433, 1433** — the same machine order as RUN_A and RUN_B. RUN_B's strip had rendered 454-first.

So the on-screen strip order is presentation only. It is not stable between runs that emit identical machine files, and it is not what the saw receives.

Consequences, recorded as `DOWIN_BAR_STRIP_ORDER_IS_NOT_MACHINE_ORDER`:

- A strip-order difference is **not** evidence of a topology divergence.
- RUN_A's uncaptured KANAT/KASA strip order is **immaterial**; the gap noted after RUN_B cannot affect any verdict.
- Cross-run topology comparison uses contents, remainders and grouping (`barSequenceFingerprint` / `barContentFingerprint`); the authoritative sequence comes from the machine file, which is captured and identical for all three runs.

A second, separate correction follows from this: `topologyFingerprint` embeds run-scoped piece ids (`RUN_A.Frame Leftt` versus `RUN_C.Frame Leftt`), so it can never match across runs and must not be used to compare them — it separates even A from C, which are geometrically identical. Cross-run counting in `classifyControlledRepeatability` now uses the geometry-only fingerprint.

---

## Three-way input equivalence (Step 17)

| Axis | A↔B | A↔C | B↔C | Basis |
|------|-----|-----|-----|-------|
| geometry | IDENTICAL | IDENTICAL | IDENTICAL | 1000×1500, Deceuninck 70 (Id 1), `DESIGN_VALIDATION VALID` in all three |
| required parts | IDENTICAL | IDENTICAL | IDENTICAL | 21 rows / 20 564 mm, every length, angle and quantity measured per run |
| settings | IDENTICAL | IDENTICAL | IDENTICAL | three independent captures, all rendering to `8597b36c…` |
| machine | IDENTICAL | IDENTICAL | IDENTICAL | DC-600 selected; DC-550 SKH enabled |
| optimizer stock | IDENTICAL | IDENTICAL | IDENTICAL | same 7 SKUs, same ordinals, same quantities |
| warehouse stock | IDENTICAL | IDENTICAL | IDENTICAL | all `c8626da5…` = baseline V2, before and after each run |
| offcut / remnant | **UNPROVEN** | **UNPROVEN** | **UNPROVEN** | no evidence surface in any run |
| freshness | IDENTICAL | IDENTICAL | IDENTICAL | all `NEWLY_SOLVED`, new project/design/plan/result each time |

`MEASURED_INPUT_EQUIVALENCE = IDENTICAL` on all three pairs.

`COMPLETE_INPUT_EQUIVALENCE = UNPROVEN` on all three pairs, because the offcut/remnant axis has no evidence surface. This is **not** upgraded, and it is what caps the final verdict.

### A note on the settings axis

All three settings captures share one content hash. A content hash cannot distinguish *one screenshot cited three times* from *three independent captures of an unchanged page*, and the classifier previously failed both cases closed to `UNPROVEN`. A `settingsCaptureId` axis was added to separate them: distinct capture identities with an identical hash is pixel-level proof of equality; a shared or absent capture identity still fails closed. RUN_C's capture was taken after a full application restart on a new window handle, so its independence is not in doubt.

---

## Three-way topology matrix (Step 18)

| Pair | Verdict |
|------|---------|
| A vs B | **CONTENT_DIVERGENT** |
| A vs C | **SAME** |
| B vs C | **CONTENT_DIVERGENT** |

Profile-wise:

| Profile | A vs B | A vs C | B vs C |
|---------|--------|--------|--------|
| CITA-20 | **DIFFERENT** | SAME | **DIFFERENT** |
| KANAT-70 | SAME | SAME | SAME |
| KASA-70 | SAME | SAME | SAME |
| ORTA-KAYIT-70 | SAME | SAME | SAME |

Every divergence is confined to CITA-20. No axis is recorded as `ORDER_ONLY_DIFFERENCE`, because strip order has been shown to carry no information; RUN_A's incomplete strip capture is therefore not a gap in this matrix.

### The two topologies

| | Topology X (RUN_A, RUN_C) | Topology Y (RUN_B) |
|---|---|---|
| CITA bar 1 | 1313×4 + 334×3, remaining **206.40** | 1313×2 + 334×2, remaining **3183.37** |
| CITA bar 2 | 334×1, remaining **6160.34** | 1313×2 + 334×2, remaining **3183.37** |
| CITA patterns | 2 distinct | 1 pattern × 2 |
| Plan patterns | 5 | 4 |
| CITA total remainder | 6366.74 | 6366.74 |
| Total remainder | 12 558.85 | 12 558.85 |
| Total used | 24 812 mm | 24 812 mm |
| Overall yield | 66.2 % | 66.2 % |

Observed distribution over three controlled fresh solves: **X / Y / X**.

Utilization, bar count, total used length and total remainder are *exactly* equal between the two topologies. Nothing in the summary figures distinguishes them.

**They are not economically equivalent.** Topology X leaves one 6160 mm offcut — reusable, and long enough to host another full bead set — plus a 206 mm piece below the 500 mm minimum, which is scrap. Topology Y leaves two 3183 mm offcuts, both above the minimum but neither able to host a full bead set. Same yield, materially different reuse value.

### Interpretation (Steps 19–22)

RUN_C matching RUN_A does **not** demote RUN_B to an anomaly. A and B had already produced two different outcomes under measured-identical inputs; a third solve reproducing one of them does not retract the second. Nor is X the "correct" topology by virtue of occurring twice — frequency over three samples is not a correctness argument, and both are valid solver outputs of equal reported yield.

No input difference was discovered that would invalidate RUN_B's divergence. Had one been found, the classification would have followed that concrete difference instead.

---

## Repeatability verdict

```text
FP-024C.3 = NONREPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS

runCount:                     3
uniqueTopologyCount:          2
MEASURED_INPUT_EQUIVALENCE:   IDENTICAL
COMPLETE_INPUT_EQUIVALENCE:   UNPROVEN
warehouse immutability:       IMMUTABLE_VERIFIED (all three)
fullDeterminismClaimAllowed:  false
```

**Not** `OPTIMIZER_NONDETERMINISM_OR_TIE_BREAKING`. That classification requires every relevant optimizer-input axis to be proven equivalent, and the offcut/remnant axis is `UNPROVEN`. The classifier gates it behind `COMPLETE_INPUT_EQUIVALENCE === 'IDENTICAL'` and therefore cannot reach it from this evidence.

Stochastic mechanism authority: **`POSSIBLE_NONDETERMINISTIC_MECHANISM`**. Simulated annealing is present, it operates exactly where the divergence is localised, and no seed is exposed. That makes a stochastic cause plausible and consistent with the evidence — it does not make it proven. Architecture plus three runs is not causal proof, and an unobserved input difference remains a live alternative explanation precisely because one input axis is unproven.

---

## Required-parts conservation (Step 23)

All three runs:

| | Required | Optimization plan | Surplus |
|---|---|---|---|
| Pieces | 21 | 24 | +3 |
| ORTA-KAYIT-70 1416 mm | 1 | 4 | +3 (4248 mm) |

Identical surplus signature in every run, with the identical DoWin warning `3 piece(s) in the optimization plan could not be matched to the detailed production list.`

```text
OPTIMIZATION_REQUIRED_PARTS_CONSERVATION_VIOLATION
  = REPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS
```

This is the sharpest contrast in the triplicate: the surplus is perfectly repeatable while the bar assignment is not.

The +3 ORTA surplus is repeatable across all three measured-identical runs and is **not correlated** with the observed stochastic CITA topology variation. Evidence therefore supports a deterministic or upstream conservation defect, but root cause remains **UNPROVEN**.

That wording is deliberate and replaces an earlier overclaim in this document. Three identical surplus outcomes make a stochastic explanation unsupported and increasingly unlikely; they do not mathematically rule it out. A stochastic mechanism whose output distribution is degenerate over the sampled region, or one sampled three times at the same point, would produce the same observation. Three samples do not exclude that.

The ORTA stock limit lifting from 0 to 100 remains a candidate given the cost-and-stock-limit solver, but testing it requires changing stock, which this protocol forbids.

Next gate: **FP-027 — Optimization Required-Parts Conservation Forensics** — opened as a forensic gate, deliberately **NOT FIXED**. See `docs/audits/FP-027-REQUIRED-PARTS-CONSERVATION-FORENSICS_2026-09-13.md`.

---

## Machine remainder propagation (Step 24)

`Table1` was read directly from all three `.dw` files and compared column by column. Of 39 columns, the only differences across A/B/C are `CUSTOMER_CODE`, `ORDER_NO`, `EXPLANATION2` (project name and timestamp) and `IMAGE` (label bitmap). Every measured field matches exactly, including `BAR_NO`/`PICE_NO` order, `LENGTH`, both angles, `TOTAL_SIZE`, `FRAME_X`/`FRAME_Y` and `REMAINING_LENGTH`.

`A_B_C_MACHINE_LENGTH_LAYER = IDENTICAL`.

The ORTA row carries `REMAINING_LENGTH` `8200` → **820.0 mm** in all three files, against one physically required mullion; the correct physical remainder would be roughly 5080 mm. This was measured in each file, not assumed to repeat.

```text
SURPLUS_PLAN_REMAINDER_PROPAGATES_TO_MACHINE_OUTPUT
  = REPEATABLE_OBSERVATION
```

The exported **piece list** is correct — one mullion — so there is no wrong-parts risk on this path, and the DC-600 does not cut from `REMAINING_LENGTH`. But any downstream offcut tracking that reads that field inherits a ~4260 mm misstatement. Machine export is **not** changed.

---

### FP024C3_RUN_C — closed

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

## ORTA quantity 0 — observability lost

```
ORTA_ZERO_QTY_CONTROL_OBSERVABILITY = LOST_BY_MANUAL_STOCK_EDIT
```

On Fresh A the optimizer packed one 6500 ORTA bar while the warehouse carried ORTA at quantity 0 — recorded as `WAREHOUSE_QTY_VS_OPTIMIZER_AVAILABILITY_DISCREPANCY` via `observeWarehouseQtyVsOptimizerAvailability`. The anomaly is only visible while ORTA sits at 0, so the manual edit to 100 removed it from the active baseline.

| Baseline | Observation with the Fresh A bar set |
|----------|--------------------------------------|
| V1 (ORTA 0) | `WAREHOUSE_QTY_VS_OPTIMIZER_AVAILABILITY_DISCREPANCY` — historical only |
| V2 (ORTA 100) | `NOT_OBSERVED` — not retestable |

This side observation is **historical evidence only** and cannot be reproduced under V2. It must not be recreated by hand: ORTA is not to be set back to 0 and is not to be artificially decremented. If ORTA ever returns to 0 through genuine consumption, the observable returns with it.

This is **not** a blocker for the controlled repeatability experiment. It removes one side observation and nothing else. It also remains **not** a product defect without a separate audit.

---

## Tests

| Check | Result |
|-------|--------|
| `npm run type-check` | **Pass** (`tsc --noEmit`) |
| `npx vitest run src/tests/fabricator/dowinCompensationReconciliation.test.ts` | **Pass** — 18 tests |
| `npx vitest run src/tests/fabricator/dowinOptimizationStateProvenance.test.ts` | **Pass** — 50 tests (28 FP-024C.3 cases) |
| `npx vitest run src/tests/fabricator/dowinPhysicalLengthGolden.pending.test.ts` | **Pass** — 20 tests |
| `npx vitest run src/tests/constitutional/ManufacturingSettingsContract.test.ts` | **Pass** — 15 tests |
| Combined (4 protocol suites) | **93 tests passed** |
| `npx vitest run src/tests/constitutional src/tests/fabricator` | **Pass** — 18 files, **243 tests** |
| `npm run build` | **Pass** (`vite build --mode production`) |

FP-024C.3 coverage: frozen baseline values; postcheck PASS / mutated / partial / remnant-row-added / uncaptured; catalog slots pending and 90° gate closed; refusal to claim repeatability from A or A+B; measured repeatability separated from full determinism; no nondeterminism overclaim while offcuts are unproven; stop on stock movement or warehouse write; reused settings hash and reused result rejected; `HIDDEN_INPUT_DIFFERENCE` on a concrete optimizer-stock difference; fixture-signature match / drift / unproven; ORTA availability observation; and a no-mutation assertion on `resolveManufacturingSettings`.

Re-baseline coverage added 13 September 2026:

| Test | Proves |
|------|--------|
| baseline V2 is active with ORTA 100 | `FP024C3_FROZEN_WAREHOUSE_BASELINE` aliases V2; `FP024C3_ACTIVE_BASELINE_VERSION === 2` |
| V1 and V2 are distinct | different reasons, different source hashes, ORTA is the **sole** delta, and cross-comparison is `STOCK_STATE_MUTATED` in both directions |
| RUN_A cannot claim equivalence to V1 | `evaluateBaselineEquivalenceClaim(1)` is `REJECTED_BASELINE_SUPERSEDED`; intake rejects a V1 run; classification returns `BASELINE_SUPERSEDED` |
| exact V2 snapshot passes the pre-run gate | `PASS`, and ORTA 100 is the accepted controlled value |
| any later delta fails the run | ORTA ±1 and a KASA consumption of −1 all return `STOCK_STATE_MUTATED` |

RUN_C ingest coverage added 13 September 2026:

| Test | Proves |
|------|--------|
| the triplicate is complete with three distinct solves | all three runs `MEASURED` and `NEWLY_SOLVED`; three distinct `optimizationResultId` and three distinct project ids; `isFp024c3ControlledTriplicateComplete()` true — and the 90° control is **still** not authorized by completion alone |
| the triplicate is nonrepeatable without overclaim | `compareBarTopology(A, C)` is `IDENTICAL` while `B↔C` is `CONTENT_DIVERGENT` naming CITA-20 and not KANAT; two topologies over three solves; utilization, total stock and total remainder equal across all three; verdict is `NONREPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS`, explicitly **not** `OPTIMIZER_NONDETERMINISM_OR_TIE_BREAKING`; `completeInputEquivalence` `UNPROVEN`; `fullDeterminismClaimAllowed` false; all three `IMMUTABLE_VERIFIED` |
| conservation is violated in all three runs | 24 produced against 21 required in every run with a byte-identical surplus row of 3 × 1416 mm = 4248 mm |
| strip order is not a topology axis | `DOWIN_BAR_STRIP_ORDER_IS_NOT_MACHINE_ORDER` is `PROVEN_BY_DIRECT_COMPARISON`; reversing every segment yields `ORDER_ONLY_DIFFERENCE`; the B/C divergence survives an order-insensitive fingerprint while A and C match under it |
| run identities never collide | per-run project ids 100003 / 100004 / 100005; A and C share a geometry fingerprint while B differs; `topologyFingerprint` separates even A from C, proving it is unusable across runs |
| independent captures are not mistaken for reuse | three distinct `settingsCaptureId` values with one shared content hash yield `IDENTICAL`; dropping the capture ids, or sharing one, falls back to `UNPROVEN` |
| log silence cannot override a UI mismatch | UI mismatch with a silent log is still `STOCK_STATE_MUTATED`; a logged write is a mutation even when quantities match; an observed manual card edit is a mutation regardless of the log |
| both sources are required to proceed | UI match with an unreviewed log is `UNPROVEN`; UI match plus reviewed silent log is `IMMUTABLE_VERIFIED` and permits the triplicate to classify |
| ORTA-0 observation is historical only | discrepancy under V1, `NOT_OBSERVED` under V2 |

RUN_A ingest coverage added 13 September 2026:

| Test | Proves |
|------|--------|
| RUN_A measured, RUN_B/C pending | RUN_A carries 5 bars and `NEWLY_SOLVED` provenance; RUN_B/C keep empty bars and null provenance; triplicate incomplete; 90° still gated; a single run still classifies as `CONTROLLED_REPEATABILITY_IN_PROGRESS` |
| RUN_A stays out of the FP-024C.1 comparison | Fresh A vs RUN_A optimizer inputs are `DIFFERENT`, and `classifyProvenanceFreshStateExperiment` no longer degrades to `HIDDEN_INPUT_DIFFERENCE` from a cross-baseline pairing |
| over-production is measured, not asserted | `observeOverproductionBeyondRequired` derives 24 produced vs 21 required and a single surplus row of 3 × 1416 mm = 4248 mm from the bars themselves; Fresh A returns `NOT_OBSERVED`; missing inputs return `UNPROVEN` |
| the stock-write trigger is not overclaimed | the dialog finding stays `SUPPORTED_BY_CONTROLLED_COMPARISON` with the inferred Fresh A "Yes" recorded as a limitation; solver stages record no seed and no documented determinism |

RUN_B ingest coverage added 13 September 2026:

| Test | Proves |
|------|--------|
| RUN_A and RUN_B measured, RUN_C pending | RUN_B carries 4 bars and `NEWLY_SOLVED` provenance under project 100004; its `optimizationResultId` differs from RUN_A's; only RUN_C remains pending; triplicate incomplete; 90° still gated; two runs still classify as `CONTROLLED_REPEATABILITY_IN_PROGRESS` |
| the A/B divergence is real, not an artifact | total stock, overall utilization and total remainder are equal across A and B, yet `compareBarTopology` returns `CONTENT_DIVERGENT` naming CITA-20 and **not** KASA-70; `assignmentSignaturesEqual` is false |
| unmeasured ordering cannot fake a divergence | reversing every segment order returns `ORDER_ONLY_DIFFERENCE`, `barContentFingerprint` is unchanged, and a missing bar set returns `UNPROVEN` |
| the surplus reproduced identically | `observeOverproductionBeyondRequired` on RUN_B yields 24 produced vs 21 required with a surplus row equal to RUN_A's, 3 × 1416 mm = 4248 mm |

---

## Formula freeze verification

No diff in `ManufacturingSettings.ts`, `barPackAccounting.ts`, `UPVCCuttingEngine.ts`, `src/lib/fabricator/production`, K-factor, Cut identity, CNC lengths, or `physicalCutAssignmentKey`.

Changes are confined to:

| Path | Role |
|------|------|
| `src/lib/fabricator/dowinParity/optimizerStateProvenance.ts` | FP-024C.3 baselines V1/V2, postcheck, two-source immutability check, equivalence matrix, classifier, fixture-signature gate, intake gate |
| `src/lib/fabricator/dowinParity/dowinCompensationEvidence.ts` | full A/B/C ingest, re-exports, FP-024C.1 classifier scoped away from controlled runs, 90° gate now also requires the controlled triplicate |
| `src/tests/fabricator/dowinOptimizationStateProvenance.test.ts` | FP-024C.3 test block |
| `src/tests/fabricator/dowinCompensationReconciliation.test.ts` | catalog counts 10 → 13, pending 3 → 6 → 3 as the triplicate was ingested |
| `docs/audits/*` | this audit, the FP-024C.2 correction, and the FP-024C.1 update |

Test 2 authority is unchanged: Welding Waste affects packed/machine KASA/KANAT in the observed `asdd` fixture only. No generalization.

`FP-026 STOCK_COMMIT_BOUNDARY` is preserved as a future finding and **not** implemented. The ALMONA implication stands: solve and export must not silently commit warehouse truth; stock mutation belongs behind an explicit authoritative confirmation.

---

## Licensed-artifact exclusion

Committed: SHA-256 values, transcriptions, structured provenance, fingerprints, classification, tests, audit docs.

Not committed: PDFs, `.dw`, MDB, screenshots, machine binaries. No decompilation. The encrypted shop database was not opened.

---

## Limitations

- **Three of three** controlled runs are measured. The triplicate is complete, and the verdict is `NONREPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS`.
- The topology divergence is **observed but unexplained**. It is confined to CITA-20 intra-bar assignment after an identical MIP allocation in all three runs. Localisation after bar-count allocation is `SUPPORTED`, not `PROVEN` — the logs expose the allocation and the annealing invocation but not the assignment step's internal state.
- **Three samples is a small sample.** Two topologies were seen; nothing here bounds how many exist, nor their relative frequency. `X / Y / X` is an observed sequence, not a distribution.
- The over-production has **no proven cause**. It is repeatable across all three measured-identical runs and is not correlated with the observed stochastic CITA topology variation, which supports a deterministic or upstream conservation defect — but root cause remains `UNPROVEN`. Three identical outcomes make a stochastic explanation unsupported and increasingly unlikely; they do not mathematically exclude it. The ORTA stock limit lifting from 0 to 100 remains a candidate given the cost-and-stock-limit solver, but testing it requires changing stock, which this protocol forbids. Next gate: **FP-027 — Optimization Required-Parts Conservation Forensics**, opened as forensics, not fixed.
- DoWin's solver includes simulated annealing, it operates exactly where the divergence is localised, and no seed is exposed in any run. That makes a stochastic cause plausible and consistent with the evidence. It is **not** proven, and it is not the only candidate: because one input axis is unproven, an unobserved input difference remains a live alternative explanation. Authority stays `POSSIBLE_NONDETERMINISTIC_MECHANISM`.
- The offcut/remnant **inventory** axis has no evidence surface, so complete input equivalence remains `UNPROVEN` after three valid runs — this is precisely what caps the verdict. RUN_C inspected the solver's own Stock Items panel, which is the list it actually consumes, and found whole-bar rows only, with `Add Offcuts to Stock` greyed pre-solve. That is the strongest available statement and it is still not proof of absence: DoWin exposes no remnant surface and no row ids. The offcut **policy** surface is now known (Reusable Offcut Settings, Minimum Offcut Length 500 mm, with *Add Offcuts to Stock* as a separate explicit ribbon action — which explains why the proven 22:17:20 stock write created no remnant rows despite remainders far above 500 mm). Knowing the policy does not prove the inventory is empty; that axis stays `UNPROVEN`.
- The user-visible trigger of the 22:17:20 warehouse write is now **resolved**: the post-export **Stock Update** dialog. Fresh A's `Yes` is inferred from the proven write plus the observed dialog, not directly observed; RUN_A's `No` arm is directly observed. See FP-024C.2.
- The V2 source hash is a pre-run capture. Each run supplied its own contemporaneous pre- and post-run capture, all byte-identical to V2.
- Machine-length equality was established by reading `Table1` from all three `.dw` files. The files themselves are licensed output and are **not** committed; only their SHA-256 values are recorded. The differing file hashes reflect the embedded project name, order number and label bitmap, not a length difference — which is why the comparison is column-by-column rather than hash-based.
- The on-screen bar strip order is presentation only, proven by RUN_C rendering 1433-first while its own machine file carries 454-first. Strip order is therefore excluded from topology comparison, and `topologyFingerprint` is documented as within-run only because it embeds run-scoped piece ids.
- A pre-protocol session briefly opened project 4 (RUN_B) at 14:51:03 and was shut down at 14:51:23 without saving a design, plan or optimization. RUN_C was created afterwards in a new session, so no optimizer state could carry over, but the visit is recorded rather than omitted.
- Production-plan "approved" versus "optimized" UI flags remain `UNPROVEN` because Production Status is not to be clicked.
- Baseline V1 was invalidated by a manual stock edit before RUN_A existed. Nothing was measured against V1, so no result was lost — but the ORTA-0 side observation is not recoverable under V2.
- The manual Stock Management edit path is **unlogged**. Warehouse drift between runs is therefore detectable only by contemporaneous UI capture, which is why the two-source check treats the log as supplementary. An unobserved manual edit between two runs would surface as `STOCK_STATE_MUTATED` at the next capture, not at the moment it happened.
- `MANUAL_STOCK_CARD_EDIT_IS_UNLOGGED` is proven for the observed path only and is not generalized to every manual edit surface in DoWin.

---

## Test 2 / 3 / 4 authority — unchanged (Step 25)

The A/B/C topology work does **not** touch the FP-024B isolation findings, and they are restated here only to record that they were not reinterpreted:

| Finding | Authority | Unchanged because |
|---------|-----------|-------------------|
| Test 2 — Welding Waste 3→0, packed/machine effect | **PROVEN FOR FIXTURE ONLY** | established on a single isolated fixture; the triplicate varied no setting |
| Test 3 — Saw Thickness 4→5, remainder | **AMBIGUOUS / UNPROVEN** | remainder evidence was never sufficient; nothing in A/B/C addresses saw thickness |
| Test 4 — Trim Cut 0→10, remainder | **AMBIGUOUS** | same; piece-length inert, remainder unresolved |

The triplicate held every setting constant, so it carries no information about any setting's effect and cannot raise or lower these.

---

## Independent review — 13 September 2026

FP-024C.3 was submitted for independent review and **accepted as an evidence checkpoint**.

Accepted verdict: `FP-024C.3 = PROVEN as NONREPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS`, on the grounds that A/B/C are fresh solves; geometry, required parts, settings, machine, optimizer stock, warehouse stock and freshness are measured-identical; the offcut/remnant axis remains `UNPROVEN` so escalation to `OPTIMIZER_NONDETERMINISM_OR_TIE_BREAKING` was correctly withheld; CITA topology is `X / Y / X`; total utilization and remainder equality did not mask the grouping difference because the bar-sequence comparison catches it; the warehouse remained immutable because `No` was answered to every Stock Update dialog; and the formula freeze held.

The three evidence-code corrections were accepted as correct abstractions rather than convenience changes:

| Correction | Accepted reason |
|-----------|-----------------|
| `topologyFingerprint` restricted to within-run use | run-scoped piece ids contaminated cross-run identity |
| `barSequenceFingerprint` added for cross-run comparison | correct abstraction for geometric bar topology |
| `settingsCaptureId` added | identical screenshot content hashes alone do not prove independent contemporaneous captures |

### Wording correction — applied

One sentence was rejected as an overclaim and has been removed from this document:

> ~~"That rules the stochastic component out as the cause of the over-production."~~

Three identical surplus outcomes make a stochastic explanation unsupported and increasingly unlikely, but they do not mathematically rule it out. The recorded finding is now:

> The +3 ORTA surplus is repeatable across all three measured-identical runs and is not correlated with the observed stochastic CITA topology variation. Evidence therefore supports a deterministic or upstream conservation defect, but root cause remains **UNPROVEN**.

Both occurrences (Step 23 section and Limitations) were rewritten to this wording. No other finding changed.

### Authority after review

| Finding | Verdict |
|---------|---------|
| A/B/C measured inputs | **IDENTICAL** |
| Complete inputs | **UNPROVEN** — remnant axis |
| CITA topology | **NONREPEATABLE** under measured-identical inputs |
| Stochastic mechanism | **POSSIBLE** mechanism only |
| 21 → 24 conservation failure | **REPEATABLE UNDER MEASURED-IDENTICAL INPUTS** |
| +3 ORTA root cause | **UNPROVEN** |
| Wrong ORTA remainder propagates to machine file | **REPEATABLE OBSERVATION** |
| Welding Waste effect | **PROVEN FOR FIXTURE ONLY** |
| Saw remainder | **AMBIGUOUS / UNPROVEN** |
| Trim remainder | **AMBIGUOUS** |
| Physical-length score | **6.0/10** unchanged |
| Production formulas | **FROZEN** |
| PR #32 | **DRAFT / DO NOT MERGE** |

### Next gate reordered

The review reprioritised the conservation failure above the pending compensation control. The reasoning is that `21 → 24` with `+3 × 1416 mm` ORTA surplus, propagating into `REMAINING_LENGTH = 820 mm` instead of the remainder associated with the one required mullion, is a manufacturing-safety invariant violation, and therefore a stronger correctness problem than the 90° compensation question.

Recorded sequence:

```text
FP-027 forensic root-cause audit
  -> conservation invariant and fix
  -> re-run controlled conservation test
  -> return to 90 CONTROL_FIXTURE
  -> FP-024C physical formula conclusion
  -> FP-016
  -> FP-017
```

The 90° control stays **GATED**. PR #32 stays **DO NOT MERGE**: the branch has exposed a manufacturing-safety invariant violation that should be understood before the parity branch closes.

---

## Gating

| Item | Status |
|------|--------|
| FP-024C.3 | ✅ **PROVEN as NONREPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS** — accepted as evidence checkpoint, 13 September 2026 |
| Controlled baseline | **V2 frozen** — CITA 46 / KANAT 96 / KASA 13 / ORTA 100 |
| Baseline V1 | **HISTORICAL_ONLY** — invalidated before RUN_A, not a restoration target |
| FP024C3_RUN_A | **MEASURED** — `OptimizationRun` Id=9, `IMMUTABLE_VERIFIED` |
| FP024C3_RUN_B | **MEASURED** — `OptimizationRun` Id=10, `IMMUTABLE_VERIFIED` |
| FP024C3_RUN_C | **MEASURED** — `OptimizationRun` Id=11, `IMMUTABLE_VERIFIED` |
| Topology distribution | **X / Y / X** — two topologies over three fresh solves, CITA-20 only |
| `A_B_C_MACHINE_LENGTH_LAYER` | **IDENTICAL** — 39 columns compared across three `.dw` files |
| `OPTIMIZATION_REQUIRED_PARTS_CONSERVATION_VIOLATION` | **REPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS** |
| `SURPLUS_PLAN_REMAINDER_PROPAGATES_TO_MACHINE_OUTPUT` | **REPEATABLE_OBSERVATION** |
| `DIVERGENCE_LOCALIZED_AFTER_BAR_COUNT_ALLOCATION` | **SUPPORTED** (not proven) |
| Stochastic mechanism authority | **POSSIBLE_NONDETERMINISTIC_MECHANISM** (not `PROVEN_NONDETERMINISM`) |
| `COMPLETE_INPUT_EQUIVALENCE` | **UNPROVEN** — offcut/remnant axis; caps the verdict |
| `DOWIN_BAR_STRIP_ORDER_IS_NOT_MACHINE_ORDER` | **PROVEN_BY_DIRECT_COMPARISON** |
| Repeatability verdict | **NONREPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS** |
| `ORTA_ZERO_QTY_CONTROL_OBSERVABILITY` | **LOST_BY_MANUAL_STOCK_EDIT** |
| `MANUAL_STOCK_CARD_EDIT_IS_UNLOGGED` | **PROVEN FOR OBSERVED PATH** |
| 90° CONTROL_FIXTURE | **GATED** — deprioritized below FP-027 at review; a complete triplicate does not authorize it |
| Physical-length correctness | **6.0/10** |
| Production formulas | **FROZEN** |
| FP-016 / FP-017 | not started |
| FP-025B | do not start |
| Fourth controlled solve | **not authorized** |
| FP-026 | future finding, not implemented |
| FP-027 | 🔓 **OPEN — forensics only**, next gate; no fix, no invariant implementation yet |
| +3 ORTA root cause | **UNPROVEN** — deterministic or upstream conservation defect supported, not proven |
| PR #32 | **Draft / DO NOT MERGE** |
