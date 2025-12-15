# Code Hardening Plan: EngineeringBay & Window3DGenerator

## Executive Summary
This document outlines a comprehensive plan to harden two critical Fabricator components against runtime errors, performance issues, and edge cases. The plan prioritizes production stability, type safety, and user experience.

---

## 1. Type Safety Improvements

### 1.1 EngineeringBay.tsx
**Issues:**
- Line 109: `handleSystemPackSelect` uses `any` for systemPack parameter
- Line 114: `SYSTEM_PACKS.find((p: any) => ...)` uses `any`
- Line 681: `Object.values(aggregated).map((item: any, idx) => ...)` uses `any`
- Missing type guards for `project` properties
- Unsafe property access on `(project as any)?.allowedSystemPackIds`

**Actions:**
```typescript
// Create proper types
interface SystemPack {
  meta: {
    id: string;
    name: string;
    brands?: string[];
    type?: string;
  };
  defaultGrid?: WindowGrid;
  windowSystemSpec?: {
    profiles_cutting_list?: Profile[];
    accessories_list?: any[];
  };
}

interface AggregatedBOMItem {
  profile: Profile | undefined;
  type: string;
  quantity: number;
  totalLength: number;
  totalWeight: number;
  totalCost: number;
  role?: string;
  verification: {
    verified: boolean;
    missing: string[];
    mismatched: string[];
    systemProfile?: Profile;
  };
  specs: {
    width?: number;
    height?: number;
    material?: string;
    costPerMeter?: number;
    weightPerMeter?: number;
    color?: string;
  };
}

// Add type guards
function isValidSystemPack(pack: unknown): pack is SystemPack {
  return (
    typeof pack === 'object' &&
    pack !== null &&
    'meta' in pack &&
    typeof (pack as any).meta === 'object' &&
    typeof (pack as any).meta.id === 'string'
  );
}

function hasAllowedSystemPacks(project: WindowUnit): project is WindowUnit & { allowedSystemPackIds: string[] } {
  return Array.isArray((project as any)?.allowedSystemPackIds);
}
```

### 1.2 Window3DGenerator.tsx
**Issues:**
- Line 479: `WindowControls` props use `any`
- Line 585: `onValueChange={(v: any) => setQuality(v)}` uses `any`
- Missing type safety for WebGL context
- Unsafe THREE.js object access

**Actions:**
```typescript
// Define proper prop types
interface WindowControlsProps {
  isAnimating: boolean;
  setIsAnimating: (value: boolean) => void;
  animationProgress: number;
  setAnimationProgress: (value: number) => void;
  showMeasurements: boolean;
  setShowMeasurements: (value: boolean) => void;
  exportFormat: 'GLB' | 'STL' | 'OBJ';
  setExportFormat: (value: 'GLB' | 'STL' | 'OBJ') => void;
  exportModel: (format: 'GLB' | 'STL' | 'OBJ') => Promise<void>;
  toggleFullscreen: () => void;
  controlsRef: React.RefObject<any>;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  setQuality: (value: 'low' | 'medium' | 'high' | 'ultra') => void;
  enableShadows: boolean;
  setEnableShadows: (value: boolean) => void;
  isExporting: boolean;
  sectionViewEnabled: boolean;
  setSectionViewEnabled: (value: boolean) => void;
}

// Add WebGL context type guard
function isWebGLContext(gl: unknown): gl is WebGLRenderingContext {
  return gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext;
}
```

---

## 2. Error Handling & Boundaries

### 2.1 Add Error Boundaries
**Current State:** No error boundaries around 3D rendering or heavy computations

