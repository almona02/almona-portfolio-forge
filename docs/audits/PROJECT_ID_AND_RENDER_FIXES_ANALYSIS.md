# Project ID Constraint Error & Re-render Optimization Analysis

## Issue 1: project_id Constraint Error

### Problem
The `fabricator_positions` table requires `project_id UUID NOT NULL REFERENCES public.fabricator_projects(id)`, but `ProjectPersistenceService.saveProjectPose()` doesn't include `project_id` in the `positionData` object when inserting/updating positions.

**Error**: `null value in column "project_id" of relation "fabricator_positions" violates not-null constraint`

### Root Cause
Looking at `migrations/009_fabricator_projects_and_team.sql`:
- `fabricator_positions.project_id` is defined as `UUID NOT NULL REFERENCES public.fabricator_projects(id)`
- The service only uses `project_code` to find existing positions
- It never looks up or creates the project record to get the `project_id` UUID

### Comparison with jobsStore.ts
The `jobsStore.ts` file shows the correct pattern (lines 61-171):
1. Finds or creates project in `fabricator_projects` table using `project_code`
2. Gets the `project.id` UUID from the project record
3. Includes `project_id: project.id` in the position payload

### Solution
`ProjectPersistenceService.saveProjectPose()` needs to:
1. Find or create the project record in `fabricator_projects` table (using `project_code`)
2. Get the `project_id` UUID from the project record
3. Include `project_id` in the `positionData` object before insert/update

### Implementation
- Query `fabricator_projects` by `project_code` and `owner_user_id`
- If exists, use the `id`
- If not exists, insert new project and get the `id`
- Add `project_id: projectId` to `positionData` object

---

## Issue 2: FabricatorWorkspaceLayout Re-render Issue

### Problem
Excessive re-renders of `FabricatorWorkspaceLayout` component causing:
- Performance degradation
- Console spam with `[FabricatorWorkspaceLayout] rightPanelContent:` logs
- Potential unnecessary re-computations

### Root Causes

1. **Debug Console.log** (Line 58 in `FabricatorWorkspaceLayout.tsx`):
   - Logs on every render: `console.log('[FabricatorWorkspaceLayout] rightPanelContent:', !!rightPanelContent, typeof rightPanelContent);`
   - Should be removed (was for debugging)

2. **Non-memoized rightPanelContent** (EngineeringBay.tsx line 1656-1672):
   - `rightPanelContent` is created inline as JSX: `rightPanelContent={liveProject ? (<BOMSidebar ... />) : null}`
   - This creates a new React element on every render
   - React sees it as a "new" prop, causing re-renders

3. **Component Not Memoized**:
   - `FabricatorWorkspaceLayout` is not wrapped with `React.memo()`
   - Any parent re-render causes this component to re-render
   - Even if props haven't changed

### Solution

1. **Remove debug console.log**:
   - Remove line 58 from `FabricatorWorkspaceLayout.tsx`

2. **Memoize rightPanelContent in EngineeringBay**:
   - Use `useMemo` to memoize the `rightPanelContent` JSX
   - Dependencies: `liveProject`, `bomData`, `profiles`, `currentUserId`, `isBOMCollapsed`, etc.

3. **Memoize FabricatorWorkspaceLayout component**:
   - Wrap with `React.memo()` to prevent unnecessary re-renders
   - Only re-render when props actually change

4. **Also check DraftingWorkbench**:
   - `propertiesPanelContent` is already memoized (line 845)
   - But check if `rightPanelContent` prop is stable

### Files to Modify

1. `src/lib/fabricator/ProjectPersistenceService.ts`:
   - Add project lookup/creation logic before position insert/update
   - Include `project_id` in `positionData`

2. `src/components/fabricator/layout/FabricatorWorkspaceLayout.tsx`:
   - Remove console.log on line 58
   - Wrap component with `React.memo()`

3. `src/components/fabricator/EngineeringBay.tsx`:
   - Memoize `rightPanelContent` with `useMemo`
   - Dependencies: `liveProject`, `bomData`, `profiles`, `currentUserId`, `isBOMCollapsed`, setter functions
