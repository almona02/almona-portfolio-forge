# Two Hinges Per Sash Fix - Hinges as Pivot Reference

## Issue
User reported that hinges weren't being used as the reference for opening. For two sashes:
- Right sash needs 2 hinges on the RIGHT side
- Left sash needs 2 hinges on the LEFT side
- Total: 4 hinges (2 per sash)

## Root Cause
1. Code was creating 3 hinges per sash (top, middle, bottom)
2. Pivot calculation was using "middle hinge" which doesn't exist with 2 hinges
3. Each sash should have its own hinges based on its individual `openingDirection`

## Fix Applied

### Fix 1: Change to 2 Hinges Per Sash
**File:** `src/lib/3d/hardwarePlaceholder.ts` (lines 171-223)

**Before:** 3 hinges (top, middle, bottom)
**After:** 2 hinges (top and bottom only)

```typescript
// Top hinge (150mm from top)
placeholders.push({
  geometry: hingeGeom,
  position: new Vector3(hingeX, cellY + cellH / 2 - 0.15, hingeZ),
  type: 'hinge',
  label: `Hinge (Top) - ${openingDirection} opening`,
  userData: { cellId: cell.id, openingDirection } // Store for animation reference
});

// Bottom hinge (150mm from bottom)
placeholders.push({
  geometry: hingeGeom.clone(),
  position: new Vector3(hingeX, cellY - cellH / 2 + 0.15, hingeZ),
  type: 'hinge',
  label: `Hinge (Bottom) - ${openingDirection} opening`,
  userData: { cellId: cell.id, openingDirection } // Store for animation reference
});
```

### Fix 2: Pivot Calculation for 2 Hinges
**File:** `src/components/fabricator/Window3DGenerator.tsx` (lines 682-695)

**Before:** Used "middle hinge" (which doesn't exist)
**After:** Calculate center Y between top and bottom hinges

```typescript
// Calculate pivot point: center of hinge line (between top and bottom hinges)
const topHinge = sashHinges.reduce((top, h) => 
    h.position.y > top.position.y ? h : top
);
const bottomHinge = sashHinges.reduce((bottom, h) => 
    h.position.y < bottom.position.y ? h : bottom
);

// Pivot point: center Y between top and bottom hinges, at hinge X position
const pivotY = (topHinge.position.y + bottomHinge.position.y) / 2;
const pivotPoint = new Vector3(
    topHinge.position.x, // Hinge X position (left or right side - same for both hinges)
    pivotY, // Center Y between top and bottom hinges
    restPosition.z // Same Z as sash
);
```

## How It Works Now

### For Two Sashes:

#### Right Sash (Opening Right):
- **Hinges:** 2 hinges on RIGHT side (attached to right frame/transom)
  - Top hinge: 150mm from top
  - Bottom hinge: 150mm from bottom
- **Handle:** On LEFT side (where you grab)
- **Pivot:** Center Y between the 2 right-side hinges
- **Animation:** Rotates around right-side hinge line

#### Left Sash (Opening Left):
- **Hinges:** 2 hinges on LEFT side (attached to left frame/transom)
  - Top hinge: 150mm from top
  - Bottom hinge: 150mm from bottom
- **Handle:** On RIGHT side (where you grab)
- **Pivot:** Center Y between the 2 left-side hinges
- **Animation:** Rotates around left-side hinge line

### Total Hardware:
- **4 hinges total:** 2 per sash
- **2 handles:** 1 per sash
- **2 locks:** 1 per sash (optional)

## Visual Representation

### Two Sashes - Opening Right and Left:

```
┌─────────────────────────────────┐
│ [H]  LEFT SASH  [H] │ [H]  RIGHT SASH  [H] │
│ [H]            [H] │ [H]            [H] │
│ [H]            [H] │ [H]            [H] │
└─────────────────────────────────┘
 ↑                    ↑
Left hinges        Right hinges
(Left sash)       (Right sash)
```

**Legend:**
- `[H]` = Hinge
- Left sash: Hinges on LEFT, opens LEFT
- Right sash: Hinges on RIGHT, opens RIGHT

## Key Points

1. **Each sash has its own `openingDirection`** from the cell definition
2. **Hinges are placed on the attachment side** (where sash connects to frame)
3. **Pivot is calculated from the actual hinges** (center Y between top and bottom)
4. **2 hinges per sash** (top and bottom, 150mm from edges)

## Testing

### Test Case: Panda 50 System, 2 Sashes
1. Select "Panda 50 System"
2. Draw 2 sashes on canvas
3. Set left sash `openingDirection: 'left'`
4. Set right sash `openingDirection: 'right'`
5. Click Play

**Expected:**
- Left sash: 2 hinges on LEFT side, rotates around left hinges
- Right sash: 2 hinges on RIGHT side, rotates around right hinges
- Total: 4 hinges visible
- Each sash animates independently around its own hinges

## Files Modified

1. **`src/lib/3d/hardwarePlaceholder.ts`**
   - Lines 171-223: Changed from 3 hinges to 2 hinges per sash
   - Added `userData` to store `cellId` and `openingDirection` for reference

2. **`src/components/fabricator/Window3DGenerator.tsx`**
   - Lines 682-695: Updated pivot calculation to use top and bottom hinges instead of middle hinge

## Key Insight

**Hinges are the pivot reference** - the animation must rotate around the actual hinge positions, not the sash center. With 2 hinges, the pivot is the center point between them.

