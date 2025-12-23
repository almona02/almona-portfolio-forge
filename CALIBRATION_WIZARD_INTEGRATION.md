# Calibration Wizard Integration - Profile-Level Access

## Overview
The Calibration Wizard is now accessible directly from each profile in:
1. **System Pack Tuning Studio** - Each profile card has a calibration icon
2. **Profile Management** - Each profile has a calibration icon
3. **Profile Tuning Studio** - Already embedded (no changes needed)

## Implementation Details

### 1. System Pack Tuning Studio (`SystemPackTuningStudio.tsx`)

**Added:**
- Calibration icon button (GaugeCircle) next to Tune/Edit/Delete buttons
- Dialog that opens CalibrationWizard for the specific profile
- Immediate profile update when calibration is saved

**Location:** Each profile card in the cards view (line ~781)

**Features:**
- Opens in a modal dialog
- Converts SystemPackProfile to Profile type automatically
- Saves calibration to:
  - System pack in state
  - localStorage
  - Supabase (if profile exists in database)
- Shows success toast on save
- Updates profile immediately

### 2. Profile Management (`ProfileManagement.tsx`)

**Added:**
- Calibration icon button (GaugeCircle) next to Tune button
- Dialog that opens CalibrationWizard for the specific profile
- Immediate profile update when calibration is saved

**Location:** Each profile row (line ~2434)

**Features:**
- Opens in a modal dialog
- Uses profile directly (no conversion needed)
- Saves calibration to:
  - Profile state
  - Supabase database
- Shows success toast on save
- Refreshes profile list to show updated data

### 3. Profile Tuning Studio

**Status:** Already has CalibrationWizard embedded in the calibration tab
**No changes needed**

## User Flow

### From System Pack Tuning:
1. User views system pack profiles
2. Clicks calibration icon (GaugeCircle) on any profile
3. Calibration Wizard opens in dialog
4. User configures K-factor, allowances, strokes, variations
5. User saves calibration
6. Profile is immediately updated with new calibration
7. All windows using this profile will use the new calibration

### From Profile Management:
1. User views all profiles
2. Clicks calibration icon (GaugeCircle) on any profile
3. Calibration Wizard opens in dialog
4. User configures calibration parameters
5. User saves calibration
6. Profile is immediately updated in database
7. All windows using this profile will use the new calibration

## Technical Implementation

### State Management

**SystemPackTuningStudio:**
```typescript
const [calibrationProfile, setCalibrationProfile] = useState<SystemPackProfile | null>(null);
const [showCalibrationDialog, setShowCalibrationDialog] = useState(false);
```

**ProfileManagement:**
```typescript
const [calibrationProfile, setCalibrationProfile] = useState<Profile | null>(null);
const [showCalibrationDialog, setShowCalibrationDialog] = useState(false);
```

### Calibration Save Handler

**SystemPackTuningStudio:**
- Updates system pack profiles array
- Saves to localStorage
- Updates Supabase if profile exists

**ProfileManagement:**
- Updates profile in state
- Saves to Supabase database
- Refreshes profile list

### Immediate Effect

When calibration is saved:
1. Profile specifications are updated with calibration data
2. `lastCalibrated` timestamp is set
3. Calibration is added to profile's calibrations array
4. All future window generation using this profile will use the new calibration
5. Existing windows in projects will use the new calibration on next generation

## UI Elements

### Calibration Icon Button
- **Icon:** GaugeCircle (from lucide-react)
- **Color:** Orange (border-orange-500/50, text-orange-300)
- **Size:** Small (h-4 w-4)
- **Tooltip:** "Calibrate cutting parameters"
- **Position:** Next to Tune button

### Dialog
- **Size:** max-w-4xl (large enough for CalibrationWizard)
- **Height:** max-h-[90vh] with overflow-y-auto
- **Theme:** Dark (bg-gray-900, border-gray-700)
- **Header:** Shows profile name
- **Description:** Explains that changes apply immediately

## Benefits

1. **Easy Access:** Calibration is one click away from any profile
2. **Context-Aware:** Opens for the specific profile being viewed
3. **Immediate Effect:** Changes apply instantly to all windows
4. **Persistent:** Saved to database, not lost on refresh
5. **Clear Visibility:** Orange icon stands out, easy to find

## Testing Checklist

- [ ] Calibration icon appears on each profile in System Pack Tuning
- [ ] Calibration icon appears on each profile in Profile Management
- [ ] Clicking icon opens CalibrationWizard dialog
- [ ] Calibration can be configured and saved
- [ ] Profile is updated immediately after save
- [ ] Changes persist after page refresh
- [ ] Toast notification shows on successful save
- [ ] Error handling works if save fails

## Files Modified

1. `src/components/fabricator/SystemPackTuningStudio.tsx`
   - Added calibration button
   - Added calibration dialog
   - Added save handler

2. `src/components/fabricator/ProfileManagement.tsx`
   - Added calibration button
   - Added calibration dialog
   - Added save handler

3. `src/components/fabricator/CalibrationWizard.tsx`
   - No changes (already works as component)

## Status
✅ **Complete** - Calibration wizard is now accessible from each profile in System Pack Tuning and Profile Management, with immediate effect on save.

