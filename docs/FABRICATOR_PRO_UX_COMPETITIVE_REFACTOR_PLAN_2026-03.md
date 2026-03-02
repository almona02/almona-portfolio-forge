# Fabricator Pro UX Competitive Refactoring Plan

Date: 2026-03-02  
Product scope: Fabricator Pro workflow and studio surfaces in `src/`.

## 1) Objective

Benchmark current Fabricator Pro ease-of-use against 10 widely used fenestration platforms, then convert the gap analysis into a concrete refactoring roadmap with file-level ownership and measurable UX outcomes.

## 2) Benchmark Set (Top 10 Market Leaders)

The list below is a practical benchmark set based on platform maturity, fenestration specialization, and cross-references in vendor/industry sources:

1. FeneTech - FeneVision
2. Orgadata - Logikal
3. Klaes
4. Windowmaker
5. First Degree - Window Designer / Evolution ecosystem
6. BM Group - Evolution + EvoNET
7. Soft Tech V6 (Cyncly)
8. A+W Cantor
9. PrefSuite (Preference / PrefERP)
10. WinPro

Note: public market-share data is limited; this plan uses feature and workflow maturity benchmarking rather than claimed revenue rank.

## 3) Ease-of-Use Heuristics Used

Each platform was compared on these UX dimensions:

1. Workflow continuity (no dead-end route transitions)
2. Guided progression and stage clarity
3. Validation and error prevention at input time
4. Cognitive load and screen complexity
5. Data consistency and single source of truth
6. Production-floor readiness (paperless, scan/traceability, quick actions)
7. Setup speed and configurability
8. Role-based navigation and discoverability
9. Feedback quality and actionable recovery
10. Performance under high-volume operations

## 4) Competitive UX Patterns to Emulate

Common strengths observed in market leaders:

- End-to-end workflow continuity from quote/configure to production and dispatch.
- Strong inline plausibility checks before downstream steps.
- Unified stage rails and clear phase context ("you are here / what is blocked").
- Paperless operations support (barcode/QR traceability, station-level visibility).
- High-throughput list operations with robust batch actions and low-latency filtering.
- Configurator-first UX with fewer context switches.
- Better orchestration of production/QC/delivery as one completion pipeline.

Implication for Fabricator Pro: keep existing advanced capabilities, but reduce flow fragmentation and state drift to make execution as predictable as leading systems.

## 5) Current Fabricator Pro UX Assessment (Code-Grounded)

## 5.1 Strengths

- Canonical route builders exist (`fabricatorRoutes`) and are already used in parts of the app.
- Pose workflow has a persistent navigator and validation gate.
- High-capability production and delivery modules exist (including proof/event completion).
- Virtualized and batch-oriented grids are present for high-volume operation.

## 5.2 High-Impact Frictions

1. **Production to QC path drift**
   - `ProductionPage` navigates to legacy `/fabricator/workflow/quality-control/*`.
   - Legacy redirect mapping does not include `quality-control`, so users can get dropped to projects instead of continuing flow.

2. **Measuring stage inconsistency**
   - Wizard CTA says "Create Project & Start Measuring".
   - Project creation currently navigates directly to pose design.
   - Workflow validator still enforces measuring prerequisites for design.

3. **Completion pipeline fragmentation**
   - Pose rail ends at production.
   - QC/delivery live in separate studio production routes and are not pose-scoped.
   - Delivery page can show "No Unit for Delivery" when context is missing.

4. **State and identity drift**
   - Parallel sources (`workflowStore`, workspace context, jobs store, React Query).
   - Locally generated non-UUID IDs are mixed with v2 UUID-oriented persistence.

5. **Navigation reliability debt**
   - `PositionsGrid` search handler calls `setPage(1)` but no page state exists in that component.

## 6) Competitive Gap Matrix (Fabricator Pro vs Leaders)

| Dimension | Fabricator Pro (Current) | Market Leader Baseline | Gap |
|---|---|---|---|
| Workflow continuity | Advanced but fragmented near completion | Usually strict linear continuity | High |
| Guided progression | Strong step rail in pose flow only | Whole journey consistently guided | Medium-High |
| Input validation UX | Validation gate present | Similar/strong in leaders | Medium |
| Cognitive load | Very high in large multi-modal screens | Better progressive disclosure | High |
| State consistency | Multiple overlapping stores/contexts | More centralized orchestration | High |
| Production-floor usability | Strong foundations | Strong, often tighter traceability UX | Medium |
| Setup speed | Wizard present but inconsistent transitions | Generally cleaner setup-to-first-task | Medium-High |
| Role discoverability | Good shell, some legacy drift | Strong role-centric menuing | Medium |
| Recovery guidance | Mixed; some good error states | More deterministic recovery paths | Medium |
| High-volume usability | Good virtualization and batch actions | Comparable | Low-Medium |

