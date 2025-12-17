# Week 0: Image Size Check

## 📊 Checking Optimized Image Size

After building with `requirements-optimized.txt` (removed ortools + pandas), checking final image size.

## 🎯 Expected Results

**Target:** ~1.64GB (90% reduction from 14.8GB)

**Previous sizes:**
- Initial: 14.8GB (with ultralytics + easyocr + PyTorch)
- After removing ultralytics/easyocr: 2.78GB (81% reduction)
- After removing ortools/pandas: ~1.64GB (90% reduction)

## 📋 Verification Steps

1. Check if `almona-final` image exists
2. Check image size
3. Verify packages (no ortools, no pandas, sympy present)
4. Test imports (TensorFlow, ONNX Runtime)

## ✅ Success Criteria

- ✅ Image size: ~1.5-1.7GB
- ✅ No ortools in pip list
- ✅ No pandas in pip list
- ✅ sympy present (required by onnxruntime)
- ✅ TensorFlow working
- ✅ ONNX Runtime working


