# Vite Configuration Analysis - Dependency Conflicts & Build Issues

**Date:** December 2025  
**Purpose:** Identify potential dependency conflicts and build failures in `vite.config.ts`

---

## 🔴 Critical Issues

### 1. Backend Port Mismatch
**Issue:** `vite.config.ts` proxies to `localhost:8002`, but documentation mentions port `8000`

**Location:**
- `vite.config.ts:36` - Proxy target: `http://localhost:8002`
- `README.md:623` - API base URL: `http://localhost:8000`
- `src/services/smartScanApi.ts:7` - Uses `http://localhost:8002`

**Impact:** Backend API calls will fail if backend runs on port 8000 instead of 8002

**Recommendation:**
- Standardize on one port (recommend 8002 to match vite.config.ts)
- Update README.md to reflect correct port
- Add environment variable for API base URL

### 2. Missing Web Worker Configuration
**Issue:** Hardening plan requires Web Workers for `ProductionDXFParser`, but vite.config.ts has no worker configuration

**Impact:** When implementing `ProductionDXFParser` with Web Worker pool, builds will fail with:
```
Failed to resolve worker import
```

**Recommendation:**
Add to `vite.config.ts`:
```typescript
build: {
  rollupOptions: {
    output: {
      // ... existing config
      workerFileNames: 'assets/[name]-[hash].worker.js',
    }
  }
}
```

And configure worker imports:
```typescript
// In ProductionDXFParser.ts
const worker = new Worker(
  new URL('./dxf-parser.worker.ts', import.meta.url),
  { type: 'module' }
);
```

### 3. PDF.js Worker CDN Dependency
**Issue:** `ProfileImportTool.tsx:454` uses CDN for PDF.js worker, which may fail in production

**Location:** `src/components/fabricator/ProfileImportTool.tsx:454`
```typescript
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
```

**Impact:** 
- Production builds may fail if CDN is blocked
- Offline PWA functionality broken
- Security concerns (external CDN)

**Recommendation:**
- Bundle PDF.js worker locally
- Use Vite's worker handling: `import pdfWorker from 'pdfjs-dist/build/pdf.worker?worker'`

---

## ⚠️ High Priority Issues

### 4. Vite 7.2.6 Plugin Compatibility
**Issue:** Vite 7.2.6 is very new (released recently), plugin compatibility may be untested

**Dependencies:**
- `@vitejs/plugin-react: ^4.7.0` - Should be compatible
- `vite-plugin-pwa: ^1.0.3` - May have compatibility issues
- `rollup-plugin-visualizer: ^6.0.5` - Should work

**Impact:** Potential build failures or runtime errors

**Recommendation:**
- Test all plugins with Vite 7.2.6
- Consider downgrading to Vite 6.x for stability if issues occur
- Monitor plugin GitHub issues for Vite 7 compatibility

### 5. Rollup Version Override Conflict
**Issue:** `package.json` overrides Rollup to `^4.27.0`, but Vite 7 may use Rollup 5.x internally

**Location:** `package.json:3`
```json
"overrides": {
  "rollup": "^4.27.0",
  ...
}
```

**Impact:** 
- Version mismatch between Vite's expected Rollup and override
- Potential build failures
- Unpredictable behavior

**Recommendation:**
- Remove Rollup override if not critical
- Or verify Vite 7.2.6 actually uses Rollup 4.x
- Check Vite 7 release notes for Rollup version

### 6. TypeScript Strict Mode Disabled
**Issue:** `tsconfig.app.json` has `strict: false` and multiple strict checks disabled

**Location:** `tsconfig.app.json:18-22`
```json
"strict": false,
"noUnusedLocals": false,
"noUnusedParameters": false,
"noImplicitAny": false,
```

**Impact:**
- Hidden type errors that could cause runtime failures
- Hardening plan requires type safety for accuracy guarantees
- Makes it harder to catch bugs before production

**Recommendation:**
- Gradually enable strict mode
- Start with `noImplicitAny: true` for hardening components
- Add `strictNullChecks: true` for ProductionDXFParser

### 7. Node.js Polyfills May Conflict
**Issue:** Custom polyfills for Node.js modules (stream, http, https, url, zlib) may conflict with browser globals

**Location:** `vite.config.ts:202-206`
```typescript
resolve: {
  alias: {
    "stream": path.resolve(__dirname, "./src/lib/polyfills/stream.ts"),
    "http": path.resolve(__dirname, "./src/lib/polyfills/http.ts"),
    // ...
  }
}
```

**Impact:**
- Runtime errors if polyfills don't match expected behavior
- Bundle size increase
- Potential conflicts with libraries expecting real Node.js modules

**Recommendation:**
- Verify all polyfills are actually used
- Test each polyfill in isolation
- Consider using `vite-plugin-node-polyfills` instead of custom polyfills

