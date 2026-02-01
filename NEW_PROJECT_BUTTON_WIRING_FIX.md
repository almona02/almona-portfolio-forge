# New Project Button Wiring Fix

## Issue Analysis
The "New Project" button in `src/pages/Projects.tsx` was navigating to `/fabricator-workflow?new=true`, but the `FabricatorWorkflow` component was not checking for the `new=true` query parameter to automatically open the project wizard.

## Root Cause
The `FabricatorWorkflow` component had a `useEffect` that checked for `wizard` query parameter (egypt/standard), but it did not check for `new=true` parameter that the button was using.

## Fix Applied
Added a new `useEffect` hook in `src/pages/FabricatorWorkflow.tsx` that:
1. Checks for `new=true` query parameter in the URL
2. Opens the project wizard (`setShowProjectWizard(true)`) when the parameter is present
3. Clears the query parameter from the URL after opening the wizard to keep the URL clean
4. Runs whenever `location.search` changes to handle navigation properly

## Code Changes
**File**: `src/pages/FabricatorWorkflow.tsx`

Added new useEffect (lines ~563-572):
```typescript
// Check for new=true query parameter on mount and location change
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const newProject = params.get('new');
  
  // Check for new=true query parameter to open wizard
  if (newProject === 'true') {
    setShowProjectWizard(true);
    // Clear the query parameter from URL after opening wizard
    const newUrl = window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }
}, [location.search]);
```

## Button Location
**File**: `src/pages/Projects.tsx` (lines 226-233)
- Button navigates to: `/fabricator-workflow?new=true`
- Button class: `btn-bronze`
- Button text: "New Project"

## Wizard Components
The wizard opens either:
1. **EgyptianProjectWizard** - if `useEgyptWizard` is true (default for Egypt region)
2. **NewProjectWizard** - standard wizard for other regions

Both wizards are properly wired and will open when `showProjectWizard` is set to `true`.

## Testing
To verify the fix:
1. Navigate to `/fabricator/projects`
2. Click the "New Project" button
3. Verify that the project wizard opens automatically
4. Verify that the URL is cleaned (no `?new=true` remains after wizard opens)

## Status
✅ **FIXED** - The button now properly opens the project wizard when clicked.

