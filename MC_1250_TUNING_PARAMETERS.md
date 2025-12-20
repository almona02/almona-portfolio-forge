# MC 1250 Profile Tuning Parameters - Complete Guide

## Profile Information
- **Name:** MC 1250
- **Material:** Aluminum
- **Dimensions:** 91.5mm × 100mm (Width × Height)
- **Role:** Frame
- **System Pack:** generic

---

## ✅ K-Factor Analysis - SLIDING FRAME WITH CORNER JOINTS

### Profile Context
- **Profile Type:** Frame (border profile for sliding system pack)
- **Joint Type:** 45° Miter Corner Joints
- **Application:** Sliding window/door system
- **Dimensions:** 91.5mm × 100mm (Width × Height)
- **Total Height:** 100mm = Profile + Border (from DXF)

### ✅ K-Factor Calculation is CORRECT

The K-factor calculator shows:
- **Profile Width:** 91.5mm
- **Material Thickness:** 1.5mm (assumed)
- **Joint Type:** 45° Miter
- **Calculated K-Factor:** **+216.98mm** ✅

**This is CORRECT for sliding frames with corner joints!**

### Why Positive K-Factor is Correct for Sliding Frames

For **sliding window frames with 45° corner joints**, the K-factor is **POSITIVE** because:

1. **Corner Joint Geometry:**
   - Two profiles meet at 45° angles
   - The miter cut removes material at the corner
   - To achieve the final dimension (e.g., 1000mm), you must cut **MORE** than 1000mm
   - The formula accounts for the profile width and material thickness

2. **Real-World Example:**
   ```
   Desired Final Dimension: 1000mm × 1000mm window
   Required Cut Length: 1000mm + 216.98mm = 1216.98mm per side
   
   Why? The 45° miter cut removes material equal to:
   K = (Profile Width / tan(22.5°)) - (Material Thickness / sin(22.5°))
   K = (91.5 / 0.4142) - (1.5 / 0.3827)
   K = 220.91 - 3.92 = 216.98mm
   ```

3. **Understanding the Formula:**
   - **Profile Width (91.5mm):** The visible width of the frame profile
   - **Material Thickness (1.5mm):** Wall thickness of the aluminum profile
   - **45° Miter:** Each corner requires a 45° cut
   - **Result:** You need to add 216.98mm to each cut to account for the miter geometry

### How the Calculator Works

The K-Factor Calculator:
1. **Automatically calculates** based on:
   - Profile Width (91.5mm)
   - Material Thickness (1.5mm)
   - Joint Type (45° Miter)
   
2. **You cannot manually enter** the K-factor - it's calculated from the parameters

3. **The calculation is correct** for sliding frames with corner joints

### Action Required

1. **Verify Material Thickness:**
   - Measure actual wall thickness of MC 1250 profile
   - Check manufacturer specifications
   - Typical aluminum sliding frame profiles: 1.2mm - 1.5mm
   - **Update Material Thickness in calculator** if different from 1.5mm

2. **Verify Profile Width:**
   - Confirm 91.5mm is the correct profile width
   - This is the visible width of the frame (not including border)
   - **Update Profile Width in calculator** if different

3. **Test the Calculation:**
   - Use the "Test Cut Simulation" in the calculator
   - Enter desired final dimension (e.g., 1000mm)
   - Calculator will show required cut length (e.g., 1216.98mm)
   - Perform test cuts to verify accuracy
   - Adjust Material Thickness if needed based on test results

4. **Apply K-Factor:**
   - Click "Apply K-Factor" button in the calculator
   - The calculated value (+216.98mm) will be saved to the profile
   - This will be used in all future cut optimizations

---

## 📋 Complete Parameter Suggestions by Tab

### 1. **Live Calibration Tab**

#### K-Factor Settings:
```
Profile Width: 91.5 mm (visible width, not including border)
Material Thickness: 1.5 mm (verify actual thickness - measure or check specs)
Joint Type: 45° Miter (for sliding frame corner joints)
Calculated K-Factor: +216.98 mm (POSITIVE - you cut MORE than final dimension)
```

#### How to Use the Calculator:
1. **Enter Profile Width:** 91.5mm (from DXF scan)
2. **Enter Material Thickness:** 1.5mm (verify by measuring actual profile)
3. **Select Joint Type:** 45° Miter
4. **Calculator automatically shows:** +216.98mm K-Factor
5. **Test Cut Simulation:**
   - Enter desired final dimension: 1000mm
   - Calculator shows: Cut Length = 1216.98mm
   - This means: Cut at 1216.98mm to get 1000mm final dimension

#### Test Cut Recommendations:
- **Perform test cuts** on sample material with calculated K-factor
- **Measure actual vs. expected dimensions** after assembly
- **If final dimension is too small:**
  - Increase Material Thickness in calculator (e.g., try 1.6mm or 1.7mm)
  - This will increase the K-factor
