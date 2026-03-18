# ALMONA Pipeline Improvement Plan

> **Goal**: Transform the fragmented pose-centric workflow into an unbroken pipeline from design to production, aligned with the Logikal gold standard.

**Based on**: [GAP_ANALYSIS_VERIFICATION_REPORT.md](./GAP_ANALYSIS_VERIFICATION_REPORT.md)  
**Deferred work**: [DEFERRED_WORK.md](./DEFERRED_WORK.md)  
**Target flow**: Measuring → Design → BOM → Optimization → Quote → Production Documents

---

## Plan Overview

| Phase | Focus | Duration | Outcome |
|-------|-------|----------|---------|
| **Phase 0** | Unblock workflow | 1–2 days | User can complete Design → Optimization → Production |
| **Phase 1** | Core pipeline | 2–3 weeks | BOM + Quote wired; data flows end-to-end |
| **Phase 2** | Production documents | 1–2 weeks | Cut sheets, bar drawings, labels |
| **Phase 3** | Validation & consolidation | 1–2 weeks | Plausibility checks; orphan cleanup |
| **Phase 4** | Multi-position & orders | 2–3 weeks | Project-level view; order tracking |

---

## Phase 0: Unblock the Workflow (P0)

**Problem**: OptimizationPage never calls `onComplete`; user cannot proceed to Inventory/Production.

### 0.1 Fix Optimization Step

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| 0.1.1 | Add "Continue" button to OptimizationEqualizer | `OptimizationEqualizer.tsx` | 1h |
| 0.1.2 | On Continue: run cutting optimization (BOM → cuts) | `OptimizationPage.tsx` | 4–8h |
| 0.1.3 | Produce `OptimizationResult` and call `setOptimizationResult` | `OptimizationPage.tsx`, `workflowStore` | 2h |

**0.1.1 — Add Continue button**

- Add a "Continue to Production" (or "Apply & Continue") button to `OptimizationEqualizer`
- On click: call `onComplete?.(strategy)` so parent can proceed
- **Minimal fix**: Pass strategy as result; OptimizationPage stores a placeholder `OptimizationResult` built from `currentProject` + strategy. ProductionCommand may need to handle missing `cuttingPlan` gracefully.

**0.1.2 — Run actual optimization**

- Reuse logic from `CuttingOptimizationEngine` or `EnhancedAdaptiveSolver` / `adaptiveSolver.ts`
- Input: `currentProject` (WindowUnit) + profiles + strategy
- Output: `OptimizationResult` with `cuttingPlan`, `costBreakdown`, etc.
- Call from OptimizationPage when user clicks Continue

**0.1.3 — Store result**

- `handleOptimizationComplete(result)` already calls `setOptimizationResult(result)` and `completeStep('optimization')`
- Ensure `OptimizationResult` shape matches what ProductionCommand expects

**Acceptance criteria**

- [ ] User can navigate Design → Optimization → Inventory → Production
- [ ] `workflowStore.optimizationResult` is set before Production
- [ ] ProductionCommand receives valid `optimization` prop (or shows clear error if not)

---

## Phase 1: Core Pipeline (P1)

**Goal**: Unbroken data flow Design → BOM → Quote → Production.

### 1.1 Extend workflowStore

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| 1.1.1 | Add `bom: CompleteBOM \| null` to WorkflowState | `workflowStore.ts` | 30m |
| 1.1.2 | Add `quote: Quote \| null` (or equivalent) | `workflowStore.ts` | 30m |
| 1.1.3 | Add `setBOM`, `setQuote` actions | `workflowStore.ts` | 30m |
| 1.1.4 | Persist bom/quote in `partialize` (optional) | `workflowStore.ts` | 30m |

### 1.2 Wire BOM Generation

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| 1.2.1 | On design completion: call `PresetAwareBOMGenerator.generateCompleteBOM()` | `EngineeringBayWrapper` or design completion handler | 2h |
| 1.2.2 | Store result in `workflowStore.bom` | `workflowStore` | 30m |
| 1.2.3 | Create `BOMReviewPanel` (or adapt VisualBOMDisplay) | New: `BOMReviewPanel.tsx` | 4–6h |
| 1.2.4 | Add BOM step/tab to pose-centric flow | Route + nav | 2h |

**BOMReviewPanel responsibilities**

- Read `bom` from workflowStore (or receive as prop)
- Display profiles table (role, length, qty, article code)
- Display hardware, glass, accessories
- Show cost summary from `CostCalculator` (already in CompleteBOM)
- Optional: manual quantity overrides with audit trail

**Placement options**

- **A**: New route `/positions/:poseId/bom` between design and optimization
- **B**: Tab within design step (Design | BOM)
- **C**: Auto-generate on design complete; show in Optimization or Commercial step

**Recommendation**: Option A — dedicated BOM step for clarity and Logikal alignment.

