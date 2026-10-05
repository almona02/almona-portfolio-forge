# Robust Right-Click Context Menu — Feasibility Report & Plan Adjustments

**Date:** 2025-02-16  
**Updated:** 2025-02-18 (post-inspection: implementation was more complete than initially assessed)  
**Scope:** Codebase inspection vs. [robust_right-click_context_menu_c1d94f26.plan.md](.cursor/plans/robust_right-click_context_menu_c1d94f26.plan.md)

---

## Executive Summary

**The implementation is substantially complete.** The codebase already has:
- Context-sensitive right-click detection, `DraftingContextMenu`, Size dialog, Define as Frame, Assign System Pack
- `addSashToFrame`, `quickAddTwoSashes`, `addMullionToFrame`, `assignGlazingToSash` in engine
- `duplicateRectangle`, `duplicateMaterialAwareFrame`
- `AddMullionDialog`, `AssignGlazingDialog`
- Sash hit detection (`targetType: 'sash'`, `cellId` in `ContextMenuTarget`)
- `materialWindowGrids`, `materialWindowGlazing` in DraftingState
- `OptimizedCanvasManager` renders grid/mullions

**Change made (2025-02-18):** Added optional `grid?: WindowGrid` to `MaterialAwareRectangle` for per-frame grid colocation (optional alternative to `materialWindowGrids` in state).

---

## 1. Current Implementation Status

### ✅ Phase 1: Context-Sensitive Right-Click Detection — **DONE**

| Requirement | Status | Location |
|-------------|--------|----------|
| `onContextMenu` handler on canvas | ✅ | `DraftingCanvas2D.tsx` L569–590 |
| `e.preventDefault()`, `getSVGPoint`, `findElementAtPoint` | ✅ | Same |
| `contextMenuState: { open, clientX, clientY, target }` | ✅ | L204–209 |
| `findElementAtPoint` returns rectIndex, materialWindowIndex | ✅ | `useCanvasEvents.ts` L221–265 |
| Controlled menu (not Radix ContextMenu) | ✅ | `DraftingContextMenu` uses Radix DropdownMenu in controlled mode |

**Note:** `findElementAtPoint` checks `materialAwareWindows` first, then plain rectangles. Returns `rectIndex` for plain rects, `materialWindowIndex` for material-aware. No sash cell hit detection yet.

---

### ✅ Phase 2: Element-Level Context Menu Content — **PARTIALLY DONE**

| Menu Item | Status | Notes |
|-----------|--------|-------|
| **Size** | ✅ | Wired via `handleSizeClick`, `SizeDialog`, `handleSizeApply` |
| **Define as Frame** | ✅ | Wired via `handleDefineAsFrame` (requires `selectedSystemPackId`) |
| **Assign System Pack...** | ✅ | `AssignSystemPackDialog`, `handleAssignSystemPackSelect` |
| **Properties** | ⚠️ | Present but `onProperties={() => {}}` — no-op |
| **Duplicate** | ❌ | Menu item exists, `onDuplicate` not passed from `DraftingCanvas2D` |
| **Delete** | ✅ | `handleDelete` in `DraftingContextMenu` — selects by rectIndex/materialWindowIndex, then `deleteSelected` |
| **Move to Next** | ✅ | Passed as `onMoveToNext` when provided |
| **Add Mullion** | ❌ | Menu item exists, `onAddMullion` not passed — no handler |
| **Add Sash** | ❌ | Menu item exists, `onAddSash` not passed — no handler |
| **Quick Add 2 Sashes** | ❌ | Menu item exists, `onQuickAddTwoSashes` not passed — no handler |
| **Reset View / Zoom to Fit** | ✅ | Shown when `target === null` |
| **Egyptian Standards** | ⚠️ | Menu item exists, `onEgyptianStandards={() => {}}` — no-op |

---

### ✅ Phase 3: Size Dialog — **DONE**

