# Backend Route 404 Fix

## Problem

Getting 404 errors for:
- `/api/v2/profile-import/ingest`
- `/api/v2/smart-scan/single`
- `/api/v2/smart-scan/supported-formats`

## Root Cause

The startup scripts were using `uvicorn apis.v2.app:v2_app` which runs the v2 app **directly** without the `/api/v2` prefix. The routes are then at:
- `/profile-import/ingest` (not `/api/v2/profile-import/ingest`)
- `/smart-scan/single` (not `/api/v2/smart-scan/single`)

But the frontend expects routes under `/api/v2/...`.

## Solution

Use the **main app** (`apis.main:app`) which mounts v2_app under `/api/v2`:

```bash
# OLD (wrong):
python -m uvicorn apis.v2.app:v2_app --host 0.0.0.0 --port 8003 --reload

# NEW (correct):
python -m uvicorn apis.main:app --host 0.0.0.0 --port 8003 --reload
```

## Updated Files

✅ `python_backend/start_backend_simple.bat`
✅ `python_backend/start_backend_simple.sh`
✅ `python_backend/restart_services.bat`
✅ `python_backend/restart_services.sh`
✅ `python_backend/test_dxf_import.py`
✅ `LOCAL_TESTING_GUIDE.md`

## How to Test

1. **Stop the current backend** (if running)
2. **Start with the updated script:**
   ```bash
   cd python_backend
   start_backend_simple.bat  # Windows
   # or
   ./start_backend_simple.sh  # Linux/Mac
   ```
3. **Verify routes are accessible:**
   - `http://localhost:8003/api/v2/profile-import/ingest` should exist
   - `http://localhost:8003/api/v2/smart-scan/single` should exist
   - `http://localhost:8003/docs` should show all routes under `/api/v2`

## Why This Works

The `apis/main.py` file mounts v2_app under `/api/v2`:

```python
app.mount("/api/v2", v2_app)
```

So when you use `apis.main:app`, all v2 routes are automatically prefixed with `/api/v2`.

## Alternative (Not Recommended)

If you must use `apis.v2.app:v2_app` directly, you'd need to:
1. Update all frontend API calls to remove `/api/v2` prefix
2. Or add a root redirect/middleware to handle the prefix

But using the main app is the correct approach.

