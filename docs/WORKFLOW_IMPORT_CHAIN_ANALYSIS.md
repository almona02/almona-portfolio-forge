# Workflow Import Chain - Step by Step Analysis

**Date:** January 2026  
**Purpose:** Complete trace of all imports in the fabricator workflow

---

## 📋 Table of Contents
1. [Entry Point: App.tsx](#1-entry-point-apptsx)
2. [Routing Layer](#2-routing-layer)
3. [MasterLayout Component](#3-masterlayout-component)
4. [EngineeringBayWrapper](#4-engineeringbaywrapper)
5. [EngineeringBay Component](#5-engineeringbay-component)
6. [DraftingWorkbench](#6-draftingworkbench)
7. [DraftingCanvas2D](#7-draftingcanvas2d)
8. [Supporting Components](#8-supporting-components)

---

## 1. Entry Point: App.tsx

### Location: `src/App.tsx`

### Import Chain:
```typescript
// Step 1.1: Core React Router Setup
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

// Step 1.2: Context Providers (Global State)
import { FabricatorWorkspaceProvider } from "./context/FabricatorWorkspaceContext";
import { AuthProvider } from "./context/AuthContext.tsx";
import { QuoteProvider } from "./context/QuoteContext.tsx";
import { LanguageProvider } from "./context/LanguageContext.tsx";
import { LoadingProvider } from "./context/LoadingContext.tsx";

// Step 1.3: Lazy Loaded Components (Code Splitting)
const MasterLayout = lazy(() => 
  import("./components/fabricator/MasterLayout.tsx")
    .then(m => ({ default: m.MasterLayout }))
);

const EngineeringBayWrapper = lazy(() => 
  import("./components/fabricator/EngineeringBayWrapper.tsx")
    .then(m => ({ default: m.EngineeringBayWrapper }))
);

const FabricatorWorkflowPro = lazyRetry(
  () => import("./components/fabricator/FabricatorWorkflowPro.tsx"),
  "FabricatorWorkflowPro"
);
```

### Route Configuration:
```typescript
// Route: /fabricator/workflow/* → MasterLayout
<Route path="/fabricator/workflow/*" element={<MasterLayout currentPhase="design" />}>
  {/* Nested Route: engineering-bay */}
  <Route
    path="engineering-bay/:projectId?"
    element={<EngineeringBayWrapper />}
  />
</Route>
```

**Flow:**
```
User navigates to /fabricator/workflow/engineering-bay
  ↓
App.tsx matches route
  ↓
Renders MasterLayout (lazy loaded)
  ↓
MasterLayout renders <Outlet /> for nested routes
  ↓
EngineeringBayWrapper renders (lazy loaded)
```

---

## 2. Routing Layer

### MasterLayout Route Structure:
```
/fabricator/workflow/*
  ├── MasterLayout (Wrapper)
  │   ├── Header (80px)
  │   ├── Progress Stepper (80px)
  │   ├── Main Content Area
  │   │   └── <Outlet /> ← Renders nested routes here
  │   └── Footer (40px)
  │
  └── Nested Routes:
      ├── engineering-bay/:projectId? → EngineeringBayWrapper
      ├── quality-control → QualityControlPage
      └── pro → FabricatorWorkflowPro
```

---

## 3. MasterLayout Component

### Location: `src/components/fabricator/MasterLayout.tsx`

### Import Chain:
```typescript
// Step 3.1: React Router
import { Outlet, useLocation } from 'react-router-dom';

// Step 3.2: Context Hooks
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { useAuth } from '@/context/AuthContext';

// Step 3.3: UI Components
import { PrestigeCrownLogo } from '@/components/ui/PrestigeCrownLogo';

// Step 3.4: Workflow Configuration
import { UNIFIED_STAGES, isUnifiedWorkflowEnabled } from './unifiedWorkflow/unifiedStages';

// Step 3.5: Lazy Loaded Heavy Components
const Window3DGenerator = React.lazy(() => 
  import('@/components/fabricator/Window3DGenerator')
);

const NotificationCenter = React.lazy(() => 
  import('@/core/notifications/NotificationCenter.tsx')
    .then(m => ({ default: m.NotificationCenter }))
);
```

### Component Structure:
```typescript
<MasterLayout>
  {/* Header Section */}
  <div className="h-20">...</div>
  
  {/* Progress Stepper */}
  <div className="h-20">...</div>
  
  {/* Main Workspace - 3 Column Layout */}
  <div className="flex">
    {/* Left Sidebar (280px) */}
    <div className="w-64">...</div>
    
    {/* Center Canvas */}
    <div className="flex-1">
      <Outlet /> {/* ← EngineeringBayWrapper renders here */}
    </div>
    
    {/* Right Panel (400px) */}
    <div className="w-96">...</div>
  </div>
  
  {/* Footer */}
  <div className="h-10">...</div>
</MasterLayout>
```

**Key Point:** `<Outlet />` renders the nested route component (EngineeringBayWrapper)

---

## 4. EngineeringBayWrapper

### Location: `src/components/fabricator/EngineeringBayWrapper.tsx`

### Import Chain:
```typescript
// Step 4.1: Context Hooks
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { useJobsStore } from '@/store/jobsStore';

// Step 4.2: React Router
import { useNavigate, useParams } from 'react-router-dom';

// Step 4.3: Types
import { Profile, WindowComponent, WindowUnit } from '@/types/fabricator';

// Step 4.4: Main Component
import { EngineeringBay } from './EngineeringBay';
```

### Component Logic:
```typescript
export const EngineeringBayWrapper = () => {
  // Step 4.1: Get route params
  const { projectId } = useParams<{ projectId?: string }>();
  
  // Step 4.2: Get context state
  const { state, dispatch } = useFabricatorWorkspace();
  const { jobs, setSelectedJob } = useJobsStore();
  
  // Step 4.3: Find or use current project
  const currentProject = useMemo(() => {
    if (projectId) {
      const foundJob = jobs.find(job => job.id === projectId);
      if (foundJob) {
        dispatch({ type: 'SET_CURRENT_PROJECT', payload: foundJob });
        return foundJob;
      }
    }
    return state.currentProject;
  }, [projectId, jobs, state.currentProject]);
  
  // Step 4.4: Render EngineeringBay with props
  return (
    <EngineeringBay
      project={currentProject}
      onDesignComplete={handleDesignComplete}
      profiles={profiles}
      relatedPositions={relatedPositions}
      onSelectPosition={handleSelectPosition}
      onBackToMeasuring={handleBackToMeasuring}
    />
  );
};
```

**Purpose:** Connects EngineeringBay to global state (FabricatorWorkspaceContext, jobsStore)

---

## 5. EngineeringBay Component

### Location: `src/components/fabricator/EngineeringBay.tsx`

### Import Chain:
```typescript
// Step 5.1: Drafting Components
import { DraftingWorkbench } from './drafting/DraftingWorkbench';

// Step 5.2: System Pack Components
import { PrestigeSystemPackSelector } from './systemPack/PrestigeSystemPackSelector';

// Step 5.3: Hardener Components
import { HardenerSelectionPanel } from './hardener/HardenerSelectionPanel';

// Step 5.4: UI Components
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent } from '@/shared/ui/ui/card';

// Step 5.5: Types
import { WindowUnit, WindowComponent } from '@/types/fabricator';
```

### Component Structure:
```typescript
export const EngineeringBay = ({ project, onDesignComplete, ... }) => {
  const [designMode, setDesignMode] = useState<'smartdraw' | 'drafting'>('smartdraw');
  
  // Step 5.1: Check if in drafting mode
  if (designMode === 'drafting') {
    return (
      <div className="fixed inset-0 z-[100]">
        <DraftingWorkbench
          onDesignValidated={handleDraftingValidated}
          initialTemplate={activeSystemPackId}
        />
      </div>
    );
  }
  
  // Step 5.2: SmartDraw Mode (default)
  return (
    <div>
      {/* System Pack Selector */}
      <PrestigeSystemPackSelector />
      
      {/* System Configuration Card */}
      <Card>...</Card>
      
      {/* Structure Card */}
      <Card>...</Card>
      
      {/* Other UI elements */}
    </div>
  );
};
```

**Key Decision Point:** 
- If `designMode === 'drafting'` → Renders DraftingWorkbench (full screen, isolated)
- Otherwise → Renders SmartDraw interface

---

## 6. DraftingWorkbench

### Location: `src/components/fabricator/drafting/DraftingWorkbench.tsx`

### Import Chain:
```typescript
// Step 6.1: Core Drafting Components
import { DraftingCanvas2D } from './DraftingCanvas2D';
import { DraftingPreview3D } from './DraftingPreview3D';
import { DraftingToolbar } from './DraftingToolbar';
import { DraftingContext } from './DraftingContext';

// Step 6.2: Panel Components
import { PropertiesPanel } from './components/PropertiesPanel';
import { LayerManagerPanel } from './components/LayerManagerPanel';
import { EnhancedStatusBar } from './components/EnhancedStatusBar';
import { DraftingMenuBar } from './components/DraftingMenuBar';

// Step 6.3: Utility Components
import { ViewportControls } from './components/ViewportControls';
import { ZoomControls } from './components/ZoomControls';
import { EnhancedTooltip } from './components/EnhancedTooltip';

// Step 6.4: Hooks
import { useDraftingEngine } from './hooks/useDraftingEngine';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCollaborativeDrafting } from './hooks/useCollaborativeDrafting';

// Step 6.5: Utilities
import { exportToDXF, exportToJSON } from './utils/dxfExporter';
import { convertDraftingToWindowGrid } from './utils/draftingToWindowGrid';
import { StatePersistenceManager } from './utils/statePersistence';

// Step 6.6: Lazy Loaded Panels
const HelpPanel = lazy(() => import('./components/HelpPanel'));
const OperationHistoryPanel = lazy(() => import('./components/OperationHistoryPanel'));
const BlockLibraryPanel = lazy(() => import('./components/BlockLibraryPanel'));
```

### Component Structure:
```typescript
export const DraftingWorkbench = ({ onDesignValidated, initialTemplate }) => {
  // Step 6.1: Initialize Drafting Engine
  const draftingEngine = useDraftingEngine();
  
  // Step 6.2: Setup Context Provider
  return (
    <DraftingContext.Provider value={draftingEngine}>
      <div className="fixed inset-0 flex flex-col">
        {/* Header */}
        <DraftingMenuBar />
        
        {/* Main Content Area */}
        <div className="flex-1 flex">
          {/* Left Toolbar */}
          <DraftingToolbar />
          
          {/* Center Canvas */}
          <Tabs>
            <TabsContent value="2d">
              <DraftingCanvas2D
                selectedTool={selectedTool}
                viewport={viewport}
                {...props}
              />
            </TabsContent>
            <TabsContent value="3d">
              <DraftingPreview3D />
            </TabsContent>
          </Tabs>
          
          {/* Right Panel */}
          <Tabs>
            <TabsContent value="properties">
              <PropertiesPanel />
            </TabsContent>
            <TabsContent value="layers">
              <LayerManagerPanel />
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Status Bar */}
        <EnhancedStatusBar />
      </div>
    </DraftingContext.Provider>
  );
};
```

**Key Features:**
- Provides `DraftingContext` to all child components
- Manages 2D/3D view switching
- Handles tool selection, viewport, and state management

---

## 7. DraftingCanvas2D

### Location: `src/components/fabricator/drafting/DraftingCanvas2D.tsx`

### Import Chain:
```typescript
// Step 7.1: Context
import { useDraftingContext } from './DraftingContext';

// Step 7.2: UI Components
import { ContextMenu, ContextMenuTrigger } from '@/shared/ui/ui/context-menu';
import { EnhancedTooltip } from './components/EnhancedTooltip';

// Step 7.3: Utility Components
import { ZoomControls } from './components/ZoomControls';
import { EnhancedStatusBar } from './components/EnhancedStatusBar';
import { PerformanceMetrics } from './components/PerformanceMetrics';

// Step 7.4: Types
import type { DraftingTool, Viewport } from './types/drafting';
import type { Rectangle, Circle, Line, Arc } from './types/drafting';
```

### Component Structure:
```typescript
export const DraftingCanvas2D = ({ selectedTool, viewport, ... }) => {
  // Step 7.1: Get drafting context
  const drafting = useDraftingContext();
  
  // Step 7.2: Get geometry from engine
  const geometry = drafting.getGeometry();
  
  // Step 7.3: Render SVG Canvas
  return (
    <div className="relative w-full h-full">
      {/* Zoom Controls */}
      <ZoomControls />
      
      {/* SVG Canvas */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="relative w-full h-full">
            <svg
              ref={svgRef}
              viewBox={viewBox}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              {/* Render geometry */}
              {geometry.rectangles.map(rect => <rect key={rect.id} {...rect} />)}
              {geometry.circles.map(circle => <circle key={circle.id} {...circle} />)}
              {geometry.lines.map(line => <line key={line.id} {...line} />)}
              {/* ... more geometry types */}
            </svg>
          </div>
        </ContextMenuTrigger>
      </ContextMenu>
      
      {/* Status Bar */}
      <EnhancedStatusBar />
      
      {/* Performance Metrics */}
      <PerformanceMetrics />
    </div>
  );
};
```

**Key Responsibilities:**
- Renders SVG canvas with all geometry
- Handles mouse interactions (drawing, selection, panning)
- Manages viewport and zoom
- Displays real-time status and performance metrics

---

## 8. Supporting Components

### 8.1 PropertiesPanel
**Location:** `src/components/fabricator/drafting/components/PropertiesPanel.tsx`

**Imports:**
```typescript
import { useDraftingContext } from '../DraftingContext';
import { Input, Label, Select } from '@/shared/ui/ui/...';
import type { Rectangle, Circle, Line, Arc } from '../types/drafting';
```

**Purpose:** Edits properties of selected elements

---

### 8.2 EnhancedStatusBar
**Location:** `src/components/fabricator/drafting/components/EnhancedStatusBar.tsx`

**Imports:**
```typescript
import { useDraftingContext } from '../DraftingContext';
import { PerformanceMetrics } from './PerformanceMetrics';
```

**Purpose:** Shows tool status, element count, FPS, render time

---

### 8.3 EnhancedTooltip
**Location:** `src/components/fabricator/drafting/components/EnhancedTooltip.tsx`

**Imports:**
```typescript
import { createPortal } from 'react-dom';
```

**Purpose:** Renders tooltips via React Portal (z-index: 999999)

---

### 8.4 DraftingContext
**Location:** `src/components/fabricator/drafting/DraftingContext.tsx`

**Imports:**
```typescript
import { createContext, useContext } from 'react';
import type { DraftingEngine } from './hooks/useDraftingEngine';
```

**Purpose:** Provides drafting engine state to all child components

---

## 🔄 Complete Import Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. App.tsx                                                  │
│    ├── BrowserRouter                                         │
│    ├── FabricatorWorkspaceProvider                          │
│    └── Route: /fabricator/workflow/*                        │
│         └── MasterLayout (lazy)                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. MasterLayout.tsx                                          │
│    ├── useFabricatorWorkspace()                              │
│    ├── useAuth()                                             │
│    ├── UNIFIED_STAGES                                        │
│    └── <Outlet /> ← Renders nested routes                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. EngineeringBayWrapper.tsx                                 │
│    ├── useFabricatorWorkspace()                              │
│    ├── useJobsStore()                                        │
│    ├── useParams() → projectId                               │
│    └── EngineeringBay (with props)                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. EngineeringBay.tsx                                        │
│    ├── designMode: 'smartdraw' | 'drafting'                  │
│    │                                                          │
│    ├── IF drafting mode:                                     │
│    │   └── DraftingWorkbench (full screen, z-[100])          │
│    │                                                          │
│    └── ELSE smartdraw mode:                                  │
│        ├── PrestigeSystemPackSelector                        │
│        ├── System Configuration Card                        │
│        └── Structure Card                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. DraftingWorkbench.tsx                                     │
│    ├── DraftingContext.Provider                              │
│    ├── useDraftingEngine()                                    │
│    ├── DraftingMenuBar                                       │
│    ├── DraftingToolbar                                       │
│    ├── DraftingCanvas2D (2D tab)                             │
│    ├── DraftingPreview3D (3D tab)                           │
│    ├── PropertiesPanel                                       │
│    ├── LayerManagerPanel                                     │
│    └── EnhancedStatusBar                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. DraftingCanvas2D.tsx                                      │
│    ├── useDraftingContext()                                  │
│    ├── SVG Canvas (renders geometry)                         │
│    ├── Mouse event handlers                                  │
│    ├── ZoomControls                                          │
│    ├── EnhancedStatusBar                                     │
│    └── PerformanceMetrics                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Key Context Providers

### FabricatorWorkspaceContext
**Location:** `src/context/FabricatorWorkspaceContext.tsx`

**Provides:**
- `currentProject: WindowUnit | null`
- `dispatch: (action) => void`
- Project state management

**Used by:**
- MasterLayout
- EngineeringBayWrapper
- EngineeringBay

---

### DraftingContext
**Location:** `src/components/fabricator/drafting/DraftingContext.tsx`

**Provides:**
- `draftingEngine: DraftingEngine`
- Geometry state
- Selection state
- Undo/redo stack

**Used by:**
- DraftingCanvas2D
- PropertiesPanel
- EnhancedStatusBar
- All drafting child components

---

## 🎯 Key Takeaways

1. **Lazy Loading:** Heavy components are lazy-loaded to reduce initial bundle size
2. **Context Isolation:** DraftingWorkbench is isolated from MasterLayout sidebar (z-[100])
3. **State Management:** 
   - Global state: FabricatorWorkspaceContext
   - Local state: DraftingContext (within DraftingWorkbench)
4. **Route Structure:** Nested routes with `<Outlet />` pattern
5. **Component Hierarchy:** Clear parent-child relationships with proper prop drilling

---

## 🔍 Debugging Import Issues

If you encounter import errors, check:

1. **Lazy Loading Failures:**
   - Check `lazyRetry` implementation
   - Verify component exports (default vs named)
   - Check network tab for failed chunk loads

2. **Context Errors:**
   - Ensure components are within provider
   - Check `useDraftingContext` is only used inside `DraftingContext.Provider`

3. **Route Matching:**
   - Verify route paths match exactly
   - Check nested route structure
   - Ensure `<Outlet />` is present in parent route

4. **Type Errors:**
   - Verify all type imports match actual exports
   - Check for circular dependencies

---

**Last Updated:** January 2026  
**Status:** ✅ Complete Import Chain Documented

