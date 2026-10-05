# 📦 How to Import Multi-Profile DXF Files (System Packs)

## For Files Like "tango 60 new.dxf"

If your DXF file contains **multiple profiles** (frame, sash, mullion, glazing bead, etc.) from a complete system pack, follow these steps:

---

## 🎯 Quick Steps for "tango 60 new.dxf"

### Step 1: Enable Multi-Profile Extraction

When importing, the system will **automatically detect** if the file contains multiple profiles if:
- Filename contains "system", "pack", or known system names (Tango, ROCK, JUMBO)
- OR you can manually enable it

### Step 2: Import the File

1. Go to **Profile Tuning Studio** → **SmartScan** tab
2. Find the green **"DXF/DWG Direct Import"** card
3. Upload: `C:\Users\bobbi\Downloads\tango 60 new.dxf`

### Step 3: System Auto-Detects Multiple Profiles

The system will:
- ✅ Extract all profiles from the DXF
- ✅ Auto-detect roles (frame, sash, bead, etc.)
- ✅ Auto-configure each profile
- ✅ Build a complete system pack

### Step 4: Review Extracted Profiles

You'll see multiple profile cards:
- **Frame Profile**: Main frame (largest)
- **Sash Profile**: Sliding sash (if sliding system)
- **Glazing Bead**: Small bead profile
- **Other profiles**: Mullion, transom, etc. (if present)

### Step 5: Verify and Adjust Roles

For each profile:
1. Check the **detected role** (shown in metadata)
2. Adjust if incorrect:
   - Click on the profile
   - Update role if needed
   - System will re-configure based on new role

### Step 6: Save All Profiles

**Option A: Save Individually**
- Click "Save to Library" on each profile
- Each will be auto-configured based on its role

**Option B: Save as System Pack** (Recommended)
- All profiles will be saved together
- System pack will be created automatically
- All profiles linked to the same system

### Step 7: Verify System Pack

After saving, check:
- ✅ All profiles saved with correct roles
- ✅ System pack created with all profiles
- ✅ Each profile auto-configured correctly
- ✅ K-factors calculated for each profile
- ✅ Machining zones created for each role

---

## 🔍 How Multi-Profile Detection Works

### Detection Methods:

1. **Filename Analysis**
   - "tango 60" → Detected as Tango 60 system
   - "system", "pack" → Multi-profile file
   - Known systems: Tango, ROCK, JUMBO, etc.

2. **DXF Structure**
   - Multiple polygons detected
   - Different layers/blocks
   - Spatial separation

3. **Role Detection**
   - **Frame**: Largest profile, typically 80-120mm
   - **Sash**: 80-90% of frame size
   - **Bead**: Small, 10-20mm
   - **Mullion/Transom**: Medium size, vertical/horizontal

---

## 📋 Expected Results for "tango 60 new.dxf"

### Profiles Extracted:

1. **Tango 60 - Frame**
   - Role: `frame`
   - Dimensions: From DXF (e.g., 91.5 × 100mm)
   - Auto-configured: K-factor, cutting rules, glazing, etc.

2. **Tango 60 - Sash** (if sliding system)
   - Role: `sash`
   - Dimensions: ~85% of frame size
   - Auto-configured: Sash-specific settings

3. **Tango 60 - Glazing Bead**
   - Role: `bead`
   - Dimensions: ~15 × 12mm (standard)
   - Auto-configured: Bead-specific settings

### System Pack Created:

- **Name**: "Tango 60" (cleaned from filename)
- **Type**: Sliding window system
- **Profiles**: Frame, Sash, Bead (and more if in DXF)
- **Auto-configured**: All profiles with correct parameters

---

## ⚙️ Manual Multi-Profile Extraction

If auto-detection doesn't work, you can manually enable:

```typescript
<DXFProfileImporter
  extractMultipleProfiles={true}  // Force multi-profile extraction
  defaultWindowType="sliding"
  defaultSystemPack="Tango 60"
  // ... other props
/>
```

---

## 🎯 Role Assignment

### Automatic Role Detection:

The system detects roles based on:

