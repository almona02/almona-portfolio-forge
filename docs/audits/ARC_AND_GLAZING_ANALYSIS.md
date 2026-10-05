# Arc and Glazing Integration Analysis

## Current State Analysis

### Arc Integration

#### Strengths:
1. **Three-click creation workflow**: Center → Start angle → End angle (intuitive)
2. **Validation exists**: `validateArc()` in `inputValidator.ts` with comprehensive checks
3. **Layer support**: Arcs are assigned to layers
4. **Export support**: PDF and DXF export implemented
5. **Preview rendering**: Visual feedback during arc creation
6. **Audit trail**: Tool operations are logged

#### Issues and Enhancement Opportunities:

1. **Missing Error Handling in Canvas**
   - Arc creation in `handleMouseDown` doesn't use try-catch
   - If `drafting.addArc()` throws, error isn't caught
   - Should wrap in try-catch and show user feedback

2. **Radius Validation Issue**
   - Only checks `radius > 5` (hardcoded minimum)
   - Should use `SAFETY_LIMITS.MIN_RADIUS` and `MAX_RADIUS`
   - No validation that radius is finite

3. **Angle Normalization Problems**
   - Arc creation doesn't normalize angles before creating arc
   - Validation normalizes, but creation doesn't - inconsistency
   - Preview doesn't handle angle wrap-around correctly
   - Large arc flag calculation: `Math.abs(endAngle - arcStartAngle) > Math.PI` doesn't account for angle wrapping

4. **Missing Cancel Functionality**
   - No Escape key handler to cancel arc creation
   - User must complete 3 clicks or switch tools to cancel
   - Should reset `arcCenter` and `arcStartAngle` on Escape

5. **Zero-Length Arc Prevention**
   - No check that `startAngle != endAngle`
   - Could create invalid arc with same start/end angle
   - Should validate minimum arc sweep angle

6. **Radius Calculation Duplication**
   - Radius calculated in both `handleMouseDown` and preview rendering
   - Should extract to helper function
   - Potential inconsistency if calculation differs

7. **Preview Arc Direction**
   - Preview uses `largeArc` flag but direction (sweep-flag) is always 1
   - Should respect user's intended direction (clockwise/counter-clockwise)
   - Current implementation always goes counter-clockwise

8. **Angle Validation Enhancement**
   - Validation allows angles outside [0, 2π) range before normalization
   - Should validate angles are finite numbers
   - Should check for NaN/Infinity values

9. **Performance Optimization**
   - Preview calculations happen on every mouse move
   - Could memoize preview calculations
   - Square root calculation in preview could be optimized

### Glazing Integration

#### Current State:
1. **Material System Integration**: Glazing pocket dimensions in material specs
2. **Layer System**: Glazing layer exists in layer types
3. **Window Integration**: Glazing referenced in window unit types
4. **UI Display**: Glazing pocket dimensions shown in properties panel

#### Missing/Enhancement Opportunities:

1. **No Direct Glazing Tool**
   - No dedicated tool to draw glazing elements
   - Glazing appears to be part of material-aware windows only
   - Could benefit from dedicated glazing rectangle/circle tool

2. **Glazing Layer Underutilized**
   - Glazing layer exists but no explicit assignment mechanism
   - Material-aware windows don't explicitly set glazing layer
   - Should automatically assign glazing elements to glazing layer

3. **Glazing Validation**
   - No validation that glazing fits within window frame
   - No thickness validation for glazing
   - No material type validation (glass types, double/triple glazing)

4. **Glazing Visualization**
   - No distinct visual style for glazing elements
   - Glazing should have transparency/translucency in preview
   - 3D preview doesn't show glazing distinctly

5. **Glazing Properties Panel**
   - No dedicated properties panel for glazing
   - Glazing properties not editable (thickness, material, U-value, etc.)
   - Should integrate with material system for glazing specs

6. **Glazing Export**
   - Glazing not explicitly exported to DXF/PDF
   - Should be exported as separate layer/entity type
   - Glazing dimensions not included in BOM

## Recommended Enhancements

### Priority 1: Critical Hardening (Arc)
1. Add error handling with try-catch in arc creation
2. Use SAFETY_LIMITS for radius validation
3. Add Escape key handler to cancel arc creation
4. Validate minimum arc sweep angle (prevent zero-length arcs)
5. Normalize angles in creation, not just validation
6. Fix large arc flag calculation for angle wrapping

### Priority 2: Important Enhancements (Arc)
1. Extract radius calculation to helper function
2. Improve preview direction handling
3. Add angle finiteness validation
4. Optimize preview calculations

### Priority 3: Glazing Enhancements
1. Create dedicated glazing tool or integrate with rectangle tool
2. Auto-assign glazing elements to glazing layer
3. Add glazing validation (fit, thickness, material)
4. Enhance glazing visualization (transparency, distinct style)
5. Add glazing properties panel
6. Enhance glazing export

## Implementation Notes

- Arc validation is robust, but creation logic needs hardening
- Glazing integration is minimal - primarily through material system
- Both would benefit from dedicated tooling and validation
- Consider creating shared validation helpers for geometric operations
