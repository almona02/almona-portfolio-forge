# FP-027 — Optimization Required-Parts Conservation (E3 / E1 / E2)

| Field | Value |
|-------|--------|
| Date | 13 September 2026 |
| Branch | `feature/fp024c-physical-parity` |
| Experiment | E3 measured; E1/E2 negative fixtures; **90° dual-use = CONDITIONAL** — control not run |
| Gate | 🔓 **FORENSICS OPEN** |
| Root cause | **UNPROVEN** |
| Fix | **NOT IMPLEMENTED** |
| Production formulas | **FROZEN** |
| Physical-length score | **6.0/10** unchanged |
| 90° CONTROL_FIXTURE | **GATED** |
| FP-026 | NAME ONLY / **NOT IMPLEMENTED** |
| PR #32 | Draft / **DO NOT MERGE** |

Predecessor: `docs/audits/FP-027-REQUIRED-PARTS-CONSERVATION-FORENSICS_2026-09-13.md`. E1 and E2 are accepted as negative fixtures (not solved).

---

## Identities

| Item | Value |
|------|-------|
| Project | Id=6, No **100006**, Name `FP027_E3_KASA_SPARE`, OrderNo 10006 |
| Design | Id=8, `E3_KASA_SPARE`, 500 × 500 mm, Deceuninck 70, `DESIGN_VALIDATION VALID` |
| Production plan | Id=6, `E3_KASA_SPARE_PLAN`, ItemCount=1 |
| OptimizationRun | **Id=12**, solver id `b5445400` |
| `solveDisposition` | `NEWLY_SOLVED` — 16:26:34 +03, logged duration 0.03 s / PERF 2604 ms |
| Machine | DC-600 double head cutting machine |
| `.dw` | `FP027_E3_KASA_SPARE_2026.09.13_16.31.dw`, SHA-256 `e06a1e6d…` |

Created as a new project after **Clear Selection** on RUN_C. Log: `CurrentProjectId değişti:` (empty) then `Project saved. Id=6`. RUN_C was not updated.

---

## Settings / stock verification

| Axis | Result |
|------|--------|
| Warehouse pre-run | **IDENTICAL to baseline V2** — Management Panel capture SHA-256 `c8626da5166731e393a74ae731b663410ef77f2bde2b05bcfa572531e6c32012`, cards CITA 46 / KANAT 96 / KASA 13 / ORTA 100 |
| Warehouse post-run | **IDENTICAL to V2** — same hash after answering **No** to Stock Update; zero `ExecuteStockUpdateCoreAsync` lines in `app-20260913.log` |
| Settings | Independent capture `e3-settings-20260913-160944`. Full-window SHA-256 `ff5fcf43…` differs from A/B/C `8597b36c…` only in the top 31 px title-bar focus tint (59 760 pixels). Content region 1936×1017 SHA-256 `e000c1ce…` — **byte-identical** to RUN_A / RUN_B / RUN_C |
| Required settings | Welding Waste **3**, Saw Thickness **4**, Trim Cut **0**, Sash Offset **7**, Glazing Clearance **2.5**, Minimum Offcut Length **500**, DC-600 checked |
| Optimizer stock | 7 whole-bar SKUs mirroring V2, including KASA 6000 qty **13** and CITA 6500 qty **46**. No remnant rows. Offcut/remnant inventory axis remains **UNPROVEN** |

No stock or settings repair was required. Experiment proceeded.

---

## Required parts (pre-solve, not inferred)

Generated naturally from a **Fixed single panel** 500 × 500 mm Deceuninck 70 design. Dimensions were not tuned after the solve. No sash, no ORTA. Glazing beads were generated automatically and could not be avoided without abandoning a valid design; they are recorded.

| Assembly | Profile | Packed mm | Angles | Qty |
|----------|---------|-----------|--------|-----|
| Frame Top / Bottom / Leftt / Right | Deceuninck-KASA-70 | 503.0 | 45 / 45 | 4 |
| GlazingBead Top / Bottom / Left / Right | Deceuninck-CITA-20 | 419.0 | 45 / 45 | 4 |

