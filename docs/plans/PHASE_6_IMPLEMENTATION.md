# Phase 6: Resource Preloading & Critical Path Optimization

**Date:** January 2025  
**Status:** 🚀 Implementing  
**Goal:** Reduce LCP render delay and improve TTI

---

## 🎯 Implementation Plan

### Step 1: Add Critical Resource Preloading (HIGH IMPACT)
**Risk:** LOW - Only adds preload hints

**Changes:**
- Add preload hints for critical JavaScript chunks in `index.html`
- Vite will automatically inject correct hashes at build time
- Use `<link rel="modulepreload">` for ES modules

### Step 2: Optimize Service Worker Cache Strategy (MEDIUM IMPACT)
**Risk:** MEDIUM - Affects offline behavior

**Changes:**
- Update VitePWA workbox configuration
- Add runtime caching for fonts, images, API calls
- Use CacheFirst for static assets, NetworkFirst for API

### Step 3: Font Optimization (Already Done ✅)
- Fonts already have `font-display: swap`
- Fonts already preloaded
- No changes needed

---

## 📊 Expected Results

- **LCP:** 2,000-2,500ms → 1,500-2,000ms (-500ms)
- **TTI:** Improved by 200-300ms
- **PageSpeed:** 48-50% → 55-60% (+5-10 points)

---

**Last Updated:** January 2025  
**Status:** Ready to implement

