# Almona Portfolio Forge - Workflow Analysis
## Current Project Creation & Import Flow

---

## 1. ENTRY POINT: Projects Page (`/projects`)

### File: `src/pages/Projects.tsx`

**Purpose**: Dashboard showing all fabricator projects and poses

**Key Components**:
- **Projects Tab**: Groups jobs by `projectCode` or `orderNumber`
- **Positions Tab**: Shows recent individual poses (lazy-loaded `PositionsGrid`)
- **New Project Button**: Navigates to `/fabricator-workflow?new=true`

**Data Flow**:
```
Projects.tsx
├── useJobsStore() → loads all jobs from Supabase
├── projectsSummary (useMemo) → groups jobs by project
├── Projects Tab
│   ├── Displays project groups with:
│   │   ├── orderNumber (primary key)
│   │   ├── projectCode (optional secondary key)
│   │   ├── customer name
│   │   ├── pose count
│   │   └── total quantity
│   └── Click → navigates to `/fabricator/workflow/engineering-bay/{jobId}`
├── Positions Tab
│   └── PositionsGrid (lazy-loaded)
└── Delete Project
    └── Removes all poses for that project from Supabase + local store
```

**State Management**:
- `useJobsStore()` - Zustand store managing all jobs
- `jobs` - Array of `WindowUnit` objects
- `deleteJob(id)` - Removes single job
- `loadJobs()` - Fetches from Supabase `fabricator_positions` table

---

## 2. NEW PROJECT BUTTON FLOW

### Navigation Path
```
Projects.tsx
  ↓ (onClick: "New Project")
navigate('/fabricator-workflow?new=true')
  ↓
FabricatorWorkflow.tsx
  ↓ (detects ?new=true query param)
setShowProjectWizard(true)
  ↓
NewProjectWizard OR EgyptianProjectWizard (lazy-loaded)
```

### Query Parameter Handling
```typescript
// In FabricatorWorkflow.tsx useEffect:
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const newProject = params.get('new');
  
  if (newProject === 'true') {
    setShowProjectWizard(true);
    // Clear query param from URL
    window.history.replaceState({}, '', window.location.pathname);
  }
}, [location.search]);
```

---

## 3. FABRICATOR WORKFLOW PAGE (`/fabricator-workflow`)

### File: `src/pages/FabricatorWorkflow.tsx`

**Purpose**: Main fabrication pipeline with 7 workflow tabs

**Architecture**:
```
FabricatorWorkflow.tsx (Main Container)
├── Authority Foundation
│   ├── useOperationMode() → mode, workshopId
│   ├── OperationModeBadge (always visible)
│   └── validateConstitutionalCompliance()
├── Persona Context
│   ├── usePersona() → visibleTabs (filters workflow steps)
│   └── PersonaContextLayer
├── Workspace Context
│   ├── useFabricatorWorkspace() → currentProject, dispatch
│   └── FabricatorWorkspaceContext
├── Jobs Store
│   ├── useJobsStore() → jobs, selectedJobId, addOrUpdateJob
│   └── Supabase sync
└── UI Components (Lazy-loaded)
    ├── SmartMeasuringInterface
    ├── DesignInterface
    ├── PrecisionDesignInterface
    ├── OptimizationEqualizer
    ├── ProductionCommand
    ├── QualityControl
    ├── RealTimeMonitoring
    └── [10+ other modules]
```

### Workflow Tabs (7 Steps)
```
1. MEASURING (Ruler icon)
   ├── Smart Measuring Interface
   ├── Existing project selector
   ├── Pose selector
   └── Measurement capture → handleMeasurementComplete()

2. DESIGN (Settings icon)
   ├── Technical Design Interface
   ├── Component specification
   ├── Smart Draw layout application
   └── Design complete → handleDesignComplete()

3. PREVIEW 3D (Box icon)
   ├── 3D model visualization
   └── Component preview

4. OPTIMIZATION (Scissors icon)
   ├── Cutting plan generation
   ├── Material optimization
   ├── Cost breakdown
   └── Waste analysis

5. INVENTORY (Package icon)
   ├── Stock availability check
   ├── Profile management
   └── Inventory status

6. PRODUCTION (Factory icon)
   ├── Production scheduling
   ├── CNC machining commands
   ├── Cutting list generation
   └── Production start → handleProductionStart()

7. QUALITY (Zap icon)
   ├── Quality control checklist
   ├── Inspection validation
   └── Final approval
```

