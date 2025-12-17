# Week 0: Immediate Fix - Remove ultralytics

## 🔍 Investigation Complete

### Where ultralytics is Used

1. **`ai_services/part_detection/inference.py`** - Production inference (CRITICAL)
2. **`ai_services/model_manager.py`** - Model loading
3. **`ai_services/optimization/model_converter.py`** - Model conversion (has ONNX code!)

### Key Finding

**✅ ONNX conversion code already exists in `model_converter.py`!**

This means:
- We can convert YOLO models to ONNX (one-time task)
- Use ONNX Runtime for inference (already in requirements)
- Remove ultralytics from production NOW

## ✅ IMMEDIATE FIX (Do This Now)

### Step 1: Remove ultralytics from Production

```bash
cd python_backend
sed -i '/ultralytics==8.3.40/d' requirements-prod.txt
```

### Step 2: Verify Removal

```bash
grep -i "ultralytics\|torch\|cuda" requirements-prod.txt
# Should return: NOTHING (empty)
```

### Step 3: Build Clean Image

```bash
export DOCKER_BUILDKIT=1
docker build --no-cache -f Dockerfile.prod.slim -t almona-backend:slim .
```

**Expected Result:** ~180MB (down from 15GB) ✅

## 📋 What Happens Next

### After Build Works (Later Tasks)

1. **Convert model to ONNX** (run once in dev):
   ```python
   from ai_services.optimization.model_converter import ModelOptimizer
   converter = ModelOptimizer()
   converter.convert_yolo_to_onnx("ai_services/part_detection/models/model.pt")
   ```

2. **Update code** to use ONNX Runtime instead of YOLO

3. **Test** part detection API

## 🎯 Why This Works

- **ONNX Runtime already in requirements** - No new deps needed
- **Conversion code exists** - Just run it once
- **ONNX is CPU-optimized** - Perfect for production
- **Saves 3-4GB** - Removes PyTorch + CUDA

## ⚠️ Important

- **Part detection will break temporarily** until we update code to ONNX
- **This is OK** - We fix the image size first, then fix the code
- **ultralytics stays in dev** - For model conversion only

