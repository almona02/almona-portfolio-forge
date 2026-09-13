# FP-024C.11 — Formula Scope Authorization

| Field | Value |
|-------|--------|
| Date | 13 September 2026 |
| Branch | `feature/fp024c-physical-parity` |
| Starting HEAD | `afcf8b6` — `FP-024C.10: measure intermediate Weld linearity` |
| PR #32 | Draft / **DO NOT MERGE** |
| Question | What is the narrowest implementation contract justified by FP-024C.6 through FP-024C.10? |
| Gate | **AUTHORIZATION_CHECKPOINT** — repository/audit only; no formula implemented |
| Physical-length score | **Unchanged at 6.0/10** |
| Production formulas | **FROZEN** |
| Operational Welding Waste | **0 mm** (unchanged this checkpoint) |
| FP-027 | Root cause remains **UNPROVEN**; not combined with C.11 |

---

## Verdict

```
FP-024C.10 ✅ ACCEPTED (independent review)
FP-024C.11 AUTHORIZATION_CHECKPOINT

GENERALIZED_MANUFACTURING_FORMULA = UNPROVEN
BOUNDED_DECEUNINCK70_45_WELD_RULE = ELIGIBLE_FOR_IMPLEMENTATION_REVIEW

Implementation classification:
B. PARITY_ADAPTER_ONLY_SAFE

This checkpoint does NOT implement the rule.
```

C.11 answers where a later, fail-closed compatibility change may be reviewed. It does not move physical-length correctness. Score can move only after implementation, tests, golden replay, and independent review.

---

## Accepted C.10 evidence

Independent review accepted the Weld=2 discriminator. Measured Design Report → Required Parts deltas:

### 45°

| Fixture | Profile | Weld 0 | Weld 2 | Weld 3 |
|---------|---------|--------|--------|--------|
| asdd | KASA | 0 | +2 | +3 |
| asdd | KANAT | 0 | +2 | +3 |
| C.5 | KASA | 0 | +2 | +3 |
| C.5 | CITA | 0 | +2 | +3 |

### 90° ORTA

| Fixture | Weld 0 / 2 / 3 |
|---------|----------------|
| asdd | 0 / 0 / 0 |
| C.5 | 0 / 0 / 0 |

Authority recorded in `FP024C10_WELDING_WASTE_LINEARITY_DISCRIMINATOR` (now `status: ACCEPTED`):

- `DIRECT_WELD_TERM_LINEARITY = PROVEN_FOR_MEASURED_0_2_3_DECEUNINCK70_45_CONDITIONS`
- `WELD2_90_NO_OBSERVED_EFFECT = REPLICATED_ACROSS_TWO_FIXTURES`
- `WELD_CAUSALITY_PROFILE_COVERAGE = KASA + KANAT + CITA`

19:40 `today work` capture remains `INVALID_FOR_CAUSAL_AUTHORITY` (Weld=0 had not persisted).

C.10 evidence acquisition is **closed**. This checkpoint did not test Weld=1, Weld=4, another profile, another geometry, solve, CNC export, or FP-027.

---

## Proven scope

For measured Deceuninck 70 KASA / KANAT / CITA **45°/45°** conditions, Design Report → Required Parts tracks Welding Waste at the measured values:

- 0 mm → 0 mm
- 2 mm → 2 mm
- 3 mm → 3 mm

For measured ORTA **90°/90°** conditions, no Welding Waste effect was observed at 0 / 2 / 3.

Canonical evidence identity:

- `profileSystem`: `Deceuninck 70'lik PVC Sistemi`
- 45° allowlist: `Deceuninck-KASA-70`, `Deceuninck-KANAT-70`, `Deceuninck-CITA-20`
- 90° allowlist: `Deceuninck-ORTA-KAYIT-70`
- Measured weld domain: `{0, 2, 3}`

---

## Unproven scope

- every 45° profile in every system
- mixed-angle cuts (`45°/90°`, `90°/45°`, other angles)
- other profile systems
- non-Deceuninck families
- interaction with Saw Thickness
- interaction with Trim
- arbitrary Welding Waste values outside `{0, 2, 3}`
- a universal mathematical rule
- FP-027 root cause

`GENERALIZED_MANUFACTURING_FORMULA` remains **UNPROVEN**. Mixed angles remain **UNPROVEN** and must not be silently treated as 45°/45°.

---

## ALMONA length pipeline (file:line)

