# ALMONA vs Logikal — Gap Analysis Verification Report

> **Purpose**: Verify the gap analysis document against the actual codebase. This report documents what is **confirmed**, **resolved**, or **remaining** based on code inspection.

**Verification date**: 2025-02-27  
**Last updated**: 2025-02-27 (post Phase 0–4 implementation)  
**Codebase**: almona-portfolio-forge  
**Status**: Phase 0–4 complete; G7–G18 (Important/Strategic) partially documented — see Section 10

---

## Executive Summary

| Claim Category | Original Status | Current Status (Post Phase 0–4) |
|---------------|-----------------|--------------------------------|
| **workflowStore missing bom/quote** | ✅ Correct | ✅ **RESOLVED** — `bom` and `quote` added to workflowStore |
| **BOM not wired in workflow** | ✅ Correct | ✅ **RESOLVED** — PresetAwareBOMGenerator called in OptimizationPage |
| **Quote orphaned from workflow** | ✅ Correct | ✅ **RESOLVED** — QuoteBuilder in CommercialPage when in pose context |
| **BarDrawing not in production** | ⚠️ Partially | ✅ **RESOLVED** — BarDrawing used in ProductionCommand |
| **Optimization step** | ❌ Broken | ✅ **RESOLVED** — Continue button, AdaptiveSolver, navigation to Commercial |
| **FabricationWorkflowWizard** | Not routed | ✅ **RESOLVED** — Routed at `/fabricator/wizard` |
| **Orphaned pages** | ✅ Correct | ✅ **RESOLVED** — WorkshopPortal, DeliveryTrackingPage, BentProfileDesignerPage, ValidationDashboardPage now wired |

---

## 1. Critical Gaps — Resolved

### G1: BOM not shown in workflow ✅ RESOLVED

- **PresetAwareBOMGenerator** called in OptimizationPage when user clicks Continue (when systemPack + pattern exist)
- **BOM** stored in `workflowStore.bom` via `setBOM()`
- **QuoteBuilder** in CommercialPage consumes `bom` from workflowStore
- **Assembly sequence** from `CompleteBOM.assemblySequence` displayed in ProductionCommand when bom exists

### G2: No quote generation in workflow ✅ RESOLVED

- **FabricatorQuoteService** (`src/lib/fabricator/commercial/FabricatorQuoteService.ts`) bridges CompleteBOM + OptimizationResult → WorkflowQuote
- **QuoteBuilder** (`src/components/fabricator/workflow/QuoteBuilder.tsx`) shows BOM + optimization costs, markup/VAT, Save Quote, Export PDF, Continue to Production
- **CommercialPage** renders QuoteBuilder when route has `projectId` and `poseId` (pose context)

### G3: workflowStore missing bom + quote ✅ RESOLVED

```typescript
// src/store/workflowStore.ts — current state
interface WorkflowState {
  currentProject: WindowUnit | null;
  measurementData: MeasurementData | null;
  designData: WindowUnit | null;
  optimizationResult: OptimizationResult | null;
  bom: CompleteBOM | null;        // ✅ Added
  quote: WorkflowQuote | null;    // ✅ Added
  completedSteps: Set<string>;
  activeStep: string;
  // ...
}
```

---

## 2. Optimization Step — Resolved

**Previously**: OptimizationEqualizer never called `onComplete`; user could not proceed.

**Current**:

- **OptimizationEqualizer** has "Continue to Production" button that calls `onComplete({ strategy, minRemnantLength, maxRemnantAge })`
- **OptimizationPage** on Continue: runs AdaptiveSolver with `currentProject.components` and profiles, builds `OptimizationResult`, stores in workflowStore, calls `PresetAwareBOMGenerator` when pattern + systemPack exist, navigates to Commercial
- **Data flow**: Design → Optimization → Commercial → Production

---

## 3. BarDrawing & Production Documents — Resolved / Partial

| Component | Gap Doc | Current Status |
|-----------|---------|----------------|
| **BarDrawing** | Not in production workflow | ✅ **RESOLVED** — Used in ProductionCommand (replaced StockBarVisualization) |
| **Cut sheets** | No formatted output | ✅ **RESOLVED** — CutSheetGenerator created; Cut Sheets section in ProductionCommand |
| **Assembly sequence** | Not exposed in UI | ✅ **RESOLVED** — Shown in ProductionCommand when bom.assemblySequence exists |
| **Labels** | BarcodeLabelGenerator not wired | ✅ **RESOLVED** — Labels section in ProductionCommand; ZPL + HTML export |

---

## 4. Workflow Consolidation — Improved

