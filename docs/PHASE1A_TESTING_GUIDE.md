# Phase 1A Foundation Components - Testing Guide

## Quick Start: Accessing the Test Page

### Option 1: Add Test Route (Recommended)

Add this route to `src/App.tsx` in the Routes section:

```tsx
import { FabricatorLayoutTest } from '@/components/fabricator/layout/FabricatorLayoutTest';

// In Routes section (around line 426-431 with other test routes):
<Route path="/test/fabricator-layout" element={
  <Suspense fallback={getLoadingComponent('/test/fabricator-layout')}>
    <FabricatorLayoutTest />
  </Suspense>
} />
```

Then access at: `http://localhost:5173/test/fabricator-layout`

### Option 2: Import Directly (For Quick Testing)

Import `FabricatorLayoutTest` in any existing page temporarily to test.

---

## Testing Checklist

### 1. ✅ Run the Test Page - Verify All Components Work Together

**Actions:**
1. Navigate to the test page URL
2. **Expected Result:**
   - Page loads without errors
   - Header appears at top with breadcrumbs, title, and theme toggle
   - Left panel visible with "Left Panel" heading
   - Right panel visible with "Right Panel" heading
   - Main workspace area shows centered text
   - QuickAccessToolbar appears (bottom-right by default)
   - Cost calculator button appears (top-right, showing EGP 12,450)

**Browser Console Checks:**
- Open DevTools (F12) → Console tab
- ✅ No red errors
- ✅ No React warnings
- ✅ No failed imports

---

### 2. ✅ Test Panel Collapsing - Click Headers, Test Animations

**Left Panel Test:**
1. **Click the left panel header** (shows "Tools" title with chevron)
   - ✅ Panel should collapse smoothly (300ms animation)
   - ✅ Width should reduce to 48px
   - ✅ Icon-only view should appear
   - ✅ Content should fade out

2. **Click the collapsed left panel icon**
   - ✅ Panel should expand smoothly
   - ✅ Width should return to 240px (default)
   - ✅ Content should fade in

3. **Keyboard shortcut: Ctrl+[** (or Cmd+[ on Mac)
   - ✅ Left panel should toggle (collapse/expand)

**Right Panel Test:**
1. **Click the right panel header** (shows "Properties" title with chevron)
   - ✅ Panel should collapse smoothly
   - ✅ Width should reduce to 48px
   - ✅ Icon-only view should appear

2. **Click the collapsed right panel icon**
   - ✅ Panel should expand smoothly
   - ✅ Width should return to 320px (default)

3. **Keyboard shortcut: Ctrl+]** (or Cmd+] on Mac)
   - ✅ Right panel should toggle (collapse/expand)

**State Persistence Test:**
1. Collapse both panels
2. Refresh the page (F5)
3. ✅ Panels should remain in collapsed state (localStorage persistence)
4. ✅ Check browser localStorage: Key `almona_fabricator_ui_preferences` should contain panel states

**Animation Performance:**
- ✅ Smooth transitions (60fps target)
- ✅ No jank or stuttering
- ✅ Content doesn't jump or flash

---

### 3. ✅ Test Theme Toggle - Switch Between Dark/Light

**Theme Toggle Test:**
1. **Locate theme toggle button** in header (top-right, sun/moon icon)
2. **Click the theme toggle**
   - ✅ Theme should switch (dark ↔ light)
   - ✅ Background colors should change
   - ✅ Text colors should adjust for contrast
   - ✅ All components should update consistently

3. **Refresh the page (F5)**
   - ✅ Theme preference should persist (stored in localStorage)
   - ✅ Check localStorage: `almona_fabricator_ui_preferences.theme` should match current theme

