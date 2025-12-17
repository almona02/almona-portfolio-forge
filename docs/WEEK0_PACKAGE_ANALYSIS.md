# Week 0: Package Dependency Analysis

## The Issue Explained

### What's Happening

1. **`ultralytics==8.3.40`** is in `requirements-prod.txt` (line 70)
2. **`ultralytics` requires `torch` (PyTorch)**
3. **`torch` downloads CUDA libraries** even for CPU builds
4. **Result:** 15GB image instead of 180MB

### Why NVIDIA Packages Are Downloaded

**PyTorch dependency chain:**
```
ultralytics → torch → torchvision → CUDA libraries
```

Even when installing `torch` for CPU, pip downloads:
- `torch` (~500MB)
- `torchvision` (~200MB)  
- CUDA runtime libraries (~2-3GB) - **EVEN FOR CPU BUILDS**
- NVIDIA cuDNN libraries (~500MB)
- Other CUDA dependencies

**Total:** ~3-4GB just for PyTorch ecosystem

## Package Verification

### ✅ NEEDED Packages (Keep These)

| Package | Size | Why Needed |
|---------|------|------------|
| `tensorflow-cpu` | ~400MB | ML inference (already optimized) |
| `opencv-python-headless` | ~50MB | Computer vision |
| `easyocr` | ~100MB | OCR (can use CPU) |
| `onnxruntime` | ~50MB | Model inference (lightweight) |
| `fastapi` | ~5MB | API framework |
| `supabase` | ~10MB | Database client |

### ❌ PROBLEMATIC Package (This is the issue)

| Package | Size | Problem | Solution |
|---------|------|---------|----------|
| `ultralytics==8.3.40` | **~3-4GB** | Pulls in PyTorch + CUDA | Remove or use CPU-only |

### 🔍 Where ultralytics is Used

1. **`ai_services/part_detection/inference.py`**
   - Line 11: `from ultralytics import YOLO`
   - Used for: Part detection in images
   - **Can be replaced:** Convert YOLO model to ONNX

2. **`ai_services/model_manager.py`**
   - Line 10: `from ultralytics import YOLO`
   - Used for: Model loading
   - **Can be replaced:** Use ONNX runtime

3. **`ai_services/optimization/model_converter.py`**
   - Line 72: `from ultralytics import YOLO`
   - Used for: Model conversion
   - **Can be replaced:** Use ONNX conversion tools

## Solutions (Ranked by Impact)

### Solution 1: Remove ultralytics (BEST - Saves 3-4GB)

**Steps:**
1. Convert YOLO models to ONNX format (one-time task)
2. Use `onnxruntime` (already in requirements) for inference
3. Remove `ultralytics==8.3.40` from `requirements-prod.txt`

**Result:** Image size: **~180MB** ✅

**Code changes needed:**
- Replace `YOLO()` calls with ONNX runtime
- Update model loading logic

### Solution 2: Use CPU-Only PyTorch (QUICK FIX - Saves 2GB)

**Steps:**
1. In `requirements-prod.txt`, add before `ultralytics`:
   ```txt
   --extra-index-url https://download.pytorch.org/whl/cpu
   torch>=2.0.0+cpu
   torchvision>=0.15.0+cpu
   ```
2. This forces CPU-only PyTorch (no CUDA)

**Result:** Image size: **~500MB** (better, but not ideal)

### Solution 3: Make ultralytics Optional (SAFEST - No Breaking Changes)

**Steps:**
1. Remove `ultralytics` from `requirements-prod.txt`
2. Add try/except in code:
   ```python
   try:
       from ultralytics import YOLO
       HAS_ULTRALYTICS = True
   except ImportError:
       HAS_ULTRALYTICS = False
       # Fall back to ONNX
   ```
3. Use ONNX as fallback

**Result:** Works with or without ultralytics

## Recommendation

**For immediate fix:** Use Solution 2 (CPU-only PyTorch)  
**For long-term:** Implement Solution 1 (remove ultralytics, use ONNX)

## Verification Commands

After fixing, verify package sizes:
```bash
# Check installed package sizes
docker run --rm almona-backend:slim du -sh /root/.local/lib/python3.11/site-packages/* | sort -h

# Check total image size
docker images almona-backend:slim
```

## Next Action

**Choose one:**
1. Remove ultralytics (I'll help convert to ONNX)
2. Use CPU-only PyTorch (quick fix)
3. Make ultralytics optional (safest)