Footer: Total Length 3688 mm, Total Quantity 8. Optimizer Required Parts panel, pre-solve: KASA 503 qty **4**, CITA 419 qty **4**. Cutting plan empty.

### One-bar feasibility (computed before the solve)

| Profile | Demand | Stock bar | Packed + kerf (4 mm × 3) | Spare | Another piece fits? |
|---------|--------|-----------|--------------------------|-------|---------------------|
| KASA-70 | 4 × 503 | 6000 | 2024 | ~3976 | **yes, ~7 more** |
| CITA-20 | 4 × 419 | 6500 | 1688 | ~4812 | **yes, ~11 more** |

E3 therefore tests the spare-capacity condition on **two** non-ORTA, 45°/45°, non-zero-price profiles at once.

---

## Solver-stage observations

Logged once. No rerun.

```text
OP_START id=b5445400 | 2 parça, 7 stok
HİBRİT Column Generation Loop
MIP Maliyet ve Stok Limiti Odaklı → OPTIMAL | 1 stok, 1 layout | cost 6000.00
TAVLAMA BENZETİMİ MaxIter 210, T 100
HİBRİT Column Generation Loop
MIP → OPTIMAL | 1 stok, 1 layout | cost 3250.00
TAVLAMA BENZETİMİ MaxIter 210, T 100
OptimizationRun updated Id=12 Status=Success Yield=29.5 %
Plan: 2 desen, kullanılan stok: 2, kesilemeyen: 0
```

Cost 6000.00 = 6.0 m × 1000 TL/m (KASA). Cost 3250.00 = 6.5 m × 500 TL/m (CITA). Seed: **not exposed**. Piece multiplicity inside each layout: **unobservable**.

---

## Plan pieces / bar topology

| Bar | Profile | Stock | Apps | Packed segments | Used | Remaining | Yield |
|-----|---------|-------|------|-----------------|------|-----------|-------|
| 1 | CITA-20 | 6500 | 1 | 419, 419, 419, 419 | 1676.00 | **4801.37** | 26.7 % |
| 2 | KASA-70 | 6000 | 1 | 503, 503, 503, 503 | 2012.00 | **3965.37** | 33.9 % |

Header: Duration 0.03 s, Total Bars **2**, Overall Yield 29.5 %, Total Offcut 8767 mm. Remainder cells magnified (CITA 4801.37 confirmed under row highlight).

Utilization is recorded and **not** used as conservation evidence.

---

## Required-vs-plan conservation table

| Profile | requiredCount | planCount | deltaCount | requiredLengthMm | planLengthMm | deltaLengthMm | barCount | remainderMm |
|---------|---------------|-----------|------------|------------------|--------------|---------------|----------|-------------|
| Deceuninck-KASA-70 | 4 | 4 | **0** | 2012 | 2012 | 0 | 1 | 3965.37 |
| Deceuninck-CITA-20 | 4 | 4 | **0** | 1676 | 1676 | 0 | 1 | 4801.37 |

No unexpected profiles appeared.

```text
E3_KASA_CONSERVATION = EXACT
CITA on the same fixture = EXACT
CROSS_PROFILE_CONSERVATION_VIOLATION = NOT_OBSERVED
GENERALIZATION_NOT_SUPPORTED_BY_E3
```

Classification A: **EXACT_CONSERVATION**. Piece demand is the invariant; yield 29.5 % and ~4000–4800 mm spare were ignored for that decision.

---

## Machine export

Exported to DC-600 because the protocol permits it when safe, as an export-layer control.

