# Codebase vs README: Prioritized Recommendations

**Analysis Date:** February 2026  
**Reference:** CODEBASE_VS_README_VERIFICATION_REPORT.md, CODEBASE_VS_README_GAP_ANALYSIS.md

Prioritized, actionable recommendations to align the codebase and ALMONA_COMPLETE_README.md and to close verification gaps.

---

## P0 – Critical (Documentation and Claims Integrity)

### R1. Align 99.8% BOM Accuracy Claim with Evidence

- **Issue:** README states "99.8% BOM accuracy (n=1,247 test cases, p < 0.001)" but no set of 1,247 test cases or golden masters exists in the repo.
- **Options:**
  - **A.** Add and version a reproducible set of BOM/golden master test cases (e.g. 1,247 or current target), document methodology (inputs, expected outputs, how 99.8% is computed), and cite in README.
  - **B.** Change README to a forward-looking or structural claim, e.g. "99.8% BOM accuracy target; golden master framework in place; validation pending anchor client data" and remove or soften "n=1,247" until data exists.
- **Owner:** Tech lead + QA/documentation.

### R2. Correct YDT Component Count and Market Data Claims

- **Issue:** README and YDT docs say "878 components"; some internal docs report 832 (e.g. wiring incomplete). Market pricing API returns stub data (e.g. material_cost = 400.0).
- **Actions:**
  - Either complete wiring extraction to 878 and document, or update all public/docs to current numbers (e.g. "832 components (wiring extraction in progress)").
  - In README and API docs, either (a) implement real market data and document sources, or (b) state that YDT market-pricing endpoints are "demonstration/stub" until live data is connected.
- **Owner:** YDT/backend owner + documentation.

### R3. Populate Golden Master Fixtures for Deterministic Replay

- **Issue:** Golden master structure exists (GuaranteeVerification.test.ts, GoldenMasterGenerator.ts, README) but no JSON fixtures in src/tests/fixtures/golden-masters/ or test-data/golden-masters/.
- **Actions:**
  - Add at least a minimal set of golden master JSON files (anchor client or synthetic, validated).
  - Run deterministic replay tests and SHA-256 hash checks in CI; document in README (e.g. "Deterministic replay verified via golden master regression").
- **Owner:** Fabricator/QA.

---

## P1 – Important (Accuracy and Consistency)

### R4. Fix RealityOS Path in README

- **Issue:** One README diagram references "Location: python_backend/core/realityos/"; implementation is at repo root realityos_core/.
- **Action:** Replace "python_backend/core/realityos/" with "realityos_core/" everywhere in ALMONA_COMPLETE_README.md and related docs.
- **Owner:** Documentation.

### R5. Update Core Fabrication Component Names and Numbers

- **Issue:** README says "BOMGenerator.ts" and "CuttingOptimizer"; code has PresetAwareBOMGenerator.ts and CuttingOptimizationEngine.tsx. Drafting Workbench: README "1,294 lines" referred to a single file; the feature is now a **module** (parent DraftingWorkbench.tsx 326 lines + children); **full module is ~40k lines**. "50+ Egyptian templates" vs 46.
- **Actions:**
  - In README, use "PresetAwareBOMGenerator" and "CuttingOptimizationEngine" (and link or path where helpful).
  - For Drafting Workbench: describe it as a **module** (parent + children) and state "Parent: DraftingWorkbench.tsx (326 lines); full module: ~40k lines (drafting/)" or label "1,294" as "legacy single-file size before modular refactor." Do not state that the implementation is "326 lines" in total.
  - Either add templates to reach 50+ or change README and egyptianTemplates.ts comment to "46 Egyptian window templates."
- **Owner:** Documentation + front-end if adding templates.

### R6. Clarify YDT Regional Scope (Egyptian vs Algerian vs UAE)

- **Issue:** README suggests "Egyptian/Algerian/UAE" market intelligence; implementation is Egyptian-focused with minimal UAE and no dedicated Algerian service.
- **Action:** In README and YDT docs, state clearly: e.g. "Egyptian market intelligence implemented; UAE keywords supported; Algerian market planned" (or current reality).
- **Owner:** Product/documentation.

---

## P2 – Nice to Have (Polish and Consistency)

### R7. Optional: Align AICS-001 Line Count

- **Issue:** Plan/README cited "1,621 lines" for AICS-001; file has ~1,050+ non-empty lines.
- **Action:** Update cited line count to match current file or drop line count from README if not critical.
- **Owner:** Documentation.

### R8. Optional: Reduce AlgorithmPredictor References

- **Issue:** AlgorithmPredictor is still mentioned in 33+ files (docs, tests, migration); implementation is removed.
- **Action:** Keep migration and constitutional docs; add a one-line "deprecated/removed" note where AlgorithmPredictor is first defined. Optionally replace or remove non-essential references to avoid confusion.
- **Owner:** Documentation + light code/doc cleanup.

### R9. Run and Publish Performance Benchmarks

- **Issue:** README claims 60FPS and <16ms touch response; monitoring and tests exist but no published benchmark results in repo.
- **Action:** Run PerformanceMonitor/ConstitutionalProfiler and TouchBenchmark tests in a standard environment; capture 60FPS and touch latency (e.g. p95); add a short "Performance" section or file (e.g. docs/PERFORMANCE_BENCHMARKS.md) and cite from README.
- **Owner:** Front-end/performance.

### R10. Consolidate or Clarify Duplicate Constitutional Dashboards

- **Issue:** Two Constitutional Health Dashboard implementations (src/components/constitutional/ConstitutionalHealthDashboard.tsx and src/components/fabricator/panels/ConstitutionalHealthDashboard.tsx).
- **Action:** Decide canonical dashboard; either consolidate into one or document why two exist (e.g. "constitutional" vs "fabricator panel") and reference both in README.
- **Owner:** Front-end/architecture.

---

## Implementation Checklist (Summary)

| ID  | Recommendation                               | Priority | Effort (est.) |
|-----|----------------------------------------------|----------|----------------|
| R1  | Align 99.8% / 1,247 test cases claim         | P0       | High (data) or Low (doc change) |
| R2  | YDT 878 vs 832 + market data disclaimer/impl  | P0       | Medium         |
| R3  | Populate golden master fixtures              | P0       | Medium         |
| R4  | Fix RealityOS path in README                 | P1       | Low            |
| R5  | Update BOM/Cutting names, line count, templates | P1     | Low            |
| R6  | Clarify YDT regional scope                   | P1       | Low            |
| R7  | AICS-001 line count                          | P2       | Trivial        |
| R8  | AlgorithmPredictor references                | P2       | Low            |
| R9  | Publish performance benchmarks               | P2       | Medium         |
| R10 | Consolidate/clarify Constitutional dashboards| P2       | Low–Medium     |

---

## Suggested Order of Execution

1. **Quick wins (same sprint):** R4, R5, R6, R7 — README and doc fixes.
2. **Short term:** R3 (golden masters), R2 (component count + market data wording or implementation).
3. **Medium term:** R1 (either add test cases or adjust claim), R9 (benchmarks), R10 (dashboards).
4. **Ongoing:** R8 as part of doc and reference cleanup.

These recommendations should be tracked in project backlog or docs and reviewed when updating ALMONA_COMPLETE_README.md or releasing.
