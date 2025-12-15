# Code Hardening Quick Reference

## Critical Issues Found

### 🔴 Critical (Fix Immediately)
1. **No Error Boundaries** - 3D rendering can crash entire component
2. **Unsafe Type Usage** - 3 instances of `any` types in EngineeringBay
3. **Missing WebGL Detection** - No graceful fallback for unsupported browsers
4. **No Resource Cleanup** - WebGL contexts and event listeners may leak memory
5. **Unsafe Array Access** - Direct array indexing without bounds checking

### 🟡 High Priority
1. **Performance Issues** - BOM calculations run on every render
2. **Missing Input Validation** - No bounds checking for window dimensions
3. **Race Conditions** - Async operations don't check if component is mounted
4. **No Loading States** - Users don't know when operations are in progress

### 🟢 Medium Priority
1. **Missing Memoization** - Expensive computations not memoized
2. **No Debouncing** - Rapid state changes cause performance issues
3. **Weak Error Messages** - Generic errors without context

---

## Quick Fixes (Copy-Paste Ready)

### 1. Add Error Boundary
```typescript
import ErrorBoundary from '@/components/ErrorBoundary';

<ErrorBoundary fallback={<ErrorFallback />}>
  <Window3DGenerator {...props} />
</ErrorBoundary>
```

### 2. Fix Type Safety
```typescript
// Replace: (systemPack: any)
// With:
interface SystemPack {
  id: string;
  meta: { id: string; name: string; brands?: string[] };
}

const handleSystemPackSelect = useCallback((systemPack: SystemPack) => {
  // ... implementation
}, []);
```

### 3. Add WebGL Detection
```typescript
const [webGLSupported, setWebGLSupported] = useState<boolean | null>(null);

useEffect(() => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
    setWebGLSupported(!!gl);
  } catch {
    setWebGLSupported(false);
  }
}, []);
```

### 4. Add Try-Catch
```typescript
try {
  const result = riskyOperation();
  setState(result);
} catch (error) {
  console.error('Operation failed:', error);
  setError('Operation failed. Please try again.');
  track('operation_error', { error: error.message });
}
```

### 5. Safe Array Access
```typescript
// Instead of: array[0]
const value = array && array.length > 0 ? array[0] : defaultValue;
```

### 6. Memoize Expensive Calculations
```typescript
const expensiveResult = useMemo(() => {
  // Heavy computation
  return computeResult(data);
}, [data]);
```

### 7. Add Loading State
```typescript
const [isLoading, setIsLoading] = useState(false);

const handleOperation = async () => {
  setIsLoading(true);
  try {
    await operation();
  } finally {
    setIsLoading(false);
  }
};
```

### 8. Cleanup Resources
```typescript
useEffect(() => {
  const listener = () => { /* ... */ };
  document.addEventListener('event', listener);
  return () => document.removeEventListener('event', listener);
}, []);
```

---

## Testing Checklist

- [ ] Test with null/undefined data
- [ ] Test with invalid dimensions (>10m)
- [ ] Test WebGL unsupported browser
- [ ] Test rapid state changes
- [ ] Test memory leaks (30+ min session)
- [ ] Test error recovery
- [ ] Test export with empty model

---

## Performance Targets

- 3D Generation: < 500ms (p95)
- BOM Calculation: < 100ms
- Render Time: < 16ms (60 FPS)
- Memory: < 200MB after 1 hour

---

## Error Tracking

All errors should:
1. Log to console with context
2. Track in analytics
3. Show user-friendly message
4. Include recovery option

---

See `HARDENING_PLAN_ENGINEERING_BAY_3D_GENERATOR.md` for full details.

