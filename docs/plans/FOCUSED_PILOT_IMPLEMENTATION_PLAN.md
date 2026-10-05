# Focused Pilot Implementation Plan
## 2-3 Week Preset Bridge → 3D Generator Integration

**Goal**: Prove the core concept with a working prototype  
**Timeline**: 2-3 weeks (realistic, de-risked)  
**Success Metric**: Visual checklist validation (Pass/Fail per pattern)

---

## Week 1-2: Build Preset Bridge in Isolation

### Core Task: `presetUtils.ts` + `SmartDrawCanvas` Pattern Selection

**Deliverable**: Functional prototype where selecting a pattern dropdown automatically redraws canvas grid.

#### Step 1: Create `presetUtils.ts`
```typescript
// src/lib/fabricator/presetUtils.ts
import { EGYPTIAN_PATTERNS, type EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { WindowGrid, GridCell } from '@/types/fabricator';

/**
 * Get pattern by ID
 */
export function getPatternById(patternId: string): EgyptianPattern | null {
  return EGYPTIAN_PATTERNS.find(p => p.id === patternId) || null;
}

/**
 * Get patterns compatible with system pack
 */
export function getPatternsForSystem(systemPackId: string | null): EgyptianPattern[] {
  if (!systemPackId) return EGYPTIAN_PATTERNS;
  return EGYPTIAN_PATTERNS.filter(p => 
    p.compatibleSystems.includes(systemPackId)
  );
}

/**
 * Convert EgyptianPattern.gridSpec to WindowGrid
 */
export function patternToWindowGrid(pattern: EgyptianPattern): WindowGrid {
  return {
    rows: pattern.gridSpec.rows,
    cols: pattern.gridSpec.cols,
    cells: pattern.gridSpec.cells.map(cell => ({
      id: `${cell.row}-${cell.col}`,
      row: cell.row,
      col: cell.col,
      type: cell.type,
      openingDirection: cell.openingDirection
    })),
    colWidths: pattern.gridSpec.colWidths,
    rowHeights: pattern.gridSpec.rowHeights
  };
}

/**
 * Check if current grid matches a pattern
 */
export function gridMatchesPattern(
  grid: WindowGrid,
  pattern: EgyptianPattern
): { matches: boolean; confidence: number; differences: string[] } {
  const differences: string[] = [];
  let matchScore = 0;
  let totalChecks = 0;

  // Check dimensions
  totalChecks += 2;
  if (grid.rows === pattern.gridSpec.rows) {
    matchScore += 1;
  } else {
    differences.push(`Rows: ${grid.rows} vs ${pattern.gridSpec.rows}`);
  }
  if (grid.cols === pattern.gridSpec.cols) {
    matchScore += 1;
  } else {
    differences.push(`Cols: ${grid.cols} vs ${pattern.gridSpec.cols}`);
  }

  // Check cell types
  pattern.gridSpec.cells.forEach(patternCell => {
    totalChecks += 1;
    const userCell = grid.cells.find(
      c => c.row === patternCell.row && c.col === patternCell.col
    );
    if (userCell?.type === patternCell.type) {
      matchScore += 1;
    } else {
      differences.push(
        `Cell [${patternCell.row},${patternCell.col}]: ${userCell?.type || 'missing'} vs ${patternCell.type}`
      );
    }
  });

  const confidence = totalChecks > 0 ? (matchScore / totalChecks) * 100 : 0;
  return {
    matches: confidence >= 85,
    confidence,
    differences
  };
}
```

