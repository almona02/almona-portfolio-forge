# Current Project Workflow Analysis
## Comprehensive Analysis of ALMONA Fabricator Workflow System

**Date:** January 2026  
**Status:** Active Analysis  
**Version:** 1.0

---

## 🎯 Executive Summary

The ALMONA Portfolio Forge project workflow is a **dual-mode fabrication pipeline** that supports both a modern **4-stage unified workflow** and a legacy **7-tab workflow** for backward compatibility. The system manages the complete lifecycle from project creation through measurement, design, optimization, production, and quality control.

**Key Characteristics:**
- **Dual Workflow Modes:** Unified (4 stages) and Legacy (7 tabs)
- **Multiple Entry Points:** Projects page, Customer portal, Direct navigation
- **State Management:** Zustand store + React Context + Supabase persistence
- **Lazy Loading:** Heavy components loaded on-demand per tab/stage
- **Constitutional Compliance:** Authority framework integration throughout

---

## 📊 Workflow Architecture Overview

### Dual-Mode System

```
┌─────────────────────────────────────────────────────────────┐
│              WORKFLOW MODE SELECTION                        │
│  Feature Flag: localStorage.getItem('almona:unified-workflow') │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌───────────────┐            ┌───────────────┐
│ UNIFIED MODE  │            │  LEGACY MODE  │
│ (4 Stages)    │            │  (7 Tabs)     │
└───────────────┘            └───────────────┘
```

### Unified Workflow (4 Stages)

**Default Mode** (when `almona:unified-workflow` = `'true'` or undefined)

| Stage | ID | Combines Legacy Tabs | Description |
|-------|-----|---------------------|-------------|
| 1. Measure & Design | `measure-design` | Measuring + Design | Capture measurements and create technical design |
| 2. Review & Optimize | `review-optimize` | 3D Preview + Optimization | Review design and optimize cutting plan |
| 3. Production | `production` | Inventory + Production | Check inventory and schedule production |
| 4. Quality & Delivery | `quality-delivery` | Quality | Quality control and delivery |

**Files:**
- `src/components/fabricator/unifiedWorkflow/unifiedStages.ts` - Stage definitions
- `src/components/fabricator/unifiedWorkflow/UnifiedWorkflowRibbon.tsx` - UI component
- `src/components/fabricator/unifiedWorkflow/useUnifiedWorkflow.ts` - State hook

### Legacy Workflow (7 Tabs)

**Fallback Mode** (when `almona:unified-workflow` = `'false'`)

| Tab | ID | Component | Purpose |
|-----|-----|-----------|---------|
| 1. Measuring | `measuring` | `SmartMeasuringInterface` | Capture window measurements |
| 2. Design | `design` | `DesignInterface` / `EngineeringBay` | Technical design specification |
| 3. Preview 3D | `preview3d` | 3D Visualization | Visual preview of window |
| 4. Optimization | `optimization` | `OptimizationEqualizer` | Cutting plan optimization |
| 5. Inventory | `inventory` | `InventoryDashboard` | Stock availability check |
| 6. Production | `production` | `ProductionCommand` | CNC commands and scheduling |
| 7. Quality | `quality` | `QualityControl` | Quality control checklist |

**Files:**
- `src/pages/FabricatorWorkflow.tsx` - Main container with tab management

---

## 🔄 Complete Workflow Flow

### Phase 1: Project Creation

#### Entry Points

**1. Projects Page (`/projects`)**
```
User clicks "New Project" button
  ↓
Navigate to `/fabricator-workflow?new=true`
  ↓
FabricatorWorkflow detects query param
  ↓
Opens NewProjectWizard or EgyptianProjectWizard
```

**2. Customer Portal**
```
CustomerPortal.tsx
  ↓ (Click "New Order")
Navigate with state: { fromCustomer: { id, name, ... } }
  ↓
FabricatorWorkflow detects navState.fromCustomer
  ↓
Pre-fills project metadata
  ↓
Opens wizard
```

