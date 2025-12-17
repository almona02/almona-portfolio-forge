# Week 0: Ultralytics Investigation - Complete Analysis

## 🔍 Investigation Results

### Where ultralytics is Used

1. **`ai_services/part_detection/inference.py`** (Line 11)
   - **Usage:** Main part detection inference
   - **Critical:** YES - Used in production API endpoint
   - **Can replace:** YES - Already have ONNX conversion code

2. **`ai_services/model_manager.py`** (Line 10)
   - **Usage:** Model loading
   - **Critical:** YES - Loads models for inference
   - **Can replace:** YES - Can load ONNX models instead

3. **`ai_services/optimization/model_converter.py`** (Line 72)
   - **Usage:** Converts YOLO models to ONNX
   - **Critical:** NO - Only used for conversion (one-time task)
   - **Can replace:** Keep in dev only

### Key Finding: ONNX Conversion Already Exists!

**`model_converter.py` already has:**
- `convert_yolo_to_onnx()` method
- ONNX Runtime inference support
- Production optimization code

**This means:** We can convert models ONCE and use ONNX Runtime for inference!

## 📊 Current State

### Model Files Found
- `ai_services/part_detection/models/model.pt` - YOLO model (needs conversion)
- No `.onnx` files found (need to create)

### Dependencies
- ✅ `onnxruntime==1.20.0` - Already in requirements-prod.txt
- ✅ `onnx==1.17.0` - Already in requirements-prod.txt
- ❌ `ultralytics==8.3.40` - Pulls in PyTorch + CUDA (~3-4GB)

## ✅ Solution: Convert to ONNX

### Step 1: Convert Model (One-Time, Run in Dev)

```python
# Run this ONCE on your development machine
from ai_services.optimization.model_converter import ModelOptimizer

converter = ModelOptimizer()
result = converter.convert_yolo_to_onnx(
    model_path="ai_services/part_detection/models/model.pt",
    output_path="ai_services/part_detection/models/model.onnx"
)

print(result)
# Expected: {"success": True, "onnx_path": "...", ...}
```

### Step 2: Update Code to Use ONNX

**File: `ai_services/part_detection/inference.py`**

Replace YOLO with ONNX Runtime:
```python
# OLD (Line 11):
from ultralytics import YOLO

# NEW:
import onnxruntime as ort
import numpy as np
```

**File: `ai_services/model_manager.py`**

Replace YOLO loading with ONNX:
```python
# OLD (Line 37):
def load_model(self, model_name: str = "yolov8n.pt") -> YOLO:

# NEW:
def load_model(self, model_name: str = "model.onnx") -> ort.InferenceSession:
```

### Step 3: Remove ultralytics from Production

**File: `python_backend/requirements-prod.txt`**

Remove line 70:
```txt
# ultralytics==8.3.40  # ❌ REMOVE - Use ONNX instead
```

**File: `python_backend/requirements-dev.txt`**

Keep it for model conversion:
```txt
ultralytics==8.3.40  # ✅ Keep for dev (model conversion only)
```

## 📋 Action Plan

### Immediate (Do Now)

1. **Remove ultralytics from production:**
   ```bash
   sed -i '/ultralytics==8.3.40/d' python_backend/requirements-prod.txt
   ```

2. **Verify removal:**
   ```bash
   grep -i "ultralytics\|torch\|cuda" python_backend/requirements-prod.txt
   # Should return nothing
   ```

3. **Build clean image:**
   ```bash
   cd python_backend
   export DOCKER_BUILDKIT=1
   docker build --no-cache -f Dockerfile.prod.slim -t almona-backend:slim .
   ```

**Expected Result:** ~180MB image (down from 15GB)

### Next (After Build Works)

4. **Convert model to ONNX** (run in dev environment)
5. **Update inference code** to use ONNX Runtime
6. **Test part detection API** with ONNX model

## 🎯 Why This Works

1. **ONNX Runtime is already in requirements** - No new dependencies
2. **Conversion code already exists** - Just need to run it once
3. **ONNX is faster for CPU** - Better for production
4. **No PyTorch needed** - Saves 3-4GB

## ⚠️ Important Notes

- **Model conversion is ONE-TIME** - Do it in dev, commit the .onnx file
- **Keep ultralytics in dev** - For future model conversions
- **ONNX Runtime is CPU-optimized** - Perfect for Egyptian workshops
- **Same accuracy** - ONNX is just a different format, not a different model

## 📊 Size Comparison

| Component | With ultralytics | With ONNX | Savings |
|-----------|------------------|-----------|---------|
| PyTorch + CUDA | ~3-4GB | 0MB | 100% |
| ultralytics | ~500MB | 0MB | 100% |
| ONNX Runtime | ~150MB | ~150MB | 0% |
| **Total** | **~15GB** | **~180MB** | **99%** |

