# FP-024C.1 — Optimization State Provenance Checkpoint

| Field | Value |
|-------|--------|
| Date | 10 September 2026 |
| Branch | `feature/fp024c-physical-parity` |
| Origin HEAD (at audit start) | `056f100` — `FP-024C: classify BASELINE_REPRODUCTION_RUN as REPRODUCED` |
| Local vs origin | Working tree was ahead of origin with uncommitted isolation + provenance work; no extra local commits at start. Public Draft PR #32 description still reflected the earlier 1B/Test-2 stage and is not the authority. |
| Gate | ⏸ **PENDING_OPERATOR_RUN** |
| Physical-length score | **Unchanged at 6.0/10** |
| PR #32 | Draft / **DO NOT MERGE** |

---

## Verdict

```
FP-024C ⏸ STATE PROVENANCE INVESTIGATION
FP-024C.1 PENDING_OPERATOR_RUN

Test 2 packed/machine:
✅ PROVEN for this fixture

Test 3 remainder:
⚠️ AMBIGUOUS / UNPROVEN

Test 4 remainder:
⚠️ AMBIGUOUS

BASELINE_RESET_VALIDATION:
❌ REPRODUCTION_FAILED for topology
✅ machine-length signature recovered

90° CONTROL_FIXTURE:
GATED

Physical-length correctness:
6.0/10

Production formulas:
FROZEN

FP-016:
NOT STARTED

FP-017:
NOT STARTED

PR #32:
DRAFT
DO NOT MERGE
```

FP-024C.1 answers one question:

> **Why can identical visible geometry/settings produce different optimization remainder topology?**

No licensed DoWin Fresh A/B/C package was ingested. Schema, ingest gate, comparators, tests, and pending templates are in place. Millimetres and provenance IDs were not fabricated.

This audit does **not** claim an ALMONA source finding explains DoWin.

---

## Files changed (this checkpoint)

| Path | Role |
|------|------|
| `src/lib/fabricator/dowinParity/canonicalFingerprint.ts` | Canonical deterministic serialization + SHA-256 fingerprints (test/reference) |
| `src/lib/fabricator/dowinParity/optimizerStateProvenance.ts` | Provenance model, topology signature, input equivalence, classification |
| `src/lib/fabricator/dowinParity/dowinCompensationEvidence.ts` | Existing calibration catalog extended; length vs topology split |
| `src/lib/fabricator/golden/dowinPhysicalLengthFixture.ts` | SHA-256 of Tests 2–4 + reset artifacts (licensed files not committed) |
| `src/tests/fabricator/dowinCompensationReconciliation.test.ts` | Isolation + ingest gate updates |
| `src/tests/fabricator/dowinOptimizationStateProvenance.test.ts` | FP-024C.1 proofs |
| `docs/audits/FP-024C-PHYSICAL-FORMULA-PARITY_2026-09-09.md` | Isolation board + provenance question |
| `docs/audits/FP-024C1-OPTIMIZATION-STATE-PROVENANCE_2026-09-10.md` | This checkpoint |

---

## Optimizer provenance surfaces (ALMONA forensic)

These rows describe **ALMONA**. They do not explain DoWin internals.