**3. Direct Navigation**
```
URL: /fabricator-workflow?new=true
  OR
URL: /fabricator/workflow/engineering-bay?mode=drafting
```

#### Project Wizard Types

**A. EgyptianProjectWizard** (Default for Egyptian region)
- **Inputs:**
  - Client name
  - Project name
  - Site name
  - Currency (default: EGP)
  - Region (default: egypt)
  - Project code (auto-generated: `FP-{timestamp}`)
  - Customer code (auto-generated: `FC-{name}-{timestamp}`)
  - Order number
  - Order date
- **Output:** `ProjectHeaderMeta` object

**B. NewProjectWizard** (Standard/Generic)
- Similar inputs but region-agnostic
- Supports multiple currencies and regions

#### Wizard Selection Logic

```typescript
// In FabricatorWorkflow.tsx
const [useEgyptWizard, setUseEgyptWizard] = useState(true);

// URL param override:
// ?wizard=egypt → EgyptianProjectWizard
// ?wizard=standard → NewProjectWizard
// default → based on projectMeta.region
```

**Output:** `ProjectHeaderMeta` stored in component state
```typescript
interface ProjectHeaderMeta {
  clientName: string;
  projectName: string;
  siteName: string;
  currency: 'EGP' | 'USD' | 'EUR';
  region: 'egypt' | 'global';
  projectCode?: string;
  customerCode?: string;
  orderNumber?: string;
  orderDate?: Date;
  customerId?: string;
  systemPackId?: string;
  egyptianConstraints?: EgyptianConstraints;
}
```

---

### Phase 2: Measurement & Design

#### Stage 1: Measuring (Unified: Measure & Design - Part 1)

**Component:** `SmartMeasuringInterface`

**Inputs:**
```typescript
interface MeasurementData {
  width: number;                    // Overall width (mm)
  height: number;                   // Overall height (mm)
  windowType: string;               // e.g., "casement", "sliding"
  color: string;                    // Frame color
  glazingType: string;              // Glass type
  glassColor: string;               // Glass color
  systemPackId?: string;           // Selected system pack
  flatNumber?: string;              // Position metadata
  buildingBlock?: string;
  floor?: string;
  unitOrApartment?: string;
  elevation?: string;
  roomOrZone?: string;
  windowIndex?: string;
  remarks?: string;
  grid?: WindowGrid;                // SmartDraw grid layout
  presetId?: string;                // Egyptian pattern preset
  systemProfileSelections?: any;
  measurementMode?: string;
  wallDeduction?: number;
  manufacturingWidth?: number;
  manufacturingHeight?: number;
  roughOpeningWidth?: number;
  roughOpeningHeight?: number;
  flyScreenType?: string;
}
```

**Process Flow:**
```
1. User enters measurements (width, height)
2. Selects system pack (prominent at top of UI)
3. Optional: Uses SmartDrawCanvas for layout
4. Optional: Selects Egyptian pattern preset
5. Fills position metadata (flat, floor, etc.)
6. Clicks "Complete Measurement"
   ↓
handleMeasurementComplete() called
   ↓
Validation:
  - projectMeta exists
  - Subscription limits (canCreateProject)
  - width, height > 0
   ↓
Generate pose index (POS-001, POS-002, ...)
Generate order number (from projectMeta or auto)
   ↓
Create WindowUnit object:
  - id: proj_{timestamp}
  - orderNumber: base order number
  - posNumber: POS-{index}
  - positionCode: {projectCode}-P{index}
  - overallWidth/Height: from measurement
  - components: [] (empty, filled in design phase)
  - status: 'design'
  - optimization: null
  - presetData: cached pattern data
   ↓
Validate project (validateProject)
YDT Business validation (if workshopId available)
   ↓
Dispatch to workspace: SET_CURRENT_PROJECT
Add to jobs store: addOrUpdateJob()
Set selected job: setSelectedJob()
   ↓
Navigate to 'design' tab (or stay in unified stage)
Track event: fabricator_job_created
```