#### Step 2: Enhance `SmartDrawCanvas.tsx`
```typescript
// Add pattern selection props
interface SmartDrawProps {
  width: number;
  height: number;
  grid: WindowGrid;
  onGridChange: (grid: WindowGrid) => void;
  className?: string;
  // NEW: Pattern selection
  availablePatterns?: EgyptianPattern[];
  selectedPatternId?: string | null;
  onPatternSelect?: (patternId: string | null) => void;
  systemPackId?: string | null;
}

// Add pattern selector UI
const PatternSelector: React.FC<{
  patterns: EgyptianPattern[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}> = ({ patterns, selectedId, onSelect }) => {
  return (
    <Select value={selectedId || ''} onValueChange={onSelect}>
      <SelectTrigger className="w-64 bg-gray-800 border-gray-700 text-xs">
        <SelectValue placeholder="Select pattern..." />
      </SelectTrigger>
      <SelectContent className="bg-gray-900 border-gray-700">
        <SelectItem value="">None (Manual)</SelectItem>
        {patterns.map(pattern => (
          <SelectItem key={pattern.id} value={pattern.id}>
            {pattern.name} ({pattern.layout})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// In SmartDrawCanvas component:
const handlePatternSelect = (patternId: string | null) => {
  if (!patternId) {
    onPatternSelect?.(null);
    return;
  }
  
  const pattern = getPatternById(patternId);
  if (!pattern) return;
  
  const newGrid = patternToWindowGrid(pattern);
  onGridChange(newGrid);
  onPatternSelect?.(patternId);
};
```

**Success Criteria**:
- ✅ Dropdown shows available patterns for current system pack
- ✅ Selecting pattern auto-updates canvas grid (rows, cols, cell types)
- ✅ Column/row proportions update from pattern.colWidths/rowHeights
- ✅ Visual confirmation: Canvas layout matches pattern specification

---

## Week 2-3: Connect Bridge to 3D Generator

### Core Task: Pass `selectedPatternId` → `WindowUnit` → `generateModelGeometries()`

#### Step 1: Extend `WindowUnit` Interface
```typescript
// src/types/fabricator.ts
export interface WindowUnit {
  // ... existing fields ...
  grid?: WindowGrid;
  
  // NEW: Preset tracking
  presetId?: string; // ID from EGYPTIAN_PATTERNS
  presetData?: Partial<EgyptianPattern>; // Cached pattern data
}
```

#### Step 2: Update Parent Component (PrecisionDesignInterface or SmartMeasuringInterface)
```typescript
// When pattern is selected in SmartDrawCanvas:
const handlePatternSelect = (patternId: string | null) => {
  setSelectedPatternId(patternId);
  
  // Update WindowUnit with preset data
  if (project && patternId) {
    const pattern = getPatternById(patternId);
    if (pattern) {
      updateProject({
        ...project,
        presetId: patternId,
        presetData: {
          id: pattern.id,
          name: pattern.name,
          type: pattern.type,
          gridSpec: pattern.gridSpec,
          mullions: pattern.mullions,
          transoms: pattern.transoms,
          constraints: pattern.constraints,
          openingMechanism: pattern.openingMechanism
        }
      });
    }
  }
};
```

#### Step 3: Modify `generateModelGeometries()` to Accept Pattern
```typescript
// src/lib/3d/windowGeometry.ts
import { getPatternById } from '@/lib/fabricator/presetUtils';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';

export function generateModelGeometries(
  windowUnit: WindowUnit,
  pattern?: EgyptianPattern  // NEW: Optional pattern parameter
): FrameGeometry {
  // If pattern provided, use pattern-specific logic
  if (pattern) {
    return generatePresetAwareGeometries(windowUnit, pattern);
  }
  
  // Fallback to existing logic
  return generateGenericGeometries(windowUnit);
}

function generatePresetAwareGeometries(
  windowUnit: WindowUnit,
  pattern: EgyptianPattern
): FrameGeometry {
  // Use pattern.mullions for exact mullion positions
  // Use pattern.transoms for exact transom positions
  // Use pattern.gridSpec.colWidths/rowHeights for proportions
  // Use pattern.openingMechanism for sliding track visualization
  
  // ... implementation ...
}
```

**Success Criteria**:
- ✅ 3D preview updates when pattern is selected
- ✅ 2-sash sliding window shows NO central mullion (uses interlock)
- ✅ 3-panel window with fixed center shows distinct geometry
- ✅ Visual confirmation: 3D model matches pattern specification

---

## Validation Checklist (Simple Pass/Fail)

### Pattern: "Sliding Window – 2 Sash" (`sliding-2s`)