| Workflow | Entry | BOM? | Quote? | Optimization? | Status |
|----------|-------|:----:|:------:|:-------------:|--------|
| **Pose-centric studio** | `/fabricator/studio/projects/:id/positions/:id/design` | ✅ | ✅ | ✅ | **Canonical** — full pipeline |
| **FabricationWorkflowWizard** | `/fabricator/wizard` | ✅ | ❌ | ❌ | Routed; alternative entry |
| **ProjectStudio** | `/fabricator/studio/projects/:id` | Via ApexV6 | ✅ | ✅ | Parallel; not migrated |
| **DraftingWorkbench** | Design studio (drafting mode) | Via drafting | ❌ | ✅ | Design studio |

---

## 5. Orphaned Pages — Resolved

| Page | Route | Status |
|------|-------|--------|
| WorkshopPortal | `/fabricator/studio/production/workshop` | ✅ Routed |
| DeliveryTrackingPage | `/fabricator/studio/production/delivery` | ✅ Routed |
| Customers | `/fabricator/studio/data/customers` | ✅ Routed |
| PatternLibraryPage | `/fabricator/studio/data/patterns` | ✅ Routed |
| BentProfileDesignerPage | `/fabricator/studio/data/bent-profiles` | ✅ Routed |
| ValidationDashboardPage | `/admin/validation` | ✅ Routed |

---

## 6. Phase 3 Additions

| Feature | Status |
|---------|--------|
| **WorkflowValidator** | ✅ `lib/fabricator/validation/WorkflowValidator.ts` — validates step transitions |
| **WorkflowValidationGate** | ✅ UI component in OptimizationPage, ProductionPage, QuoteBuilder |
| **BuildingCodeValidator** | ✅ Added to EngineeringBay (design step) |

---

## 7. Pipeline Completeness (Updated)

| Pipeline Stage | Engine Built? | UI Built? | Wired in Pose-Centric? |
|----------------|:---:|:---:|:---:|
| Project Setup | ✅ | ✅ | ✅ |
| Measurement | ✅ | ✅ | ✅ |
| System Selection | ✅ | ✅ | ✅ |
| Design/Config | ✅ | ✅ | ✅ |
| 3D Preview | ✅ | ✅ | ✅ |
| **BOM Generation** | ✅ | ✅ | ✅ |
| **Cut Optimization** | ✅ | ✅ | ✅ |
| **Pricing/Quoting** | ✅ | ✅ | ✅ |
| **Production Docs** | ✅ | ✅ | ✅ (cut sheets, bar drawings, assembly sequence) |
| Shop Floor/MES | ❌ | ❌ | ❌ |

**Revised pipeline integrity**: ~85% — Core flow Design → Optimization → Quote → Production is complete.

---

## 8. Phase 4.1 & 4.3 — Project Summary & Order Management (Resolved)

| Component | Status | Path |
|-----------|--------|------|
| **ProjectBOMAggregate** | ✅ | `components/fabricator/project/ProjectBOMAggregate.tsx` |
| **ProjectQuoteSummary** | ✅ | `components/fabricator/project/ProjectQuoteSummary.tsx` |
| **Summary tab in ProjectStudio** | ✅ | Design → Optimize → Quote → Summary tabs |
| **ProjectStudioWrapper** | ✅ | Passes `projectId` for V2 mode; `Profile[]` typed |
| **Order management** | ✅ | OrdersPanel at `/fabricator/studio/production/orders`; sidebar link in Production Studio |

---

## 9. Phase 4.2 — Batch Optimization (Resolved)

| Component | Status | Path |
|-----------|--------|------|
| **BatchOptimizationService** | ✅ | `lib/fabricator/production/BatchOptimizationService.ts` |
| **Batch mode in ProjectOptimizer** | ✅ | Toggle when 2+ units; cross-position nesting; bars/waste savings |

---

## 10. Uncompleted Gaps (Investigation Results)

### Phase 0–4: Complete ✅

All Phase 0–4 items from the Improvement Plan are resolved. No remaining P4 gaps.

### Pipeline Partial (Section 7)

| Stage | Status | Notes |
|-------|--------|-------|
| **Measurement** | ✅ Resolved | Route `/positions/:poseId/measuring`; MeasuringPage navigates to design |
| **3D Preview** | ✅ Resolved | Window3DGenerator in EngineeringBay design step (live 3D) |
| **Shop Floor/MES** | ❌ Not built | No MES, barcode scanning, or digital work instructions |

### Original Gap Analysis — Not Addressed (G7–G18)