**Data Persistence:**
- **Local:** Zustand `jobsStore` (in-memory)
- **Remote:** Supabase `fabricator_positions` table
- **Context:** `FabricatorWorkspaceContext.currentProject`

#### Stage 2: Design (Unified: Measure & Design - Part 2)

**Component:** `EngineeringBay` (Primary) or `DesignInterface` (Legacy)

**Two Design Modes:**

**A. SmartDraw Mode** (Default)
- Visual grid-based design
- Drag-and-drop cell configuration
- Real-time component generation
- System pack integration

**B. Drafting Mode** (Gold Tier)
- Professional CAD-level drafting
- 50+ templates
- Material-aware design
- Hardware placement
- Structural tools
- 3D preview
- Full keyboard shortcuts

**Mode Selection:**
```typescript
// URL parameter: ?mode=drafting
const [designMode, setDesignMode] = useState<'smartdraw' | 'drafting'>(
  searchParams.get('mode') === 'drafting' ? 'drafting' : 'smartdraw'
);
```

**Process Flow:**
```
1. Load current project (WindowUnit)
2. Load inventory (Profile[])
3. Load system pack configuration
4. User designs window structure:
   - SmartDraw: Grid-based cell configuration
   - Drafting: CAD-level precision design
5. System generates components:
   - generateComponentsFromGrid() (SmartDraw)
   - convertDraftingToWindowGrid() (Drafting)
6. Hardware auto-connection:
   - connectHardwareForWindowType()
7. User reviews BOM (Bill of Materials)
8. Clicks "Complete Design"
   ↓
handleDesignComplete(components: WindowComponent[]) called
   ↓
Validation:
  - currentProject exists
  - components array not empty
   ↓
Generate cutting plan:
  - generateCuttingPlan(components, inventory)
  - Validate cut lengths < MAX_STOCK_LENGTH_MM (8000mm)
  - Configure EnhancedAdaptiveSolver
  - Run optimization algorithm
  - Collect ML training data
  - Calculate hardware costs
  - Return OptimizationResult
   ↓
Consistency check: total cut length vs stock length
   ↓
Update project:
  - components: [WindowComponent[]]
  - optimization: OptimizationResult
  - status: 'optimized'
  - updatedAt: now
   ↓
Dispatch to workspace: SET_CURRENT_PROJECT
Add to jobs store: addOrUpdateJob()
Navigate to 'optimization' tab (or unified stage 2)
Track event: fabricator_job_status_changed
```

**Output:** `WindowUnit` with:
- `components: WindowComponent[]` - Complete component tree
- `optimization: OptimizationResult` - Cutting plan and costs
- `status: 'optimized'`

---

### Phase 3: Review & Optimization

#### Stage 3: Preview 3D (Unified: Review & Optimize - Part 1)

**Component:** 3D Visualization (integrated in EngineeringBay)

**Purpose:**
- Visual preview of window design
- Real-time 3D rendering
- Component verification

#### Stage 4: Optimization (Unified: Review & Optimize - Part 2)

**Component:** `OptimizationEqualizer`

**Displays:**
- Cutting plan (profile-by-profile breakdown)
- Material cost breakdown
- Labor cost
- Hardware cost
- Glazing cost
- Total cost
- Waste analysis
- Remnant utilization

**Process Flow:**
```
1. Display optimization results from design phase
2. User reviews cutting plan
3. User reviews cost breakdown
4. User reviews waste analysis
5. Optional: Re-run optimization with different parameters
6. User approves optimization
   ↓
Navigate to production phase
```

---

### Phase 4: Production

#### Stage 5: Inventory (Unified: Production - Part 1)

**Component:** `InventoryDashboard`

**Purpose:**
- Stock availability check
- Profile management
- Inventory status display

