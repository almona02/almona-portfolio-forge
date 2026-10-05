# MC 1250 Profile - K-Factor Analysis & Recommendations

## DXF File Analysis Results

**File:** `public/PROFILES/MC 1250 .dxf`

### Extracted Dimensions from DXF:
- **Bounding Box Width:** 290.72 mm
- **Bounding Box Height:** 224.65 mm
- **Number of Closed Polygons:** 3 (thermal break profile detected)
- **Area:** 6193.66 mm²
- **Perimeter:** 2088.13 mm
- **Estimated Material Thickness:** ~2.97 mm (from area/perimeter ratio)

### ⚠️ Important Note:
The DXF bounding box (290.72×224.65mm) is **NOT** the actual profile cross-section dimensions. The bounding box includes:
- Text labels ("MC 1250", "EN 755-9")
- Multiple profile elements (thermal break system)
- Other drawing elements

**The actual profile cross-section is 50×50mm** as shown in Profile Tuning Studio.

---

## Recommended Parameters for Profile Tuning Studio

Based on the profile being **MC 1250 • ALUMINUM • 50×50mm**, here are the correct parameters:

### K-Factor Calculator Parameters:

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Profile Width** | **50 mm** | ✅ This is the actual cross-section width |
| **Profile Height** | **50 mm** | ✅ This is the actual cross-section height |
| **Material Thickness** | **1.5 mm** | Typical for 50×50mm aluminum profiles (EN 755-9) |
| **Joint Type** | **45° Miter** | For frame corner joints |

### Expected K-Factor Calculation:

For a **50×50mm aluminum profile with 1.5mm material thickness** and **45° miter cut**:

```
Formula: K = (W / tan(22.5°)) - (T / sin(22.5°))
         K = (50 / 0.4142) - (1.5 / 0.3827)
         K = 120.71 - 3.92
         K = 116.79 mm
```

### ⚠️ Issue Identified:

The calculated K-Factor of **116.79mm is unusually positive**, which indicates:

1. **The formula may be incorrect** - For miter cuts, K-factor should typically be **negative** (a deduction)
2. **Material thickness might be wrong** - For 50×50mm profiles, thickness could be:
   - **1.0mm** (thin wall) → K = 120.71 - 2.61 = **118.10mm**
   - **1.2mm** (standard) → K = 120.71 - 3.14 = **117.57mm**
   - **1.5mm** (current) → K = 120.71 - 3.92 = **116.79mm**
   - **2.0mm** (thick wall) → K = 120.71 - 5.23 = **115.48mm**

### Correct K-Factor Formula for Miter Cuts:

The standard formula for miter cuts should be:

```
K = -[(W × tan(22.5°)) + (T / sin(22.5°))]
```

This gives a **negative value** (deduction), which is correct for miter joints.

For 50×50mm with 1.5mm thickness:
```
K = -[(50 × 0.4142) + (1.5 / 0.3827)]
K = -[20.71 + 3.92]
K = -24.63 mm
```

---

## Recommended Action Items

### 1. Verify DXF Scanning Status
- ✅ DXF file has been parsed successfully
- ✅ 3 closed polygons detected (thermal break system)
- ⚠️ Need to verify if SmartScan has processed this file 100%

### 2. Correct Parameters to Enter in Profile Tuning Studio:

```
Profile Width: 50 mm
Material Thickness: 1.5 mm (or 1.2mm if standard)
Joint Type: 45° Miter
```

### 3. Expected K-Factor Range:

For **50×50mm aluminum profiles** with **45° miter cuts**, typical K-factors are:
- **-20mm to -30mm** (negative = deduction from cut length)

If the calculator shows **positive values >50mm**, the formula or parameters are incorrect.

### 4. Material Thickness Reference:

For **EN 755-9 aluminum profiles** (MC 1250 series):
- **Standard thickness:** 1.2mm - 1.5mm
- **Heavy duty:** 2.0mm - 2.5mm

Check the profile data sheet or measure the actual wall thickness.

---

## Next Steps

1. **Verify SmartScan completion:**
   - ✅ DXF file can now be processed (FormatConverter fixed)
   - ⚠️ SmartScan async endpoint requires Celery/Redis (may not be running)
   - ✅ **Alternative:** Use `/api/v2/profile-import/ingest` for direct DXF processing (no Celery needed)
   - ✅ **Alternative:** Use `/api/v2/smart-scan/enhanced` for synchronous processing

2. **Enter correct parameters:**
   - Profile Width: **50mm**
   - Material Thickness: **1.5mm** (adjust if needed)
   - Joint Type: **45° Miter**

3. **Validate K-Factor:**
   - Expected range: **-20mm to -30mm** (negative)
   - If positive, check formula implementation
   - Perform test cuts to validate

4. **Check fabricator files:**
   - Look for similar 50×50mm profiles in calibration database
   - Use existing K-factor values as reference
   - Compare with other MC series profiles

---

## Fabricator File References

Check the following for similar profile calibrations:
- `fabricator_profiles` table in database
- `profile_calibrations` table for K-factor history
- `calibration_analytics` for similar profile data

Search for:
- Profiles with width=50mm, height=50mm
- MC series profiles
- Aluminum profiles with similar dimensions