| Check | Expected | Pass/Fail |
|-------|----------|-----------|
| **Canvas Grid** | 1 row × 2 cols | ⬜ |
| **Column Proportions** | Equal widths (colWidths: [1, 1]) | ⬜ |
| **Cell Types** | Both cells = `sliding` | ⬜ |
| **Opening Directions** | Left: `right`, Right: `left` | ⬜ |
| **3D Model** | NO central mullion | ⬜ |
| **3D Model** | Shows interlock profile between sashes | ⬜ |
| **Cut List/BOM** | Includes "interlock kit" | ⬜ |
| **Cut List/BOM** | Includes "anti-lift blocks" | ⬜ |

### Pattern: "Casement Window – 2 Sash" (`casement-2s`)

| Check | Expected | Pass/Fail |
|-------|----------|-----------|
| **Canvas Grid** | 1 row × 2 cols | ⬜ |
| **Column Proportions** | Equal widths (colWidths: [1, 1]) | ⬜ |
| **Cell Types** | Both cells = `sash` | ⬜ |
| **Opening Directions** | Left: `left`, Right: `right` | ⬜ |
| **3D Model** | Shows central mullion (vertical) | ⬜ |
| **3D Model** | Shows hinge visualization points | ⬜ |
| **Cut List/BOM** | Includes mullion component | ⬜ |
| **Cut List/BOM** | Includes hinges (2 per sash) | ⬜ |

### Pattern: "Fixed + Side Casements" (`fixed-casement-2s`)

| Check | Expected | Pass/Fail |
|-------|----------|-----------|
| **Canvas Grid** | 1 row × 3 cols | ⬜ |
| **Column Proportions** | Center wider (colWidths: [1, 2, 1]) | ⬜ |
| **Cell Types** | Left: `sash`, Center: `fixed`, Right: `sash` | ⬜ |
| **3D Model** | Shows 2 mullions (between panels) | ⬜ |
| **3D Model** | Center panel is fixed (no opening mechanism) | ⬜ |
| **Cut List/BOM** | Includes 2 mullion components | ⬜ |

---

## Implementation Sequence

### Day 1-2: Foundation
1. ✅ Create `src/lib/fabricator/presetUtils.ts`
2. ✅ Add pattern lookup functions
3. ✅ Add `patternToWindowGrid()` converter

### Day 3-4: Canvas Integration
1. ✅ Add pattern selector dropdown to `SmartDrawCanvas`
2. ✅ Wire up `handlePatternSelect()` handler
3. ✅ Test with 2-3 key patterns

### Day 5-7: WindowUnit Extension
1. ✅ Extend `WindowUnit` interface with `presetId` and `presetData`
2. ✅ Update parent component to store preset data
3. ✅ Test data flow: Canvas → WindowUnit → State

### Day 8-10: 3D Generator Integration
1. ✅ Modify `generateModelGeometries()` signature
2. ✅ Create `generatePresetAwareGeometries()` function
3. ✅ Implement pattern-specific mullion/transom logic
4. ✅ Test 3D visualization for key patterns

### Day 11-14: Validation & Testing
1. ✅ Run validation checklist for 3 key patterns
2. ✅ Fix any discrepancies
3. ✅ Document findings

---

## Success Metrics

**Week 1-2 Goal**: Preset Bridge Working
- ✅ Pattern dropdown functional
- ✅ Canvas auto-updates on pattern selection
- ✅ Grid matches pattern specification

**Week 2-3 Goal**: 3D Integration Working
- ✅ 3D model responds to pattern selection
- ✅ Visual distinction between patterns
- ✅ Validation checklist: 80%+ Pass rate

**Overall Pilot Success**: 
- ✅ Core data flow proven (Pattern → Grid → 3D)
- ✅ Technical hurdles identified and resolved
- ✅ Foundation ready for FabricationData layer

---

## Next Steps After Pilot

Once pilot is validated:
1. **Phase 2**: Add FabricationData generation (2-3 weeks)
2. **Phase 3**: Add validation layer (2-3 weeks)
3. **Phase 4**: Add hardware recommendations (1-2 weeks)
4. **Phase 5**: Add accuracy metrics (1 week)

**Total Timeline**: 8-12 weeks (realistic, not aggressive)

---

## Notes

- **Focus**: One pattern at a time, validate thoroughly
- **De-risk**: Start with simplest patterns (sliding-2s, casement-2s)
- **Measure**: Use checklist, not percentages (early stage)
- **Iterate**: Fix issues before adding complexity

