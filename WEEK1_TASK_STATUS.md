# Week 1: Build Foundation & Configuration Hardening - Task Status

**Date:** December 19, 2024  
**Status:** 🟡 IN PROGRESS (3/6 tasks complete)

---

## 📋 Task Status Overview

| Task | Priority | Status | Notes |
|------|----------|--------|-------|
| 1.1: Fix Backend Port Mismatch | HIGH | 🔴 TODO | README.md still has 8000 references |
| 1.2: Unify Python Requirements | MEDIUM | ✅ DONE | Completed in Week 0 |
| 1.3: Enable TypeScript Strict Mode | MEDIUM | 🔴 TODO | strict: false in tsconfig.app.json |
| 1.4: Add Web Worker Configuration | HIGH | 🟡 PARTIAL | workerFileNames exists, need format config |
| 1.5: Fix PDF.js Worker CDN | MEDIUM | ✅ DONE | Already bundles locally in production |
| 1.6: Resolve Rollup Override | LOW | 🟡 REVIEW | Rollup 4.27.0 override exists, need to verify |

---

## ✅ Completed Tasks

### Task 1.2: Unify Python Requirements Management ✅
**Status:** COMPLETE (Week 0)
- ✅ `python_backend/requirements-prod.txt` exists
- ✅ `python_backend/requirements-dev.txt` exists
- ✅ Production uses `tensorflow-cpu` (not full tensorflow)

### Task 1.5: Fix PDF.js Worker CDN Dependency ✅
**Status:** COMPLETE
- ✅ `ProfileImportTool.tsx:454-458` already bundles worker locally in production
- ✅ Uses CDN only in development
- ✅ Code: `new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).href`

---

## 🔴 Tasks To Do

### Task 1.1: Fix Backend Port Mismatch 🔴
**Priority:** HIGH - Breaks API communication

**Current Status:**
- ✅ `src/services/smartScanApi.ts` already uses port 8002 (line 7)
- ❌ `README.md` still has 8 references to port 8000
- ❓ `.env.example` - needs verification (file filtered)

**Files to Modify:**
- `README.md` - Update all port references from 8000 to 8002
- `.env.example` - Add `VITE_API_BASE_URL=http://localhost:8002` (if not present)

**Action Required:**
```bash
# Find all 8000 references
grep -r "8000" README.md
# Replace with 8002
```

---

### Task 1.3: Enable TypeScript Strict Mode Foundation 🔴
**Priority:** MEDIUM - Prevents runtime errors

**Current Status:**
- ❌ `tsconfig.app.json` has `"strict": false`
- ❌ `tsconfig.strict.json` doesn't exist

**Files to Create/Modify:**
- `tsconfig.app.json` - Enable gradual strict mode
- `tsconfig.strict.json` - Create for new hardening files

**Gradual Approach:**
```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": false,  // Enable later
    "noImplicitAny": false,     // Enable later
    "strictFunctionTypes": true,
    "strictBindCallApply": true
  }
}
```

---

### Task 1.4: Add Web Worker Configuration 🟡
**Priority:** HIGH - Required for Week 3 ProductionDXFParser

**Current Status:**
- ✅ `workerFileNames` configured in `vite.config.ts:360`
- ❌ Missing `worker.format` configuration at top level

**Files to Modify:**
- `vite.config.ts` - Add worker configuration

**Required Configuration:**
```typescript
export default defineConfig({
  worker: {
    format: 'es'  // Add this
  },
  // ... rest of config
})
```

**Current Code:**
- Line 360: `workerFileNames: 'assets/[name]-[hash].worker.js'` ✅
- Missing: Top-level `worker: { format: 'es' }` ❌

---

### Task 1.6: Resolve Rollup Version Override Conflict 🟡
**Priority:** LOW - Prevents build warnings

**Current Status:**
- ✅ Rollup override exists: `"rollup": "^4.27.0"` in `package.json:3`
- ⚠️ Build works but shows warning: "Unknown input options: manualChunks"
- ❓ Need to verify if override is necessary for Vite 7.2.7

**Files to Investigate:**
- `package.json:3` - Rollup override
- `vite.config.ts` - manualChunks configuration

**Investigation Needed:**
- Check if Vite 7.2.7 requires Rollup 4.27.0
- Verify if override is causing the warning
- Document if override is necessary or can be removed

---

## 🎯 Next Steps

### Immediate (High Priority)
1. **Task 1.1:** Fix port mismatch in README.md
2. **Task 1.4:** Add worker.format configuration

### Short-term (Medium Priority)
3. **Task 1.3:** Enable TypeScript strict mode gradually
4. **Task 1.6:** Investigate Rollup override necessity

### Verification
5. Run `npm run build` after each change
6. Test preview server after port fix
7. Verify worker configuration works

---

## 📊 Progress Summary

- **Completed:** 2/6 tasks (33%)
- **In Progress:** 2/6 tasks (33%)
- **Todo:** 2/6 tasks (33%)

**Estimated Time to Complete Week 1:**
- High priority tasks: 1-2 hours
- Medium priority tasks: 2-3 hours
- **Total:** 3-5 hours

---

## 🔗 Related Files

- `7-week_hardening_plan_code_focus.md` - Full Week 1 plan
- `vite.config.ts` - Build configuration
- `tsconfig.app.json` - TypeScript configuration
- `README.md` - Documentation (needs port update)
- `package.json` - Dependencies (Rollup override)

