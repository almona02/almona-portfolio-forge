# CHECKPOINT — Gate 2 Manufacturing Truth (2026-09-08)

**Branch:** `main`  
**Gate:** Manufacturing truth (FP-016 Option B → FP-017)  
**Prior locked score (Pre–Gate 2):** ~7.4 / 10  

---

## Final Gate 2 verdict

**⚠️ CONDITIONAL**

FP-016 Option B and FP-017 QC/CutSheet/CNC identity are proven on the canonical Fabricator optimization → cut → CutSheet → CNC → QC path with failing-closed authority checks and focused regression tests. Residual risks remain outside full delivery persistence and on non-canonical advisory genetic modules that still exist in-repo but are no longer wired into mass manufacturing optimizers.

**Score revision (evidence-backed):**

| Objective | Pre–Gate 2 | After Gate 2 |
|-----------|----------:|-------------:|
| Manufacturing determinism | 4.5 | **7.5** |
| Physical-cut identity / QC | 5.5 | **7.5** |
| Ticketing DB boundary | 8.5 | 8.5 (unchanged) |
| Shipability | 8.0 | 8.0 |
| Security / Gate 1 | 7.5 | 7.5 |
| Fabricator Studio | 7.6 | 7.6 |
| Application integrity | 5.5 | 5.5 |
| Commercial shell | 3.0 | 3.0 |
| **Overall Gold-Tier** | ~7.4 | **~7.7** |

Do not treat CONDITIONAL as Production Ready / Gold-Tier Ready for the full platform.

---

## FP-016

### Authority call graph (traced)

Canonical manufacturing authority path:

1. **Studio / legacy workflow UI**
   - `src/pages/fabricator/workflow/OptimizationPage.tsx` — `new AdaptiveSolver` → `solver.solve` → `setOptimizationResult`
   - `src/pages/FabricatorWorkflow.tsx` — `new EnhancedAdaptiveSolver` → `solveEnhanced` → project `optimization.cuttingPlan`
2. **Tier-3 solver**
   - `src/algorithms/adaptiveSolver.ts` — `selectAlgorithm` (greedy|linear only) → `executeOptimization` (asserts Tier-3) → `GreedyHeuristic` / `LinearProgrammingOptimizer`
   - `src/algorithms/EnhancedAdaptiveSolver.ts` — `selectAlgorithmByRule` via `AlgorithmSelector.selectByRule` + `assertNotAdvisoryManufacturingAuthority`; refinement no longer returns genetic
3. **Selector / fail-closed**
   - `src/lib/fabricator/AlgorithmSelector.ts` — Tier-3 rules; `suggestAdvisoryGenetic`; `authorizeForManufacturing` throws on genetic/advisory
   - `src/lib/fabricator/manufacturingAuthority.ts` — `assertTier3ManufacturingAlgorithm`, `ManufacturingAuthorityError`
4. **Downstream consumers of authoritative `cuttingPlan`**
   - Production UI: `ProductionPage.tsx` reads `optimizationResult`
   - CutSheet: `src/lib/fabricator/production/CutSheetGenerator.ts`
   - CNC: `src/lib/cnc/CNCIntegration.ts`
   - QC: `QualityVerificationEngine.verifyProfileCuts`

**Pre-fix genetic → authority holes found and closed:**

| Location | Evidence | Fix |
|----------|----------|-----|
| `EnhancedAdaptiveSolver.selectRefinementAlgorithm` | previously returned `'genetic'` for refinement | now Tier-3 only (`greedy`/`linear`) |
| `AdaptiveSolver.executeOptimization` | previously defaulted unknown algorithms to greedy silently | now `assertTier3ManufacturingAlgorithm` throws |
| `massProductionOptimizer.ts` | used `GeneticOptimizer` for mass-mode plans | now `GreedyHeuristic` |
| `HybridMassOptimizer.ts` | `optimizeWithGenetic` | now `optimizeRemainingDeterministic` + greedy |
| `AlgorithmSelector` rule 1.3 | previously genetic for complex | Tier-3 greedy; genetic via `suggestAdvisoryGenetic` only |

**Advisory-only genetic (still present, not Tier-3 wired):**

- `src/algorithms/geneticOptimization.ts` — `GeneticOptimizer` (Math.random)
- `src/algorithms/RemnantFirstGeneticOptimizer.ts` — documented advisory; no production import callers found
- Benchmarks / advisory suggestion API

