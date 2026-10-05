# 🔴 URGENT: Multiple Servers Running - Kill All

## Problem Found

There are **TWO server processes** running on port 8003:
- PID 23892
- PID 30040

This is causing conflicts and 404 errors!

## Solution: Kill All and Restart

### Step 1: Kill All Processes on Port 8003

**Windows PowerShell:**
```powershell
# Find and kill all processes
Get-NetTCPConnection -LocalPort 8003 -ErrorAction SilentlyContinue | 
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

**Windows CMD:**
```cmd
for /f "tokens=5" %a in ('netstat -ano ^| findstr :8003 ^| findstr LISTENING') do taskkill /F /PID %a
```

**Or use Task Manager:**
1. Open Task Manager (Ctrl+Shift+Esc)
2. Find all `python.exe` processes
3. End all of them

### Step 2: Verify Port is Free

```cmd
netstat -ano | findstr :8003
```

Should show **nothing** (port is free).

### Step 3: Restart Cleanly

```bash
cd python_backend
python -m uvicorn apis.main:app --host 0.0.0.0 --port 8003 --reload
```

**Or use the kill script:**
```bash
cd python_backend
kill_and_restart.bat
```

### Step 4: Verify It Works

After restart, test:
```bash
cd python_backend
python verify_routes.py
```

Should show:
```
[OK] /api/v2/smart-scan/supported-formats - 200
[OK] /api/v2/profile-import/ingest - 405
[OK] /api/v2/health - 200
```

## Why This Happened

Multiple server instances were started (probably from different terminals or scripts), and they're all trying to use port 8003. Only one can actually serve requests, and it's likely the old one without the route fixes.

## Prevention

- Always check if port 8003 is free before starting
- Use the `kill_and_restart.bat` script to ensure clean restarts
- Close all terminal windows before starting a new server

