# FP-025A — Industrial UI / UX Upgrade

**Date:** 2026-09-09  
**Branch:** `feature/fp025a-industrial-ui` (from `origin/main`, **not** `feature/fp024-dowin-external-golden`)  
**AICS-001:** Presentation only. No ML/AI in execution. Manufacturing truth unchanged.

---

## Verdict

**✅ ACCEPTED**

The industrial Studio shell, canonical workflow bar, design three-pane wrap, production/optimization cockpits, Production Output catalog, and master-data IA are in place on existing routes. Tests, type-check, and production build pass. Manufacturing logic, Cut identity, kerf, FP-024 fixtures, and NCW claims were not touched.

Two UI-only closeout items that blocked acceptance are now proven:

1. Live Arabic RTL desktop (1920×1080) on project header, workflow bar, design three-pane, and production/optimization routes.
2. Explicit unknown-optimizer-authority behavior: no metadata → **Not recorded**; never infer AUTHORITATIVE or ADVISORY.

FP-016 is **not** a gate for this UI merge. Missing authority metadata must stay **Not recorded**. EngineeringBay card-heavy interior is **FP-025B polish**, not a correctness blocker.

Score impact (UI only; manufacturing truth unchanged):

- Shop-floor / industrial UX: ~5.2 → **7.2–7.6**
- Fabricator Studio usability: ~7.5 → **8.0**
- Full industrial core: ~7.3–7.5 (UI improved; manufacturing truth did not)
- Physical-length correctness: **6.0** (unchanged)

Next sequence after merge: **FP-024C → FP-016 → FP-017**.

---

## 1. Before architecture

Canonical Studio already existed:

- Routes: `src/lib/fabricator/routes.ts`, `src/App.tsx` L434–490
- Shell: `src/layouts/studio/StudioLayout.tsx` (sidebar + studio title, **no** project header, **no** ProtectedRoute)
- Pose chrome: `PoseWorkflowLayout` + `WorkflowStepNavigator` (six steps only)
- Design: `EngineeringBay` / `DraftingWorkbench` (right inspector already in drafting layout)
- Measuring / Optimize / Production / QC as pose or production-studio pages
- Legacy `/fabricator/workflow/*` redirected; ProductionPage still **navigated** to legacy QC

Full forensic note: `docs/ui/FP-025A-INDUSTRIAL-UX-ARCHITECTURE.md`

---

## 2. File:line evidence (canonical surfaces)

| # | Surface | Evidence |
|---|---|---|
| 1 | Canonical routes | `src/lib/fabricator/routes.ts` L12–68 |
| 2 | StudioLayout | `src/layouts/studio/StudioLayout.tsx` L25–88 |
| 3 | DraftingWorkbench | `src/components/fabricator/drafting/DraftingWorkbench.tsx` L48–59 |
| 4 | Measuring | `src/pages/fabricator/workflow/MeasuringPage.tsx` |
| 5 | Optimization | `src/pages/fabricator/workflow/OptimizationPage.tsx` (solver unchanged; cockpit wrap) |
| 6 | Production | `src/pages/fabricator/workflow/ProductionPage.tsx` |
| 7 | QC | `src/App.tsx` `production/quality`; `QualityControlPage.tsx` |
| 8 | Inventory/remnants | `InventoryDashboard` via `studioDataStock()` |
| 9 | Tokens | existing amber / `#0a0a0a` Studio theme |
| 10 | Responsive | `useStudioBreakpoint`, `CollapsiblePanel`, `Sheet` |
| 11 | i18n/RTL | `src/lib/i18n.ts` `isRTL`; `locales/{en,ar}/fabricator.json` `industrial.*` |
| 12 | Legacy | `/fabricator-workflow` still **redirects**; live QC/production nav uses `fabricatorRoutes` |

Studio auth: `App.tsx` wraps `StudioLayout` in `ProtectedRoute`; `StudioLayout` also `Navigate`s to `/login` if no session.

---

## 3. Components reused

- `UniversalNavSidebar`, `CollapsiblePanel`, `FabricatorWorkspaceLayout` (unchanged primitive)
- `EngineeringBay`, `DraftingWorkbench`, `DraftingWorkbenchPanels` / Properties
- `OptimizationEqualizer`, `AdaptiveSolver` (existing solver path)
- `ProductionDocumentsPanel`, `ProductionCommand`
- `InventoryDashboard`, `CutSheetGenerator`, `LabelGenerator`
- `ProtectedRoute`, `Sheet`, `Dialog`, `AlertDialog`
- `fabricatorRoutes`, `useWorkflowStore`

