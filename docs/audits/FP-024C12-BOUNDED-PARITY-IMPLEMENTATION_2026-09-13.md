# FP-024C.12 — Bounded Parity-Adapter Weld Implementation

| Field | Value |
|-------|--------|
| Date | 13 September 2026 |
| Branch | `feature/fp024c-physical-parity` |
| Starting HEAD | `39ce286` — `FP-024C.12: implement bounded DoWin Weld parity rule` |
| PR #32 | Draft / **DO NOT MERGE** |
| Gate | **WIRED_PARITY_ADAPTER_ONLY** |
| Physical-length score | **Unchanged at 6.0/10** |
| Canonical production formulas | **FROZEN** |
| FP-027 | Root cause remains **UNPROVEN** |

---

## Verdict

```
FP-024C.10 ✅ ACCEPTED
FP-024C.11 ✅ ACCEPTED
FP-024C.12 helper ACCEPTED
FP-024C.12.1 wiring classification B. PARITY_API_NEEDS_EXPLICIT_ENTRY_POINT
FP-024C.12.1 FP024C12_PARITY_WIRING = PROVEN

FP024C12_IMPLEMENTATION_SCOPE = PARITY_ADAPTER_ONLY
GENERALIZED_MANUFACTURING_FORMULA = UNPROVEN

Call site: computeDowinRequiredPartsFromDesignReport
Double-count path: ISOLATED
Canonical production engines: unchanged
```

Score stays **6.0/10**. Movement requires C.12 independent review, golden replay, and C.13 closeout.

---

## Authorized evidence scope

Measured system (exact string, no substring match):

`Deceuninck 70'lik PVC Sistemi`

Measured 45°/45° profiles:

- `Deceuninck-KASA-70`
- `Deceuninck-KANAT-70`
- `Deceuninck-CITA-20`

Measured 90°/90° profile:

- `Deceuninck-ORTA-KAYIT-70`

Measured Welding Waste: `{0, 2, 3}` mm.

Identifiers match `FP024C11_CANONICAL_PROFILE_SYSTEM` and the C.11 allowlists. No aliases.

---

## Implementation file:line

| Item | Location |
|------|----------|
| Helper | `src/lib/fabricator/dowinParity/evaluateDowinRequiredPartsWeldAdjustment.ts:110-173` `evaluateDowinRequiredPartsWeldAdjustment` |
| **C.12.1 parity entry point** | `evaluateDowinRequiredPartsWeldAdjustment.ts:196-209` `computeDowinRequiredPartsFromDesignReport` |
| Public re-export | `DowinParityLengthEngine.ts:33-42` (re-export only; no call from sash/compute) |
| Isolation comment | `DowinParityLengthEngine.ts:18-22` |
| Existing sash weld (untouched) | `DowinParityLengthEngine.ts:104-114` `sashHorizontalCutMm` / `:116-126` `sashVerticalCutMm` |
| Fused packed sash API | `DowinParityLengthEngine.ts` `computeDowinParityLengths` — geometry → packed sash; **not** Report → Required Parts |
| asdd packed actuals | `DowinParityLengthEngine.ts` `almonaParityActualsForAsdd` — `nominalLengthMm: null`, packed from sash formula |
| Authority object | `FP024C12_BOUNDED_PARITY_WELD_RULE` (`parityWiring: PROVEN`) |

`computeDowinParityLengths` does **not** call the helper. `almonaParityActualsForAsdd` is unchanged.

---

## Guards

### System

`profileSystem === "Deceuninck 70'lik PVC Sistemi"`

Else `UNSUPPORTED_SYSTEM`. No `includes("Deceuninck")`.

### Profile allowlists

45° pair requires membership in `{Deceuninck-KASA-70, Deceuninck-KANAT-70, Deceuninck-CITA-20}`.

90° pair requires `Deceuninck-ORTA-KAYIT-70`.

Else `UNSUPPORTED_PROFILE`. Angle alone or system alone is not enough. Display-name substrings are not enough. `KANAT-70` without the evidenced prefix is rejected.

### Angle pair

Uses parity `leftAngleDeg` / `rightAngleDeg` only. Does **not** read canonical `Cut.angle`.

- Either end `null` / `undefined` → `MISSING_ANGLE_AUTHORITY`
- Non-finite → `UNSUPPORTED_ANGLE_PAIR`
- Exact `45/45` or exact `90/90` only
- Mixed `45/90`, `90/45`, `30/30`, other → `UNSUPPORTED_ANGLE_PAIR`

