# Phase 1C: DraftingWorkbench Integration Plan

## File Analysis
- **File**: `src/components/fabricator/drafting/DraftingWorkbench.tsx`
- **Lines**: 1313
- **Structure**: Fixed left toolbar (w-16), center tabs, fixed right panel (w-56/w-64)

## Current Structure (Lines 620-1311)

```
return (
  <DraftingErrorBoundary>
    <DraftingContext.Provider>
      <div className="fixed inset-0 h-screen w-screen flex flex-col">
        {/* Header (624-798): Buttons, title, alerts */}
        {/* DraftingMenuBar (811-874): File/Edit/View/Tools menus */}
        {/* Main Content (876-877): flex-1 flex overflow-hidden */}
          {/* Left Panel (879-884): w-16, DraftingToolbar */}
          {/* Center (887-1006): Tabs (2d/3d/validation/templates) */}
          {/* Right Panel (1008-1311): w-56/w-64, Properties/Layers/Blocks tabs */}
      </div>
    </DraftingContext.Provider>
  </DraftingErrorBoundary>
);
```

## Integration Strategy

### Step 1: Add Imports ✅
- FabricatorWorkspaceLayout
- FabricatorSectionProvider
- Additional icons (Settings, FileText, Home, ChevronRight)

### Step 2: Wrap with Provider
- Wrap return with FabricatorSectionProvider (sectionId="drafting")
- Keep DraftingErrorBoundary and DraftingContext.Provider

### Step 3: Create Layout Structure
- Replace main div with FabricatorWorkspaceLayout
- Extract left panel (DraftingToolbar) to leftPanelContent
- Extract right panel (Properties/Layers/Blocks) to rightPanelContent
- Move center tabs to mainContent
- Create custom header from existing header buttons

### Step 4: Extract Left Panel
- Create useMemo for toolsPanelContent
- Move DraftingToolbar component
- Remove w-16 fixed width

### Step 5: Extract Right Panel
- Create useMemo for propertiesPanelContent
- Move Properties/Layers/Blocks tabs
- Include Help/History panels logic
- Remove w-56/w-64 fixed widths

### Step 6: Main Content
- Move tabs structure to mainContent
- Remove left/right panel divs
- Keep all tab content

### Step 7: Header Consolidation
- Create custom header component
- Keep essential buttons (Save, Validate, Optimize)
- Move DraftingMenuBar to QuickAccessToolbar or keep as dropdown
- Add breadcrumbs

### Step 8: QuickAccessToolbar Integration
- Add drafting-specific tools to toolbar
- Export DXF, Export JSON, Load, Toggle Grid, etc.

## Critical Dependencies to Preserve
- DraftingEngine hooks and methods
- Viewport state and controls
- Validation logic
- Template system
- Optimization engine
- Collaborative drafting
- State persistence
- All event handlers

## Execution Order
1. Add imports (DONE)
2. Wrap with Provider
3. Create basic layout structure (test compiles)
4. Extract left panel
5. Extract right panel
6. Update main content
7. Create custom header
8. Update toolbar
9. Remove fixed widths
10. Test compilation
