# Workflow Analysis and Fixes

## Issues Identified

### 1. New Project Button Not Opening Wizard
**Problem**: When user clicks "New Project" button, it navigates to `/fabricator-workflow?new=true`, which redirects to `/fabricator/workflow/engineering-bay?new=true`, but no wizard opens.

**Root Cause**: 
- The wizard logic exists in `FabricatorWorkflow.tsx` but that component is no longer used
- The new route structure uses `MasterLayout` → `EngineeringBayWrapper` → `EngineeringBay`
- Neither `MasterLayout` nor `EngineeringBayWrapper` checks for `new=true` query parameter

**Solution**: Add query parameter detection in `EngineeringBayWrapper` or `MasterLayout` to open project wizard when `new=true` is present.

### 2. Drafting Canvas Height Issue
**Problem**: White grid drafting area only takes 40% of screen height, rest is black.

**Root Cause**: 
- Canvas is in nested absolute containers
- Parent containers may not have proper height constraints
- SVG needs to fill available height properly

**Solution**: Ensure parent containers have proper flex/height constraints and SVG fills available space.

## Workflow Analysis

### Current Flow
1. **New Project Entry**
   - User clicks "New Project" button → Navigates to `/fabricator-workflow?new=true`
   - Redirects to `/fabricator/workflow/engineering-bay?new=true`
   - **ISSUE**: Wizard should open but doesn't

2. **New Pose Creation**
   - Should happen after project wizard completes
   - Currently navigates to drafting mode after project creation

3. **Begin with Measurement or Drafting**
   - User can choose measurement (smartdraw) or drafting mode
   - Mode is controlled by `?mode=drafting` query parameter

### Expected Flow
1. User clicks "New Project" → Wizard opens
2. User fills project info → Creates project
3. User is taken to Engineering Bay
4. User can choose measurement or drafting mode
5. User creates new pose within project
6. User works on pose (measurement or drafting)

## Files Modified

1. ✅ `src/App.tsx` - Modified `FabricatorWorkflowRedirect` to render `FabricatorWorkflow` component when `new=true` instead of redirecting
2. ✅ `src/components/fabricator/drafting/DraftingWorkbench.tsx` - Changed TabsContent from absolute positioning to flex layout
3. ✅ `src/components/fabricator/drafting/DraftingCanvas2D.tsx` - Changed canvas container from absolute to flex layout, removed absolute positioning from SVG wrapper

## Fixes Applied

### Fix 1: New Project Wizard
- **Problem**: Wizard wasn't opening when clicking "New Project" button
- **Solution**: Modified `FabricatorWorkflowRedirect` to render `FabricatorWorkflow` component (which has wizard logic) when `new=true` query parameter is present
- **Result**: Wizard now opens properly when user clicks "New Project" button

### Fix 2: Canvas Height
- **Problem**: Drafting canvas only took 40% of screen height
- **Solution**: Changed from absolute positioning to flex layout:
  - Changed `TabsContent` from `absolute inset-0` to `flex-1` with proper flex container
  - Changed canvas wrapper from `absolute inset-0` to `flex-1 w-full h-full`
  - Changed SVG container from `absolute inset-0` to `w-full h-full`
- **Result**: Canvas now fills available height properly
