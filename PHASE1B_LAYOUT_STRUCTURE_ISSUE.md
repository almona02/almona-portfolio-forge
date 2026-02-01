# Phase 1B Layout Structure Issue

## Current Layout Structure (As Reported by User)

1. UniversalNavSidebar (left navigation - 78px when collapsed)
2. Left Panel (System Configuration - 240px expanded / 48px collapsed)
3. Main Content (flex-1)
4. **Right Panel (Bill of Materials) - MISSING** ❌

## Expected Layout Structure

1. UniversalNavSidebar (left navigation)
2. Left Panel (System Configuration)
3. Main Content
4. **Right Panel (Bill of Materials)** - Should be visible

## Code Status

- ✅ `rightPanelContent` is defined in "No Project Data" state (EngineeringBay.tsx line 1294-1300)
- ✅ FileText icon is imported
- ✅ rightPanelTitle is set to "Bill of Materials"
- ✅ rightPanelIcon is set to FileText
- ✅ FabricatorWorkspaceLayout should render it when `rightPanelContent` exists

## Possible Issues

1. **Viewport Width**: Screen might be too narrow, pushing right panel off-screen
   - UniversalNavSidebar: 78px (collapsed)
   - Left Panel: 240px (expanded) or 48px (collapsed)
   - Main Content: flex-1
   - Right Panel: 320px (expanded) or 48px (collapsed)
   - Total minimum width needed: ~700px (when all panels expanded)

2. **Panel Collapsed State**: Right panel might be collapsed and not visible
   - Check localStorage: `almona_fabricator_ui_preferences`
   - Look for: `panelStates.fabrication.rightCollapsed: true`
   - If collapsed, panel should still be visible at 48px width

3. **CSS/Hidden**: Panel might be rendered but hidden by CSS
   - Check browser DevTools for `display: none` or `visibility: hidden`
   - Check z-index conflicts

4. **Conditional Rendering**: Check if `rightPanelContent` is actually truthy when rendered

## Debugging Steps

1. **Check if panel exists in DOM:**
   ```javascript
   // In browser console
   document.querySelectorAll('[title*="Bill of Materials"], [aria-label*="Bill of Materials"]')
   ```

2. **Check panel state in localStorage:**
   ```javascript
   JSON.parse(localStorage.getItem('almona_fabricator_ui_preferences')).panelStates.fabrication
   ```

3. **Check viewport width:**
   ```javascript
   window.innerWidth
   ```

4. **Check if rightPanelContent is truthy:**
   - Add console.log in EngineeringBay.tsx to verify rightPanelContent is defined

## Next Steps

- Verify rightPanelContent is actually being passed to FabricatorWorkspaceLayout
- Check viewport width constraints
- Verify panel collapsed state
- Test with wider browser window
- Check for CSS issues hiding the panel