### 1.3 Wire Quote Generation

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| 1.3.1 | Create `FabricatorQuoteService` (or extend existing) | New: `FabricatorQuoteService.ts` | 4h |
| 1.3.2 | Input: `CompleteBOM` + `OptimizationResult`; use `EgyptianPricingEngine`, `CostCalculator` | — | — |
| 1.3.3 | Create `QuoteBuilder` component | New: `QuoteBuilder.tsx` | 6–8h |
| 1.3.4 | Wire QuoteBuilder into CommercialPage when in pose context | `CommercialPage.tsx` | 2–4h |
| 1.3.5 | Store quote in workflowStore; optional Supabase sync via QuoteContext | — | 2h |

**QuoteBuilder responsibilities**

- Take BOM + optimization as input
- Show line-item pricing (profiles, hardware, glass, labor)
- Markup/discount controls
- PDF export (reuse `lazyExportPDF` or CommercialPDFService)
- Save to Supabase if QuoteContext supports fabricator quotes

**CommercialPage integration**

- When route is `/positions/:poseId/commercial`: render QuoteBuilder with workflow data
- When route is general commercial: keep existing workspace (quotes/invoices list)

### 1.4 Update Step Order

Current pose-centric steps: `design` → `optimization` → `inventory` → `production` → `quality-control`

Proposed: `design` → `bom` → `optimization` → `commercial` → `production` → `quality-control`

- Add `bom` and `commercial` to `WORKFLOW_STEPS` in workflowStore if not already present
- Ensure `canAccessStep` logic allows progression
- Update navigation (PoseSwitcher, sidebar) to include BOM and Commercial

**Acceptance criteria**

- [ ] BOM auto-generates after design; stored in workflowStore
- [ ] BOMReviewPanel displays CompleteBOM with costs
- [ ] QuoteBuilder generates priced quote from BOM + optimization
- [ ] CommercialPage shows QuoteBuilder when in pose context
- [ ] Data flows: Design → BOM → Optimization → Quote → Production

---

## Phase 2: Production Documents (P2)

**Goal**: Workshop-ready outputs — cut sheets, bar drawings, labels.

### 2.1 Cut Sheets

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| 2.1.1 | Create `CutSheetGenerator` | New: `lib/fabricator/production/CutSheetGenerator.ts` | 4h |
| 2.1.2 | Transform `CuttingPlan[]` → printable format (per-bar instructions) | — | — |
| 2.1.3 | Add Cut Sheets tab to ProductionCommand (or ProductionPage) | `ProductionCommand.tsx` | 2–3h |
| 2.1.4 | PDF export for cut sheets | Reuse lazyExportPDF or add handler | 2h |

### 2.2 Bar Drawings

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| 2.2.1 | Use `BarDrawing` in ProductionCommand | `ProductionCommand.tsx` | 2h |
| 2.2.2 | Pass `cuttingPlan` + `profiles` to BarDrawing | — | — |
| 2.2.3 | Option: replace or merge with `StockBarVisualization` | — | 1h |

### 2.3 Labels

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| 2.3.1 | Create `LabelGenerator` (or use `BarcodeLabelGenerator`) | New or `integrations/yilmaz/BarcodeLabelGenerator.ts` | 2–4h |
| 2.3.2 | Generate label data per cut piece (position ID, profile role, length, angle) | — | — |
| 2.3.3 | Add Labels tab with QR/barcode preview | `ProductionCommand.tsx` | 3h |
| 2.3.4 | Printable label sheet export | — | 2h |

### 2.4 Assembly Sequence

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| 2.4.1 | Expose `AssemblySequenceGenerator` output from CompleteBOM | `PresetAwareBOMGenerator` already includes it | — |
| 2.4.2 | Display assembly order on Production page | `ProductionCommand.tsx` | 2h |

**Acceptance criteria**

- [ ] Cut sheets: per-bar cutting instructions, exportable as PDF
- [ ] Bar drawings: visual bar layouts with cut positions
- [ ] Labels: QR/barcode per piece, printable
- [ ] Assembly sequence visible on Production page

---

## Phase 3: Validation & Consolidation (P3)

**Goal**: Plausibility checks; reduce fragmentation; wire orphaned pages.

### 3.1 Inter-Step Validation

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| 3.1.1 | Create `WorkflowValidator` | New: `lib/fabricator/validation/WorkflowValidator.ts` | 4–6h |
| 3.1.2 | Checks: Measuring→Design, Design→BOM, BOM→Optimization, Optimization→Production | — | — |
| 3.1.3 | Create `ValidationGate` UI component | New: `ValidationGate.tsx` | 3h |
| 3.1.4 | Wire between steps (block on failure, warn on warnings) | Workflow components | 2–4h |

### 3.2 Wire BuildingCodeValidator

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| 3.2.1 | Add BuildingCodeValidator to design step | `EngineeringBay` or design wrapper | 2h |

### 3.3 Orphaned Pages — Wire or Archive

| Page | Action | Route | Effort |
|------|--------|-------|--------|
| WorkshopPortal | Wire | `/fabricator/studio/production/workshop` | 1h |
| DeliveryTrackingPage | Wire | `/fabricator/studio/production/delivery` | 1h |
| Customers | Wire | `/fabricator/studio/data/customers` | 1h |
| PatternLibraryPage | Wire | `/fabricator/studio/data/patterns` | 1h |
| BentProfileDesignerPage | Wire | `/fabricator/studio/data/bent-profiles` | 1h |
| FabricationWorkflowWizard | Route or archive | If kept: `/fabricator/wizard` | 1h |
| ValidationDashboardPage | Wire to Admin/Reports | `/admin/validation` or `/reports/validation` | 1h |