| Layer | Location |
|-------|----------|
| Design / report semantic | `src/lib/fabricator/cutLengthSemantics.ts:18-22` `nominalLengthMm`; `src/types/fabricator.ts:708-714` `reportedWeldedLengthMm` / `nominalLengthMm` |
| Closest generator “Design Report” | `src/lib/fabricator/UnitProfileGatherer.ts:489-490` `plannedLength =` finished dimension; `src/lib/fabricator/OptimizationEngine.ts:31` `plannedLength` |
| Cut generation | `src/lib/fabricator/CuttingListGenerator.ts:36-63,134-148`; `src/lib/fabricator/UPVCCuttingEngine.ts:243-314` `generateOptimizedCutList`; `src/lib/fabricator/HardenedCuttingListGenerator.ts`; `src/lib/reports/CuttingListGenerator.ts:24-33` (report transform) |
| Angle | `src/types/fabricator.ts:697` `Cut.angle` (single end); `src/lib/fabricator/production/CutSheetGenerator.ts:81` `angleDeg: cut.angle ?? 0`; `src/lib/fabricator/UPVCCuttingEngine.ts:269,281` hardcoded miter 45; `src/lib/fabricator/dowinParity/DowinParityLengthEngine.ts:165-166` left/right with `?? 45` |
| Profile / system | `src/types/fabricator.ts:755` `MeasurementData.systemPackId`; `src/lib/fabricator/golden/dowinPhysicalLengthFixture.ts:272` DoWin `profileSystem`; `SYSTEM_PACKS` has no Deceuninck pack |
| Welding Waste setting | `src/lib/fabricator/ManufacturingSettings.ts:36` field, `:100/:121` defaults 3, `:187-211` `resolveManufacturingSettings` |
| Required Parts semantic | `src/lib/fabricator/cutLengthSemantics.ts:24-26` `packedSegmentMm`; `src/types/fabricator.ts:715-719` packed / Required Parts graphic |
| Packed physical | `src/lib/fabricator/barPackAccounting.ts` kerf/trim only; historical `Cut.length`; `CutSheetGenerator.ts:71-76` uses `cut.length` |
| Machine / CNC | `src/types/fabricator.ts:725-729` `machineInstructionLengthMm`; `src/lib/fabricator/production/machineExportPreflight.ts` export gate only; parity `machineInstructionMm` is null |

### 1. Closest Design Report → Required Parts boundary

DoWin’s boundary is Design Preview / report millimetres → Required Parts millimetres.

ALMONA’s closest **semantic** equivalent is:

- Design Report: `nominalLengthMm` / `reportedWeldedLengthMm`
- Required Parts: `packedSegmentMm`

That split is documented, not produced. Canonical generators emit a fused `plannedLength` / `finalLength` / `Cut.length`. The parity adapter’s `almonaParityActualsForAsdd()` currently emits packed sash only; `nominalLengthMm` and `machineInstructionMm` are null.

### 2. Is Welding Waste currently applied anywhere?

Stored as a first-class manufacturing setting. Applied only in the isolated parity adapter:

- `DowinParityLengthEngine.ts:85-99,139-150`
- sash packed = inner + Basma + Kaynak + `weldingWasteMm`

Not consumed by `UPVCCuttingEngine`, `AlmonaCuttingEngine`, `barPackAccounting`, or `production/*`.

### 3. Double-counting analysis

| Path | Risk |
|------|------|
| `UPVCCuttingEngine.ts:169-208` K-factor + `burnOffMm` + cooling | **HIGH** if `weldingWasteMm` is stacked on this production cut length. Separate weld-like allowance. |
| Parity sash inner + Basma + Kaynak + Weld | **HIGH** if Report + Weld is stacked on that packed sash path. C.6–C.10 showed DoWin’s Report → Required Parts delta **is** the weld term alone. |
| Role geometric offsets `L+50` / `L-40` (`roleDetection.ts:121-193`, `cuttingFormulaConstants.ts:19-38`) | Different layer; not Welding Waste. |
| Bar pack kerf (`barPackAccounting.ts`) | Saw / trim only; not weld. |

A silent `if (angle == 45) length += weldingWaste` is forbidden.

### 4. Angle canonicality

Production `Cut.angle` is one number. Generators often hardcode 45°. `CutSheetGenerator` falls back to `cut.angle ?? 0`. That is **not** enough to distinguish:

- 45°/45°
- 90°/90°
- mixed 45°/90° or 90°/45°

Evidence and the parity adapter already have `leftAngleDeg` / `rightAngleDeg`. Those fields **can** distinguish the three cases **if both ends are required**. Current `leftAngleDeg ?? 45` is an unsafe default and must not be reused.

### 5. Deceuninck 70 identity

Deterministic in the evidence catalog:

- `profileSystem === "Deceuninck 70'lik PVC Sistemi"`
- measured `profileCode` allowlists above

Not a canonical `SYSTEM_PACKS` id. Production cutting rules only name ROCK60 and PANDA.