---

## 4. PROJECT WIZARD FLOW

### Wizard Selection Logic
```typescript
// In FabricatorWorkflow.tsx:
const [useEgyptWizard, setUseEgyptWizard] = useState(true);

// URL param override:
// ?wizard=egypt → EgyptianProjectWizard
// ?wizard=standard → NewProjectWizard
// default → based on projectMeta.region
```

### Wizard Types

#### A. EgyptianProjectWizard
- **Purpose**: Specialized for Egyptian market
- **Inputs**:
  - Client name
  - Project name
  - Site name
  - Currency (default: EGP)
  - Region (default: egypt)
  - Project code
  - Customer code
  - Order number
  - Order date

#### B. NewProjectWizard (Standard)
- **Purpose**: Generic project creation
- **Inputs**: Similar to Egyptian but region-agnostic

### Wizard Output: `ProjectHeaderMeta`
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
}
```

---

## 5. MEASUREMENT PHASE FLOW

### Entry Point: SmartMeasuringInterface

**Inputs**:
```typescript
interface MeasurementData {
  width: number;
  height: number;
  windowType: string;
  color: string;
  glazingType: string;
  glassColor: string;
  systemPackId?: string;
  flatNumber?: string;
  buildingBlock?: string;
  floor?: string;
  unitOrApartment?: string;
  elevation?: string;
  roomOrZone?: string;
  windowIndex?: string;
  remarks?: string;
  grid?: WindowGrid;
  presetId?: string;
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

### Handler: `handleMeasurementComplete()`

**Process**:
```
1. Validate projectMeta exists
2. Check subscription limits (canCreateProject)
3. Validate measurement data (width, height > 0)
4. Determine pose index (POS-001, POS-002, etc.)
5. Generate order number (from projectMeta or auto-generate)
6. Create WindowUnit object with:
   ├── id: proj_{timestamp}
   ├── orderNumber: base order number
   ├── posNumber: POS-{index}
   ├── positionCode: {projectCode}-P{index}
   ├── overallWidth/Height: from measurement
   ├── components: [] (empty, filled in design phase)
   ├── status: 'design'
   ├── optimization: null
   ├── presetData: cached pattern data (if presetId provided)
   └── [all measurement fields preserved]
7. Validate project (validateProject)
8. YDT Business validation (if workshopId available)
9. Dispatch to workspace: SET_CURRENT_PROJECT
10. Add to jobs store: addOrUpdateJob()
11. Set selected job: setSelectedJob()
12. Increment measurement session ID
13. Navigate to 'design' tab
14. Track event: fabricator_job_created
```

**Output**: `WindowUnit` object stored in:
- Workspace context (currentProject)
- Jobs store (jobs array)
- Supabase (fabricator_positions table)

---

## 6. DESIGN PHASE FLOW

### Entry Point: DesignInterface or PrecisionDesignInterface

**Inputs**:
- Current project (WindowUnit)
- Inventory (Profile[])
- Preset pattern data (if available)

### Handler: `handleDesignComplete(components: WindowComponent[])`

**Process**:
```
1. Validate currentProject exists
2. Validate components array not empty
3. Call generateCuttingPlan(components, inventory)
   ├── Validate cut lengths < MAX_STOCK_LENGTH_MM (8000mm)
   ├── Configure EnhancedAdaptiveSolver
   ├── Run optimization algorithm
   ├── Collect ML training data
   ├── Calculate hardware costs
   └── Return OptimizationResult
4. Consistency check: total cut length vs stock length
5. Update project:
   ├── components: [WindowComponent[]]
   ├── optimization: OptimizationResult
   ├── status: 'optimized'
   └── updatedAt: now
6. Dispatch to workspace: SET_CURRENT_PROJECT
7. Add to jobs store: addOrUpdateJob()
8. Navigate to 'optimization' tab
9. Track event: fabricator_job_status_changed
```

**Output**: `WindowUnit` with components and optimization data

---

## 7. OPTIMIZATION PHASE FLOW

### Entry Point: OptimizationEqualizer

**Displays**:
- Cutting plan (profile-by-profile breakdown)
- Material cost breakdown
- Labor cost
- Hardware cost
- Glazing cost
- Total cost
- Waste analysis
- Remnant utilization

### Handler: `handleProductionStart()`

**Process**:
```
1. Validate currentProject exists
2. Constitutional compliance check (Tier 3)
   ├── validateConstitutionalCompliance()
   ├── enhanceValidationWithConsequences()
   └── Show ConsequenceAlert if failed
3. Derive system constraints from inventory
4. Validate project with constraints
5. Stock availability check:
   ├── For each cutting plan
   ├── Calculate required bars
   ├── Compare with available stock
   └── Throw error if shortage
6. Generate constitutional metadata
7. Update project:
   ├── status: 'production'
   ├── constitutionalMetadata: {...}
   └── updatedAt: now
8. Dispatch to workspace: SET_CURRENT_PROJECT
9. Add to projects array
10. Add to jobs store: addOrUpdateJob()
11. Navigate to 'production' tab
12. Track event: fabricator_job_status_changed
```

---

## 8. PRODUCTION PHASE FLOW

### Entry Point: ProductionCommand

**Displays**:
- CNC machining commands
- Cutting list (per profile)
- Production schedule
- Machine assignments
- Real-time monitoring

### Outputs**:
- CNC code generation
- Production reports
- Cutting list export

---

## 9. QUALITY CONTROL PHASE FLOW

### Entry Point: QualityControl

**Displays**:
- Inspection checklist
- Dimension verification
- Component count verification
- Hardware verification
- Glass specification verification
- Final approval

---

## 10. DATA PERSISTENCE

### Supabase Tables

#### `fabricator_positions` (Main Jobs Table)
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

#### Sync Flow
```
Local Store (Zustand)
  ↓ (addOrUpdateJob)
Supabase fabricator_positions
  ↓ (loadJobs)
Local Store (Zustand)
```

---

## 11. IMPORT WORKFLOW (From Existing Project)

### Existing Project Selection (Measuring Tab)

**Flow**:
```
1. Load all jobs: loadJobs()
2. Group by projectCode or orderNumber: existingProjectGroups
3. User selects project from dropdown
4. User selects pose from dropdown
5. Click "Edit selected pose"
   ├── Derive projectMeta from job
   ├── Set currentProject to selected job
   ├── Navigate to 'design' tab
6. OR Click "Add new pose to this project"
   ├── Derive projectMeta from first job
   ├── Clear currentProject
   ├── Increment measurementSessionId
   ├── Stay in 'measuring' tab
   └── Ready for new measurement
```

### Derive Project Meta from Job
```typescript
const deriveProjectMetaFromJob = (job: WindowUnit): ProjectHeaderMeta => ({
  clientName: job.customer || 'Fabricator Client',
  projectName: job.projectCode || job.orderNumber || 'Project',
  siteName: job.positionMeta?.elevation || '',
  currency: 'EGP',
  region: 'global',
  projectCode: job.projectCode,
  customerCode: job.customerCode,
  orderNumber: job.orderNumber,
});
```

---

## 12. IMPORT WORKFLOW (From Customer Portal)

### Navigation from Customers Page

**Flow**:
```
CustomerPortal.tsx
  ↓ (Click "New Order")
navigate('/fabricator-workflow', {
  state: {
    fromCustomer: {
      id: customerId,
      name: customerName,
      contactPerson?: string,
      email?: string,
      phone?: string
    }
  }
})
  ↓
FabricatorWorkflow.tsx
  ↓ (useEffect detects navState.fromCustomer)
setProjectMeta({
  clientName: navState.fromCustomer.name,
  projectName: '',
  siteName: '',
  currency: 'EGP',
  region: 'egypt',
  customerId: navState.fromCustomer.id,
})
setShowProjectWizard(true)
setActiveTab('measuring')
```

---

## 13. LAZY LOADING STRATEGY

### Heavy Components (lazyRetry)
```typescript
const SmartMeasuringInterface = lazyRetry(
  () => import('@/components/fabricator/SmartMeasuringInterface'),
  'SmartMeasuringInterface'
);
```

**Benefits**:
- Reduces initial bundle size
- Loads only when tab is active
- Retry logic for failed imports
- Suspense fallback UI

### Light Components (React.lazy)
```typescript
const InventoryStatusPanel = React.lazy(() =>
  import('@/components/fabricator/InventoryStatusPanel')
);
```

---

## 14. KEYBOARD NAVIGATION

### Shortcuts
```
Ctrl/Cmd + Arrow Right → Next tab
Ctrl/Cmd + Arrow Left  → Previous tab
Ctrl/Cmd + D           → Detail toggle (preset selector)
```

### Implementation
```typescript
useEffect(() => {
  const handleKeyboardNavigation = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') {
      // Navigate to next tab
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') {
      // Navigate to previous tab
    }
  };
  window.addEventListener('keydown', handleKeyboardNavigation);
}, []);
```

---

## 15. PERFORMANCE TRACKING

### Metrics Collected
```typescript
trackFabricatorLoadTime()      // Component mount time
trackInventoryLoad()           // Inventory loading time
trackOptimization()            // Optimization algorithm time
trackInventoryLoad()           // Stock data loading
```

### ML Training Data Collection
```typescript
trainingDataCollector.collectTrainingData(
  result,           // OptimizationResult
  complexity,       // Algorithm complexity
  algorithm,        // Selected algorithm
  solveTime,        // Execution time
  userId,           // User identifier
  projectId         // Project identifier
);
```

---

## 16. ERROR HANDLING & VALIDATION

### Validation Layers
```
1. Technical Validation
   └── validateProject(project, requireComponents)

2. System Constraints Validation
   └── validateProjectWithConstraints(project, constraints)

3. Constitutional Compliance (Tier 3)
   └── validateConstitutionalCompliance(project, inventory, mode)

4. YDT Business Validation
   └── ydtBusinessLayer.validateProject(projectSpec)

5. Stock Availability Check
   └── Compare required bars vs available stock
```

### Error Enhancement
```typescript
const enhancedErrors = enhanceValidationWithConsequences(errors);
// Each error now has:
// - message: string
// - consequences: string[]
// - severity: 'warning' | 'error'
```

---

## 17. MOBILE RESPONSIVENESS

### Mobile Panel Toggle
```typescript
const [showMobilePanel, setShowMobilePanel] = useState(false);

// On mobile (lg:hidden):
// - Show "Show Job Info" button
// - Toggle visibility of context panels
// - Stack components vertically
```

### Responsive Breakpoints
```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

---

## 18. CONTEXT LAYERS

### PersonaContextLayer
- Filters visible tabs based on user role
- Controls feature access
- Manages UI visibility

### FabricatorWorkspaceContext
- Stores currentProject
- Stores measurementData
- Stores optimizationResult
- Provides dispatch for state updates

### OperationMode (Authority Foundation)
- Determines workshop context
- Controls constitutional validation
- Manages business rules

---

## 19. IMPORTS SUMMARY

### Key Imports in FabricatorWorkflow.tsx
```typescript
// State Management
import { useJobsStore } from '@/store/jobsStore';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { useOperationMode } from '@/hooks/useOperationMode';
import { usePersona } from '@/hooks/usePersona';

// Validation & Business Logic
import { validateProject, validateProjectWithConstraints } from '@/lib/fabricatorValidation';
import { validateConstitutionalCompliance, generateConstitutionalMetadata } from '@/lib/authority/constitutionalValidation';
import { enhanceValidationWithConsequences } from '@/lib/authority/consequenceMapper';
import { YDTBusinessLayer } from '@/lib/ydt/YDTBusinessLayer';

// Algorithms
import { EnhancedAdaptiveSolver } from '@/algorithms/EnhancedAdaptiveSolver';

// Data
import { EGYPTIAN_PATTERNS } from '@/data/egyptian-window-patterns';
import { ROCK60_WINDOW_SYSTEM_TEMPLATE } from '@/data/systemPacks';

// UI Components (Lazy-loaded)
import { SmartMeasuringInterface } from '@/components/fabricator/SmartMeasuringInterface';
import { DesignInterface } from '@/components/fabricator/DesignInterface';
// ... [10+ more lazy-loaded components]

// Utilities
import { track } from '@/lib/analytics';
import { trainingDataCollector } from '@/lib/ml/TrainingDataCollector';
import { lazyRetry } from '@/utils/lazyImport';
```

---

## 20. WORKFLOW SUMMARY DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROJECTS PAGE (/projects)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Projects Tab: Group jobs by projectCode/orderNumber      │   │
│  │ Positions Tab: Show recent individual poses              │   │
│  │ [New Project Button] → /fabricator-workflow?new=true     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              FABRICATOR WORKFLOW (/fabricator-workflow)         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 1. PROJECT WIZARD (NewProjectWizard/EgyptianProjectWizard)   │
│  │    Input: Client, Project, Site, Currency, Region       │   │
│  │    Output: ProjectHeaderMeta                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 2. MEASURING TAB (SmartMeasuringInterface)               │   │
│  │    Input: Width, Height, Type, Color, Glazing           │   │
│  │    Output: MeasurementData → WindowUnit                  │   │
│  │    Handler: handleMeasurementComplete()                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 3. DESIGN TAB (DesignInterface)                          │   │
│  │    Input: Components, Profiles                           │   │
│  │    Output: WindowComponent[] → OptimizationResult        │   │
│  │    Handler: handleDesignComplete()                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────���──────────┐   │
│  │ 4. PREVIEW 3D TAB (3D Model Visualization)               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 5. OPTIMIZATION TAB (OptimizationEqualizer)              │   │
│  │    Display: Cutting Plan, Cost Breakdown, Waste          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ���                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 6. INVENTORY TAB (InventoryDashboard)                    │   │
│  │    Display: Stock Availability, Profile Management       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 7. PRODUCTION TAB (ProductionCommand)                    │   │
│  │    Handler: handleProductionStart()                      │   │
│  │    Output: CNC Commands, Cutting List                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│  ┌────────��─────────────────────────────────────────────────┐   │
│  │ 8. QUALITY TAB (QualityControl)                          │   │
│  │    Display: Inspection Checklist, Final Approval         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE PERSISTENCE                         │
│  fabricator_positions table (owner_user_id, order_number, etc.) │
└─────────────────────────────────────────────────────────────────┘
```

---

## 21. KEY TAKEAWAYS

1. **Entry Points**:
   - Projects page → New Project button
   - Customer portal → New Order
   - Direct URL: `/fabricator-workflow?new=true`

2. **Project Creation**:
   - Wizard captures project metadata (client, site, currency, region)
   - Measurement phase creates first pose
   - Additional poses can be added to same project

3. **Data Flow**:
   - ProjectHeaderMeta → MeasurementData → WindowUnit → OptimizationResult
   - All data persisted to Supabase and local Zustand store

4. **Validation**:
   - Technical validation (dimensions, components)
   - System constraints (profile compatibility)
   - Constitutional compliance (authority framework)
   - YDT business rules (if workshop context available)

5. **Performance**:
   - Lazy-loaded components per tab
   - ML training data collection
   - Performance metrics tracking
   - Retry logic for failed imports

6. **Accessibility**:
   - Keyboard navigation (Ctrl+Arrow keys)
   - Screen reader announcements
   - Mobile-responsive design
   - Persona-based feature filtering

