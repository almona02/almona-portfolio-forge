# CAD Tools - Optimization Wiring & Engine Analysis

**Date:** January 2026  
**Purpose:** Precise mapping of cutting optimization engines, wiring, and integration points

---

## 🔍 **Executive Summary**

| Component | Status | Integration | Notes |
|-----------|--------|-------------|-------|
| **Cutting Optimization Engines** | ✅ Multiple engines exist | ⚠️ Partial | 3 different engines identified |
| **Drafting → Optimization Bridge** | ✅ Exists | ✅ Connected | `convertDraftingToWindowGrid` |
| **Real-time Waste Calculation** | ✅ Implemented | ✅ Connected | In `PrecisionDesignInterface` |
| **Optimization UI Components** | ✅ Complete | ✅ Connected | `CuttingOptimizationEngine`, `CuttingOptimizationPanel` |
| **DraftingWorkbench Integration** | ⚠️ Partial | ⚠️ Missing | No direct optimization trigger |

---

## 🎯 **Optimization Engines Identified**

### 1. **EnhancedAdaptiveSolver** ✅ Primary Engine

**Location:** `src/algorithms/EnhancedAdaptiveSolver.ts`

**Purpose:** Main optimization engine used in production workflow

**Features:**
- ML-based algorithm prediction
- Result caching
- Progressive optimization
- Real-time pre-solver
- Adaptive complexity thresholds:
  - Simple: <50 cuts → Greedy
  - Medium: 50-500 cuts → LP
  - Complex: >500 cuts → Genetic

**Integration Point:**
```typescript
// src/pages/FabricatorWorkflow.tsx (line 682-822)
const generateCuttingPlan = useCallback(
  async (components: WindowComponent[], profiles: Profile[]): Promise<OptimizationResult> => {
    const adaptiveSolver = new EnhancedAdaptiveSolver(solverConfig);
    const result = await adaptiveSolver.solveEnhanced({
      components,
      profiles,
      defaultStockLength: 6000,
      systemPackId: currentProject?.systemPackId,
    }, profiles, { onProgress });
    return result;
  }
);
```

**Status:** ✅ **Fully Integrated** - Used in `FabricatorWorkflow`

---

### 2. **unifiedOptimize** ✅ Unified API

**Location:** `src/lib/api/unifiedOptimizer.ts`

**Purpose:** Unified interface for Python backend and local optimization

**Features:**
- Falls back to Python backend for heavy computation
- Uses local optimizer for simple cases
- Returns `{ mode: 'python' | 'local', ... }`

**Integration Point:**
```typescript
// src/components/fabricator/CuttingOptimizationPanel.tsx (line 164)
const result = await unifiedOptimize({
  cuts,
  stock,
  objective: selectedStrategy === 'genetic' ? 'balanced' : 'minimize_waste',
  kerfWidthMm: kerfWidth,
  minUsableRemnantMm: minRemnant,
});
```

**Status:** ✅ **Fully Integrated** - Used in `CuttingOptimizationPanel`

---

### 3. **HybridMassOptimizer** ✅ Mass Production

**Location:** `src/algorithms/HybridMassOptimizer.ts`

**Purpose:** Cross-project optimization with remnant matching

**Features:**
- Aggregates cuts across multiple projects
- Remnant-first strategy
- Cross-project remnant pool
- Genetic algorithm for remaining cuts

**Integration Point:**
- Used in `MassProductionDashboard.tsx`
- Not directly connected to drafting

**Status:** ✅ **Available** - Used for mass production workflows

---

## 🔌 **Data Flow: Drafting → Optimization**

### Current Flow (Verified)