## 7) Target UX Architecture (Refactor End State)

### 7.1 Single Workflow Graph

Create one stage graph:

`setup -> measuring -> design -> bom -> optimization -> commercial -> production -> quality -> delivery`

All route transitions must flow through this graph.

### 7.2 Single Canonical Identity

Standardize project and pose identity:

- Always persist and navigate with canonical `{projectId, poseId}`.
- Remove transitional assumptions where `projectId === poseId`.

### 7.3 Single Workflow State Authority

- Server entities: React Query (`fabricatorClientV2` hooks).
- Workflow progression: one workflow store (stage + completion + blockers).
- UI ephemeral state: local component state.
- Deprecate duplicate cross-cutting stores/context overlap over time.

### 7.4 Unified Completion Pipeline

Bring production, quality, and delivery into one pose-scoped completion area so users never lose context.

## 8) Refactoring Roadmap

## Phase 0 (Week 1): Critical UX Defects and Flow Integrity

Goal: stop user flow breakage and obvious trust-loss issues.

### Work package P0-A: Fix legacy production/QC routing drift

Files:

- `src/pages/fabricator/workflow/ProductionPage.tsx`
- `src/App.tsx`
- `src/lib/fabricator/routes.ts`

Actions:

1. Replace legacy QC navigation with canonical studio route (pose-scoped).
2. Extend route builders to include `poseQuality` and `poseDelivery`.
3. Ensure legacy redirect map handles `quality-control` and `delivery` safely during migration.

Acceptance criteria:

- Completing production lands in quality screen for same project/pose.
- No redirect to generic projects unless explicitly requested.

### Work package P0-B: Align measuring semantics

Files:

- `src/components/fabricator/NewProjectWizard.tsx`
- `src/components/fabricator/project/ProjectCreationManager.tsx`
- `src/components/fabricator/workflow/WorkflowStepNavigator.tsx`
- `src/lib/fabricator/validation/WorkflowValidator.ts`
- `src/store/workflowStore.ts`

Actions:

1. Decide and enforce one truth:
   - either keep measuring as first step with a route/screen, or
   - remove measuring from required gate and copy if absorbed by setup.
2. Update CTA copy, stage definitions, validator prerequisites, and route transitions together.

Acceptance criteria:

- No contradictory copy/state where user is told to measure but lands in design with measuring errors.

### Work package P0-C: Fix `PositionsGrid` search/page bug

Files:

- `src/components/fabricator/PositionsGrid.tsx`

Actions:

1. Remove invalid `setPage(1)` call or introduce explicit pagination state intentionally.
2. Add focused test for search behavior and no runtime error on keypress.

Acceptance criteria:

- Search input works without runtime exceptions.

## Phase 1 (Weeks 2-4): Workflow and State Consolidation

Goal: reduce cognitive and technical fragmentation.

### Work package P1-A: Introduce workflow orchestrator module

Files:

- `src/lib/fabricator/routes.ts`
- new `src/lib/fabricator/workflow/workflowGraph.ts`
- `src/App.tsx`
- `src/components/fabricator/workflow/WorkflowStepNavigator.tsx`

Actions:

1. Define canonical stage metadata and transition rules in one module.
2. Generate step rail from graph data (avoid hardcoded step drift).
3. Route transition helpers to validate allowable next states.

Acceptance criteria:

- Stage sequence is defined once and consumed by routes, UI rail, and transition actions.

### Work package P1-B: Normalize identity model (`projectId`, `poseId`)

Files:

- `src/components/fabricator/project/ProjectCreationManager.tsx`
- `src/components/fabricator/project/ProjectStudio.tsx`
- `src/lib/supabase/fabricatorClientV2.ts`
- `src/components/fabricator/EngineeringBayWrapper.tsx`

Actions:

1. Persist new project and initial pose through v2 API before navigation.
2. Navigate using returned canonical IDs.
3. Remove implicit same-ID assumptions.

Acceptance criteria:

- First save/open cycle preserves stable project/pose IDs across refresh and reload.

### Work package P1-C: Reduce overlapping state authorities

Files:

- `src/context/FabricatorWorkspaceContext.tsx`
- `src/store/workflowStore.ts`
- `src/store/jobsStore.ts`
- `src/hooks/useFabricatorQueries.ts`

Actions:

1. Create a state ownership matrix (server/workflow/ui).
2. Deprecate duplicate writes from wrapper components where equivalent query/store source exists.
3. Add typed adapters instead of cross-store mutations.

