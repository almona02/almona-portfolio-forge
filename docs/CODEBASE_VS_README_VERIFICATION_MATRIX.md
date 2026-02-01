# Codebase vs README Verification Matrix

**Analysis Date:** February 2026  
**Reference:** ALMONA_COMPLETE_README.md  
**Confidence:** HIGH = verified with evidence; MEDIUM = exists but incomplete; LOW = missing or stub.

Spreadsheet-style comparison of README claims vs actual codebase. Use with CODEBASE_VS_README_VERIFICATION_REPORT.md for detail.

---

## Constitutional Governance

| Claim | Claimed | Actual | Confidence |
|-------|---------|--------|------------|
| AICS-001 specification canonical | docs/AICS-001, 1.0.0 | Exists, 1,050+ lines, canonical | HIGH |
| wiring-manifest.yaml | 235 lines, AICS-001-v1.0.0 | 235 lines, constitutionalAuthority AICS-001-v1.0.0 | HIGH |
| WiringValidator.ts | 4-rule validation | 334 lines, SSOT/tier/future/callbacks | HIGH |
| AlgorithmSelector (Tier 3) | Deterministic, rule-based | src/lib/fabricator/AlgorithmSelector.ts | HIGH |
| AlgorithmPredictor removed | Deleted | Not in src (docs only) | HIGH |
| GuaranteeVerification.test.ts | Constitutional suite | src/tests/constitutional/GuaranteeVerification.test.ts | HIGH |
| Constitutional Health Dashboard | Real-time monitoring | 2 implementations (constitutional/, fabricator/panels/) | HIGH |
| AdvisoryGate / AdvisorySnapshot | Tier 2 wrappers | src/lib/fabricator/wiring/gates/, snapshot/ | HIGH |
| CI constitutional validation | .github/workflows | constitutional-validation.yml, constitutional-compliance.yml | HIGH |
| npm validate scripts | validate:manifest, validate:constitutional | package.json | HIGH |

---

## Core Fabrication Workflow

| Claim | Claimed | Actual | Confidence |
|-------|---------|--------|------------|
| EngineeringBay.tsx | Main workspace | 917 lines | HIGH |
| SmartDrawCanvas.tsx | Layout editor | 1,485 lines | HIGH |
| Window3DGenerator.tsx | 3D preview 60FPS | 2,154 lines | HIGH |
| ProfileTuningStudio.tsx | Profile config | 2,364 lines | HIGH |
| smartDraw.ts | Component generation | 651 lines | HIGH |
| BOMGenerator | BOM generation | PresetAwareBOMGenerator.ts 342 lines (no BOMGenerator.ts) | MEDIUM (naming) |
| CuttingOptimizer | Optimization | CuttingOptimizationEngine.tsx 818 lines (no CuttingOptimizer) | MEDIUM (naming) |
| Drafting Workbench (module) | 1,294 lines (README, likely pre-refactor single file) | Parent DraftingWorkbench.tsx: 326 lines. **Full module** (parent + children): **~39,558 lines** (68 TSX + 74 TS, excl. tests). See verification report §2.1. | HIGH (module is larger than README; no missing code) |
| Egyptian templates | 50+ | 46 template IDs | MEDIUM (46 vs 50+) |

---

## YDT Intelligence Engine