```
DraftingWorkbench (DraftingCanvas2D)
  ↓
  Geometry2D (rectangles, lines, circles, arcs, polygons)
  ↓
  convertDraftingToWindowGrid() [draftingToWindowGrid.ts]
  ↓
  WindowGrid { rows, cols, cells[], colWidths[], rowHeights[] }
  ↓
  generateComponentsFromGrid() [smartDraw.ts]
  ↓
  WindowComponent[] (frame, sash, mullion, transom, bead)
  ↓
  UnitProfileGatherer.gatherAllProfiles() [UnitProfileGatherer.ts]
  ↓
  RequiredCut[] (with profile roles, lengths, quantities)
  ↓
  CuttingListGenerator.generateCuttingList() [CuttingListGenerator.ts]
  ↓
  Cut[] (standardized cut list format)
  ↓
  EnhancedAdaptiveSolver.solveEnhanced()
  ↓
  OptimizationResult { cuttingPlan: CuttingPlan[] }
  ↓
  CuttingOptimizationEngine (UI display)
```

### Integration Points

#### 1. **Drafting → WindowGrid Conversion** ✅

**File:** `src/components/fabricator/drafting/utils/draftingToWindowGrid.ts`

**Function:** `convertDraftingToWindowGrid(geometry: Geometry2D, template: EgyptianTemplate): WindowGrid`

**Usage:**
- ✅ `DraftingWorkbench.tsx` (line 389)
- ✅ `EngineeringBay.tsx` (line 570)

**Status:** ✅ **Fully Implemented**

**Code:**
```typescript
// DraftingWorkbench.tsx
const geometry = draftingEngine.getGeometry();
const template = draftingEngine.getActiveTemplate();
const grid = convertDraftingToWindowGrid(geometry, template);
```

---

#### 2. **WindowGrid → Components** ✅

**File:** `src/algorithms/smartDraw.ts`

**Function:** `generateComponentsFromGrid(windowUnit: WindowUnit, grid: WindowGrid, profiles: Profile[], systemPackId: string)`

**Status:** ✅ **Fully Implemented**

**Integration:** Used throughout workflow when WindowGrid is available

---

#### 3. **Components → Optimization** ✅

**File:** `src/pages/FabricatorWorkflow.tsx`

**Function:** `generateCuttingPlan(components: WindowComponent[], profiles: Profile[]): Promise<OptimizationResult>`

**Status:** ✅ **Fully Implemented**

**Code:**
```typescript
// FabricatorWorkflow.tsx (line 682)
const generateCuttingPlan = useCallback(
  async (components: WindowComponent[], profiles: Profile[]): Promise<OptimizationResult> => {
    // Configure solver
    const solverConfig: AdaptiveSolverConfig = {
      maxSolvingTime: 60,
      complexityThresholds: { simple: 50, medium: 500 },
      timeConstraint: 'fast',
      optimalityTarget: 'balanced',
      enableMLPrediction: true,
      enableCaching: true,
      enableRealtimePresolver: true,
      enableProgressiveOptimization: true,
    };

    const adaptiveSolver = new EnhancedAdaptiveSolver(solverConfig);
    const result = await adaptiveSolver.solveEnhanced({
      components,
      profiles,
      defaultStockLength: 6000,
      systemPackId: currentProject?.systemPackId,
    }, profiles, { onProgress });

    return result;
  },
  [currentProject]
);
```

---

## 🎨 **UI Components & Integration**

### 1. **CuttingOptimizationEngine** ✅

**Location:** `src/components/fabricator/CuttingOptimizationEngine.tsx`

**Purpose:** Main optimization results display and export

**Props:**
```typescript
interface CuttingOptimizationEngineProps {
  project: WindowUnit | null;
  optimization: OptimizationResult | null;
  isGenerating: boolean;
  profiles?: Profile[];
}
```

**Features:**
- ✅ Optimization summary (efficiency, waste, time, cost)
- ✅ Bar drawings visualization
- ✅ Cutting plans display
- ✅ Cost breakdown
- ✅ G-code export (Yilmaz machines)
- ✅ PDF report export
- ✅ ALM 6510 MDB export
- ✅ Waste comparison report
- ✅ Production preview dialog

**Integration:**
- ✅ Used in `FabricatorWorkflow` (line 2116)
- ✅ Receives `optimization` from `generateCuttingPlan`
- ✅ Connected to `ProductionCommand` component

