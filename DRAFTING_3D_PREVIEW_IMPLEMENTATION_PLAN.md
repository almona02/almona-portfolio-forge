# Drafting Workbench 3D Preview Enhancement Plan
## Full 3D Preview Implementation (Competitive Parity)

**Date:** January 2026  
**Status:** Implementation Plan  
**Priority:** High (Feature Gap - Competitors Have Full 3D)  
**Estimated Effort:** 3-4 weeks  
**Classification:** Feature Enhancement

---

## Executive Summary

This document outlines the plan to enhance the Drafting Workbench's 3D Preview from **minimal implementation** (basic geometry rendering) to **full 3D preview** matching gold-tier competitors (Orgadata LogiKal, KLAES, Moxisys Design Flow).

**Current State:** `DraftingPreview3D.tsx` renders basic 3D shapes (boxes, cylinders, extrusions) from drafting geometry.

**Target State:** Full 3D window/fenestration preview with hardware visualization, material properties, opening animations, and interactive controls - matching Window3DGenerator capabilities.

**Key Advantage:** ALMONA already has `Window3DGenerator` (1,879 lines) - we can leverage existing infrastructure rather than building from scratch.

---

## 1. Current State Analysis

### 1.1 Current DraftingPreview3D Implementation

**File:** `src/components/fabricator/drafting/DraftingPreview3D.tsx` (282 lines)

**Current Capabilities:**
- ✅ Basic geometry rendering (rectangles → boxes, circles → cylinders, arcs → partial cylinders, polygons → extrusions, lines → tubes)
- ✅ Three.js integration (React Three Fiber)
- ✅ Camera controls (OrbitControls)
- ✅ Lighting (ambient, directional, point)
- ✅ Grid helper and coordinate axes
- ✅ Info overlay (element counts)
- ✅ Controls hint overlay

**Limitations:**
- ❌ No window/fenestration-specific rendering
- ❌ No hardware visualization (hinges, handles, locks, rollers)
- ❌ No material properties (aluminum, UPVC materials)
- ❌ No opening animations (casement, tilt-turn, pivot, sliding)
- ❌ No realistic frame/sash rendering
- ❌ No glass rendering
- ❌ No system pack integration
- ❌ Basic lighting (no post-processing, shadows limited)
- ❌ No quality settings
- ❌ No export capabilities

### 1.2 Existing Infrastructure (Window3DGenerator)

**File:** `src/components/fabricator/Window3DGenerator.tsx` (1,879 lines)

**Available Capabilities:**
- ✅ Full window/fenestration 3D rendering
- ✅ Hardware visualization (hinges, handles, locks, rollers) with GLTF models
- ✅ Material properties (aluminum, UPVC with PBR materials)
- ✅ Opening animations (casement, tilt-turn, pivot, sliding)
- ✅ Realistic frame/sash geometry generation
- ✅ Glass rendering with transparency
- ✅ System pack integration
- ✅ Advanced lighting (Environment, shadows, post-processing - SSAO, Bloom, Vignette)
- ✅ Quality settings (low, medium, high, ultra)
- ✅ Export capabilities (GLB, STL, OBJ)
- ✅ Interactive section view (clipping planes)
- ✅ Exploded view
- ✅ Measurement rendering
- ✅ Physics simulation (optional)
- ✅ Performance optimization (debounced geometry generation, viewport culling)

**Key Integration Points:**
- ✅ Accepts `WindowUnit` type as input
- ✅ Uses `generateModelGeometries` from `@/lib/3d/windowGeometry`
- ✅ Uses hardware model library from `@/lib/3d/hardware/HardwareModelLibrary`
- ✅ Material system from `@/lib/3d/hooks` (useAdvancedMaterials)

### 1.3 Conversion Infrastructure

**File:** `src/components/fabricator/drafting/utils/draftingToWindowGrid.ts`

**Available Capabilities:**
- ✅ `convertDraftingToWindowGrid()` - Converts drafting geometry to WindowGrid
- ✅ Maps drafting cell types to WindowGrid cell types
- ✅ Calculates column widths and row heights from geometry

