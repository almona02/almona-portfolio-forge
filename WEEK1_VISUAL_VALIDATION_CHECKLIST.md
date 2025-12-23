# Week 1 Visual Validation Checklist
**Date:** December 23, 2025  
**Validator:** [Your Name]  
**Status:** 🔄 In Progress

---

## 🎯 Pre-Validation Setup

### Step 1: Environment Setup
- [ ] Development server running: `npm run dev`
- [ ] Browser opened to: `http://localhost:3000/fabricator/new`
- [ ] Feature flag enabled: `VITE_ENABLE_OPENING_MECHANISMS=true` (in `.env.local` or terminal)
- [ ] Browser console open (F12) - check for errors
- [ ] Network tab open - verify no failed module loads

### Step 2: Verify Feature Flag
```javascript
// In browser console, run:
console.log('Opening Mechanisms Enabled:', import.meta.env.VITE_ENABLE_OPENING_MECHANISMS);
// Should log: true (or undefined, which defaults to true)
```

---

## 📋 Test Cases

### Test Case 1: Sliding Windows ✅
**Pattern:** Double Horizontal Slide (or any sliding pattern)

**Validation Points:**
- [ ] Bottom track visible (rectangular extrusion along bottom of frame)
- [ ] Top track visible (if pattern specifies `trackType: 'both'`)
- [ ] Tracks extend full width of frame (minus frame profile width)
- [ ] Track positioned correctly (recessed from front of frame)
- [ ] Track color/material visible (different from frame)
- [ ] No console errors
- [ ] 3D preview renders smoothly

**Screenshot:** `week1_sliding_tracks.png`
**Notes:** _________________________________

---

### Test Case 2: Casement Windows ✅
**Pattern:** French Casement (or any casement pattern with 2 sashes)

**Validation Points:**
- [ ] 3 hinges per sash visible (total 6 for 2 sashes)
- [ ] Hinges positioned: top, middle, bottom of each sash
- [ ] Hinges on correct side (matching opening direction)
- [ ] Hinge geometry looks realistic (not just boxes)
- [ ] Hinges positioned at sash edge (not center)
- [ ] No console errors
- [ ] 3D preview renders smoothly

**Screenshot:** `week1_casement_hinges.png`
**Notes:** _________________________________

---

### Test Case 3: Tilt-Turn Windows ✅
**Pattern:** Tilt-Turn (if available)

**Validation Points:**
- [ ] Pivot mechanism visible at bottom corners
- [ ] Tilt hardware indicators visible
- [ ] Turn hardware indicators visible
- [ ] Mechanism positioned correctly
- [ ] Opening direction indicators visible
- [ ] No console errors

**Screenshot:** `week1_tilt_turn.png`
**Notes:** _________________________________

---

### Test Case 4: Awning Windows ✅
**Pattern:** Awning (if available)

**Validation Points:**
- [ ] Hinges at top of frame visible
- [ ] Bottom opening mechanism visible
- [ ] Proper clearances for opening visible
- [ ] Mechanism positioned correctly
- [ ] No console errors

**Screenshot:** `week1_awning.png`
**Notes:** _________________________________

---

### Test Case 5: Feature Flag Toggle ✅

**Test A: Flag Enabled**
- [ ] Set `VITE_ENABLE_OPENING_MECHANISMS=true`
- [ ] Refresh page
- [ ] Mechanisms visible
- [ ] No console errors

**Test B: Flag Disabled**
- [ ] Set `VITE_ENABLE_OPENING_MECHANISMS=false`
- [ ] Refresh page
- [ ] Mechanisms NOT visible
- [ ] 3D preview still renders correctly
- [ ] No console errors

**Test C: Hot Reload**
- [ ] Change flag value while app running
- [ ] Save `.env.local` file
- [ ] Vite should hot reload
- [ ] Mechanisms appear/disappear correctly

**Screenshot (Disabled):** `week1_disabled.png`
**Notes:** _________________________________

---

### Test Case 6: Performance Validation ✅

**Metrics to Check:**
- [ ] Window generation time < 2 seconds
- [ ] Memory usage stable (no leaks when creating multiple windows)
- [ ] Frame rate in 3D preview smooth (60 FPS)
- [ ] No lag when rotating/zooming 3D view
- [ ] Console shows no performance warnings

**Browser DevTools:**
- [ ] Performance tab: Record 10-second session, check for frame drops
- [ ] Memory tab: Take heap snapshot, create 5 windows, take another snapshot, compare

**Notes:** _________________________________

---

### Test Case 7: Error State Testing ✅

**Test A: Pattern Without Opening Mechanism**
- [ ] Select pattern with no `openingMechanism` field
- [ ] Create window unit
- [ ] Should gracefully render without mechanisms
- [ ] No console errors
- [ ] 3D preview renders correctly

