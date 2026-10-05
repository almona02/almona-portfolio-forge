# 🔴 URGENT: Restart Backend Server

## Current Issue

Your backend is running with the **old command** (`apis.v2.app:v2_app`), so routes are at:
- ❌ `/smart-scan/supported-formats` (works but wrong path)
- ❌ `/profile-import/ingest` (works but wrong path)

But frontend expects:
- ✅ `/api/v2/smart-scan/supported-formats`
- ✅ `/api/v2/profile-import/ingest`

## Quick Fix

### Step 1: Stop Current Server
Press `Ctrl+C` in the terminal where the backend is running.

### Step 2: Restart with Updated Script

**Windows:**
```bash
cd python_backend
start_backend_simple.bat
```

**Linux/Mac:**
```bash
cd python_backend
./start_backend_simple.sh
```

### Step 3: Verify Routes Work

After restart, test:
```bash
curl http://localhost:8003/api/v2/smart-scan/supported-formats
```

Should return JSON (not 404).

## What Changed

The startup scripts now use:
```bash
python -m uvicorn apis.main:app --host 0.0.0.0 --port 8003 --reload
```

Instead of:
```bash
python -m uvicorn apis.v2.app:v2_app --host 0.0.0.0 --port 8003 --reload
```

The `apis.main:app` mounts v2_app under `/api/v2`, so all routes get the correct prefix.

## If You're Running Manually

If you started the server manually, use:
```bash
cd python_backend
python -m uvicorn apis.main:app --host 0.0.0.0 --port 8003 --reload
```

**NOT:**
```bash
python -m uvicorn apis.v2.app:v2_app --host 0.0.0.0 --port 8003 --reload  # ❌ OLD
```

