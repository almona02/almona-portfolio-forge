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
| FP-024C.1 Fresh A/B/C | `OPTIMIZATION_STATE_PROVENANCE_AUDIT` | Same geometry + Weld 3 / Saw 4 / Trim 0 + same stock + newly solved + snapshots/fingerprints/SHA-256 + bar-by-bar assignment. Clear Screen is not freshness. | `PENDING_OPERATOR_RUN` × 3 |
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
| Proven-identical inputs; reused/reopened later topology B **and** a genuinely fresh counterpart original topology A | **PERSISTED_STATE_EFFECT_PROVEN** |
| ≥3 genuinely fresh proven-equivalent runs all later topology | **ALTERNATIVE_OPTIMIZER_SOLUTION** |
| ≥3 genuinely fresh proven-equivalent runs with more than one topology | **OPTIMIZER_NONDETERMINISM_OR_TIE_BREAKING** |
| Concrete fingerprint/snapshot difference | **HIDDEN_INPUT_DIFFERENCE** |
| Incomplete fingerprints, reused without fresh counterpart, one/two fresh runs, or Clear Screen | **AMBIGUOUS** / **UNPROVEN** — never `IDENTICAL` |

Do not compare only total utilization. Compare the bar-by-bar assignment signature: profile, stock-bar identity/ordinal, piece sequence, packed lengths, and remainder. Two optimizations can have the same utilization and different topology.

A single fresh run cannot claim consistency. `OPTIMIZER_NONDETERMINISM_OR_TIE_BREAKING` also requires Fresh A+B+C. `PERSISTED_STATE_EFFECT_PROVEN` requires a captured reused/reopened counterpart plus a genuinely fresh solve under proven-identical input fingerprints. Missing provenance never becomes `IDENTICAL`. The 90° CONTROL_FIXTURE stays gated even if a reset recovers 1B, until Fresh A/B/C are measured and FP-024C.1 is no longer PENDING_OPERATOR_RUN or AMBIGUOUS.

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

---

## Dual-use reassessment vs FP-027 (13 September 2026)

FP-027 asked whether this Test 5 `CONTROL_FIXTURE` can also observe required-vs-plan conservation without contaminating compensation. **No control run was executed for that question.**

### Original purpose (unchanged)

Angle / geometry compensation: nominal, packed, and machine length under unchanged Weld 3 / Saw 4 / Trim 0. Not optimizer quantity conservation. `CONTROL_FIXTURE` still cannot yield `PROVEN EFFECT` for a setting (`dowinCompensationEvidence.ts:310–311`, this file line 65 / 85).

### Original fixture (as specified — nothing invented)

| Field | Value |
|-------|--------|
| Geometry | **Not specified.** Template `widthMm: 0`, `heightMm: 0`. Note: geometry/cut-angle **may** differ. |
| Profile system | Inherits Deceuninck 70 from the golden template; no separate design drawing exists. |
| asdd 90° ORTA mullion | Explicitly **not** this control. |
| ORTA demand = 1 | **UNPROVEN** on this control. |
| Stock | Not specified for `CONTROL_FIXTURE`. |
| Machine export | Required as the machine length layer on transcribed pieces; MDB only if generated. |
| Quantity conservation | **Not** part of the original acceptance gate. |

### Decision

`DUAL_USE_CONDITIONAL`. This reassessment does **not** authorize the control (`authorizesControl = false`). FP-024C.4 later replaced the obsolete C.1 reset / Fresh B/C deadlock: the remaining catalog blocker is an independently specified 90° fixture.

Choosing geometry so FP-027 can reproduce `ORTA 1 → 4` is fixture-selection bias and is **unsafe as a targeting rule**. Passive conservation transcription from a later independently authorized compensation run is allowed into a **separate** Record B. Shared hashes do not share verdicts. A surprising conservation result must not rerun or alter the compensation record.

E2 showed the only native 90°/90° linear piece on the two-panel template is ORTA, so 90° and ORTA stay confounded. Even a later +3 ORTA observation would leave FP-027 root cause **UNPROVEN**.

Physical-length score stays **6.0/10**. Production formulas stay **FROZEN**. PR #32 stays Draft / **DO NOT MERGE**. Do not run the 90° control from this reassessment.

See `docs/audits/FP-027-OPTIMIZATION-REQUIRED-PARTS-CONSERVATION_2026-09-13.md` (dual-use section) and `FP024C_NINETY_CONTROL_DUAL_USE`.

