# Code Quality Hardening Plan (4 Weeks)

Date: 2026-03-02  
Scope: Frontend (`src/`), Backend (`python_backend/`), CI/workflows, constitutional guardrails.

## 1) Baseline (Current State)

Collected from local checks and repository metrics:

- ESLint: `19623` warnings, `0` errors.
- Type-check: pass.
- Frontend size: `903` TSX files, `1093` TS files.
- Backend size: `312` Python files.
- Type-safety debt indicators:
  - `as any`: `1335`
  - `any` token: `2888`
  - `eslint-disable`: `48`
  - `@ts-ignore`: `1`
  - Python `Any`: `930`

High-risk file size outliers:

- Frontend:
  - `src/components/fabricator/PricingTuningStudio.tsx` (4489 lines)
  - `src/components/fabricator/ProfileManagement.tsx` (2594 lines)
  - `src/pages/FabricatorWorkflow.tsx` (2594 lines)
  - `src/components/fabricator/tuning/ProfileTuningStudio.tsx` (2493 lines)
  - `src/components/fabricator/InventoryDashboard.tsx` (2169 lines)
- Backend:
  - `python_backend/apis/v2/customers.py` (1264 lines)
  - `python_backend/apis/v2/services/customer_service.py` (1222 lines)
  - `python_backend/apis/v2/calibration.py` (972 lines)
  - `python_backend/models/api_v2_models.py` (869 lines)
  - `python_backend/api/prestige_endpoints.py` (796 lines)

## 2) Target Outcomes (End of 4 Weeks)

Quality gates:

- CI blocks merge on:
  - frontend lint errors,
  - TypeScript type-check,
  - targeted frontend tests,
  - targeted backend tests,
  - constitutional compliance checks.
- No `continue-on-error` or `|| true` for core quality gates.

Debt reduction:

- ESLint warnings reduced by at least `35%` (19623 -> <= 12755).
- `as any` reduced by at least `30%` (1335 -> <= 935).
- `eslint-disable` reduced by at least `40%` (48 -> <= 29).

Architecture and contracts:

- Split top 6 frontend "god files" into container/hooks/presentational structure.
- Split top 3 backend "god files" and align service-model contracts.
- Eliminate known response schema drift in bulk operations.

Test confidence:

- Add coverage thresholds (staged):
  - Week 2: report-only thresholds in CI output.
  - Week 4: enforce fail-on-threshold for core paths.
- Ensure v2 backend integration tests are discoverable and executed in CI path.

## 3) Constitutional Alignment (AICS-001)

This plan explicitly supports AICS-001:

1. No ML/AI in Tier 3 execution paths.
2. All adaptive intelligence must route through `IntelligenceGate`.
3. Deterministic constraints remain non-negotiable.
4. Human validation remains required for outputs.

Execution note:

- Any refactor that touches decision paths must preserve or improve:
  - `src/lib/fabricator/AlgorithmSelector.ts`
  - `src/lib/ydt/IntelligenceGate.ts`
  - `src/components/fabricator/drafting/DraftingWorkbench.tsx`
  - `src/tests/constitutional/GuaranteeVerification.test.ts`

## 4) Workstreams

### WS-A: CI and Quality Gate Hardening

Goals:

- Convert soft checks into hard merge gates for critical quality signals.
- Remove workflow drift and non-blocking shortcuts in production pipelines.

Primary files:

- `.github/workflows/production.yml`
- `.github/workflows/full-pipeline.yml`
- `.github/workflows/constitutional-compliance.yml`
- `package.json`

Deliverables:

1. Define one canonical required workflow for PR merge.
2. Remove `continue-on-error` on lint/tests for required jobs.
3. Replace brittle drafting coverage check logic with deterministic file-change + Vitest-compatible filter.
4. Keep optional scans as non-blocking, but separate from merge-required jobs.

### WS-B: Frontend Type/Lint Debt Burn-Down

Goals:

- Reduce warning count by removing unsafe patterns in highest-risk modules first.
- Improve strictness without destabilizing release flow.

