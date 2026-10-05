# 🇹🇷 Turkish Pilot Complete Workflow

## New Multi-Profile Import & Tuning Flow

### Step 1: Import First Profile (Frame)

1. Navigate to `/fabricator/profile-studio`
2. Upload DXF file (e.g., `MC 103.dxf`)
3. Fill in profile information:
   - Profile Name: "ASAŞ Frame 103"
   - Profile Type: **Frame**
   - Manufacturer: ASAŞ
   - Material: Aluminum
   - Turkish Production Settings (6500mm bars, 4.5mm kerf)
4. Click **"Add First Profile"**
5. ✅ Profile added to system (stays in importer)

### Step 2: Import Second Profile (Sash)

1. Form auto-resets (manufacturer preserved)
2. Profile Type auto-suggests **Sash** (since Frame already imported)
3. Upload DXF file for Sash profile
4. Fill in profile information:
   - Profile Name: "ASAŞ Sash 103"
   - Profile Type: **Sash**
   - Same manufacturer and production settings
5. Click **"Add Profile to System"**
6. ✅ System now has Frame + Sash (complete system detected)

### Step 3: Complete System → Tuning Studio

When Frame + Sash are both imported:
- ✅ "Complete System Ready" badge appears
- ✅ Alert: "Complete system ready! Redirecting to Tuning Studio..."
- 🔄 Auto-redirects to `/fabricator/tuning-studio?systemPackId=...`

### Step 4: Tune System Pack Profiles

**System Pack Tuning Studio** (`/fabricator/tuning-studio`)

**Features:**
- Shows all profiles in the system pack (Frame, Sash, etc.)
- Tab interface to switch between profiles
- Tuning status for each profile:
  - 🟡 Needs Tuning
  - 🟢 Tuned
- Progress indicator: "2/2 Tuned" or "1/2 Tuned"

**For Each Profile:**
1. Select profile tab (Frame or Sash)
2. Configure tuning settings:
   - Cutting rules (kerf, allowances, bar length)
   - Machining zones (slots, holes, milling)
   - Calibration data (tolerances)
3. Click **"Mark as Tuned"** for that profile
4. ✅ Profile status updates to "Tuned"

**Quick Actions:**
- **"Mark All as Tuned"** - Quickly mark all profiles as tuned
- **"Start New Measurement"** - Only enabled when all profiles are tuned

### Step 5: Start Design & Measurement

Once all profiles are tuned:
1. Click **"Start New Measurement"** button
2. Redirects to `/fabricator/design` (Precision Design Interface)
3. System pack is available in system pack selector
4. Can now:
   - Measure new windows
   - Design using Frame + Sash profiles
   - Generate cutting lists
   - See optimization with cut/milling visualization

## Key Improvements

### ✅ Multi-Profile Import
- **Before**: Could only import one profile, then redirected
- **After**: Can import multiple profiles in same session
- Stays in importer until complete system (Frame + Sash)

### ✅ System Pack Tuning
- **Before**: Tuned individual profiles separately
- **After**: Tune all profiles in a system pack together
- Clear progress tracking (X/Y profiles tuned)
- Easy verification workflow

### ✅ Complete System Validation
- **Before**: Could save incomplete systems
- **After**: Only redirects to tuning when Frame + Sash both present
- System pack marked as "complete" or "incomplete"

### ✅ Easy Navigation
- Import → Tune → Design flow is clear
- "Start New Measurement" button only enabled when ready
- Back buttons to return to previous steps

## Technical Details

### System Pack Structure
```json
{
  "id": "system-ASAŞ-1234567890",
  "name": "ASAŞ MC 103 System",
  "manufacturer": "ASAŞ",
  "region": "turkey",
  "isComplete": true,
  "tuningStatus": "tuned",
  "profiles": [
    {
      "id": "custom-123-frame",
      "type": "frame",
      "name": "ASAŞ Frame",
      "tuningStatus": "tuned",
      ...
    },
    {
      "id": "custom-123-sash",
      "type": "sash",
      "name": "ASAŞ Sash",
      "tuningStatus": "tuned",
      ...
    }
  ]
}
```

### Storage
- System packs stored in localStorage: `custom-profile-{systemPackId}`
- Event dispatched: `customProfileAdded` when pack updated
- PrecisionDesignInterface auto-loads tuned packs

### Routes
- `/fabricator/profile-studio` - Multi-profile import
- `/fabricator/tuning-studio?systemPackId=...` - System pack tuning
- `/fabricator/design` - Design interface (uses tuned packs)

## User Experience Flow

```
Profile Studio
    ↓
[Import Frame] → Add to System
    ↓
[Import Sash] → Add to System
    ↓
Complete System Detected
    ↓
Tuning Studio
    ↓
[Tune Frame] → Mark as Tuned
    ↓
[Tune Sash] → Mark as Tuned
    ↓
All Profiles Tuned
    ↓
Start New Measurement
    ↓
Design Interface
    ↓
Measure → Design → Optimize → Generate Cut List
```

## Benefits for Turkish Pilot

1. **Self-Service**: Import Frame + Sash from DXF files
2. **Complete Systems**: Ensures Frame + Sash are both configured
3. **Tuning Verification**: Clear status for each profile
4. **Easy Workflow**: Import → Tune → Design is straightforward
5. **Production Ready**: Only proceed when all profiles are tuned

