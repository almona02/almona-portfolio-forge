# 🇹🇷 Turkish Pilot DXF Testing Guide

## Testing with MC 103.dxf

### Step 1: Upload DXF File

1. Navigate to `/fabricator/profile-studio`
2. Click "Upload DXF" button
3. Select `public/PROFILES/MC 103.dxf`
4. Wait for backend processing (calls `/api/v2/profile-import/ingest`)

### Step 2: Profile Detection

The system will automatically:
- ✅ Parse DXF geometry using backend CAD ingestor
- ✅ Detect multiple profiles from layers (FRAME, SASH, etc.)
- ✅ Extract dimensions (width, height, thickness)
- ✅ Calculate weight per meter
- ✅ Identify profile types (frame, sash, mullion, transom)

**Expected Detection:**
- If DXF contains "FRAME" layer → Frame profile detected
- If DXF contains "SASH" or "KANAT" layer → Sash profile detected
- If thermal break detected (multiple polygons) → Frame + Sash system
- Minimum 2 profiles required for complete window system

### Step 3: Verification Panel

After upload, you'll see:
- **Detected Profiles Panel** showing:
  - Profile type (Frame/Sash)
  - Dimensions (width × height)
  - Unit weight (kg/m)
  - Profile name

**Example Output:**
```
Detected Profiles (2)
├─ Frame: Custom Frame (103 × 50 mm, 1.2 kg/m)
└─ Sash: Custom Sash (93 × 45 mm, 1.1 kg/m)
```

### Step 4: Complete Profile Configuration

Fill in Turkish production settings:
- **Bar Length**: 6500mm (Turkish standard)
- **Saw Kerf**: 4.5mm (double-mitre saw)
- **Welding Allowance**: 0mm (Aluminum) or 3mm (UPVC)
- **Milling Depth**: 2.5mm (for transoms)
- **Unit Weight**: Auto-filled from DXF or manual entry

### Step 5: Save System Pack

Click "Save to Turkish Profile Gallery"

**What Gets Saved:**
```json
{
  "id": "custom-1234567890",
  "name": "ASAŞ MC 103 System",
  "manufacturer": "ASAŞ",
  "region": "turkey",
  "profiles": [
    {
      "id": "custom-1234567890-frame",
      "name": "ASAŞ Frame",
      "type": "frame",
      "material": "aluminum",
      "barLength": 6500,
      "sawKerf": 4.5,
      "width": 103,
      "height": 50,
      "unitWeight": 1.2,
      "micronConfig": { ... }
    },
    {
      "id": "custom-1234567890-sash",
      "name": "ASAŞ Sash",
      "type": "sash",
      "material": "aluminum",
      "barLength": 6500,
      "sawKerf": 4.5,
      "width": 93,
      "height": 45,
      "unitWeight": 1.1,
      "micronConfig": { ... }
    }
  ]
}
```

### Step 6: Use in Design Interface

1. Navigate to `/fabricator/design` (Precision Design Interface)
2. System pack selector will show your custom Turkish profile
3. Select "ASAŞ MC 103 System"
4. Design a window using the blueprint interface

### Step 7: Optimization & Visualization

After designing a window:

1. **Cutting Optimization**:
   - Go to Optimization tab
   - System calculates cuts using:
     - Frame profile (for frame components)
     - Sash profile (for sash components)
     - Turkish bar length (6500mm)
     - Turkish saw kerf (4.5mm)

2. **Cut Visualization**:
   - Bar layout showing:
     - Cut positions (with kerf accounted)
     - Waste segments
     - Utilization percentage
   - Color coding:
     - Green: Used segments
     - Red: Waste segments
     - Blue: Cut lines

3. **Milling Visualization**:
   - If machining slots configured:
     - Shows slot positions on profile
     - Tool paths for milling operations
     - Depth indicators
   - G-code preview available

### Step 8: Generate Cutting List

1. Click "Generate Cutting List"
2. PDF export includes:
   - Frame cuts (using frame profile)
   - Sash cuts (using sash profile)
   - Mullion/transom cuts (if applicable)
   - Waste calculation
   - Turkish production parameters

## Troubleshooting

### Issue: Only 1 profile detected

**Solution:**
- Check DXF layers - ensure "FRAME" and "SASH" layers exist
- System will auto-add missing profile type if only one detected
- Manual override: Edit profile type in form

### Issue: Dimensions seem wrong

**Solution:**
- Check DXF units (should be mm)
- Verify bounding box in verification panel
- Manual override: Enter correct dimensions

### Issue: Profile not showing in design interface

**Solution:**
- Refresh page (profiles load on mount)
- Check browser console for errors
- Verify profile saved to localStorage (check DevTools → Application → Local Storage)

### Issue: Optimization not using correct profiles

**Solution:**
- Ensure system pack selected in design interface
- Check that both frame and sash profiles exist in pack
- Verify micronConfig settings (barLength, sawKerf)

## Expected Results

✅ **Complete Window System**: Frame + Sash profiles detected and saved
✅ **Turkish Standards**: 6500mm bars, 4.5mm kerf applied
✅ **Optimization**: Cuts calculated with Turkish parameters
✅ **Visualization**: Bar layout and milling operations shown
✅ **Cutting List**: PDF export with all components

## Next Steps

After successful test:
1. Turkish pilot can use this workflow for any DXF profile
2. System automatically creates complete window system packs
3. Optimization engine uses correct profiles for each component
4. Visualization shows both cutting and milling operations