- **If final dimension is too large:**
  - Decrease Material Thickness in calculator (e.g., try 1.4mm or 1.3mm)
  - This will decrease the K-factor
- **Note:** You cannot manually adjust K-factor - adjust Material Thickness instead

---

### 2. **Cutting Rules Tab**

#### Basic Allowances:
```
Saw Blade Kerf: 4.2 mm (standard for aluminum)
Bar End Trim: 15 mm (standard for aluminum frames)
Cutting Allowance: 0.5 mm (safety margin)
```

#### Strokes:
```
Minimum Cut Length: 50 mm
Maximum Cut Length: 6000 mm (standard bar length)
Cut Angle Tolerance: ±0.1°
```

#### Variations:
```
Temperature Compensation: 0.012 mm/°C (aluminum expansion)
Batch Calibration Offset: 0 mm (adjust based on production data)
```

---

### 3. **Glazing & Seals Tab**

#### Glazing Dimensions:
```
Minimum Glazing Thickness: 4 mm (single pane)
Maximum Glazing Thickness: 44 mm (triple pane with spacers)
Recommended Glazing: 24 mm (double pane standard)
```

#### Gasket Settings:
```
Gasket Compression Target: 2 mm
Gasket Type: EPDM or Silicone
Gasket Width: 8-12 mm (based on glazing pocket)
```

#### Allowed Glass Packages:
```
- 4mm Single Pane
- 4+16+4mm Double Pane (24mm total)
- 4+12+4+12+4mm Triple Pane (36mm total)
- 6+16+6mm Double Pane (28mm total)
```

---

### 4. **Geometry & Shape Tab**

#### Profile Geometry:
```
Archetype: hollow_box (or thermal_break if applicable)
Wall Thickness: 1.5 mm (verify from DXF/measurement - this is the material thickness used in K-factor)
Glazing Pocket Depth: 20-25 mm (typical for 91.5mm frame)
Glazing Pocket Width: 8-12 mm
Thermal Break Width: 0 mm (if not thermal break profile)
Flange Width: 15-20 mm (outer flange)
Web Offset: 0 mm (if not applicable)
```

#### Source:
```
Source: dxf_import
Scanned Width: 91.5 mm (profile width - used in K-factor calculation)
Scanned Height: 100 mm (total height = profile + border)
SVG Preview: (should be available from DXF import)
```

#### Important Notes:
- **Profile Width (91.5mm):** This is the visible width of the frame profile (not including border)
- **Total Height (100mm):** This includes both the profile and the border extension
- **Wall Thickness (1.5mm):** This is the material thickness used in K-factor calculation
- **Verify these values** match your physical profile measurements

---

### 5. **SmartScan Tab**

#### Already Completed:
- ✅ DXF file imported
- ✅ Dimensions extracted: 91.5mm × 100mm
- ✅ SVG preview generated

#### Additional Actions:
- Review SVG preview for accuracy
- Verify dimensions match physical profile
- Add any additional notes or corrections

---

### 6. **Structural Tab**

#### Frame Constraints:
```
Maximum Frame Span: 3000 mm (3 meters)
Maximum Mullion Span: 2400 mm (2.4 meters)
Maximum Sash Width: 1500 mm (1.5 meters)
Maximum Sash Height: 2000 mm (2 meters)
Maximum Sash Weight: 80 kg
Maximum Unit Width: 3000 mm
Maximum Unit Height: 3000 mm
```

#### Structural Notes:
```
"MC 1250 Frame Profile - Standard aluminum frame for residential/commercial windows.
Recommended for openings up to 3m × 3m. For larger openings, consider reinforcement
or heavier profile series."
```

#### Physics Stiffness Class:
```
Stiffness Class: standard
(Options: light, standard, heavy, extra_heavy)
```

---

### 7. **Hardware Tab**

#### Hardware Compatibility:
```
Primary Hinge Family: Standard Tilt & Turn (or specify manufacturer)
Primary Lock Family: Multi-point locking system
Preferred Handle Family: Standard window handle
Hardware Pack Tags: frame, standard, residential
```

#### Notes:
- Hardware selection depends on window type (casement, tilt-turn, etc.)
- Verify hardware compatibility with 91.5mm frame width
- Some hardware may require specific machining zones (see Machining Zones tab)

---

### 8. **Cost & ERP Tab**

#### Cost Parameters:
```
Aluminum Price per Kg: [Your local price, e.g., 25-35 EGP/kg]
Machining Cost per Operation: [Your shop rate, e.g., 5-10 EGP/op]
Coating Cost per m²: [Anodizing/powder coating, e.g., 50-100 EGP/m²]
Scrap Cost per Kg: [Recycling value, e.g., 20-25 EGP/kg]
```

#### ERP Integration:
```
ERP Item Code: MC-1250-FRAME (or your system code)
Warehouse Location: [Your storage location]
Supplier Code: [If applicable]
```

---

### 9. **Machining Zones Tab**