**IntelligenceGate:** Tier classification exists (`src/lib/ydt/IntelligenceGate.ts`); manufacturing algorithm authority is enforced via `AlgorithmSelector` + `manufacturingAuthority` rather than a parallel gate.

### Deterministic Tier-3 owner

- **Owner:** `AdaptiveSolver` / `EnhancedAdaptiveSolver` + `AlgorithmSelector.selectByRule`
- **Algorithms:** `greedy` | `linear` only (`Tier3CuttingAlgorithm`)
- **Complex jobs (500+):** greedy (LP does not scale safely; genetic excluded)

### Bypass protection

- `assertTier3ManufacturingAlgorithm` in `executeOptimization`
- `assertNotAdvisoryManufacturingAuthority` in Enhanced selection
- `algorithmSelector.authorizeForManufacturing()` throws `ManufacturingAuthorityError`
- Preferred `genetic` is warned and ignored; Tier-3 path continues deterministically

### Tests / evidence

- `src/tests/fabricator/gate2ManufacturingTruth.test.ts` — FP-016 + FP-017 behavioral suite
- Related green: adaptiveSolver integration, QualityVerificationEngine, fabricator + constitutional + workflow integration (**205** tests in Gate 2 verification batch)
- `npm run type-check` — pass
- `npm run build` — pass

### Remaining risks (FP-016)

- `GeneticOptimizer` / RFGA remain in-repo for advisory/benchmark use; discipline relies on fail-closed APIs + no mass/canonical wiring.
- `AdaptiveSolver.solve` still catches primary failures and falls back to greedy (deterministic), so a thrown authority error inside `solve` would become greedy rather than surface to the UI — direct `executeOptimization` / `authorizeForManufacturing` still fail closed.
- Delivery / commercial modules are out of Gate 2 scope.

---

## FP-017

### Previous QC identity defect

`QualityVerificationEngine.verifyProfileCuts` keyed measurements by `cut.componentId`, collapsing multiple physical occurrences of the same logical component into one measurement.

Frozen regression fixture: `frame_top` × 2 with legacy `{ frame_top: 1000 }` must leave both checks `pending` (cannot falsely PASS both).

### Canonical physical identity used

- `Cut.cutId` / `Cut.occurrenceIndex` on `src/types/fabricator.ts`
- Stamped by `AdaptiveSolver.executeOptimization` as `` `${component.id}:${index}` ``
- QC lookup: `cut.cutId` → `${componentId}:${occurrenceIndex}` → legacy `componentId` only when no physical key
- CutSheet: propagates `cutId` / `occurrenceIndex`
- CNC QR / adaptive params: prefer `cut.cutId` over `componentId`

### Duplicate-component regression proof

Gate 2 tests prove:

1. Same `componentId`, distinct `cutId` → independent PASS/FAIL
2. Measuring A does not satisfy B
3. Legacy componentId-only map does not collapse two physical cuts
4. Reordered arrays preserve identity outcomes
5. Unique-component legacy path still works
6. Solver → CutSheet preserves distinct `cutId`s

### Production → QC traceability evidence

`Optimization (cutId stamp) → CutSheet (cutId field) → CNC (cutId prefer) → QC (cutId lookup)` proven in unit/behavioral tests. Full delivery per-cut persistence is **not** claimed.

### Remaining risks (FP-017)

- Some UI/document surfaces may still display `componentId` primarily; identity is preserved when `cutId` is present on the Cut object.
- Delivery module does not store per-cut QC state end-to-end — boundary documented, not invented.
- Class-based `CutSheetGenerator.generate` sheet `id` remains `CS-${n}` synthetic; physical identity carried on optional `cutId`/`componentId` fields.

---

## Verification log

| Check | Result |
|-------|--------|
| Focused Gate 2 tests | PASS |
| Fabricator + constitutional + workflow batch | PASS (205) |
| `npm run type-check` | PASS |
| `npm run build` | PASS |
| Introduced regressions | None observed in Gate 2 batch |

### Classification of other signals

- stderr warnings for preferredAlgorithm=genetic advisory redirect — expected
- RemnantManager userId warnings in workflow integration — pre-existing / unrelated
- Massive dataset → force greedy logs — expected Tier-3 safeguard

---

## Next recommended gate

**Gate 3 — Application integrity** (FP-022 / FP-018 per program plan): studio route/wiring integrity and related application-truth work. Commercial honesty remains Gate 4.

No secret values are stored in this document.
