# 🚀 Visual Validation Quick Start Guide

**Time Required:** 30 minutes  
**Status:** Ready to Execute

---

## ⚡ Quick Setup (2 minutes)

### 1. Start Development Server
```bash
npm run dev
```

### 2. Enable Feature Flag
Create or edit `.env.local`:
```bash
VITE_ENABLE_OPENING_MECHANISMS=true
```

Or set in terminal:
```bash
export VITE_ENABLE_OPENING_MECHANISMS=true
npm run dev
```

### 3. Open Browser
Navigate to: `http://localhost:3000/fabricator/new`

### 4. Open DevTools
Press `F12` to open browser console

---

## 🔍 Automated Validation (5 minutes)

Run the automated checks first:

```bash
npm run validate:visual
```

This will verify:
- ✅ All required files exist
- ✅ Imports are correct
- ✅ Feature flags configured properly
- ✅ No browser compatibility issues

**Expected Output:**
```
✅ All automated checks PASSED!
📋 Next Steps:
   1. Run manual visual validation using WEEK1_VISUAL_VALIDATION_CHECKLIST.md
   2. Test in browser at http://localhost:3000/fabricator/new
   3. Verify mechanisms appear correctly in 3D preview
   4. Test feature flag toggle
```

---

## 📋 Manual Validation (25 minutes)

Follow the detailed checklist in **`WEEK1_VISUAL_VALIDATION_CHECKLIST.md`**

### Quick Test Flow:

1. **Test Sliding Window** (5 min)
   - Select sliding pattern
   - Create window
   - Verify tracks visible in 3D preview

2. **Test Casement Window** (5 min)
   - Select casement pattern
   - Create window with 2 sashes
   - Verify 6 hinges visible (3 per sash)

3. **Test Feature Flag Toggle** (5 min)
   - Set flag to `false`
   - Refresh page
   - Verify mechanisms disappear
   - Set flag to `true`
   - Refresh page
   - Verify mechanisms reappear

4. **Test Performance** (5 min)
   - Create multiple windows
   - Check generation time < 2 seconds
   - Verify smooth 3D rotation

5. **Test Error Handling** (5 min)
   - Test pattern without opening mechanism
   - Verify graceful fallback
   - Check console for errors

---

## 📸 Screenshots to Capture

Take these screenshots for documentation:

1. `week1_sliding_tracks.png` - Sliding window with bottom track
2. `week1_casement_hinges.png` - Casement with 3 hinges per sash
3. `week1_tilt_turn.png` - Tilt-turn mechanisms (if available)
4. `week1_awning.png` - Awning window (if available)
5. `week1_disabled.png` - Same window with flag disabled
6. `week1_console_clean.png` - Browser console showing no errors

---

## ✅ Validation Checklist Summary

### Must Pass (Critical):
- [ ] Mechanisms visible when flag enabled
- [ ] Mechanisms hidden when flag disabled
- [ ] No console errors
- [ ] 99.8% system still works
- [ ] Performance acceptable (<2s)

### Should Pass (High Priority):
- [ ] Mechanisms in correct positions
- [ ] Realistic geometry (not just boxes)
- [ ] All window types supported
- [ ] Hot reload works

### Nice to Have (Medium Priority):
- [ ] Mechanisms look polished
- [ ] Smooth animations
- [ ] Tooltips/info on hover

---

## 🐛 Common Issues & Fixes

### Issue: Mechanisms Don't Appear
**Check:**
1. Feature flag set correctly? `console.log(import.meta.env.VITE_ENABLE_OPENING_MECHANISMS)`
2. Pattern has `openingMechanism` field?
3. Browser console errors?

**Fix:** Verify `.env.local` file exists and flag is set

### Issue: Mechanisms in Wrong Position
**Check:**
1. Pattern dimensions correct?
2. Window unit dimensions correct?

**Fix:** Review `openingMechanisms.ts` transformation logic

### Issue: Performance Degraded
**Check:**
1. Too many geometries created?
2. Unnecessary re-renders?

**Fix:** Profile in browser DevTools Performance tab

---

## 📊 Report Template

After validation, fill out:

```markdown
# Week 1 Visual Validation Report

**Date:** [Today]
**Validator:** [Your Name]

## Results Summary
- Sliding Tracks: ✅/❌
- Casement Hinges: ✅/❌
- Feature Flags: ✅/❌
- Performance: ✅/❌
- No Regressions: ✅/❌

## Issues Found
1. [List any issues]

## Sign-off
- [ ] Ready for Week 2
- [ ] Needs fixes first
```

---

## 🚀 Next Steps After Validation

### If Validation PASSES:
```bash
# 1. Commit Week 1 work
git add .
git commit -m "feat: Week 1 complete - Opening mechanisms visualization"
git push

# 2. Create Week 2 branch
git checkout -b phase0-week2-production-sequence

# 3. Begin Week 2 implementation
```

### If Validation FAILS:
```bash
# 1. Create hotfix branch
git checkout -b hotfix/week1-mechanisms

# 2. Fix issues
# 3. Re-test
# 4. Merge and proceed
```

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify feature flag is set
3. Review `WEEK1_VISUAL_VALIDATION_CHECKLIST.md` for detailed steps
4. Check `WEEK2_TECHNICAL_ANALYSIS.md` for Week 2 prep (already done)

---

**Status:** ✅ Ready to Execute  
**Estimated Time:** 30 minutes  
**Priority:** High (Blocks Week 2)  
**Owner:** [Your Name]