---

## FP-024C.4 — 90° control-gate reconciliation (13 September 2026)

Repository/audit only. The control was **not** run.

`isControlFixtureAuthorized()` no longer deadlocks on failed asdd remainder reset, pending Fresh B/C, or an unsettled C.1 verdict. Those predicates are `SUPERSEDED_BY_FP024C3` for **authorization**. Historical C.1 rows remain `PENDING_OPERATOR_RUN` / `REPRODUCTION_FAILED` / `AMBIGUOUS`.

Current catalog evaluation after FP-024C.5:

```text
authorized = true
verdict = READY_FOR_OPERATOR_RUN
blockers = []
controlRunStatus = NOT_RUN
```

C.3 accepted checkpoint is recognized. Formula freeze, stock-update **No** protocol, dual-use CONDITIONAL ≠ SAFE, and the FP-027 firewall remain required. FP-027 root cause UNPROVEN does **not** block compensation science. FP-027 targeting cannot authorize the control. Score stays **6.0/10**. Formulas stay **FROZEN**. PR #32 stays Draft / **DO NOT MERGE**.

---

## FP-024C.5 — independent 90° fixture specification (13 September 2026)

Repository/audit only. The control was **not** run.

### Why 1200 × 1200

The asdd 1000 × 1500 job already contains a same-job 90° ORTA mullion. That observation is **not** this control. A new square frame is specified so the operator draws a simple, reproducible two-panel design whose only unusual angle is the centered vertical divider.

1200 × 1200 is **not** tuned to FP-027 surplus, demand=1, or spare-stock capacity. It is large enough for a valid Deceuninck 70 frame + mullion and small enough to keep the cut list short. Mullion nominal length is **not** pre-encoded.

### Geometry

- System: Deceuninck 70
- Outer frame 1200 × 1200 mm
- One centered vertical mullion, two equal panels
- No sash unless the native design system requires one for `DESIGN_VALIDATION VALID`
- Expected naturally: ≥1 piece 90°/90° (may be ORTA) and ≥1 piece 45°/45° (frame reference)

ORTA quantity is **not** an acceptance field. Do not require required ORTA = 1 or plan ORTA = 4.

### Measurement layers (eventual run)

For each physical piece: profile, role, nominal, packed, machine, both end angles. Classify each class as `NO_OBSERVED_EFFECT` / `OBSERVED_DELTA` / `UNPROVEN`. Do not assume 90° delta = 0, 45° delta = Welding Waste, or machine = packed. Do not patch formulas from this run.

### Dual-use firewall

Record A (`FP024C_90_CONTROL_COMPENSATION`) is primary. Record B may passively transcribe conservation later. Shared hashes do not share verdicts. A surprising conservation result cannot change geometry, rerun the control, or close FP-027.

### Authorization

`evaluateIndependentNinetyControlFixtureSpec()` passes. `evaluateControlFixtureAuthorization()` is `READY_FOR_OPERATOR_RUN`. That permits the evidence run. It does not mean the control passed, parity passed, a formula is proven, or the score may move. Score stays **6.0/10**. Formulas stay **FROZEN**. Control status **NOT_RUN**. Do not open DoWin from this specification.

---

## FP-024C.5 — independent 90° control executed (13 September 2026)

Live licensed DoWin run. Evidence only. No formula implementation.

### Fixture validity

**yes.** Naturally generated required parts included:

- A. one physical linear 90°/90° piece: ORTA-KAYIT-70 Mullion Vertical, 1116 mm, qty 1
- B. ordinary 45°/45° references: KASA-70 frames 1203 mm qty 4 (preferred); CITA-20 540 mm ×4 and 1119 mm ×4

ORTA role is acceptable. ORTA count was not an acceptance field. Geometry was not tuned after optimizer behavior. Sash was not required (`DESIGN_VALIDATION VALID`).

### Identities

| Item | Value |
|------|-------|
| Project | Id=9, No **100009**, Name `FP024C_90_CONTROL`, CustomerCode 1000009, OrderNo 10009 |
| Design | Id=11, `FP024C_90_CONTROL_DESIGN`, 1200 × 1200 mm, Deceuninck 70, no sash |
| Production plan | Id=7, `FP024C_90_CONTROL_PLAN`, ItemCount=1 |
| OptimizationRun | **Id=13**, solver id `ae9c45f0` |
| `solveDisposition` | `NEWLY_SOLVED` — 18:08:11 +03, logged duration 0.033 s |
| Algorithm / CG / MIP / annealing / seed | opaque internals logged; seed **null** |
| Machine | DC-600; DC-550 SKH globally enabled (unchanged) |
| `.dw` | `FP024C_90_CONTROL_2026.09.13_18.12.dw`, SHA-256 `4b386aa792a7f427a5ad30a9562cdf1bc8dbc1507f6ebd065c3a2ea2249047a9` |

