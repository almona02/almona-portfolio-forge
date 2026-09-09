# FP-025A — Industrial UX Architecture

**Date:** 2026-09-09  
**Scope:** UI / UX only. No manufacturing formula, Cut identity, kerf, optimizer math, or FP-024 fixture changes.  
**Branch:** `feature/fp025a-industrial-ui` (from `main`)

DoWin is an information-architecture reference only. ALMONA remains its own product.

---

## 1. Current structure (forensic)

Canonical Studio hierarchy lives in `src/lib/fabricator/routes.ts` and `src/App.tsx`.

| Surface | Canonical location | Evidence |
|---|---|---|
| Route builders | `src/lib/fabricator/routes.ts` | `STUDIO_BASE = '/fabricator/studio'` L12–59 |
| Studio router | `src/App.tsx` | `/fabricator/studio` L434–490 |
| Pose workflow | `src/App.tsx` | `projects/:projectId/positions/:poseId/{measuring,design,bom,optimization,commercial,production}` L449–457 |
| StudioLayout | `src/layouts/studio/StudioLayout.tsx` | L40–106 |
| Pose chrome | `src/layouts/studio/PoseWorkflowLayout.tsx` | WorkflowStepNavigator + ValidationGate L12–21 |
| DraftingWorkbench | `src/components/fabricator/drafting/DraftingWorkbench.tsx` | canonical CAD L48–59 |
| Drafting layout | `src/components/fabricator/drafting/components/DraftingWorkbenchLayout.tsx` | left toolbar + canvas + right panel L111–149 |
| Measuring | `src/pages/fabricator/workflow/MeasuringPage.tsx` | SmartMeasuringInterface L13–18, L71 |
| Optimization | `src/pages/fabricator/workflow/OptimizationPage.tsx` | OptimizationEqualizer + workflow store L36–49 |
| Production | `src/pages/fabricator/workflow/ProductionPage.tsx` | ProductionDocumentsPanel + ProductionCommand L30–57 |
| QC | `src/App.tsx` L469; `src/pages/fabricator/workflow/QualityControlPage.tsx` | `/fabricator/studio/production/quality` |
| Delivery | `src/App.tsx` L470 | `/fabricator/studio/production/delivery` |
| Inventory / remnants | `src/components/fabricator/InventoryDashboard.tsx` | remnantManager L25; not on a Studio data route |
| Design tokens | StudioLayout + Tailwind `amber` / `#0a0a0a` | `src/layouts/studio/StudioLayout.tsx` L49–57 |
| Responsive primitives | `CollapsiblePanel`, `FabricatorWorkspaceLayout`, `useIsMobile` | `src/components/fabricator/layout/*`, `src/hooks/use-mobile.tsx` |
| i18n / RTL | `src/lib/i18n.ts` `isRTL` L943–949; `locales/{en,ar}/fabricator.json` | `document.documentElement.dir` |
| Auth | `ProtectedRoute` exists (`src/components/auth/ProtectedRoute.tsx`) | StudioLayout is **not** wrapped (App.tsx L434) |
| Legacy surfaces | `/fabricator-workflow`, `/fabricator/workflow/*`, `src/pages/FabricatorWorkflow.tsx` | redirected in App.tsx L174–226, L495–501 |

### Gaps vs industrial cockpit

1. Project context is a breadcrumb in `WorkspaceTopNav`, not a permanent Studio header.
2. Workflow bar exists only inside pose routes and omits Project / Stock / QC / Delivery.
3. Design has a pose dropdown, not a persistent left position rail.
4. Production is tabbed Documents / CNC, not a four-zone cockpit.
5. Optimization is equalizer-first, not results/stock/cuts cockpit.
6. Data Studio is a padded card wrapper (`max-w-7xl`), not grouped master data.
7. No central Production Output catalog; NCW is not implemented (no `NCW` matches in repo).
8. ProductionPage still navigates to **legacy** `/fabricator/workflow/quality-control/:id` (ProductionPage.tsx L78–82).

---

## 2. Proposed shell

Reuse StudioLayout as the canonical Fabricator shell. Do not introduce a second FabricatorWorkflow tree.

```
TOP APP BAR
  ALMONA mark | ActiveProjectHeader | search | alerts | user

WORKFLOW BAR
  Project → Measure → Design → Quote → BOM → Stock → Optimize → Production → QC → Delivery

BODY
  LEFT: UniversalNavSidebar (domain)
  MAIN: Outlet (maximum width, overflow contained)
  [pose design] extra left rail: ProjectPositionNavigator
  [pose design] extra right: EngineeringInspector (or DraftingWorkbench’s existing inspector)

BOTTOM STATUS BAR
  connection | autosave | units | system | machine | manufacturing settings profile
```

Auth: wrap `/fabricator/studio` with existing `ProtectedRoute`. Do not weaken it.

---

## 3. Workflow

Map visual stages onto **existing** `fabricatorRoutes` only.

| Stage | Canonical href |
|---|---|
| Project | `studioProjects()` / `studioProject(id)` |
| Measure | `poseMeasuring(projectId, poseId)` |
| Design | `poseDesign(...)` |
| Quote | `poseCommercial(...)` |
| BOM | `poseBOM(...)` |
| Stock | `studioData('stock')` → existing InventoryDashboard (new **data** subpath, not a pose duplicate) |
| Optimize | `poseOptimization(...)` |
| Production | `poseProduction(...)` |
| QC | `studioProductionQuality()` → existing `/production/quality` |
| Delivery | `studioProductionDelivery()` |