| Item | Value |
|------|-------|
| Dialog | `Export successful. 4 types of parts (total 4 pieces)` — **no** unmatched-pieces warning |
| Stock Update | Shown. Operator answered **No**. |
| Table1 rows | **4**, all `Deceuninck-KASA-70` |
| LENGTH | `5030.0` → **503.0 mm** |
| Angles | 450 / 450 → **45.0° / 45.0°** |
| FRAME_X / FRAME_Y | 5000 / 5000 → **500 × 500 mm** |
| REMAINING_LENGTH | `39654` → **3965.4 mm** |
| CITA in export | **0** — beads excluded, same as A/B/C |

Plan remainder 3965.37 mm vs machine remainder 3965.4 mm: the field is integer tenths of a millimetre, so the stored value is the plan remainder at that precision. When the plan conserves, the machine remainder matches the physically relevant remainder rather than a surplus-filled one.

This is consistent with `REMAINDER_NOT_RECOMPUTED_AFTER_EXPORT_MATCH_FILTER = SUPPORTED` (copied from the plan). It does not newly prove the mechanism, and it is **not patched**.

Required 8 / plan 8 / machine 4 (KASA only). The four missing machine rows are CITA beads, not surplus KASA.

---

## Post-run stock

UI authoritative: Stock Management recapture SHA-256 `c8626da5…` — byte-identical to V2.

Log supplementary: no `ExecuteStockUpdateCoreAsync` anywhere in `app-20260913.log`.

```text
warehouse immutability = IMMUTABLE_VERIFIED
```

---

## Hypothesis update

| Hypothesis | After E3 | Why |
|------------|----------|-----|
| H1 — demand `>=` / over-satisfaction | **WEAKENED** as the simple “any spare capacity will visibly overproduce” reading | KASA (and CITA) had room for many extra pieces on a already-paid bar and conserved. A `>=` constraint whose objective still discourages KASA surplus remains live. E3 does **not** prove the constraint is `=`. |
| H2 — pattern / bar-fill | **WEAKENED** | KASA and CITA both conserved under large spare capacity in E3, in addition to KANAT/CITA in A/B/C. Not mathematically ruled out for every profile. |
| H3 — ORTA-specific condition | **STRENGTHENED as the remaining live set** | Still unresolved. Surviving candidates include 90°/90°, demand = 1, single-length demand, mullion role, zero unit price / 6.50 objective, and opaque post-processing. |

E3 does **not** say “both leading hypotheses are disproven.” Root cause remains **UNPROVEN**.

Remaining confounds (unchanged by one no-surplus result): demand-of-one special case, 90° semantics, single-length-demand effects, objective/cost differences (ORTA priced 0 vs KASA 1000 TL/m), profile-class handling, hidden post-processing, and a permissive `>=` constraint that is invisible when the objective does not reward surplus.

---

## Authority after E3

| Finding | Verdict |
|---------|---------|
| E3 created / solved | **yes / yes** — one fresh solve |
| E3 KASA conservation | **EXACT_CONSERVATION** |
| E3 CITA conservation | **EXACT_CONSERVATION** |
| Cross-profile overproduction | **NOT OBSERVED** |
| Generalization of the A/B/C ORTA surplus | **NOT_SUPPORTED_BY_E3** |
| A/B/C `21 → 24` ORTA surplus | **unchanged** — `REPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS` |
| FP-027 root cause | **UNPROVEN** |
| FP-027 gate | **FORENSICS OPEN** — E3 does not close it |
| `FIRST_LAYER_OF_COUNT_DIVERGENCE` | **UNPROVEN** — still bounded to CG → MIP → annealing |
| Export remainder-copy finding | **SUPPORTED** — not patched |
| Formula change authorized | **no** |
| Demand-inequality formulation proven | **no** |
| E1 / E2 | **NEGATIVE FIXTURES** — neither solved |
| 90° | **GATED** |
| FP-026 | **not implemented** |
| ALMONA engines | still structurally quantity-bounded; invariant still unasserted |

---

## Tests / freeze

