# Single Glass 5mm Fix - Glazing Bead System

## Issue
Single glazing was defaulting to 4mm instead of 5mm for single glazing bead systems. Weight calculations needed correction.

## Fixes Applied

### 1. Default Thickness Updated

**Changed from:** 4mm default for all glazing types  
**Changed to:** 5mm for single glazing, 4mm per pane for double/triple

### 2. Files Updated

#### `src/lib/fabricator/DualOutputGenerator.ts`
```typescript
// Before:
const glassThickness = (windowUnit.glazing as any)?.thickness || 4; // Default 4mm

// After:
const glazingType = (windowUnit.glazing as any)?.type || 'double';
const defaultThickness = glazingType === 'single' ? 5 : 4; // 5mm for single glazing bead system
const glassThickness = (windowUnit.glazing as any)?.thickness || defaultThickness;
```

#### `src/modules/reporting/GlassReport.tsx`
```typescript
// Before:
const glassThickness = project.glazing?.thickness || 4;

// After:
const defaultThickness = glazingType === 'single' ? 5 : 4; // 5mm for single glazing bead system
const glassThickness = project.glazing?.thickness || defaultThickness;
```

#### `src/lib/fabricator/constraintValidator.ts` (2 locations)
```typescript
// Before:
const glassThickness = (windowUnit.glazing as any)?.thickness || 4;

// After:
const glazingType = (windowUnit.glazing as any)?.type || 'double';
const defaultThickness = glazingType === 'single' ? 5 : 4; // 5mm for single glazing bead system
const glassThickness = (windowUnit.glazing as any)?.thickness || defaultThickness;
```

#### `src/components/fabricator/EngineeringBay.tsx`
```typescript
// Before:
const glassThickness = liveProject.glazing?.thickness || 24;

// After:
const defaultThickness = glazingType === 'single' ? 5 : 24; // 5mm for single glazing bead system
const glassThickness = liveProject.glazing?.thickness || defaultThickness;

// Weight calculation fixed:
const effectiveThickness = glazingType === 'single' 
  ? glassThickness  // Single: 5mm
  : glassThickness / paneCount; // Double/Triple: divide total IGU thickness by pane count
const totalGlassWeight = totalGlassArea * effectiveThickness * 2.5 * paneCount;
```

## Weight Calculation Formula

### Correct Formula:
- **Single Glazing (5mm):** `weight = area × 5 × 2.5 = area × 12.5 kg/m²`
- **Double Glazing (24mm IGU = 4+16+4):** `weight = area × (24/2) × 2.5 × 2 = area × 60 kg/m²`
- **Triple Glazing (42mm IGU = 6+12+6+12+6):** `weight = area × (42/3) × 2.5 × 3 = area × 105 kg/m²`

### Glass Density:
- **2.5 kg/m² per mm thickness** (standard float glass)

## Glazing Bead System Compatibility

### Single Glazing Bead Systems:
- **Max Glass Thickness:** 6mm (from UPVC systems data)
- **Default Thickness:** 5mm (now correctly set)
- **Weight per m²:** 12.5 kg/m² (5mm × 2.5)

### Double Glazing Bead Systems:
- **Max Glass Thickness:** 24mm IGU (4-16-4, 5-16-5, etc.)
- **Default Thickness:** 24mm total IGU
- **Weight per m²:** ~60 kg/m² (varies by IGU configuration)

## Testing

### Verify Single Glazing:
1. Select "Single" glazing type
2. Check glass thickness defaults to **5mm**
3. Verify weight calculation: `area × 12.5 kg/m²`
4. Confirm glazing bead system accepts 5mm (within 6mm max)

### Verify Double Glazing:
1. Select "Double" glazing type
2. Check glass thickness defaults to **24mm** (or 4mm per pane)
3. Verify weight calculation accounts for 2 panes

## Status
✅ **Fixed** - Single glazing now defaults to 5mm
✅ **Weight Corrected** - Proper calculation for single vs double/triple
✅ **Compatible** - 5mm is within single glazing bead system limits (max 6mm)

