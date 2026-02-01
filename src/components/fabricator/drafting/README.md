# ALMONA Drafting Workbench

## Overview

The ALMONA Drafting Workbench is a constitutional drafting layer that provides a Moxisys-style visual drafting experience while maintaining ALMONA's Tier 3 determinism guarantees.

## Architecture: Three Gates Model

### Gate 1: Pure Drafting (Tier 0)
- **Component**: `DraftingWorkbench.tsx`
- **Purpose**: Visual drafting only - capture human intent
- **Output**: Pure geometry (rectangles, dimensions, annotations)
- **Philosophy**: "Capture human intent, no execution logic"

### Gate 2: Constitutional Validation (Tier 1)
- **Component**: `DraftingValidationGate.tsx`
- **Purpose**: Validate design against Egyptian templates and constraints
- **Output**: Validated design ready for Tier 3
- **Rules**: Deterministic, rule-based (NO ML)

### Gate 3: Execution Authority (Tier 3)
- **Component**: Existing `EngineeringBay.tsx` + `SmartDrawEngine`
- **Purpose**: Generate manufacturing instructions
- **Output**: Deterministic BOM and cut lists

## Key Features

### ✅ Constitutional Guarantees
- **No ML/Algorithmic Learning**: All template matching is deterministic
- **Tier Separation**: Drafting layer never executes manufacturing logic
- **Audit Trail**: Complete validation history with constitutional notes
- **Rule Transparency**: All validation rules are explicit

### ✅ Moxisys-Style Experience
- Visual 2D canvas with SVG rendering
- Snap-to-grid (5mm)
- Dimension annotation tools
- Full 3D preview with Window3DGenerator integration
- Egyptian template library

### ✅ Egyptian Template System
- Deterministic template matching
- Rule-based system pack suggestions
- Constraint validation
- Template overlay visualization

## Usage

### From EngineeringBay

1. Click "Drafting Mode" button in EngineeringBay header
2. Use the drafting tools to create your design:
   - **Rectangle Tool (R)**: Draw window cells
   - **Dimension Tool (D)**: Add dimensions
   - **Select Tool (S)**: Select and modify elements
3. Select an Egyptian template from the properties panel
4. Click "Validate for ALMONA Execution"
5. Review validation results
6. If valid, design automatically converts to WindowGrid and returns to SmartDraw mode

### Programmatic Usage

```typescript
import { DraftingWorkbench } from '@/components/fabricator/drafting/DraftingWorkbench';

<DraftingWorkbench
  onDesignValidated={(output) => {
    // output.metadata.tier === 'Tier 0'
    // output.metadata.draftingOnly === true
    // Convert to WindowGrid using convertDraftingToWindowGrid()
  }}
  initialTemplate="egyptian_casement_2x2"
/>
```

## File Structure

```
src/components/fabricator/drafting/
├── DraftingWorkbench.tsx          # Main component
├── DraftingCanvas2D.tsx            # SVG canvas
├── DraftingPreview3D.tsx           # 3D preview (Window3DGenerator integration)
├── DraftingToolbar.tsx            # Toolbar
├── DraftingValidationGate.tsx     # Validation UI
├── DraftingContext.tsx            # Context provider
├── SnapGrid.tsx                   # Grid overlay
├── DimensionOverlay.tsx           # Dimension rendering
├── EgyptianTemplateLibrary.tsx   # Template visualization
├── hooks/
│   └── useDraftingEngine.ts       # Business logic
├── utils/
│   ├── snapUtils.ts               # Grid snapping
│   ├── dimensionValidator.ts      # Dimension validation
│   ├── egyptianTemplateMatcher.ts # Template matching
│   └── draftingToWindowGrid.ts    # Conversion utility
├── types/
│   └── drafting.ts                # Type definitions
└── __tests__/
    └── DraftingLayer.test.ts      # Constitutional tests
```

## Constitutional Rules

### ❌ FORBIDDEN in Drafting Layer
- ML/Neural networks
- BOM generation
- Cut list optimization
- Profile selection logic
- Algorithm prediction
- Any Tier 3 execution logic

### ✅ ALLOWED in Drafting Layer
- Geometry capture
- Dimension annotation
- Template matching (deterministic)
- Constraint validation (rule-based)
- Visual feedback

## Integration Points

### Drafting → Execution

```typescript
import { convertDraftingToWindowGrid } from './drafting/utils/draftingToWindowGrid';

const windowGrid = convertDraftingToWindowGrid(
  draftingOutput.geometry,
  draftingOutput.template
);

// Use windowGrid with existing ALMONA pipeline
const { components } = generateComponentsFromGrid(
  project,
  windowGrid,
  profiles,
  draftingOutput.suggestedSystemPack
);
```

## Testing

Run constitutional compliance tests:

```bash
npm test -- src/components/fabricator/drafting/__tests__/DraftingLayer.test.ts
```

Tests verify:
- Deterministic template matching
- Tier 0 purity
- No ML contamination
- Dimension validation

## Future Enhancements

- [x] Full 3D preview integration with Window3DGenerator ✅ Complete
- [ ] More Egyptian templates
- [ ] Advanced dimension tools
- [ ] Template library management
- [ ] Export/import drafting files
- [ ] Collaborative drafting features

## Constitutional Notes

All designs pass through explicit validation gates:
1. **Tier 0**: Pure geometry capture
2. **Tier 1**: Constitutional validation
3. **Tier 3**: Manufacturing execution

This ensures that the drafting layer never compromises ALMONA's 99.8% accuracy guarantee.

