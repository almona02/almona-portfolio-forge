# 📥 How to Import and Auto-Configure a DXF File

## Quick Start Guide for "tango 60 new.dxf"

### Step 1: Open Profile Tuning Studio

1. Navigate to **Profile Tuning Studio** in your app
2. If you don't have a profile yet, create a new one or select an existing profile

### Step 2: Import the DXF File

1. Go to the **SmartScan** tab in Profile Tuning Studio
2. You'll see a green card labeled **"DXF/DWG Direct Import"** with a "Recommended for DXF" badge
3. Click the file input or drag & drop your file:
   - **File path**: `C:\Users\bobbi\Downloads\tango 60 new.dxf`
   - Or browse and select the file

### Step 3: Review Extracted Data

After import, you'll see:
- **Profile name**: "tango 60 new" (from filename)
- **Dimensions**: Width × Height (e.g., "91.5 × 100 mm")
- **SVG Preview**: Visual preview of the profile cross-section
- **Additional metrics**: Area, perimeter, weight (if available)

### Step 4: Select Role (if needed)

Before saving, ensure the profile has the correct **role**:

**Option A: If profile already has a role**
- The auto-config will use the existing role (frame, sash, etc.)

**Option B: If profile needs role assignment**
1. Check the profile's `profileRole` field
2. Common roles for "tango 60":
   - **Frame**: If it's the main frame profile
   - **Sash**: If it's the sliding sash profile
   - **Mullion**: If it's a vertical divider
   - **Transom**: If it's a horizontal divider

### Step 5: Save with Auto-Configuration

1. Click **"Save to Library"** button on the imported profile
2. The system will automatically:
   - ✅ Calculate K-factor from dimensions
   - ✅ Estimate material thickness
   - ✅ Configure cutting rules
   - ✅ Set glazing parameters
   - ✅ Configure geometry
   - ✅ Set structural constraints
   - ✅ Create standard machining zones
   - ✅ Suggest hardware compatibility

### Step 6: Verify Auto-Configuration

After saving, open the profile in **Profile Tuning Studio** and check:

#### **Live Calibration Tab**
- **K-Factor**: Should be calculated (e.g., +216.98mm for 91.5mm frame with 45° miter)
- **Profile Width**: From DXF (e.g., 91.5mm)
- **Material Thickness**: Estimated (e.g., 1.5mm) - **VERIFY THIS!**

#### **Cutting Rules Tab**
- **Saw Blade Kerf**: 4.2mm (standard)
- **Bar End Trim**: 15mm
- **Corner Technology**: Auto-selected based on role

#### **Glazing & Seals Tab**
- **Min/Max Glazing**: 4mm - 44mm
- **Recommended**: 24mm (double pane)
- **Gasket settings**: Auto-configured

#### **Geometry & Shape Tab**
- **Archetype**: `hollow_box` or `thermal_break` (detected)
- **Wall Thickness**: Estimated from dimensions
- **Glazing Pocket**: Calculated from profile width
- **SVG Preview**: Should be visible

#### **Structural Tab**
- **Max Frame Span**: Calculated from profile size
- **Stiffness Class**: `standard` or `stiff` (based on width)

#### **Machining Zones Tab**
- **Standard zones created** based on role:
  - Frame: Hinge zones, lock zones, drainage holes
  - Sash: Glazing bead slots, hinge zones

### Step 7: Fine-Tune (if needed)

#### **Critical: Verify Material Thickness**
1. Measure the actual wall thickness of the physical profile
2. Go to **Live Calibration** tab
3. Update **Material Thickness** if different from estimate
4. K-factor will automatically recalculate

#### **Adjust K-Factor (if test cuts don't match)**
1. Perform test cuts with calculated K-factor
2. If final dimension is too small: Increase material thickness
3. If final dimension is too large: Decrease material thickness
4. **Note**: You cannot directly edit K-factor - adjust material thickness instead