**Test B: Invalid Pattern Data**
- [ ] Test with malformed pattern data (if possible)
- [ ] Should not crash application
- [ ] Error logged to console only
- [ ] Application remains functional

**Test C: Large Windows**
- [ ] Create window with 10+ sashes
- [ ] Should still render
- [ ] Performance acceptable (< 5 seconds)
- [ ] No memory errors

**Notes:** _________________________________

---

### Test Case 8: Cross-Validation with 99.8% System ✅

**Critical: Ensure no regressions**
- [ ] Existing window generation still works
- [ ] Cut list generation unchanged
- [ ] Fabrication data accuracy maintained
- [ ] DXF export still functional
- [ ] No breaking changes to existing workflows

**Compare:**
- [ ] Generate same window with flag enabled vs disabled
- [ ] Verify base geometry identical (only mechanisms differ)
- [ ] Verify cut list identical

**Notes:** _________________________________

---

## 📊 Validation Scorecard

### Mechanism Visualization
- Sliding Tracks: [ ] ✅ Pass | [ ] ❌ Fail | [ ] ⚠️ Partial
- Casement Hinges: [ ] ✅ Pass | [ ] ❌ Fail | [ ] ⚠️ Partial
- Tilt-Turn Mechanisms: [ ] ✅ Pass | [ ] ❌ Fail | [ ] ⚠️ Partial
- Awning Mechanisms: [ ] ✅ Pass | [ ] ❌ Fail | [ ] ⚠️ Partial

### Feature Flags
- Enable/Disable Works: [ ] ✅ Pass | [ ] ❌ Fail
- Hot Reload: [ ] ✅ Pass | [ ] ❌ Fail
- No Console Errors: [ ] ✅ Pass | [ ] ❌ Fail

### Performance
- Generation Time <2s: [ ] ✅ Pass | [ ] ❌ Fail
- Memory Stable: [ ] ✅ Pass | [ ] ❌ Fail
- 60 FPS Maintained: [ ] ✅ Pass | [ ] ❌ Fail

### Error Handling
- Missing Mechanism Pattern: [ ] ✅ Pass | [ ] ❌ Fail
- Invalid Data: [ ] ✅ Pass | [ ] ❌ Fail
- Large Windows: [ ] ✅ Pass | [ ] ❌ Fail

### Regression Testing
- 99.8% System Intact: [ ] ✅ Pass | [ ] ❌ Fail
- Existing Workflows Work: [ ] ✅ Pass | [ ] ❌ Fail

---

## 🐛 Issues Found

### Critical Issues (Blocks Week 2)
1. _________________________________
2. _________________________________

### High Priority Issues
1. _________________________________
2. _________________________________

### Medium Priority Issues
1. _________________________________
2. _________________________________

### Low Priority Issues (Nice to Have)
1. _________________________________
2. _________________________________

---

## 📸 Screenshots Checklist

- [ ] `week1_sliding_tracks.png` - Sliding window with bottom track visible
- [ ] `week1_casement_hinges.png` - Casement window with 3 hinges per sash
- [ ] `week1_tilt_turn.png` - Tilt-turn mechanisms visible
- [ ] `week1_awning.png` - Awning window with top hinges
- [ ] `week1_disabled.png` - Same window with feature flag disabled
- [ ] `week1_console_clean.png` - Browser console showing no errors

---

## ✅ Sign-Off

### Validation Complete
- [ ] All critical tests pass
- [ ] No regressions in 99.8% system
- [ ] Performance acceptable
- [ ] Screenshots captured
- [ ] Issues documented (if any)

### Ready for Week 2?
- [ ] ✅ YES - All tests pass, proceed to Week 2
- [ ] ⚠️ CONDITIONAL - Minor issues, can proceed with fixes in parallel
- [ ] ❌ NO - Critical issues found, must fix before Week 2

**Validator Signature:** _________________  
**Date:** _________________  
**Time:** _________________

---

## 🔍 Debugging Tips

### If Mechanisms Don't Appear:
1. Check feature flag: `console.log(import.meta.env.VITE_ENABLE_OPENING_MECHANISMS)`
2. Check pattern has `openingMechanism` field
3. Check browser console for import errors
4. Verify `openingMechanisms.ts` file exists and exports correctly

### If Mechanisms in Wrong Position:
1. Check `fixedSpacers` array in `windowGeometry.ts`
2. Verify transformation matrices in `openingMechanisms.ts`
3. Check pattern definitions for correct dimensions

### If Performance Degraded:
1. Check number of geometries in `fixedSpacers` array
2. Verify WebGL draw calls in Performance tab
3. Look for unnecessary re-renders in React DevTools

---

**Next Steps After Validation:**
- If PASS: Commit Week 1, create Week 2 branch, begin production sequence optimization
- If FAIL: Create hotfix branch, fix issues, re-validate, then proceed

