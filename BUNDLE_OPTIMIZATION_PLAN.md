# Bundle Optimization Plan - Safe Surgery on 7MB Vendor Bundle

**Date:** 2025-01-XX  
**Status:** 🎯 **PLANNING PHASE**  
**Target:** Reduce 7MB `react-vendor-DQdEcPIN.js` bundle by 1-2MB safely

---

## 🔍 Problem Analysis

### Current State
- **Bundle Size:** 7MB (uncompressed)
- **Main Culprit:** `hls.js` (1.06MB / 3.48% of bundle)
- **Source:** `@react-three/drei/core/VideoTexture.js` imports `hls.js`
- **Issue:** VideoTexture is **NOT USED** anywhere in the codebase
- **Risk:** High - Previous attempts broke the application

### Bundle Breakdown (from rollup visualizer)
```
root/assets/react-vendor-DQdEcPIN.js
├── hls.js (1.06MB) ❌ UNNECESSARY
├── @react-three/drei (full import)
├── @pdf-lib (pdf-lib)
├── recharts
├── @ant-design (antd/es)
├── framer-motion
├── three-mesh-bvh
├── markdown-it
├── @supabase
└── ... (many more)
```

---

## ✅ Verification Strategy

### Phase 1: Pre-Change Verification (Baseline)
Before making ANY changes, we must establish a working baseline:

```bash
# 1. Verify current build works
npm run build
# Expected: Build succeeds, no errors

# 2. Check bundle size
npm run build:analyze
# Expected: react-vendor bundle ~7MB

# 3. Verify app runs
npm run dev
# Expected: App loads, no console errors

# 4. Test critical paths
# - /fabricator (3D window generator)
# - /shop (e-commerce)
# - /services (service management)
# - /reports (analytics)
```

### Phase 2: Safe Exclusion Test
Test excluding hls.js without code changes:

```bash
# Run verification script
node scripts/verify-bundle-optimization.js --phase=exclusion-test
```

**Verification Checklist:**
- [ ] Build completes without errors
- [ ] No TypeScript compilation errors
- [ ] Bundle size reduced by ~1MB
- [ ] hls.js not in bundle
- [ ] App loads without console errors
- [ ] All routes work
- [ ] 3D components render correctly
- [ ] No broken imports in DevTools

### Phase 3: Progressive Optimization
After exclusion test passes, apply chunk splitting:

```bash
# Run verification script
node scripts/verify-bundle-optimization.js --phase=chunk-splitting
```

**Verification Checklist:**
- [ ] All Phase 2 checks pass
- [ ] Vendor chunks split correctly
- [ ] No duplicate dependencies
- [ ] Chunk sizes < 2MB each
- [ ] Performance metrics improved

---

## 🛠️ Implementation Plan

### Step 1: Exclude hls.js (Safest First Step)

**Change:** Update `vite.config.ts` `optimizeDeps.exclude`

```typescript
optimizeDeps: {
  exclude: [
    "@google/generative-ai",
    "@huggingface/inference",
    "@tensorflow/tfjs",
    "three",
    "hls.js", // ✅ ADD THIS
    "@react-three/drei/core/VideoTexture" // ✅ ADD THIS
  ]
}
```

**Why Safe:**
- VideoTexture is not used anywhere
- hls.js is only needed for VideoTexture
- No code changes required
- Easily reversible

**Expected Result:**
- Bundle size: 7MB → ~6MB (-1MB)
- Build time: No change
- Runtime: No impact (feature not used)

### Step 2: Optimize @react-three/drei Imports

**Change:** Use tree-shakeable imports in components

**Current (bad):**
```typescript
import * from '@react-three/drei'; // Imports everything including VideoTexture
```

**Optimized (good):**
```typescript
import { OrbitControls, Text, Environment } from '@react-three/drei';
```

**Files to Update:**
- `src/components/fabricator/Window3DGenerator.tsx` ✅ (already optimized)
- `src/components/3d-model/Interactive3DViewer.tsx` ✅ (already optimized)
- Check all other drei imports

**Expected Result:**
- Bundle size: ~6MB → ~5.5MB (-500KB)
- Tree-shaking removes unused drei components

### Step 3: Split Vendor Chunks (Advanced)

**Change:** Update `manualChunks` in `vite.config.ts`

