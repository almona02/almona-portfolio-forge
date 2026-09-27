# FP-024 — DoWin Physical-Length Golden Parity

> **Superseded for the asdd three-layer gate by** [`FP-024A-EXTERNAL-DOWIN-GOLDEN-PARITY_2026-09-09.md`](./FP-024A-EXTERNAL-DOWIN-GOLDEN-PARITY_2026-09-09.md).
> This file remains as the earlier dual-length checkpoint. Verdict is still ❌ NOT ACCEPTED. Score remains 6.0/10.


| Field | Value |
|-------|--------|
| Date | 9 September 2026 |
| Repository | `almona-portfolio-forge` |
| Branch | `main` |
| Depends on | FP-023A (settings contract), FP-023B (canonical kerf identity) |
| Scope | Per-piece physical length vs a **real exported DoWin cut list**. Not FP-016, FP-017, kerf count, or production K-factor replacement. |
| Job | DoWin design **asdd**, Deceuninck 70 Z, 1000 × 1500 mm, two 500 mm sashes, vertical mullion |
| Gate | ❌ **NOT ACCEPTED** — expected cut list populated; `dowinParityGatePasses` is **false**. No score increase. |
| Physical-length score | **Unchanged at 6.0/10** |

---

## Acceptance (unchanged, strict)

> Same elevation + same system + same manufacturing settings → ALMONA cut lengths within **±0.1 mm** of a **real exported DoWin cut list**, per physical piece.

Categories scored independently. A sash match must not hide a frame, mullion, glass, or angle fail.

`dowinParityGatePasses` is true only when status is `COMPARED`, every category is represented, and every category is `PASS`.

---

## External evidence (asdd, 9 Sep 2026)

Sources (MDB/PDF not committed; millimetres transcribed only):

- DoWin Optimization **Required Parts** (saw-bound)
- DC-600 machine export `asdasd_2026.09.09_18.15.mdb` `Table1` (13 profile pieces)
- `OptimizationReport_20260909_181432.pdf`
- `OptimizationReport_20260909_181432_Labels.pdf`
- `OptimizationReport_20260909_181432_DesignPreview.pdf`

The MDB is the machine-bound cut list. `LENGTH` matches Optimization Required Parts exactly. It does **not** match the Labels/Design Preview PDF (those 45° pieces are 3 mm shorter). `FRAME_X`/`FRAME_Y` on every MDB row are overall finished **1000 × 1500**, while frame `LENGTH` is **1003 / 1503**. Beads and glass are absent from this DC-600 file (13 rows = 4 frame + 8 sash + 1 mullion).

DoWin publishes **two** millimetre columns for 45° pieces, 3 mm apart (`WeldingWaste`):

| Piece | Labels / Design Preview (finished) | Optimization Required Parts (saw) |
|-------|-------------------------------------:|----------------------------------:|
| Frame H (KASA-70) | 1000 | **1003** |
| Frame V (KASA-70) | 1500 | **1503** |
| Sash H (KANAT-70) × 4 | 451 | **454** |
| Sash V (KANAT-70) × 4 | 1430 | **1433** |
| Mullion (ORTA-KAYIT-70) 90°/90° | 1416 | **1416** |
| Glass (design canvas) | 329 × 1308 | (not in profile cut list) |
| Bead CITA-20 (not a gate category) | 331 / 1310 | 334 / 1313 |

**FP-024 expected values are the MDB / Optimization `LENGTH` column** (saw-bound). Mullion is unchanged (square cut, no weld add). Glass 329 × 1308 is taken from the design canvas only — it is not in the MDB.

Design intermediates (not expected cuts): sash property panel **437 × 1416**.

---

## Scorecard vs current ALMONA parity model

ALMONA actuals from `almonaParityActualsForAsdd()` using sash-outer **437 × 1416** as finished input. Frame and mullion still have **no formula** (missing actual = FAIL). Formulas were **not** retuned to match 454 / 1433.