| Surface | file:line | persisted? | affects optimizer input? | affects selected result? | deterministic? | evidence gap |
|---------|-----------|------------|----------------------------|--------------------------|----------------|---------------|
| Optimizer entry (workflow) | `src/pages/fabricator/workflow/OptimizationPage.tsx:78-107` | Yes via store | Yes — `CuttingJob` from `currentProject.components` | Yes — `setOptimizationResult` | Solver-dependent | No production-plan / history ID captured |
| Algorithm selection | `src/lib/fabricator/AlgorithmSelector.ts:73-80`; `src/algorithms/adaptiveSolver.ts:45-98` | No | Yes | Yes | Tier-3 greedy/linear; genetic excluded | Complexity thresholds can change algorithm |
| Required-cuts construction | `OptimizationPage.tsx:74-83`; `adaptiveSolver.ts:105-119` | Indirect | Yes | Yes | Order follows `job.components` | Component array order is semantically input |
| Input ordering / sort | `OptimizationEngine.ts:116-117`; `greedyHeuristic.ts:100-129`; `StockOptimizer.ts:43-44` | No | Yes | Yes | Length-descending FFD; equal lengths keep array order | JS `sort` is not a stable tie-break guarantee for equal lengths |
| Stock construction | `OptimizationEngine.ts:198-209`; `StockOptimizer.ts:47-79` | No | Yes | Yes | Default 6000 mm | Bar IDs use `Date.now` + `Math.random` (`OptimizationEngine.ts:203`) |
| Remnant/offcut inclusion | `AlmonaCuttingEngine.ts:193-239, 328-384` | Instance `remnantCache` | Yes if `setRemnants` used | Yes | Remnant IDs `REM-${barNumber}` are deterministic | Whether DoWin remainder topology includes remnants is unproven |
| Stock identity / ordinal | `StockOptimizer.ts:72-74` (`bar-${n}`) | No | Ordinal is packing order | Yes | Sequential | DoWin stock-bar identity not captured until operator snapshot |
| Result persistence | `src/store/workflowStore.ts:106-219` | **Yes** — zustand persist `fabricator-workflow-storage` includes `optimizationResult` | Rehydrate can feed a later UI | Yes — selected result survives reload | Rehydrate restores last result | **Clear Screen analogue is `clearWorkflow`; persist can outlive UI clear if not called** |
| Result reuse | `workflowStore.ts:150-152, 207-219` | Yes | Can skip a new solve | Yes | Last stored result | No `solveDisposition` in production UI |
| Selected-result logic | `OptimizationPage.tsx:107`; `workflowStore.ts:113` | Yes | N/A | Single current result | Last write wins | No history / selectedResult ID |
| Optimization history | Not modeled in workflow store | No | Unknown | Unknown | N/A | **Gap: no optimizationHistoryId in ALMONA workflow** |
| Cache / state | `goldTier/ApexEngineV6.ts:204-240` TTL cache | Yes (in-memory) | Can return cached result | Yes | Cache keyed; TTL uses `Date.now` | Not on DoWin path; ALMONA risk if reused |
| Randomness / seed | `algorithms/geneticOptimization.ts`; `RemnantFirstGeneticOptimizer.ts:700-706` | N/A | Advisory GA only | Not Tier-3 | Non-deterministic | Genetic is not manufacturing authority (FP-016 Option B) |
| Unstable tie-break | `greedyHeuristic.ts:105` `b.length - a.length` | No | Equal-length order | Possible | Unstable for ties | Equal packed lengths can permute |
| Object/map iteration | `adaptiveSolver.ts:109` `profileMap` / `stockLengths` Set | No | Set iteration not used as pack order | Unlikely | Insertion order for Set | Pack order comes from sorted cuts |
| Timestamp identity | `OptimizationEngine.ts:203`; `workflowStore.ts:127` project IDs | Yes | Project IDs if compared | Metadata only | Non-deterministic IDs | Topology fingerprint **excludes** these IDs |
| Array mutation during pack | `greedyHeuristic.ts:26` copies cuts; `StockOptimizer.ts:57` mutates bars | Local | Working copy | Yes | Engine-local | Original cut list copied in greedy |
| Solver object reuse | `OptimizationPage.tsx:88` `new AdaptiveSolver` per run; `simplifiedOptimizationEngine` singleton (`OptimizationEngine.ts:214`) | Singleton engine | Config via micronEngine | Yes | New AdaptiveSolver each page run; singleton FFD engine | Singleton does not keep prior bars |

---

## New evidence types

- `OPTIMIZATION_STATE_PROVENANCE_AUDIT` (existing run kind, now structured)
- `OptimizerRunProvenance` / `solveDisposition`: `NEWLY_SOLVED` | `REOPENED` | `REUSED` | `UNKNOWN`
- `OptimizerInputEquivalence`: `IDENTICAL` | `DIFFERENT` | `UNPROVEN`
- `OptimizationStateProvenanceVerdict`: `PENDING_OPERATOR_RUN` | `PERSISTED_STATE_EFFECT_PROVEN` | `ALTERNATIVE_OPTIMIZER_SOLUTION` | `OPTIMIZER_NONDETERMINISM_OR_TIE_BREAKING` | `HIDDEN_INPUT_DIFFERENCE` | `AMBIGUOUS`
- Split reset verdicts: `lengthLayerVerdict` vs `topologyVerdict`

## Input fingerprint rules

- Canonical JSON: sorted object keys, arrays preserve order, null stays null, undefined is rejected (not coerced).
- Unit `'mm'` is explicit in fingerprint payloads.
- Optimizer-**input** fingerprints exclude timestamp, result ID, history ID, project/design IDs, and random UUIDs.
- Missing snapshots ⇒ fingerprint `null` ⇒ equivalence `UNPROVEN`. Missing provenance never becomes `IDENTICAL`.
- External file hashes remain operator SHA-256; unprovided files stay `null` / `NOT MEASURED`. Fake hashes are not generated.