**Status:** ✅ **Fully Integrated**

---

### 2. **CuttingOptimizationPanel** ✅

**Location:** `src/components/fabricator/CuttingOptimizationPanel.tsx`

**Purpose:** Standalone optimization panel with manual cut entry

**Features:**
- ✅ Manual cut piece entry
- ✅ Stock piece management
- ✅ Strategy selection (genetic, best-fit, first-fit)
- ✅ Real-time optimization
- ✅ Algorithm rationale display
- ✅ Results visualization
- ✅ G-code export

**Integration:**
- ⚠️ **Standalone component** - Not directly connected to drafting
- ✅ Uses `unifiedOptimize` API
- ✅ Can be used independently

**Status:** ✅ **Functional** - Not integrated with drafting workflow

---

### 3. **PrecisionDesignInterface** ✅

**Location:** `src/components/fabricator/PrecisionDesignInterface.tsx`

**Purpose:** Real-time waste calculation during design

**Features:**
- ✅ Real-time waste metrics calculation
- ✅ Efficiency percentage
- ✅ Waste percentage
- ✅ Material cost calculation
- ✅ Weight calculation

**Code:**
```typescript
// PrecisionDesignInterface.tsx (line 235-302)
const wasteMetrics = useMemo(() => {
  if (components.length === 0) return null;

  try {
    // Get cuts from components
    const cuts = UnitProfileGatherer.gatherAllProfiles(project, systemPack);
    
    // Optimize for each profile
    for (const profile of uniqueProfiles) {
      const profileCuts = cuts.filter(c => c.profileId === profile.id);
      const optimizationResult = optimizationEngine.optimize(
        profileCuts,
        project?.systemPackId
      );
      
      // Calculate metrics
      totalWaste += optimizationResult.waste;
      totalMaterial += totalBarLength;
      // ... cost and weight calculations
    }

    return {
      efficiency,
      wastePercentage,
      price,
      materialWeight
    };
  } catch (error) {
    console.error('Error calculating waste metrics:', error);
    return null;
  }
}, [project, grid, profiles]);
```

**Status:** ✅ **Fully Integrated** - Real-time waste calculation active

---

## 🔗 **Missing Integration: DraftingWorkbench → Optimization**

### Current State

**DraftingWorkbench** has:
- ✅ `convertDraftingToWindowGrid` utility available
- ✅ Geometry extraction via `draftingEngine.getGeometry()`
- ✅ Template extraction via `draftingEngine.getActiveTemplate()`
- ❌ **No direct optimization trigger**
- ❌ **No optimization button/action**
- ❌ **No real-time waste display**

### Required Integration

**File:** `src/components/fabricator/drafting/DraftingWorkbench.tsx`

**Missing Features:**
1. **Optimization Button** - Trigger optimization from drafting
2. **Real-time Waste Display** - Show waste metrics during design
3. **Optimization Results Panel** - Display results in side panel
4. **Export to Optimization Tab** - Seamless transition

**Proposed Implementation:**

```typescript
// In DraftingWorkbench.tsx

// 1. Add optimization state
const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
const [isOptimizing, setIsOptimizing] = useState(false);

// 2. Add optimization handler
const handleOptimize = useCallback(async () => {
  const geometry = draftingEngine.getGeometry();
  const template = draftingEngine.getActiveTemplate();
  const grid = convertDraftingToWindowGrid(geometry, template);
  
  // Convert to WindowUnit
  const windowUnit: WindowUnit = {
    // ... construct from grid and current project
    grid,
    components: generateComponentsFromGrid(/* ... */),
  };
  
  // Generate optimization
  setIsOptimizing(true);
  const result = await generateCuttingPlan(windowUnit.components, profiles);
  setOptimizationResult(result);
  setIsOptimizing(false);
}, [draftingEngine, profiles]);

// 3. Add UI button in toolbar
<Button onClick={handleOptimize} disabled={isOptimizing}>
  {isOptimizing ? 'Optimizing...' : 'Optimize Cutting'}
</Button>

// 4. Add results panel in side panel
{optimizationResult && (
  <TabsContent value="optimization">
    <CuttingOptimizationEngine
      project={currentProject}
      optimization={optimizationResult}
      isGenerating={isOptimizing}
      profiles={profiles}
    />
  </TabsContent>
)}
```