#### Stage 6: Production (Unified: Production - Part 2)

**Component:** `ProductionCommand`

**Displays:**
- CNC machining commands
- Cutting list (per profile)
- Production schedule
- Machine assignments
- Real-time monitoring

**Process Flow:**
```
1. User reviews production plan
2. User clicks "Start Production"
   ↓
handleProductionStart() called
   ↓
Validation:
  - currentProject exists
  - Constitutional compliance check (Tier 3)
    - validateConstitutionalCompliance()
    - enhanceValidationWithConsequences()
    - Show ConsequenceAlert if failed
  - Derive system constraints from inventory
  - Validate project with constraints
  - Stock availability check:
    - For each cutting plan
    - Calculate required bars
    - Compare with available stock
    - Throw error if shortage
   ↓
Generate constitutional metadata
   ↓
Update project:
  - status: 'production'
  - constitutionalMetadata: {...}
  - updatedAt: now
   ↓
Dispatch to workspace: SET_CURRENT_PROJECT
Add to projects array
Add to jobs store: addOrUpdateJob()
Navigate to 'production' tab
Track event: fabricator_job_status_changed
```

**Outputs:**
- CNC code generation
- Production reports
- Cutting list export
- QR/Barcode labels

---

### Phase 5: Quality Control

#### Stage 7: Quality (Unified: Quality & Delivery)

**Component:** `QualityControl`

**Displays:**
- Inspection checklist
- Dimension verification
- Component count verification
- Hardware verification
- Glass specification verification
- Final approval

**Process Flow:**
```
1. Quality control checklist
2. Dimension verification
3. Component count verification
4. Hardware verification
5. Glass specification verification
6. Final approval
   ↓
Update project status: 'completed'
Track event: fabricator_job_completed
```

---

## 🗄️ Data Flow & State Management

### State Management Architecture

```
┌─────────────────────────────────────────────────────────┐
│              STATE MANAGEMENT LAYERS                     │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Zustand     │  │   Context    │  │   Supabase   │
│  (Local)     │  │  (React)     │  │  (Remote)    │
└──────────────┘  └──────────────┘  └──────────────┘
```

#### 1. Zustand Store (`jobsStore`)

**File:** `src/store/jobsStore.ts`

**State:**
```typescript
interface JobsStore {
  jobs: WindowUnit[];              // All jobs/positions
  selectedJobId: string | null;     // Currently selected job
  isLoading: boolean;                // Loading state
  addOrUpdateJob: (job: WindowUnit) => void;
  deleteJob: (id: string) => void;
  setSelectedJob: (id: string | null) => void;
  loadJobs: () => Promise<void>;    // Load from Supabase
}
```

**Purpose:**
- In-memory job storage
- Selected job tracking
- Sync with Supabase

#### 2. React Context (`FabricatorWorkspaceContext`)

**File:** `src/context/FabricatorWorkspaceContext.tsx`

**State:**
```typescript
interface FabricatorWorkspaceState {
  currentProject: WindowUnit | null;
  measurementData: MeasurementData | null;
  optimizationResult: OptimizationResult | null;
  dispatch: (action: WorkspaceAction) => void;
}
```

**Actions:**
- `SET_CURRENT_PROJECT` - Set active project
- `SET_MEASUREMENT_DATA` - Store measurement data
- `SET_OPTIMIZATION_RESULT` - Store optimization results
- `CLEAR_WORKSPACE` - Reset workspace

**Purpose:**
- Current project context
- Cross-component state sharing
- Workspace-level state management

#### 3. Supabase Persistence

**Table:** `fabricator_positions`

**Schema:**
```sql
CREATE TABLE fabricator_positions (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  order_number TEXT,
  project_code TEXT,
  customer TEXT,
  pos_number TEXT,
  window_type TEXT,
  overall_width NUMERIC,
  overall_height NUMERIC,
  color TEXT,
  glazing JSONB,
  hardware JSONB,
  components JSONB,
  optimization JSONB,
  status TEXT,
  quantity INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  -- Additional fields...
);
```

