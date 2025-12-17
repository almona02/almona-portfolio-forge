# Week 0: Root Cause Analysis - Image Size Issue

## The Real Problem

**Image Size:** 15GB instead of 180MB  
**Root Cause:** `ultralytics==8.3.40` in `requirements-prod.txt` pulls in PyTorch + CUDA packages

## What's Happening

1. **`ultralytics` dependency chain:**
   ```
   ultralytics → torch → CUDA libraries → NVIDIA packages
   ```
   - Even CPU builds of PyTorch download CUDA libraries (~2-3GB)
   - This is why you see NVIDIA packages being downloaded

2. **Where it's used:**
   - `ai_services/part_detection/inference.py` - YOLO model inference
   - `ai_services/model_manager.py` - Model management
   - `ai_services/optimization/model_converter.py` - Model conversion

3. **The TODO comment says:**
   ```python
   # NOTE: ultralytics is temporarily included for inference
   # TODO: Convert YOLO models to ONNX format and remove ultralytics
   ```

## Solutions (Choose One)

### Option 1: Use CPU-Only PyTorch (Quick Fix)
Replace `ultralytics==8.3.40` with CPU-only version:
```txt
# In requirements-prod.txt, replace:
ultralytics==8.3.40

# With:
--extra-index-url https://download.pytorch.org/whl/cpu
torch>=2.0.0+cpu
torchvision>=0.15.0+cpu
ultralytics==8.3.40
```
**Result:** Reduces download from ~3GB to ~500MB (still large but better)

### Option 2: Remove ultralytics (Best Long-term)
1. Convert YOLO models to ONNX format (as TODO suggests)
2. Use `onnxruntime` (already in requirements) for inference
3. Remove `ultralytics` from `requirements-prod.txt`
**Result:** Saves ~2-3GB, image should be ~180MB

### Option 3: Make ultralytics Optional (Safest)
1. Remove `ultralytics` from `requirements-prod.txt`
2. Add try/except in code that uses it
3. Fall back to ONNX if ultralytics not available
**Result:** Works with or without ultralytics

## About the Cache Confusion

**Why I said different things:**
1. **First build without cache:** Needed to establish clean baseline
2. **Build with cache:** For subsequent builds (faster)
3. **Build without cache again:** Only if image is still wrong size

**The real issue:** It's not about cache - it's about `ultralytics` pulling in too much.

## Recommendation

**Immediate:** Use Option 1 (CPU-only PyTorch) to reduce size now  
**Long-term:** Implement Option 2 (convert to ONNX) to reach 180MB target

## Next Steps

1. Check if part detection is critical for production
2. If yes → Use Option 1 now, plan Option 2
3. If no → Use Option 3 (make optional)