- `npm run type-check` — clean
- vitest: `dowinOptimizationStateProvenance.test.ts`, `dowinCompensationReconciliation.test.ts`
- Pins: root cause `UNPROVEN`; E3 exact conservation cannot close FP-027; E1/E2 negative fixtures cannot close FP-027; E2 cannot authorize the 90° control; dual-use is `DUAL_USE_CONDITIONAL` and does not authorize the control; compensation and conservation verdicts do not share authority; injected rows are invalid evidence; 90° stays gated; FP-026 stays unimplemented
- Formula freeze: no changes to `ManufacturingSettings.ts`, `barPackAccounting.ts`, `UPVCCuttingEngine.ts`, `src/lib/fabricator/production`

---

## Licensed-artifact exclusion

Committed: transcriptions, SHA-256 values, structured evidence, tests, this audit.

Not committed: PDFs, `.dw`, MDB, screenshots, machine binaries. No decompilation. Encrypted shop database not opened.

---

## Independent review — 13 September 2026

E3 is accepted as a **valid discriminator**. FP-027 remains **open**.

The accepted point is not merely that KASA conserved. Under the same solver family, the same controlled stock state, large spare capacity, and 45° pieces, **neither KASA nor CITA overproduced**. That materially weakens a simple “fill spare bar capacity” explanation.

Accepted authority:

| Finding | Verdict |
|---------|---------|
| E3 KASA conservation | **EXACT_CONSERVATION** |
| E3 CITA conservation | **EXACT_CONSERVATION** |
| Cross-profile overproduction | **NOT OBSERVED** |
| Blanket bar-fill hypothesis | **WEAKENED** |
| Simple spare-capacity generalization | **NOT SUPPORTED BY E3** |
| FP-027 root cause | **UNPROVEN** |
| ORTA-specific / demand=1 / 90° / cost interaction | **still live** |

### Next specified experiment — E1 (not authorized)

Target the strongest remaining confound: **demand = 1 vs ORTA / 90° semantics**, on a **non-ORTA** profile.

Required of the fixture, generated from a valid design (no injected cut rows):

- demand exactly 1
- one physical piece
- plenty of room for duplicates on the same bar
- 45° if a valid design emits it
- non-zero cost
- same controlled settings / stock discipline as E3
- answer **No** to Stock Update
- no manual stock edits
- capture required vs plan counts before export

Question: does overproduction appear when demand is 1 on a non-ORTA profile?

| Outcome | Reading |
|---------|---------|
| Yes | demand=1 becomes a strong candidate mechanism |
| No | remaining evidence shifts toward ORTA / 90° / profile-specific handling |

If no valid Deceuninck 70 design naturally emits a single unique 45° non-ORTA piece (window parts usually pair), **STOP** with `UNPROVEN` fixture. Do not inject a row to manufacture demand=1.

E2 is reserved for a 90° non-ORTA or ORTA geometry discriminator **after** E1. The original 90° compensation control stays gated until FP-027's conservation root cause is bounded.

```text
E1 demand=1 non-ORTA
  -> E2 90 non-ORTA or ORTA geometry discriminator
  -> decide whether the original 90 compensation control is still necessary
  -> only after FP-027 conservation root cause is bounded does formula parity resume
```

Restrictions unchanged: no formula changes; score 6.0/10; PR #32 Draft / DO NOT MERGE; root cause UNPROVEN.

---

## E1 — demand=1 non-ORTA fixture discovery

Executed 13 September 2026. **Not solved.** Natural-fixture requirement is mandatory.

### Pre-run stock / settings

| Axis | Result |
|------|--------|
| Warehouse | **IDENTICAL to V2** — `c8626da5…`, cards unchanged |
| Settings | Fresh capture `e1-settings-20260913-164948`. Controlled values match (Weld 3 / Saw 4 / Trim 0 / Sash 7 / Glazing 2.5 / min offcut 500 / DC-600). DC-550 SKH enabled globally. Pixel diff vs E3 is 241 px on the General Settings tab chrome only |

### Identities (project/design only)