#### **Add Custom Machining Zones**
1. Go to **Machining Zones** tab
2. Add any custom zones needed for your specific hardware
3. Standard zones are already created

#### **Enter Cost Parameters (optional)**
1. Go to **Cost & ERP** tab
2. Fill in local prices:
   - Aluminum price per kg
   - Machining cost per operation
   - Coating cost per m²
   - Scrap cost per kg

### Step 8: Mark as Tuned

Once all parameters are verified:
1. Click **"Mark as Tuned"** button
2. Profile is ready for production use

---

## 🎯 Example: "tango 60 new.dxf"

Assuming this is a **frame profile** for a **sliding window system**:

### Expected Auto-Configuration:

**If dimensions are 91.5mm × 100mm:**
- **K-Factor**: +216.98mm (for 45° miter, 1.5mm thickness)
- **Material Thickness**: 1.5mm (estimated - **VERIFY!**)
- **Joint Type**: 45° Miter
- **Glazing Pocket**: ~20-25mm depth, ~8-12mm width
- **Max Frame Span**: ~3000mm
- **Machining Zones**: Lock mounting, drainage holes

**If dimensions are different:**
- All values will scale proportionally
- K-factor will be recalculated
- Structural constraints will adjust

---

## ⚠️ Important Notes

1. **Material Thickness is Estimated**
   - Always verify by measuring the actual profile
   - Update in Live Calibration tab if different

2. **K-Factor is Calculated**
   - Based on profile width and material thickness
   - May need adjustment after test cuts
   - Adjust material thickness, not K-factor directly

3. **Machining Zones are Standard**
   - Based on common hardware requirements
   - Add custom zones for specific hardware

4. **Window Type Matters**
   - Sliding windows: 45° miter joints
   - Casement windows: Different hardware zones
   - Ensure `systemType` is set correctly

5. **Role Selection is Critical**
   - Frame vs. Sash have different configurations
   - Mullion/Transom have different joint types
   - Verify role before saving

---

## 🔍 Troubleshooting

### **Dimensions not extracted correctly?**
- Check DXF file quality
- Verify file is not corrupted
- Try re-importing

### **K-factor seems wrong?**
- Verify material thickness is correct
- Check if joint type is correct (45° vs. 90°)
- Perform test cuts to validate

### **Machining zones missing?**
- Check if role is set correctly
- Verify window type is correct
- Add custom zones manually if needed

### **SVG preview not showing?**
- Check if backend generated SVG
- Verify DXF file contains valid geometry
- Preview may not be available for all files

---

## 📋 Checklist

Before marking as "Tuned":

- [ ] DXF file imported successfully
- [ ] Dimensions extracted correctly
- [ ] SVG preview visible (if available)
- [ ] Role selected correctly (frame/sash/etc.)
- [ ] Material thickness verified (measure actual profile)
- [ ] K-factor calculated and validated
- [ ] Cutting rules reviewed
- [ ] Glazing settings verified
- [ ] Geometry parameters checked
- [ ] Structural constraints reviewed
- [ ] Machining zones added (if needed)
- [ ] Cost parameters entered (optional)
- [ ] Test cuts performed (recommended)
- [ ] Profile marked as "Tuned"

---

## 🚀 Quick Tips

1. **Batch Import**: You can import multiple DXF files at once
2. **Role Assignment**: Set role before saving for best auto-config
3. **System Pack**: If this is part of a known system (e.g., "Tango 60"), set `systemBrand` to match
4. **Window Type**: Set `systemType` to match (sliding, casement, etc.)
5. **Save Early**: Save to library first, then fine-tune in Profile Tuning Studio

---

## 📞 Need Help?

If auto-configuration doesn't match your needs:
1. All values can be manually adjusted in Profile Tuning Studio
2. Auto-config preserves existing values (won't overwrite)
3. You can disable auto-config by setting `enableAutoConfig={false}`