**No** `leftAngleDeg ?? 45`. Missing does not become 45°.

The legacy `computeDowinParityLengths` still defaults missing angles to 45 for the separate CompLessThan90 path. C.12 does not use that path.

### Weld value

Authoritative only if `weldingWasteMm` is the number `0`, `2`, or `3`.

`1`, `4`, negative, `NaN`, non-number → `UNSUPPORTED_WELD_VALUE`.

No linear extrapolation.

### Semantic layer

Required:

- `sourceLayer = DESIGN_REPORT`
- `targetLayer = REQUIRED_PARTS`

`REQUIRED_PARTS`, `PACKED`, `MACHINE`, `UNKNOWN` as source → `UNSUPPORTED_SOURCE_LAYER`.

Wrong target → `UNSUPPORTED_TARGET_LAYER`.

Unknown provenance is fail-closed. The helper does not accept a generic unlayered “length”.

Existing `computeDowinParityLengths` still has no Design Report input. That is why C.12 is a **new** helper rather than a patch to the sash packed formula (`IMPLEMENTATION_BLOCKED_BY_LENGTH_SEMANTICS` would apply if we had forced the rule into that engine).

---

## Double-counting analysis

| Path | Status |
|------|--------|
| Sash packed `inner + Basma + Kaynak + WeldingWaste` | Unchanged. C.12 is not called from it. |
| C.12 `DESIGN_REPORT → REQUIRED_PARTS` | Separate function. Requires `priorCompensationPath !== SASH_BASMA_KAYNAK_WELD`. |
| Same piece receiving both | `DOUBLE_COUNT_PATH_DETECTED`; `authoritativeLengthMm = null`. |
| K-factor / burn-off production | Untouched. Helper is not imported there. |

Classification: **ISOLATED**. No guess-resolution.

---

## Authorized formulas (parity adapter only)

45°/45° + allowlisted KASA/KANAT/CITA + Weld ∈ `{0,2,3}` + Design Report → Required Parts:

```
requiredPartsLengthMm = designReportLengthMm + weldingWasteMm
```

90°/90° + `Deceuninck-ORTA-KAYIT-70` + Weld ∈ `{0,2,3}` + Design Report → Required Parts:

```
requiredPartsLengthMm = designReportLengthMm
```

(No weld term.)

---

## Fail-closed reasons

| Reason | Meaning |
|--------|---------|
| `UNSUPPORTED_SYSTEM` | System string is not the evidenced Deceuninck 70 identity |
| `UNSUPPORTED_PROFILE` | Profile not on the matching 45° or 90° allowlist |
| `UNSUPPORTED_ANGLE_PAIR` | Mixed, other, or non-finite pair |
| `MISSING_ANGLE_AUTHORITY` | Left or right end absent |
| `UNSUPPORTED_WELD_VALUE` | Not in `{0, 2, 3}` |
| `UNSUPPORTED_SOURCE_LAYER` | Not `DESIGN_REPORT` |
| `UNSUPPORTED_TARGET_LAYER` | Not `REQUIRED_PARTS` |
| `DOUBLE_COUNT_PATH_DETECTED` | Sash Basma/Kaynak/Weld already applied |
| `NON_FINITE_DESIGN_REPORT_LENGTH` | Report millimetres not finite |

Unsupported results: `{ supported: false, reason, authoritativeLengthMm: null }`. Input length is never returned as implied parity.

---

## Test matrix (positive)

| Profile | Base | Weld 0 | Weld 2 | Weld 3 |
|---------|------|--------|--------|--------|
| KASA 45/45 | 1200 | 1200 | 1202 | 1203 |
| KASA 45/45 long | 1500 | 1500 | 1502 | 1503 |
| KANAT 45/45 | 451 | 451 | 453 | 454 |
| KANAT 45/45 long | 1430 | 1430 | 1432 | 1433 |
| CITA 45/45 | 537 | 537 | 539 | 540 |
| CITA 45/45 long | 1116 | 1116 | 1118 | 1119 |
| ORTA 90/90 | 1116 | 1116 | 1116 | 1116 |
| ORTA 90/90 long | 1416 | 1416 | 1416 | 1416 |

---

## Unsupported cases (negative)

Missing left; missing right; 45/90; 90/45; 30/30; non-finite angle; `KANAT-70` alias; `Deceuninck` substring system; KASA at 90/90; ORTA at 45/45; Weld 1; Weld 4; negative Weld; NaN Weld; source `REQUIRED_PARTS` / `PACKED` / `MACHINE` / `UNKNOWN`; target `PACKED`; `priorCompensationPath = SASH_BASMA_KAYNAK_WELD`.

