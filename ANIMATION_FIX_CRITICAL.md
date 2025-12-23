# Critical Animation Fix - Step by Step

## Issue
Animation is not working - progress bar moves but 3D model doesn't animate.

## Root Causes Identified

### 1. Canvas Frameloop Issue ✅ FIXED
**Problem:** Canvas was set to `frameloop="demand"` which only renders on demand, not continuously.

**Fix:** Changed to `frameloop={isAnimating ? "always" : "demand"}` 
- When animating: continuous rendering (always)
- When not animating: on-demand rendering (performance)

**Location:** Line 1197

### 2. Missing Frame Invalidation ✅ FIXED
**Problem:** Even with frameloop="always", React Three Fiber might not update if nothing triggers a re-render.

**Fix:** Added `invalidate()` call in useFrame when animating
- Forces React Three Fiber to render the next frame
- Ensures continuous animation loop

**Location:** Line 467

### 3. Enhanced Debug Logging ✅ ADDED
**Problem:** No visibility into what's happening during animation.

**Fix:** Added comprehensive debug logs:
- When useFrame starts running
- Sash detection and details
- Position/rotation changes
- Completion state

**Location:** Lines 470-480

## Testing Steps

### Step 1: Open Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Clear console

### Step 2: Create Test Window
1. Go to Smart Measuring
2. Create window with **1 sash** (1x1 grid)
3. Set to **casement** type (or leave default)
4. Proceed to 3D Preview

### Step 3: Start Animation
1. Click **Play** button
2. **Watch console** for these logs:

**Expected Console Output:**
```
[Animation] 🎯 useFrame is running! {
  progress: "0.001",
  animationProgress: "0.001",
  delta: "0.016",
  hasGroup: true,
  hasModelData: true,
  sashesCount: 1,
  windowType: "casement",
  hasGrid: true
}

[Animation] 🪟 Sash 0 details: {
  hasOpeningPath: true,
  restPosition: [0, 0, 0],
  restRotation: [0, 0, 0],
  ...
}

[Animation] 📍 Mid-animation sash 0: {
  progress: "0.500",
  newRotY: "45.0°",
  ...
}
```

### Step 4: Verify Visual Animation
- **Sash should rotate** around Y-axis (vertical)
- **Rotation should reach 90°** when fully open
- **Slight outward movement** as it opens
- **Animation completes in 3 seconds**

## If Still Not Working

### Check 1: Is useFrame Running?
**Look for:** `[Animation] 🎯 useFrame is running!` in console

**If NOT appearing:**
- `useFrame` hook is not being called
- Check if Canvas is rendering
- Verify `isAnimating` is true
- Check if `groupRef.current` exists

### Check 2: Are Sashes Detected?
**Look for:** `[Animation] 🪟 Sash 0 details:` in console

**If NOT appearing:**
- Sashes not marked as `isAnimatableSash: true`
- Check sash rendering code (line 629)
- Verify `userData` is set correctly

### Check 3: Is Progress Updating?
**Look for:** Progress value changing in logs

**If NOT updating:**
- Animation loop (line 1022) might not be running
- Check `setAnimationProgress` is being called
- Verify `requestAnimationFrame` is working

### Check 4: Are Position/Rotation Changing?
**Look for:** Position/rotation values changing in logs

**If NOT changing:**
- `child.position.set()` might not be working
- Check if Three.js objects are updating
- Verify `restPosition`/`restRotation` are valid

## Quick Debug Commands

Open browser console and run:

```javascript
// Check if animation state is set
console.log('isAnimating:', window.__ANIMATION_STATE__); // If exposed

// Check Three.js scene
const canvas = document.querySelector('canvas[data-engine="three.js"]');
console.log('Canvas found:', !!canvas);

// Check if useFrame is running (will show in logs)
```

## Next Steps After Fix

Once animation works:
1. ✅ Remove excessive debug logs
2. ✅ Test with multiple sashes
3. ✅ Test sliding windows
4. ✅ Test different opening directions
5. ✅ Optimize performance

## Files Modified

- `src/components/fabricator/Window3DGenerator.tsx`
  - Line 455: Added `useThree()` hook for invalidate
  - Line 467: Added `invalidate()` call during animation
  - Line 461: Enhanced useFrame with debug logging
  - Line 1197: Changed frameloop to dynamic based on isAnimating

