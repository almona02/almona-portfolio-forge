# Week 0: FOUND IT! easyocr is Pulling in PyTorch

## 🎯 Root Cause Identified

**`easyocr==1.7.1` requires `torch` and `torchvision`!**

```
Requires: torch, torchvision
```

This is why PyTorch (8.7GB) is being installed even though we removed ultralytics!

## ✅ Fix Applied

**Removed `easyocr==1.7.1` from `requirements-prod.txt`**

**Reason:**
- easyocr → requires torch → requires torchvision → requires CUDA (~8GB)
- We already have `pytesseract==0.3.10` which does OCR without PyTorch

## 🔍 Impact Check

Need to verify if easyocr is used in production code. If yes, we'll need to:
1. Use pytesseract instead (already installed)
2. Or find alternative OCR library
3. Or make easyocr optional

## 📋 Next Steps

1. **Rebuild image** (should now be ~180MB)
2. **Check if code uses easyocr** - if yes, update to use pytesseract
3. **Test OCR functionality** with pytesseract

## 🎯 Expected Result After Rebuild

- Image size: ~180MB (down from 14.8GB)
- No torch/torchvision
- No easyocr
- pytesseract available for OCR
- tensorflow-cpu + onnxruntime still installed

## ⚠️ If easyocr is Required

If production code depends on easyocr, we have options:
1. **Use pytesseract** (already in requirements, no PyTorch)
2. **Make easyocr optional** (try easyocr, fallback to pytesseract)
3. **Use CPU-only PyTorch** (still adds ~1GB, but better than 8GB)

