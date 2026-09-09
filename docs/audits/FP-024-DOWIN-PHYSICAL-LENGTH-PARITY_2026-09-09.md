# FP-024 — DoWin Physical-Length Golden Parity

| Field | Value |
|-------|--------|
| Date | 9 September 2026 |
| Repository | `almona-portfolio-forge` |
| Branch | `main` |
| Depends on | FP-023A (settings contract), FP-023B (canonical kerf identity) |
| Scope | Per-piece physical length vs a **real exported DoWin cut list**. Not FP-016, FP-017, kerf count, or production K-factor replacement. |
| Gate | ❌ **BLOCKED** — harness ready, no real DoWin expected cut list supplied, no score increase. **Not accepted.** Harness is **READY_FOR_EXTERNAL_DOWIN_FIXTURE**. |
| Physical-length score | **Unchanged at 6.0/10**. No increase until the external fixture passes. |

---

## Acceptance (unchanged, strict)

> Same elevation + same system + same manufacturing settings → ALMONA cut lengths within **±0.1 mm** of a **real exported DoWin cut list**, per physical piece.

Categories are scored **independently**. A sash match must not hide a frame, mullion, glass, or angle fail:

| Category | Role |
|---------|------|
| `frame_horizontal` | Frame rails |
| `frame_vertical` | Frame jambs |
| `sash_horizontal` | Sash rails |
| `sash_vertical` | Sash stiles |
| `mullion` | PVC / transom mullion |
| `glass` | Pane production size |
| `angle_compensation` | Comp&lt;90 / Comp&gt;90 left+right |

`dowinParityGatePasses` is true only when status is `COMPARED`, every category is represented, and every category is `PASS`.

---

## Why the gate is BLOCKED

No licensed DoWin export exists in this repository (no cut-list CSV / NCW / MDB with expected millimetres for a named elevation). Inventing those numbers would fake the first legitimate physical-length score move.

The Deceuninck 70 Z sash 12/16/6/6 job remains the **preferred first fixture** (`DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION`). Elevation millimetres and `expectedLengthMm` stay **null**.

| Verdict | Meaning |
|---------|---------|
| **BLOCKED** | ±0.1 mm vs real DoWin export cannot be claimed |
| **READY_FOR_EXTERNAL_DOWIN_FIXTURE** | Schema, tolerance, per-category scorecard, and evidenced sash/glass/angle formulas are in code |
| **NOT_READY** | Production `generateOptimizedCutList` still uses `calculateKFactor` (intentional isolation) |

---

## What this gate built (without claiming parity)

### 1. Golden schema

`src/lib/fabricator/golden/dowinPhysicalLengthFixture.ts`

- Tolerance `DOWIN_PARITY_TOLERANCE_MM = 0.1`
- `compareDowinGoldenLengths` returns `PENDING_EXTERNAL_FIXTURE` if any expected length is null
- Per-category scorecard: `PENDING` / `PASS` / `FAIL`
- Synthetic harness proves sash `PASS` + frame `FAIL` ⇒ gate false

### 2. Parity length model (not production)

`src/lib/fabricator/dowinParity/DowinParityLengthEngine.ts`

Behavioural formulas from `docs/audits/DOWIN_VS_ALMONA_DEALER_AUDIT_2026-09-09.md` §12 Phase 1. **Not** wired into `UPVCCuttingEngine.generateOptimizedCutList`.

| Category | Formula | Status |
|----------|---------|--------|
| sash H | `sashInnerW + YatayBasma + YatayKaynak + WeldingWaste` | **evidenced** |
| sash V | `sashInnerH + DikeyBasma + DikeyKaynak + WeldingWaste` | **evidenced** |
| glass | `daylight − 2 × GlazingClearance`; reject &lt; 50 mm | **evidenced** |
| angle | Comp&lt;90 / Comp&gt;90 left+right (defaults 0) | **evidenced** (defaults only) |
| frame H / V | DoWin seed Basma/Kaynak **null** on frames | **unevidenced** — length stays `null` |
| mullion | audit only records `+PvcMullionOffset` | **unevidenced** — length stays `null` |

ALMONA model check (not a DoWin expected length): finished 1200 × 1400 mm, offset 7, overlap 12/16/6/6, weld 3 → sash H **1207**, sash V **1411**, glass W **1181**.

Do **not** treat those millimetres as DoWin expected values.

---

## Explicitly not touched

- `calculateKFactor` (still production sash/frame miter)
- Basma/Kaynak as production default (parity engine only)
- BOM 2 mm compensation
- MicronEngine 4.2 / 15 mm
- `ProductionOptimizer`
- FP-016 / FP-017
- FP-023B kerf identity (already PROVEN; this gate is piece **length**, not bar consumption)

---

## Isolation (AICS-001)

| Constraint | How it is held |
|------------|----------------|
| No ML in execution | Deterministic millimetre arithmetic only |
| No silent production swap | `UPVCCuttingEngine` does not import `DowinParityLengthEngine` |
| Human validation | Gate cannot pass until a licensed export fills `expectedLengthMm` |
| Constitutional lock | `GuaranteeVerification.test.ts` asserts pending fixture + K-factor still present |

---

## Tests

| Command | Result |
|---------|--------|
| `npm run type-check` | pass |
| `npm run build` | pass |
| `npx vitest run src/tests/fabricator` | **5 files, 62 passed** |
| `npx vitest run src/tests/constitutional` | **8 files, 83 passed** |

Harness: `src/tests/fabricator/dowinPhysicalLengthGolden.pending.test.ts`

---

## Scores (unchanged)

FP-024 increases **harness confidence**, not readiness. Physical-length correctness stays **6.0/10** until a real DoWin cut list is compared per category.

| Area | Score |
|------|------:|
| Manufacturing settings governance | 8.0/10 |
| Physical length correctness | **6.0/10** |
| Optimization correctness | 7.0/10 |
| CAD/CAM manufacturing confidence | 5.5–6.0/10 |
| Industrial core | ~7.2–7.4/10 |
| Full platform | ~5.3/10 |

After the external fixture passes, physical-length correctness may move from 6.0 toward **~8.0–8.5**. No earlier increase.

---

## Gate verdict

**BLOCKED** — harness ready, no real DoWin expected cut list supplied, no score increase.

FP-024 is **not accepted**. This is a blocked parity harness, not a passed golden.

**READY_FOR_EXTERNAL_DOWIN_FIXTURE** for: category schema, 0.1 mm comparator, independent scorecard, evidenced sash/glass/angle model, unevidenced frame/mullion left null.

To unblock, create one named Deceuninck 70 Z-sash elevation in licensed DoWin, fix the manufacturing settings for the test, export the actual cut/production list, and populate `expectedLengthMm` only from those legitimate outputs. Then run `dowinParityGatePasses`. Every physical piece must be ≤ 0.1 mm absolute error in its category.

Do **not** change ALMONA formulas merely to make the fixture green until each discrepancy is traced to a specific manufacturing rule (sash offset, Basma/Kaynak, welding allowance, mullion compensation, glazing clearance, or angle compensation).