| Gap | Priority | Status | Notes |
|-----|----------|--------|-------|
| **G7 Plausibility checks** | Important | ⚠️ Partial | WorkflowValidator + WorkflowValidationGate in Optimization, Production, QuoteBuilder; no continuous per-step validation |
| **G8 U-value / thermal calc** | Important | ❌ Open | Glass BOM has U-value; no thermal analysis UI |
| **G9 Structural analysis** | Important | ✅ Resolved | BuildingCodeValidator in EngineeringBay |
| **G10 Order management** | Important | ✅ Resolved | OrdersPanel at `/fabricator/studio/production/orders` |
| **G11 Orphaned pages** | Important | ✅ Resolved | WorkshopPortal, DeliveryTrackingPage, etc. routed |
| **G12 Orphaned routes** | Important | ❌ Open | 60+ routes defined but unreachable from nav; not audited |
| **G13 Duplicate dashboards** | Important | ❌ Open | 5+ dashboard variants; no consolidation |
| **G14 MES / shop-floor** | Strategic | ❌ Open | ProductionDashboard view-only; no barcode/MES |
| **G15 Supplier database** | Strategic | ❌ Open | Hardcoded system packs |
| **G16 BIM round-trip** | Strategic | ❌ Open | DXF only; no Revit/IFC |
| **G17 ERP integration** | Strategic | ❌ Open | No ERP interfaces |
| **G18 Multi-position view** | Strategic | ✅ Resolved | ProjectBOMAggregate, ProjectQuoteSummary, Batch optimization |

### IMPROVEMENT_PLAN Items — Now Addressed

| Item | Plan Reference | Status |
|------|----------------|--------|
| Dedicated BOM step | 1.4 — `/positions/:poseId/bom` | ✅ **RESOLVED** — BOMReviewPage at `poseBom`; Design → BOM → Optimization |
| BOMReviewPanel | 1.2.3 | ✅ **RESOLVED** — BOMReviewPage shows profiles, cost; Continue to Optimization |

---

## 11. Files Referenced (Updated)

| Purpose | Path |
|---------|------|
| workflowStore | `src/store/workflowStore.ts` |
| PresetAwareBOMGenerator | `src/lib/fabricator/PresetAwareBOMGenerator.ts` |
| FabricatorQuoteService | `src/lib/fabricator/commercial/FabricatorQuoteService.ts` |
| QuoteBuilder | `src/components/fabricator/workflow/QuoteBuilder.tsx` |
| CutSheetGenerator | `src/lib/fabricator/production/CutSheetGenerator.ts` |
| WorkflowValidator | `src/lib/fabricator/validation/WorkflowValidator.ts` |
| WorkflowValidationGate | `src/components/fabricator/workflow/WorkflowValidationGate.tsx` |
| CommercialPage | `src/pages/CommercialPage.tsx` |
| OptimizationPage | `src/pages/fabricator/workflow/OptimizationPage.tsx` |
| ProductionPage | `src/pages/fabricator/workflow/ProductionPage.tsx` |
| ProductionCommand | `src/components/fabricator/ProductionCommand.tsx` |
| BarDrawing | `src/components/fabricator/BarDrawing.tsx` |
| ProjectBOMAggregate | `src/components/fabricator/project/ProjectBOMAggregate.tsx` |
| ProjectQuoteSummary | `src/components/fabricator/project/ProjectQuoteSummary.tsx` |
| ProjectStudio | `src/components/fabricator/project/ProjectStudio.tsx` |
| ProjectStudioWrapper | `src/pages/fabricator/ProjectStudioWrapper.tsx` |
| BatchOptimizationService | `src/lib/fabricator/production/BatchOptimizationService.ts` |
| ProjectOptimizer | `src/components/fabricator/project/ProjectOptimizer.tsx` |
| MeasuringPage | `src/pages/fabricator/workflow/MeasuringPage.tsx` |
| BOMReviewPage | `src/pages/fabricator/workflow/BOMReviewPage.tsx` |
| fabricator routes | `src/lib/fabricator/routes.ts` |
| App routes | `src/App.tsx` |

---

## Verification Confirmation

| Check | Result |
|-------|--------|
| Phase 0–3 (workflow, BOM, quote, production docs) | ✅ Verified in codebase |
| Phase 4.1 (ProjectBOMAggregate, ProjectQuoteSummary, Summary tab) | ✅ Verified in ProjectStudio |
| Phase 4.2 (BatchOptimizationService, Batch toggle in ProjectOptimizer) | ✅ Verified in codebase |
| Phase 4.3 (Orders route, sidebar link) | ✅ Verified: `/fabricator/studio/production/orders` |

---

## Deferred Work

Recommended next steps and development work are documented in [DEFERRED_WORK.md](./DEFERRED_WORK.md). All dev work deferred.
