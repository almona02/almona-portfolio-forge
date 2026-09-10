# FP-024C.1 — Optimization State Provenance Checkpoint

| Field | Value |
|-------|--------|
| Date | 10–11 September 2026 |
| Branch | `feature/fp024c-physical-parity` |
| Origin HEAD | `056f100` — `FP-024C: classify BASELINE_REPRODUCTION_RUN as REPRODUCED` |
| Prior local HEAD | `332914f` — `audit: record FP-024C.1 state provenance checkpoint` (4 commits ahead of origin) |
| This checkpoint commits | `7f602e9` harden; `5f7589c` intake; `184fcf3` tests; this audit commit |
| Gate | ⏸ **PENDING_OPERATOR_RUN** |
| Physical-length score | **Unchanged at 6.0/10** |
| PR #32 | Draft / **DO NOT MERGE** |

---

## Verdict

```
FP-024C ⏸ STATE PROVENANCE INVESTIGATION
FP-024C.1 PENDING_OPERATOR_RUN

Test 2 packed/machine:
✅ PROVEN — fixture-specific only

Test 3 remainder:
⚠️ AMBIGUOUS / UNPROVEN

Test 4 remainder:
⚠️ AMBIGUOUS

BASELINE_RESET_VALIDATION:
❌ topology REPRODUCTION_FAILED
✅ machine-length signature recovered

Fresh A:
PENDING_OPERATOR_RUN

Fresh B:
PENDING_OPERATOR_RUN

Fresh C:
PENDING_OPERATOR_RUN

90° CONTROL_FIXTURE:
GATED

Physical-length correctness:
6.0/10

Production formulas:
FROZEN

PR #32:
DRAFT / DO NOT MERGE
```

FP-024C.1 answers one question:

> **Why can identical visible geometry/settings produce different optimization remainder topology?**

No licensed DoWin Fresh A/B/C package was ingested. Schema, ingest gate, comparators, tests, and pending templates are in place. Millimetres and SHA-256 values were not fabricated.

This audit does **not** claim an ALMONA source finding explains DoWin internals.

---

## Files changed (this checkpoint vs `332914f`)

| Path | Role |
|------|------|
| `src/lib/fabricator/dowinParity/canonicalFingerprint.ts` | Omit timestamp/result/project IDs from optimizer-input fingerprints |
| `src/lib/fabricator/dowinParity/optimizerStateProvenance.ts` | Fresh A/B/C intake, 3-run nondeterminism gate, ALMONA forensic table |
| `src/lib/fabricator/dowinParity/dowinCompensationEvidence.ts` | Fresh A/B/C pending templates; fail-closed ingest; 90° stays gated |
| `src/tests/fabricator/dowinCompensationReconciliation.test.ts` | Catalog length 10; 3-run classifier; 90° not opened by recovered reset |
| `src/tests/fabricator/dowinOptimizationStateProvenance.test.ts` | Fingerprint, freshness, grouping, Clear Screen, forensic surface proofs |
| `docs/audits/FP-024C-PHYSICAL-FORMULA-PARITY_2026-09-09.md` | Fresh A/B/C + fail-closed classifier rules |
| `docs/audits/FP-024C1-OPTIMIZATION-STATE-PROVENANCE_2026-09-10.md` | This checkpoint |

Historical FP-024C.1 files already on the branch (`dowinPhysicalLengthFixture.ts`, length/topology split) were not mutated for manufacturing formulas.

---

## ALMONA forensic file:line findings

These rows describe **ALMONA**. They do not explain DoWin.