### 6. Would a Deceuninck-only production rule be an unsafe hidden Tier-3 special case?

Yes, if implemented as a silent `includes("Deceuninck")` or `if (angle == 45)` branch in the canonical engines. Unsupported profiles would inherit the rule. AICS-001 requires explicit, fail-closed, auditable scope. That is why classification is **not** A.

---

## Implementation classification

Exactly one:

**B. PARITY_ADAPTER_ONLY_SAFE**

| Option | Why not |
|--------|---------|
| A. `BOUNDED_IMPLEMENTATION_SAFE` | Production lacks dual-end angles, a live Report → Required Parts split, and a canonical Deceuninck 70 system-pack identity. Unsupported profiles cannot be fail-closed today. |
| B. `PARITY_ADAPTER_ONLY_SAFE` | **Selected.** C.6–C.10 evidence plus adapter fields (`weldingWasteMm`, dual angles, profile codes, three-layer actual types) can express a named fail-closed compatibility contract. Canonical production engines cannot. |
| C. `PRODUCTION_IMPLEMENTATION_UNSAFE` | Evidence is real, but the adapter **can** express the proven scope if missing angles are rejected and weld is applied only at Report → Required Parts. |
| D. `UNPROVEN` | Pipeline mapping is sufficient. |

`evaluateFormulaScopeAuthorization()` records this classification. C.11 still sets `authorizesFormulaChange: false` and `authorizesParityAdapterImplementationThisCheckpoint: false`.

---

## Exact bounded implementation contract (not implemented)

Applies only to a future DoWin compatibility / parity adapter. Fail closed outside this contract.

```
WHEN ALL of:
  profileSystem === "Deceuninck 70'lik PVC Sistemi"
  profileCode ∈ {Deceuninck-KASA-70, Deceuninck-KANAT-70, Deceuninck-CITA-20}
  leftAngleDeg === 45 AND rightAngleDeg === 45   // both required; missing ≠ 45
  weldingWasteMm ∈ {0, 2, 3}
THEN
  requiredPartsMm = designReportPhysicalMm + weldingWasteMm

WHEN ALL of:
  profileSystem === "Deceuninck 70'lik PVC Sistemi"
  profileCode === "Deceuninck-ORTA-KAYIT-70"
  leftAngleDeg === 90 AND rightAngleDeg === 90   // both required
THEN
  requiredPartsMm = designReportPhysicalMm
  // do not add Welding Waste

ELSE
  FAIL_CLOSED
```

Must not:

- live in `UPVCCuttingEngine`, `CuttingListGenerator`, `AlmonaCuttingEngine`, or `production/*`
- use `Cut.angle == 45`
- stack on K-factor, burn-off, or sash inner + Basma + Kaynak + Weld
- treat mixed angles as 45°/45°
- silently inherit to other systems or profiles

---

## Required guardrails

1. Fail closed unless `profileSystem` is exactly the measured Deceuninck 70 string.
2. Fail closed unless `profileCode` is on the measured 45° or 90° allowlist.
3. Require both end angles; never default missing to 45.
4. Mixed angles stay `UNPROVEN` / `FAIL_CLOSED`.
5. Apply weld only at Design Report → Required Parts.
6. Fail closed for Welding Waste outside `{0, 2, 3}`.
7. Keep `GENERALIZED_MANUFACTURING_FORMULA = UNPROVEN`.
8. Keep FP-027 root cause `UNPROVEN`; do not combine defects.

---

## Remaining risks

- Parity adapter currently defaults missing angles to 45 (`DowinParityLengthEngine.ts:165-166`).
- Parity adapter does not currently ingest Design Report millimetres (`nominalLengthMm` is null in `almonaParityActualsForAsdd()`).
- Production `Cut` has no dual-end angle pair.
- Deceuninck 70 is evidence-canonical, not a `SYSTEM_PACKS` identity.
- Measured weld domain is `{0, 2, 3}` only.

---

## Score

Physical-length correctness remains **6.0/10**. C.11 authorization alone does not move the score.

---

## FP-027 firewall

No change. ORTA conservation surplus evidence is unrelated to C.11 formula authorization. Do not combine the defects.

---

## Formula freeze

No edits to:

- `src/lib/fabricator/ManufacturingSettings.ts`
- `src/lib/fabricator/barPackAccounting.ts`
- `src/lib/fabricator/UPVCCuttingEngine.ts`
- `src/lib/fabricator/dowinParity/DowinParityLengthEngine.ts`
- `src/lib/fabricator/production/**`

---

## Object

`FP024C11_FORMULA_SCOPE_AUTHORIZATION` in `src/lib/fabricator/dowinParity/optimizerStateProvenance.ts`.
