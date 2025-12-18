# Railway Ultralytics Import Fix

## Problem
Railway service was failing to start with:
```
ModuleNotFoundError: No module named 'ultralytics'
```

## Root Cause
The `ultralytics` package was intentionally removed from `requirements-prod.txt` to reduce Docker image size (it pulls in PyTorch which adds ~3-4GB). However, the code was still trying to import it at startup, causing the service to crash immediately.

## Solution
Made `ultralytics` imports optional/conditional so the service can start without it. Part detection features will be disabled, but the rest of the service will function normally.

## Files Changed

### 1. `python_backend/ai_services/part_detection/inference.py`
- Made `ultralytics` import optional with try/except
- Added `ULTRALYTICS_AVAILABLE` flag
- Modified `PartDetector.__init__()` to handle missing ultralytics gracefully
- Updated `detect()`, `detect_parts()`, and `get_model_info()` to check availability
- Returns empty results or raises helpful errors when ultralytics is not available

### 2. `python_backend/ai_services/model_manager.py`
- Made `ultralytics` import optional with try/except
- Modified `load_model()` to return `None` if ultralytics is not available
- Added proper error handling

### 3. `python_backend/apis/v2/part_detection_fastapi.py`
- Added check for `part_detector.model is None`
- Returns HTTP 503 with helpful message when part detection is unavailable

## Impact

### ✅ Service Can Start
- Backend service will start successfully on Railway
- All other features work normally (DXF import, optimization, CNC export, etc.)

### ⚠️ Part Detection Disabled
- Part detection API endpoints will return HTTP 503
- Error message: "Part detection service is currently unavailable. ultralytics package is not installed in production."

### 📝 Future Options
1. **Add ultralytics back** (increases image size by ~3-4GB)
2. **Convert YOLO models to ONNX** (recommended - see `requirements-prod.txt` line 77)
3. **Use ONNX Runtime** (already installed, much smaller)

## Testing
After this fix, Railway should:
1. ✅ Build successfully
2. ✅ Start the service (uvicorn starts correctly)
3. ✅ Pass health checks (service responds to `/health`)
4. ✅ Other API endpoints work normally
5. ⚠️ Part detection endpoints return 503 (expected)

## Next Steps
1. Push the updated files to trigger Railway rebuild
2. Monitor Railway logs to confirm service starts successfully
3. Verify health checks pass
4. Test other API endpoints to ensure full functionality
5. (Optional) Convert YOLO models to ONNX format for part detection

