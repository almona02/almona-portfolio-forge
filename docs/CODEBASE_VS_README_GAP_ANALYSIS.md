# Codebase vs README Gap Analysis

**Analysis Date:** February 2026  
**Reference:** ALMONA_COMPLETE_README.md and CODEBASE_VS_README_VERIFICATION_REPORT.md

This document catalogs gaps between ALMONA_COMPLETE_README.md claims and the current codebase: critical gaps, minor discrepancies, and documentation inconsistencies.

---

## Critical Gaps

### 1. 878 Components Claim (YDT Intelligence)

- **Claim:** "164 chapters, 878 components, 281 parts" (README and YDT docs).
- **Reality:** Some YDT docs (e.g. processing reports) cite 832 components (798 wiring + 34 graph) with wiring diagram processing incomplete (e.g. 17/21 pages).
- **Impact:** README and marketing materials may overstate current extraction completeness.
- **Action:** Either complete wiring diagram processing to 878 and document, or update README and YDT docs to "832 components (processing in progress)" or equivalent.

### 2. 1,247 Test Cases for 99.8% BOM Accuracy

- **Claim:** "99.8% BOM accuracy (n=1,247 test cases, p < 0.001)."
- **Reality:** No set of 1,247 golden master or BOM test cases found. Golden master structure exists (GuaranteeVerification.test.ts, GoldenMasterGenerator.ts, README in src/tests/fixtures/golden-masters/); test-data/golden-masters is empty; fixture README states "Placeholder - Add real golden masters from anchor client validation."
- **Impact:** The stated statistical claim cannot be independently verified from the repo.
- **Action:** Either (a) add and version 1,247 (or current count) golden master / BOM test cases and document methodology, or (b) soften README to "99.8% target" / "structure in place, validation pending anchor client data."

### 3. Market Pricing Data (YDT Intelligence)

- **Claim:** YDT Intelligence provides market-validated pricing and market intelligence.
- **Reality:** python_backend/apis/v2/ydt_intelligence.py get_market_pricing uses hardcoded material_cost = 400.0 with comment "Would come from YDT market data." Other YDT endpoints use rule-based or stub responses.
- **Impact:** Market pricing is not backed by real market data in the repo.
- **Action:** Implement or integrate real market data sources and document scope, or clearly label endpoints as "demonstration/stub" in API docs and README.

### 4. Golden Master Fixtures for Deterministic Replay

- **Claim:** Golden master testing with SHA-256 hashes for deterministic replay (AICS-001 §7.5).
- **Reality:** Test harness and docs exist; no golden master JSON fixtures found in src/tests/fixtures/golden-masters/ or test-data/golden-masters/ (only README/placeholder).
- **Impact:** Deterministic replay cannot be demonstrated with current fixtures.
- **Action:** Populate golden masters from anchor client or synthetic validated cases; run and document hash-based regression in CI.

---

## Minor Discrepancies

### 5. Drafting Workbench: Module vs Single-File (Corrected)

- **Claim:** "Drafting Workbench (January 2026) … Lines of Code: 1,294."
- **Reality:** The Drafting Workbench is implemented as a **module with children**, not a single file. The **parent** `DraftingWorkbench.tsx` is 326 lines. The **full module** under `src/components/fabricator/drafting/` is **~39,558 lines** (68 TSX + 74 TS implementation files, excluding tests). The README’s 1,294 likely referred to a pre-refactor single file; the feature has since been split into parent + many children (layout, panels, tabs, hooks, canvas, layers, utils, services, prestige, etc.).
- **Action:** Update README to describe the Drafting Workbench as a **module** and either (a) state "Parent: DraftingWorkbench.tsx (326 lines); full module: ~40k lines (parent + children)" or (b) retain "1,294" only if explicitly labeled as "legacy single-file size before modular refactor." Remove any implication that the implementation is "326 lines" in total.

### 6. Egyptian Window Templates Count

- **Claim:** "50+ Egyptian window templates."
- **Reality:** 46 unique template IDs in src/components/fabricator/drafting/utils/egyptianTemplates.ts (file comment says "50+ templates").
- **Action:** Add 4+ templates to reach 50, or change README and file comment to "46 Egyptian window templates."

### 7. BOMGenerator / CuttingOptimizer Naming