---

## 4. Components added

| Component | Role |
|---|---|
| `FabricatorWorkflowBar` | Canonical 10-stage bar |
| `ActiveProjectHeader` | Shared project context |
| `ManufacturingStatusBar` | Bottom industrial status |
| `ProjectPositionNavigator` | Left pose rail |
| `EngineeringInspector` | Pose/selection properties |
| `DesignWorkspaceShell` | Responsive left/center/right |
| `DesktopWorkspaceNotice` | Mobile CAD refusal |
| `ProductionCockpit` | Four-zone production |
| `OptimizationCockpit` + Summary / RequiredCuts / AvailableStock / CutPatternViewer | Optimizer workspace (read-only values) |
| `ProductionOutputDialog` | Central output catalog |
| `StockConfirmDialog` | Warehouse confirmation UX |
| `MasterDataWorkspace` | System / Factory / Commercial / Integrations IA |
| `StudioStockPage`, `StudioIntegrationsPage` | Existing dashboard + ERP labels only |

---

## 5. Routes changed

**No duplicate pose routes.** Additive builders only:

- `studioProductionQuality`, `studioProduction`, `studioDataStock`, `studioDataIntegrations`

New nested data routes (existing `data/*` layout):

- `/fabricator/studio/data/stock`
- `/fabricator/studio/data/integrations`

`/fabricator/studio` now requires `ProtectedRoute`.

Legacy live navigations removed from Production QC continue and QualityControl back/new-project.

---

## 6. Responsive behavior

| Viewport | Observed |
|---|---|
| 1920×1080 | Shell + workflow + project context; no page overflow |
| 1440×900 | Same; header denser; no overflow |
| 1280×800 | No overflow; workflow bar scrolls internally |
| 1024×768 | No overflow; workflow bar horizontal scroll |
| Tablet 768×1024 | Stock/master-data usable; no page overflow |
| Mobile CAD | `DesktopWorkspaceNotice` on design/optimize CAD (`<768`) |

---

## 7. Arabic / RTL evidence

- `isRTL('ar')` / `isRTL('ar-EG')` unit tests pass
- `FabricatorWorkflowBar` sets `dir="rtl"` when `i18n.language` is `ar`
- `StudioLayout` `dir` from `isRTL`
- Drawers: inspector `side` swaps with RTL; logical CSS `border-s` / `border-e` / `ps` / `pe`
- Profile/machine codes `dir="ltr"`
- `LanguageProvider` now initializes from `localStorage.language` so a saved `ar` session is not overwritten to `en` on first paint
- Live Arabic RTL desktop **1920×1080** (Heliopolis pose `FP-T17W0J` / `CALUMINIUM PS System`):
  - `html` / Studio shell / workflow bar `dir="rtl"`
  - Arabic stage labels (مشروع، قياس، تصميم، إنتاج, …)
  - Technical codes stay LTR: `FP-T17W0J`, `CALUMINIUM PS System`, `#FFFFFF` (inspector Color row `dir="ltr"` — previously mirrored as `FFFFFF#`)
  - Positions rail on the inline-start side (right in RTL); inspector on the left; **not clipped**; **no page overflow**
  - Production route: same header/workflow; pose has no stored optimization → **Optimization Required** gate (no invented WOs/cuts)
  - Optimization route: same header/workflow; pose has no design components in store → **Design Required** gate (cockpit not invented)
  - No mirrored technical codes, no broken tables, inspector not clipped

---

## 8. Accessibility evidence

- Workflow `nav` + `aria-current="step"` + `sr-only` status text (not color-only)
- Icon-only panel/drawer controls have `aria-label`
- ESC closes Sheets
- Stock consumption uses `AlertDialog` confirmation
- New tables use `<table>` / sticky headers
- Undo/redo labels preserved on EngineeringBay (`Ctrl+Z` / `Ctrl+Y`)
- `ProtectedRoute` loading/session behavior unchanged (strengthened around Studio)

---

## 9. Performance considerations