| Item | Value |
|------|-------|
| Project | Id=7, No **100007**, `FP027_E1_DEMAND1_NONORTA` |
| Design | Id=9, `E1_DEMAND1_NONORTA`, 1000 × 1500, single-sash, `DESIGN_VALIDATION VALID` |
| Production plan | **not created** |
| OptimizationRun | **not created** — no solve |

### Fixture discovery process

Principled, one native template. Not an edge-case hunt.

1. Catalog: Deceuninck 70 linear-cut roles are Frame (KASA), Sash (KANAT), Mullion (ORTA), Glazing bead (CITA). Support sheet and corner connections are accessories / non-target.
2. E3 already measured a native **fixed single panel**: KASA 4 + CITA 4. No demand=1.
3. E1 used the native **Single sash** template — the first drawing that includes the three preferred non-ORTA profiles together (KASA, then KANAT, then CITA).
4. Add Mullion was **not** used: it would emit ORTA demand=1, which fails the non-ORTA requirement.

Log: `E1_DEMAND1_NONORTA için 12 satır cut list üretildi.` Footer: Total Quantity 12, Total Length 13996 mm.

### Generated required parts (not optimized)

| Profile | Rows | Lengths (mm) | Angles | requiredCount |
|---------|------|--------------|--------|---------------|
| Deceuninck-KASA-70 | 4 | 1003, 1003, 1503, 1503 | 45 / 45 | **4** |
| Deceuninck-KANAT-70 | 4 | 933, 933, 1433, 1433 | 45 / 45 | **4** |
| Deceuninck-CITA-20 | 4 | 813, 813, 1313, 1313 | 45 / 45 | **4** |
| Deceuninck-ORTA-KAYIT-70 | 0 | — | — | **0** |

No profile has `requiredCount = 1`. No accessories counted.

```text
E1_FIXTURE_VALID = NO
E1 classification = E1_FIXTURE_NOT_OBTAINABLE_NATURALLY
solved = no
injected row = no
```

### Why this stops

Window geometry in this system pairs members. The only native odd-count linear-cut role is Mullion, and Mullion is ORTA. Manufacturing a lone KASA/KANAT/CITA row by typing it into the optimizer would be invalid evidence.

Demand=1 as a mechanism is therefore **not tested**. It is **not eliminated**. Status: **UNRESOLVED**. E1 is a **negative-fixture result**, not a failed experiment.

### Hypothesis update (no solve, so no conservation reading)

| Hypothesis | After E1 fixture failure |
|------------|--------------------------|
| demand=1 alone | **UNRESOLVED** — fixture could not isolate it |
| ORTA / profile-specific | **still live** |
| 90° | **UNRESOLVED** |
| Blanket bar-fill | unchanged from E3: **WEAKENED** |
| Root cause | **UNPROVEN** |

E1 does not close FP-027. E2 was later authorized as fixture discovery only and is also a negative fixture. 90° remains **GATED**. Stock was not mutated (no export, no Stock Update modal). Offcut/remnant axis still **UNPROVEN**.

Solver-stage / machine export / REMAINING_LENGTH: **not measured** — no solve.

---

## Independent review — E1, 13 September 2026

E1 is accepted as a **negative-fixture result**, not a failed experiment. Stopping before optimization was correct.

Accepted authority:

| Finding | Verdict |
|---------|---------|
| E1 | `E1_FIXTURE_NOT_OBTAINABLE_NATURALLY` |
| demand=1 hypothesis | **UNRESOLVED** |
| ORTA-specific hypothesis | **still live** |
| 90° hypothesis | **still live** |
| FP-027 root cause | **UNPROVEN** |

The useful new fact: a valid single-sash Deceuninck 70 design naturally generated **4 KASA / 4 KANAT / 4 CITA**, so E1 could not isolate demand=1 without manufacturing synthetic evidence.

### Next specified experiment — E2 (authorized as fixture discovery)

Because demand=1 could not be isolated naturally, the next discriminator targeted **angle / profile semantics**. That experiment is now recorded below.

---

## E2 — non-ORTA 90°/90° fixture discovery