**Usage in DraftingWorkbench:**
- Already used in optimization handler (line 390, 705, 982)
- Creates WindowUnit from drafting geometry (line 402-419, 987-1004)

---

## 2. Implementation Strategy

### 2.1 Architectural Approach

**Option A: Integrate Window3DGenerator (Recommended)**
- **Pros:** Leverage existing 1,879-line component, maintain consistency, reuse all features
- **Cons:** Requires converting drafting geometry to WindowUnit format
- **Effort:** Medium (2-3 weeks)
- **Risk:** Low (existing component is proven)

**Option B: Enhance DraftingPreview3D Directly**
- **Pros:** Keep drafting-specific implementation separate
- **Cons:** Duplicate 1,879 lines of code, maintenance burden, inconsistent features
- **Effort:** High (4-6 weeks)
- **Risk:** High (code duplication, maintenance issues)

**Decision: Option A (Integrate Window3DGenerator)**

**Rationale:**
1. ALMONA already has a world-class 3D rendering engine
2. Avoid code duplication (DRY principle)
3. Maintain consistency across application
4. Faster time-to-market
5. Constitutional boundary: DraftingPreview3D remains Tier 0 (visual only), Window3DGenerator handles rendering (also Tier 0)

### 2.2 Constitutional Boundaries

**Tier 0 Drafting Layer (DraftingPreview3D):**
- ✅ Visual preview only (no execution logic)
- ✅ Converts drafting geometry to WindowUnit format
- ✅ Passes WindowUnit to Window3DGenerator
- ✅ No manufacturing/BOM generation
- ✅ No optimization logic

**Window3DGenerator:**
- ✅ Also Tier 0 (visualization only)
- ✅ Renders WindowUnit in 3D
- ✅ No execution logic
- ✅ No BOM generation

**Clear Separation:**
- DraftingPreview3D: Drafting geometry → WindowUnit conversion
- Window3DGenerator: WindowUnit → 3D rendering

---

## 3. Implementation Plan

### Phase 1: Core Integration (Week 1)

#### 3.1 Enhance DraftingPreview3D Component

**Task 1.1: Convert Drafting Geometry to WindowUnit**

**File:** `src/components/fabricator/drafting/DraftingPreview3D.tsx`

**Changes:**
1. Import `Window3DGenerator` (lazy-loaded)
2. Import `convertDraftingToWindowGrid` utility
3. Import `WindowUnit` type
4. Add conversion logic from drafting geometry to WindowUnit
5. Replace basic geometry rendering with Window3DGenerator

**Implementation:**
```typescript
// Convert drafting geometry to WindowUnit
const convertToWindowUnit = useMemo(() => {
  const geometry = drafting.getGeometry();
  const activeTemplate = drafting.getActiveTemplate();
  const template = drafting.getAvailableTemplates().find(t => t.id === activeTemplate);
  
  if (!template || geometry.rectangles.length === 0) {
    return null;
  }
  
  // Convert to WindowGrid
  const grid = convertDraftingToWindowGrid(geometry, template);
  
  // Calculate overall dimensions
  const rects = geometry.rectangles;
  const minX = Math.min(...rects.map(r => r.x));
  const maxX = Math.max(...rects.map(r => r.x + r.width));
  const minY = Math.min(...rects.map(r => r.y));
  const maxY = Math.max(...rects.map(r => r.y + r.height));
  const overallWidth = maxX - minX;
  const overallHeight = maxY - minY;
  
  // Create WindowUnit
  const windowUnit: WindowUnit = {
    id: `draft-preview-${Date.now()}`,
    orderNumber: 'DRAFT-PREVIEW',
    posNumber: 'DRAFT-PREVIEW-001',
    type: 'draft',
    overallWidth,
    overallHeight,
    grid,
    systemPackId: selectedSystemPackId, // From context/props
    components: [], // Will be generated if needed
    color: 'white', // Default or from material selector
    glazing: {},
    hardware: [],
    status: 'design',
    optimization: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  return windowUnit;
}, [drafting, selectedSystemPackId, selectedMaterial]);
```

