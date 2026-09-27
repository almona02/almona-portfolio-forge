# FP-024C.13 — Golden Replay + Bounded Parity Stage Closeout

| Field | Value |
|-------|--------|
| Date | 13 September 2026 |
| Branch | `feature/fp024c-physical-parity` |
| Starting HEAD | `6bb2f1d` — `FP-024C.12.1: wire bounded Weld parity rule` |
| PR #32 | Draft / **DO NOT MERGE** — blocker is FP-027, not FP-024C |
| Gate | **FP024C_BOUNDED_PARITY_STAGE = COMPLETE** (parity adapter only) |
| Independent review | ✅ **ACCEPTED** (13 September 2026) |
| Physical-length correctness | **7.5/10** — bounded Deceuninck 70 parity proven and implemented; canonical production/generalized formula still incomplete |
| Canonical production | **UNCHANGED / does not consume the parity API** |
| Generalized formula | **UNPROVEN** |
| FP-027 | Root cause **UNPROVEN**; unused in this replay |

---

## Verdict

```
FP-024C.10 ✅ ACCEPTED
FP-024C.11 ✅ ACCEPTED
FP-024C.12 ✅ CLOSED for authorized scope
FP-024C.12.1 ✅ PROVEN

FP024C13_GOLDEN_REPLAY = PASS
FP024C_BOUNDED_PARITY_STAGE = COMPLETE
FP024C_DECEUNINCK70_MEASURED_SCOPE = PROVEN_AND_IMPLEMENTED_IN_PARITY_ADAPTER

FP024C12_IMPLEMENTATION_SCOPE = PARITY_ADAPTER_ONLY
WIRED_PARITY_ADAPTER_ONLY =
  the parity API is implemented and callable;
  canonical Fabricator production does NOT consume it.

GENERALIZED_MANUFACTURING_FORMULA = UNPROVEN
PR #32 = KEEP_DRAFT_DO_NOT_MERGE
PR merge blocker = FP-027_UNRESOLVED (not FP-024C)
Physical-length correctness = 7.5/10
Independent review = ACCEPTED
```

## Independent review (13 September 2026)

C.13 is **ACCEPTED**. Bounded FP-024C parity is **finished**. Zero further DoWin experiments for this stage.

Physical-length correctness moved **6.0/10 → 7.5/10**. Not 8.5–9: live canonical production still does not consume the proven parity behavior.

PR #32 stays **KEEP_DRAFT_DO_NOT_MERGE** because the same branch still contains unresolved FP-027 work. Do not reopen FP-024C to make the PR mergeable.

Repository checkpoint:

```
FP-024C = COMPLETE (bounded parity scope)
Physical-length correctness = 7.5/10
FP-027 = OPEN / root cause UNPROVEN
PR #32 = DRAFT / DO NOT MERGE
No more FP-024C experiments
```

Anything after this is a new stage: Canonical Production Length Authority. That stage is **not started**.

---

## Semantic-layer contract

| Direction | Layer |
|-----------|--------|
| Input | `DESIGN_REPORT` |
| Output | `REQUIRED_PARTS` |

Not replayed as formula operations: REQUIRED_PARTS → PACKED, PACKED → MACHINE. External evidence already showed those later deltas as zero on measured machine-supported rows; they remain observations.

---

## Golden supported matrix (27 cases)

Public API, exact integer millimetres, `supported = true`.

### Golden A — asdd / Weld 3

| Profile | Angles | Report | Expected | Actual | Δ | Verdict |
|---------|--------|--------|----------|--------|---|---------|
| KASA | 45/45 | 1000 | 1003 | 1003 | 0 | PASS |
| KASA | 45/45 | 1500 | 1503 | 1503 | 0 | PASS |
| KANAT | 45/45 | 451 | 454 | 454 | 0 | PASS |
| KANAT | 45/45 | 1430 | 1433 | 1433 | 0 | PASS |
| ORTA | 90/90 | 1416 | 1416 | 1416 | 0 | PASS |

### Golden B — asdd / Weld 0

| Profile | Report | Expected | Actual | Verdict |
|---------|--------|----------|--------|---------|
| KASA | 1000 | 1000 | 1000 | PASS |
| KASA | 1500 | 1500 | 1500 | PASS |
| KANAT | 451 | 451 | 451 | PASS |
| KANAT | 1430 | 1430 | 1430 | PASS |
| ORTA | 1416 | 1416 | 1416 | PASS |

### Golden C — asdd / Weld 2

| Profile | Report | Expected | Actual | Verdict |
|---------|--------|----------|--------|---------|
| KASA | 1000 | 1002 | 1002 | PASS |
| KASA | 1500 | 1502 | 1502 | PASS |
| KANAT | 451 | 453 | 453 | PASS |
| KANAT | 1430 | 1432 | 1432 | PASS |
| ORTA | 1416 | 1416 | 1416 | PASS |

### Golden D — C.5 / Weld 3