## Topology signature rules

Each bar: profile, stock-bar id (signature only), ordinal, stock length, piece sequence (physical/source/external IDs, role, packed mm, angles), remainder mm.

Fingerprint **excludes** stock-bar UUID and report timestamp. Comparison is not utilization, total waste, bar count, or summed remainder.

| Case | Result |
|------|--------|
| Same utilization, different pieces | DIFFERENT TOPOLOGY |
| Same total remainder, different distribution | DIFFERENT TOPOLOGY |
| Same pieces, different bar grouping | DIFFERENT TOPOLOGY |
| Same bars, different semantically meaningful piece order | DIFFERENT TOPOLOGY |
| Same topology, different report timestamp / result UUID | SAME TOPOLOGY |

## External evidence (already measured; no new DoWin run)

1B original topology: KASA 965 / KANAT 2203 / ORTA 5080 / CITA 206 / 6160.

Later/reset topology: KASA 960 / KANAT 2198 / ORTA 5079 / CITA 3178×2.

Machine lengths recovered at reset: 454 / 1433 / 1003 / 1503 / 1416.

Test 2: Welding Waste packed/machine PROVEN on asdd 45° KASA/KANAT; not a general formula.

Test 3 remainder: AMBIGUOUS / UNPROVEN after reset.

Test 4 remainder: AMBIGUOUS (not Trim).

Reset: combined `REPRODUCTION_FAILED`; length-layer `REPRODUCED`; topology `REPRODUCTION_FAILED`.

90° CONTROL_FIXTURE: gated on reset recovering 1B topology.

Clear Screen on `asdd` is not freshness. Decisive package: Fresh A, Fresh B, Fresh C from equivalent fresh state.

A single fresh run cannot claim consistency. `ALTERNATIVE_OPTIMIZER_SOLUTION` requires three newly solved equivalent runs. `PERSISTED_STATE_EFFECT_PROVEN` requires a captured reused/reopened counterpart with later topology **and** a genuinely fresh solve with original topology under proven-identical input fingerprints.

---

## Tests and freeze

See “Verification” below (filled after commands).

Formula freeze: this FP-024C.1 work adds no mutation to `barPackAccounting.ts`, `UPVCCuttingEngine.ts`, `ManufacturingSettings.ts`, or `src/lib/fabricator/production`. Pre-FP-024C.1 branch diffs vs `main` in ManufacturingSettings snapshot helpers and CutSheet layer fields remain from earlier FP-024A/C diagnostic work.

Licensed PDFs/MDB/DW/screenshots are not committed. SHA-256 only.

---

## Remaining operator evidence

1. Fresh project/design (not Clear Screen on `asdd`).
2. Fresh production plan + newly solved optimization result (not reopened/reused).
3. Same geometry, Deceuninck 70, Weld 3 / Saw 4 / Trim 0, DC-600, same stock lengths/quantities, same offcut/remnant availability.
4. Repeat as Fresh A / B / C.
5. Per run: General Settings screenshot, IDs, required-parts/stock/offcut snapshots, SHA-256 of supplied artifacts, bar-by-bar assignment transcription.
6. Do not run the 90° control until an explicit provenance verdict authorizes continuation.

---

## Verification

| Check | Result |
|-------|--------|
| `npm run type-check` | Pass (`tsc --noEmit`) |
| `npx vitest run src/tests/fabricator/dowinCompensationReconciliation.test.ts` | Pass |
| `npx vitest run src/tests/fabricator/dowinPhysicalLengthGolden.pending.test.ts` | Pass |
| `npx vitest run src/tests/constitutional/ManufacturingSettingsContract.test.ts` | Pass |
| `npx vitest run src/tests/fabricator/dowinOptimizationStateProvenance.test.ts` | Pass |
| Combined above | 4 files, 57 tests passed |
| `npm run build` | Pass (`vite build --mode production`, ~54s) |
| Formula freeze this work vs HEAD | No diff in `barPackAccounting.ts`, `UPVCCuttingEngine.ts`, `ManufacturingSettings.ts`, `src/lib/fabricator/production` |
| Licensed artifacts | Excluded (SHA-256 only in golden fixture) |

---

## Next operator artifact required

FP-024C.1 Fresh A: new project/design, new production plan, newly solved result, same visible geometry/settings/stock, full provenance package + bar-assignment transcription. Then Fresh B and Fresh C. Do not merge PR #32.