Status comes only from `useWorkflowStore` (`completedSteps`, `measurementData`, `bom`, `quote`, `optimizationResult`, `productionDocuments`) and `WindowUnit.status`. Missing evidence renders **Not recorded**. Never invent completion.

Clicking a stage without `projectId`/`poseId` goes to `studioProjects()`, not a legacy hash.

---

## 4. Responsive behavior

| Viewport | Behavior |
|---|---|
| ≥ 1440 | Left nav + main + inspector/rails visible |
| 1024–1439 | Collapsible left nav; inspector collapsible / drawer |
| Tablet (768–1023) | Canvas first; nav + inspector as drawers (Sheet) |
| Mobile (< 768) | No CAD desktop layout. Show project overview / measure / status / quote / notice: “Design workspace requires a larger display.” |

Reuse `CollapsiblePanel` and `Sheet`. Logical CSS (`ps`/`pe`/`border-s`/`border-e`) for RTL.

---

## 5. Project context

`ActiveProjectHeader` (shared) reads:

- Project code / order
- Position / pose
- Customer
- System pack
- Material (from system pack category if present)
- Status
- Revision (`updatedAt` only — no fake revision number)
- Machine target (only if present on project/optimization metadata)
- Last saved (`updatedAt`)

Empty fields: **Not recorded**.

---

## 6. Design workspace

Wrap `EngineeringBay` / `DraftingWorkbench`. Do **not** rewrite DraftingWorkbench.

- LEFT: `ProjectPositionNavigator` (positions, search, status badges from `WindowUnit.status`)
- CENTER: existing EngineeringBay / DraftingWorkbench canvas
- RIGHT: existing DraftingWorkbench inspector when drafting; `EngineeringInspector` for pose-level properties otherwise

Preserve undo/redo (`DraftingWorkbenchLayout` already wires `draftingEngine.undo/redo`). Preserve pose identity and `fabricatorRoutes.poseDesign`.

---

## 7. Production cockpit

Adapt DoWin’s four-zone pattern to web:

- LEFT: batches / work orders **only if** `massProductionMeta.includedInBatchIds` exists; otherwise “Not recorded”
- CENTER TOP: design / position summary from `currentProject`
- CENTER BOTTOM: physical Cut table from `optimizationResult.cuttingPlan` (`cutId`, profile, length, angle, quantity). No derived lengths.
- RIGHT: batch summary, machine target, stock/QC/export readiness from **existing** documents and optimization presence

---

## 8. Optimization cockpit

Display store `optimizationResult` only. Do not call cutting engines from presentation.

- TOP: pieces, bars, utilization, waste, remnants, unplaced (unplaced is **Not recorded** unless the result object actually contains it)
- AUTHORITY: `AlgorithmSelector` metadata when the result carries algorithm info; otherwise algorithm label from available config and authority **Not recorded** (FP-016 not in scope)
- LEFT: required cuts from `cuttingPlan.cuts`
- RIGHT: stock lengths from `cuttingPlan.stockLength` / remnant fields if present
- BOTTOM: `CutPatternViewer` paints `stockLength`, `cuts[].length`, `totalWaste`, `utilization` — no kerf/trim math

---

## 9. Master data

`DataStudioLayout` becomes a grouped IA shell, existing screens stay:

| Group | Existing routes |
|---|---|
| System library | `/data`, `/data/profiles`, `/data/tuning`, `/data/patterns` |
| Factory | `/data/stock` (InventoryDashboard), remnants inside that dashboard |
| Commercial | `/data/customers`, pose commercial, `/orders` |
| Integrations | `/data/integrations` — labels only: Native Yilmaz export exists; SAP / Odoo **Not available / planned** |

No fake ERP.

---

## 10. Output / export

One `ProductionOutputDialog` catalog:

| Capability | Availability |
|---|---|
| Cut sheet | Available (`CutSheetGenerator`) |
| BOM | Available when `bom` exists |
| Labels | Available (`LabelGenerator`) |
| Design preview | Available (`ProductionPreviewDialog`) |
| CNC / G-code | Available (`YilmazGCodeGenerator` / ProductionCommand) |
| CSV | Available (`exportCutListToCSV`) |
| MDB | Available (`alm6510MDBExport`) |
| NCW | **Not available / planned** — disabled, cannot export |

Unsupported formats never imply a successful export.

---

## 11. RTL

Same component trees. `dir` from `isRTL(i18n.language)`. Inspector/nav drawers swap `side` (`start`/`end`). Numeric table cells use `tabular-nums` and stay visually stable. Profile/machine codes remain Latin (`dir="ltr"` on code spans).

---

## 12. Accessibility

- Keyboard: existing Ctrl+[ / Ctrl+] panel toggles; workflow bar is a `nav` with `aria-current="step"`
- Icon-only controls have `aria-label`
- Status is text + icon, not color alone
- ESC closes Sheets (Radix)
- Destructive stock/consume requires `StockConfirmDialog`
- Tables use `<table>` / row headers where we introduce new grids

---

## 13. Out of scope (stop conditions)

This work must not:

- Change `ManufacturingSettings`, kerf, cut-length formulas, Cut identity
- Modify FP-024 fixtures or optimizer math
- Revive `FabricatorWorkflow` as a live surface
- Duplicate pose routes
- Claim NCW
- Copy Yilmaz/DoWin trade dress
