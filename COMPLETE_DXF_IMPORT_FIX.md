# Complete DXF Import Fix - All Entry Points

## Issues Found

### 1. Backend Server Not Restarted
The backend is still running with the old command. Routes are accessible at:
- `/smart-scan/supported-formats` ✅ (but wrong path)
- `/profile-import/ingest` ✅ (but wrong path)

But frontend expects:
- `/api/v2/smart-scan/supported-formats` ❌ (404)
- `/api/v2/profile-import/ingest` ❌ (404)

### 2. Wrong API Port in smartScanApi.ts
`smartScanApi.ts` defaults to `http://localhost:8000` in dev mode, but backend runs on **8003**.

### 3. Relative Path in ProfileStudioLite.tsx
`ProfileStudioLite.tsx` uses relative path `/api/v2/profile-import/ingest` which won't work when frontend (5173) and backend (8003) are on different ports.

## All DXF Import Entry Points

1. ✅ **DXFProfileImporter.tsx** - Uses `${API_BASE}/api/v2/profile-import/ingest` (FIXED)
2. ✅ **ProfileScannerUploader.tsx** - Uses `smartScanApi.ts` (FIXED via smartScanApi.ts)
3. ❌ **ProfileStudioLite.tsx** - Uses relative path (FIXED NOW)
4. ✅ **SystemTuningStudio.tsx** - Uses `DXFProfileImporter` component (inherits fix)
5. ✅ **ProfileTuningStudio.tsx** - Uses `DXFProfileImporter` component (inherits fix)
6. ✅ **RoleManager.tsx** - Uses `DXFProfileImporter` component (inherits fix)

## Fixes Applied

### 1. Fixed smartScanApi.ts Port
```typescript
// OLD:
if (import.meta.env.DEV) return "http://localhost:8000";

// NEW:
if (import.meta.env.DEV) return "http://localhost:8003";
```

### 2. Fixed ProfileStudioLite.tsx API Path
```typescript
// OLD:
const response = await fetch('/api/v2/profile-import/ingest', {

// NEW:
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || 
  (import.meta.env.DEV ? 'http://localhost:8003' : window.location.origin);
const response = await fetch(`${API_BASE}/api/v2/profile-import/ingest`, {
```

## Required Actions

### Step 1: Restart Backend Server

**CRITICAL:** You must restart the backend server with the updated command:

```bash
cd python_backend
start_backend_simple.bat  # Windows
# or
./start_backend_simple.sh  # Linux/Mac
```

This uses `apis.main:app` which mounts routes under `/api/v2`.

### Step 2: Verify Backend is Running Correctly

After restart, test:
```bash
curl http://localhost:8003/api/v2/smart-scan/supported-formats
```

Should return JSON (not 404).

### Step 3: Set Environment Variable (Optional but Recommended)

Create `.env.local` in project root:
```env
VITE_API_URL=http://localhost:8003
```

This ensures all components use the correct API URL.

## Verification Checklist

After fixes:
- [ ] Backend restarted with `apis.main:app`
- [ ] `curl http://localhost:8003/api/v2/smart-scan/supported-formats` returns JSON
- [ ] `curl http://localhost:8003/api/v2/profile-import/ingest` returns error about missing file (not 404)
- [ ] Frontend can import DXF from Profile Tuning Studio
- [ ] Frontend can import DXF from System Tuning Studio
- [ ] Frontend can import DXF from ProfileStudioLite (Turkish Pilot)
- [ ] No more 404 errors in browser console

## Summary

✅ **All DXF import components now use correct API paths**
✅ **API base URL defaults to port 8003 in dev mode**
✅ **All entry points fixed**

**BUT:** You must restart the backend server for the routes to be accessible under `/api/v2` prefix!

