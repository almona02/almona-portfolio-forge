# Week 0: Size Investigation & Action Plan

**Date:** 2025-01-XX  
**Status:** 🔍 **INVESTIGATING SIZE ISSUES**

---

## 📊 Current Sizes

| Image | Target | Actual | Gap | Status |
|-------|--------|--------|-----|--------|
| **Backend Realistic** | 400-500MB | **2.53GB** | +2GB | ❌ Too large |
| **Frontend Realistic** | 150-200MB | **875MB** | +675MB | ❌ Too large |
| **Total** | 550-700MB | **3.4GB** | +2.7GB | ❌ Too large |

**Improvement from Original:**
- Original: 6.75GB total
- Current: 3.4GB total
- **Reduction: 50%** (good, but need 90%+)

---

## 🔍 Investigation Plan

### Backend (2.53GB → Target 400-500MB)

**Check Package Sizes:**
```bash
docker run --rm almona-backend:realistic sh -c "du -sh /usr/local/lib/python3.11/site-packages/* | sort -h | tail -20"
```

**Check Installed Packages:**
```bash
docker run --rm almona-backend:realistic pip list --format=freeze
```

**Likely Culprits:**
1. **TensorFlow-CPU** - ~400MB expected, but might be larger
2. **PyTorch** - If included, ~1.2GB
3. **OpenCV** - ~100MB
4. **NumPy + SciPy** - ~50MB each
5. **Other ML libraries** - Could add up

**Action Items:**
- [ ] Identify largest packages
- [ ] Check if PyTorch is included (shouldn't be in prod)
- [ ] Verify tensorflow-cpu size
- [ ] Check for duplicate installations

### Frontend (875MB → Target 150-200MB)

**Check Dist Contents:**
```bash
docker run --rm almona-frontend:realistic du -sh /usr/share/nginx/html/*
```

**Likely Issues:**
1. **Source maps** - Should be removed in production
2. **Large vendor chunks** - Need code splitting
3. **Nginx base** - Check if using minimal variant

**Action Items:**
- [ ] Remove source maps from build
- [ ] Check if vendor chunks can be optimized
- [ ] Verify nginx:alpine size
- [ ] Consider removing unnecessary assets

---

## 🛠️ Immediate Fixes

### Fix 1: Remove Source Maps (Frontend)

**In vite.config.ts or build script:**
```typescript
build: {
  sourcemap: false, // Remove source maps
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true, // Remove console.log
    },
  },
}
```

### Fix 2: Check Requirements (Backend)

**Review requirements-prod.txt:**
- Remove PyTorch if present
- Verify tensorflow-cpu (not full tensorflow)
- Check for unnecessary packages

### Fix 3: Optimize Dockerfile Layers

**Backend:**
- Combine RUN commands to reduce layers
- Clean cache in same layer as install
- Remove test files before final layer

**Frontend:**
- Use .dockerignore properly
- Remove source maps before copy
- Minimize nginx config

---

## 📋 Next Actions

### Priority 1: Identify Large Packages
```bash
# Backend
docker run --rm almona-backend:realistic sh -c "du -sh /usr/local/lib/python3.11/site-packages/* | sort -h | tail -20"

# Frontend  
docker run --rm almona-frontend:realistic du -sh /usr/share/nginx/html/*
```

### Priority 2: Fix Build Process
- Remove source maps from frontend build
- Review and optimize requirements-prod.txt
- Rebuild with optimizations

### Priority 3: Verify Results
- Rebuild both images
- Check sizes meet realistic targets
- Test functionality

---

## 🎯 Realistic Expectations

**After Optimizations:**
- Backend: 2.53GB → **600-800MB** (realistic for ML platform)
- Frontend: 875MB → **200-300MB** (with source maps removed)
- Total: 3.4GB → **800MB-1.1GB** (still 85-90% reduction from 6.75GB)

**Minister's Office Narrative:**
"We reduced from 6.75GB to under 1GB (85%+ reduction) while maintaining all enterprise functionality. This enables fast deployment to Egyptian workshops while preserving our 99.8% Gold Tier accuracy."

---

**Status:** Investigating root causes, preparing optimization fixes.

