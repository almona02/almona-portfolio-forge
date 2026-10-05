# Phase 1B Right Panel Visibility Fix

## Issue Summary

**Problem:** Right panel in EngineeringBay "No Project Data" state is not visible, and disappears when collapsed.

## Current Status

The right panel content is properly defined in the "No Project Data" state (lines 1294-1300 in EngineeringBay.tsx), with:
- `rightPanelContent` containing a div with "Bill of Materials - No project loaded" message
- `rightPanelIcon` set to FileText icon
- `rightPanelTitle` set to "Bill of Materials"

## Expected Behavior

1. Right panel should be visible when no project is loaded
2. Right panel should collapse to 48px width (icon only) when minimized
3. Collapsed panel should remain visible and clickable to expand

## Debugging Steps

1. Check browser console for errors
2. Check if panel is collapsed in localStorage: `almona_fabricator_ui_preferences`
3. Verify panel state in Zustand store
4. Check if panel is being cut off by viewport width
5. Verify z-index and positioning

## Potential Issues

1. **Panel collapsed state persisted** - If panel was collapsed before, it might be in collapsed state (48px width)
2. **Viewport width** - Screen might be too narrow, pushing panel off-screen
3. **Z-index/Overlay** - UniversalNavSidebar or QuickAccessToolbar might be overlaying
4. **Layout structure** - Missing wrapper div or flex issue

## Next Steps

1. Verify panel is rendering in DOM (even if collapsed)
2. Check panel state in browser DevTools
3. Test with panel state reset (clear localStorage)
4. Verify layout structure is correct
