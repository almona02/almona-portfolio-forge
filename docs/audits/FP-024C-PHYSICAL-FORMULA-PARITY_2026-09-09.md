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

`ingestOperatorCalibrationRun` rejects incomplete packages, multi-setting isolation, geometry/stock/qty changes on SINGLE_SETTING_ISOLATION, and setting changes on CONTROL_FIXTURE.

---

## Operator isolation vs control fixture

DoWin is **not** executed from this repo. Each run needs one evidence package. Do **not** commit licensed PDFs/MDB binaries; ingest SHA-256 + transcribed millimetres.

The 90° run is a **CONTROL_FIXTURE**, not a `SINGLE_SETTING_ISOLATION`. The first three isolation runs keep geometry, stock, quantity, system, and machine identical.

| Test | Kind | Isolation | Status |
|------|------|-----------|--------|
| 1 Baseline settings snapshot | `BASELINE_SETTINGS_SNAPSHOT` | Transcribe **this-run** General Settings on asdd | **NOT MEASURED** (lengths MEASURED) |
| 2 Welding Waste | `SINGLE_SETTING_ISOLATION` | Only Welding Waste → `0`; same geometry/stock/qty/system/`DC-600` | `PENDING_OPERATOR_RUN` |
| 3 Saw Thickness | `SINGLE_SETTING_ISOLATION` | Only saw + known 1 mm; same identity | `PENDING_OPERATOR_RUN` |
| 4 Trim Cut | `SINGLE_SETTING_ISOLATION` | Only trim + known delta; same identity | `PENDING_OPERATOR_RUN` |
| 5 90° control | `CONTROL_FIXTURE` | Separate 90°/90° design; settings unchanged; geometry/cut-angle **may** differ | `PENDING_OPERATOR_RUN` |

Package per run:

1. Exact General Settings screenshot  
2. Design dimensions / system / profile  
3. Machine = DC-600  
4. Design Preview PDF  
5. Labels / Assembly PDF  
6. Optimization PDF  
7. MDB if generated  
8. Timestamp / run ID  
9. The one changed setting and old/new value (**SINGLE_SETTING_ISOLATION only**)  
10. SHA-256 of each external file  
11. Transcribed nominal / packed / machine / remainder values  

After Tests 2–4, Cursor produces **only** a delta table and authority classification:

`PROVEN EFFECT` / `NO OBSERVED EFFECT` / `AMBIGUOUS` / `NOT MEASURED`

A term is eligible for FP-024C implementation only when a **single-variable** row is **PROVEN EFFECT**. `CONTROL_FIXTURE` cannot yield that for a setting. No formula patch, no +3, no +7, no K-factor change until then.

The first decisive evidence is still the **actual baseline General Settings screenshot** for the existing asdd run. Isolation ingest is rejected until that snapshot is transcribed.

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