Executed 13 September 2026. **Not solved.** Natural-fixture requirement is mandatory. Does **not** test demand=1. Does **not** test compensation formulas. The original 90° `CONTROL_FIXTURE` was **not** run.

### Pre-run stock / settings

| Axis | Result |
|------|--------|
| Warehouse quantities | **IDENTICAL to V2** — CITA 46 / KANAT 96 / KASA 13 / ORTA 100 |
| Warehouse capture | `e2-stock-20260913-171022` SHA-256 `ba488c66…` — CITA card highlight changed pixels vs V2 `c8626da5…`; this is **not** `STOCK_STATE_CHANGED` |
| Settings | Fresh capture `e2-settings-20260913-171102`. Full-window SHA-256 `8597b36c…` — **byte-identical** to A/B/C. Content region `e000c1ce…`. Weld 3 / Saw 4 / Trim 0 / Sash 7 / Glazing 2.5 / min offcut 500 / DC-600. DC-550 SKH enabled globally |

### Identities (project/design only)

| Item | Value |
|------|-------|
| Project | Id=8, No **100008**, `FP027_E2_NONORTA_90`, OrderNo 10008 |
| Design | Id=10, `E2_NONORTA_90`, 1000 × 1500, two panels (fixed + sash + divider), `DESIGN_VALIDATION VALID` at 17:13:47 |
| Production plan | **not created** |
| OptimizationRun | **not created** — no solve |

### Fixture discovery process

Principled, one native template. Not an edge-case hunt.

1. E3 (fixed single panel) and E1 (single sash) both emit only 45°/45° on KASA / KANAT / CITA.
2. E2 used the native **two-panel** template — the first drawing that naturally emits a 90° linear cut (the vertical divider).
3. Angles were **not** edited. Mullion count was **not** increased. No optimizer row was injected.
4. Support sheet / hardware were not present as linear-cut Required Parts rows.

Log: `E2_NONORTA_90 için 17 satır cut list üretildi.` (17:15:01). The Production footer showed Total Quantity 21 / Total Length 17214 mm; the log and the unique assembly walk are authoritative at **17** rows. Length 17214 mm matches the 17 packed pieces below.

### Generated required parts (not optimized)

| Profile | Rows | Lengths (mm) | Angles | requiredCount |
|---------|------|--------------|--------|---------------|
| Deceuninck-KASA-70 | 4 | 1003, 1003, 1503, 1503 | 45 / 45 | **4** |
| Deceuninck-KANAT-70 | 4 | 454, 454, 1433, 1433 | 45 / 45 | **4** |
| Deceuninck-CITA-20 | 8 | 440, 440, 1419, 1419, 334, 334, 1313, 1313 | 45 / 45 | **8** |
| Deceuninck-ORTA-KAYIT-70 | 1 | 1416 | **90 / 90** | **1** |

The only 90°/90° linear-cut piece is the ORTA mullion. No non-ORTA profile has 90/90.

```text
E2_FIXTURE_VALID = NO
E2 classification = E2_FIXTURE_NOT_OBTAINABLE_NATURALLY
solved = no
injected row = no
angles edited = no
```

### Why this stops

In this system the native odd-count, square-cut linear role is Mullion, and Mullion is ORTA. Fixed frames and sashes emit 45°/45° on KASA / KANAT / CITA. Manufacturing a non-ORTA 90/90 row by typing it into the optimizer, or by editing a generated angle, would be invalid evidence.

90° as a separated mechanism is therefore **not tested**. It is **not eliminated**. Status: **UNRESOLVED** (isolation) / **still live** (hypothesis). E2 is a **negative-fixture result**, not a failed experiment.

### Hypothesis update (no solve, so no conservation reading)

| Hypothesis | After E2 fixture failure |
|------------|--------------------------|
| demand=1 alone | **UNRESOLVED** — unchanged from E1 |
| ORTA / profile-specific | **still live** |
| 90° | **UNRESOLVED** as an isolated variable; **still live** as a hypothesis |
| Blanket bar-fill | unchanged from E3: **WEAKENED** |
| Root cause | **UNPROVEN** |

