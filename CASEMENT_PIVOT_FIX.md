# Casement Animation Pivot Fix - Opening Right

## Issue
When a sash opens from left to right, the animation was rotating around the center of the window instead of around the hinges on the right side (transom).

## Root Cause

### Problem 1: Hinge Placement
In `hardwarePlaceholder.ts`, hinges were ALWAYS placed on the LEFT side, regardless of opening direction:
```typescript
// OLD CODE (WRONG)
const hingeX = cellX - cellW / 2 + HARDWARE_DIMENSIONS.hinge.depth / 2; // Always left side
```

### Problem 2: Hinge Detection
The animation code was finding hinges on both left and right edges, but didn't prioritize based on opening direction.

## Fix Applied

### Fix 1: Hinge Placement Based on Opening Direction
**File:** `src/lib/3d/hardwarePlaceholder.ts` (lines 171-207)

```typescript
// Get opening direction from cell
const openingDirection = (cell as any)?.openingDirection || 'right';

// CRITICAL FIX: Hinges on the side where sash is attached (opposite to opening direction)
// Opening right → hinges on RIGHT side (sash attached to right frame/transom)
// Opening left → hinges on LEFT side (sash attached to left frame/transom)
let hingeX: number;
if (openingDirection === 'right') {
  // Opening right: hinges on RIGHT edge (sash attached to right frame/transom)
  hingeX = cellX + cellW / 2 - HARDWARE_DIMENSIONS.hinge.depth / 2;
} else {
  // Opening left: hinges on LEFT edge (sash attached to left frame/transom)
  hingeX = cellX - cellW / 2 + HARDWARE_DIMENSIONS.hinge.depth / 2;
}
```

**Key Logic:**
- **Opening right** = Sash swings to the right → Hinges on RIGHT side (where it's attached)
- **Opening left** = Sash swings to the left → Hinges on LEFT side (where it's attached)

### Fix 2: Handle Position (Opposite from Hinges)
```typescript
// Handle on opposite side from hinges (where you grab to open)
let handleX: number;
if (openingDirection === 'right') {
  // Opening right: handle on LEFT side (opposite from hinges)
  handleX = cellX - cellW / 2 + HARDWARE_DIMENSIONS.handle.depth / 2;
} else {
  // Opening left: handle on RIGHT side (opposite from hinges)
  handleX = cellX + cellW / 2 - HARDWARE_DIMENSIONS.handle.depth / 2;
}
```

### Fix 3: Hinge Detection in Animation
**File:** `src/components/fabricator/Window3DGenerator.tsx` (lines 670-685)

```typescript
// Match hinges to this sash cell
// CRITICAL: Hinges are on the side where sash is attached (opposite to opening direction)
const sashHinges = hardwarePlaceholders.filter(hw => {
    if (hw.type !== 'hinge') return false;
    
    const leftEdgeX = cellX - cellW / 2;
    const rightEdgeX = cellX + cellW / 2;
    const hingeOnLeftEdge = Math.abs(hw.position.x - leftEdgeX) < 0.05;
    const hingeOnRightEdge = Math.abs(hw.position.x - rightEdgeX) < 0.05;
    const hingeInCellHeight = Math.abs(hw.position.y - cellY) < cellHeight / 2 + 0.1;
    
    // For opening right, hinges should be on RIGHT edge
    // For opening left, hinges should be on LEFT edge
    if (openingDirection === 'right') {
        return hingeOnRightEdge && hingeInCellHeight;
    } else {
        return hingeOnLeftEdge && hingeInCellHeight;
    }
});
```

## How It Works Now

### For Sash Opening Right:
1. **Hinge Placement:** Hinges placed on RIGHT edge of sash (where it attaches to right frame/transom)
2. **Handle Placement:** Handle placed on LEFT edge (where you grab to open)
3. **Animation Pivot:** Animation rotates around the RIGHT edge hinges (pivot point = middle hinge position on right side)
4. **Rotation:** Positive Y rotation (sash swings outward to the right)

### For Sash Opening Left:
1. **Hinge Placement:** Hinges placed on LEFT edge of sash (where it attaches to left frame/transom)
2. **Handle Placement:** Handle placed on RIGHT edge (where you grab to open)
3. **Animation Pivot:** Animation rotates around the LEFT edge hinges (pivot point = middle hinge position on left side)
4. **Rotation:** Negative Y rotation (sash swings outward to the left)

## Visual Representation

### Opening Right (Before Fix):
```
┌─────────────────┐
│  [H]  SASH  [H] │  ← Hinges on left (WRONG)
│  [H]       [H] │
│  [H]       [H] │
└─────────────────┘
     ↑
  Pivot at center (WRONG)
```

### Opening Right (After Fix):
```
┌─────────────────┐
│  [H]  SASH  [H] │  ← Handle on left (grab here)
│  [H]       [H] │
│  [H]       [H] │  ← Hinges on right (attached here)
└─────────────────┘
              ↑
        Pivot at right hinges (CORRECT)
```

## Testing

### Test Case: Panda 50 System, 1 Sash Opening Right
1. Select "Panda 50 System"
2. Draw 1 sash on canvas
3. Set opening direction to "right" (or use default)
4. Click Play
5. **Expected:**
   - Hinges visible on RIGHT side of sash
   - Handle visible on LEFT side of sash
   - Animation rotates around RIGHT edge hinges
   - Sash swings outward to the right

### Console Debug Output:
```
[Animation] 🔩 Casement pivot animation: {
  pivotPoint: [0.XXX, 0.XXX, 0.XXX],  // Should be on RIGHT edge
  hingesFound: 3,
  openingDirection: 'right',
  newRotY: '90.0°'
}
```

## Files Modified

1. **`src/lib/3d/hardwarePlaceholder.ts`**
   - Lines 171-207: Hinge placement based on `openingDirection`
   - Lines 209-224: Handle placement (opposite from hinges)

2. **`src/components/fabricator/Window3DGenerator.tsx`**
   - Lines 670-685: Hinge detection filtered by opening direction

## Key Insight

**The hinges are always on the side where the sash is ATTACHED to the frame**, not where it opens. This is the pivot point for rotation.

- Opening right → Attached to right frame → Hinges on right
- Opening left → Attached to left frame → Hinges on left