**Sync Flow:**
```
Local Store (Zustand)
  ↓ (addOrUpdateJob)
Supabase fabricator_positions
  ↓ (loadJobs)
Local Store (Zustand)
```

---

## 🔌 Integration Points

### 1. Authority Foundation

**Components:**
- `OperationModeBadge` - Always visible operation mode indicator
- `ConsequenceAlert` - Real-world impact warnings
- `OutputClarity` - Visual vs production accuracy indicators
- `PersonaContextLayer` - Role-based UI adaptations

**Integration:**
- Constitutional compliance validation at production start
- Authority signals throughout workflow
- Persona-based feature filtering

### 2. YDT Business Layer

**Integration Points:**
- Project validation (if workshopId available)
- Pricing calculations
- Optimization suggestions
- Business rule enforcement

**File:** `src/lib/ydt/YDTBusinessLayer.ts`

### 3. RealityOS Event System

**Components:**
- `EventEmissionPanel` - Event emission UI
- `realityOSEventEmitter` - Event emission service

**Integration:**
- Automatic event emission on design confirmation
- Event ledger persistence (currently in-memory)
- Constitutional compliance tracking

### 4. Precision Upgrade Features

**Components:**
- `HardenerSelectionPanel` - Hardener code selection
- `ProfileSuggestionsPanel` - Supplier pack suggestions
- `EventEmissionPanel` - RealityOS event emission

**Status:**
- Code structure: ✅ Complete
- Integration: ✅ Verified
- Production readiness: ⚠️ Pending verification

---

## 📱 UI/UX Features

### 1. SmartMeasuringInterface Enhancements

**Recent Improvements (January 2026):**
- ✅ System pack selector moved to top (full width, prominent)
- ✅ SmartDrawCanvas positioned below system pack section
- ✅ Auto-collapse functionality for system pack (collapses after selection)
- ✅ Improved workflow: System selection → Smart Draw → Guided form

### 2. EngineeringBay Enhancements

**Status:** 98-99% UI/UX parity (exceeds gold-tier target)

**Features:**
- Dual design modes (SmartDraw + Drafting)
- System pack integration
- Real-time 3D preview
- Hardware auto-connection
- BOM management
- Collapsible sections

### 3. Unified Workflow Ribbon

**Features:**
- 4-stage progress visualization
- Empire heritage visual design
- Efficiency metrics display
- Collapsible progress details
- Istanbul skyline visualization

---

## 🚀 Performance Optimizations

### 1. Lazy Loading

**Strategy:**
- Heavy components loaded on-demand per tab/stage
- `lazyRetry` utility for failed imports
- Suspense fallbacks

**Components:**
```typescript
const SmartMeasuringInterface = lazyRetry(
  () => import('@/components/fabricator/SmartMeasuringInterface'),
  'SmartMeasuringInterface'
);
```

### 2. Performance Tracking

**Metrics Collected:**
- `trackFabricatorLoadTime()` - Component mount time
- `trackInventoryLoad()` - Inventory loading time
- `trackOptimization()` - Optimization algorithm time

### 3. ML Training Data Collection

**Purpose:**
- Collect optimization algorithm performance data
- Improve algorithm selection
- Build training dataset

**File:** `src/lib/ml/TrainingDataCollector.ts`

---

## ⚠️ Current Limitations & Gaps

### 1. Database Persistence

**Gaps:**
- EventLedger: Currently in-memory (not persisted)
- Trust Metrics: Mock data (not from real database)
- Hardener Selections: Not persisted to database
- Supplier Packs: Catalog is hardcoded (not from database)

### 2. Production Readiness

**Status:**
- Code structure: ✅ Complete
- Integration: ✅ Verified
- Real data validation: ❌ Not started
- Production testing: ❌ Not started

