# Railway EasyOCR Import Fix

## Problem
Railway service was failing to start with:
```
ModuleNotFoundError: No module named 'easyocr'
```

## Root Cause
The `easyocr` package was intentionally removed from `requirements-prod.txt` to reduce Docker image size (it requires PyTorch which adds ~3-4GB). However, the code was still trying to import it at startup in `ai_services/scanning/scale_detector.py`, causing the service to crash immediately.

## Solution
Made `easyocr` import optional/conditional so the service can start without it. Scale detection features will be disabled, but the rest of the service will function normally.

## Files Changed

### 1. `python_backend/ai_services/scanning/scale_detector.py`
- Made `easyocr` import optional with try/except
- Added `EASYOCR_AVAILABLE` flag
- Modified `ScaleDetectorService.__init__()` to handle missing easyocr gracefully
- Updated `_run_ocr()` and `detect_scale()` to check availability
- Returns error dict when easyocr is not available

### 2. `python_backend/ai_services/vision/ocr_service.py`
- Already handles `easyocr` import gracefully with try/except (no changes needed)

## Impact

### ✅ Service Can Start
- Backend service will start successfully on Railway
- All other features work normally (DXF import, optimization, CNC export, etc.)

### ⚠️ Scale Detection Disabled
- Scale detection API endpoints will return error responses
- Error message: "EasyOCR not available - scale detection is disabled"

### 📝 Future Options
1. **Add easyocr back** (increases image size by ~3-4GB due to PyTorch dependency)
2. **Use pytesseract instead** (already installed, much smaller, but less accurate)
3. **Convert to ONNX** (recommended - use ONNX Runtime which is already installed)

## Testing
After this fix, Railway should:
1. ✅ Build successfully
2. ✅ Start the service (uvicorn starts correctly)
3. ✅ Pass health checks (service responds to `/health`)
4. ✅ Other API endpoints work normally
5. ⚠️ Scale detection endpoints return error (expected)

## Next Steps
1. Push the updated files to trigger Railway rebuild
2. Monitor Railway logs to confirm service starts successfully
3. Verify health checks pass
4. Test other API endpoints to ensure full functionality
5. (Optional) Replace easyocr with pytesseract or ONNX-based OCR for scale detection

