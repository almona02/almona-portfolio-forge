# Drafting Dimension & Twincode Investigation

## Investigation Summary

### 1. Dimension Placement - First Click Location

**Location**: `src/components/fabricator/drafting/DraftingCanvas2D.tsx:612-623`

**How it works**:
- When the `dimension` tool is selected, clicking on the canvas triggers dimension placement
- **First Click** (line 614): Sets `startPoint` to the clicked point and `isDrawing = true`
- **Second Click** (line 619): Completes the measurement by calling `drafting.addMeasurement(startPoint, point, mode)`
- The measurement mode is determined by modifier keys:
  - Default: `distance` mode
  - Shift key: `area` mode
  - Ctrl/Cmd key: `angle` mode

**Code Flow**:
```typescript
case 'dimension':
  if (!startPoint) {
    // FIRST CLICK: Set start point
    setStartPoint(point);
    setIsDrawing(true);
  } else {
    // SECOND CLICK: Complete measurement
    const mode = e.shiftKey ? 'area' : e.ctrlKey || e.metaKey ? 'angle' : 'distance';
    drafting.addMeasurement(startPoint, point, mode);
    setStartPoint(null);
    setIsDrawing(false);
  }
  break;
```

**Where the first dimension is placed**:
- The first click happens at the exact mouse position on the canvas (world coordinates)
- The point is converted from screen coordinates to world coordinates using `screenToWorld` function
- The dimension is created between the first click point and the second click point

### 2. Twincode Generation for Drafts

**Status**: ✅ **IMPLEMENTED**

**Changes Made**:

1. **Extended `generateDigitalTwinCode` function** (`src/lib/confirmation.ts`):
   - Added `'draft'` type support
   - Draft twincode format: `DR-YYYYMMDD-XXXXXXXX` (e.g., `DR-20260114-ABC12345`)

2. **Updated draft save handler** (`src/components/fabricator/drafting/hooks/useDraftingWorkbenchHandlers.ts`):
   - Generates twincode when saving drafts
   - Includes twincode in saved JSON file
   - Displays twincode in success message
   - Uses collaboration userId or generates guest ID

**Save Data Structure**:
```json
{
  "geometry": {...},
  "dimensions": [...],
  "annotations": [...],
  "template": "...",
  "timestamp": 1234567890,
  "version": "1.0",
  "twincode": "DR-20260114-ABC12345",
  "userId": "user-1234567890"
}
```

**Persistence**:
- Twincode is saved in the JSON file when user clicks "Save"
- Twincode is also stored in localStorage via `StatePersistenceManager` when state is auto-saved
- Each draft gets a unique twincode on first save

### 3. State Persistence

**Location**: `src/components/fabricator/drafting/utils/statePersistence.ts`

**How it works**:
- Auto-saves draft state every 30 seconds
- Saves to localStorage with key `draft-current`
- Maintains version history (up to 50 versions)
- Creates recovery points for crash recovery
- **Note**: Twincode is included in the state when saved via `handleSave`, so it will be persisted in auto-saves

## Files Modified

1. `src/lib/confirmation.ts`
   - Extended `generateDigitalTwinCode` to support `'draft'` type
   - Updated validation pattern to include `DR` prefix

2. `src/components/fabricator/drafting/hooks/useDraftingWorkbenchHandlers.ts`
   - Added twincode generation in `handleSave`
   - Added twincode to saved data structure
   - Updated success message to display twincode

## Testing Recommendations

1. **Dimension Placement**:
   - Select dimension tool from toolbar
   - Click first point on canvas
   - Click second point to complete dimension
   - Verify dimension appears with correct measurement

2. **Twincode Generation**:
   - Create a new draft
   - Add some geometry
   - Click "Save" button
   - Verify twincode appears in success message
   - Verify twincode is included in downloaded JSON file
   - Verify twincode format: `DR-YYYYMMDD-XXXXXXXX`

3. **Persistence**:
   - Create draft and wait 30 seconds
   - Check localStorage for `draft-current` key
   - Verify twincode is included in persisted state

## Notes

- Twincode is generated on every save (not just first save)
- Each save creates a new twincode (for tracking multiple versions)
- Guest users get a generated guest ID for twincode generation
- Twincode format follows the same pattern as quotes/orders/tickets but with `DR` prefix