**Actions:**
```typescript
// Wrap Window3DGenerator in error boundary
import ErrorBoundary from '@/components/ErrorBoundary';

// In EngineeringBay.tsx
<ErrorBoundary
  fallback={
    <Card className="bg-red-900/20 border-red-500">
      <CardContent className="p-4">
        <Alert variant="destructive">
          <AlertDescription>
            {t('engineering_bay.3d_render_error', '3D preview failed to load. Please refresh or check your system.')}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  }
>
  <Window3DGenerator ... />
</ErrorBoundary>

// Add WebGL-specific error boundary
class WebGLErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log WebGL-specific errors
    if (error.message.includes('WebGL') || error.message.includes('shader')) {
      console.error('WebGL Error:', error, errorInfo);
      // Track analytics
      track('webgl_error', { error: error.message, stack: error.stack });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-900/20 border border-red-500 rounded">
          <p className="text-red-400">
            {t('window_3d_generator.webgl_error', '3D rendering is not supported on this device.')}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### 2.2 Add Try-Catch Blocks
**Locations:**
- `generateComponentsFromGrid` calls
- `generateModelGeometries` calls
- Export operations
- State updates in effects

**Actions:**
```typescript
// In EngineeringBay.tsx - handleSystemPackSelect
const handleSystemPackSelect = useCallback((systemPack: SystemPack) => {
  try {
    setError(null);
    setActiveSystemPackId(systemPack.id);
    
    const packData = SYSTEM_PACKS.find((p) => isValidSystemPack(p) && p.meta.id === systemPack.id);
    if (packData?.defaultGrid) {
      setCurrentGrid(packData.defaultGrid);
    } else {
      // Fallback with validation
      const fallbackGrid: WindowGrid = {
        rows: 1,
        cols: 2,
        cells: [
          { id: '0-0', row: 0, col: 0, type: 'sash' },
          { id: '0-1', row: 0, col: 1, type: 'sash' },
        ]
      };
      setCurrentGrid(fallbackGrid);
    }
  } catch (error) {
    console.error('System pack selection error:', error);
    setError(t('engineering_bay.system_pack_error', 'Failed to apply system pack. Please try again.'));
    track('system_pack_error', { error: error instanceof Error ? error.message : 'unknown' });
  }
}, []);

// In Window3DGenerator.tsx - exportModel
const exportModel = useCallback(async (format: 'GLB' | 'STL' | 'OBJ') => {
  if (!modelRef.current) {
    console.warn('No model available for export');
    return;
  }

  setIsExporting(true);
  
  try {
    const clonedModel = modelRef.current.clone();
    
    // Validate model before export
    if (!clonedModel || clonedModel.children.length === 0) {
      throw new Error('Model is empty or invalid');
    }

    switch (format) {
      case 'GLB': {
        const exporter = new GLTFExporter();
        const result = await exporter.parseAsync(clonedModel, {
          binary: true,
          includeCustomExtensions: true,
        });
        // ... rest of export logic
        break;
      }
      // ... other formats
    }
    
    track('window_3d_export', { format, windowId: windowUnit.id, quality });
  } catch (error) {
    console.error('Export error:', error);
    // Show user-friendly error
    alert(t('window_3d_generator.export_error', 'Export failed. Please try again or contact support.'));
    track('window_3d_export_error', { 
      format, 
      error: error instanceof Error ? error.message : 'unknown' 
    });
  } finally {
    setIsExporting(false);
  }
}, [windowUnit, quality]);
```

### 2.3 Graceful Degradation
**Actions:**
```typescript
// Check WebGL support before rendering
const [webGLSupported, setWebGLSupported] = useState<boolean | null>(null);

useEffect(() => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
    setWebGLSupported(!!gl);
  } catch (error) {
    setWebGLSupported(false);
  }
}, []);