E2 does not close FP-027. E2 does **not** authorize the original 90° `CONTROL_FIXTURE`. That control stays **GATED** and separate. Stock was not mutated (no export, no Stock Update modal). Offcut/remnant axis still **UNPROVEN**.

Solver-stage / machine export / REMAINING_LENGTH: **not measured** — no solve.

### Specified next — reassessment only, not authorized

Completed below. The 90° control was **not** run.

---

## Dual-use reassessment — original 90° CONTROL_FIXTURE vs FP-027

Repository/audit reasoning only. 13 September 2026. No DoWin session. No project, solve, export, stock, or settings change.

### Original FP-024C purpose (must not be rewritten)

The Test 5 control exists to ask whether **angle / geometry** changes nominal / packed / machine length under **unchanged** Weld 3 / Saw 4 / Trim 0. It is not a setting isolation and it cannot yield `PROVEN EFFECT` for a setting.

| Spec field | Documented value | Citation |
|------------|------------------|----------|
| Kind | `CONTROL_FIXTURE` / `ninetyDegreeControl` | `dowinCompensationEvidence.ts:276`, `:310–311`; audit table Test 5 |
| Design name / id | `pending-90-control` / `dowin-asdd-90-control-pending` | `dowinCompensationEvidence.ts:836–837`, `:1762` |
| Intended geometry | **unspecified** — `widthMm: 0`, `heightMm: 0`; “geometry/cut-angle **may** differ” | `dowinCompensationEvidence.ts:842–843`, `:1767`; `FP-024C-PHYSICAL-FORMULA-PARITY_2026-09-09.md:65` |
| Profile / system | Template inherits Deceuninck 70 from the golden fixture; not an independently drawn design | `dowinCompensationEvidence.ts:841` |
| asdd 90° mullion | **not this control** — “same-job 90° observation” | `dowinCompensationEvidence.ts:1769`, `:2029–2032` |
| ORTA demand = 1 | **UNPROVEN** for this control (geometry not specified). asdd / E2 / A/B/C two-panel jobs do generate ORTA × 1, but those jobs are not this control | E2 / `FP024C3_EXPECTED_FIXTURE_ROWS` |
| Settings | Must stay identical to the parent (Weld 3 / Saw 4 / Trim 0, DC-600) | `dowinCompensationEvidence.ts:2307–2308` |
| Stock specified? | **No.** Stock identity is enforced on `SINGLE_SETTING_ISOLATION`, not on `CONTROL_FIXTURE` | `dowinCompensationEvidence.ts:2433` vs `:2298–2309` |
| Topology required for compensation classification? | **No** — “within-fixture layers only” | `dowinCompensationEvidence.ts:2920–2931` |
| Topology required for package ingest? | **Yes** — empty `bars` is rejected | `dowinCompensationEvidence.ts:2292–2293` |
| Machine export | Machine **length layer** is required on transcribed pieces; MDB/`.dw` only “if generated” | `dowinCompensationEvidence.ts:2289–2290`; `FP-024C-PHYSICAL-FORMULA-PARITY_2026-09-09.md:75–76` |
| Quantity conservation in original acceptance? | **No.** `canProve` is angle/geometry under unchanged settings. Ingest does not compare required vs plan counts | `dowinCompensationEvidence.ts:310–311` |

`isControlFixtureAuthorized()` is still **false** for FP-024C reasons that predate this reassessment: `BASELINE_RESET_VALIDATION` is `REPRODUCTION_FAILED`; Fresh B/C templates are pending; FP-024C.1 is not a settled non-`AMBIGUOUS` verdict (`dowinCompensationEvidence.ts:1834–1858`).

### Why 90° and ORTA remain confounded