| Profile | Report | Expected | Actual | Verdict |
|---------|--------|----------|--------|---------|
| KASA | 1200 | 1203 | 1203 | PASS |
| CITA | 537 | 540 | 540 | PASS |
| CITA | 1116 | 1119 | 1119 | PASS |
| ORTA | 1116 | 1116 | 1116 | PASS |

### Golden E — C.5 / Weld 0

| Profile | Report | Expected | Actual | Verdict |
|---------|--------|----------|--------|---------|
| KASA | 1200 | 1200 | 1200 | PASS |
| CITA | 537 | 537 | 537 | PASS |
| CITA | 1116 | 1116 | 1116 | PASS |
| ORTA | 1116 | 1116 | 1116 | PASS |

### Golden F — C.5 / Weld 2

| Profile | Report | Expected | Actual | Verdict |
|---------|--------|----------|--------|---------|
| KASA | 1200 | 1202 | 1202 | PASS |
| CITA | 537 | 539 | 539 | PASS |
| CITA | 1116 | 1118 | 1118 | PASS |
| ORTA | 1116 | 1116 | 1116 | PASS |

Mismatch count: **0**. 90° ORTA negative control: **PASS** (Weld 0/2/3, both fixtures, no weld added).

---

## Fail-closed / unsupported (16 cases)

All `supported = false`, `authoritativeLengthMm = null`.

Weld 1, 4, negative, NaN; 45/90; 90/45; missing left; missing right; 30/30; substring system `Deceuninck`; unsupported profile; alias `KANAT-70`; PACKED / MACHINE / REQUIRED_PARTS source; wrong target PACKED.

Fail-closed pass count: **16 / 16**. Failures: **0**.

No-fallback: missing angle does not become 45; mixed angles not treated as 45/45; Weld 1 not extrapolated to +1; substring system rejected; alias profile rejected.

---

## Call graph / double-count

```
computeDowinRequiredPartsFromDesignReport
  → evaluateDowinRequiredPartsWeldAdjustment

sashHorizontalCutMm ↛ Required Parts API
sashVerticalCutMm ↛ Required Parts API
computeDowinParityLengths → sash packed formula ↛ Required Parts API
```

Inverse: Required Parts helper source does not mention sash packed functions.

Canonical production callers of `computeDowinRequiredPartsFromDesignReport` under `src/lib` excluding `dowinParity/`: **none**.

---

## Authority matrix

| Topic | Authority |
|-------|-----------|
| Layer semantics | PROVEN_FOR_C5 |
| Weld causality | PROVEN_FOR_MEASURED_CONDITIONS |
| Profile coverage | KASA + KANAT + CITA |
| 0/2/3 linearity | PROVEN_FOR_MEASURED_DECEUNINCK70_45_CONDITIONS |
| 90° ORTA no-effect | REPLICATED_ACROSS_TWO_FIXTURES |
| Parity helper | IMPLEMENTED |
| Parity API wiring | PROVEN |
| Golden replay | PASS |
| Fail-closed unsupported scope | PASS |
| Canonical production integration | NONE |
| Generalized formula | UNPROVEN |
| FP-027 root cause | UNPROVEN |

---

## Remaining unproven

Canonical Fabricator production formula; other systems; mixed-angle cuts; Weld outside `{0,2,3}`; Saw/Trim piece-length formulas; FP-027 conservation; treating later packed/machine equality as a new formula.

---

## Score (accepted)

**Physical-length correctness = 7.5/10** — bounded Deceuninck 70 parity scope proven and implemented; canonical production/generalized formula still incomplete.

| Dimension | Note |
|-----------|------|
| Evidence quality | Strong measured 0/2/3, two fixtures |
| Layer semantics | Report → Required Parts isolated |
| Causal isolation | Weld vs Saw/Trim already separated |
| Profile coverage | KASA + KANAT + CITA measured |
| Intermediate-value linearity | 0/2/3 on 45° |
| Fail-closed implementation | PASS |
| Golden replay | 27/27 PASS |
| Canonical production coverage | NONE — limiter; keeps the score below 8.5–9 |
| Cross-system coverage | None |
| Mixed-angle coverage | Fail closed / UNPROVEN |

---

## PR #32 recommendation

**KEEP_DRAFT_DO_NOT_MERGE**

The reason is no longer FP-024C. FP-024C is closed for its bounded scope. The merge blocker is unresolved FP-027 experimental/conservation work on the same PR/branch.

---

## FP-027 firewall

Replay does not use ORTA quantity surplus. No FP-027 code changes. Root cause UNPROVEN.

---

## Tests / build

| Check | Result |
|-------|--------|
| `npm run type-check` | PASS |
| C.6–C.13 / helper / parity API / golden / fail-closed / freeze | 154/154 PASS |
| Broader `src/tests/fabricator` | 197/197 PASS |
| `npm run build` | PASS |

Canonical production files remain at zero diff for this gate.

---

## Object

`FP024C13_GOLDEN_REPLAY_CLOSEOUT` in `optimizerStateProvenance.ts`.  
Replay runner: `src/lib/fabricator/dowinParity/fp024c13GoldenReplay.ts`.
