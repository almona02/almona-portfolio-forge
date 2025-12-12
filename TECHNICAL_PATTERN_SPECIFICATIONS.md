# Technical Pattern Specifications - Engineering Details

## ✅ Implementation Complete

All 20 Egyptian window patterns now include **complete engineering technical specifications** that are dynamically applied to the blueprint preview.

## Technical Specifications Added to Each Pattern

### 1. **Grid Structure (`gridSpec`)**
- Exact rows/cols configuration
- Cell types (fixed, sash, sliding, panel)
- Opening directions (left, right, top, bottom)
- Column width proportions (`colWidths`)
- Row height proportions (`rowHeights`)

### 2. **Mullion Specifications (`mullions`)**
- Position (which column division)
- Type (standard, structural, corner)
- Width in mm (typically 50mm standard, 60-100mm structural)
- Reinforcement requirement flag

### 3. **Transom Specifications (`transoms`)**
- Position (which row division)
- Type (standard, structural)
- Height in mm (typically 50mm standard)
- Reinforcement requirement flag

### 4. **Technical Constraints (`constraints`)**
- Min/max sash width (mm)
- Min/max sash height (mm)
- Max sash area (m²) before heavy-duty hardware
- Reinforcement requirement
- Wind load category (low, medium, high)

### 5. **Opening Mechanism (`openingMechanism`)**
- Type (sliding, casement, tilt-turn, awning, fixed, bi-fold)
- Direction (left, right, both, outward, inward)
- Track type (top, bottom, both) for sliding systems

## Blueprint Preview Enhancements

### Dynamic Technical Annotations

1. **Mullion Labels**
   - Shows mullion type (STANDARD, STRUCTURAL, CORNER)
   - Displays actual width (e.g., "STANDARD 50mm")
   - Structural mullions highlighted in red with ⚙️ icon
   - Position calculated using `colWidths` proportions

2. **Transom Labels**
   - Shows transom type (STANDARD, STRUCTURAL)
   - Displays actual height (e.g., "STANDARD 50mm")
   - Structural transoms highlighted in red with ⚙️ icon
   - Position calculated using `rowHeights` proportions

3. **Cell Technical Details**
   - Cell type label (FIXED, SASH, SLIDING, PANEL)
   - Opening direction arrows (← → ↑ ↓)
   - Cell dimensions in mm (e.g., "1200×1400mm")
   - Cell area in m² (for cells > 0.5m²)
   - Color coding by cell type

4. **Proportional Width/Height Support**
   - Blueprint respects `colWidths` and `rowHeights` from pattern
   - Example: "Fixed + Side Casements" has center panel 1.5x wider
   - Mullions/transoms positioned correctly with proportions

## Pattern Examples with Technical Specs

### Example 1: Sliding Window – 2 Sash
```typescript
gridSpec: {
  rows: 1,
  cols: 2,
  cells: [
    { row: 0, col: 0, type: 'sliding', openingDirection: 'right' },
    { row: 0, col: 1, type: 'sliding', openingDirection: 'left' }
  ],
  colWidths: [1, 1] // Equal width panels
}
mullions: [
  { position: 0, type: 'standard', width: 50 }
]
constraints: {
  minSashWidth: 600,
  maxSashWidth: 1200,
  maxSashArea: 2.5,
  windLoadCategory: 'medium'
}
```

### Example 2: Fixed + Side Casements
```typescript
gridSpec: {
  rows: 1,
  cols: 3,
  cells: [
    { row: 0, col: 0, type: 'sash', openingDirection: 'left' },
    { row: 0, col: 1, type: 'fixed' },
    { row: 0, col: 2, type: 'sash', openingDirection: 'right' }
  ],
  colWidths: [1, 1.5, 1] // Center fixed panel wider
}
mullions: [
  { position: 0, type: 'standard', width: 50 },
  { position: 1, type: 'standard', width: 50 }
]
```

### Example 3: Kitchen Door with ACP Bottom
```typescript
gridSpec: {
  rows: 2,
  cols: 1,
  cells: [
    { row: 0, col: 0, type: 'sash', openingDirection: 'right' },
    { row: 1, col: 0, type: 'panel' } // ACP bottom panel
  ],
  rowHeights: [1.5, 1] // Top glass panel taller
}
transoms: [
  { position: 0, type: 'standard', height: 50 }
]
```

## Blueprint Visual Features

### Color Coding
- **FIXED**: Blue (`#3b82f6`)
- **SASH**: Green (`#22c55e`)
- **SLIDING**: Yellow (`#eab308`)
- **PANEL**: Grey (`#6b7280`)
- **EMPTY**: Red (`#ef4444`)

### Structural Indicators
- **Standard mullions/transoms**: Grey (#6b7280), 2.5px stroke
- **Structural mullions/transoms**: Red (#dc2626), 3px stroke, ⚙️ icon

### Dynamic Updates
- Blueprint updates instantly when pattern is selected
- Grid structure changes reflect in real-time
- Mullion/transom positions recalculate with proportions
- Cell dimensions update based on overall window size

## Engineering Accuracy

### Technical Details Displayed:
✅ Mullion positions and widths
✅ Transom positions and heights
✅ Cell types and opening directions
✅ Cell dimensions (width × height in mm)
✅ Cell areas (m²) for large cells
✅ Proportional column/row widths
✅ Structural reinforcement indicators
✅ Wind load categories

### Pattern Selection Flow:
1. User selects pattern → `gridSpec` applied to grid state
2. Grid state updates → Blueprint recalculates
3. Mullions/transoms rendered at correct positions
4. Cell types and dimensions displayed
5. Technical annotations shown

## Gold Tier Engineering Standards Met:

✅ **100% Technical Coverage**: All patterns have complete engineering specs
✅ **Dynamic Blueprint**: All technical details render in real-time
✅ **Proportional Support**: Handles unequal column/row widths
✅ **Structural Indicators**: Visual distinction for reinforcement needs
✅ **Dimension Accuracy**: Actual mm dimensions displayed
✅ **Opening Directions**: Visual arrows show how sashes open
✅ **Constraint Validation**: Min/max dimensions enforced
✅ **Wind Load Categories**: Engineering classification included

## Result

The blueprint preview now displays **all engineering technical details** dynamically, making it suitable for:
- Technical engineers reviewing designs
- Workshop operators understanding specifications
- Quality control verification
- Production planning
- Client presentations with technical accuracy

**Status: ✅ GOLD TIER - Engineering-Grade Technical Specifications Complete**

