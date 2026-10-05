# 🔴 RESTART SERVER NOW

## Current Status

✅ Code is fixed - routes are registered correctly
❌ Server is still running old code - needs restart

## Quick Restart

**In the terminal where backend is running:**

1. Press `Ctrl+C` to stop
2. Run:
   ```bash
   python -m uvicorn apis.main:app --host 0.0.0.0 --port 8003 --reload
   ```

**Or use the force restart script:**
```bash
cd python_backend
force_restart_backend.bat
```

## After Restart

Run this to verify:
```bash
cd python_backend
python verify_routes.py
```

**Expected output:**
```
[OK] /api/v2/smart-scan/supported-formats - 200
[OK] /api/v2/profile-import/ingest - 405
[OK] /api/v2/health - 200
```

## What Was Fixed

Changed `apis/main.py` from:
- `app.mount("/api/v2", v2_app)` ❌ (routes not accessible)

To:
- `app.include_router(v2_router, prefix="/api/v2")` ✅
- `app.include_router(smart_scan.router, prefix="/api/v2")` ✅

Routes are now properly registered, but server must restart to load new code.