| Category | Expected (saw) | ALMONA actual | Δ mm | Gate |
|---------|----------------:|-------------:|-----:|------|
| frame_horizontal | 1003 | *(none)* | — | **FAIL** |
| frame_vertical | 1503 | *(none)* | — | **FAIL** |
| sash_horizontal | 454 | 444 | −10 | **FAIL** |
| sash_vertical | 1433 | 1427 | −6 | **FAIL** |
| mullion | 1416 | *(none)* | — | **FAIL** |
| glass W / H | 329 / 1308 | 418 / 1397 | +89 / +89 | **FAIL** |
| angle_compensation | 0 | 0 | 0 | **PASS** |

`dowinParityGatePasses` = **false**. Angle-only pass does not lift the gate.

Production `calculateKFactor` was **not** used as the actuals path and was not deleted.

---

## Traced discrepancies (not adopted as formula changes)

Do **not** change ALMONA formulas merely to make the fixture green.

| Observation | Rule it may be | Why it is not adopted yet |
|------------|----------------|---------------------------|
| Labels + 3 mm = saw on every 45° piece; 90° mullion unchanged | **WeldingWaste 3 mm** on miters | Dual publication (label vs saw) is recorded; expected already uses saw |
| Frame saw = overall + 3 (1000+3, 1500+3) | WeldingWaste on frame miters | Frame Basma/Kaynak still unevidenced; do not guess a full frame formula from one job |
| Mullion 1416 = sash outer height | Mullion sits on sash-height plane; `PvcMullionOffset` 0 | One job; keep mullion unevidenced until the length rule is written from settings, not copied |
| 437 + 2×7 + 3 = 454 (and 1416+14+3 = 1433) | `sashOuter + 2×SashOffset + WeldingWaste` | **Conflicts** with documented `sashInner + Basma + Kaynak + Weld` (444 / 1427). Do not replace Basma/Kaynak with this shortcut until the 437 sash-outer derivation from 1000×1500+mullion is proven |
| Glass 329 vs inner−2×2.5 = 418 | Glazing rebate is ~54 mm/side on this Z sash, not 2.5 mm clearance on sash inner | Clearance formula is the documented glass rule; 54 mm is profile geometry, not yet a named setting |

---

## Isolation (AICS-001)

| Constraint | How it is held |
|------------|----------------|
| No ML in execution | Deterministic millimetre arithmetic only |
| No silent production swap | `UPVCCuttingEngine` does not import `DowinParityLengthEngine` |
| Human validation | Gate remains false until every category is ±0.1 mm |
| No formula green-washing | Observed 2×SashOffset shortcut is tested as **not** equal to the documented sash formula |
| Constitutional lock | `GuaranteeVerification.test.ts` asserts READY fixture + gate false + K-factor present |

Explicitly not touched: Basma/Kaynak as production default, BOM 2 mm, MicronEngine 4.2/15, `ProductionOptimizer`, FP-016, FP-017, FP-023B kerf identity.

---

## Tests

Harness: `src/tests/fabricator/dowinPhysicalLengthGolden.pending.test.ts`

---

## Scores (unchanged)

Expected values now exist. That is **not** a pass. Physical-length correctness stays **6.0/10** until every category is within ±0.1 mm.

| Area | Score |
|------|------:|
| Manufacturing settings governance | 8.0/10 |
| Physical length correctness | **6.0/10** |
| Optimization correctness | 7.0/10 |
| CAD/CAM manufacturing confidence | 5.5–6.0/10 |
| Industrial core | ~7.2–7.4/10 |
| Full platform | ~5.3/10 |

After every category passes, this score may move from 6.0 toward **~8.0–8.5**.

---

## Gate verdict

**NOT ACCEPTED.** Real DoWin expected cut list is populated for asdd. Comparison ran. Six of seven categories fail. Angle compensation passes at 0 mm. Physical-length score stays **6.0/10**.

Do not treat fixture status `READY` as acceptance. `READY` only means expected millimetres exist.
