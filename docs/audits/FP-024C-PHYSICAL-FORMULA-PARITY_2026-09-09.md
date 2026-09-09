# FP-024C — Physical Formula Correction + Real DoWin Parity

| Field | Value |
|-------|--------|
| Date | 9 September 2026 |
| Repository | `almona-portfolio-forge` |
| Branch | `feature/fp024c-physical-parity` (from `main` after FP-025A; merged `feature/fp024-dowin-external-golden`) |
| Depends on | FP-023A, FP-023B, FP-024A, FP-024B, operator isolation evidence |
| Scope | Identify which **this-run** settings drive nominal → packed → machine length, then implement only those proven terms and re-run ±0.1 mm parity. Not FP-016, FP-017, or FP-025B. |
| Gate | ⏸ **WAITING_OPERATOR_ISOLATION** — no formula implementation yet |
| Physical-length score | **Unchanged at 6.0/10** |

---

## Verdict

⏸ **WAITING_OPERATOR_ISOLATION**

FP-025A is ✅ ACCEPTED on `main` and did not contaminate manufacturing truth. FP-024A/B calibration evidence is now on this branch. **No production formula, K-factor, kerf identity, or Cut identity change is allowed in this kickoff.**

FP-024C formula work starts only after operator isolation identifies which settings actually move:

1. DoWin nominal / report length
2. DoWin packed / compensated segment
3. DoWin machine length
4. DoWin reported bar remainder

Until then, physical-length correctness stays **6.0/10**.

---

## Why formulas are frozen

FP-024B converted tempting constants into hypotheses. None of these may enter `ManufacturingSettings`, `calculateKFactor`, `DowinParityLengthEngine` production wiring, or `UPVCCuttingEngine`:

| Observation | Authority | Encode now? |
|-------------|-----------|-------------|
| 45° packed − nominal = +3 mm | SUPPORTED (asdd only) | **No** — not isolated |
| 90° mullion 1416 on all layers | SUPPORTED (asdd only) | **No** |
| DC-600 `Table1.LENGTH` = packed (13 rows) | SUPPORTED (this export) | **No** — beads still null |
| +3 = Welding Waste | UNPROVEN | No |
| +3 = saw compensation | UNPROVEN | No |
| KASA/KANAT leftover 7 mm | UNPROVEN | No |
| Generalized DoWin compensation | NOT ESTABLISHED | No |

`ingestOperatorCalibrationRun` still rejects incomplete packages, multi-setting changes, and geometry changes on the first three isolation runs.

---

## Operator isolation (the actual next step)

DoWin is **not** executed from this repo. Each run needs one evidence package. Do **not** commit licensed PDFs/MDB binaries; ingest SHA-256 + transcribed millimetres.

| Test | Isolation | Status |
|------|-----------|--------|
| 1 Baseline settings snapshot | Transcribe **this-run** General Settings on asdd (Welding Waste, Saw Thickness, Trim Cut, angle L/R, robot safety, sash offset if exposed, glazing clearance, machine) | **NOT MEASURED** |
| 2 Welding Waste | Only Welding Waste → `0`; same geometry | `PENDING_OPERATOR_RUN` |
| 3 Saw Thickness | Only saw + known 1 mm; same geometry | `PENDING_OPERATOR_RUN` |
| 4 Trim Cut | Only trim + known delta; remainder vs packed/machine | `PENDING_OPERATOR_RUN` |
| 5 90° control | 90°/90° demand; settings unchanged | `PENDING_OPERATOR_RUN` |

Package per run: General Settings screenshot, design W×H / system / machine, Design Preview PDF, Assembly/Labels PDF, Optimization PDF, MDB if applicable, timestamp / run ID, note of **exactly one** changed setting.

After Test 2–4, compare unique `packed − nominal` and remainder deltas to Test 1. A term is eligible for FP-024C implementation only when the matrix row is **PROVEN EFFECT** from a single-setting change.

---

## What this branch will do *after* isolation

1. Implement only proven layer mappings (nominal / packed / machine).
2. Re-run the licensed asdd fixture through `dowinParityGatePasses` at **±0.1 mm** per category.
3. Leave unevidenced categories `null` (do not invent frame/mullion/glass to green the gate).
4. Keep `barPackAccounting` / FP-023B kerf identity unchanged unless a **this-run** saw/trim value is proven.

Do not start FP-016 or FP-017 from this gate. FP-025B (EngineeringBay density, inspector hierarchy, table density, shop-floor keyboard) stays polish-only and must not interrupt this sequence.

---

## Program state

```
FP-023A ⚠️ CONDITIONAL
→ FP-023B ✅ PROVEN
→ FP-024A ❌ parity failed
→ FP-024B ⚠️ calibration ready
→ FP-025A ✅ ACCEPTED UI
→ FP-024C ⏸ waiting operator isolation (this branch)
→ FP-016  (after credible physical parity)
→ FP-017
```

Physical-length score may move materially above **6.0** only when FP-024C passes the real ±0.1 mm evidence gate.

---

## Isolation (AICS-001)

| Constraint | How it is held |
|------------|----------------|
| No ML in execution | No solver / GA work in this gate (that is FP-016) |
| No silent production swap | Formula freeze until isolation PROVEN EFFECT |
| Human validation | Operator DoWin exports; no invented millimetres |
| Constitutional lock | FP-023B kerf tests remain the canonical bar-pack identity |

---

## Legal / IP

Licensed PDFs and readable MDB table fields only. No binary decompilation, no SQLCipher/DPAPI, no guessed Basma/Kaynak, no DoWin UI clone.