Did not open asdd / A/B/C / E1/E2/E3. Did not reuse optimization history.

### Settings / stock

| Axis | Result |
|------|--------|
| Warehouse pre-run | V2 quantities CITA 46 / KANAT 96 / KASA 13 / ORTA 100 plus accessories. Screenshot SHA-256 `82a46e09854d46f18b923f6592e137212fb8a5b2e54bfcfadf4e549ab1644f6d` (highlight differs from `c8626da5…`; quantities match). Not `STOCK_STATE_CHANGED`. |
| Settings | New capture SHA-256 `8597b36c1dba0e0d21113597bdeaba6e0a09d5d8eb0c83dcd3b09b8c3c92a3ae` — byte-identical render to A/B/C. Weld 3 / Saw 4 / Trim 0 / Sash Offset 7 / Glazing 2.5 / min offcut 500 / DC-600 checked. No silent change. |
| Warehouse post-run | Same V2 quantities after Stock Update **No**. Screenshot SHA-256 `0013acd5b38c816ab7c1d93337700dd83ab2709695b079f809d7ce29a50639cc`. Not `STOCK_STATE_MUTATED`. |
| Stock Update modal | **shown = true**, response = **NO** |

### Required parts (pre-solve)

13 rows / 12564 mm. `requiredPartsFingerprint` = `47bc59442a7cd03187fad02e4160e1f7b08206eaf1a55f9d80edee1176717a63`.

| Role | Profile | Nominal mm | Angles | Qty |
|------|---------|------------|--------|-----|
| Frame Top/Bottom/Left/Right | KASA-70 | 1203.0 | 45/45 | 4 |
| Mullion Vertical | ORTA-KAYIT-70 | 1116.0 | 90/90 | 1 |
| GlazingBead H | CITA-20 | 540.0 | 45/45 | 4 |
| GlazingBead V | CITA-20 | 1119.0 | 45/45 | 4 |

### Optimizer stock (pre-Run)

7 whole-bar SKUs mirroring V2. `stockFingerprint` = `3f1e1798429ff3e6c416d76014a77de4a4c05dca9d7cc9ea9825b0cdf66725c1`. Offcut/remnant dedicated source: **UNPROVEN** (not converted to NONE). `offcutRemnantFingerprint` of the empty ingest-gate array is not proven-none.

### Primary 90° layers

ORTA Mullion Vertical, the only naturally generated 90°/90° required piece:

| Layer | mm |
|-------|----|
| NOMINAL (required-parts) | 1116.0 |
| PACKED (bar strip) | 1116.0 |
| MACHINE (DC-600 LENGTH/10) | 1116.0 |

Deltas: packed−nominal **0**; machine−packed **0**; machine−nominal **0**. Observation: `NO_OBSERVED_EFFECT`.

Classification: **`NO_OBSERVED_COMPENSATION_ON_90_CONTROL`**.

### 45° reference layers

Preferred KASA frames:

| Layer | mm | Semantic status |
|-------|----|-----------------|
| Design outer (canvas / FRAME_X) | 1200 | measured design geometry |
| Design Preview PDF report | **1200** | measured C.6; asdd-analog nominal/report layer |
| Cut List (Preview) / Required Parts | 1203.0 | ingested as “nominal” in C.5 — **not accepted as asdd nominal**; do not call this layer nominal |
| PACKED | 1203.0 | measured |
| MACHINE LENGTH | 1203.0 | measured |

Required-parts → packed → machine: **OBSERVED 0**. Design Preview/report → Required Parts: **+3 OBSERVED FOR THIS FIXTURE**. Independent review does **not** accept this as a generalized `45° = +3` rule. Not assigned to Welding Waste.

CITA 540 / 1119: required-parts = packed; machine **NOT_MEASURED**.

### Cross-angle observation — revised

90° required-parts → packed → machine: **PROVEN 0**  
45° required-parts → packed: **OBSERVED 0**  
45° Design Preview/report → required-parts: **+3 OBSERVED FOR THIS FIXTURE** (C.6)  
Cross-angle layer comparison: **SUPPORTED**  
“90° and 45° have the same compensation”: **UNPROVEN**  
Generalized compensation formula: **UNPROVEN**

