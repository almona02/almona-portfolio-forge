# Phase 1B Quick Test Guide

**Quick Start Testing for Phase 1B EngineeringBay Integration**

---

## 🚀 Quick Test (5 minutes)

### 1. Navigate to Engineering Bay
```
URL: http://localhost:3000/fabricator/workflow/engineering-bay
```

### 2. Verify Layout (30 seconds)
- [x] Left panel visible (System Configuration or "No project loaded")
- [x] Right panel visible (Bill of Materials or "No project loaded")
- [ ] Main content area visible (SmartDrawCanvas OR "No Project Data" message)
- [ ] Layout structure visible even without project (Phase 1B fix)
- [ ] No console errors

### 3. Test Panel Collapse (1 minute)
- [ ] Click left panel collapse button → Panel collapses
- [ ] Click again → Panel expands
- [ ] Click right panel collapse button → Panel collapses
- [ ] Click again → Panel expands
- [ ] Animations are smooth

### 4. Test Core Functionality (2 minutes)
- [ ] Click System Pack selector → Changes apply
- [ ] Click Pattern selector → Grid updates
- [ ] Modify grid in SmartDrawCanvas → BOM updates
- [ ] Click ThemeToggle → Theme switches
- [ ] Check QuickAccessToolbar appears on mouse move

### 5. Verify Persistence (1 minute)
- [ ] Collapse left panel
- [ ] Refresh page (F5)
- [ ] Panel state restored (stays collapsed)

---

## ✅ Quick Pass Criteria

If all 5 steps work, integration is **PASSING** ✅

For detailed testing, see: `PHASE1B_TESTING_CHECKLIST.md`

---

## 🐛 Quick Issues Checklist

### Common Issues & Quick Fixes

**Issue:** Right panel disappears when collapsed
- **Fix:** Enhanced collapsed panel visibility - panel stays visible at 48px width with clickable icon
- **Note:** Collapsed panel shows icon only - click it to expand
- **Keyboard shortcut:** Ctrl+] to toggle right panel

**Issue:** Page shows "No Project Data" message
- **Note:** This is expected if no project exists
- **Fix (Phase 1B):** Layout is now visible even without project - panels and layout structure should be testable
- **To test with project:** Create a project via measurement workflow first, or use existing project ID in URL

**Issue:** Page reloads after 2-3 seconds
- Check: Browser console for errors
- Check: Network tab for failed requests
- Check: React error boundaries
- Verify: No infinite useEffect loops
- **Note:** This might be unrelated to Phase 1B layout changes

**Issue:** Panels don't collapse/expand
- Check: Browser console for errors
- Verify: FabricatorUIStore is working
- Check: localStorage has `almona_fabricator_ui_preferences`

**Issue:** BOM not updating (only when project exists)
- Check: bomData is being generated
- Verify: BOMSidebar component is receiving props
- Check: Console for errors in BOM calculation

**Issue:** Layout looks broken
- Check: CSS is loading (`fabricator-themes.css`)
- Verify: No CSS conflicts
- Check: Browser DevTools for layout issues

**Issue:** Theme toggle not working
- Check: ThemeToggle component is imported
- Verify: data-theme attribute on `<html>` element
- Check: CSS variables are defined

---

## 📊 Test Results Template

```
Date: __________
Status: [ ] PASS [ ] FAIL [ ] PARTIAL

Quick Test Results:
1. Layout: [ ] Pass [ ] Fail
2. Panel Collapse: [ ] Pass [ ] Fail
3. Core Functionality: [ ] Pass [ ] Fail
4. Persistence: [ ] Pass [ ] Fail

Issues Found:
________________________________

Next Steps:
[ ] Run full test suite
[ ] Fix issues
[ ] Ready for production
```
