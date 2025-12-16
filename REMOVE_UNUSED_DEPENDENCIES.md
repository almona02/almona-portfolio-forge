# 🗑️ Remove Unused Dependencies - Action Plan

## Confirmed Unused Dependencies

Based on depcheck analysis and manual verification:

### ✅ Safe to Remove (No Usage Found)

1. **@react-spring/three** (~50-100KB)
2. **@types/react-window** (~5-10KB)
3. **@uiw/react-markdown-preview** (~100-200KB)
4. **jwt-decode** (~10-20KB) - Verified: No usage found
5. **markdown-to-jsx** (~50-100KB)

**Total Savings**: ~215-330KB

### ⚠️ Need Further Verification

These were flagged by depcheck but may be used:

- **pdfjs-dist** - Check if used for PDF rendering
- **react-content-loader** - Check if used for loading skeletons
- **react-media-recorder** - Check if used for media recording
- **react-window-infinite-loader** - Check if used for virtualized lists
- **tailwindcss-animate** - Check if used for animations

---

## 🚀 Removal Steps

### Step 1: Remove Confirmed Unused Dependencies

```bash
npm uninstall \
  @react-spring/three \
  @types/react-window \
  @uiw/react-markdown-preview \
  jwt-decode \
  markdown-to-jsx
```

### Step 2: Verify Remaining Dependencies

Check if these are actually used:
```bash
# Check pdfjs-dist
grep -r "pdfjs-dist" src/

# Check react-content-loader
grep -r "react-content-loader" src/

# Check react-media-recorder
grep -r "react-media-recorder" src/

# Check react-window-infinite-loader
grep -r "react-window-infinite-loader" src/

# Check tailwindcss-animate
grep -r "tailwindcss-animate" src/ tailwind.config.*
```

### Step 3: Test Application

```bash
# Build
npm run build

# Test
npm run preview

# Run tests
npm test
```

---

## 📊 Expected Results

### Bundle Size Reduction
- **Before**: Current bundle sizes
- **After**: ~215-330KB smaller
- **Impact**: Small but positive

### Build Time
- **Before**: Current build time
- **After**: Slightly faster (fewer dependencies to process)

### Maintenance
- Cleaner `package.json`
- Faster `npm install`
- Reduced security surface area

---

## ✅ Verification Checklist

- [x] Identified unused dependencies
- [ ] Removed confirmed unused dependencies
- [ ] Verified remaining dependencies
- [ ] Tested application
- [ ] Rebuilt and checked bundle sizes
- [ ] No runtime errors

---

**Status**: Ready for execution  
**Estimated Time**: 15-20 minutes  
**Risk**: Low (after verification)