1. **Filename keywords**:
   - "FRAME", "CERCEVE" → `frame`
   - "SASH", "KANAT" → `sash`
   - "MULLION", "DIKME" → `mullion`
   - "BEAD", "CAM PROFİL" → `bead`

2. **Size heuristics**:
   - Largest profile → `frame`
   - Second largest → `sash`
   - Small profiles (< 20mm) → `bead`

3. **Position in DXF**:
   - Spatial separation
   - Layer organization
   - Block structure

### Manual Role Assignment:

If auto-detection is wrong:
1. Select the profile
2. Update role in metadata
3. System will re-configure automatically

---

## 🔧 Fine-Tuning After Import

### For Each Profile:

1. **Verify Material Thickness**
   - Measure actual profile
   - Update in Live Calibration tab
   - K-factor will recalculate

2. **Verify Dimensions**
   - Check if DXF dimensions are correct
   - Update if needed
   - All calculations will update

3. **Add Custom Machining Zones**
   - Standard zones are auto-created
   - Add custom zones for specific hardware

4. **Verify K-Factors**
   - Perform test cuts
   - Adjust material thickness if needed

### For System Pack:

1. **Verify All Profiles**
   - Check each profile is correct
   - Verify roles are assigned correctly

2. **System-Wide Settings**
   - Window type (sliding, casement, etc.)
   - Hardware compatibility
   - Structural constraints

---

## ⚠️ Important Notes

1. **Backend Limitation**
   - Current backend returns only the **largest polygon**
   - For true multi-profile extraction, backend needs update
   - System creates estimated profiles for known systems

2. **Estimated Profiles**
   - Sash and bead profiles may be **estimated** from frame
   - Verify dimensions against actual profiles
   - Update if different

3. **Role Detection**
   - May not be 100% accurate
   - Always verify and adjust if needed
   - System will re-configure when role changes

4. **System Pack Name**
   - Extracted from filename
   - "tango 60 new.dxf" → "Tango 60"
   - Can be manually overridden

---

## 🚀 Future Enhancements

When backend is updated to return all polygons:

1. **True Multi-Profile Extraction**
   - All profiles extracted from DXF
   - No estimation needed
   - Accurate dimensions for all

2. **Layer-Based Detection**
   - Profiles separated by DXF layers
   - Role from layer names
   - More accurate detection

3. **Block-Based Detection**
   - Profiles from DXF blocks
   - Block names indicate roles
   - Better organization

---

## 📞 Troubleshooting

### **Only one profile extracted?**
- Check if filename contains "system" or "pack"
- Try enabling `extractMultipleProfiles={true}`
- Backend may only return largest polygon

### **Wrong roles detected?**
- Manually update role for each profile
- System will re-configure automatically
- Save and verify

### **Missing profiles?**
- Backend limitation (only returns largest)
- System creates estimated profiles for known systems
- Add missing profiles manually if needed

### **System pack not created?**
- Need at least 2 profiles
- Verify all profiles have roles
- Check system pack name is valid

---

## ✅ Checklist

Before marking system as complete:

- [ ] All profiles extracted from DXF
- [ ] Roles correctly assigned (frame, sash, bead, etc.)
- [ ] Dimensions verified for each profile
- [ ] Material thickness verified for each profile
- [ ] K-factors calculated for each profile
- [ ] Cutting rules configured for each profile
- [ ] Glazing settings configured
- [ ] Machining zones created for each profile
- [ ] System pack created and saved
- [ ] All profiles linked to system pack
- [ ] Test cuts performed (recommended)
- [ ] System marked as "Tuned"

---

## 🎯 Example: Tango 60 System Pack

**Input**: `tango 60 new.dxf`

**Output**:
- ✅ Frame profile (91.5 × 100mm) - Auto-configured
- ✅ Sash profile (estimated 78 × 85mm) - Auto-configured
- ✅ Glazing bead (15 × 12mm) - Auto-configured
- ✅ System pack "Tango 60" created
- ✅ All profiles linked and configured

**Next Steps**:
1. Verify sash dimensions (may need to import separately)
2. Verify bead dimensions
3. Perform test cuts
4. Mark as "Tuned"

