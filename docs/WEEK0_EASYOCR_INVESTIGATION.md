# Week 0: Investigating easyocr as PyTorch Source

## 🔍 Hypothesis

**`easyocr==1.7.1` might be pulling in PyTorch as a dependency!**

EasyOCR can use PyTorch for GPU acceleration, and some versions have PyTorch as an optional or default dependency.

## ✅ Test: Remove easyocr Temporarily

Let's test if easyocr is the culprit by temporarily removing it from requirements-prod.txt and rebuilding.

### Step 1: Comment Out easyocr

Edit `python_backend/requirements-prod.txt`:

**Change:**
```txt
easyocr==1.7.1
```

**To:**
```txt
# easyocr==1.7.1  # TEMPORARILY DISABLED - Testing if this pulls in PyTorch
```

### Step 2: Rebuild

```powershell
docker rmi almona-backend:slim
docker builder prune -a -f
docker buildx prune -a -f
cd python_backend
$env:DOCKER_BUILDKIT=1
docker build --no-cache --pull -f Dockerfile.prod.slim -t almona-backend:slim .
```

### Step 3: Check Result

```powershell
docker images almona-backend:slim
docker run --rm --user root almona-backend:slim pip list | Select-String -Pattern "torch|easyocr"
```

**If image is ~180MB and no torch:** easyocr was the problem!

## 🔧 Alternative: Use easyocr Without PyTorch

If easyocr is the issue, we can:
1. Use `pytesseract` only (already in requirements)
2. Or install easyocr without PyTorch dependencies
3. Or use a different OCR library

## 📋 Next Steps

1. Test removing easyocr
2. If that fixes it, find OCR alternative
3. If not, investigate other packages

