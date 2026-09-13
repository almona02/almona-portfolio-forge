# FP-027 — Optimization Required-Parts Conservation (E3)

| Field | Value |
|-------|--------|
| Date | 13 September 2026 |
| Branch | `feature/fp024c-physical-parity` |
| Experiment | **FP-027-E3 only** — KASA spare-capacity discrimination |
| Gate | 🔓 **FORENSICS OPEN** |
| Root cause | **UNPROVEN** |
| Fix | **NOT IMPLEMENTED** |
| Production formulas | **FROZEN** |
| Physical-length score | **6.0/10** unchanged |
| 90° CONTROL_FIXTURE | **GATED** |
| FP-026 | NAME ONLY / **NOT IMPLEMENTED** |
| PR #32 | Draft / **DO NOT MERGE** |

Predecessor: `docs/audits/FP-027-REQUIRED-PARTS-CONSERVATION-FORENSICS_2026-09-13.md`. E1 and E2 were not run.

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
| H2 — pattern / bar-fill | **FURTHER WEAKENED** | Now contradicted by KASA in E3 in addition to KANAT/CITA in A/B/C. Not mathematically ruled out for every profile. |
| H3 — ORTA-specific condition | **STRENGTHENED as the remaining live set** | Still unresolved. Surviving candidates include 90°/90°, demand = 1, single-length demand, mullion role, zero unit price / 6.50 objective, and opaque post-processing. |

E3 does **not** say “both leading hypotheses are disproven.” Root cause remains **UNPROVEN**.

Remaining confounds (unchanged by one no-surplus result): demand-of-one special case, 90° semantics, single-length-demand effects, objective/cost differences (ORTA priced 0 vs KASA 1000 TL/m), profile-class handling, hidden post-processing, and a permissive `>=` constraint that is invisible when the objective does not reward surplus.

---

## Authority after E3

| Finding | Verdict |
|---------|---------|
| E3 created / solved | **yes / yes** — one fresh solve |
| E3 KASA conservation | **EXACT_CONSERVATION** |
| Cross-profile conservation violation | **NOT_OBSERVED** |
| Generalization of the A/B/C ORTA surplus | **NOT_SUPPORTED_BY_E3** |
| A/B/C `21 → 24` ORTA surplus | **unchanged** — `REPEATABLE_UNDER_MEASURED_IDENTICAL_INPUTS` |
| FP-027 root cause | **UNPROVEN** |
| FP-027 gate | **FORENSICS OPEN** — E3 does not close it |
| `FIRST_LAYER_OF_COUNT_DIVERGENCE` | **UNPROVEN** — still bounded to CG → MIP → annealing |
| Export remainder-copy finding | **SUPPORTED** — not patched |
| Formula change authorized | **no** |
| Demand-inequality formulation proven | **no** |
| E1 / E2 | **not authorized, not run** |
| 90° | **GATED** |
| FP-026 | **not implemented** |
| ALMONA engines | still structurally quantity-bounded; invariant still unasserted |

---

## Tests / freeze

- `npm run type-check` — clean
- vitest: `dowinOptimizationStateProvenance.test.ts`, `dowinCompensationReconciliation.test.ts`
- Pins: root cause `UNPROVEN`; E3 exact conservation cannot close FP-027; E3 cannot authorize formula changes; E3 cannot prove a `>=` constraint; 90° stays gated; FP-026 stays unimplemented
- Formula freeze: no changes to `ManufacturingSettings.ts`, `barPackAccounting.ts`, `UPVCCuttingEngine.ts`, `src/lib/fabricator/production`

---

## Licensed-artifact exclusion

Committed: transcriptions, SHA-256 values, structured evidence, tests, this audit.

Not committed: PDFs, `.dw`, MDB, screenshots, machine binaries. No decompilation. Encrypted shop database not opened.
