# Sash Alignment Fix - Week 1

## Issue
When selecting sashes from SmartDrawCanvas, the 3D model preview shows sashes that are not accurately aligned with the proportional grid (colWidths/rowHeights).

## Root Cause
The `rowStarts` calculation in `windowGeometry.ts` was using addition (`acc + h`) instead of subtraction (`acc - h`) when calculating row positions. Since rows start from the top (height/2) and go downward, we need to subtract row heights.

## Fix Applied

### File: `src/lib/3d/windowGeometry.ts`

**Before:**
```typescript
rowSizes.reduce((acc, h) => {
    rowStarts.push(acc);
    return acc + h; // WRONG: This goes UP, not down
}, height / 2);
```

**After:**
```typescript
// Row starts: from top edge (height/2) going down (subtracting heights)
rowSizes.reduce((acc, h) => {
    rowStarts.push(acc);
    return acc - h; // CORRECT: Subtract because we're going DOWN from top
}, height / 2);
```

## How It Works

1. **Column Positions (X-axis):**
   - Start at left edge: `-width / 2`
   - Add column widths going right: `colStarts[i] = colStarts[i-1] + colSizes[i-1]`
   - Cell center X: `colStarts[cell.col] + cellW / 2`

2. **Row Positions (Y-axis):**
   - Start at top edge: `height / 2`
   - Subtract row heights going down: `rowStarts[i] = rowStarts[i-1] - rowSizes[i-1]`
   - Cell center Y: `rowStarts[cell.row] - cellH / 2`

## Testing

To verify the fix:
1. Set column widths: `600,800,600` (3 columns)
2. Set row heights: `400,1100` (2 rows)
3. Select sashes in SmartDrawCanvas
4. Verify sashes align correctly in 3D preview:
   - Left column (600mm) should have sashes at correct X position
   - Center column (800mm) should have sashes centered
   - Right column (600mm) should have sashes at correct X position
   - Top row (400mm) should have sashes at correct Y position
   - Bottom row (1100mm) should have sashes at correct Y position

## Status
✅ Fixed - Row positioning now correctly uses subtraction for downward movement