**Task 1.2: Integrate Window3DGenerator**

**Changes:**
1. Lazy-load Window3DGenerator component
2. Replace Canvas/geometry rendering with Window3DGenerator
3. Pass WindowUnit to Window3DGenerator
4. Handle empty state (no geometry)

**Implementation:**
```typescript
const Window3DGenerator = lazy(() => 
  import('@/components/fabricator/Window3DGenerator').then(module => ({ 
    default: module.Window3DGenerator 
  }))
);

// In render:
{windowUnit ? (
  <Suspense fallback={<LoadingState />}>
    <Window3DGenerator
      windowUnit={windowUnit}
      showControls={true}
      quality="high"
      enableShadows={true}
      explodedView={false}
    />
  </Suspense>
) : (
  <EmptyState ... />
)}
```

**Task 1.3: Add Material/System Pack Selection Context**

**Changes:**
1. Get selectedMaterial and selectedSystemPackId from DraftingContext or props
2. Pass to WindowUnit conversion
3. Update WindowUnit when material/system pack changes

**Dependencies:**
- MaterialSystemSelector already exists in DraftingWorkbench
- selectedMaterial and selectedSystemPackId state already exists

**Estimated Effort:** 3-4 days

**Deliverables:**
- ✅ DraftingPreview3D uses Window3DGenerator
- ✅ Basic 3D window preview works
- ✅ Material/system pack integration

---

### Phase 2: Enhanced Features (Week 2)

#### 3.2 Add Hardware Visualization

**Task 2.1: Extract Hardware from Drafting Geometry**

**Challenge:** Drafting geometry may have hardware annotations/placements that need to be converted to WindowUnit hardware array.

**Approach:**
1. Check if drafting geometry has hardware information
2. If HardwarePlacementTool data exists, convert to WindowUnit hardware format
3. Otherwise, generate default hardware based on window type

**Files to Modify:**
- `src/components/fabricator/drafting/DraftingPreview3D.tsx`
- `src/components/fabricator/drafting/utils/draftingToWindowGrid.ts` (add hardware conversion)

**Implementation:**
```typescript
// Extract hardware from drafting geometry
const extractHardware = (geometry: Geometry2D): Hardware[] => {
  // Check for hardware annotations/markers in geometry
  // Convert to WindowUnit hardware format
  // Default hardware placement based on Egyptian standards:
  // - Handles: 1100mm from bottom
  // - Hinges: 150mm from top
};
```

**Task 2.2: Generate Components (Optional)**

**Note:** Component generation requires profiles and may be computationally expensive. Options:

**Option A: Minimal Components (Recommended for Preview)**
- Generate minimal components just for visualization
- Skip full component generation (performance)
- Window3DGenerator can render from grid alone

**Option B: Full Component Generation**
- Use `generateComponentsFromGrid` from `@/algorithms/smartDraw`
- Requires profiles array
- More accurate but slower

**Decision: Option A (Minimal Components)**
- Preview should be fast and responsive
- Grid-based rendering is sufficient for preview
- Full component generation happens in optimization/execution phase

**Estimated Effort:** 2-3 days

**Deliverables:**
- ✅ Hardware visualization in 3D preview
- ✅ Default hardware placement (Egyptian standards)
- ✅ Hardware from drafting geometry (if available)

---

#### 3.3 Add Opening Animations

**Task 3.1: Enable Animation Controls**

**Window3DGenerator already supports:**
- `isAnimating` prop
- `animationProgress` prop
- Opening animations for casement, tilt-turn, pivot, sliding

**Changes:**
1. Add animation controls to DraftingPreview3D
2. Add play/pause button
3. Add animation progress indicator
4. Connect to Window3DGenerator props

**Implementation:**
```typescript
const [isAnimating, setIsAnimating] = useState(false);
const [animationProgress, setAnimationProgress] = useState(0);

// In Window3DGenerator:
<Window3DGenerator
  windowUnit={windowUnit}
  isAnimating={isAnimating}
  animationProgress={animationProgress}
  // ... other props
/>

// Controls UI:
<Button onClick={() => setIsAnimating(!isAnimating)}>
  {isAnimating ? <Pause /> : <Play />}
</Button>
```