**Status:** ⚠️ **NOT IMPLEMENTED** - Integration missing

---

## 📊 **Real-time Waste Calculation Status**

### Current Implementation

**Location:** `src/components/fabricator/PrecisionDesignInterface.tsx`

**Status:** ✅ **Fully Functional**

**How it works:**
1. Monitors `project`, `grid`, and `profiles` changes
2. Generates components from grid
3. Gathers profile cuts
4. Runs optimization for each profile
5. Calculates waste metrics
6. Displays in UI

**Integration:** ✅ Connected to `WindowUnit` and `WindowGrid`

**Missing:** ⚠️ Not connected to `DraftingWorkbench` geometry

---

## 🎯 **Integration Recommendations**

### Priority 1: DraftingWorkbench Optimization Integration

**Action:** Add optimization trigger and results display to `DraftingWorkbench`

**Steps:**
1. Add "Optimize" button to `DraftingToolbar`
2. Implement `handleOptimize` function
3. Add optimization results tab in side panel
4. Connect to `CuttingOptimizationEngine` component
5. Add real-time waste metrics display

**Estimated Time:** 2-3 hours

---

### Priority 2: Real-time Waste in DraftingWorkbench

**Action:** Add real-time waste calculation during drafting

**Steps:**
1. Extract geometry from drafting engine
2. Convert to WindowGrid
3. Calculate waste metrics (similar to `PrecisionDesignInterface`)
4. Display in side panel or toolbar
5. Update on geometry changes

**Estimated Time:** 1-2 hours

---

### Priority 3: Seamless Workflow Integration

**Action:** Connect DraftingWorkbench to FabricatorWorkflow optimization tab

**Steps:**
1. Add "Export to Optimization" button
2. Save drafting state to project
3. Navigate to optimization tab
4. Auto-trigger optimization
5. Display results

**Estimated Time:** 1 hour

---

## ✅ **Verified Integration Points**

| Integration Point | Status | Location | Notes |
|-------------------|--------|----------|-------|
| **Drafting → WindowGrid** | ✅ Complete | `draftingToWindowGrid.ts` | Used in 2 places |
| **WindowGrid → Components** | ✅ Complete | `smartDraw.ts` | Standard workflow |
| **Components → Optimization** | ✅ Complete | `FabricatorWorkflow.tsx` | Primary integration |
| **Optimization → UI** | ✅ Complete | `CuttingOptimizationEngine.tsx` | Full display |
| **Real-time Waste** | ✅ Complete | `PrecisionDesignInterface.tsx` | Active calculation |
| **DraftingWorkbench → Optimization** | ❌ Missing | `DraftingWorkbench.tsx` | **NEEDS IMPLEMENTATION** |

---

## 📝 **Summary**

### What's Working ✅

1. **Optimization Engines:** 3 engines available and functional
2. **Data Flow:** Complete pipeline from WindowGrid to OptimizationResult
3. **UI Components:** Full optimization display and export capabilities
4. **Real-time Waste:** Active in PrecisionDesignInterface
5. **Conversion Utility:** Drafting geometry → WindowGrid working

### What's Missing ⚠️

1. **DraftingWorkbench Integration:** No direct optimization trigger
2. **Real-time Waste in Drafting:** Not connected to drafting geometry
3. **Seamless Workflow:** No direct path from drafting to optimization tab

### Next Steps 🎯

1. **Implement DraftingWorkbench optimization integration** (Priority 1)
2. **Add real-time waste calculation to DraftingWorkbench** (Priority 2)
3. **Create seamless workflow connection** (Priority 3)

---

**Last Updated:** January 2026  
**Next Review:** After DraftingWorkbench integration implementation

