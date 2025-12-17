# Week 0: Size Issue Analysis - 2.78GB (Still Too Large)

## 🚨 Issue

**Image size: 2.78GB** (expected ~450MB)

## 🔍 Analysis

### Large Packages (1.8GB total in `/root/.local`)

| Package | Size | Status | Notes |
|---------|------|--------|-------|
| **tensorflow** | 971MB | ❌ TOO BIG | Expected ~350MB for CPU version |
| **pandas** | 79MB | ⚠️ DEPENDENCY | Required by ortools |
| **sympy** | 80MB | ⚠️ DEPENDENCY | Required by onnxruntime |
| **ortools** | 60MB | ✅ NEEDED | Optimization engine |
| **opencv** | 137MB | ✅ NEEDED | Computer vision |
| **numpy** | 42MB | ✅ NEEDED | ML base |

**Total:** ~1.4GB of large packages

### Why tensorflow is 971MB?

**Possible causes:**
1. **Not actually CPU-only:** Maybe full tensorflow installed
2. **Includes extras:** tensorflow-cpu with extra dependencies
3. **Cached installation:** Old cached packages used

### pandas/sympy Required By

- **pandas (79MB):** Required by `ortools` (optimization)
- **sympy (80MB):** Required by `onnxruntime` (ML inference)

## ✅ Solutions

### Option 1: Remove ortools (Saves ~140MB)
```txt
# Remove from requirements-minimal.txt
# ortools==9.8.3296  # Remove if not needed
# pandas will be removed too
```
**Result:** ~450MB image

### Option 2: Investigate tensorflow
```bash
# Check what's actually installed
docker run --rm --user root almona-180mb pip show tensorflow
docker run --rm --user root almona-180mb python -c "import tensorflow as tf; print(tf.config.list_physical_devices())"
```

### Option 3: Accept 2.78GB
- Still 81% reduction (14.8GB → 2.78GB)
- All ML capabilities work
- Reasonable for production ML backend

## 📋 Recommendation

**For immediate progress:** Remove ortools to reach ~450MB target.

**Check if ortools is used:**
```bash
grep -r "ortools\|from ortools" python_backend/ || echo "ortools not used in code"
```

If not used, remove it. If used, keep and accept larger size.