**Estimated Effort:** 1-2 days

**Deliverables:**
- ✅ Opening animations work in 3D preview
- ✅ Play/pause controls
- ✅ Animation progress indicator

---

#### 3.4 Add Quality Settings & Post-Processing

**Task 4.1: Add Quality Controls**

**Window3DGenerator already supports:**
- `quality` prop: 'low' | 'medium' | 'high' | 'ultra'
- `enableShadows` prop
- Post-processing (SSAO, Bloom, Vignette) for 'ultra' quality

**Changes:**
1. Add quality selector (dropdown/buttons)
2. Add shadow toggle
3. Pass to Window3DGenerator
4. Store preferences (localStorage)

**Implementation:**
```typescript
const [quality, setQuality] = useState<'low' | 'medium' | 'high' | 'ultra'>('high');
const [enableShadows, setEnableShadows] = useState(true);

// In Window3DGenerator:
<Window3DGenerator
  windowUnit={windowUnit}
  quality={quality}
  enableShadows={enableShadows}
  // ... other props
/>

// Controls UI:
<Select value={quality} onValueChange={setQuality}>
  <SelectItem value="low">Low</SelectItem>
  <SelectItem value="medium">Medium</SelectItem>
  <SelectItem value="high">High</SelectItem>
  <SelectItem value="ultra">Ultra</SelectItem>
</Select>
<Toggle checked={enableShadows} onCheckedChange={setEnableShadows}>
  Shadows
</Toggle>
```

**Estimated Effort:** 1-2 days

**Deliverables:**
- ✅ Quality settings (low, medium, high, ultra)
- ✅ Shadow toggle
- ✅ Post-processing effects (ultra quality)

---

### Phase 3: Advanced Features (Week 3)

#### 3.5 Add Interactive Controls

**Task 5.1: Add Section View (Clipping Planes)**

**Window3DGenerator already supports:**
- `sectionViewEnabled` state
- `clippingPlane` prop
- Interactive section gizmo

**Changes:**
1. Add section view toggle
2. Add clipping plane controls
3. Connect to Window3DGenerator

**Estimated Effort:** 2-3 days

**Deliverables:**
- ✅ Section view toggle
- ✅ Interactive clipping plane

**Task 5.2: Add Exploded View**

**Window3DGenerator already supports:**
- `explodedView` prop
- `setExplodedView` callback

**Changes:**
1. Add exploded view toggle
2. Connect to Window3DGenerator

**Estimated Effort:** 1 day

**Deliverables:**
- ✅ Exploded view toggle

**Task 5.3: Add Export Capabilities**

**Window3DGenerator already supports:**
- Export to GLB, STL, OBJ
- Export button in controls

**Changes:**
1. Ensure export button is visible in DraftingPreview3D
2. Test export functionality
3. Add export to menu bar (optional)

**Estimated Effort:** 1 day

**Deliverables:**
- ✅ Export to GLB, STL, OBJ
- ✅ Export button in 3D preview

---

#### 3.6 Performance Optimization

**Task 6.1: Optimize Conversion**

**Challenge:** Converting drafting geometry to WindowUnit on every render can be expensive.

**Solution:**
1. Memoize WindowUnit conversion (useMemo)
2. Only regenerate when geometry/material/system pack changes
3. Debounce geometry changes (if needed)

**Implementation:**
```typescript
const windowUnit = useMemo(() => {
  return convertToWindowUnit(drafting, selectedSystemPackId, selectedMaterial);
}, [drafting.getGeometry(), selectedSystemPackId, selectedMaterial]);
```

**Task 6.2: Lazy Load Window3DGenerator**

**Already Done:** Window3DGenerator should be lazy-loaded to avoid blocking initial render.

**Task 6.3: Handle Large Geometries**

**Window3DGenerator already handles:**
- Debounced geometry generation (300ms)
- Viewport culling
- Performance optimization

**No changes needed** - Window3DGenerator handles performance.

**Estimated Effort:** 1-2 days