// In render
if (webGLSupported === false) {
  return (
    <Card className="bg-gray-900/50">
      <CardContent className="p-8 text-center">
        <Alert variant="destructive">
          <AlertDescription>
            {t('window_3d_generator.webgl_unsupported', 'Your browser does not support 3D rendering.')}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
```

---

## 3. Performance Optimizations

### 3.1 Memoization Improvements
**Current Issues:**
- BOM calculations run on every render
- Glass details calculated in render function
- No memoization for expensive aggregations

**Actions:**
```typescript
// Move BOM calculations to useMemo
const bomData = useMemo(() => {
  if (!liveProject || liveProject.components.length === 0) return null;

  const componentsByCategory = {
    frame: [] as WindowComponent[],
    sash: [] as WindowComponent[],
    structural: [] as WindowComponent[],
    glazing: [] as WindowComponent[],
    accessory: [] as WindowComponent[],
    other: [] as WindowComponent[],
  };

  // ... categorization logic

  // Aggregate components
  const aggregated = Object.entries(componentsByCategory).reduce((acc, [category, comps]) => {
    if (comps.length === 0) return acc;
    
    const categoryAggregated = comps.reduce((agg, comp) => {
      const key = `${comp.profile?.name || comp.type}_${comp.type}`;
      // ... aggregation logic
      return agg;
    }, {} as Record<string, AggregatedBOMItem>);
    
    acc[category] = categoryAggregated;
    return acc;
  }, {} as Record<string, Record<string, AggregatedBOMItem>>);

  return { componentsByCategory, aggregated };
}, [liveProject?.components, liveProject?.systemPackId, profiles]);

// Memoize glass details
const glassDetails = useMemo(() => {
  if (!liveProject) return null;
  
  // ... glass calculation logic
  return { glassSpecs, totalGlassArea, glazingType, glassThickness, totalGlassWeight };
}, [liveProject?.components, liveProject?.glazing]);

// Memoize totals
const totals = useMemo(() => {
  if (!liveProject) return { materialCost: 0, weight: 0 };
  
  // ... totals calculation
  return { materialCost, weight };
}, [liveProject?.components, liveProject?.hardware, profiles]);
```

### 3.2 React.memo for Expensive Components
**Actions:**
```typescript
// Memoize Window3DModel
export const Window3DModel = React.memo(({
  windowUnit,
  isAnimating,
  animationProgress,
  onModelReady,
  enableShadows = true,
  clippingPlanes,
  explodedView,
  validationResult
}: Window3DModelProps) => {
  // ... component logic
}, (prevProps, nextProps) => {
  // Custom comparison
  return (
    prevProps.windowUnit.id === nextProps.windowUnit.id &&
    prevProps.windowUnit.overallWidth === nextProps.windowUnit.overallWidth &&
    prevProps.windowUnit.overallHeight === nextProps.windowUnit.overallHeight &&
    prevProps.isAnimating === nextProps.isAnimating &&
    prevProps.animationProgress === nextProps.animationProgress &&
    prevProps.enableShadows === nextProps.enableShadows &&
    prevProps.explodedView === nextProps.explodedView
  );
});

// Memoize BOM sections
const BOMCategorySection = React.memo(({ category, items, labels }: BOMCategorySectionProps) => {
  // ... render logic
});
```

### 3.3 Debounce Rapid State Changes
**Actions:**
```typescript
import { useDebouncedCallback } from 'use-debounce';

// Debounce grid changes
const debouncedGridChange = useDebouncedCallback(
  (grid: WindowGrid) => {
    setCurrentGrid(grid);
  },
  300 // 300ms delay
);

// In SmartDrawCanvas
<SmartDrawCanvas
  onGridChange={debouncedGridChange}
  // ... other props
/>
```

---

## 4. Resource Management & Memory Leaks

### 4.1 WebGL Context Cleanup
**Actions:**
```typescript
useEffect(() => {
  return () => {
    // Cleanup WebGL resources
    if (glRef.current) {
      const gl = glRef.current;
      // Dispose of geometries and materials
      gl.scene?.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose());
          } else {
            object.material?.dispose();
          }
        }
      });
      
      // Clear render targets
      gl.renderLists?.dispose();
      
      // Force garbage collection hint
      if (gl.extensions?.WEBGL_lose_context) {
        gl.extensions.WEBGL_lose_context.loseContext();
      }
    }
  };
}, []);
```

### 4.2 Event Listener Cleanup
**Actions:**
```typescript
// In Window3DGenerator.tsx
useEffect(() => {
  const handleClick = (e: MouseEvent) => {
    if (!controlsVisible) return;
    if (controlsCardRef.current && !controlsCardRef.current.contains(e.target as Node)) {
      setControlsVisible(false);
    }
  };
  
  document.addEventListener('mousedown', handleClick);
  return () => {
    document.removeEventListener('mousedown', handleClick);
  };
}, [controlsVisible]);

