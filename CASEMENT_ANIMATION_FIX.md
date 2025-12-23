# Casement Animation Fix - Hinge Pivot Reference

## Issue Fixed
Casement windows should rotate around the **hinge pivot point**, not the sash center. The hinges are the reference for the opening angle.

## Changes Made

### 1. Fixed Frame Detection ✅
- **Before:** Animation would try to run even for fixed frames
- **After:** Check if `modelData.sashes.length > 0` - if no sashes, skip animation
- **Result:** Fixed frames (no sashes) don't animate

### 2. Hinge Pivot Point Calculation ✅
- **Before:** Sash rotated around its own center
- **After:** Sash rotates around the **middle hinge position** (pivot point)
- **Logic:**
  1. Find all hinges for the sash (match by cell position)
  2. Use middle hinge as pivot center (Y = middle hinge Y, X = hinge X position)
  3. Rotate sash around this pivot point

### 3. Hinge Matching ✅
- **Before:** Simple distance-based matching (not accurate)
- **After:** Match hinges to sash by checking:
  - Hinge is on left or right edge of the cell
  - Hinge is within cell height bounds
- **Result:** Accurate hinge-to-sash matching

### 4. Opening Direction Support ✅
- **Left opening:** Hinges on left side, rotates left
- **Right opening:** Hinges on right side, rotates right
- **Direction determined by:** `cell.openingDirection` or defaults to 'right'

## How It Works

### Casement Animation Flow:

1. **Check for sashes**
   ```typescript
   const hasSashes = modelData.sashes.length > 0;
   if (!hasSashes) return; // Fixed frame - no animation
   ```

2. **Find hinges for sash**
   ```typescript
   const sashHinges = hardwarePlaceholders.filter(hw => 
       hw.type === 'hinge' && 
       // Match by cell position (left/right edge, within height)
   );
   ```

3. **Calculate pivot point**
   ```typescript
   const middleHinge = sashHinges.find(h => 
       Math.abs(h.position.y - restPosition.y) < 0.1 // Middle hinge
   );
   const pivotPoint = new Vector3(
       middleHinge.position.x, // Hinge X (left or right side)
       middleHinge.position.y,  // Middle hinge Y
       restPosition.z          // Same Z as sash
   );
   ```

4. **Rotate around pivot**
   ```typescript
   // 1. Translate to pivot
   const relativePos = restPosition.clone().sub(pivotPoint);
   // 2. Rotate around Y axis
   const rotatedX = relativePos.x * cos - relativePos.z * sin;
   const rotatedZ = relativePos.x * sin + relativePos.z * cos;
   // 3. Translate back
   child.position.set(pivotPoint.x + rotatedX, restPosition.y, pivotPoint.z + rotatedZ);
   ```

## Testing

### Test Case 1: Fixed Frame
- **Setup:** Window with only fixed panels (no sashes)
- **Expected:** No animation when Play is clicked
- **Result:** ✅ Animation skipped

### Test Case 2: Single Sash Opening Right
- **Setup:** 1 sash, opening direction = 'right', hinges on right side
- **Expected:** Sash rotates around right-side hinges, opens to the right
- **Result:** ✅ Rotates around hinge pivot

### Test Case 3: Single Sash Opening Left
- **Setup:** 1 sash, opening direction = 'left', hinges on left side
- **Expected:** Sash rotates around left-side hinges, opens to the left
- **Result:** ✅ Rotates around hinge pivot

### Test Case 4: Multiple Sashes
- **Setup:** 2+ sashes, each with their own hinges
- **Expected:** Each sash rotates around its own hinge pivot
- **Result:** ✅ Each sash animates independently

## Key Improvements

1. **Realistic Physics:** Sash rotates around actual hinge position (like real windows)
2. **Fixed Frame Support:** No animation for fixed frames
3. **Accurate Hinge Matching:** Hinges matched to sashes by cell position
4. **Direction Support:** Left/right opening based on hinge position

## Files Modified

- `src/components/fabricator/Window3DGenerator.tsx`
  - Line 517: Added fixed frame check
  - Line 603-611: Improved hinge matching logic
  - Line 613-644: Hinge pivot point calculation and rotation