**Deliverables:**
- ✅ Memoized WindowUnit conversion
- ✅ Lazy-loaded Window3DGenerator
- ✅ Performance optimized for large geometries

---

### Phase 4: Polish & Testing (Week 4)

#### 3.7 UI/UX Enhancements

**Task 7.1: Add Loading States**

**Changes:**
1. Show loading state while Window3DGenerator loads
2. Show loading state while geometry converts
3. Smooth transitions

**Task 7.2: Add Error Handling**

**Changes:**
1. Handle conversion errors gracefully
2. Show error messages
3. Fallback to basic preview if Window3DGenerator fails

**Task 7.3: Add Tooltips & Help**

**Changes:**
1. Add tooltips to controls
2. Add help text for 3D preview features
3. Update help panel

**Task 7.4: Responsive Design**

**Changes:**
1. Ensure 3D preview works on different screen sizes
2. Adjust control layout for mobile
3. Test touch controls (if applicable)

**Estimated Effort:** 2-3 days

**Deliverables:**
- ✅ Loading states
- ✅ Error handling
- ✅ Tooltips & help
- ✅ Responsive design

---

#### 3.8 Testing & Documentation

**Task 8.1: Unit Tests**

**Files to Test:**
- `src/components/fabricator/drafting/DraftingPreview3D.tsx`
- `src/components/fabricator/drafting/utils/draftingToWindowGrid.ts` (hardware conversion)

**Test Cases:**
1. Empty geometry state
2. Basic geometry conversion
3. Material/system pack changes
4. Hardware extraction
5. Error handling

**Task 8.2: Integration Tests**

**Test Cases:**
1. Drafting geometry → WindowUnit → 3D preview flow
2. Material changes update 3D preview
3. System pack changes update 3D preview
4. Animation controls work
5. Export functionality

**Task 8.3: Performance Tests**

**Test Cases:**
1. Large geometries (100+ rectangles)
2. Complex templates
3. Multiple material changes
4. Animation performance

**Task 8.4: Documentation**

**Updates:**
1. Update `DRAFTING_WORKBENCH_COMPLETION_SUMMARY.md`
2. Update `DRAFTING_WORKBENCH_COMPETITIVE_COMPARISON.md`
3. Update README in drafting directory
4. Add inline code comments

**Estimated Effort:** 3-4 days

**Deliverables:**
- ✅ Unit tests
- ✅ Integration tests
- ✅ Performance tests
- ✅ Documentation updates

---

## 4. Technical Details

### 4.1 Component Structure

**Before:**
```
DraftingPreview3D.tsx (282 lines)
├── Basic geometry rendering (Rectangle3D, Circle3D, Arc3D, Polygon3D, Line3D)
├── Canvas setup
├── Lighting
├── OrbitControls
└── Info overlays
```

**After:**
```
DraftingPreview3D.tsx (~150-200 lines)
├── WindowUnit conversion logic
├── Material/system pack integration
├── Hardware extraction (optional)
├── Lazy-loaded Window3DGenerator
├── Animation controls (play/pause)
├── Quality controls (quality selector, shadow toggle)
├── Section view controls (optional)
├── Exploded view toggle (optional)
└── Loading/error states
```

**Window3DGenerator.tsx (1,879 lines) - No changes needed**
- Handles all 3D rendering
- Hardware visualization
- Opening animations
- Post-processing
- Export capabilities

### 4.2 Data Flow

```
Drafting Geometry (DraftingContext)
    ↓
convertDraftingToWindowGrid()
    ↓
WindowUnit (with grid, dimensions, system pack, material)
    ↓
Window3DGenerator
    ↓
3D Rendering (Three.js)
```

### 4.3 State Management

**DraftingPreview3D State:**
- `windowUnit` (memoized, derived from drafting geometry)
- `quality` (user preference)
- `enableShadows` (user preference)
- `isAnimating` (animation state)
- `animationProgress` (animation progress)
- `sectionViewEnabled` (optional)
- `explodedView` (optional)

**No new global state needed** - all state is local to DraftingPreview3D.

### 4.4 Dependencies