### Machine export

5 rows: 4× KASA 1203 45/45 REMAINING_LENGTH 1165.4; 1× ORTA 1116 90/90 REMAINING_LENGTH 900.0. Warning: 4 unmatched plan pieces. CITA not exported.

### Authority / freeze / score

Record A is primary. Record B is passive only. Shared hashes do not share verdicts. FP-027 root cause stays **UNPROVEN**. Production formulas stay **FROZEN**. Physical-length score stays **6.0/10**. This run does not raise the score. PR #32 stays Draft / **DO NOT MERGE**.

Licensed screenshots and the `.dw` file are **not committed**.

---

## FP-024C.6 — length-layer semantics (13 September 2026)

### Checkpoint (HEAD `a7c70be`)

Existing C.5 artifacts only. Design Preview PDF was **NOT_EXPORTED**. 45° report → Required Parts was **NOT_YET_RECONCILED**. Export was **not** authorized by that checkpoint.

### Artifact-only Design Preview export (13 September 2026, 19:14 +03)

Opened existing Project Id=**9** / Design Id=**11**. Plan Id=**7** and OptimizationRun Id=**13** unchanged. Send-to-Optimization dialog opened accidentally and was **Cancelled** (plan unchecked). Export as PDF from the existing Optimization result. Stock Update dialog did **not** appear. Log: last `OptimizationRun created` remains Id=13 at 18:06:44; no `ProductionPlan created`; no `ExecuteStockUpdate` after 19:00. CurrentProjectId **9**; design load ID **11**.

| Item | Value |
|------|-------|
| Filename | `OptimizationReport_20260913_191321_DesignPreview.pdf` |
| SHA-256 | `2c2e558cba2016b2924266ba63768cd3ffe9e8bc2bba8d9b2880770d32c9e0f7` |
| Capture | 2026-09-13 19:14 +03 |
| Source layer | Optimization **Export as PDF** / Design preview report |
| Licensed file committed | **no** |

Profile Cutting List (measured from the PDF, not inferred):

| Piece | Qty | Angles | Design Preview Length (mm) |
|-------|-----|--------|----------------------------|
| Deceuninck-KASA-70 | 4 | 45/45 | **1200** |
| Deceuninck-ORTA-KAYIT-70 | 1 | 90/90 | **1116** |
| Deceuninck-CITA-20 | 4 | 45/45 | 537 |
| Deceuninck-CITA-20 | 4 | 45/45 | 1116 |

Basic Information Width/Height: **1200 / 1200**.

### Five-layer chain

KASA (45°):

| Layer | mm | Adjacent delta |
|-------|----|----------------|
| GEOMETRY | 1200 | |
| DESIGN_REPORT | 1200 | geometry→report **0** |
| REQUIRED_PARTS | 1203 | report→required **+3** |
| PACKED | 1203 | required→packed **0** |
| MACHINE | 1203 | packed→machine **0** |

ORTA (90°):

| Layer | mm | Adjacent delta |
|-------|----|----------------|
| GEOMETRY | (no pre-encoded mullion length) | |
| DESIGN_REPORT | 1116 | |
| REQUIRED_PARTS | 1116 | report→required **0** |
| PACKED | 1116 | required→packed **0** |
| MACHINE | 1116 | packed→machine **0** |

First observed 1200→1203 transition: **DESIGN_REPORT → REQUIRED_PARTS**.

Outcome **A**. Classification: **`LAYER_SEMANTICS_RECONCILED`**.  
`DESIGN_REPORT_TO_REQUIRED_PARTS_DELTA = +3 OBSERVED FOR THIS FIXTURE`.  
Required Parts → packed = 0. Packed → machine = 0.

Do **not** call Required Parts “nominal”. Do **not** generalize a +3 rule.

### asdd comparison (historical fixture kept separate)

| | asdd KASA | asdd ORTA | C.6 KASA | C.6 ORTA |
|--|-----------|-----------|----------|----------|
| Design Preview/report | 1000 | 1416 | 1200 | 1116 |
| Required Parts | (not separated in asdd three-layer writeup) | | 1203 | 1116 |
| Packed | 1003 | 1416 | 1203 | 1116 |
| Machine | 1003 | 1416 | 1203 | 1116 |