- **Claim:** README references "BOMGenerator.ts" and "CuttingOptimizer" / "OptimizationEngine."
- **Reality:** BOM: PresetAwareBOMGenerator.ts (no BOMGenerator.ts). Cutting: CuttingOptimizationEngine.tsx, CuttingOptimizationPanel.tsx (no CuttingOptimizer component).
- **Action:** Update README to PresetAwareBOMGenerator and CuttingOptimizationEngine (and related names) so docs match code.

### 8. AICS-001 Specification Line Count

- **Claim:** (In plan) "1,621 lines" for AICS-001.
- **Reality:** docs/AICS-001_ALMONA_INDUSTRIAL_COMPUTING_SPECIFICATION.md has ~1,050+ non-empty lines (exact count may vary with blank lines).
- **Action:** Optional: align README/plan line count with actual file for consistency.

---

## Documentation Inconsistencies

### 9. RealityOS Core Path

- **Claim:** One README diagram (e.g. §3.2.6) shows "Location: python_backend/core/realityos/."
- **Reality:** Implementation lives at repo root: realityos_core/ (and verticals vertical_almona/, vertical_tmg_shield/). python_backend/core/realityos/ does not exist.
- **Action:** Replace "python_backend/core/realityos/" with "realityos_core/" in README and any other docs.

### 10. AlgorithmPredictor References

- **Claim:** AlgorithmPredictor removed; AlgorithmSelector is the canonical Tier 3 component.
- **Reality:** AlgorithmPredictor is still mentioned in 33+ files (docs, tests, migration notes). No AlgorithmPredictor implementation in src.
- **Action:** Keep migration/constitutional docs as-is; optionally add a short "deprecated/removed" note and grep-clean non-essential references to avoid confusion.

### 11. YDT Market Regions

- **Claim:** "Market Intelligence (Egyptian/Algerian/UAE)" and "164 chapters, 878 components, 281 parts."
- **Reality:** Egyptian focus is strong (industry_watchdog, national_service_features, etc.). UAE/dubai appear as keywords; no dedicated Algerian market service or data.
- **Action:** In README and YDT docs, clarify "Egyptian-first" or "Egyptian implemented; Algerian and UAE planned/minimal" to match implementation.

---

## Summary Table

| ID | Category        | Type        | Severity | Description |
|----|-----------------|------------|----------|-------------|
| 1  | YDT Intelligence| Critical   | High     | 878 vs 832 components; wiring extraction incomplete |
| 2  | Performance     | Critical   | High     | 1,247 test cases for 99.8% BOM accuracy not present |
| 3  | YDT Intelligence| Critical   | High     | Market pricing endpoints use stub data |
| 4  | Testing         | Critical   | Medium   | Golden master fixtures not populated |
| 5  | Core Fabrication| Minor (corrected) | Low      | Drafting Workbench: README 1,294 (single file); actual parent 326 lines, full module ~40k lines (parent + children) |
| 6  | Core Fabrication| Minor      | Low      | Egyptian templates 50+ vs 46 |
| 7  | Core Fabrication| Minor      | Low      | BOMGenerator / CuttingOptimizer naming vs code |
| 8  | Documentation   | Minor      | Low      | AICS-001 line count (optional) |
| 9  | Documentation   | Inconsistency | Low   | RealityOS path python_backend/core/realityos/ vs realityos_core/ |
| 10 | Documentation   | Inconsistency | Low   | AlgorithmPredictor still referenced in many files |
| 11 | YDT Intelligence| Inconsistency | Low   | Algerian/UAE market scope vs implementation |

---

## Recommended Priority

1. **P0 – Critical:** Align README with evidence: either add 1,247 (or documented count) test cases and real market data, or soften claims (Gaps 2, 3). Fix 878 vs 832 component messaging (Gap 1).
2. **P1 – Important:** Populate golden master fixtures and document deterministic replay (Gap 4). Correct RealityOS path in README (Gap 9).
3. **P2 – Nice to have:** Update DraftingWorkbench line count, Egyptian template count, BOM/Cutting names (Gaps 5, 6, 7). Clarify YDT regional scope (Gap 11).

This gap analysis should be used alongside CODEBASE_VS_README_VERIFICATION_REPORT.md and CODEBASE_VS_README_RECOMMENDATIONS.md for documentation and product alignment.