// Fullscreen change listener
useEffect(() => {
  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
  };
  
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  return () => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
  };
}, []);
```

### 4.3 Animation Frame Cleanup
**Actions:**
```typescript
// In Window3DGenerator.tsx - animation loop
useEffect(() => {
  if (!isAnimating) return;

  const startTime = Date.now();
  const duration = 3000;
  let animationFrameId: number;

  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    setAnimationProgress(progress);
    
    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      setIsAnimating(false);
    }
  };
  
  animationFrameId = requestAnimationFrame(animate);
  
  return () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  };
}, [isAnimating]);
```

---

## 5. Input Validation & Bounds Checking

### 5.1 Validate WindowUnit Data
**Actions:**
```typescript
// Create validation utility
function validateWindowUnit(unit: WindowUnit | null): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!unit) {
    return { isValid: false, errors: [{ field: 'unit', message: 'Window unit is required' }] };
  }
  
  // Validate dimensions
  if (!unit.overallWidth || unit.overallWidth <= 0 || unit.overallWidth > 10000) {
    errors.push({ 
      field: 'overallWidth', 
      message: `Width must be between 1 and 10000mm (got ${unit.overallWidth})` 
    });
  }
  
  if (!unit.overallHeight || unit.overallHeight <= 0 || unit.overallHeight > 5000) {
    errors.push({ 
      field: 'overallHeight', 
      message: `Height must be between 1 and 5000mm (got ${unit.overallHeight})` 
    });
  }
  
  // Validate grid
  if (unit.grid) {
    if (unit.grid.rows < 1 || unit.grid.rows > 10) {
      errors.push({ field: 'grid.rows', message: 'Grid rows must be between 1 and 10' });
    }
    if (unit.grid.cols < 1 || unit.grid.cols > 10) {
      errors.push({ field: 'grid.cols', message: 'Grid cols must be between 1 and 10' });
    }
    
    // Validate cells match grid dimensions
    const expectedCells = unit.grid.rows * unit.grid.cols;
    if (unit.grid.cells.length !== expectedCells) {
      errors.push({ 
        field: 'grid.cells', 
        message: `Grid cells count (${unit.grid.cells.length}) doesn't match dimensions (${expectedCells})` 
      });
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

// Use in EngineeringBay
useEffect(() => {
  if (project) {
    const validation = validateWindowUnit(project);
    if (!validation.isValid) {
      setError(validation.errors.map(e => e.message).join('; '));
      console.warn('Invalid project data:', validation.errors);
    }
  }
}, [project]);
```

### 5.2 Safe Array Access
**Actions:**
```typescript
// Replace unsafe array access
// Before:
const length = comp.cuttingLengths?.[0] || 0;

// After:
const length = comp.cuttingLengths && comp.cuttingLengths.length > 0 
  ? comp.cuttingLengths[0] 
  : 0;

// Add bounds checking
function safeArrayAccess<T>(array: T[] | undefined | null, index: number, defaultValue: T): T {
  if (!array || index < 0 || index >= array.length) {
    return defaultValue;
  }
  return array[index];
}
```

### 5.3 Validate Profile Data
**Actions:**
```typescript
function validateProfile(profile: Profile | undefined): boolean {
  if (!profile) return false;
  
  // Check required fields
  if (!profile.id || !profile.name) return false;
  
  // Validate dimensions
  if (profile.width !== undefined && (profile.width <= 0 || profile.width > 1000)) {
    return false;
  }
  
  if (profile.height !== undefined && (profile.height <= 0 || profile.height > 1000)) {
    return false;
  }
  
  // Validate costs (must be non-negative)
  if (profile.costPerMeter !== undefined && profile.costPerMeter < 0) {
    return false;
  }
  
  return true;
}

// Use in BOM calculations
const verifiedProfile = validateProfile(item.profile) ? item.profile : null;
```

---

## 6. State Management Hardening

### 6.1 Prevent Race Conditions
**Actions:**
```typescript
// Use refs to track async operations
const isMountedRef = useRef(true);

useEffect(() => {
  isMountedRef.current = true;
  return () => {
    isMountedRef.current = false;
  };
}, []);

// In async operations
const loadData = async () => {
  try {
    const data = await fetchData();
    if (isMountedRef.current) {
      setData(data);
    }
  } catch (error) {
    if (isMountedRef.current) {
      setError(error);
    }
  }
};
```

### 6.2 Add Loading States
**Actions:**
```typescript
// Add loading state for 3D model generation
const [isModelGenerating, setIsModelGenerating] = useState(false);

useEffect(() => {
  setIsModelGenerating(true);
  
  try {
    const geometrySpec = generateModelGeometries(windowUnit);
    setModelData(geometrySpec);
  } catch (error) {
    console.error('Model generation error:', error);
    setModelData(null);
  } finally {
    setIsModelGenerating(false);
  }
}, [windowUnit]);
```

### 6.3 Validate State Transitions
**Actions:**
```typescript
// Prevent invalid state transitions
const setCurrentGrid = useCallback((grid: WindowGrid) => {
  // Validate grid before setting
  if (!grid || !grid.cells || grid.cells.length === 0) {
    console.warn('Invalid grid provided');
    return;
  }
  
  if (grid.rows < 1 || grid.cols < 1) {
    console.warn('Grid dimensions must be at least 1x1');
    return;
  }
  
  setCurrentGrid(grid);
}, []);
```

---

## 7. Security & Data Integrity

### 7.1 Sanitize User Input
**Actions:**
```typescript
// Sanitize system pack IDs
function sanitizeSystemPackId(id: string | null | undefined): string | null {
  if (!id || typeof id !== 'string') return null;
  
  // Only allow alphanumeric, dash, underscore
  const sanitized = id.replace(/[^a-zA-Z0-9_-]/g, '');
  return sanitized.length > 0 && sanitized.length <= 50 ? sanitized : null;
}

// Use in handlers
const handleSystemPackSelect = useCallback((systemPack: SystemPack) => {
  const sanitizedId = sanitizeSystemPackId(systemPack.id);
  if (!sanitizedId) {
    setError('Invalid system pack ID');
    return;
  }
  setActiveSystemPackId(sanitizedId);
}, []);
```

### 7.2 Validate Export Data
**Actions:**
```typescript
// Before exporting, validate model integrity
function validateModelForExport(model: THREE.Group): boolean {
  if (!model || model.children.length === 0) {
    return false;
  }
  
  // Check for valid geometries
  let hasValidGeometry = false;
  model.traverse((object) => {
    if (object instanceof THREE.Mesh && object.geometry) {
      hasValidGeometry = true;
    }
  });
  
  return hasValidGeometry;
}

// Use in exportModel
if (!validateModelForExport(clonedModel)) {
  throw new Error('Model is invalid or empty');
}
```

---

## 8. Testing & Monitoring

### 8.1 Add Error Tracking
**Actions:**
```typescript
// Track errors with context
function trackError(error: Error, context: Record<string, any>) {
  console.error('Component Error:', error, context);
  
  // Send to analytics
  track('component_error', {
    error: error.message,
    stack: error.stack,
    component: 'EngineeringBay' | 'Window3DGenerator',
    ...context
  });
  
  // Optionally send to error tracking service (Sentry, etc.)
  if (window.Sentry) {
    window.Sentry.captureException(error, { extra: context });
  }
}

// Use throughout
try {
  // ... operation
} catch (error) {
  trackError(error as Error, { operation: 'systemPackSelect', packId: systemPack.id });
  setError('Operation failed');
}
```

### 8.2 Add Performance Monitoring
**Actions:**
```typescript
// Monitor render performance
useEffect(() => {
  const startTime = performance.now();
  
  return () => {
    const renderTime = performance.now() - startTime;
    if (renderTime > 100) { // Warn if render takes > 100ms
      console.warn(`Slow render detected: ${renderTime.toFixed(2)}ms`);
      track('slow_render', { component: 'EngineeringBay', duration: renderTime });
    }
  };
});

// Monitor 3D generation time
const generateModelWithTiming = useCallback((windowUnit: WindowUnit) => {
  const startTime = performance.now();
  try {
    const geometrySpec = generateModelGeometries(windowUnit);
    const duration = performance.now() - startTime;
    
    track('3d_generation_time', { duration, windowId: windowUnit.id });
    
    if (duration > 1000) {
      console.warn(`Slow 3D generation: ${duration.toFixed(2)}ms`);
    }
    
    return geometrySpec;
  } catch (error) {
    track('3d_generation_error', { 
      error: error instanceof Error ? error.message : 'unknown',
      windowId: windowUnit.id 
    });
    throw error;
  }
}, []);
```

---

## 9. Implementation Priority

### Phase 1: Critical (Week 1)
1. ✅ Add error boundaries around 3D rendering
2. ✅ Add try-catch blocks for async operations
3. ✅ Fix `any` types with proper interfaces
4. ✅ Add input validation for WindowUnit
5. ✅ Add WebGL support detection

### Phase 2: High Priority (Week 2)
1. ✅ Memoize expensive BOM calculations
2. ✅ Add resource cleanup (WebGL, event listeners)
3. ✅ Add loading states
4. ✅ Improve error messages with i18n
5. ✅ Add bounds checking for arrays

### Phase 3: Medium Priority (Week 3)
1. ✅ React.memo for expensive components
2. ✅ Debounce rapid state changes
3. ✅ Add performance monitoring
4. ✅ Enhance type guards
5. ✅ Add state transition validation

### Phase 4: Polish (Week 4)
1. ✅ Security hardening (input sanitization)
2. ✅ Comprehensive error tracking
3. ✅ Add unit tests for validation functions
4. ✅ Documentation updates
5. ✅ Performance profiling and optimization

---

## 10. Testing Checklist

- [ ] Test with invalid/null WindowUnit data
- [ ] Test with missing profiles
- [ ] Test with WebGL unsupported browsers
- [ ] Test rapid grid changes (debouncing)
- [ ] Test export with empty/invalid models
- [ ] Test error boundary recovery
- [ ] Test memory leaks (long-running sessions)
- [ ] Test with very large window units (>5m²)
- [ ] Test with malformed system pack data
- [ ] Test concurrent state updates

---

## 11. Metrics to Track

- Error rate by component
- 3D generation time (p50, p95, p99)
- Render performance (FPS, frame time)
- Memory usage over time
- Export success rate
- User recovery rate after errors

---

## Notes

- All error messages should use i18n keys
- All console.error calls should include context
- Consider adding a "Report Issue" button for production errors
- Monitor WebGL context loss events
- Add retry logic for transient failures

