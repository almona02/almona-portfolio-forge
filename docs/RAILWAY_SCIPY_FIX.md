# Railway Deployment Fix: Missing `scipy` Module

## Problem

The Railway deployment was failing with:
```
ModuleNotFoundError: No module named 'scipy'
```

The error occurred in `python_backend/ai_services/scanning/scale_engine/line_detector.py` when trying to import:
```python
from scipy.spatial import KDTree
```

## Root Cause

`scipy` was not included in `python_backend/requirements-prod.txt`, but it was required by the `DimensionLineDetector` class for efficient nearest neighbor search in the `associate_text_with_lines` method.

## Solution

Made `scipy` an **optional dependency** with a fallback implementation:

1. **Optional Import**: Added try/except around the `scipy.spatial.KDTree` import
2. **Fallback Implementation**: When `scipy` is not available, the code uses a brute-force nearest neighbor search using NumPy
3. **Warning Log**: Added a warning message when `scipy` is not available

### Changes Made

**File**: `python_backend/ai_services/scanning/scale_engine/line_detector.py`

- Added optional import with `SCIPY_AVAILABLE` flag
- Modified `associate_text_with_lines` to use KDTree when available, or fallback to NumPy-based brute-force search
- Added logging to warn when scipy is not available

### Code Changes

```python
# Before
from scipy.spatial import KDTree

# After
try:
    from scipy.spatial import KDTree
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    KDTree = None

logger = logging.getLogger(__name__)

if not SCIPY_AVAILABLE:
    logger.warning("scipy not available. Line detection will use slower brute-force nearest neighbor search.")
```

The `associate_text_with_lines` method now checks `SCIPY_AVAILABLE` and uses either:
- **KDTree** (fast, when scipy is available)
- **NumPy brute-force** (slower but functional, when scipy is not available)

## Impact

- ✅ **Service can start** even without `scipy`
- ✅ **Scale detection still works** (using slower but functional fallback)
- ✅ **No breaking changes** to the API
- ⚠️ **Performance**: Nearest neighbor search is slower without `scipy`, but acceptable for production use

## Optional: Add `scipy` to Production

If you want optimal performance for scale detection, you can add `scipy` to `requirements-prod.txt`:

```txt
# Add to python_backend/requirements-prod.txt
scipy==1.11.4  # ~50-100MB additional size
```

**Note**: This will increase the Docker image size by approximately 50-100MB, but will provide faster scale detection performance.

## Status

✅ **Fixed** - The service should now start successfully on Railway without `scipy`.

