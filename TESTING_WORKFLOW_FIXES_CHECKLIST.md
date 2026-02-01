# Engineering Bay Workflow Testing Checklist

**Date:** Based on recent fixes  
**Scope:** Testing fixes for Engineering Bay, Pattern Selector, BOM Panel, and Dimensions Dialog

## ✅ Fixed Issues to Test

### 1. Right Panel Visibility
**Issue:** Right panel (BOM Sidebar) was disappearing after ~1 second  
**Fix:** Changed condition from `bomData ? <BOMSidebar /> : null` to `liveProject ? <BOMSidebar /> : null` and added placeholder when bomData is null

**Test Steps:**
1. Navigate to Engineering Bay with a project loaded
2. **Expected:** Right panel (Bill of Materials) should remain visible consistently
3. **Expected:** If bomData is temporarily null, should show "Generating components..." placeholder
4. **Expected:** Panel should not disappear after 1 second

**Pass Criteria:** ✅ Right panel stays visible, shows content or placeholder

---

### 2. Egyptian Pattern Selector Dialog
**Issue:** Pattern selector was constrained in left panel (240px width), making it hard to use  
**Fix:** Moved pattern selector to a modal dialog (max-w-5xl = 1280px width)

**Test Steps:**
1. Navigate to Engineering Bay
2. In left panel (System Configuration), click "Choose Pattern" button
3. **Expected:** Dialog opens with adequate width (should be much wider than before)
4. **Expected:** Dialog shows "Egyptian Window Patterns" title
5. **Expected:** Pattern grid/cards should have enough space to display properly
6. Select a pattern
7. **Expected:** Dialog closes automatically after selection
8. Click "Choose Pattern" again, then click outside dialog or press Escape
9. **Expected:** Dialog closes

**Pass Criteria:** ✅ Dialog opens wide enough, patterns are clearly visible, dialog closes properly

---

### 3. Navigation - Clickable Engineering Bay Title
**Issue:** No clear way to navigate back from title area  
**Fix:** Made "Engineering Bay" title clickable, links to `/fabricator`

**Test Steps:**
1. Navigate to Engineering Bay
2. Hover over "Engineering Bay" title in header (center)
3. **Expected:** Cursor changes to pointer, hover effect visible
4. Click "Engineering Bay" title
5. **Expected:** Navigates to `/fabricator` page
6. Verify breadcrumbs also work (Home → Fabricator → Engineering Bay)

**Pass Criteria:** ✅ Title is clickable, navigates correctly, hover effect works

---

### 4. Window Type / Glazing Type Defaults
**Issue:** Validation errors "Window type is required" and "Glazing type is required" appearing  
**Fix:** Changed default windowType from `'sliding_window'` to `'sliding_window_2sash'` (matches SelectItem values) and ensured glazingType has fallback

**Test Steps:**
1. Navigate to measurement workflow (`/fabricator-workflow?new=true`)
2. On dimensions step, check Window Type dropdown
3. **Expected:** Should default to "2 Sash" (sliding_window_2sash)
4. **Expected:** No validation error for window type
5. Navigate to Glass & Specs step (Step 3)
6. Check Glazing Type dropdown
7. **Expected:** Should have a default value selected (likely "Double")
8. **Expected:** No validation error for glazing type
9. Try to proceed to next step
10. **Expected:** Should proceed without validation errors

**Pass Criteria:** ✅ Defaults are set correctly, no validation errors on load, can proceed through workflow

---

## 🔍 Additional Workflow Testing

### Full Engineering Bay Workflow

1. **Start from Home**
   - Navigate to `/fabricator-workflow?new=true`
   - Complete measurement steps
   - Should navigate to Engineering Bay after measurement

2. **Engineering Bay Layout**
   - Verify left panel (System Configuration) is visible
   - Verify right panel (Bill of Materials) is visible
   - Verify main canvas area is visible
   - Verify header with breadcrumbs and action buttons

3. **System Configuration Panel**
   - Click "Choose Pattern" → Verify dialog opens (wide)
   - Select a system pack → Verify patterns filter
   - Verify "Suggest AI Layout" button works
   - Verify panel can collapse/expand

4. **BOM Sidebar (Right Panel)**
   - Verify BOM data displays when project has components
   - Verify placeholder shows when components are generating
   - Verify panel can collapse/expand
   - Verify cost calculator displays correctly

5. **Header Navigation**
   - Click "Engineering Bay" title → Should navigate to `/fabricator`
   - Click breadcrumb "Fabricator" → Should navigate to `/fabricator`
   - Click breadcrumb "Home" → Should navigate to `/`
   - Verify all action buttons are visible and functional

6. **Dimensions Dialog**
   - Click "Dimensions" button in header
   - Verify dialog opens
   - Verify quick size buttons work
   - Verify can enter custom dimensions
   - Click "Cancel" → Dialog should close
   - Press Escape → Dialog should close

---

## 🐛 Known Issues / Edge Cases to Verify

1. **Empty Project State**
   - Navigate to Engineering Bay without a project
   - **Expected:** Should show "No Project Data" message
   - **Expected:** Should show "Go to Measurement" button if available

2. **Pattern Selection Without System Pack**
   - Open pattern selector without selecting system pack first
   - **Expected:** Should show message "Please select a system pack first"

3. **Panel Collapse States**
   - Collapse left panel → Verify main content adjusts
   - Collapse right panel → Verify main content adjusts
   - Collapse both panels → Verify main content uses full width

4. **Responsive Behavior**
   - Resize browser window to mobile size
   - Verify header buttons adapt (text may hide, icons remain)
   - Verify panels remain functional
   - Verify dialog is responsive

---

## 📝 Test Results Template

```
### Test Session: [Date/Time]

**Environment:**
- Browser: [Chrome/Firefox/Safari/Edge]
- Screen Size: [Desktop/Tablet/Mobile]
- URL: http://localhost:3000/fabricator/workflow/engineering-bay

**Results:**

1. Right Panel Visibility: ✅ Pass / ❌ Fail
   - Notes: [Any observations]

2. Pattern Selector Dialog: ✅ Pass / ❌ Fail
   - Notes: [Dialog width, pattern visibility, interactions]

3. Navigation (Title Clickable): ✅ Pass / ❌ Fail
   - Notes: [Navigation behavior]

4. Window/Glazing Type Defaults: ✅ Pass / ❌ Fail
   - Notes: [Default values, validation errors]

5. Full Workflow: ✅ Pass / ❌ Fail
   - Notes: [End-to-end flow observations]

**Issues Found:**
- [List any new issues discovered]

**Recommendations:**
- [Any suggestions for improvements]
```

---

## 🚀 Quick Test Commands

```bash
# Start dev server (if not running)
npm run dev

# Navigate to Engineering Bay
http://localhost:3000/fabricator/workflow/engineering-bay

# Navigate to New Measurement Workflow
http://localhost:3000/fabricator-workflow?new=true

# Navigate to Drafting Mode
http://localhost:3000/fabricator/workflow/engineering-bay?mode=drafting
```

---

## ✅ Success Criteria Summary

- [x] Right panel stays visible (no disappearing after 1s)
- [x] Pattern selector opens in wide dialog (not constrained)
- [x] Engineering Bay title is clickable for navigation
- [x] Window type defaults to valid option (no validation errors)
- [x] Glazing type defaults to valid option (no validation errors)
- [x] All dialogs can be closed (Cancel/Escape/Click outside)
- [x] Workflow can be completed end-to-end without blocking errors

---

**Last Updated:** Based on fixes from current session