| Surface | file:line | Classification | Defect? |
|---------|-----------|----------------|---------|
| New AdaptiveSolver per OptimizationPage run | `OptimizationPage.tsx:78-107` | INPUT_IDENTITY_ONLY | no |
| AlgorithmSelector / AdaptiveSolver algorithm choice | `AlgorithmSelector.ts:73`; `adaptiveSolver.ts:45-98` | TOPOLOGY_AFFECTING | no |
| FFD / equal-length sort | `OptimizationEngine.ts:116-117`; `greedyHeuristic.ts:100-129` | TOPOLOGY_AFFECTING | **ALMONA_REPRODUCIBILITY_DEFECT** (tie-break / sort stability) |
| Stock IDs `Date.now` + `Math.random` | `OptimizationEngine.ts:203` | RESULT_METADATA_ONLY | **ALMONA_REPRODUCIBILITY_DEFECT** (excluded from topology fingerprint) |
| Persist `optimizationResult` | `workflowStore.ts:106-219` | PERSISTENCE_ONLY | **ALMONA_REPRODUCIBILITY_DEFECT** (`fabricator-workflow-storage`) |
| `AlmonaCuttingEngine` remnantCache | `AlmonaCuttingEngine.ts:193-239` | TOPOLOGY_AFFECTING | if `setRemnants` used |
| Genetic / Math.random GA | `geneticOptimization.ts`; `RemnantFirstGeneticOptimizer.ts:700-706` | ADVISORY_ONLY | not Tier-3 |
| Project IDs on measurement create | `workflowStore.ts:127` | INPUT_IDENTITY_ONLY | container identity only |

Production optimizer behavior was **not** patched. Defects are evidence-infrastructure classifications only.

These ALMONA surfaces can contaminate **ALMONA** reproducibility evidence (persisted result reuse, equal-length sort order, remnant cache). They are not a DoWin causal claim.

---

## Input fingerprint / equivalence gate

- Canonical JSON: sorted object keys, arrays preserve semantic order, null stays null, undefined is rejected (not coerced to positive evidence).
- Optimizer-**input** fingerprints omit `timestampIso` / `timestamp` / `runId` / `optimizationResultId` / `optimizationHistoryId` / `projectId` / `designId` / `productionPlanId`.
- Result UUID/timestamp changes do not change topology identity.
- Same utilization with different bar assignment = different topology.
- Same total remainder with different distribution = different topology.
- Same pieces with different bar grouping = different topology.
- Missing snapshots/fingerprints ⇒ `UNPROVEN`. Missing provenance never becomes `IDENTICAL`.
- Machine-output reproduction and optimizer-topology reproduction remain separate verdicts.

---

## Topology-signature rules

Each bar: profile, stock-bar id (signature only), ordinal, stock length, piece sequence (physical/source/external IDs, role, packed mm, angles), remainder mm.

Fingerprint **excludes** stock-bar UUID and report timestamp. Comparison is not utilization, total waste, bar count, or summed remainder.

---

## External evidence (already measured; no new DoWin run)

1B original topology: KASA 965 / KANAT 2203 / ORTA 5080 / CITA 206 / 6160.

Later/reset topology: KASA 960 / KANAT 2198 / ORTA 5079 / CITA 3178×2.

Machine lengths recovered at reset: 454 / 1433 / 1003 / 1503 / 1416.

Test 2: Welding Waste packed/machine PROVEN on asdd 45° KASA/KANAT; **not** a general `packed = nominal + WeldingWaste` formula; **not** “all 45° pieces receive WeldingWaste”; **not** `machine = nominal + WeldingWaste`; **no +3 encoded**.

Test 3 remainder: AMBIGUOUS / UNPROVEN after reset.

Test 4 remainder: AMBIGUOUS (not Trim).

Reset: combined `REPRODUCTION_FAILED`; length-layer `REPRODUCED`; topology `REPRODUCTION_FAILED`.

90° CONTROL_FIXTURE: GATED. Recovered 1B reset is not enough. Fresh A returning original topology does not open it. Fresh B/C (or an explicit non-PENDING/AMBIGUOUS classifier conclusion plus measured A/B/C) is required.

Clear Screen on `asdd` is not freshness.

---

## Fresh A/B/C operator package required