---

## Canonical production isolation

Zero intended diff:

- `UPVCCuttingEngine.ts`
- `AlmonaCuttingEngine.ts`
- `barPackAccounting.ts`
- `src/lib/fabricator/production/**`
- canonical `Cut` semantics / identity
- optimization algorithms
- FP-027 modules

Those files must not import `evaluateDowinRequiredPartsWeldAdjustment` or `computeDowinRequiredPartsFromDesignReport`. No production route calls either.

Allowed diff: parity helper + entry point, `DowinParityLengthEngine` re-export/comment, parity tests/evidence, this audit.

---

## C.12.1 wiring closure

### Candidate entry points (traced)

| Function | File | Input layer | Output layer | Verdict |
|----------|------|-------------|--------------|---------|
| `sashHorizontalCutMm` / `sashVerticalCutMm` | `DowinParityLengthEngine.ts:104-126` | finished geometry + Basma/Kaynak + Weld | packed sash | **Not** Report → Required Parts. Already includes Weld. |
| `computeDowinParityLengths` | `DowinParityLengthEngine.ts` | finished W/H; angles default `?? 45` | fused `lengthMm` (packed sash, unevidenced frame) | Fuses geometry into packed. **Do not wire.** |
| `almonaParityActualsForAsdd` | engine `almonaParityActualsForAsdd` | sash packed from above | `packedSegmentMm`; `nominalLengthMm = null` | No Design Report input. **Do not wire.** |
| `compareDowinGoldenLengths` | `dowinPhysicalLengthFixture.ts` | expected vs actual layers | comparison | Not a transformation. |
| `cutLengthSemantics` | `cutLengthSemantics.ts` | canonical `Cut` fields | accessors | Production Cut. **Do not wire.** |
| `evaluateDowinRequiredPartsWeldAdjustment` | helper `:110` | explicit DESIGN_REPORT | REQUIRED_PARTS | Formula only; was unwired. |
| **`computeDowinRequiredPartsFromDesignReport`** | helper `:196-209`, re-exported from engine | explicit DESIGN_REPORT + all authority fields | `requiredPartsLengthMm` | **C.12.1 call site.** |

Classification: **B. PARITY_API_NEEDS_EXPLICIT_ENTRY_POINT** (no pre-existing correct call site). Entry point added. Not C: layers and identity are supplied by the caller; no guessing.

### Semantic contract

- source: `DESIGN_REPORT`
- target: `REQUIRED_PARTS`
- Caller must pass system, profile, both angles, Welding Waste, `designReportLengthMm`, `sourceLayer`, `targetLayer`. No `?? 45`. No substring system.

### Call graph

```
computeDowinRequiredPartsFromDesignReport
  → evaluateDowinRequiredPartsWeldAdjustment

sashHorizontalCutMm ↛ helper
sashVerticalCutMm ↛ helper
computeDowinParityLengths → sashHorizontalCutMm / sashVerticalCutMm ↛ helper
almonaParityActualsForAsdd → computeDowinParityLengths ↛ helper
```

Engine source after the re-export block does not contain `evaluateDowinRequiredPartsWeldAdjustment(` or `computeDowinRequiredPartsFromDesignReport(`.

### Double-count proof

Packed sash still `inner + Basma + Kaynak + Weld = 444` for the asdd sash fixture. Feeding that millimetre with `sourceLayer: PACKED` or `priorCompensationPath: SASH_BASMA_KAYNAK_WELD` returns fail-closed (`UNSUPPORTED_SOURCE_LAYER` / `DOUBLE_COUNT_PATH_DETECTED`), not 444+3.

### Integration tests

`src/tests/fabricator/computeDowinRequiredPartsFromDesignReport.test.ts` hits the **engine re-export**, not only the helper unit.

Positive: KASA 1200 → 1200/1202/1203; KANAT 451 → 451/453/454; CITA 537 → 537/539/540; ORTA 1116 → 1116/1116/1116.

Negative at the same API: missing left/right; 45/90; 90/45; unsupported profile/system; Weld 1/4; packed/machine/Required-Parts source; wrong target; sash packed stack.

---

## FP-027 firewall

No change. Root cause **UNPROVEN**. Conservation work not touched. Defects not combined.

---

## Score

Physical-length correctness remains **6.0/10**.
