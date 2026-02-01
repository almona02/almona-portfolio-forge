# Unified Design Workflow Implementation

**Date:** January 2026  
**Status:** ✅ Phase 1 Complete - Foundation Components Created

---

## 🎯 Overview

This document describes the implementation of the unified design workflow that bridges SmartDraw and Drafting modes, providing a seamless user experience with state synchronization.

---

## 📦 Components Created

### 1. DesignModeSelector
**Location:** `src/components/fabricator/DesignModeSelector.tsx`

**Purpose:** Visual mode selection interface with feature comparison

**Features:**
- Two mode cards (SmartDraw vs Drafting)
- Visual indicators for active mode
- Feature badges and recommendations
- Integrated help dialog
- localStorage persistence
- URL parameter support

**Props:**
```typescript
interface DesignModeSelectorProps {
  initialMode?: DesignMode;
  onModeChange?: (mode: DesignMode) => void;
  smartDrawCanvas?: ReactNode;
  draftingWorkbench?: ReactNode;
  showSelector?: boolean;
  projectDimensions?: { width: number; height: number };
}
```

---

### 2. DesignModeComparison
**Location:** `src/components/fabricator/DesignModeComparison.tsx`

**Purpose:** Feature comparison matrix showing parity between modes

**Features:**
- 12 feature comparison rows
- Visual indicators (✅/❌/➖)
- Best-for recommendations
- Usage guidelines

**Features Compared:**
- Grid-based design
- CAD precision
- Egyptian templates
- 3D preview
- Hardware placement
- Keyboard shortcuts
- Learning curve
- Custom geometry
- Layer management
- Undo/Redo
- Export formats
- Real-time validation

---

### 3. DesignStateBridge
**Location:** `src/components/fabricator/DesignStateBridge.tsx`

**Purpose:** Bidirectional state synchronization between SmartDraw and Drafting

**Features:**
- Converts WindowGrid → Geometry2D
- Converts Geometry2D → WindowGrid
- Debounced synchronization (500ms default)
- Automatic state updates to FabricatorWorkspaceContext

**Conversion Logic:**
- **Grid → Drafting:** Each grid cell becomes a rectangle
- **Drafting → Grid:** Rectangles are grouped into rows/columns

**Limitations:**
- Only rectangles are converted (arcs, circles, etc. are ignored in grid conversion)
- Assumes aligned rectangles for grid conversion
- Simplified row/column detection

---

### 4. DesignWorkflowWrapper
**Location:** `src/components/fabricator/DesignWorkflowWrapper.tsx`

**Purpose:** Unified route wrapper for design workflow

**Features:**
- URL parameter handling (`?mode=smartdraw|drafting`)
- localStorage persistence
- Project loading from route params
- Mode switching with state preservation
- Integration with FabricatorWorkspaceContext

**Route:** `/fabricator/workflow/design/:projectId?`

---

### 5. useDesignModeRecommendation
**Location:** `src/hooks/useDesignModeRecommendation.ts`

**Purpose:** Smart recommendations based on user context

**Recommendation Rules:**
1. **First-time user** → SmartDraw (confidence: 0.9)
2. **Architect/Engineer role** → Drafting (confidence: 0.85)
3. **Complex dimensions** (complexity > 0.7) → Drafting (confidence: 0.8)
4. **High historical complexity** → Drafting (confidence: 0.75)
5. **Custom geometry detected** → Drafting (confidence: 0.9)
6. **Default** → SmartDraw (confidence: 0.6)

**Complexity Calculation:**
- Based on window area and aspect ratio
- Normalized to 0-1 scale
- Considers both size and shape

---

## 🔄 Integration Points

### App.tsx Routes
```typescript
<Route path="/fabricator/workflow/*" element={<MasterLayout />}>
  {/* Existing route */}
  <Route path="engineering-bay/:projectId?" element={<EngineeringBayWrapper />} />
  
  {/* NEW: Unified design route */}
  <Route path="design/:projectId?" element={<DesignWorkflowWrapper />} />
</Route>
```