### 3. Documentation Gaps

**Missing:**
- User documentation for unified workflow
- API documentation for workflow handlers
- Constitutional compliance verification documentation

---

## 🎯 Recommendations

### Short-Term (Q1 2026)

1. **Complete Unified Workflow Integration**
   - Ensure all 4 stages fully functional
   - Test backward compatibility with legacy mode
   - Document unified workflow user guide

2. **Database Persistence**
   - Implement EventLedger database persistence
   - Connect Trust Metrics to real database
   - Persist Hardener Selections

3. **Production Testing**
   - Integration tests for complete workflows
   - End-to-end tests for all stages
   - Performance tests for production load

### Medium-Term (Q2-Q3 2026)

1. **Real Data Validation**
   - Test with real Egyptian/GCC standards data
   - Validate supplier pack data quality
   - Test RealityOS events with real scenarios

2. **Documentation**
   - Complete user documentation
   - API documentation
   - Constitutional compliance guide

3. **Performance Optimization**
   - Optimize lazy loading strategy
   - Improve optimization algorithm performance
   - Reduce bundle size

---

## 📊 Workflow Summary Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PROJECTS PAGE (/projects)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Projects Tab: Group jobs by projectCode/orderNumber  │   │
│  │ Positions Tab: Show recent individual poses          │   │
│  │ [New Project Button] → /fabricator-workflow?new=true │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│         FABRICATOR WORKFLOW (/fabricator-workflow)          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ PROJECT WIZARD (NewProjectWizard/EgyptianProjectWizard) │
│  │    Input: Client, Project, Site, Currency, Region    │   │
│  │    Output: ProjectHeaderMeta                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ STAGE 1: MEASURE & DESIGN                             │   │
│  │   1.1 Measuring (SmartMeasuringInterface)            │   │
│  │       Input: Width, Height, Type, Color, Glazing     │   │
│  │       Output: MeasurementData → WindowUnit            │   │
│  │   1.2 Design (EngineeringBay)                        │   │
│  │       Input: Components, Profiles                     │   │
│  │       Output: WindowComponent[] → OptimizationResult │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ STAGE 2: REVIEW & OPTIMIZE                           │   │
│  │   2.1 Preview 3D (3D Visualization)                 │   │
│  │   2.2 Optimization (OptimizationEqualizer)           │   │
│  │       Display: Cutting Plan, Cost Breakdown, Waste   │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ STAGE 3: PRODUCTION                                   │   │
│  │   3.1 Inventory (InventoryDashboard)                  │   │
│  │       Display: Stock Availability, Profile Management │   │
│  │   3.2 Production (ProductionCommand)                 │   │
│  │       Handler: handleProductionStart()                │   │
│  │       Output: CNC Commands, Cutting List              │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ STAGE 4: QUALITY & DELIVERY                           │   │
│  │   Quality Control (QualityControl)                    │   │
│  │   Display: Inspection Checklist, Final Approval       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE PERSISTENCE                      │
│  fabricator_positions table (owner_user_id, order_number, etc.) │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Key Takeaways

1. **Dual-Mode System:** Supports both unified (4-stage) and legacy (7-tab) workflows
2. **Multiple Entry Points:** Projects page, Customer portal, Direct navigation
3. **Seamless Data Flow:** Data preserved across all stages via Zustand + Context + Supabase
4. **Lazy Loading:** Heavy components loaded on-demand for performance
5. **Constitutional Compliance:** Authority framework integrated throughout
6. **State Management:** Three-layer architecture (Zustand + Context + Supabase)
7. **Recent Enhancements:** SmartMeasuringInterface UX improvements, EngineeringBay parity
8. **Production Readiness:** Code complete, integration verified, testing pending

---

**Document Status:** ✅ Complete Analysis  
**Next Review:** After Q1 2026 production testing  
**Authority:** Workflow Architecture Documentation