- `SizeDialog.tsx` exists with width/height inputs, Apply/Cancel, clamping.
- `resizeFrame(rectIndex, widthMm, heightMm)` in `useDraftingEngine` (L451–479).
- `getRectIndexForTarget` maps `materialWindowIndex` → `rectIndex` via id lookup for Size and Assign Pack.

---

### ✅ Phase 4: Define as Frame — **DONE**

- `convertRectangleToMaterialAware(rectIndex, systemPackId)` in `useDraftingEngine` (L421–449).
- Handles both conversion (plain → material-aware) and update (change system pack).
- BOM: `MaterialAwareRectangle` is consumed by `bomBuilder`; no extra wiring needed for basic BOM.

---

### ❌ Phase 5: Add Sash / Quick Add 2 Sashes — **NOT IMPLEMENTED**

**Data model gap:** Drafting state has no per-frame grid. `convertDraftingToWindowGrid` derives grid from `geometry.rectangles` + `EgyptianTemplate`, not from per-frame `materialAwareWindows`.

- `MaterialAwareRectangle` has no `grid` field.
- `DraftingState` has no `materialWindowGrids: Record<string, WindowGrid>`.
- Plan assumes grid per frame; current architecture uses template-driven grid.

**Adjustment:** Introduce `materialWindowGrids?: Record<string, WindowGrid>` in drafting state (or extend `MaterialAwareRectangle` with optional `grid`). `addSashToFrame` / `quickAddTwoSashes` would create/update this. `convertDraftingToWindowGrid` would need to prefer per-frame grid over template when present.

---

### ❌ Phase 5b: Add Mullion — **NOT IMPLEMENTED**

- `ManualMullion` in `fabricator.ts` (L175–181) has `id`, `type`, `level`, `position` — no `widthMm`.
- Plan: extend with optional `widthMm`.
- `WindowGrid.manualMullions` exists and is used by `windowGeometry.ts`, `manualMullionRenderer.ts`, `SmartDrawCanvas`.
- Drafting has no `manualMullions` storage per frame. Grid lives in `WindowUnit` / `SmartDrawCanvas`, not in drafting state.

**Adjustment:** Add `addMullionToFrame(materialWindowId, mullion)` and store mullions in `materialWindowGrids[frameId].manualMullions` (or equivalent). Requires Phase 5 data model first.

---

### ❌ Phase 6: Assign Glazing (Right-Click on Sash) — **NOT IMPLEMENTED**

- No sash cell hit detection in `findElementAtPoint`.
- Plan: extend to return `{ targetType: 'sash', cellId, frameId, materialWindowId }`.
- No `assignGlazingToSash` in engine.
- No per-cell glazing in drafting state.

**Adjustment:** Depends on Phase 5 (grid per frame). Sash cells come from grid; glazing would be stored per cell (e.g. `grid.cells[i].glazingType`, `grid.cells[i].glassColor`).

---

### ❌ Phase 7: System Pack Branding — **NOT IMPLEMENTED**

- Plan: show system pack brand next to "Pose No #" in EngineeringBay.
- Quick check: EngineeringBay header does not show system pack; would need wiring from drafting/project state.

---

### ❌ Phase 8: Move to Next — **PARTIALLY DONE**

- `onMoveToNext` prop exists on `DraftingCanvas2D`, `DraftingWorkbench`.
- Plan: wire from EngineeringBay to save + advance to next pose.
- Needs verification that EngineeringBay implements and passes `onMoveToNext`.

---

### ❌ Phase 9: UI Wiring — **PARTIALLY DONE**

- `DraftingContextMenu` exists and is wired.
- Missing: `onAddMullion`, `onAddSash`, `onQuickAddTwoSashes`, `onDuplicate` from `DraftingCanvas2D`.
- `onProperties`, `onEgyptianStandards` are no-ops.

---

### 3D Preview Gap (Plan Section: 2D → 3D Impact)

