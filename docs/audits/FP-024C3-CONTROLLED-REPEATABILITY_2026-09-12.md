# FP-024C.3 — Controlled Fresh-Solve Repeatability

| Field | Value |
|-------|--------|
| Date | 12 September 2026, re-baselined 13 September 2026, RUN_A and RUN_B executed 13 September 2026 |
| Branch | `feature/fp024c-physical-parity` |
| HEAD at start | `243558a` — `audit: trace Fresh A stock mutation provenance` |
| HEAD at re-baseline | `cb05ab0` |
| PR #32 | Draft / **DO NOT MERGE** |
| Question | Do multiple genuinely fresh optimization solves under the same current input state produce the same bar-assignment topology? |
| Active baseline | **V2** — frozen 12 Sep 23:58:45 +03, `MANUAL_STOCK_CARD_EDIT_CONTAMINATED_V1` |
| Gate | ⏸ **PENDING_RUN_C** — 2 of 3 controlled runs ingested |
| Physical-length score | **Unchanged at 6.0/10** |
| Production formulas | **FROZEN** |
| 90° CONTROL_FIXTURE | **GATED** |

---

## Verdict

```
FP-024C   ⏸ STATE PROVENANCE INVESTIGATION
FP-024C.1 PAUSED BY STOCK_STATE_CHANGED
FP-024C.2 ✅ STOCK MUTATION PROVENANCE AUDIT COMPLETE
FP-024C.3 ⏸ READY_FOR_RUN_A_ON_BASELINE_V2

Controlled baseline V1:
INVALIDATED BEFORE RUN_A — HISTORICAL_ONLY
reason: MANUAL_STOCK_CARD_EDIT_CONTAMINATED_V1

Controlled baseline V2:
FROZEN — CITA 46 / KANAT 96 / KASA 13 / ORTA 100
source hash: c8626da5166731e393a74ae731b663410ef77f2bde2b05bcfa572531e6c32012

FP024C3_RUN_A: MEASURED (OptimizationRun Id=9, NEWLY_SOLVED)
FP024C3_RUN_B: MEASURED (OptimizationRun Id=10, NEWLY_SOLVED)
FP024C3_RUN_C: CLOSED pending authorization

Repeatability classification:
NOT YET CLASSIFIABLE (2 of 3 runs)
NONREPEATABLE_OBSERVATION_PENDING_RUN_C

A_B_TOPOLOGY_DIVERGENCE:
OBSERVED — CITA-20 assignment differs under
proven-identical measured inputs

A_B_MEASURED_INPUT_EQUIVALENCE:
IDENTICAL

A_B_MACHINE_LENGTH_LAYER:
IDENTICAL (Table1 read directly, 13 rows field-for-field)

SURPLUS_ORIGINAL_PARTS_BEHAVIOR:
REPRODUCED_IN_RUN_B (identical surplus signature)

RUN_A warehouse immutability:
IMMUTABLE_VERIFIED (UI byte-identical to V2 + zero stock-write log lines)

OVERPRODUCTION_BEYOND_REQUIRED_QUANTITY:
OBSERVED on RUN_A — 24 pieces cut against 21 required

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

This checkpoint establishes the controlled baseline, the stock-isolation rules, the intake gate, and the classification logic, and ingests **RUN_A and RUN_B**. RUN_C is not authorized by this document. The three controlled solves require the licensed DoWin application on the operator PC and cannot be produced from this repository. No topology, hash, or provenance value below is invented.

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
| `FP024C3_RUN_C` | `FP024C3_RUN_C` | `RUN_C` | `RUN_C_PLAN` | **CLOSED** until explicitly authorized |

All three must be solved against baseline **V2**. A run declaring baseline V1 is rejected at intake, and classification returns `BASELINE_SUPERSEDED`.

The old `FP024C1_FRESH_B` remains **INVALID_PRE_RUN / STOCK_STATE_CHANGED** and `FP024C1_FRESH_C` remains closed. All three FP-024C.3 slots are registered in the existing catalog (`DOWIN_CALIBRATION_RUNS`, 13 entries, 4 pending). RUN_A carries five bar patterns and RUN_B four, both with full `optimizerProvenance`. RUN_C keeps empty pieces, empty bars, and `optimizerProvenance = null`; no placeholder topology exists.

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
| 1 | CITA-20 | 6500 | 1 | 1313 × 4, 334 × 3 | 206.43 | 96.8 % |
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
| CITA bar 1 | 1313×4 + 334×3, remaining **206.43** | 1313×2 + 334×2, remaining **3183.37** |
| CITA bar 2 | 334×1, remaining **6160.34** | 1313×2 + 334×2, remaining **3183.37** |
| CITA patterns | 2 distinct | 1 pattern × 2 |
| Plan patterns | 5 | 4 |
| CITA total remainder | 6366.77 | 6366.74 |
| Total offcut | 12 559 mm | 12 559 mm |
| Overall yield | 66.2 % | 66.2 % |

Same eight glazing beads, same two 6500 mm bars, same total remainder to within 0.03 mm — distributed differently. RUN_A concentrated the beads into one nearly-full bar plus one nearly-empty bar; RUN_B split them evenly.

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

- **Not** `OPTIMIZER_NONDETERMINISM`. Two runs cannot support that; RUN_C is required. Recorded as `NONREPEATABLE_OBSERVATION_PENDING_RUN_C`.
- **Not** attributable to the annealing seed. No seed is logged. Simulated annealing is a *plausible mechanism*, not a demonstrated cause.
- **Not** a claim that either plan is "correct". Both are valid solver outputs of equal reported yield.
- **Not** full determinism in either direction — the offcut/remnant axis stays `UNPROVEN`.

---

## Bar-sequence measurement limitation (RUN_A)

Only the CITA and ORTA bar strips were captured for RUN_A, so the **within-bar cut sequence** for its KANAT and KASA bars was never measured; the recorded order came from the asdd baseline convention. RUN_B measured all four strips and shows DoWin uses no single convention — its CITA and KASA bars render longest-first while its KANAT bar renders shortest-first.

The bar *contents* are nonetheless fixed by unique arithmetic: 4 pieces totalling 3774 mm drawn from {454, 1433} admits only {1433, 1433, 454, 454}, and 5012 mm from {1003, 1503} admits only {1503, 1503, 1003, 1003}.

Consequence: the A↔B topology verdict is taken from `compareBarTopology`, which returns `CONTENT_DIVERGENT` only on genuinely different contents, remainders or grouping, and `ORDER_ONLY_DIFFERENCE` when just the sequence differs. The divergence above rests entirely on the CITA regrouping — a difference in bar count and remainders — **not** on any unmeasured ordering.

---

## Correction to the RUN_A over-production finding

RUN_A's write-up said the surplus was "confined to the cutting plan" and that "the machine file is unaffected". Reading `Table1` directly from both `.dw` files corrects this:

- The exported **piece list** is unaffected — one 1416 mm mullion, correctly, in both runs.
- The **`REMAINING_LENGTH` field is affected** — the ORTA row carries `8200` (820.0 mm) in both files, when cutting one mullion actually leaves 5080 mm.

So the 4260 mm misstatement does reach the machine file. The DC-600 does not cut from that field, so there is still no wrong-parts risk on this path, but any downstream offcut tracking that reads `REMAINING_LENGTH` inherits the error. The original claim was too narrow.

---

### FP024C3_RUN_C

Identical intake requirements. **PENDING_OPERATOR_RUN.** RUN_B's postcheck is `PASS`, so RUN_C is unblocked but still requires explicit operator authorization. RUN_C is the run that decides whether the A/B divergence becomes `OPTIMIZER_NONDETERMINISM_OR_TIE_BREAKING` or stays an unexplained two-run observation. A geometric copy is acceptable only if no optimization state or history is inherited; a reused `optimizationResultId` is rejected by intake.

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
| `npx vitest run src/tests/fabricator/dowinOptimizationStateProvenance.test.ts` | **Pass** — 45 tests (23 FP-024C.3 cases) |
| `npx vitest run src/tests/fabricator/dowinPhysicalLengthGolden.pending.test.ts` | **Pass** — 20 tests |
| `npx vitest run src/tests/fabricator/manufacturingSettingsContract.test.ts` | **Pass** — 15 tests |
| Combined | 4 files, **98 tests passed** |
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
| `src/lib/fabricator/dowinParity/dowinCompensationEvidence.ts` | RUN_A and RUN_B ingest, RUN_C pending slot, re-exports, FP-024C.1 classifier scoped away from controlled runs, 90° gate now also requires the controlled triplicate |
| `src/tests/fabricator/dowinOptimizationStateProvenance.test.ts` | FP-024C.3 test block |
| `src/tests/fabricator/dowinCompensationReconciliation.test.ts` | catalog counts 10 → 13, pending 3 → 6 → 4 as RUN_A and RUN_B were ingested |
| `docs/audits/*` | this audit, the FP-024C.2 correction, and the FP-024C.1 update |

Test 2 authority is unchanged: Welding Waste affects packed/machine KASA/KANAT in the observed `asdd` fixture only. No generalization.

`FP-026 STOCK_COMMIT_BOUNDARY` is preserved as a future finding and **not** implemented. The ALMONA implication stands: solve and export must not silently commit warehouse truth; stock mutation belongs behind an explicit authoritative confirmation.

---

## Licensed-artifact exclusion

Committed: SHA-256 values, transcriptions, structured provenance, fingerprints, classification, tests, audit docs.

Not committed: PDFs, `.dw`, MDB, screenshots, machine binaries. No decompilation. The encrypted shop database was not opened.

---

## Limitations

- **Two** of three controlled runs have been executed. RUN_A and RUN_B are measured; RUN_C is `PENDING_OPERATOR_RUN`. Two runs cannot establish or refute repeatability, and no repeatability claim is made.
- The remaining solve requires the licensed DoWin application on the operator PC and cannot be generated from this repository.
- The A/B topology divergence is **observed but unexplained**. It is confined to CITA-20 intra-bar assignment after an identical MIP allocation. RUN_C decides whether this becomes `OPTIMIZER_NONDETERMINISM_OR_TIE_BREAKING` or remains a two-run anomaly.
- RUN_A's within-bar cut sequence for KANAT and KASA was never captured, so sequence-level comparison on those bars is `UNPROVEN`. Bar contents are fixed by unique arithmetic and the divergence verdict does not depend on ordering.
- The over-production has no proven cause. It reproduced exactly in RUN_B, so it is deterministic across these two runs and not a stochastic artifact. The ORTA stock limit lifting from 0 to 100 remains the obvious candidate given the cost-and-stock-limit solver, but testing it requires changing stock, which this protocol forbids. Candidate future gate name only: **FP-027 OPTIMIZATION_REQUIRED_PARTS_CONSERVATION** — not implemented.
- DoWin's solver includes simulated annealing, and RUN_B **did** differ from RUN_A in bar assignment, so a stochastic mechanism is now mechanically plausible rather than speculative. It is still not proven: the annealing seed is not exposed, the MIP stages were identical, and `POSSIBLE_NONDETERMINISTIC_MECHANISM` must not be upgraded from architecture plus two runs.
- The offcut/remnant **inventory** axis still has no evidence surface, so complete input equivalence can stay `UNPROVEN` even after three valid runs. The offcut **policy** surface is now known (Reusable Offcut Settings, Minimum Offcut Length 500 mm, with *Add Offcuts to Stock* as a separate explicit ribbon action — which explains why the proven 22:17:20 stock write created no remnant rows despite remainders far above 500 mm). Knowing the policy does not prove the inventory is empty; that axis stays `UNPROVEN`.
- The user-visible trigger of the 22:17:20 warehouse write is now **resolved**: the post-export **Stock Update** dialog. Fresh A's `Yes` is inferred from the proven write plus the observed dialog, not directly observed; RUN_A's `No` arm is directly observed. See FP-024C.2.
- The V2 source hash is a pre-run capture. Each run still needs its own contemporaneous post-run capture; RUN_A and RUN_B both supplied one.
- Machine-length equality was established by reading `Table1` from the two `.dw` files. The files themselves are licensed output and are **not** committed; only their SHA-256 values are recorded. The differing file hashes reflect the embedded project name and timestamp, not a length difference.
- Production-plan "approved" versus "optimized" UI flags remain `UNPROVEN` because Production Status is not to be clicked.
- Baseline V1 was invalidated by a manual stock edit before RUN_A existed. Nothing was measured against V1, so no result was lost — but the ORTA-0 side observation is not recoverable under V2.
- The manual Stock Management edit path is **unlogged**. Warehouse drift between runs is therefore detectable only by contemporaneous UI capture, which is why the two-source check treats the log as supplementary. An unobserved manual edit between two runs would surface as `STOCK_STATE_MUTATED` at the next capture, not at the moment it happened.
- `MANUAL_STOCK_CARD_EDIT_IS_UNLOGGED` is proven for the observed path only and is not generalized to every manual edit surface in DoWin.

---

## Gating

| Item | Status |
|------|--------|
| FP-024C.3 | **PENDING_RUN_C** |
| Controlled baseline | **V2 frozen** — CITA 46 / KANAT 96 / KASA 13 / ORTA 100 |
| Baseline V1 | **HISTORICAL_ONLY** — invalidated before RUN_A, not a restoration target |
| FP024C3_RUN_A | **MEASURED** — `OptimizationRun` Id=9, `IMMUTABLE_VERIFIED` |
| FP024C3_RUN_B | **MEASURED** — `OptimizationRun` Id=10, `IMMUTABLE_VERIFIED` |
| FP024C3_RUN_C | **CLOSED** until explicitly authorized |
| `A_B_TOPOLOGY_DIVERGENCE` | **OBSERVED** — CITA-20 only, under proven-identical measured inputs |
| `SURPLUS_ORIGINAL_PARTS_BEHAVIOR` | **REPRODUCED_IN_RUN_B** |
| `A_B_MACHINE_LENGTH_LAYER` | **IDENTICAL** |
| Repeatability verdict | **NOT YET CLASSIFIABLE** — `NONREPEATABLE_OBSERVATION_PENDING_RUN_C` |
| `ORTA_ZERO_QTY_CONTROL_OBSERVABILITY` | **LOST_BY_MANUAL_STOCK_EDIT** |
| `MANUAL_STOCK_CARD_EDIT_IS_UNLOGGED` | **PROVEN FOR OBSERVED PATH** |
| 90° CONTROL_FIXTURE | **GATED** — not to be run during FP-024C.3; the repeatability verdict comes first, then authorization is requested |
| Physical-length correctness | **6.0/10** |
| Production formulas | **FROZEN** |
| FP-016 / FP-017 | not started |
| FP-025B | do not start |
| FP-026 | future finding, not implemented |
| FP-027 | candidate name only, not implemented |
| PR #32 | **Draft / DO NOT MERGE** |
