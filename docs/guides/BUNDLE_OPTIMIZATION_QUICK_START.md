# Bundle Optimization - Quick Start Guide

**For:** Safe surgery on 7MB vendor bundle  
**Goal:** Reduce bundle by 1-2MB without breaking the app

---

## 🚀 Quick Start (3 Steps)

### Step 1: Establish Baseline
```bash
# Run baseline verification
node scripts/verify-bundle-optimization.js --phase=baseline
```

**Expected Output:**
- ✅ Build completes
- ✅ Bundle size ~7MB
- ⚠️ hls.js found in bundle (expected)

### Step 2: Test hls.js Exclusion
The vite.config.ts has been updated to exclude hls.js. Test it:

```bash
# Clean build cache
rm -rf dist node_modules/.vite

# Build and verify
npm run build
node scripts/verify-bundle-optimization.js --phase=exclusion-test
```

**Expected Output:**
- ✅ Build completes
- ✅ Bundle size ~6MB (reduced by ~1MB)
- ✅ hls.js excluded

### Step 3: Verify Chunk Splitting
```bash
# Build with new chunk strategy
npm run build
node scripts/verify-bundle-optimization.js --phase=chunk-splitting
```

**Expected Output:**
- ✅ Build completes
- ✅ Multiple vendor chunks created
- ✅ All chunks < 2MB

---

## 📋 Full Verification

Run all phases:
```bash
node scripts/verify-bundle-optimization.js --phase=full
```

---

## 🔍 What Changed

### vite.config.ts Changes

1. **Excluded hls.js** (Line 361-367):
   ```typescript
   exclude: [
     // ... existing excludes
     "hls.js",
     "@react-three/drei/core/VideoTexture"
   ]
   ```

2. **Improved manualChunks** (Line 301-342):
   - Split `@react-three/drei` into `vendor-drei` chunk
   - Split `antd` into `vendor-antd` chunk
   - Split `framer-motion` into `vendor-motion` chunk
   - Split `recharts` into `chart-vendor` chunk
   - Added `@pdf-lib` to `document-vendor` chunk

---

## ✅ Verification Checklist

After running verification, check:

- [ ] Build succeeds: `npm run build`
- [ ] App runs: `npm run dev`
- [ ] No console errors
- [ ] All routes work:
  - `/fabricator` (3D window generator)
  - `/shop` (e-commerce)
  - `/services` (service management)
  - `/reports` (analytics)
- [ ] 3D components render correctly
- [ ] Bundle size reduced by ~1MB

---

## 🚨 If Something Breaks

### Quick Rollback
```bash
# Restore vite.config.ts
git restore vite.config.ts

# Clean and rebuild
rm -rf dist node_modules/.vite
npm ci
npm run build
```

### Verify Restore
```bash
npm run dev
# Test all critical paths
```

---

## 📊 Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Vendor Bundle** | ~7MB | ~6MB | -1MB (-14%) |
| **hls.js** | 1.06MB | 0MB | -100% |
| **Chunks** | 1 large | 6-8 split | Better loading |
| **FCP** | Baseline | -300ms | Faster |
| **TTI** | Baseline | -1s | Faster |

---

## 📚 Related Files

- `BUNDLE_OPTIMIZATION_PLAN.md` - Full detailed plan
- `scripts/verify-bundle-optimization.js` - Verification script
- `vite.config.ts` - Build configuration (updated)
- `src/lib/mocks/hls-mock.ts` - Existing mock (not used)

---

## 🎯 Next Steps

1. ✅ Run baseline verification
2. ✅ Test hls.js exclusion
3. ✅ Verify chunk splitting
4. ✅ Test app manually
5. ✅ Commit changes if all pass

**Ready?** Run: `node scripts/verify-bundle-optimization.js --phase=full`

