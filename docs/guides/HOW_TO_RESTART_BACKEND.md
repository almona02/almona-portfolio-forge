# How to Restart Backend Server (Step by Step)

## Current Problem

The backend is **STILL running with the old command**. The diagnostic shows:
```
[FAIL] Backend is running with apis.v2.app:v2_app
Routes are NOT under /api/v2 prefix
```

## Solution: Force Restart

### Option 1: Use the Force Restart Script (Recommended)

**Windows:**
```bash
cd python_backend
force_restart_backend.bat
```

**Linux/Mac:**
```bash
cd python_backend
./force_restart_backend.sh
```

This script will:
1. Kill any existing processes on port 8003
2. Wait 2 seconds
3. Start the server with the correct command (`apis.main:app`)

### Option 2: Manual Restart

**Step 1: Find and Kill Existing Process**

**Windows PowerShell:**
```powershell
# Find process using port 8003
netstat -ano | findstr :8003

# Kill the process (replace PID with actual process ID)
taskkill /F /PID <PID>
```

**Windows CMD:**
```cmd
# Find and kill
for /f "tokens=5" %a in ('netstat -ano ^| findstr :8003') do taskkill /F /PID %a
```

**Linux/Mac:**
```bash
# Find and kill
lsof -ti:8003 | xargs kill -9
```

**Step 2: Verify Port is Free**
```bash
# Windows
netstat -ano | findstr :8003

# Linux/Mac
lsof -i:8003
```

Should show nothing (port is free).

**Step 3: Start Server with Correct Command**

```bash
cd python_backend
python -m uvicorn apis.main:app --host 0.0.0.0 --port 8003 --reload
```

**IMPORTANT:** Make sure you see this in the startup logs:
```
INFO:     Uvicorn running on http://0.0.0.0:8003
INFO:     Application startup complete.
```

**NOT:**
```
INFO:     Started server process
INFO:     Waiting for application startup.
```

### Option 3: Check What's Actually Running

If you're not sure what's running, check:

**Windows:**
```powershell
Get-Process python | Select-Object Id, ProcessName, Path
```

**Linux/Mac:**
```bash
ps aux | grep uvicorn
```

Look for the command - it should show `apis.main:app`, NOT `apis.v2.app:v2_app`.

## Verification

After restarting, run:
```bash
cd python_backend
python check_backend_routes.py
```

**Expected output:**
```
[OK] /api/v2/smart-scan/supported-formats - Status: 200
[OK] /api/v2/profile-import/ingest - Status: 405
[OK] Backend is running with apis.main:app
```

**If you still see [FAIL]:**
- The old server is still running
- Kill it more aggressively
- Check Task Manager (Windows) or Activity Monitor (Mac) for python.exe processes
- Make sure you're starting the server in the `python_backend` directory

## Common Issues

### Issue 1: "Port already in use"
**Solution:** Kill the existing process (see Option 2, Step 1)

### Issue 2: "Module not found"
**Solution:** Make sure you're in the `python_backend` directory and have dependencies installed:
```bash
cd python_backend
pip install -r requirements.txt
```

### Issue 3: "Routes still 404 after restart"
**Solution:** 
1. Verify the startup command shows `apis.main:app`
2. Check backend logs for any import errors
3. Try accessing `http://localhost:8003/docs` - should show OpenAPI docs

## Quick Test

After restart, test directly:
```bash
curl http://localhost:8003/api/v2/smart-scan/supported-formats
```

**Expected:** JSON with supported formats
**If 404:** Server is still running old command - kill it and restart!