E2’s only 90°/90° linear piece is the ORTA mullion. The original control does not specify a different non-ORTA 90° design. Using the control to chase `required ORTA = 1` / `plan ORTA = 4` would select asdd-like two-panel geometry — the job the spec says is **not** this control. Even a later passive observation of +3 ORTA would still be the bundle `ORTA + demand=1 + 90/90 + single-length + cost/profile`. It would only strengthen **repeatability of the ORTA surplus**, not isolate a cause.

### Dual-use risk analysis

| Risk | Finding |
|------|---------|
| A. Fixture-selection bias | **Material.** Geometry is not independently fixed. Choosing a fixture so FP-027 can see ORTA 1→4 is `FIXTURE_SELECTION_BIAS` and is classified **unsafe as a targeting rule**. |
| B. Stock-state confound | **Limits FP-027 authority.** Current warehouse is V2; the original control specified no stock baseline. Nominal/packed/machine can be read from pieces independently of topology (`topologyRequiredForCompensationClassification = false`). Conservation counts cannot. |
| C. Optimizer-state confound | **CONDITIONAL.** Length-layer question is answerable from pieces before topology is interpreted. Conservation is not. Package ingest still requires bars. |
| D. Quantity-conservation feedback | **Forbidden in the model.** A surprising Record B result must not rerun or alter Record A. `quantityFeedbackRerunForbidden = true`. |
| E. Authority collapse | **Forbidden.** Record A and Record B may share fixture identity, timestamps, hashes, and IDs. They must not share verdict authority. |

### Decision

```text
DUAL_USE_CONDITIONAL
authorizesControl = false
targeting ORTA 1→4 as fixture-selection criterion = DUAL_USE_UNSAFE
passive conservation transcription after independent FP-024C authorization = allowed
```

Not `DUAL_USE_SAFE`: the fixture is not independently specified; protocol would have to be extended to lock geometry. Not blanket `DUAL_USE_UNSAFE`: forbidding even passive transcription of an independently authorized compensation run would over-claim contamination. Not `UNPROVEN`: the spec is sufficient to decide these limits.

This reassessment does **not** authorize the control. FP-024C.4 later superseded C.1 reset / Fresh B/C as authorization blockers. The remaining catalog blocker is `FP024C_90_CONTROL_FIXTURE_SPECIFIED_INDEPENDENTLY`. When a compensation-only fixture is specified, operators must still choose geometry for compensation isolation only.

### Authority firewall (implemented, not executed)

| Record | Id | Status | May conclude |
|--------|----|--------|----------------|
| A | `FP024C_90_CONTROL_COMPENSATION` | `NOT_RUN` | length-layer / angle compensation only |
| B | `FP027_90_CONTROL_CONSERVATION_OBSERVATION` | `NOT_RUN` | required vs plan counts only |

`evaluateDualUseVerdictFirewall` returns independent authorities even when artifact hashes match and even when one side looks exact. FP-027 root cause stays **UNPROVEN**. Score stays **6.0/10**. Formulas stay **FROZEN**. PR #32 stays Draft / **DO NOT MERGE**.

```text
STOP
Do not run the 90° control.
Do not run another FP-027 experiment.
Do not implement FP-027 or FP-026.
Do not modify formulas.
```

---

## FP-024C.4 — control-gate reconciliation (13 September 2026)

FP-027 root cause UNPROVEN is **IRRELEVANT_TO_CONTROL** as a blocker and **cannot authorize** the control (`FP027_TARGETING_CANNOT_AUTHORIZE_FP024C_CONTROL`). Dual-use stays `DUAL_USE_CONDITIONAL`, which is not `DUAL_USE_SAFE`.

Current authorization contract lives in `evaluateControlFixtureAuthorization`. Catalog verdict: **BLOCKED** solely by `FP024C_90_CONTROL_FIXTURE_SPECIFIED_INDEPENDENTLY`. Obsolete C.1 Fresh B/C / remainder-reset predicates are superseded as blockers and remain historically visible. Records A/B stay `NOT_RUN`. Score **6.0/10**. Formulas **FROZEN**. PR #32 Draft / **DO NOT MERGE**.