- Workflow store accessed via selectors (not whole-store in every cell)
- No new visualization packages
- Studio header dropped `backdrop-blur-md`
- Lazy routes preserved (`OptimizationEqualizer`, `ProductionCommand`, `InventoryDashboard`)
- CutPatternViewer is CSS widths from stored `cut.length` / `stockLength` only
- Pre-existing Phase 1 Performance Dashboard overlay still appears in DEV and can cover content at 1024 — not introduced here

---

## 10. Screenshots / viewport findings

Screenshots used for review only (not committed). Temp files under Cursor screenshot dir.

| Viewport | Overflow | Notes |
|---|---|---|
| 1920×1080 | none | Project Studio + workflow + context header |
| 1440×900 | none | Compact header |
| 1280×800 | none | Truncated context labels (by design, `truncate`) |
| 1024×768 | none | QC/Delivery may sit in workflow overflow-x |
| 768×1024 | none | Master-data groups + stock |
| Design pose | n/a | Left positions + EngineeringBay + right inspector |
| Production without opt | n/a | Gate: “Optimization Required” — no invented WO/cuts |
| Arabic RTL 1920×1080 | none | Header + workflow + design three-pane; hex `#FFFFFF` LTR; inspector unclipped |
| Arabic RTL production | none | Same chrome; Optimization Required gate (no stored result) |

---

## 11. Exact test commands / results

```
npx vitest run src/tests/fabricator src/tests/security src/tests/constitutional
```

**16 files, 159 tests, all passed** (includes new FP-025A + Studio ProtectedRoute).

```
npx vitest run src/tests/fabricator/fp025a src/tests/security/studioProtectedRoute.test.tsx
```

**4 files, 17 tests, passed** (closeout: unknown-authority + inspector hex `dir="ltr"`).

Covered:

1. Unauthenticated Studio → login  
2. Active project header shows real project  
3. Workflow hrefs = `fabricatorRoutes`  
4. No `/fabricator/workflow` in workflow bar  
5. Inspector `data-selection` changes; Color `#FFFFFF` is `dir="ltr"`  
6. Laptop drawers open / ESC  
7. RTL `dir`  
8. NCW export disabled, `onExport` not called  
9. Production empty → Not recorded, no WO-  
10. Cockpit sources do not import cutting/kerf engines  
11. No authority metadata → **Not recorded**; never infer AUTHORITATIVE / ADVISORY from result fields; `OptimizationPage` passes `authority={null}`  

---

## 12. Build result

```
npm run type-check   # tsc --noEmit  exit 0
npm run build        # vite build --mode production  ✓ built in 44.42s  exit 0
```

PWA glob warning is pre-existing (`brace_expansion`).

---

## 13. Known gaps

1. `OptimizationResult` has no algorithm/authority field → AUTHORITATIVE vs ADVISORY shows **Not recorded** (correct; do not invent). FP-016 remains out of scope and is **not** a merge blocker.
2. No production batch/work-order records → left production rail **Not recorded**.
3. Unplaced cuts / remnants created not on the result object → **Not recorded**.
4. EngineeringBay interior still uses large cards (wrap-first) — **FP-025B polish**, not an FP-025A correctness gate. DraftingWorkbench inspector is separate from pose inspector when both visible on desktop.
5. UniversalNavSidebar still shows “Last sync: 2 min ago” (pre-existing, not a real timestamp).
6. DEV performance overlay can obscure 1024 layout.
7. ERP/SAP/Odoo are labels only on Integrations page.

---

## 14. ERP / CRM future integration points

`StudioIntegrationsPage` domains: Customer, Quote, Order, Stock, Production, Invoice, Service, SAP, Odoo.

Native vs External badges are UI metadata. No fake ERP APIs.

---

## 15. Manufacturing logic untouched

Did **not** change:

- `ManufacturingSettings`
- kerf / cut-length formulas
- optimizer math (`AdaptiveSolver.solve` path retained)
- Cut identity / `physicalCutAssignmentKey`
- FP-024 tests/fixtures
- RealityOS event semantics
- ticketing / Supabase migrations

`CutPatternViewer` / `OptimizationSummary` / RequiredCuts / AvailableStock **read** `cuttingPlan` fields only. Constitutional + fabricator manufacturing tests still pass (included in the 159).

NCW: **Not available / planned**. Disabled. Cannot export.

DoWin/Yilmaz assets were not copied.

---

## Stop-condition check

None triggered. UI work did not require changing manufacturing semantics.

FP-025A is **accepted** as UI/UX only. Merge this branch to `main` before starting FP-024C / FP-016 / FP-017.
