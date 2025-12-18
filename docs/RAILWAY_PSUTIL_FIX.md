# Railway Deployment Fix: psutil Import Error

## Problem

The Railway deployment was failing with:
```
ModuleNotFoundError: No module named 'psutil'
```

The error occurred in multiple files when trying to import `psutil`:
1. `python_backend/tasks/monitoring_tasks.py` - line 9: `import psutil`
2. `python_backend/apis/health.py` - line 8: `import psutil`
3. `python_backend/core/health_checks.py` - line 175: `import psutil` (already had try/except)

## Solution

Made `psutil` imports optional in all files, with graceful fallbacks when the library is not available.

### Changes Made

**File 1**: `python_backend/tasks/monitoring_tasks.py`

- Added optional import with `PSUTIL_AVAILABLE` flag
- Modified `system_health_check()` task to skip system resources check when `psutil` is not available
- Added logging to warn when psutil is not available

**File 2**: `python_backend/apis/health.py`

- Added optional import with `PSUTIL_AVAILABLE` flag
- Modified `get_system_metrics()` to return a limited response when `psutil` is not available
- Added logging to warn when psutil is not available

**File 3**: `python_backend/core/health_checks.py`

- Already had try/except around `psutil` import (no changes needed)
- Returns `degraded` status when `psutil` is not available

## Impact

- ✅ **Service can start** even without `psutil`
- ✅ **System monitoring tasks still work** (skip resource monitoring when psutil unavailable)
- ✅ **Health endpoints still work** (return limited metrics when psutil unavailable)
- ✅ **No breaking changes** to the API
- ⚠️ **Functionality**: System resource monitoring (CPU, memory, disk) is disabled when `psutil` is not installed, but this is acceptable for production use

## Why psutil is Optional

`psutil` is a system monitoring library that provides detailed system resource information (CPU, memory, disk usage). While useful for monitoring, it's not critical for the core application functionality:

- **Core features work**: DXF processing, optimization, CNC export all function without psutil
- **Health checks still work**: Database, connection pool, and service checks all function
- **Monitoring is optional**: System resource monitoring is a nice-to-have, not a requirement

## Production Considerations

If you want full system monitoring in production, you can:

1. **Add psutil to requirements-prod.txt** (adds ~5MB to image):
   ```
   psutil==5.9.8
   ```

2. **Or keep it optional**: The application works fine without it, just with limited system metrics

## Related Fixes

This is part of a series of fixes to make optional dependencies truly optional:
- ✅ `ultralytics` (YOLO models) - optional
- ✅ `easyocr` (OCR) - optional  
- ✅ `scipy` (statistical functions) - optional with NumPy fallbacks
- ✅ `psutil` (system monitoring) - optional

All of these allow the service to start and function even when these libraries are not installed, which is critical for a slim production Docker image.