**New Dependencies:** None (Window3DGenerator already exists)

**Existing Dependencies:**
- `@react-three/fiber` (already used)
- `@react-three/drei` (already used)
- `three` (already used)
- `@/components/fabricator/Window3DGenerator` (existing component)
- `@/lib/3d/windowGeometry` (used by Window3DGenerator)
- `@/lib/3d/hardware/HardwareModelLibrary` (used by Window3DGenerator)

### 4.5 Performance Considerations

**Optimizations:**
1. Memoize WindowUnit conversion (only regenerate when geometry/material/system pack changes)
2. Lazy-load Window3DGenerator (code splitting)
3. Window3DGenerator already has debounced geometry generation (300ms)
4. Window3DGenerator already has viewport culling
5. Window3DGenerator already has performance optimization

**Expected Performance:**
- Initial load: <2s (Window3DGenerator lazy-loaded)
- Geometry conversion: <100ms (memoized)
- 3D rendering: 60 FPS (Window3DGenerator handles)
- Large geometries (100+ rectangles): <500ms conversion, 60 FPS rendering

---

## 5. Competitive Comparison

### 5.1 Before Implementation

| Feature | ALMONA (Current) | Orgadata LogiKal | KLAES | Moxisys | Gap |
|---------|------------------|------------------|-------|---------|-----|
| **3D Preview** | ⚠️ Basic geometry | ✅ Full 3D | ✅ Full 3D | ✅ Full 3D | **Large** |
| **Hardware Visualization** | ❌ No | ✅ Full | ✅ Full | ✅ Full | **Large** |
| **Material Properties** | ❌ No | ✅ Full | ✅ Full | ✅ Full | **Large** |
| **Opening Animations** | ❌ No | ✅ Full | ✅ Full | ✅ Full | **Large** |
| **Quality Settings** | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes | **Medium** |
| **Export Formats** | ❌ No | ✅ Multiple | ✅ Multiple | ✅ Multiple | **Medium** |

### 5.2 After Implementation

| Feature | ALMONA (Enhanced) | Orgadata LogiKal | KLAES | Moxisys | Gap |
|---------|-------------------|------------------|-------|---------|-----|
| **3D Preview** | ✅ Full 3D (Window3DGenerator) | ✅ Full 3D | ✅ Full 3D | ✅ Full 3D | **Parity** |
| **Hardware Visualization** | ✅ Full (GLTF models) | ✅ Full | ✅ Full | ✅ Full | **Parity** |
| **Material Properties** | ✅ Full (PBR materials) | ✅ Full | ✅ Full | ✅ Full | **Parity** |
| **Opening Animations** | ✅ Full (casement, tilt-turn, pivot, sliding) | ✅ Full | ✅ Full | ✅ Full | **Parity** |
| **Quality Settings** | ✅ Yes (low, medium, high, ultra) | ✅ Yes | ✅ Yes | ✅ Yes | **Parity** |
| **Export Formats** | ✅ GLB, STL, OBJ | ✅ Multiple | ✅ Multiple | ✅ Multiple | **Parity** |
| **Post-Processing** | ✅ SSAO, Bloom, Vignette (ultra) | ⚠️ Limited | ⚠️ Limited | ⚠️ Limited | **ALMONA Advantage** |
| **Section View** | ✅ Interactive clipping | ⚠️ Limited | ⚠️ Limited | ⚠️ Limited | **ALMONA Advantage** |
| **Exploded View** | ✅ Yes | ⚠️ Limited | ⚠️ Limited | ⚠️ Limited | **ALMONA Advantage** |

**Result:** After implementation, ALMONA achieves **feature parity** with competitors and adds **unique advantages** (post-processing, section view, exploded view).

---

## 6. Risks & Mitigations

### 6.1 Technical Risks

**Risk 1: Performance Issues with Large Geometries**
- **Mitigation:** Window3DGenerator already handles performance optimization (debouncing, viewport culling)
- **Monitoring:** Performance tests in Phase 4

**Risk 2: Conversion Errors**
- **Mitigation:** Error handling in Phase 4, fallback to basic preview
- **Testing:** Unit tests for conversion logic