#### Standard Machining Zones for Frame Profile:

1. **Hinge Mounting Zone:**
   ```
   Zone Type: Slot
   Location: Sash side (if applicable) or frame side
   Dimensions: 20mm × 5mm × 3mm (L × W × D)
   Position: 100mm from top/bottom
   ```

2. **Lock Mounting Zone:**
   ```
   Zone Type: Hole
   Location: Frame meeting edge
   Dimensions: Ø8mm through hole
   Position: Center of frame height
   ```

3. **Glazing Bead Slot:**
   ```
   Zone Type: Slot
   Location: Glazing pocket
   Dimensions: 6mm × 3mm (W × D)
   Position: Along entire glazing pocket
   ```

4. **Drainage Holes:**
   ```
   Zone Type: Hole
   Location: Bottom of frame
   Dimensions: Ø5mm
   Position: Every 300mm along bottom rail
   ```

#### Notes:
- Add zones based on your specific hardware and glazing requirements
- Zones can be added/edited in the Machining Zones tab
- Each zone affects optimization and cut list generation

---

### 10. **Tuning Summary Tab**

#### Verification Checklist:
- [ ] K-Factor calibrated and tested
- [ ] Cutting rules configured
- [ ] Glazing dimensions verified
- [ ] Geometry matches DXF preview
- [ ] Structural constraints set
- [ ] Hardware compatibility confirmed
- [ ] Cost parameters entered
- [ ] Machining zones defined

#### Status:
- **Current Status:** Not Tuned Yet
- **Target Status:** Tuned (after completing all tabs)

---

## 🎯 Quick Start Recommendations

### Priority 1 (Essential):
1. **Verify K-Factor Calculation:** The calculator shows +216.98mm - this is **CORRECT** for sliding frames
2. **Verify Material Thickness:** Confirm actual wall thickness (1.0mm, 1.2mm, or 1.5mm) - update in calculator if different
3. **Verify Profile Width:** Confirm 91.5mm is correct - update in calculator if different
4. **Set Cutting Rules:** Enter saw kerf (4.2mm) and bar end trim (15mm)

### Priority 2 (Important):
4. **Configure Glazing:** Set min/max glazing thickness
5. **Set Structural Limits:** Define maximum spans and weights
6. **Add Machining Zones:** Define hinge, lock, and glazing zones

### Priority 3 (Optional):
7. **Enter Cost Parameters:** For accurate pricing
8. **Set Hardware Preferences:** For hardware compatibility checks
9. **Review Geometry:** Verify DXF preview matches physical profile

---

## 📝 Next Steps

1. **Verify K-Factor Calculation:**
   - Go to **Live Calibration** tab
   - Enter Profile Width: **91.5mm**
   - Enter Material Thickness: **1.5mm** (verify actual thickness)
   - Select Joint Type: **45° Miter**
   - Calculator will show: **+216.98mm** (this is CORRECT)
   - Use "Test Cut Simulation" to verify: 1000mm final = 1216.98mm cut
   - Perform test cuts to verify accuracy
   - If test cuts don't match, adjust Material Thickness in calculator (not K-factor directly)

2. **Complete All Tabs:**
   - Work through each tab systematically
   - Use the suggestions above as starting points
   - Adjust based on your specific requirements

3. **Mark as Tuned:**
   - Once all parameters are set and verified
   - Click **"Mark as Tuned"** button
   - Profile will be ready for production use

---

## ⚠️ Important Notes

- **K-Factor is automatically calculated:** You cannot manually enter K-factor - it's calculated from Profile Width and Material Thickness
- **Positive K-factor is CORRECT:** For sliding frames with 45° corner joints, positive K-factor means you cut MORE than final dimension
- **Example:** For 1000mm × 1000mm window, cut at 1216.98mm per side to get 1000mm final dimension
- **Test before production:** Always perform test cuts with new profiles to verify the calculation
- **Material thickness matters:** Verify actual thickness, don't assume - this directly affects K-factor calculation
- **Profile width matters:** Verify 91.5mm is correct - this directly affects K-factor calculation
- **DXF dimensions:** 91.5mm × 100mm should match physical profile (100mm = profile + border)
- **System compatibility:** Ensure frame profile works with your sash profiles
- **Adjust Material Thickness, not K-factor:** If test cuts don't match, adjust Material Thickness in calculator, not K-factor directly

---

## 🔧 Troubleshooting

### If K-Factor seems wrong:
1. Verify material thickness is correct
2. Check if joint type is correct (45° miter vs. 90° butt)
3. Perform empirical test cuts
4. Adjust K-factor based on actual results

### If dimensions don't match:
1. Re-check DXF import
2. Verify DXF file is correct scale
3. Measure physical profile
4. Update geometry config if needed

### If cuts are inaccurate:
1. Verify saw blade kerf setting
2. Check bar end trim allowance
3. Review cutting rules
4. Calibrate based on test cuts

