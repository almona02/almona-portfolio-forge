# Railway Import Errors - Complete Fix Summary

## Overview
This document summarizes all import errors that were preventing Railway deployment and their fixes.

## Issues Found and Fixed

### 1. ✅ `ModuleNotFoundError: No module named 'tasks'`
**File:** `python_backend/Dockerfile.realistic`  
**Fix:** Added `COPY tasks/ tasks/` and `COPY celery_app.py celery_app.py` to Dockerfile  
**Status:** ✅ Fixed

### 2. ✅ `ModuleNotFoundError: No module named 'ultralytics'`
**Files:**
- `python_backend/ai_services/part_detection/inference.py`
- `python_backend/ai_services/model_manager.py`
- `python_backend/apis/v2/part_detection_fastapi.py`

**Fix:** Made `ultralytics` import optional with try/except, added availability checks  
**Status:** ✅ Fixed  
**Impact:** Part detection disabled (returns HTTP 503)

### 3. ✅ `ModuleNotFoundError: No module named 'easyocr'`
**File:** `python_backend/ai_services/scanning/scale_detector.py`  
**Fix:** Made `easyocr` import optional with try/except, added availability checks  
**Status:** ✅ Fixed  
**Impact:** Scale detection disabled (returns error dict)

### 4. ✅ `ModuleNotFoundError: No module named 'torch'` (Preventive)
**File:** `python_backend/ai_services/part_detection/tasks.py`  
**Fix:** Made `torch` import optional with try/except, added task-level check  
**Status:** ✅ Fixed (Preventive - would have failed when Celery task is called)  
**Impact:** Part detection Celery task returns error if torch unavailable

## Packages Removed from Production (Expected Behavior)

These packages were intentionally removed from `requirements-prod.txt` to reduce Docker image size:

1. **`ultralytics`** - Requires PyTorch (~3-4GB)
2. **`easyocr`** - Requires PyTorch (~3-4GB)
3. **`torch` / `torchvision`** - Large ML framework (~3-4GB)

**Reason:** Production uses `tensorflow-cpu` and `onnxruntime` for ML inference, which are much smaller.

## Packages Already Handled Gracefully

These packages are already imported with try/except and won't cause startup failures:

1. **`potracer`** - Handled in `ai_services/scanning/profile_scan.py` and `ai_services/vision/profile_scanner.py`
2. **`easyocr`** - Also handled in `ai_services/vision/ocr_service.py` (fallback to pytesseract)

## Verification Checklist

After these fixes, verify:

- [x] ✅ `tasks/` directory copied to Docker image
- [x] ✅ `celery_app.py` copied to Docker image
- [x] ✅ `ultralytics` import optional (won't crash startup)
- [x] ✅ `easyocr` import optional (won't crash startup)
- [x] ✅ `torch` import optional (won't crash startup)
- [x] ✅ All other imports are from packages in `requirements-prod.txt`

## Testing

After deployment, verify:

1. ✅ Service starts successfully (no import errors)
2. ✅ Health checks pass (`/health` endpoint)
3. ✅ Core features work (DXF import, optimization, CNC export)
4. ⚠️ Part detection returns HTTP 503 (expected - ultralytics not available)
5. ⚠️ Scale detection returns error (expected - easyocr not available)

## Future Improvements

1. **Convert YOLO models to ONNX** - Use ONNX Runtime (already installed) instead of ultralytics
2. **Use pytesseract for OCR** - Replace easyocr with pytesseract (already installed)
3. **Add feature flags** - Allow enabling/disabling optional features via environment variables

## Files Modified

1. `python_backend/Dockerfile.realistic` - Added tasks/ and celery_app.py
2. `python_backend/ai_services/part_detection/inference.py` - Optional ultralytics
3. `python_backend/ai_services/model_manager.py` - Optional ultralytics
4. `python_backend/apis/v2/part_detection_fastapi.py` - Handle unavailable PartDetector
5. `python_backend/ai_services/scanning/scale_detector.py` - Optional easyocr
6. `python_backend/ai_services/part_detection/tasks.py` - Optional torch

## Summary

All known import errors have been fixed. The service should now start successfully on Railway, with optional ML features gracefully disabled when their dependencies are unavailable.