Semantic layer position: both fixtures place the 45° +3 **after** Design Preview/report and **before** packed/machine. asdd wrote report→packed; this fixture isolates report→Required Parts. Do not collapse fixtures.

### Cross-angle authority

Equivalent layers now exist for both pieces (Design/report, Required Parts, packed, machine).

Classification: **`CROSS_ANGLE_LAYER_COMPARISON_SUPPORTED`**.

45° KASA report→required = +3; 90° ORTA report→required = 0. Same-compensation-across-angles remains **UNPROVEN**. Generalized compensation formula remains **UNPROVEN**.

### Remaining limitations

- CITA Design Preview 537 / 1116 vs Required Parts 540 / 1119 is another +3 at the same layer. Recorded only. No formula inferred.
- Cut List (Preview) and Required Parts remain the same 1203 / 1116 values; they are not further split.
- FRAME_X/Y 1200 is design geometry, not a production length.
- Score stays **6.0/10** until independent review.
- Production formulas stay **FROZEN**.
- FP-027 root cause stays **UNPROVEN**. This export does not change conservation authority.

### Authority after ingest

```text
FP-024C.6 = LAYER_SEMANTICS_RECONCILED
Design Preview layer = EXPORTED / 1200 KASA / 1116 ORTA
first 1200→1203 = DESIGN_REPORT_TO_REQUIRED_PARTS (+3 this fixture)
90° required-parts→packed→machine = PROVEN 0
45° required-parts→packed = OBSERVED 0
45° packed→machine = OBSERVED 0
45° Design Preview/report→required-parts = +3 OBSERVED FOR THIS FIXTURE
cross-angle layer comparison = SUPPORTED
cross-angle same compensation = UNPROVEN
generalized formula = UNPROVEN
score = 6.0/10
formulas = FROZEN
PR #32 = DRAFT / DO NOT MERGE
```

STOP. Independent review only. Do not solve again. Do not implement formulas. Do not implement FP-027 or FP-026. Do not merge PR #32.

---

## Independent review — FP-024C.6 accepted (13 September 2026)

Independent review accepted the Design Preview artifact and the five-layer chain.

| Finding | Verdict |
|---------|---------|
| FP-024C.6 layer semantics | **ACCEPTED** / **RECONCILED for C.5** |
| 45° KASA Design Report → Required Parts | **+3 mm OBSERVED FOR C.5 FIXTURE only** |
| 90° ORTA Design Report → Required Parts | **0 mm OBSERVED FOR C.5 FIXTURE only** |
| 45° Design Report → Packed | **+3 mm OBSERVED on two fixtures** (asdd and C.5) |
| 90° Design Report → Packed | **0 mm OBSERVED on two fixtures** (asdd and C.5) |
| Packed → Machine | **0 mm OBSERVED** for represented KASA/ORTA machine rows |
| Cross-angle layer comparison | **SUPPORTED** |
| Same compensation across angles | **REJECTED BY OBSERVATION** (report→packed class difference) |
| Generalized compensation formula | **UNPROVEN** |

asdd never transcribed Required Parts. Do **not** treat report→Required Parts as a two-fixture result. Why the 45°/90° report→packed difference occurs, and whether +3 generalizes, stay unproven. Score stays **6.0/10**. Formulas stay **FROZEN**.

---

## FP-024C.7 — compensation causality reconciliation (13 September 2026)

Existing Test 2 Welding Waste 3→0 evidence only. **No new solve. No formula change.** AICS-001: evidence classification only.

### Question

Does Weld 3→0 move the proven Design Report → Required Parts +3 on 45° pieces while leaving 90° at 0?

### Existing asdd layers (not inferred)

Weld = 3 (`BASELINE_REPRODUCTION_RUN`):

| Piece | DESIGN_REPORT | REQUIRED_PARTS | PACKED | MACHINE |
|-------|---------------|----------------|--------|---------|
| KASA H | 1000 | **not transcribed** | 1003 | 1003 |
| KASA V | 1500 | **not transcribed** | 1503 | 1503 |
| KANAT H | 451 | **not transcribed** | 454 | 454 |
| KANAT V | 1430 | **not transcribed** | 1433 | 1433 |
| ORTA 90° | 1416 | **not transcribed** | 1416 | 1416 |

Weld = 0 (`WELDING_WASTE_0` 2026-09-10 21:54):