- `DraftingPreview3D` uses `DraftingCanvas3D` with `geometry.rectangles` and `selectedSystemPackId` only.
- Does **not** use `materialAwareWindows`, grid, glazing.
- Plan recommendation: add `draftingToWindowUnit`, switch to `Window3DGenerator` when grid/glazing exist.
- **No `draftingToWindowUnit`** exists. `convertDraftingToWindowGrid` produces `WindowGrid`, not `WindowUnit`.

---

## 2. Plan Adjustments

### 2.1 Phase Ordering (Revised)

| Phase | Original | Adjusted | Rationale |
|-------|----------|----------|-----------|
| 1 | Context detection | **DONE** | Remove from implementation backlog |
| 2 | Menu content | **DONE** (except sash/mullion/duplicate) | Mark complete; add wiring for Duplicate |
| 3 | Size | **DONE** | Remove |
| 4 | Define as Frame | **DONE** | Remove |
| 5 | Add Sash / Quick Add 2 Sashes | **BLOCKED** | Requires data model: `materialWindowGrids` or `MaterialAwareRectangle.grid` |
| 5b | Add Mullion | **BLOCKED** | Depends on Phase 5 (grid per frame) |
| 6 | Assign Glazing | **BLOCKED** | Depends on Phase 5 + sash hit detection |
| 7 | System pack branding | **LOW** | Independent; can be done anytime |
| 8 | Move to Next | **VERIFY** | Check EngineeringBay wiring |
| 9 | UI wiring | **IN PROGRESS** | Wire Duplicate, Add Mullion, Add Sash, Quick Add 2 Sashes (stubs until engine ready) |

### 2.2 Data Model Change (Critical)

**Add to `DraftingState` or `MaterialAwareRectangle`:**

```ts
// Option A: Per-frame grids in state
materialWindowGrids?: Record<string, WindowGrid>;

// Option B: Grid on MaterialAwareRectangle
interface MaterialAwareRectangle {
  // ... existing
  grid?: WindowGrid;  // Optional; when present, overrides template-derived grid
}
```

**Recommendation:** Option B (grid on `MaterialAwareRectangle`) keeps data colocated and avoids a separate lookup. `convertDraftingToWindowGrid` would need a signature that accepts `materialAwareWindows` and uses `mw.grid` when present.

### 2.3 Duplicate (Quick Win)

- Add `duplicateRectangle(rectIndex: number)` or `duplicateMaterialAwareWindow(materialWindowIndex: number)` in `useDraftingEngine`.
- Wire `onDuplicate` in `DraftingCanvas2D` to call it.
- No new data model; copy rect/mw with offset (e.g. +20mm x, +20mm y).

### 2.4 ManualMullion.widthMm

- Extend `ManualMullion` in `fabricator.ts` with `widthMm?: number`.
- Update `manualMullionRenderer.ts` to use `mullion.widthMm` when present.

### 2.5 Sash Hit Detection

- Extend `findElementAtPoint` to accept `materialAwareWindows` + `materialWindowGrids` (or `mw.grid`).
- When point is inside a material-aware rect with grid, compute which cell contains the point (using `colWidths`, `rowHeights`).
- Return `{ targetType: 'sash', cellId, frameId, materialWindowId }` instead of rectangle target.

### 2.6 draftingToWindowUnit (3D Bridge)

- Create `draftingToWindowUnit(drafting: DraftingState, template?: EgyptianTemplate): WindowUnit | null`.
- Build from `geometry`, `materialAwareWindows`, per-frame `grid`, per-cell glazing.
- Use in `DraftingPreview3D` when grid/glazing exist; fallback to `DraftingCanvas3D` for plain rects.

---

## 3. Implementation Priority (Revised)