---

## 🟡 Medium Priority Issues

### 8. PWA Plugin Only in Production
**Issue:** PWA plugin is only enabled in production, but service worker registration exists in `main.tsx`

**Location:**
- `vite.config.ts:72` - `...(isProduction ? [VitePWA({...})] : [])`
- `src/main.tsx:290-334` - Service worker registration logic

**Impact:**
- Development testing of PWA features impossible
- Service worker registration code may conflict with VitePWA auto-registration

**Recommendation:**
- Enable PWA in development with `devOptions.enabled: true`
- Or remove manual service worker registration if using VitePWA auto-registration

### 9. Complex Manual Chunk Splitting
**Issue:** Very complex `manualChunks` configuration (lines 331-479) may break with dependency updates

**Impact:**
- Build failures if dependency structure changes
- Hard to maintain
- Potential for duplicate chunks if logic is incorrect

**Recommendation:**
- Simplify chunk splitting logic
- Use Vite's automatic code splitting where possible
- Document why each manual chunk is necessary

### 10. Long Package Custom Plugin
**Issue:** Custom plugin to fix 'long' package may conflict with `optimizeDeps`

**Location:**
- `vite.config.ts:53-70` - Custom 'fix-long-package' plugin
- `vite.config.ts:495` - `optimizeDeps.include: ["long"]`

**Impact:**
- Potential double-processing of 'long' package
- Build inconsistencies

**Recommendation:**
- Verify if custom plugin is still needed
- Test build without custom plugin
- Use `optimizeDeps` configuration instead if possible

### 11. Missing Source Maps in Production
**Issue:** `sourcemap: false` in production build (line 240)

**Impact:**
- Harder to debug production issues
- Hardening plan requires error tracking and monitoring

**Recommendation:**
- Enable source maps for production (with proper security)
- Or use hidden source maps: `sourcemap: 'hidden'`

---

## 🟢 Low Priority / Warnings

### 12. CSS Code Splitting May Cause FOUC
**Issue:** `cssCodeSplit: true` may cause Flash of Unstyled Content (FOUC)

**Location:** `vite.config.ts:229, 246`

**Impact:** Visual glitches during page load

**Recommendation:** Monitor in production, adjust if needed

### 13. Aggressive Tree Shaking
**Issue:** Tree shaking configuration may remove needed code

**Location:** `vite.config.ts:259-263`
```typescript
treeshake: {
  moduleSideEffects: true,
  propertyReadSideEffects: false,
  tryCatchDeoptimization: false
}
```

**Impact:** Runtime errors if side effects are incorrectly removed

**Recommendation:** Test thoroughly, especially with dynamic imports

### 14. Console Removal in Production
**Issue:** `drop: ["console", "debugger"]` removes all console logs

**Location:** `vite.config.ts:513`

**Impact:** 
- Harder to debug production issues
- Monitoring dashboard may need console logs

**Recommendation:**
- Keep `console.error` and `console.warn`
- Use custom logger that respects environment

---

## 📋 Recommended Action Plan

### Immediate (Before Hardening Implementation)
1. ✅ Fix backend port mismatch (standardize on 8002)
2. ✅ Add Web Worker configuration to vite.config.ts
3. ✅ Fix PDF.js worker to use local bundle
4. ✅ Test Vite 7.2.6 plugin compatibility

### Short-term (Week 1)
5. ✅ Remove or verify Rollup override
6. ✅ Enable TypeScript strict mode for new hardening components
7. ✅ Review and test Node.js polyfills
8. ✅ Simplify manual chunk splitting

### Long-term (Week 2-4)
9. ✅ Enable PWA in development for testing
10. ✅ Review and optimize chunk splitting
11. ✅ Enable source maps for production monitoring
12. ✅ Implement custom logger (keep console.error/warn)

---

## 🔍 Testing Checklist

Before implementing hardening plan, verify:

- [ ] Backend API accessible on configured port (8002)
- [ ] Web Workers can be imported and used
- [ ] PDF.js worker loads correctly in production build
- [ ] All Vite plugins work with Vite 7.2.6
- [ ] Production build completes without errors
- [ ] PWA service worker registers correctly
- [ ] All polyfills work as expected
- [ ] Chunk splitting doesn't break dynamic imports
- [ ] TypeScript compilation succeeds with strict mode (for new files)

---

## 📚 References

- Vite 7 Release Notes: https://vitejs.dev/blog/announcing-vite7
- VitePWA Plugin: https://vite-pwa-org.netlify.app/
- Web Workers in Vite: https://vitejs.dev/guide/features.html#web-workers
- Rollup Manual Chunks: https://rollupjs.org/configuration-options/#output-manualchunks