| Claim | Claimed | Actual | Confidence |
|-------|---------|--------|------------|
| 164 chapters | Manual chapters | Documented in ai_agents/ydt_agent | HIGH |
| 878 components | Wiring diagram | Docs 878; some reports 832 (incomplete) | MEDIUM |
| 281 parts | Spare parts | Documented 281 | HIGH |
| Egyptian market | Strong | industry_watchdog, national_service | HIGH |
| Algerian market | Mentioned | No dedicated service | LOW |
| UAE market | Mentioned | Keywords only | MEDIUM |
| YDT API endpoints | /api/v2/ydt/* | ydt_intelligence.py | HIGH |
| Market pricing data | Real data | material_cost=400.0 stub | LOW |
| Industry Watchdog | Operational | industry_watchdog.py, future_intelligence | HIGH |
| YILMAZ integration | Machinery | src/integrations/yilmaz/, yilmaz_integration.py | HIGH |

---

## RealityOS Platform

| Claim | Claimed | Actual | Confidence |
|-------|---------|--------|------------|
| REALITYOS_CONSTITUTION.md | Root, 6 principles | Exists, Version 1.0 | HIGH |
| RealityOS core location | (One diagram: python_backend/core/realityos/) | realityos_core/ at root | HIGH (path doc error) |
| Almona Vertical v1.0.0 | Production | vertical_almona/, 3 rules | HIGH |
| TMG Shield v0.1.0 | In development | vertical_tmg_shield/, rules commented out | HIGH |
| Event Ledger | Append-only, chain | event_ledger.py, EventHasher | HIGH |
| Capture Gateway | Validators | capture_gateway/ (qr, photo, gps, timestamp, etc.) | HIGH |
| Six principles | Enforced | REALITYOS_CONSTITUTION.md I–VI | HIGH |
| Vertical plugin system | Registry, base rule | vertical_registry.py, base_rule.py | HIGH |

---

## Performance & Accuracy

| Claim | Claimed | Actual | Confidence |
|-------|---------|--------|------------|
| 99.8% BOM accuracy | n=1,247, p<0.001 | Golden master structure only; no 1,247 fixtures | LOW |
| 60FPS rendering | Sustained | PerformanceMonitor targetFps 60, 16.67ms | MEDIUM (monitoring only) |
| <16ms touch | 95th percentile | TouchBenchmark tests exist; no published p95 | MEDIUM |
| Deterministic replay | 100% | GuaranteeVerification + golden master pattern; fixtures empty | MEDIUM |

---

## Technology Stack

| Claim | Claimed | Actual | Confidence |
|-------|---------|--------|------------|
| React | 18.3.1 | ^18.3.1 | HIGH |
| TypeScript | 5.5.3 | ^5.5.3 | HIGH |
| Vite | 7.2.6 | ^7.2.6 | HIGH |
| Ant Design | 5.29.1 | ^5.29.1 | HIGH |
| Three.js | 0.180.0 | ^0.180.0 | HIGH |
| Zustand | 5.0.6 | ^5.0.6 | HIGH |
| React Query | 5.83.0 | ^5.83.0 | HIGH |
| FastAPI | Backend | 0.123.8 | HIGH |
| Celery | Task queue | 5.3.4 | HIGH |
| PostgreSQL/Supabase | Database | supabase, sqlalchemy, asyncpg | HIGH |
| Redis | Cache/broker | 5.0.1 (requirements) | HIGH |

---

## Testing & CI

| Claim | Claimed | Actual | Confidence |
|-------|---------|--------|------------|
| Frontend unit tests | Vitest | 117+ *.test.ts, vitest ^3.2.4 | HIGH |
| Backend tests | pytest | 56+ test_*.py | HIGH |
| Constitutional tests | Suite | src/tests/constitutional/, drafting __tests__ | HIGH |
| Integration tests | Multiple | src/tests/integration/, python_backend/tests/ | HIGH |
| E2E | Playwright | tests/e2e/*.spec.ts (6), playwright.config.ts | HIGH |
| Golden master fixtures | SHA-256 regression | Structure only; no fixture JSONs | LOW |
| CI/CD | Constitutional + full | constitutional-validation, constitutional-compliance, full-pipeline, etc. | HIGH |

---

## Institutional Rollout Package

| Claim | Claimed | Actual | Confidence |
|-------|---------|--------|------------|
| INSTITUTIONAL_ROLLOUT_PACKAGE/ | Present | README, 01–05_*.md, certificates/, evidence/ | HIGH |
| CONSTITUTIONAL_CERTIFICATE.json | certificates/ | Present | HIGH |
| INSTITUTIONAL_READINESS_DOSSIER.json | certificates/ | Present | HIGH |
| Audit reports | evidence/ | audit-2026-01-18T20-15-01-052Z.json | HIGH |

---

## Summary Counts

| Category | HIGH | MEDIUM | LOW |
|----------|------|--------|-----|
| Constitutional Governance | 10 | 0 | 0 |
| Core Fabrication | 5 | 3 | 1 |
| YDT Intelligence | 6 | 2 | 2 |
| RealityOS | 8 | 0 | 0 |
| Performance & Accuracy | 0 | 3 | 1 |
| Technology Stack | 11 | 0 | 0 |
| Testing & CI | 6 | 0 | 1 |
| Institutional Package | 4 | 0 | 0 |

**Total:** 50 HIGH, 8 MEDIUM, 5 LOW.

Use this matrix for quick lookup; use CODEBASE_VS_README_VERIFICATION_REPORT.md for evidence and CODEBASE_VS_README_GAP_ANALYSIS.md and CODEBASE_VS_README_RECOMMENDATIONS.md for gaps and actions.