| Priority | Task | Effort | Dependencies |
|----------|------|--------|--------------|
| P0 | Wire `onDuplicate` + implement `duplicateRectangle` | 0.5 day | None |
| P0 | Wire `onAddMullion`, `onAddSash`, `onQuickAddTwoSashes` (stubs that show toast "Coming soon") | 0.25 day | None |
| P1 | Add `grid?: WindowGrid` to `MaterialAwareRectangle` | 0.5 day | None |
| P1 | Implement `addSashToFrame`, `quickAddTwoSashes` | 1 day | P1 |
| P1 | Add Mullion: data model + `addMullionToFrame` + dialog | 1.5 days | P1 |
| P2 | Sash hit detection in `findElementAtPoint` | 0.5 day | P1 |
| P2 | Assign Glazing: `assignGlazingToSash` + per-cell glazing | 1 day | P2 |
| P2 | `draftingToWindowUnit` + switch DraftingPreview3D to Window3DGenerator | 1.5 days | P1 |
| P3 | System pack branding in EngineeringBay | 0.5 day | None |
| P3 | Verify/fix `onMoveToNext` in EngineeringBay | 0.25 day | None |
| P3 | Implement `onProperties`, `onEgyptianStandards` (or remove if not needed) | 0.5 day | None |

---

## 4. Files Summary

### Already Modified/Created (per plan)

| File | Status |
|------|--------|
| `DraftingCanvas2D.tsx` | ✅ Context menu, handlers, Size/Assign dialogs |
| `useCanvasEvents.ts` | ✅ `findElementAtPoint` with rectIndex, materialWindowIndex |
| `useDraftingEngine.ts` | ✅ `convertRectangleToMaterialAware`, `resizeFrame` |
| `DraftingContextMenu.tsx` | ✅ Exists, conditional menu items |
| `SizeDialog.tsx` | ✅ Exists |
| `AssignSystemPackDialog.tsx` | ✅ Exists |

### Still To Create/Modify

| File | Action |
|------|--------|
| `materialAware.ts` or `drafting.ts` | Add `grid?: WindowGrid` to `MaterialAwareRectangle` or `materialWindowGrids` to state |
| `useDraftingEngine.ts` | Add `addSashToFrame`, `quickAddTwoSashes`, `addMullionToFrame`, `assignGlazingToSash`, `duplicateRectangle` |
| `useCanvasEvents.ts` | Extend `findElementAtPoint` for sash cell hit |
| `DraftingCanvas2D.tsx` | Pass `onDuplicate`, `onAddMullion`, `onAddSash`, `onQuickAddTwoSashes` |
| `fabricator.ts` | Extend `ManualMullion` with `widthMm?: number` |
| `manualMullionRenderer.ts` | Use `mullion.widthMm` when present |
| `draftingToWindowUnit.ts` (new) | Convert drafting → WindowUnit |
| `DraftingPreview3D.tsx` | Use Window3DGenerator when grid exists |
| `EngineeringBay.tsx` | System pack branding, `onMoveToNext` |
| `draftingToWindowGrid.ts` | Prefer per-frame grid when present |

---

## 5. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Grid stored in two places (template vs per-frame) | Prefer `mw.grid` when present; template as fallback |
| `convertDraftingToWindowGrid` used in multiple places | Add optional `materialAwareWindows` param; backward compatible |
| 3D preview regression | Fallback to DraftingCanvas3D when no grid; A/B test |
| Delete/select by materialWindowIndex | Already correct: map to rectIndex via id before select/delete |

---

## 6. Conclusion

The plan is **feasible** and a significant portion is **already implemented**. The main gaps are:

1. **Data model:** Per-frame grid (and later per-cell glazing) not yet in drafting state.
2. **Engine:** `addSashToFrame`, `quickAddTwoSashes`, `addMullionToFrame`, `assignGlazingToSash`, `duplicateRectangle` missing.
3. **Wiring:** `onDuplicate`, `onAddMullion`, `onAddSash`, `onQuickAddTwoSashes` not passed to `DraftingContextMenu`.
4. **3D bridge:** No `draftingToWindowUnit`; DraftingPreview3D does not reflect grid/glazing.

Recommended next steps: implement Duplicate (quick win), add `grid` to `MaterialAwareRectangle`, then implement Add Sash / Quick Add 2 Sashes, followed by Add Mullion and Assign Glazing.
