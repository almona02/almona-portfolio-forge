# Animation Debug - Step 1: Single Sash Opening Right

## Issue
3D model animation is not working. Need to fix step by step, starting with a single sash opening right as a preset.

## Changes Made

### 1. Enhanced Debug Logging
Added comprehensive debug logging to track:
- Animation start state
- Sash detection and details
- Position/rotation changes during animation
- Completion state

**Location:** `src/components/fabricator/Window3DGenerator.tsx` (Lines 454-553)

### 2. Simplified Animation Logic
- **Removed dependency on `openingPath` check** - Animation now works even if openingPath is missing
- **Default to casement opening right** - For testing, defaults to casement mechanism opening right
- **Always animate if sash is detected** - No longer requires openingPath to be present

### 3. Fixed Sash Index Tracking
- Added `sashIndex` counter to properly track which sash is being animated
- Matches grid cells to sashes by index for correct opening direction

## Testing Steps

### Step 1: Create Test Window
1. Go to Smart Measuring interface
2. Create a window with **one sash** (1x1 grid, single sash)
3. Set opening direction to **right** (if option available)
4. Proceed to 3D Preview

### Step 2: Test Animation
1. Click **Play** button
2. Check browser console for debug logs:
   - `[Animation] 🎬 Starting animation:` - Should show sash count
   - `[Animation] 🪟 Sash 0 details:` - Should show position/rotation
   - `[Animation] 📍 Mid-animation sash 0:` - Should show at 50% progress
   - `[Animation] ✅ Animation complete sash 0:` - Should show at 100%

### Step 3: Verify Visual Animation
- Sash should rotate around Y-axis (vertical)
- Rotation should be 90 degrees when fully open
- Sash should move slightly outward as it opens
- Animation should complete in 3 seconds

## Expected Console Output

```
[Animation] 🎬 Starting animation: {
  progress: "0.001",
  isAnimating: true,
  sashesCount: 1,
  windowType: "casement",
  hasGrid: true
}

[Animation] 🪟 Sash 0 details: {
  hasOpeningPath: true,
  restPosition: [0, 0, 0],
  restRotation: [0, 0, 0],
  currentPosition: [0, 0, 0],
  currentRotation: [0, 0, 0],
  windowType: "casement",
  gridCells: 1
}

[Animation] 📍 Mid-animation sash 0: {
  progress: "0.500",
  newRotY: "45.0°",
  position: ["0.106", "0.000", "0.000"],
  rotation: ["0.0°", "45.0°", "0.0°"]
}

[Animation] ✅ Animation complete sash 0: {
  finalRotY: "90.0°",
  finalPosition: ["0.150", "0.000", "0.000"]
}
```

## If Animation Still Doesn't Work

### Check 1: Sash Detection
If you see `⚠️ No animatable sashes found!`, check:
- Are sashes being created with `isAnimatableSash: true`?
- Is `groupRef.current` pointing to the correct group?
- Are sashes children of the main group?

### Check 2: Animation Progress
If progress bar moves but sash doesn't:
- Check if `useFrame` is being called (add console.log at start)
- Verify `isAnimating` is true
- Verify `animationProgress` is updating (0 to 1)

### Check 3: Position/Rotation Updates
If position/rotation aren't changing:
- Check if `child.position.set()` is being called
- Verify restPosition/restRotation are valid Vector3/Euler
- Check if Three.js is updating the scene

## Next Steps

Once single sash opening right works:
1. Test with multiple sashes
2. Test sliding windows
3. Test different opening directions
4. Remove debug logs for production

