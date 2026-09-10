# FP-024C — Physical Formula Correction + Real DoWin Parity

| Field | Value |
|-------|--------|
| Date | 9 September 2026 |
| Repository | `almona-portfolio-forge` |
| Branch | `feature/fp024c-physical-parity` (from `main` after FP-025A; merged `feature/fp024-dowin-external-golden`) |
| Depends on | FP-023A, FP-023B, FP-024A, FP-024B, operator isolation evidence |
| Scope | Identify which **this-run** settings drive nominal → packed → machine length, then implement only those proven terms and re-run ±0.1 mm parity. Not FP-016, FP-017, or FP-025B. |
| Gate | ⏸ **BLOCKED** — FP-024C.1 state provenance investigation. Do not merge |
| Physical-length score | **Unchanged at 6.0/10** |

---

## Verdict

⏸ **BLOCKED — FP-024C.1 Optimization State Provenance Audit. Do not run the 90° control. Do not merge.**

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
| +3 = Welding Waste | PROVEN on asdd 45° KASA/KANAT packed/machine; UNPROVEN as a general rule | No |
| +3 = saw compensation | NO OBSERVED EFFECT on asdd packed/machine; remainder AMBIGUOUS | No |
| KASA/KANAT leftover 7 mm | UNPROVEN | No |
| Generalized DoWin compensation | NOT ESTABLISHED | No |

`ingestOperatorCalibrationRun` rejects incomplete packages, multi-setting isolation, geometry/stock/qty changes on SINGLE_SETTING_ISOLATION, setting changes on CONTROL_FIXTURE, BASELINE_REPRODUCTION_RUN, or BASELINE_RESET_VALIDATION, Tests 2–4 until 1B is `REPRODUCED`, the 90° CONTROL_FIXTURE until BASELINE_RESET_VALIDATION recovers 1B, and FP-024C.1 runs whose optimizer provenance is incomplete, reused, or not a fresh project/design.

---

## Operator isolation vs control fixture

DoWin is **not** executed from this repo. Each run needs one evidence package. Do **not** commit licensed PDFs/MDB binaries; ingest SHA-256 + transcribed millimetres.

Live General Settings (Test 1A) are **not** proof they governed the original 18:14 export. Test 1B must rerun the same asdd 1000×1500 design with currently captured Weld=3 / Saw=4 / Trim=0 and DC-600. If 451→454, 1430→1433, 1000→1003, 1500→1503 and bar remainders do not match, **stop** — Tests 2–4 are not clean.

| Test | Kind | Isolation | Status |
|------|------|-----------|--------|
| 1A Current settings snapshot | `BASELINE_SETTINGS_SNAPSHOT` | Live screenshot: Welding Waste 3, Saw Thickness 4, Trim Cut 0, DC-600 | **AMBIGUOUS** (not historical proof) |
| 1B Same-design baseline reproduction | `BASELINE_REPRODUCTION_RUN` | Settings unchanged; same asdd 1000×1500 | **REPRODUCED** (2026-09-10 21:25) |
| 2 Welding Waste | `SINGLE_SETTING_ISOLATION` | Only Welding Waste → `0`; same geometry/stock/qty/system/`DC-600` | **CONDITIONAL** (KASA/KANAT packed/machine PROVEN; CITA downstream) |
| 3 Saw Thickness | `SINGLE_SETTING_ISOLATION` | Only Saw Thickness 4 → 5; same identity | **AMBIGUOUS** (piece lengths inert; remainder not attributable to Saw after reset) |
| 4 Trim Cut | `SINGLE_SETTING_ISOLATION` | Only Trim Cut 0 → 10; same identity | **AMBIGUOUS** (piece/machine inert; remainder confound, not Trim evidence) |
| Reset | `BASELINE_RESET_VALIDATION` | Restore Weld=3 / Saw=4 / Trim=0; Clear Screen; rerun unchanged asdd | **REPRODUCTION_FAILED** (2026-09-10 23:16). Machine lengths recovered; remainders still Test 3/4. |
| FP-024C.1 | `OPTIMIZATION_STATE_PROVENANCE_AUDIT` | Same geometry + Weld 3 / Saw 4 / Trim 0 + same stock + fresh project/design/plan/result; compare assignment signatures | `PENDING_OPERATOR_RUN` |
| 5 90° control | `CONTROL_FIXTURE` | Separate 90°/90° design; settings unchanged; geometry/cut-angle **may** differ | **Gated** |

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