**Risk 3: Window3DGenerator Compatibility**
- **Mitigation:** Window3DGenerator is stable (1,879 lines, used in production)
- **Testing:** Integration tests in Phase 4

### 6.2 Timeline Risks

**Risk 1: Scope Creep**
- **Mitigation:** Stick to phased approach, defer optional features (section view, exploded view) to Phase 3

**Risk 2: Dependencies**
- **Mitigation:** All dependencies exist (Window3DGenerator, conversion utilities)
- **Contingency:** None needed (no external dependencies)

### 6.3 Constitutional Risks

**Risk 1: Tier Boundary Violation**
- **Mitigation:** DraftingPreview3D remains Tier 0 (visual only), Window3DGenerator also Tier 0 (visual only)
- **Validation:** Code review, architectural review

---

## 7. Success Criteria

### 7.1 Functional Requirements

- ✅ 3D preview shows realistic window/fenestration rendering
- ✅ Hardware visualization (hinges, handles, locks, rollers)
- ✅ Material properties (aluminum, UPVC)
- ✅ Opening animations (casement, tilt-turn, pivot, sliding)
- ✅ Quality settings (low, medium, high, ultra)
- ✅ Shadow rendering
- ✅ Export capabilities (GLB, STL, OBJ)
- ✅ Animation controls (play/pause)
- ✅ Interactive camera controls
- ✅ Performance: 60 FPS, <2s initial load

### 7.2 Competitive Requirements

- ✅ Feature parity with Orgadata LogiKal, KLAES, Moxisys
- ✅ Unique advantages (post-processing, section view, exploded view)

### 7.3 Quality Requirements

- ✅ Unit tests (>80% coverage)
- ✅ Integration tests
- ✅ Performance tests
- ✅ Documentation updated
- ✅ Error handling
- ✅ Loading states
- ✅ Responsive design

---

## 8. Timeline Summary

| Phase | Duration | Tasks | Deliverables |
|-------|----------|-------|--------------|
| **Phase 1: Core Integration** | Week 1 | Window3DGenerator integration, WindowUnit conversion | Basic 3D preview working |
| **Phase 2: Enhanced Features** | Week 2 | Hardware visualization, opening animations, quality settings | Full 3D preview with animations |
| **Phase 3: Advanced Features** | Week 3 | Section view, exploded view, export, performance optimization | Advanced features complete |
| **Phase 4: Polish & Testing** | Week 4 | UI/UX enhancements, testing, documentation | Production-ready feature |

**Total Estimated Duration:** 4 weeks

---

## 9. Next Steps

### Immediate Actions

1. **Review Plan** - Get stakeholder approval
2. **Create Branch** - `feature/drafting-3d-preview-enhancement`
3. **Phase 1 Start** - Begin Window3DGenerator integration

### Decision Points

1. **Hardware Generation** - Option A (minimal) vs Option B (full) - **Decision: Option A**
2. **Section View** - Include in Phase 2 or defer to Phase 3 - **Decision: Phase 3 (optional)**
3. **Exploded View** - Include in Phase 2 or defer to Phase 3 - **Decision: Phase 3 (optional)**

---

## 10. References

**Existing Documentation:**
- `DRAFTING_WORKBENCH_COMPETITIVE_COMPARISON.md` - Competitive analysis
- `DRAFTING_WORKBENCH_COMPONENT_ARCHITECTURE_ANALYSIS.md` - Component architecture
- `docs/GOLD_TIER_COMPETITIVE_ANALYSIS.md` - Gold-tier competitive analysis
- `src/components/fabricator/drafting/README.md` - Drafting workbench documentation

**Source Code:**
- `src/components/fabricator/drafting/DraftingPreview3D.tsx` - Current implementation
- `src/components/fabricator/Window3DGenerator.tsx` - Target integration component
- `src/components/fabricator/drafting/utils/draftingToWindowGrid.ts` - Conversion utility

---

**Document Status:** Implementation Plan Complete  
**Last Updated:** January 2026  
**Next Review:** After Phase 1 completion
