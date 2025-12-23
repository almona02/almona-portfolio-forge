# Panda 50 System Casement Animation Fix

## Issue
When selecting "Panda 50 System" (casement system) and selecting two sashes from canvas, animation shows them sliding outside instead of rotating like casement windows.

## Root Cause
The detection logic was checking cell type and windowUnit type, but **not prioritizing the pattern's openingMechanism.type**. 

For Panda 50 System with casement patterns:
- Pattern has `openingMechanism.type: 'casement'` ✅
- But detection was checking `cell.type === 'sliding'` first
- If cell type was 'sash' (not 'sliding'), it might still default incorrectly

## Fix Applied

### 1. Pattern-First Detection ✅
**Priority order:**
1. **Pattern's `openingMechanism.type`** (most reliable - comes from preset)
2. Cell type (from user's canvas selection)
3. WindowUnit type (fallback)

**Code:**
```typescript
const pattern = windowUnit.presetId ? getPatternById(windowUnit.presetId) : null;
const patternMechanism = pattern?.openingMechanism?.type;

const isSliding = patternMechanism === 'sliding' || 
                 (patternMechanism !== 'casement' && 
                  (cell?.type === 'sliding' || windowUnit.type?.includes('sliding')));

const isCasement = patternMechanism === 'casement' ||
                  (!isSliding && 
                   patternMechanism !== 'sliding' &&
                   (cell?.type === 'sash' || windowUnit.type?.includes('casement')));
```

### 2. Enhanced Debug Logging ✅
Added detailed logging to show:
- Pattern mechanism type
- Pattern ID and name
- Cell type
- Final decision (CASEMENT vs SLIDING)

## Expected Behavior

### For Panda 50 System with Casement Pattern:
1. **Pattern detected:** `openingMechanism.type: 'casement'`
2. **Animation type:** CASEMENT (rotation around hinges)
3. **Both sashes:** Rotate around their respective hinge pivot points
4. **Opening direction:** Left sash opens left, right sash opens right

### Console Output:
```
[Animation] 🔍 Mechanism detection: {
  patternMechanism: 'casement',
  patternId: 'casement-2sash',
  patternName: '2 Sash Casements',
  cellType: 'sash',
  windowUnitType: 'casement',
  isSliding: false,
  isCasement: true,
  openingDirection: 'both',
  finalDecision: 'CASEMENT (rotate)'
}
```

## Testing

### Test Case: Panda 50 + 2 Sashes
1. Select "Panda 50 System"
2. Select a casement pattern (e.g., "2 Sash Casements")
3. Or manually draw 2 sashes on canvas
4. Click Play
5. **Expected:** Both sashes rotate around hinges (casement animation)
6. **NOT:** Sashes sliding horizontally (sliding animation)

## Files Modified

- `src/components/fabricator/Window3DGenerator.tsx`
  - Line 587-620: Updated mechanism detection to prioritize pattern
  - Added debug logging for mechanism detection

## Key Insight

**Pattern data is the source of truth** - if a pattern says it's casement, it should animate as casement, regardless of how the user drew the sashes on the canvas.

