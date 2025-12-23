# Phase 7: Unused JavaScript Optimization

**Date:** January 2025  
**Status:** 🚧 In Progress  
**Target:** Reduce unused JavaScript by 2,058 KiB

---

## 📊 Current Analysis

### Lighthouse Findings:
- **Unused JavaScript:** 2,058 KiB potential savings
- **react-vendor bundle:** 6,127.63 KiB (largest chunk)
- **Main culprits:**
  - Framer Motion: ~150KB (66 files)
  - Recharts: ~230KB (9 files) - Already lazy loaded ✅
  - Ant Design: ~1.2MB (1 file) - Already using named imports ✅
  - Other unused code in react-vendor

---

## 🎯 Optimization Strategy

### Priority 1: Verify Current Optimizations ✅
1. ✅ Ant Design - Already using named imports (tree-shakeable)
2. ✅ Recharts - Already lazy loaded (verified in Phase 5B)
3. ✅ Three.js - Already lazy loaded via LazyModelWrapper
4. ✅ TensorFlow.js - Already lazy loaded in AI components

### Priority 2: Framer Motion Lazy Loading (High Impact, Medium Risk)
**Challenge:** 66 files use Framer Motion, many in above-the-fold components

**Safe Approach:**
1. Create lazy motion utility (✅ Done)
2. Start with below-the-fold components (modals, dialogs, below-fold sections)
3. Test incrementally
4. Only update above-the-fold components if tests pass

**Files to Update (Priority Order):**
1. **Below-the-fold components** (safest):
   - Modal dialogs
   - Dropdown menus
   - Tooltips
   - Below-fold sections

2. **Above-the-fold components** (after testing):
   - Hero sections (careful - might cause layout shift)
   - Navigation (careful - might cause flash)

**Expected Savings:** ~150KB from react-vendor

### Priority 3: Additional Optimizations (Lower Risk)
1. **Remove unused dependencies** (if any)
2. **Optimize bundle splitting** (verify manualChunks is optimal)
3. **Code splitting improvements** (verify all heavy routes are lazy loaded)

---

## 🧪 Testing Plan

### Before Changes:
1. Run `npm run build`
2. Check bundle sizes
3. Run PageSpeed Insights baseline

### After Each Change:
1. Run `npm run build`
2. Compare bundle sizes
3. Test in browser (check for errors, layout shifts)
4. Run PageSpeed Insights

### Success Criteria:
- react-vendor reduced by 100KB+
- No console errors
- No layout shifts
- PageSpeed score improves
- JavaScript execution time decreases

---

## ⚠️ Safety Considerations

1. **Framer Motion in Hero Components:**
   - Lazy loading might cause layout shift
   - Consider preloading on idle after initial render
   - Or keep hero components with static import

2. **Incremental Updates:**
   - Update 5-10 files at a time
   - Test after each batch
   - Rollback if issues occur

3. **Fallback Strategy:**
   - Lazy motion components have fallback to regular elements
   - Animations gracefully degrade if Framer Motion fails to load

---

## 📝 Implementation Status

- [x] Create lazy motion utility
- [ ] Update below-the-fold components (5-10 files)
- [ ] Test build and browser
- [ ] Measure bundle size reduction
- [ ] Update more components if successful
- [ ] Final testing and measurement

---

**Last Updated:** January 2025  
**Status:** Ready for incremental implementation