Catalog templates: `FP024C1_FRESH_A`, `FP024C1_FRESH_B`, `FP024C1_FRESH_C` — all `PENDING_OPERATOR_RUN`.

Each run must supply:

- `runId`, timestamp, projectId, designId, productionPlanId
- optimizationResultId and/or optimizationHistoryId if exposed
- `solveDisposition = NEWLY_SOLVED`
- optimizer/version, algorithm, seed if knowable (otherwise `null` / NOT_MEASURED)
- machine = DC-600
- settings: Welding Waste 3 mm, Saw Thickness 4 mm, Trim Cut 0 mm
- geometry / required-parts / stock / offcut-remnant snapshots (empty offcut list allowed; `null` is not)
- SHA-256 of General Settings screenshot, Design Preview, Labels/Assembly, Optimization report; machine export if generated, else `null` / NOT_MEASURED
- bar-by-bar transcription: profile, stock identity if exposed, ordinal, stock length, piece sequence, Cut identity where available, packed mm, angles, remainder

Unavailable external values stay `null` / NOT_MEASURED / UNPROVEN. Do not invent values.

Intake rejects or downgrades to AMBIGUOUS when project/design/plan/result is reused, provenance is missing, fingerprints are incomplete, settings/geometry/machine/stock/parts/offcut differ, hashes are missing, only utilization/waste is provided, or the operator claims equivalence without evidence.

Classifier:

- `PENDING_OPERATOR_RUN` until measured Fresh A/B/C exist
- `PERSISTED_STATE_EFFECT_PROVEN` only with proven-identical inputs + reused later topology B + genuinely fresh original topology A
- `ALTERNATIVE_OPTIMIZER_SOLUTION` only after ≥3 newly solved IDENTICAL fresh runs all later topology
- `OPTIMIZER_NONDETERMINISM_OR_TIE_BREAKING` only after ≥3 newly solved IDENTICAL fresh runs with more than one topology
- `HIDDEN_INPUT_DIFFERENCE` only with a concrete fingerprint/snapshot difference
- `AMBIGUOUS` for incomplete provenance, reused without counterpart, missing fingerprints, or fewer than three fresh runs

One fresh run must never be described as consistent.

---

## Tests and freeze

| Check | Result |
|-------|--------|
| `npm run type-check` | Pass (`tsc --noEmit`) |
| `npx vitest run src/tests/fabricator/dowinCompensationReconciliation.test.ts` | Pass |
| `npx vitest run src/tests/fabricator/dowinPhysicalLengthGolden.pending.test.ts` | Pass |
| `npx vitest run src/tests/constitutional/ManufacturingSettingsContract.test.ts` | Pass |
| `npx vitest run src/tests/fabricator/dowinOptimizationStateProvenance.test.ts` | Pass |
| Combined above | 4 files, **65 tests passed** |
| `npm run build` | Pass (`vite build --mode production`) |
| Formula freeze this work vs HEAD (`332914f`) | No diff in `barPackAccounting.ts`, `UPVCCuttingEngine.ts`, `ManufacturingSettings.ts`, `src/lib/fabricator/production` |
| Historical branch diffs vs `main` | ManufacturingSettings snapshot helpers + CutSheet layer fields + machine-export preflight remain from earlier FP-024A/C diagnostic work — not new formula mutation |
| Licensed artifacts | Excluded (SHA-256 only; PDFs/MDB/DW/screenshots not committed) |

No evidence code mutates `ManufacturingSettings`, `barPackAccounting`, or production Cut lengths. No runtime `+3` / `+7` constants were introduced.

---

## Remaining operator evidence

1. Fresh A: new project/design, new production plan, newly solved result, same visible geometry/settings/stock, full provenance package + bar-assignment transcription.
2. Fresh B, then Fresh C. One run cannot claim consistency.
3. Do not run the 90° control until an explicit provenance verdict authorizes continuation.
4. Do not merge PR #32.