### 3.4 Workflow Consolidation Decision

| Task | Description | Effort |
|------|-------------|--------|
| 3.4.1 | Decide canonical flow: pose-centric vs ProjectStudio | 0 (decision) |
| 3.4.2 | If pose-centric: migrate ProjectOptimizer/ProjectQuote patterns into pose flow | 1–2 weeks |
| 3.4.3 | If ProjectStudio: migrate pose-centric features into ProjectStudio | 1–2 weeks |
| 3.4.4 | Archive or remove redundant flows | 2–4h |

**Recommendation**: Use **pose-centric** as canonical (matches routes, FabricatorWorkspaceContext). Migrate ProjectStudio’s optimization/quote logic into pose-centric steps.

---

## Phase 4: Multi-Position & Orders (P4)

**Goal**: Project-level aggregation; quote → order conversion.

### 4.1 Project Summary Dashboard

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| 4.1.1 | Aggregate BOM across positions | New: `ProjectBOMAggregate.tsx` | 4h |
| 4.1.2 | Aggregate quote across positions | New: `ProjectQuoteSummary.tsx` | 4h |
| 4.1.3 | Add summary view to ProjectStudioWrapper / project route | — | 2h |

### 4.2 Cross-Position Optimization

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| 4.2.1 | Batch optimization mode in optimization engine | `EnhancedAdaptiveSolver` or equivalent | 4–6h |
| 4.2.2 | BatchOptimizationView component | Wire `BatchCutListDemo` or new | 4h |

### 4.3 Order Management

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| 4.3.1 | OrderManagement CRUD component | New: `orders/OrderManagement.tsx` | 6h |
| 4.3.2 | OrderTimeline (Quoted → Ordered → In Production → Shipped) | New: `orders/OrderTimeline.tsx` | 4h |
| 4.3.3 | Wire Supabase `orders` table | — | 2h |
| 4.3.4 | Add Orders to sidebar | `UniversalNavSidebar` / layout | 1h |

---

## Dependencies & Ordering

```
Phase 0 (Unblock)
    │
    ├── 0.1 Fix Optimization ──────────────────────────────────┐
    │                                                           │
    ▼                                                           │
Phase 1 (Core Pipeline)                                         │
    │                                                           │
    ├── 1.1 workflowStore (bom, quote)                          │
    ├── 1.2 BOM generation + BOMReviewPanel ───────────────────┤
    ├── 1.3 QuoteBuilder + FabricatorQuoteService ──────────────┤
    │         (depends on 1.1, 1.2, 0.1)                         │
    │                                                           │
    ▼                                                           │
Phase 2 (Production Docs)                                       │
    │         (depends on 0.1 — needs OptimizationResult)        │
    ├── 2.1 Cut sheets                                          │
    ├── 2.2 Bar drawings                                        │
    ├── 2.3 Labels                                               │
    └── 2.4 Assembly sequence                                   │
    │                                                           │
    ▼                                                           │
Phase 3 (Validation & Consolidation)                            │
    ├── 3.1 WorkflowValidator                                   │
    ├── 3.2 BuildingCodeValidator                                │
    ├── 3.3 Orphaned pages                                       │
    └── 3.4 Workflow consolidation                              │
    │                                                           │
    ▼                                                           │
Phase 4 (Multi-Position & Orders)                                │
    ├── 4.1 Project summary                                      │
    ├── 4.2 Batch optimization                                   │
    └── 4.3 Order management                                     │
```

---

## Effort Summary

| Phase | Low | High |
|-------|-----|------|
| Phase 0 | 1 day | 2 days |
| Phase 1 | 2 weeks | 3 weeks |
| Phase 2 | 1 week | 2 weeks |
| Phase 3 | 1 week | 2 weeks |
| Phase 4 | 2 weeks | 3 weeks |
| **Total** | **~7 weeks** | **~12 weeks** |

---

## Quick Wins (Can Do Immediately)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Add `bom` and `quote` to workflowStore | 30m | Unblocks Phase 1 |
| 2 | Add Continue button to OptimizationEqualizer (minimal: pass strategy) | 1h | Unblocks flow |
| 3 | Wire Customers page to Data Studio | 1h | Reduces orphan count |
| 4 | Wire PatternLibraryPage to Data Studio | 1h | Reduces orphan count |
| 5 | Trigger BOM generation on design complete (store in new field) | 2h | Starts data chain |
| 6 | Display costBreakdown on Optimization page (if optimization runs) | 1h | User sees value |

---

## Success Metrics

- [ ] **End-to-end flow**: User can go from new project → design → BOM review → optimization → quote → production documents without manual data re-entry
- [ ] **Pipeline integrity**: All steps read from and write to workflowStore; no orphaned data
- [ ] **Production readiness**: Cut sheets, bar drawings, and labels exportable from Production step
- [ ] **Reduced fragmentation**: Single canonical workflow; orphaned pages wired or archived