Acceptance criteria:

- Critical workflow screens read from one authority per domain entity.

## Phase 2 (Weeks 5-8): Ease-of-Use Enhancement Layer

Goal: close competitive UX gaps beyond defect fixes.

### Work package P2-A: Progressive disclosure in high-density screens

Files:

- `src/components/fabricator/EngineeringBay.tsx`
- `src/pages/CommercialPage.tsx`
- `src/components/fabricator/ProductionCommand.tsx`

Actions:

1. Split advanced tools into collapsible "Advanced" panels.
2. Keep primary task actions visible and linear.
3. Add "next recommended action" cues near stage exits.

Acceptance criteria:

- New users can complete primary task path without opening advanced panels.

### Work package P2-B: Completion pipeline unification (pose-scoped)

Files:

- `src/App.tsx`
- `src/layouts/studio/PoseWorkflowLayout.tsx`
- `src/pages/fabricator/workflow/QualityControlPage.tsx`
- `src/pages/DeliveryTrackingPage.tsx`

Actions:

1. Add pose-scoped routes for quality and delivery.
2. Include quality/delivery in stepper for completion phases.
3. Ensure delivery screen always receives active pose context.

Acceptance criteria:

- Users complete production -> quality -> delivery without leaving pose context.

### Work package P2-C: Navigation and discoverability clean-up

Files:

- `src/pages/FabricatorDashboard.tsx`
- `src/hooks/useRoutePrefetching.ts`
- `src/layouts/studio/StudioLayout.tsx`

Actions:

1. Remove stale route links and prefetch targets that no longer exist.
2. Add role-focused quick actions for common paths.
3. Make "resume last active pose" action globally available.

Acceptance criteria:

- Dashboard and prefetch map contain only valid, canonical routes.

## 9) UX KPI Targets

Measure before/after per phase:

1. Setup-to-first-design time (median)
2. Step completion success rate per stage
3. Drop-off rate between production and delivery
4. Validation error recurrence rate
5. Critical route error rate (redirects to unexpected page)
6. Task completion clicks for top 5 operator workflows
7. Search/batch action latency in positions and production lists

Target deltas by end of Phase 2:

- 30% lower setup-to-first-design time
- 50% lower production-to-completion drop-off
- 40% lower repeated validation errors
- 0 known broken canonical transitions

## 10) Delivery Model

Recommended execution:

- Sprint A (2 weeks): Phase 0 complete.
- Sprint B (2 weeks): Phase 1 orchestrator + identity normalization.
- Sprint C (2-4 weeks): Phase 2 usability uplift.

PR slicing:

- Keep each PR to one work package.
- Include route snapshot tests for transition changes.
- Include manual walkthrough evidence for stage transitions.

## 11) Risk Register

1. **Risk:** Regressions from route normalization  
   **Mitigation:** keep temporary legacy redirects with explicit deprecation window.

2. **Risk:** Data migration issues from ID normalization  
   **Mitigation:** adapter layer that maps old local IDs to canonical IDs until migration complete.

3. **Risk:** Productivity drop for power users during UX simplification  
   **Mitigation:** progressive disclosure, not removal; preserve hotkeys and advanced panels.

4. **Risk:** State drift during transition period  
   **Mitigation:** strict state ownership matrix and lint rules for restricted store access by layer.

## 12) Source Notes (External Benchmark Inputs)

Primary URLs used during benchmark research:

- FeneVision (FeneTech): https://fenetech.com/industries/windows-doors/
- Orgadata Logikal: https://www.orgadata.com/en-us/logikal-front
- Orgadata module overview: https://www.orgadata.com/en/product/module-overview
- Klaes: https://www.klaes.de/
- Windowmaker Configurator: https://windowmaker.com/configurator/
- Windowmaker Production Scheduling: https://www.windowmaker.com/en/Production_Scheduling
- First Degree Systems: https://www.firstdegreesystems.com/
- BM Evolution: https://www.businessmicros.co.uk/evolution/
- BM EvoNET: https://www.businessmicros.co.uk/evonet/
- Soft Tech V6 (Cyncly): https://www.cyncly.com/en/product-overviews/soft-tech-v6/
- A+W Cantor: https://www.a-w.com/aw-cantor/
- PrefSuite: https://prefna.com/prefsuite/
- WinPro Factory: https://winpro-software.com/products/winpro-factory/?lang=en
- Forterro windows/doors portfolio context: https://www.forterro.com/en/windows-and-doors

These sources are used for UX pattern benchmarking and directional comparison, not audited market-share ranking.

