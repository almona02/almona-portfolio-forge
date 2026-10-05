# 📍 Where is the Green Card (DXF Direct Import)?

## Exact Location

The **green card** (DXF/DWG Direct Import) is located in:

**Profile Tuning Studio → SmartScan Tab**

## Step-by-Step Navigation

### Step 1: Open Profile Tuning Studio
1. Go to your profile (e.g., "MC 1250")
2. Click to open **Profile Tuning Studio** (or "Tuning Studio")

### Step 2: Find the Tabs on the Right Side
You'll see tabs on the right side of the screen:
- **Live Calibration** (default)
- **Cutting Rules**
- **Glazing & Seals**
- **Geometry & Shape**
- **SmartScan** ← **CLICK THIS TAB**
- **Structural**
- **Hardware**
- **Cost & ERP**
- **Machining Zones**
- **Tuning Summary**

### Step 3: Click "SmartScan" Tab
Click on the **"SmartScan"** tab (it has a scan icon 📡)

### Step 4: Look for the Green Card at the Top
Once you're in the SmartScan tab, you should see **TWO sections**:

1. **🟢 GREEN CARD (at the top)** - "DXF/DWG Direct Import"
   - Green border
   - Green text
   - Ruler icon 📏
   - Badge: "Recommended for DXF"
   - **This is what you want for DXF files!**

2. **🔵 BLUE/GRAY CARD (below)** - "SmartScan (Images & PDFs)"
   - Regular gray/blue card
   - Scan icon 📡
   - For images/PDFs only
   - Requires Celery/Redis

## Visual Layout

```
Profile Tuning Studio
├── Left Side: Profile Info
└── Right Side: Tabs
    ├── Live Calibration
    ├── Cutting Rules
    ├── Glazing & Seals
    ├── Geometry & Shape
    ├── SmartScan ← CLICK HERE
    │   ├── 🟢 GREEN CARD: DXF/DWG Direct Import ← USE THIS FOR DXF
    │   │   └── Upload area for DXF files
    │   └── 🔵 GRAY CARD: SmartScan (Images & PDFs)
    │       └── Upload area for images/PDFs
    ├── Structural
    ├── Hardware
    └── ...
```

## If You Don't See It

### Check 1: Are you on the SmartScan tab?
- Make sure you clicked the **"SmartScan"** tab, not other tabs

### Check 2: Scroll down
- The green card should be at the top, but if you don't see it, scroll up

### Check 3: Check browser console (F12)
- Look for JavaScript errors
- Look for: `📡 SmartScan API configured for: ...`

### Check 4: Hard refresh
- **Windows/Linux:** `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`

### Check 5: Check if code is deployed
- The green card styling was added recently
- Make sure the latest code is deployed to production

## Alternative Location

If you can't find it in Profile Tuning Studio, you can also use:

**System Tuning Studio → Import Tab**
- This also has DXF import functionality
- Located in a different component but works the same way

## Quick Test

1. Open Profile Tuning Studio for any profile
2. Click **"SmartScan"** tab (right side)
3. Look for green card with "DXF/DWG Direct Import" title
4. Upload your DXF file there

The green card should be **the first thing you see** when you open the SmartScan tab!

