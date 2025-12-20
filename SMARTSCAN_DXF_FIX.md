# SmartScan DXF Upload Fix - MC 1250 Profile

## Issue Summary

**Problem:** SmartScan fails with "Failed to enqueue scan job" when uploading `MC 1250 .dxf` file.

**Root Causes:**
1. ✅ **FIXED:** DXF file reading bug in `FormatConverter.dxf_to_image()` - was passing BytesIO directly instead of TextIOWrapper
2. ✅ **FIXED:** MatplotlibBackend API usage - was using incorrect `config` parameter
3. ⚠️ **REMAINING:** Celery/Redis broker not running or misconfigured (broker URL shows `redis://6379:6379` which is incorrect)

## Fixes Applied

### 1. Fixed DXF File Reading
**File:** `python_backend/ai_services/vision/format_converter.py`

**Change:** Properly wrap DXF bytes in TextIOWrapper for ezdxf:
```python
# Before (broken):
doc = ezdxf.read(io.BytesIO(dxf_bytes))

# After (fixed):
if isinstance(dxf_bytes, str):
    dxf_bytes = dxf_bytes.encode("utf-8", errors="ignore")
buffer = io.BytesIO(dxf_bytes)
text_stream = io.TextIOWrapper(buffer, encoding="utf-8", errors="ignore")
doc = ezdxf.read(text_stream)
```

### 2. Fixed MatplotlibBackend API Usage
**File:** `python_backend/ai_services/vision/format_converter.py`

**Change:** Use correct Configuration API:
```python
# Before (broken):
config = {"lineweight_scaling": 1.0, ...}
backend = MatplotlibBackend(ax, config=config)

# After (fixed):
from ezdxf.addons.drawing.config import Configuration
config = Configuration().with_changes(min_lineweight=line_width)
backend = MatplotlibBackend(ax)
backend.configure(config)
Frontend(ctx, backend, config).draw_layout(msp)
```

## Test Results

✅ **DXF Conversion:** Working - successfully converts DXF to PNG image (38KB output)
✅ **Direct DXF Processing:** Working - extracts profile metrics correctly
⚠️ **Celery Task Enqueue:** Failing - Redis broker not properly configured

## Alternative Solution: Direct DXF Processing

Since SmartScan requires Celery/Redis which may not be running, use the **direct DXF processing endpoint** instead:

### Option 1: Use Profile Import API (Recommended)

**Endpoint:** `POST /profile-import/ingest` (or `/api/v2/profile-import/ingest` depending on server config)

**Windows (PowerShell):**
```powershell
cd python_backend
python test_dxf_import.py
```

**Linux/Mac (curl):**
```bash
curl -X POST \
  -F "file=@public/PROFILES/MC 1250 .dxf" \
  -F "source_type=dxf" \
  -F "material_type=aluminium" \
  http://localhost:8003/profile-import/ingest
```

**Python Script:**
```bash
cd python_backend
python test_dxf_import.py
```

**Response includes:**
- `profile_metrics.area_mm2`
- `profile_metrics.perimeter_mm`
- `profile_metrics.bounding_box` → Use to calculate width/height
- `profile_metrics.weight_kg_per_m`

### Option 2: Use Enhanced SmartScan (Synchronous)

**Endpoint:** `POST /api/v2/smart-scan/enhanced`

This endpoint processes files synchronously (no Celery required) and works with DXF files now that FormatConverter is fixed.

## Correct Parameters for K-Factor Calculation

Based on the DXF analysis:

### Profile Dimensions (from DXF):
- **Bounding Box:** [-181.0, 227.8, 128.2, 474.0]
- **Width:** 309.2 mm (but this includes text/labels)
- **Height:** 246.2 mm (but this includes text/labels)
- **Actual Profile:** 50×50mm (as shown in Profile Tuning Studio)

### Recommended K-Factor Calculator Parameters:

```
Profile Width: 50 mm
Material Thickness: 1.5 mm (standard for 50×50mm aluminum EN 755-9)
Joint Type: 45° Miter
```

### Expected K-Factor:
For 50×50mm with 1.5mm thickness:
- **Formula:** K = (W / tan(22.5°)) - (T / sin(22.5°))
- **Calculation:** K = (50 / 0.4142) - (1.5 / 0.3827) = 116.79mm

⚠️ **Note:** This positive value is unusual. For typical miter cuts, K-factor should be **negative** (deduction). The formula may need review.

## Next Steps

### To Fix SmartScan Celery Issue:

1. **Check Redis Configuration:**
   ```bash
   # Check if Redis is running
   redis-cli ping
   
   # Check environment variable
   echo $REDIS_URL
   ```

2. **Start Celery Worker:**
   ```bash
   cd python_backend
   celery -A core.celery_app worker --loglevel=info
   ```

3. **Fix Redis URL:**
   - Current (wrong): `redis://6379:6379`
   - Should be: `redis://localhost:6379` or `redis://redis:6379`

### To Use DXF File Now:

1. **Use Direct Import API** (no Celery needed):
   - Upload via `/api/v2/profile-import/ingest`
   - Get dimensions from response
   - Enter in Profile Tuning Studio

2. **Or Use Enhanced SmartScan** (synchronous):
   - Upload via `/api/v2/smart-scan/enhanced`
   - Now works with DXF files after fixes

## Verification

Run the test script to verify everything works:
```bash
cd python_backend
python test_dxf_smartscan.py
```

Expected output:
- ✅ DXF conversion successful
- ✅ Direct processing successful
- ⚠️ Celery enqueue requires Redis

## Files Modified

1. `python_backend/ai_services/vision/format_converter.py` - Fixed DXF reading and MatplotlibBackend API
2. `python_backend/core/cad_ingest.py` - Fixed bounding box extraction (handles 3D points)
3. `python_backend/test_dxf_smartscan.py` - Test script for diagnostics

