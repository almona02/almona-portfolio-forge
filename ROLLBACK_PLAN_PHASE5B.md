# Rollback Plan - Phase 5B (Unused JavaScript Removal)

**CRITICAL:** This is sensitive bundle surgery. Follow rollback procedure if build fails.

---

## 🚨 Rollback Procedure

### If Build Fails:
```bash
# 1. Restore vite.config.ts
git checkout vite.config.ts

# 2. Restore any modified component files
git checkout src/components/admin/SalesChart.tsx
git checkout src/components/analytics/BusinessKPIDashboard.tsx
# ... (add more as we modify them)

# 3. Rebuild
npm run build

# 4. Verify build succeeds
npm run preview
```

### If Runtime Errors (Circular Dependencies):
```bash
# 1. Check browser console for errors
# 2. Look for "Cannot access 'X' before initialization"
# 3. If found, immediately rollback:
git checkout vite.config.ts
git checkout src/components/admin/SalesChart.tsx
# ... (restore all modified files)

# 4. Rebuild and test
npm run build
npm run preview
```

---

## 📋 Pre-Change Checklist

Before making ANY changes:
- [x] Create rollback plan
- [ ] Backup current vite.config.ts
- [ ] Test current build works
- [ ] Document all files to be modified
- [ ] Start with ONE file only

---

## 🔄 Incremental Approach

### Step 1: Test with ONE file only
- Modify: `src/components/admin/SalesChart.tsx`
- Test: Build + Preview
- If fails: Rollback immediately
- If succeeds: Proceed to Step 2

### Step 2: Add ONE more file
- Modify: `src/components/analytics/BusinessKPIDashboard.tsx`
- Test: Build + Preview
- If fails: Rollback to Step 1 state
- If succeeds: Continue

### Step 3: Continue incrementally
- One file at a time
- Test after each change
- Stop if any issues

---

## ⚠️ Warning Signs

**STOP IMMEDIATELY if you see:**
- Build errors about circular dependencies
- "Cannot access 'X' before initialization"
- Chunk loading errors in browser
- White screen after changes
- Any runtime errors in console

**DO NOT PROCEED if:**
- Build takes > 2 minutes (might be stuck)
- Bundle size increases unexpectedly
- New chunks appear that shouldn't exist

---

## ✅ Success Criteria

**Only proceed if:**
- Build completes successfully
- No console errors
- Bundle size decreases
- Page loads correctly
- No visual regressions

---

**Last Updated:** January 2025  
**Status:** Ready for safe, incremental implementation