Primary files:

- `eslint.config.js`
- `tsconfig.json`
- `tsconfig.app.json`
- `src/components/fabricator/PricingTuningStudio.tsx`
- `src/components/fabricator/ProfileManagement.tsx`
- `src/components/fabricator/tuning/ProfileTuningStudio.tsx`
- `src/components/fabricator/InventoryDashboard.tsx`
- `src/components/shop/ProductQuickView.tsx`

Deliverables:

1. Introduce warning budgets by directory (tracked in CI artifact).
2. Replace `any` with typed DTOs/interfaces for highest-churn domains.
3. Remove stale `eslint-disable` comments or convert to narrow suppressions with rationale.
4. Raise selected rules from warn -> error for touched files once below threshold.

### WS-C: Backend Contract and Layering Hardening

Goals:

- Align Pydantic models, service outputs, and API response contracts.
- Reduce broad exception masking and contract ambiguity.

Primary files:

- `python_backend/models/api_v2_models.py`
- `python_backend/apis/v2/services/bulk_operation_service.py`
- `python_backend/apis/v2/tickets.py`
- `python_backend/apis/v2/app.py`
- `python_backend/apis/v2/customers.py`
- `python_backend/apis/v2/services/customer_service.py`

Deliverables:

1. Resolve `BulkJobResponse` schema mismatches (`snake_case` vs `camelCase`).
2. Replace broad `Any` request/response fields with concrete models where possible.
3. Replace broad exception catches with typed exception handling in critical endpoints.
4. Refactor customer API/service into smaller modules by domain responsibility.

### WS-D: Test Reliability and Coverage Quality

Goals:

- Ensure tests reflect production behavior and are actually run.
- Reduce skipped module dependence for core functionality.

Primary files:

- `vitest.config.ts`
- `python_backend/pytest.ini`
- `python_backend/tests/test_api.py`
- `python_backend/tests/test_api_v2.py`
- `python_backend/tests/test_api_contracts.py`
- `python_backend/tests/test_integration.py`
- `python_backend/apis/v2/tests/test_integration_comprehensive.py`

Deliverables:

1. Expand backend discovery so v2 test suites are included in CI.
2. Convert broad module-level skips into explicit marker-based conditional runs.
3. Tighten weak assertions (avoid normalizing `500` as acceptable success path).
4. Add staged coverage thresholds for critical packages.

### WS-E: Architectural Consolidation

Goals:

- Reduce duplicated abstractions and inconsistent state/data flows.
- Improve maintainability and onboarding speed.

Primary files:

- `src/App.tsx`
- `src/context/LoadingContext.tsx`
- `src/contexts/LoadingContext.tsx`
- `src/components/ui/button.tsx`
- `src/shared/ui/ui/button.tsx`
- `src/store/jobsStore.ts`
- `src/hooks/useFabricatorQueries.ts`

Deliverables:

1. Resolve duplicate loading context implementations into one canonical provider.
2. Resolve duplicate button primitive paths or define a strict usage boundary.
3. Define data-layer policy: React Query hooks for server state, store for UI state.
4. Reduce event-bus style (`window` custom events) where typed state channels exist.

## 5) Top 10 Priority Refactors (Execution Order)

1. Fix bulk job response contract mismatch (`api_v2_models.py` vs `bulk_operation_service.py`).
2. Harden required CI gate workflow and remove non-blocking quality shortcuts.
3. Refactor `PricingTuningStudio.tsx` into feature modules and typed sub-hooks.
4. Refactor `ProfileManagement.tsx` into domain sections (CRUD, import, calibration, export).
5. Refactor `ProfileTuningStudio.tsx` into tab-specific components + typed adapters.
6. Split `customers.py` router by bounded context (profile, tags, activity, billing).
7. Split `customer_service.py` by use-case services.
8. Replace `ProductQuickView.tsx` `(product as any)` blocks with typed extension model.
9. Consolidate duplicate loading contexts into one source of truth.
10. Rework backend test discovery + de-skip strategy for v2 contracts/integration.