The asdd baseline General Settings screenshot is captured (SHA-256 `95652321b98d682eb07cc46d1e13e464fee21ee31e323e83089231688a72c18a`, PNG not committed). Transcribed: Welding Waste **3**, Saw Thickness **4**, Trim Cut **0**, Sash Offset **7**, Glazing Clearance **2.5**, remnant **500**, machine **DC-600** (DC-550 SKH also enabled globally).

**BASELINE_REPRODUCTION_RUN 2026-09-10 21:25 is `REPRODUCED`.** Same asdd 1000×1500, settings unchanged. Design Preview text is identical to 18:14. Labels and Optimization List text are identical except timestamps. DC-600 Table1 `LENGTH` is sash H **454**, sash V **1433**, frame H **1003**, frame V **1503**, mullion **1416**. Optimization remainders **206 / 6160 / 2203 / 965 / 5080**. Licensed files not committed.

**Test 2 Welding Waste 3→0 (2026-09-10 21:54) is layer-proven and globally `CONDITIONAL`.** Isolation was valid (same asdd 1000×1500, Deceuninck 70, stock, quantity, Saw=4, Trim=0, DC-600). Comparison vs 1B:

| Finding | Classification |
|---------|----------------|
| Welding Waste 3→0 changes KASA/KANAT packed length by −3 mm | **PROVEN EFFECT** |
| Welding Waste 3→0 changes KASA/KANAT DC-600 machine length by −3 mm | **PROVEN EFFECT** |
| Nominal report lengths | **NO OBSERVED EFFECT** |
| 90° mullion | **NO OBSERVED EFFECT** |
| KASA/KANAT remainder +12 mm | **PROVEN CONSISTENT EFFECT** |
| CITA packing topology | **DOWNSTREAM OPTIMIZER RESPONSE** (does not veto the −3 mm) |
| “All 45° profiles always add WeldingWaste” | **UNPROVEN GENERALIZATION** |
| Exact proprietary DoWin formula | **UNPROVEN** |

CITA remainder topology 206/6160 → 3195×2 is a downstream packing response and is classified separately. A causal length change may legitimately change which bar pattern is optimal.

Package-level classification is **CONDITIONAL**. Production formulas stay frozen. One fixture is not enough to generalize across systems/profile classes.

**Test 3 Saw Thickness 4→5 (2026-09-10 22:21) is piece-length inert; remainder is AMBIGUOUS.** Isolation vs 1B observed KASA 965→960 and ORTA 5080→5079, but that is no longer attributable to Saw Thickness: `BASELINE_RESET_VALIDATION` restored Saw=4 and did not recover 1B remainders.

| Finding | Classification |
|---------|----------------|
| Nominal report lengths | **NO OBSERVED EFFECT** |
| Packed / DC-600 machine piece lengths | **NO OBSERVED EFFECT** |
| Saw has a proven bar-remainder effect | **UNPROVEN** |
| Test-3 remainder signature | **AMBIGUOUS** |
| Exact remainder delta = N × Δsaw | **UNPROVEN** |
| Exact proprietary DoWin formula | **UNPROVEN** |

Welding Waste moved packed/machine; Saw Thickness did not. Remainder movement that survives a Saw=4 reset is a provenance question, not a kerf formula. Package-level classification is **AMBIGUOUS**. Production formulas stay frozen.

**Test 4 Trim Cut 0→10 (2026-09-10 22:52) is piece/machine inert; remainder is not Trim evidence.** Isolation was valid (Saw restored to 4, Weld=3, same asdd 1000×1500, Deceuninck 70, stock, quantity, DC-600). Comparison vs 1B:

| Finding | Classification |
|---------|----------------|
| Trim 0→10 changes nominal lengths | **NO OBSERVED EFFECT** |
| Trim 0→10 changes packed lengths | **NO OBSERVED EFFECT** |
| Trim 0→10 changes DC-600 LENGTH | **NO OBSERVED EFFECT** |
| Trim has a proven bar-remainder effect | **UNPROVEN** |
| Test-4 remainder signature | **AMBIGUOUS** / possible optimizer-state or recomputation confound |
| Exact proprietary DoWin formula | **UNPROVEN** |

KASA 960 / ORTA 5079 / CITA 3178×2 is the Test 3 saw remainder signature, despite Saw 5→4 and Trim 0→10. That is too suspicious to treat as Trim evidence. Possible stale optimization state, a setting that needs a fresh cycle, other persisted state, or an internal relationship. None assumed. Do not encode Trim Cut. Do not repeat Trim now.

Package-level classification is **AMBIGUOUS**. Production formulas stay frozen.

**BASELINE_RESET_VALIDATION (2026-09-10 23:16) did not recover 1B. STOP.** Weld=3 / Saw=4 / Trim=0 was restored on the General Settings screenshot. Clear Screen, re-Send unchanged asdd, and Run Optimization. Machine lengths matched 1B (454 / 1433 / 1003 / 1503 / 1416). Remainders did not:

| Profile | 1B | Reset |
|---------|----|-------|
| KASA | 965 | 960 |
| KANAT | 2203 | 2198 |
| ORTA | 5080 | 5079 |
| CITA | 206 / 6160 | 3178×2 |

That is the Test 3/4 remainder signature. The DC-600 `.dw` SHA-256 matches Test 4; that proves **machine-output identity** for those two runs, not optimizer-remainder identity. Remainders live in the Optimization List / PDF, not in that `.dw` hash.

**Next gate is FP-024C.1 — Optimization State Provenance Audit, not another manufacturing setting and not the 90° control.** It answers one question only:

**Why can identical visible geometry/settings produce different optimization remainder topology?**

Capture, for every run, the exact provenance of the optimizer input and selected result:

1. project/design ID
2. production-plan ID
3. optimization-result/history ID
4. required-parts snapshot
5. stock snapshot
6. offcut/remnant snapshot
7. machine
8. settings snapshot
9. timestamp
10. whether the result was newly solved or reopened/reused

Decisive experiment: **same geometry + Weld 3 / Saw 4 / Trim 0 + same stock quantities + fresh project/design + fresh production plan + fresh optimization result.**

| Outcome | Classification |
|---------|----------------|
| Original remainder topology returns (KASA 965 / KANAT 2203 / ORTA 5080 / CITA 206+6160) | **PERSISTED STATE EFFECT PROVEN** |
| Later topology returns consistently (KASA 960 / KANAT 2198 / ORTA 5079 / CITA 3178×2) | 1B depended on other hidden state / alternative optimizer solution |
| Repeated fresh runs produce different topology | optimizer nondeterminism or tie-breaking variability |
| Inputs cannot be proven identical | **AMBIGUOUS** |

Do not compare only total utilization. Compare the bar-by-bar assignment signature: profile, stock-bar identity/ordinal, piece sequence, packed lengths, and remainder. Two optimizations can have the same utilization and different topology.

A single fresh run cannot claim consistency. `ALTERNATIVE_OPTIMIZER_SOLUTION` needs three equivalent newly solved runs. `PERSISTED_STATE_EFFECT_PROVEN` requires a captured reused/reopened counterpart plus a genuinely fresh solve under proven-identical input fingerprints. Missing provenance never becomes `IDENTICAL`.

See `docs/audits/FP-024C1-OPTIMIZATION-STATE-PROVENANCE_2026-09-10.md`.

Do not change formulas, kerf accounting, K-factor, Cut identity, or settings semantics. Do not run the 90° CONTROL_FIXTURE. No manufacturing score moves until FP-024C.1 explains the optimizer-state discrepancy.

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
→ FP-024C ⏸ STATE PROVENANCE INVESTIGATION (this branch)
→ FP-024C.1 Optimization State Provenance Audit (next)
→ FP-016  (after credible physical parity)
→ FP-017
```

Physical-length score stays **6.0/10**. It must not move until FP-024C.1 explains the optimizer-state discrepancy.

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
