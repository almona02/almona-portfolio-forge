# 🔴 URGENT: Backend Server Must Be Restarted

## Current Status

Your backend server is **STILL running with the old command** (`apis.v2.app:v2_app`).

This is why you're getting 404 errors:
- ❌ `/api/v2/smart-scan/supported-formats` → 404
- ❌ `/api/v2/profile-import/ingest` → 404

## The Problem

The server is running:
```bash
python -m uvicorn apis.v2.app:v2_app --host 0.0.0.0 --port 8003
```

This makes routes available at:
- ✅ `/smart-scan/supported-formats` (works, but wrong path)
- ✅ `/profile-import/ingest` (works, but wrong path)

But frontend expects:
- ❌ `/api/v2/smart-scan/supported-formats` (404 - not found)
- ❌ `/api/v2/profile-import/ingest` (404 - not found)

## The Solution

### Step 1: Find and Stop the Current Server

**Option A: If running in a terminal window**
1. Find the terminal/command prompt where the backend is running
2. Press `Ctrl+C` to stop it

**Option B: If running in background**
1. Find the process:
   ```bash
   # Windows PowerShell:
   Get-Process python | Where-Object {$_.Path -like "*python_backend*"}
   
   # Or check Task Manager for python.exe processes
   ```
2. Kill the process (use Task Manager or `taskkill /F /PID <process_id>`)

### Step 2: Restart with Correct Command

**Windows:**
```bash
cd python_backend
start_backend_simple.bat
```

**Or manually:**
```bash
cd python_backend
python -m uvicorn apis.main:app --host 0.0.0.0 --port 8003 --reload
```

**Linux/Mac:**
```bash
cd python_backend
./start_backend_simple.sh
```

### Step 3: Verify It's Working

After restart, run:
```bash
cd python_backend
python check_backend_routes.py
```

You should see:
```
[OK] /api/v2/smart-scan/supported-formats - Status: 200
[OK] /api/v2/profile-import/ingest - Status: 405
[OK] Backend is running with apis.main:app
```

### Step 4: Test in Browser

Open browser console and check:
- ✅ No more 404 errors
- ✅ Routes work at `/api/v2/...`

## Why This Happens

- `apis.v2.app:v2_app` → Routes at `/smart-scan/...` (no prefix)
- `apis.main:app` → Routes at `/api/v2/smart-scan/...` (with prefix)

The `apis/main.py` file mounts `v2_app` under `/api/v2`:
```python
app.mount("/api/v2", v2_app)
```

So you **MUST** use `apis.main:app` for routes to have the `/api/v2` prefix.

## Still Not Working?

If you've restarted but still get 404s:

1. **Check which app is actually running:**
   ```bash
   curl http://localhost:8003/api/v2/health
   ```
   - If 404 → Still running old app
   - If 200 → Running new app (but routes might not be registered)

2. **Check if routes are registered:**
   ```bash
   curl http://localhost:8003/docs
   ```
   - Should show OpenAPI docs with `/api/v2/...` routes

3. **Check backend logs** for any import errors or route registration issues

## Quick Test

Run this to verify:
```bash
curl http://localhost:8003/api/v2/smart-scan/supported-formats
```

**Expected:** JSON response with supported formats
**If 404:** Backend is still running old command - RESTART IT!

