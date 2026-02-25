# ALMONA vs Logikal (Orgadata) — Gap Analysis & Component Wiring Plan

> **Goal**: Transform ALMONA from a collection of impressive but fragmented components into a cohesive, Logikal-class fenestration platform with an unbroken pipeline from project intake to shop-floor production.

---

## Table of Contents

1. [Logikal Gold Standard Workflow](#1-logikal-gold-standard-workflow)
2. [ALMONA Current State Assessment](#2-almona-current-state-assessment)
3. [Gap Analysis: ALMONA vs Logikal](#3-gap-analysis-almona-vs-logikal)
4. [Inventory of Unwired / Fragmented Components](#4-inventory-of-unwired--fragmented-components)
5. [Wiring Plan — Phase-by-Phase](#5-wiring-plan--phase-by-phase)
6. [Implementation Priorities](#6-implementation-priorities)
7. [Architecture Recommendations](#7-architecture-recommendations)

---

## 1. Logikal Gold Standard Workflow

Logikal by Orgadata is the #1 fenestration software globally. Its power comes from a **single unbroken data pipeline** where every step feeds the next automatically.

### Logikal's 5-Phase Pipeline

| Phase | What Happens | Key Capability |
|-------|-------------|----------------|
| **1. Construction** | System selection, element creation with continuous plausibility checks | 7M+ items from 400+ suppliers; automatic fit/compatibility validation |
| **2. Calculation** | Automatic working-hour determination, quotation generation | ERP integration; automatic pricing from supplier databases |
| **3. Order Processing** | Design refinement, U-values, structural analysis, cost tracking | Static analysis; order-to-production conversion |
| **4. Production & CAD** | Construction drawings, installation drawings, bar drawings, CNC data | CAD-Suite 2D; machining data auto-generated from design |
| **5. Shop Floor (MES)** | Digital work instructions, barcode traceability, CE marking, FPC docs | Real-time production dashboards; component-level tracking |

### What Makes Logikal Best-in-Class

1. **Unbroken data chain**: Design data flows directly to CNC machines — no re-entry
2. **Plausibility checks at every step**: System validates feasibility continuously, not just at the end
3. **Supplier database integration**: 400+ suppliers with live pricing and technical data
4. **Automatic document generation**: Bar drawings, workshop drawings, labels, CE documentation — all auto-generated from the design
5. **MES integration**: Shop-floor tracking with barcode scanning, real-time dashboards
6. **BIM round-trip**: Import from Revit → design in Logikal → export back to Revit with full specs

---

## 2. ALMONA Current State Assessment

### What ALMONA Has Built (Impressive Foundation)

| Capability | Status | Quality |
|-----------|--------|---------|
| Project Setup / Wizard | ✅ Complete | Strong — Egyptian market focus with governorate/zone support |
| Measurement Interface | ✅ Complete | Excellent — 2600+ line `SmartMeasuringInterface` with dual modes |
| System Pack Selection | ✅ Complete | Good — `PrestigeSystemPackSelector` with regional filtering |
| Design (Wizard + CAD) | ✅ Complete | Excellent — Dual-mode with 50+ Egyptian templates, DXF import/export |
| BOM Engine | ✅ Complete | Excellent — `PresetAwareBOMGenerator` with 99.8% accuracy, deterministic replay |
| Cut Optimization | ✅ Complete | Strong — Three algorithms (greedy/linear/genetic), rule-based selection |
| Pricing Engine | ✅ Complete | Good — `EgyptianPricingEngine`, `CostCalculator`, multi-currency |
| Quote Service | ⚠️ Exists | Built but disconnected from workflow |
| Production Command | ⚠️ Partial | G-code generation works; documents incomplete |
| 3D Visualization | ✅ Complete | Three.js with AR support |
| DXF/CAD Integration | ✅ Complete | Import + export working |
| Constitutional Framework | ✅ Complete | Tier 3 Protected Determinism, fully tested |
| i18n (AR/EN) | ✅ Complete | Full RTL support |

### The Core Problem: Fragmentation

ALMONA has **~70% of Logikal's capability already built** — but the components are disconnected:

```
CURRENT STATE (Fragmented):

  [Project] → [Measuring] → [Design] → [Preview3D] → [Optimization] → [Production]
                                                            ↑                 ↑
                                                     No BOM shown      No documents
                                                     No cost shown     No bar drawings
                                                                       No labels
                                                                       No cut sheets

  [BOM Engine] ← sits unused, never triggered in workflow
  [Quote Service] ← exists but orphaned from workflow  
  [Pricing Engine] ← calculates costs nobody sees
  [Analytics] ← 5+ dashboard variants, none wired in
  [Production Docs] ← G-code works, no workshop drawings
```

### Pipeline Completeness

| Pipeline Stage | Engine Built? | UI Built? | Wired Into Workflow? | Data Flows to Next Step? |
|---------------|:---:|:---:|:---:|:---:|
| Project Setup | ✅ | ✅ | ✅ | ✅ |
| Measurement | ✅ | ✅ | ✅ | ✅ |
| System Selection | ✅ | ✅ | ✅ | ✅ |
| Design/Config | ✅ | ✅ | ✅ | ✅ |
| 3D Preview | ✅ | ✅ | ✅ | ✅ |
| **BOM Generation** | ✅ | ❌ | ❌ | ❌ |
| Cut Optimization | ✅ | ✅ | ✅ | ⚠️ Partial |
| **Pricing/Quoting** | ✅ | ⚠️ Orphaned | ❌ | ❌ |
| **Production Docs** | ⚠️ Partial | ⚠️ Partial | ⚠️ Partial | ❌ |
| Shop Floor/MES | ❌ | ❌ | ❌ | ❌ |

**Overall pipeline integrity: ~55% wired** (engines exist at ~80% but only ~55% is actually connected end-to-end)

---

## 3. Gap Analysis: ALMONA vs Logikal

### Critical Gaps (Must Fix — These Break the Pipeline)

| # | Gap | Logikal Behavior | ALMONA Current State | Impact |
|---|-----|-----------------|---------------------|--------|
| G1 | **BOM not shown in workflow** | BOM auto-generates after design, displayed as editable parts list | `PresetAwareBOMGenerator` exists but is never called from workflow UI | User cannot see what they're manufacturing |
| G2 | **No quote generation in workflow** | Quote auto-generates from BOM with customer pricing | `QuoteService` + `CostCalculator` exist but aren't triggered | Cannot price jobs → cannot run a business |
| G3 | **No bar drawings** | Auto-generated per-bar technical drawings with machining marks | `BarDrawing.tsx` component exists but not in production workflow | Workshop cannot read cut instructions |
| G4 | **No cut sheets** | Per-position cutting lists with angles, lengths, quantities | Data exists in `OptimizationResult.cuttingPlan` but no formatted output | Operators have no instructions |
| G5 | **No production labels** | QR/barcode labels per piece for traceability | No label generation exists | Cannot track pieces on shop floor |
| G6 | **Workflow store missing BOM + Quote** | N/A (Logikal uses database) | `workflowStore` has no `bom` or `quote` fields | Data chain broken between steps |

### Important Gaps (Should Fix — These Reduce Competitiveness)

| # | Gap | Logikal Behavior | ALMONA Current State | Impact |
|---|-----|-----------------|---------------------|--------|
| G7 | **No plausibility checks** | Continuous validation at every step (structural, thermal, hardware fit) | No validation between workflow steps | Invalid designs reach production |
| G8 | **No U-value / thermal calc** | Auto-calculates U-values, condensation risk | Glass BOM has U-value but no thermal analysis UI | Cannot certify for building codes |
| G9 | **No structural analysis** | Wind-load, static analysis per element | `BuildingCodeValidator.tsx` exists but is not routed | Cannot validate for exposed positions |
| G10 | **No order management** | Quote → Order conversion with tracking | `orders` table exists in Supabase but no UI | Cannot track job status |
| G11 | **25+ orphaned pages** | N/A | Pages like `WorkshopPortal`, `MeasuringPage`, `QualityControlPage` exist without routes | Wasted development; confusing codebase |
| G12 | **60+ orphaned routes** | N/A | Routes defined but unreachable from navigation | Dead code; maintenance burden |
| G13 | **5+ duplicate dashboards** | Single unified dashboard | `BusinessKPIDashboard`, `AnalyticsDashboard`, `PersonalAnalyticsDashboard`, `ServicesYDTDashboard`, etc. | Inconsistent experience |

### Strategic Gaps (Future — These Enable Market Leadership)

| # | Gap | Logikal Behavior | ALMONA Current State |
|---|-----|-----------------|---------------------|
| G14 | **No MES / shop-floor system** | Full MES with digital work instructions, barcode scanning | `ProductionDashboard` exists but is view-only |
| G15 | **No supplier database integration** | 400+ suppliers with live pricing | Hardcoded system packs; `LmePricingService` exists but unused |
| G16 | **No BIM round-trip** | Revit plugin with import/export | DXF import only; no Revit/IFC support |
| G17 | **No ERP integration** | Bi-directional ERP data exchange | No ERP interfaces |
| G18 | **No multi-position project view** | Full project with multiple elements shown together | Project supports positions but no aggregate view |

---

## 4. Inventory of Unwired / Fragmented Components

### Components Ready to Wire (Engines Built, Just Need Connection)

| Component | File | What It Does | Should Connect To |
|-----------|------|-------------|------------------|
| `PresetAwareBOMGenerator` | `src/lib/fabricator/PresetAwareBOMGenerator.ts` | Full BOM with 99.8% accuracy | Workflow after Design step |
| `CostCalculator` | `src/lib/fabricator/bom/CostCalculator.ts` | Material + labor + hardware costing | BOM display + Quote generation |
| `EgyptianPricingEngine` | `src/lib/fabricator/bom/EgyptianPricingEngine.ts` | Egyptian market pricing rules | Quote generation |
| `QuoteService` | `src/components/fabricator/drafting/services/QuoteService.ts` | Quote generation from BOM | New Commercial/Quote step in workflow |
| `QuoteContext` | `src/context/QuoteContext.tsx` | Quote state management + Supabase sync | Quote page in workflow |
| `AssemblySequenceGenerator` | `src/lib/fabricator/bom/AssemblySequenceGenerator.ts` | Production assembly ordering | Production page |
| `BarDrawing` | `src/components/fabricator/BarDrawing.tsx` | Visual bar cut representation | Production documents |
| `YilmazGCodeGenerator` | In production components | G-code for CNC machines | Production export |
| `BuildingCodeValidator` | `src/components/national/BuildingCodeValidator.tsx` | Building code validation | Design step plausibility checks |
| `PriceHistoryService` | `src/lib/pricing/PriceHistoryService.ts` | Price history tracking | Analytics dashboards |
| `PricingAnalyticsService` | `src/lib/pricing/PricingAnalyticsService.ts` | Pricing analytics | Reports page |
| `PriceValidationService` | `src/lib/pricing/PriceValidationService.ts` | Price validation rules | Quote approval workflow |
| `MaalemTeachingEngine` | `src/lib/teaching/MaalemTeachingEngine.ts` | Guided learning system | Onboarding + contextual help |

### Orphaned Page Components (Built But No Route)

| Page Component | File | Purpose | Recommendation |
|---------------|------|---------|---------------|
| `WorkshopPortal` | `src/pages/WorkshopPortal.tsx` | Workshop-facing portal | Wire into Production Studio |
| `MeasuringPage` | `src/pages/fabricator/workflow/MeasuringPage.tsx` | Standalone measuring | Already handled by `SmartMeasuringInterface`; archive |
| `QualityControlPage` | `src/pages/fabricator/workflow/QualityControlPage.tsx` | QC workflow step | Wire as post-production step |
| `DesignPage` | `src/pages/fabricator/workflow/DesignPage.tsx` | Legacy design page | Already replaced by `UnifiedDesignPage`; archive |
| `SmartWizardPage` | `src/pages/SmartWizardPage.tsx` | Smart wizard | Consolidate with existing wizard; archive |
| `Preview3DPage` | `src/pages/fabricator/workflow/Preview3DPage.tsx` | 3D preview step | Wire into design step as tab/modal |
| `ValidationDashboardPage` | `src/pages/ValidationDashboardPage.tsx` | Validation overview | Wire into Admin or Reports |
| `TheFoundry` | `src/pages/TheFoundry.tsx` | Unknown purpose | Evaluate and archive if unused |
| `Portfolio` | `src/pages/Portfolio.tsx` | Portfolio view | Evaluate for customer-facing showcase |
| `BentProfileDesignerPage` | `src/pages/BentProfileDesignerPage.tsx` | Bent profile design | Wire into Data Studio as advanced tool |
| `PatternLibraryPage` | `src/pages/PatternLibraryPage.tsx` | Pattern library | Wire into Design Studio as reference |
| `DeliveryTrackingPage` | `src/pages/DeliveryTrackingPage.tsx` | Delivery tracking | Wire into Production Studio |
| `Customers` | `src/pages/Customers.tsx` | Customer management | Wire into Data Studio sidebar |

### Unused UI Components (Built But Never Rendered)

| Component | File | Purpose | Wire To |
|-----------|------|---------|---------|
| `EquipmentComparisonTool` | `src/components/shop/EquipmentComparisonTool.tsx` | Machine comparison | Products page |
| `WasteComparisonReport` | `src/components/analytics/WasteComparisonReport.tsx` | Waste analytics | Reports page |
| `MaterialEfficiencyDashboard` | `src/components/analytics/MaterialEfficiencyDashboard.tsx` | Material efficiency | Command Center dashboard |
| `CostOptimizationInsights` | `src/components/analytics/CostOptimizationInsights.tsx` | Cost optimization | Reports page |
| `DigitalSpareParts` | `src/components/services/DigitalSpareParts.tsx` | Digital spare parts | Services page |
| `ImportSubstitutionMeter` | `src/components/national/ImportSubstitutionMeter.tsx` | Import substitution tracking | National Dashboard |
| `StandaloneOptimizer` | `src/components/public/StandaloneOptimizer.tsx` | Public optimizer tool | Public optimizer route |
| `PartnerOnboarding` | `src/components/marketplace/PartnerOnboarding.tsx` | Partner onboarding | Marketplace section |

### Duplicate Components to Consolidate

| Duplicated Function | Files | Resolution |
|---------------------|-------|------------|
| Product Cards (4 variants) | `ProductCard`, `EnhancedProductCard`, `IndustrialProductCard`, `OptimizedProductCard` | Consolidate into `ProductCard` with variant prop |
| Analytics Dashboards (5 variants) | `BusinessKPIDashboard`, `AnalyticsDashboard`, `PersonalAnalyticsDashboard`, `ServicesYDTDashboard`, `QuickViewAnalyticsDashboard` | Consolidate into `AnalyticsDashboard` with scope/filter props |
| Ticket Detail Views (2) | `support/TicketDetailView`, `services/support/TicketDetailView` | Keep `support/` version; delete `services/` duplicate |
| Freight Calculators (2) | `FreightCalculator`, `NileFreightCalculator` | Keep `NileFreightCalculator`; archive generic |

---

## 5. Wiring Plan — Phase-by-Phase

### Phase 1: Complete the Core Pipeline (Weeks 1–3)

**Goal**: Unbroken data flow from Project → BOM → Quote → Production Documents

#### 1.1 Wire BOM Generation into Workflow

**What**: After the Design step completes, automatically generate the BOM and display it.

**Changes**:
1. **`workflowStore.ts`** — Add `bom: CompleteBOM | null` field and `setBOM()` action
2. **Create `src/components/fabricator/workflow/BOMReviewPanel.tsx`** — New component that:
   - Calls `PresetAwareBOMGenerator.generateCompleteBOM()` on mount
   - Displays profiles table (role, length, qty, article code)
   - Displays hardware list (type, qty, article code)
   - Displays glass specifications (dimensions, type, U-value)
   - Displays accessories list
   - Shows cost summary from `CostCalculator`
   - Allows manual quantity overrides (with constitutional audit trail)
3. **`EngineeringBayWrapper.tsx`** or the design-step completion handler — After design completes, trigger BOM generation and store result
4. **Wire into pose-centric route** — Add BOM tab/step at `/fabricator/studio/projects/:projectId/positions/:poseId/bom`

**Data Flow**:
```
Design completion → PresetAwareBOMGenerator.generateCompleteBOM(windowUnit, pattern, systemPack)
                  → CompleteBOM stored in workflowStore.bom
                  → BOMReviewPanel renders the BOM
                  → User reviews/approves → flows to Optimization
```

#### 1.2 Wire Quote Generation into Workflow

**What**: After BOM + Optimization, auto-generate a priced quote.

**Changes**:
1. **`workflowStore.ts`** — Add `quote: Quote | null` field
2. **Create `src/components/fabricator/workflow/QuoteBuilder.tsx`** — New component that:
   - Takes BOM + optimization results as input
   - Uses `EgyptianPricingEngine` for market pricing
   - Uses `CostCalculator` for cost breakdown
   - Uses `QuoteService` for quote assembly
   - Shows line-item pricing (profiles, hardware, glass, labor)
   - Allows markup adjustment, discount application
   - Generates PDF quote via existing `lazyExportPDF`
   - Saves to Supabase via existing `QuoteContext`
3. **Wire into `CommercialPage.tsx`** — The existing commercial route at `/fabricator/studio/projects/:projectId/positions/:poseId/commercial` should host `QuoteBuilder`
4. **Connect `QuoteContext`** — Use existing Supabase persistence

**Data Flow**:
```
BOM (CompleteBOM) + OptimizationResult
  → EgyptianPricingEngine.calculatePrice()
  → CostCalculator.calculateTotal()
  → QuoteService.generateQuote()
  → Quote stored in workflowStore + Supabase
  → QuoteBuilder renders editable quote
  → PDF export available
```

#### 1.3 Wire Production Documents

**What**: Generate bar drawings, cut sheets, and labels from optimization data.

**Changes**:
1. **Enhance `ProductionPage.tsx`** — Add tabs for:
   - **Cut Sheets tab**: Render `OptimizationResult.cuttingPlan` as formatted per-bar cutting instructions (profile role, length, angle, quantity, stock bar assignment)
   - **Bar Drawings tab**: Use existing `BarDrawing.tsx` component to render visual bar layouts with cut positions marked
   - **Labels tab**: Generate printable labels with QR codes (using existing `qrcode.react` dependency) containing position ID, profile role, length, and cut angle
   - **G-Code tab**: Existing G-code generation
   - **Export tab**: PDF export of all documents
2. **Create `src/lib/fabricator/production/CutSheetGenerator.ts`** — Transforms `CuttingPlan[]` into printable cut sheet format
3. **Create `src/lib/fabricator/production/LabelGenerator.ts`** — Generates label data with QR codes for each cut piece
4. **Wire `AssemblySequenceGenerator`** — Already exists; display assembly order on Production page

**Data Flow**:
```
OptimizationResult.cuttingPlan
  → CutSheetGenerator.generate() → Cut sheets (per-bar instructions)
  → LabelGenerator.generate() → QR labels (per-piece)
  → BarDrawing component → Visual bar layouts
  → AssemblySequenceGenerator → Assembly order
  → All exportable as PDF
```

---

### Phase 2: Add Plausibility & Validation Layer (Weeks 4–5)

**Goal**: Logikal-style continuous validation. Catch problems before they reach the shop floor.

#### 2.1 Inter-Step Validation

**What**: Validate data completeness and feasibility between each workflow step.

**Changes**:
1. **Create `src/lib/fabricator/validation/WorkflowValidator.ts`** — Validation service with checks:
   - **Measuring → Design**: Dimensions within system pack limits? Profile selections complete? Grid valid?
   - **Design → BOM**: All cells configured? Opening mechanisms compatible with system? Glass thickness valid for span?
   - **BOM → Optimization**: All profiles have stock lengths defined? Hardware quantities > 0?
   - **Optimization → Production**: Waste % acceptable? All cuts feasible? CNC parameters valid?
2. **Create `src/components/fabricator/workflow/ValidationGate.tsx`** — UI component shown between steps that:
   - Runs validation checks
   - Shows pass/fail/warning for each check
   - Blocks progression on failures
   - Allows override with reason (audit trail)
3. **Wire `BuildingCodeValidator`** — Connect existing `src/components/national/BuildingCodeValidator.tsx` into the design step for Egyptian building code compliance
4. **Wire `FenestrationSystemValidator`** — Connect existing validator from Gold Tier into system selection

#### 2.2 Hardware Compatibility Validation

**What**: Validate hardware fits the selected system pack and opening mechanism.

**Changes**:
1. **Enhance `HardwareBOMCalculator`** — Add compatibility checks:
   - Handle length vs sash weight
   - Lock type vs opening direction
   - Roller type vs sash weight (for sliding systems)
   - Hinge quantity vs sash height
2. **Display warnings in BOM Review** — Show compatibility warnings alongside BOM items

---

### Phase 3: Unify Fragmented Navigation (Weeks 6–7)

**Goal**: Clean up the 150+ routes, wire orphaned pages, remove dead code.

#### 3.1 Consolidate Fabricator Studio Sidebar

**What**: The Studio sidebar is the primary navigation for fabricators. It should expose all key functions.

**Changes to `UniversalNavSidebar.tsx`**:
```
Command Center          (existing)
Project Studio          (existing)
├── [Project List]      (existing)
├── [Position Design]   (existing — pose-centric routes)
│   ├── Design          (existing)
│   ├── BOM Review      (NEW — Phase 1.1)
│   ├── Optimization    (existing)
│   ├── Commercial      (existing → wire QuoteBuilder)
│   └── Production      (existing → enhance with docs)
Design Studio           (existing)
Production Studio       (existing)
├── Workshop Portal     (NEW — wire WorkshopPortal.tsx)
├── Quality Control     (NEW — wire QualityControlPage.tsx)
├── Delivery Tracking   (NEW — wire DeliveryTrackingPage.tsx)
Data Studio             (existing)
├── System Packs        (existing)
├── Profiles            (existing)
├── Tuning              (existing)
├── Customers           (NEW — wire Customers.tsx)
├── Pattern Library     (NEW — wire PatternLibraryPage.tsx)
└── Bent Profile Design (NEW — wire BentProfileDesignerPage.tsx)
Reports                 (existing)
├── Waste Analytics     (NEW — wire WasteComparisonReport.tsx)
├── Cost Insights       (NEW — wire CostOptimizationInsights.tsx)
├── Material Efficiency (NEW — wire MaterialEfficiencyDashboard.tsx)
└── Pricing Analytics   (NEW — wire PricingAnalyticsService)
Settings                (existing)
```

#### 3.2 Clean Up Routes

**Actions**:
1. **Remove 30+ legacy redirect routes** — They exist only for backwards compatibility with URLs that were never public. Keep only `/fabricator` → `/fabricator/studio/command`.
2. **Archive ~25 unrouted pages** that have been superseded:
   - `MeasuringPage.tsx` (superseded by `SmartMeasuringInterface`)
   - `DesignPage.tsx` (superseded by `UnifiedDesignPage`)
   - `SmartWizardPage.tsx` (superseded by wizard mode)
   - `Shop-enhanced.tsx` (unclear if used)
   - `FabricatorBrandingSettings.tsx` (no route)
   - `MachineTestingPage.tsx` (test page)
   - `DebugWorkflowPage.tsx` (debug page)
3. **Wire orphaned pages that add value** (as listed in sidebar plan above)
4. **Consolidate demo/test routes** under `/dev/` prefix for development-only access

#### 3.3 Consolidate Duplicate Components

**Actions**:
1. **Product Cards**: Create unified `ProductCard` with `variant: 'standard' | 'enhanced' | 'industrial' | 'compact'` prop. Migrate all usages.
2. **Analytics Dashboards**: Create unified `AnalyticsDashboard` with `scope: 'personal' | 'business' | 'services' | 'quick'` prop. Use composition for dashboard-specific widgets.
3. **Ticket Views**: Delete `services/support/TicketDetailView.tsx`, use `support/TicketDetailView.tsx` everywhere.
4. **Freight Calculator**: Archive `FreightCalculator.tsx`, keep `NileFreightCalculator.tsx`.

---

### Phase 4: Wire Disconnected Services (Weeks 8–9)

**Goal**: Connect existing library modules that are built but have no UI.

#### 4.1 Pricing Services Integration

| Service | Wire To | What It Enables |
|---------|---------|----------------|
| `PriceHistoryService` | Reports page — "Price Trends" chart | Fabricators see material price trends over time |
| `PricingAnalyticsService` | Reports page — "Pricing Analytics" section | Margin analysis, quote win/loss rates |
| `PriceValidationService` | Quote approval step | Auto-validate quotes against rules (min margin, max discount) |
| `LmePricingService` | Data Studio — "Market Prices" widget | Live aluminum LME pricing for costing accuracy |
| `AluminumPricingCalculator` | BOM cost calculation | More accurate material costing |
| `MachinePricingService` | Shop page — machine pricing | Dynamic machine pricing |
| `PricingImportExportService` | Settings — "Import/Export Pricing" | Bulk pricing updates from supplier sheets |
| `YDTPricingOracle` | YDT Agent — pricing questions | AI agent can answer pricing questions |

#### 4.2 Teaching & Reasoning Integration

| Service | Wire To | What It Enables |
|---------|---------|----------------|
| `MaalemTeachingEngine` | Onboarding page + contextual tooltips | Guided learning for new fabricators |
| `MaalemReasoningEngine` | Validation messages + YDT Agent | Explain why a design choice is invalid |

#### 4.3 Sync & Collaboration Integration

| Service | Wire To | What It Enables |
|---------|---------|----------------|
| `WorkspaceSyncService` | Project Studio | Multi-device project sync |
| `ConflictResolver` | Project save operations | Handle concurrent edits |

#### 4.4 Analytics Components Integration

| Component | Wire To | What It Enables |
|-----------|---------|----------------|
| `WasteComparisonReport` | Reports → Waste Analytics | Compare waste across jobs |
| `MaterialEfficiencyDashboard` | Command Center widget | At-a-glance material efficiency |
| `CostOptimizationInsights` | Reports → Cost Insights | Cost optimization recommendations |
| `PerformanceBenchmarkChart` | Command Center widget | Performance benchmarking |
| `ImportSubstitutionMeter` | National Dashboard | Track import substitution progress |

---

### Phase 5: Multi-Position Project View (Weeks 10–11)

**Goal**: Logikal-style project-level aggregation. See all positions together.

#### 5.1 Project Summary Dashboard

**What**: When viewing a project, show all positions with aggregate data.

**Changes**:
1. **Enhance `ProjectStudioWrapper.tsx`** — Add summary view with:
   - Position list table (pos #, type, dimensions, system, status)
   - Aggregate BOM (total profiles, total glass area, total hardware)
   - Aggregate cost (total material + labor + overhead)
   - Project-level optimization (combine cuts across positions for better waste)
   - Project-level quote generation
2. **Create `src/components/fabricator/project/ProjectBOMAggregate.tsx`** — Aggregates BOMs from all positions
3. **Create `src/components/fabricator/project/ProjectQuoteSummary.tsx`** — Project-level quote with position line items

#### 5.2 Cross-Position Optimization

**What**: Optimize cuts across all positions in a project for better material utilization.

**Changes**:
1. **Enhance `OptimizationEngine.ts`** — Add batch optimization mode that takes profiles from all positions
2. **Create `src/components/fabricator/project/BatchOptimizationView.tsx`** — Shows cross-position optimization results
3. **Wire `BatchCutListDemo.tsx`** — This exists and demos batch optimization; move from demo to production

---

### Phase 6: Order Management & Tracking (Weeks 12–13)

**Goal**: Quote → Order conversion with status tracking (Logikal's Phase 3).

#### 6.1 Order Management

**Changes**:
1. **Create `src/components/fabricator/orders/OrderManagement.tsx`** — CRUD for orders
2. **Create `src/components/fabricator/orders/OrderTimeline.tsx`** — Status tracking (Quoted → Ordered → In Production → Shipped → Installed)
3. **Wire Supabase `orders` table** — Already exists, just needs UI
4. **Add to Studio sidebar** — "Orders" section under Project Studio

#### 6.2 Quality Control Integration

**Changes**:
1. **Wire `QualityControlPage.tsx`** — Add as post-production step
2. **Create inspection checklists** from BOM (verify all items present, dimensions correct)
3. **Wire `DeliveryTrackingPage.tsx`** — Track delivery status

---

## 6. Implementation Priorities

### Priority Matrix

| Phase | Effort | Impact | Business Value | Recommendation |
|-------|--------|--------|---------------|---------------|
| **Phase 1: Core Pipeline** | Medium (3 weeks) | **Critical** | Unlocks revenue (quotes!) | **DO FIRST** |
| **Phase 2: Validation** | Medium (2 weeks) | High | Prevents costly errors | Do second |
| **Phase 3: Navigation Cleanup** | Low (2 weeks) | Medium | Developer velocity + UX | Do third |
| **Phase 4: Wire Services** | Low-Medium (2 weeks) | Medium | Feature completeness | Do fourth |
| **Phase 5: Multi-Position** | Medium (2 weeks) | High | Handles real projects | Do fifth |
| **Phase 6: Orders** | Medium (2 weeks) | High | Full business workflow | Do sixth |

### Quick Wins (Can Do in Days, Not Weeks)

1. **Add `bom` and `quote` fields to `workflowStore`** — 30 minutes
2. **Wire `Customers.tsx` page into Data Studio sidebar** — 1 hour
3. **Wire `PatternLibraryPage.tsx` into Data Studio** — 1 hour
4. **Wire analytics components into Reports page** — 2 hours per component
5. **Delete duplicate `TicketDetailView`** — 15 minutes
6. **Wire `BuildingCodeValidator` into design step** — 2 hours
7. **Add BOM generation trigger after design completion** — 2 hours (the engine is ready; just call it)
8. **Display `OptimizationResult.costBreakdown` on Optimization page** — 1 hour (data is already there)

---

## 7. Architecture Recommendations

### 7.1 Unified Workflow Store

Extend `workflowStore.ts` to hold the complete pipeline state:

```typescript
interface WorkflowState {
  // Existing
  currentProject: WindowUnit | null;
  measurementData: MeasurementData | null;
  designData: WindowUnit | null;
  optimizationResult: OptimizationResult | null;
  completedSteps: Set<string>;
  activeStep: string;

  // NEW — Complete the data chain
  bom: CompleteBOM | null;
  quote: Quote | null;
  validationResults: Record<string, ValidationResult>;
  productionDocuments: {
    cutSheets: CutSheet[] | null;
    barDrawings: BarDrawingData[] | null;
    labels: LabelData[] | null;
    gcode: string | null;
    assemblySequence: AssemblyStep[] | null;
  } | null;
}
```

### 7.2 Step-Based Workflow Component

Create a reusable workflow orchestrator:

```typescript
const WORKFLOW_STEPS = [
  { id: 'project',       label: 'Project Setup',    component: ProjectCreationManager },
  { id: 'measuring',     label: 'Measurement',      component: SmartMeasuringInterface },
  { id: 'design',        label: 'Design',           component: UnifiedDesignPage },
  { id: 'bom',           label: 'BOM Review',       component: BOMReviewPanel },        // NEW
  { id: 'optimization',  label: 'Optimization',     component: OptimizationPage },
  { id: 'commercial',    label: 'Quote',            component: QuoteBuilder },           // NEW
  { id: 'production',    label: 'Production',       component: ProductionPage },         // Enhanced
  { id: 'quality',       label: 'Quality Control',  component: QualityControlPage },     // Wired
] as const;
```

### 7.3 Validation Gate Pattern

Insert validation between every step:

```typescript
// Between each step transition:
const canProgress = await WorkflowValidator.validate(currentStep, nextStep, workflowState);
if (!canProgress.passed) {
  showValidationGate(canProgress.issues);  // Block with explanation
} else if (canProgress.warnings.length > 0) {
  showValidationWarnings(canProgress.warnings);  // Warn but allow
}
```

### 7.4 Auto-Generation Pattern

Trigger downstream generation automatically:

```
Design complete → auto-generate BOM → auto-calculate cost
Optimization complete → auto-generate cut sheets → auto-generate labels  
Quote approved → auto-create order → auto-generate production docs
```

### 7.5 Component Consolidation Strategy

For duplicate components, use the **variant pattern**:

```typescript
// Instead of 4 product card components:
<ProductCard variant="standard" />   // replaces ProductCard
<ProductCard variant="enhanced" />   // replaces EnhancedProductCard
<ProductCard variant="industrial" /> // replaces IndustrialProductCard
<ProductCard variant="compact" />    // replaces OptimizedProductCard
```

---

## Summary

### What ALMONA Already Has (Strengths Over Competitors)

1. **Constitutional determinism** — No other fenestration platform has provable, auditable algorithm selection
2. **Egyptian market focus** — Governorate-aware, Arabic-first, Egyptian patterns
3. **Dual-mode design** — Both wizard and CAD modes with data conversion between them
4. **99.8% BOM accuracy engine** — The engine is excellent; it just needs to be shown to users
5. **Modern tech stack** — React + TypeScript + Vite is far more modern than Logikal's Windows desktop app

### What ALMONA Must Fix to Compete

1. **Complete the pipeline** — Wire BOM → Quote → Production Documents (Phase 1)
2. **Add validation** — Catch errors before production (Phase 2)
3. **Clean up fragmentation** — 25+ orphaned pages, 60+ dead routes, 5+ duplicate dashboards (Phase 3)
4. **Wire existing services** — Many engines are built but have no UI (Phase 4)

### The Bottom Line

ALMONA is **not missing capability** — it's missing **connections**. The engines exist. The components exist. The data models exist. What's needed is the wiring to make them into a single, unbroken pipeline. That's what separates a prototype from a platform, and that's what Logikal gets right.

**Estimated total effort**: 13 weeks for all 6 phases. Phase 1 alone (3 weeks) transforms ALMONA from a demo into a usable fabrication tool.