**Visual Checks:**
- ✅ Dark mode: Dark backgrounds (#0a0a0a, #1a1a1a)
- ✅ Light mode: Light backgrounds (#ffffff, #f5f5f5)
- ✅ Text remains readable in both modes
- ✅ Accent colors (amber) work in both modes
- ✅ Borders and panels have appropriate contrast

---

### 4. ✅ Test Toolbar - Hover, Pin, Click Buttons

**Toolbar Visibility:**
1. **Move mouse around the page**
   - ✅ Toolbar should appear (bottom-right by default)
   - ✅ Should be semi-transparent (opacity-80) when not hovered

2. **Hover over toolbar**
   - ✅ Should become fully opaque (opacity-100)
   - ✅ Hover effects on buttons should work

**Toolbar Auto-Hide (when not pinned):**
1. **Stop moving mouse for 3 seconds**
   - ✅ Toolbar should fade out/hide (when not pinned)
   - ✅ Moving mouse again should show it

**Pin/Unpin Test:**
1. **Click the pin icon** (small pin/unpin button on toolbar)
   - ✅ Toolbar should become pinned (pin icon changes)
   - ✅ Toolbar should stay visible even without mouse movement
   - ✅ Auto-hide should be disabled when pinned

2. **Click unpin**
   - ✅ Pin icon changes to unpin
   - ✅ Auto-hide should re-enable
   - ✅ Toolbar should hide after 3 seconds of inactivity

**Toolbar Buttons:**
1. **Undo button** (Ctrl+Z)
   - ✅ Should be clickable (may be disabled if no undo available)
   - ✅ Tooltip should show "Undo (Ctrl+Z)"

2. **Redo button** (Ctrl+Y)
   - ✅ Should be clickable
   - ✅ Tooltip should show "Redo (Ctrl+Y)"

3. **Save button** (Ctrl+S)
   - ✅ Should be clickable
   - ✅ Tooltip should show "Save (Ctrl+S)"

4. **Home button** (Ctrl+H)
   - ✅ Should be clickable
   - ✅ Tooltip should show "Home (Ctrl+H)"
   - ✅ Should navigate to home (or log action if not connected to router)

**Toolbar Position:**
- ✅ Default position: bottom-right
- ✅ Should not overlap content
- ✅ Should be accessible on all screen sizes

---

### 5. ✅ Test Cost Calculator - Click to Expand Modal

**Cost Calculator Button:**
1. **Locate cost calculator button** (top-right, fixed position)
   - ✅ Should show currency symbol (EGP) and amount (12,450)
   - ✅ Should have status icon (green checkmark for "normal" status)
   - ✅ Should have amber dollar sign icon

2. **Hover over button**
   - ✅ Should scale slightly (hover:scale-105)
   - ✅ Cursor should change to pointer

**Modal Expansion:**
1. **Click the cost calculator button**
   - ✅ Dialog/modal should open smoothly
   - ✅ Overlay should appear (dark backdrop)
   - ✅ Modal should be centered on screen

2. **Modal Content Verification:**
   - ✅ Title: "Cost Breakdown"
   - ✅ Total Cost displayed prominently (EGP 12,450)
   - ✅ Status message: "Cost within budget parameters." (for normal status)
   - ✅ Status icon matches button (green checkmark)

**Modal Status Colors (if testing with different statuses):**
- ✅ **Normal (success)**: Green background, green text, checkmark icon
- ✅ **Warning**: Amber background, amber text, alert icon
- ✅ **Error**: Red background, red text, X icon

**Modal Close:**
1. **Click X button** (top-right of modal)
   - ✅ Modal should close smoothly
   - ✅ Overlay should fade out

2. **Click outside modal (on overlay)**
   - ✅ Modal should close (if Dialog component supports this)

3. **Press ESC key**
   - ✅ Modal should close (standard Dialog behavior)

---

## Advanced Testing

### State Persistence Across Sessions

1. **Set up state:**
   - Collapse left panel
   - Expand right panel
   - Switch to light theme
   - Pin toolbar

2. **Close browser tab/window**

3. **Reopen and navigate to test page**
   - ✅ All preferences should be restored
   - ✅ Panels in same state
   - ✅ Theme matches previous selection
   - ✅ Toolbar pinned state preserved

### Multiple Section States

1. **Note:** Each section (fabrication, drafting, commercial, etc.) has independent panel states
2. **Test by changing sectionId prop** in `FabricatorLayoutTest.tsx`:
   ```tsx
   <FabricatorSectionProvider sectionId="drafting">
   ```
3. ✅ Panel states should be independent per section
4. ✅ Switching sections should load correct panel states

### Responsive Testing

1. **Resize browser window:**
   - ✅ Layout should adapt to smaller widths
   - ✅ Panels should remain functional
   - ✅ Toolbar should stay accessible
   - ✅ Header should remain readable

2. **Test on different screen sizes:**
   - Desktop (1920x1080)
   - Laptop (1366x768)
   - Tablet (768x1024) - if applicable

---

## Expected Issues / Known Limitations

### Current Implementation Notes:

1. **Cost Calculator Modal:**
   - Uses Dialog component from shadcn/ui
   - Breakdown array is optional (empty by default in test)
   - Status messages are static (can be extended)

2. **Toolbar:**
   - Buttons may not have actual functionality yet (just clickable)
   - Home button navigation needs router integration
   - Undo/Redo state tracking needs integration

3. **Panel Resizing:**
   - Resize handle exists but may not be fully functional yet
   - Width changes are logged but not persisted (unless implemented)

---

## Browser Compatibility

Test in:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (Mac)
- ✅ Mobile browsers (if responsive design needed)

---

## Performance Checks

1. **Open DevTools → Performance tab**
2. **Record interaction** (collapse/expand panels, toggle theme)
3. ✅ Animations should be smooth (60fps)
4. ✅ No layout thrashing
5. ✅ No memory leaks (check Memory tab after multiple interactions)

---

## Next Steps After Testing

Once Phase 1A testing is complete and verified:

1. ✅ **Proceed to Task 8**: Integrate into EngineeringBay.tsx
2. ✅ **Proceed to Task 9**: Integrate into DraftingWorkbench.tsx
3. ✅ **Proceed to Task 10**: Integrate into SmartDrawCanvas.tsx

All foundational components are ready for integration!