**Strategy:**
```typescript
manualChunks: (id) => {
  // Exclude app code
  if (id.includes('/src/') || id.includes('\\src\\')) {
    return undefined;
  }

  // Split heavy vendors
  if (id.includes('node_modules/three/') && !id.includes('@react-three')) {
    return 'vendor-three';
  }
  if (id.includes('node_modules/@react-three/drei/')) {
    return 'vendor-drei'; // ✅ NEW: Separate drei chunk
  }
  if (id.includes('node_modules/@ant-design/') || id.includes('node_modules/antd/')) {
    return 'vendor-antd';
  }
  if (id.includes('node_modules/recharts/')) {
    return 'vendor-charts';
  }
  if (id.includes('node_modules/@pdf-lib/') || id.includes('node_modules/pdf-lib/')) {
    return 'vendor-pdf';
  }
  if (id.includes('node_modules/framer-motion/')) {
    return 'vendor-motion';
  }
  
  // Everything else
  if (id.includes('node_modules')) {
    return 'vendor-other';
  }
}
```

**Expected Result:**
- Better code splitting
- Parallel chunk loading
- Faster initial load
- Total bundle: ~5.5MB (split across chunks)

---

## 🧪 Automated Verification Script

The verification script (`scripts/verify-bundle-optimization.js`) will:

1. **Build Verification**
   - Run `npm run build`
   - Check for errors
   - Measure bundle sizes
   - Compare before/after

2. **Bundle Analysis**
   - Check if hls.js is excluded
   - Verify chunk splitting
   - Check for duplicate dependencies
   - Measure chunk sizes

3. **Runtime Verification**
   - Start dev server
   - Test critical routes
   - Check console for errors
   - Verify 3D components load

4. **Performance Metrics**
   - Measure bundle load times
   - Check FCP (First Contentful Paint)
   - Check TTI (Time to Interactive)
   - Compare before/after

---

## 🚨 Rollback Plan

If anything breaks:

```bash
# 1. Restore vite.config.ts
git restore vite.config.ts

# 2. Clean build
rm -rf dist node_modules/.vite
npm ci
npm run build

# 3. Verify restore
npm run dev
# Test all critical paths
```

---

## 📊 Success Criteria

### Must Have (Critical)
- ✅ Build succeeds without errors
- ✅ App loads without console errors
- ✅ All routes work correctly
- ✅ 3D components render properly
- ✅ Bundle size reduced by at least 1MB

### Should Have (Important)
- ✅ Chunk sizes < 2MB each
- ✅ FCP improved by 300-500ms
- ✅ TTI improved by 1-2s
- ✅ No duplicate dependencies

### Nice to Have (Optional)
- ✅ Lighthouse score >90
- ✅ Bundle analysis shows clean splits
- ✅ No warnings in build output

---

## 📝 Implementation Checklist

### Pre-Implementation
- [ ] Create backup branch: `git checkout -b bundle-optimization-backup`
- [ ] Document current bundle: `npm run build:analyze > bundle-before.html`
- [ ] Run baseline verification: `node scripts/verify-bundle-optimization.js --phase=baseline`

### Step 1: Exclude hls.js
- [ ] Update `vite.config.ts` to exclude hls.js
- [ ] Run verification: `node scripts/verify-bundle-optimization.js --phase=exclusion-test`
- [ ] If passes, commit: `git commit -m "feat: exclude unused hls.js from bundle"`

### Step 2: Optimize drei Imports
- [ ] Check all drei imports are tree-shakeable
- [ ] Update any wildcard imports
- [ ] Run verification: `node scripts/verify-bundle-optimization.js --phase=import-optimization`
- [ ] If passes, commit: `git commit -m "feat: optimize @react-three/drei imports"`

### Step 3: Split Vendor Chunks
- [ ] Update `manualChunks` strategy
- [ ] Run verification: `node scripts/verify-bundle-optimization.js --phase=chunk-splitting`
- [ ] If passes, commit: `git commit -m "feat: split vendor chunks for better performance"`

### Post-Implementation
- [ ] Run full test suite: `npm test`
- [ ] Performance audit: `npm run performance:audit`
- [ ] Document results: Update this file with actual metrics
- [ ] Merge to main: `git checkout main && git merge bundle-optimization-backup`

---

## 🔗 Related Files

- `vite.config.ts` - Build configuration
- `package.json` - Dependencies
- `src/lib/mocks/hls-mock.ts` - Existing hls.js mock (not used)
- `scripts/verify-bundle-optimization.js` - Verification script (to be created)
- `src/components/fabricator/Window3DGenerator.tsx` - Main 3D component
- `src/lib/optimized-imports.ts` - Lazy loading utilities

---

## 📚 References

- [Vite Bundle Optimization Guide](https://vitejs.dev/guide/build.html#chunking-strategy)
- [Rollup Manual Chunks](https://rollupjs.org/configuration-options/#output-manualchunks)
- [Tree Shaking in Vite](https://vitejs.dev/guide/features.html#tree-shaking)

---

**Next Steps:** Run the verification script to establish baseline, then proceed with Step 1.