### EngineeringBay Integration
**Status:** Pending (Phase 2)

**Planned Changes:**
- Replace `designMode` state with `DesignModeSelector`
- Remove hidden toggle
- Integrate state bridge

---

## 📊 State Flow

```
User selects mode
  ↓
DesignModeSelector updates mode
  ↓
DesignStateBridge syncs state
  ↓
SmartDraw Grid ↔ Drafting Geometry
  ↓
FabricatorWorkspaceContext updated
  ↓
Project state persisted
```

---

## 🎨 User Experience Flow

### Before (Fragmented)
```
/fabricator/workflow/engineering-bay
  → Shows SmartDraw (default)
  → Need to know ?mode=drafting URL param
  → Or find hidden toggle
  → No state sync between modes
```

### After (Unified)
```
/fabricator/workflow/design
  → Shows mode selector with both options
  → Clear visual comparison
  → User chooses mode
  → URL updates: ?mode=drafting
  → State automatically syncs
  → Can switch modes seamlessly
```

---

## 🔧 Technical Details

### State Synchronization
- **Debounce:** 500ms (configurable)
- **Direction:** Bidirectional
- **Persistence:** localStorage + URL params
- **Context:** FabricatorWorkspaceContext

### Conversion Algorithms

#### Grid → Drafting
```typescript
// Each grid cell → Rectangle
{
  x: calculated from colWidths,
  y: calculated from rowHeights,
  width: colWidths[colIndex],
  height: rowHeights[rowIndex],
  type: cell.type,
  id: cell.id
}
```

#### Drafting → Grid
```typescript
// Rectangles grouped by position
// Detects rows/columns from Y/X coordinates
// Creates GridCell array with row/col indices
```

---

## 📝 Next Steps (Phase 2)

### High Priority
1. ✅ **Complete EngineeringBay Integration**
   - Replace designMode logic
   - Integrate DesignModeSelector
   - Remove URL parameter dependency

2. ✅ **Enhance State Bridge**
   - Improve grid detection algorithm
   - Handle non-rectangular geometry
   - Add conversion validation

3. ✅ **Add Mode Switching Animation**
   - Smooth transitions
   - Loading states
   - Progress indicators

### Medium Priority
4. **User Preference Learning**
   - Track mode usage patterns
   - Suggest mode based on history
   - Remember last used mode per project type

5. **Keyboard Shortcuts**
   - `Ctrl+M` to switch modes
   - Quick mode toggle
   - Mode-specific shortcuts

### Low Priority
6. **Advanced Features**
   - Mode-specific toolbars
   - Contextual help
   - Onboarding flow

---

## 🐛 Known Limitations

1. **Grid Conversion:**
   - Only handles aligned rectangles
   - Complex geometries may not convert perfectly
   - Manual mullions not fully supported

2. **State Sync:**
   - 500ms debounce may feel slow for fast typers
   - Large grids may cause performance issues

3. **Mode Switching:**
   - No animation yet (planned for Phase 2)
   - No loading states during conversion

---

## ✅ Testing Checklist

- [ ] Mode selection works
- [ ] URL parameters persist
- [ ] localStorage persistence works
- [ ] State syncs between modes
- [ ] Grid → Drafting conversion accurate
- [ ] Drafting → Grid conversion accurate
- [ ] Recommendations appear correctly
- [ ] Feature comparison dialog works
- [ ] Project loads from route params
- [ ] Mode switching preserves state

---

## 📚 Related Documentation

- `docs/WORKFLOW_IMPORT_CHAIN_ANALYSIS.md` - Import chain analysis
- `docs/CURRENT_PROJECT_WORKFLOW_ANALYSIS.md` - Current workflow structure

---

**Last Updated:** January 2026  
**Implementation Status:** Phase 1 Complete ✅