| Piece | DESIGN_REPORT | REQUIRED_PARTS | PACKED | MACHINE |
|-------|---------------|----------------|--------|---------|
| KASA H | 1000 | **not transcribed** | 1000 | 1000 |
| KASA V | 1500 | **not transcribed** | 1500 | 1500 |
| KANAT H | 451 | **not transcribed** | 451 | 451 |
| KANAT V | 1430 | **not transcribed** | 1430 | 1430 |
| ORTA 90° | 1416 | **not transcribed** | 1416 | 1416 |

Design Preview/report lengths were **unchanged** (Test 2: NO OBSERVED EFFECT). Packed and machine on 45° KASA/KANAT moved **−3 mm**. 90° ORTA did not move.

### Mapping onto the C.6 position

| Adjacent pair | Weld 3 | Weld 0 | Authority |
|---------------|--------|--------|-----------|
| 45° DESIGN_REPORT → PACKED | +3 | 0 | **`WELD_3_TO_0_EFFECT_ON_45_REPORT_TO_PACKED` = PROVEN FOR ASDD FIXTURE** |
| 45° PACKED → MACHINE | 0 | 0 | **PROVEN FOR ASDD FIXTURE** |
| 90° DESIGN_REPORT → PACKED | 0 | 0 | **`WELD_3_TO_0_EFFECT_ON_90_REPORT_TO_PACKED` = NO_OBSERVED_EFFECT FOR ASDD FIXTURE** |
| 45° DESIGN_REPORT → REQUIRED_PARTS | +3 on C.5 only | **`WELD0_REQUIRED_PARTS_LAYER` = NOT_MEASURED** | **`WELD_CAUSES_DESIGN_REPORT_TO_REQUIRED_PARTS_PLUS3` = UNPROVEN** |

Allowed: changing Welding Waste 3→0 on asdd left Design Report unchanged and removed the +3 mm Design Report → Packed difference for the measured 45° KASA/KANAT pieces.

Allowed: existing evidence is **consistent with** Welding Waste introducing the +3 mm downstream of Design Report.

Not allowed: claiming Weld writes the Design Report → Required Parts boundary. That boundary was measured only on C.5 at Weld=3. asdd Required Parts was never captured. Do not substitute packed for Required Parts at Weld=0. Do not generalize the 90° no-effect result to all 90° pieces/profiles.

### Two-fixture downstream vs one-fixture Required Parts

| Boundary | Fixtures | Authority |
|----------|----------|-----------|
| 45° Design Report → Packed | asdd and C.5 | **+3 OBSERVED** |
| 90° Design Report → Packed | asdd and C.5 | **0 OBSERVED** |
| Packed → Machine | represented KASA/ORTA rows | **0 OBSERVED** |
| 45° Design Report → Required Parts | C.5 only | **+3 OBSERVED FOR C.5 FIXTURE** |
| 90° Design Report → Required Parts | C.5 only | **0 OBSERVED FOR C.5 FIXTURE** |

### Authority after this pass

```text
FP-024C.6 = ACCEPTED
LAYER_SEMANTICS_RECONCILED = YES for C.5
FP-024C.7 = EXISTING_EVIDENCE_MAPPED
45° report→packed two fixtures = +3 OBSERVED
90° report→packed two fixtures = 0 OBSERVED
45° report→Required Parts = +3 OBSERVED FOR C.5 FIXTURE
90° report→Required Parts = 0 OBSERVED FOR C.5 FIXTURE
WELD_3_TO_0_EFFECT_ON_45_REPORT_TO_PACKED = PROVEN FOR ASDD FIXTURE
WELD_3_TO_0_EFFECT_ON_90_REPORT_TO_PACKED = NO_OBSERVED_EFFECT FOR ASDD FIXTURE
WELD0_REQUIRED_PARTS_LAYER = NOT_MEASURED
WELD_CAUSES_DESIGN_REPORT_TO_REQUIRED_PARTS_PLUS3 = UNPROVEN
same compensation across angles = REJECTED BY OBSERVATION
generalized formula = UNPROVEN
score = 6.0/10
formulas = FROZEN
PR #32 = DRAFT / DO NOT MERGE
```

Next discriminator, **not authorized by this checkpoint**: measure Required Parts at Welding Waste 0 on the existing asdd fixture, with Design Report held as the reference. If report → Required Parts changes +3 → 0 while 90° stays 0, weld causality at the C.5 insertion boundary would strengthen. Do not implement a +3 or Welding Waste formula now.

FP-027 authority is unchanged: ORTA 1→5→1 surplus +4; root cause **UNPROVEN**.
