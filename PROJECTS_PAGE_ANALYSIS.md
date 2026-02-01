# Projects Page Analysis & Fixes

## Current State Analysis

### ✅ Theme Implementation
- **Status**: Mostly themed correctly
- **MasterLayout**: ✅ Using prestige theme
- **Projects.tsx**: ✅ Using prestige colors (`bg-[#0f0f0f]/80`, `border-amber-600/30`, `card-glass-dark`)
- **PositionsGrid.tsx**: ❌ Still using old gray theme (`bg-gray-900/70`, `border-gray-700`)

### ✅ Data Source & Wiring
- **Data Store**: `useJobsStore` from `@/store/jobsStore`
- **Database**: Supabase (`fabricator_projects` and `fabricator_positions` tables)
- **Loading**: `loadJobs()` function loads data on mount
- **Data Flow**: 
  - Projects page → `useJobsStore` → Supabase → `jobs` array
  - Projects summary calculated from `jobs` array
  - PositionsGrid receives `jobs` from store

### ❌ Workflow Navigation Issues

#### Issue 1: Incorrect Route
- **Current**: PositionsGrid navigates to `/fabricator-workflow` (line 308)
- **Expected**: Should navigate to `/fabricator/workflow/engineering-bay/:projectId`
- **Problem**: `/fabricator-workflow` redirects to `/fabricator/workflow/engineering-bay` but doesn't pass project ID

#### Issue 2: Missing Project Click Handlers
- **Current**: Project list items have no click handlers
- **Expected**: Clicking a project should navigate to workflow with that project selected

#### Issue 3: "New Project" Button
- **Current**: Navigates to `/fabricator-workflow?new=true` (line 227)
- **Status**: ✅ This works (redirects correctly)

### 🔧 Required Fixes

1. **Fix PositionsGrid theme** - Replace gray colors with prestige theme
2. **Fix workflow navigation** - Update PositionsGrid to use correct route with project ID
3. **Add project click handlers** - Make project rows clickable to navigate to workflow
4. **Update route** - Ensure `/fabricator-workflow` properly handles project IDs