## 6) Week-by-Week Plan

## Week 1 - Stabilize Gates and Contracts

Objectives:

- Establish deterministic CI gates and remove false-green behavior.
- Fix highest-risk backend contract mismatch.

Tasks:

1. CI workflow normalization:
   - make core lint/type/test blocking,
   - keep heavy optional scans in separate non-blocking jobs.
2. Fix `BulkJobResponse` mapping and add unit tests for contract serialization.
3. Start warning-budget artifact publication (lint + `any` counts).
4. Add rule: every suppression needs inline reason and ticket reference.

Exit criteria:

- One required CI pipeline is fully blocking for core checks.
- Bulk job contract tests pass and verify exact response shape.

## Week 2 - Type-Safety and Test-Reliability Push

Objectives:

- Drop warning and unsafe-cast counts in highest-impact surfaces.
- Improve test discoverability and fidelity.

Tasks:

1. Replace top `any` hotspots in `ProductQuickView.tsx` and one fabricator studio file.
2. Convert module-wide backend test skips into marker-based conditional execution.
3. Update `pytest.ini`/CI target paths so v2 integration suites are visible.
4. Introduce coverage threshold reporting (non-failing) for core domains.

Exit criteria:

- Warning count down by >= 15% from baseline.
- v2 backend integration/contract suites execute in at least one CI job.

## Week 3 - Monolith Decomposition

Objectives:

- Reduce maintenance risk by splitting high-churn large modules.

Tasks:

1. Decompose `ProfileManagement.tsx` and `ProfileTuningStudio.tsx` into:
   - container page,
   - domain hooks,
   - presentational components.
2. Decompose `customers.py` + `customer_service.py` by capability slices.
3. Remove stale duplicate abstractions (loading contexts and UI primitive duplication plan).
4. Add architectural README for state/data flow policy.

Exit criteria:

- Each targeted file reduced significantly in line count and responsibility scope.
- New modules have focused tests.

## Week 4 - Enforce and Lock

Objectives:

- Turn interim quality signals into enforced standards.

Tasks:

1. Enable fail-on-threshold for selected coverage metrics.
2. Promote selected lint/type rules from warn to error for hardened folders.
3. Verify AICS-001 alignment on all touched decision paths.
4. Publish post-hardening baseline report with before/after metrics.

Exit criteria:

- ESLint warnings <= 12755.
- `as any` <= 935.
- CI merge gates stable for 1 week without emergency bypasses.

## 7) Tracking and Governance

Cadence:

- Daily: warning budget + test pass rate + CI health snapshot.
- Twice weekly: architecture review for decomposition PRs.
- Weekly: constitutional compliance review against AICS-001 constraints.

PR template requirements:

- "Quality impact" section with:
  - lint delta,
  - type delta,
  - tests added/changed,
  - AICS-001 impact statement.

Mandatory dashboard metrics:

- Total ESLint warnings.
- `any` and `as any` count.
- Number of `eslint-disable` and `@ts-ignore`.
- Test pass rates by suite.
- CI required workflow success rate.

## 8) Risks and Mitigations

Risk: strictness changes slow feature delivery.  
Mitigation: staged budgets and folder-by-folder enforcement.

Risk: refactor PRs become too large.  
Mitigation: cap PR size; enforce one major decomposition per PR.

Risk: constitutional regressions in decision paths.  
Mitigation: add/update constitutional tests in `GuaranteeVerification.test.ts` for each decision-path change.

Risk: CI flakiness from expanded test suites.  
Mitigation: classify flaky tests, isolate environment-dependent tests, quarantine with explicit markers until fixed.

## 9) Definition of Done

This plan is complete when:

1. Core CI gates are hard-blocking and stable.
2. Warning/type-safety debt reduction targets are met.
3. Top-risk monolith files are decomposed with tests.
4. API contract mismatches are resolved and covered by tests.
5. AICS-001 alignment is preserved with explicit verification evidence.

