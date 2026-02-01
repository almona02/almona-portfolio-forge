# Workflow Performance Audit Guide

Complete guide for auditing end-to-end workflow performance from design to export.

**Status:** Production-Ready  
**Last Updated:** January 2026  
**Target Performance:** Simple Window <2s, Complex Facade <5s, Batch (10) <20s

---

## Overview

This guide covers performance auditing for the complete ALMONA workflow:
1. **Design** → 2. **Validation** → 3. **BOM Generation** → 4. **Optimization** → 5. **Export** → 6. **Audit Trail**

---

## Performance Targets

### Test Scenarios

| Scenario | Complexity | Target Duration | Key Metrics |
|----------|-----------|----------------|-------------|
| **Simple Window** | 1x1 grid, basic profile | <2 seconds | Validation <200ms, BOM <500ms |
| **Complex Facade** | 10x10 grid, mixed profiles | <5 seconds | Validation <500ms, BOM <2s |
| **Batch Processing** | 10 designs sequentially | <20 seconds | Memory stable, no leaks |

### Critical Checkpoints

1. **EngineeringBay Validation**: <200ms (target), <500ms (max)
2. **BOM Generation**: <500ms (simple), <2s (complex)
3. **Replay Tracking Overhead**: <50ms per operation
4. **Optimization Algorithm Selection**: <100ms
5. **DXF/G-code Export**: <200ms per export
6. **Audit Trail Recording**: <100ms per record

---

## Tools & Setup

### 1. Chrome DevTools Performance Tab

**Steps:**
1. Open Chrome DevTools (F12)
2. Go to **Performance** tab
3. Click **Record** (circle icon) or press `Ctrl+Shift+E` (Windows) / `Cmd+Option+E` (Mac)
4. Execute workflow in application
5. Click **Stop** when workflow completes
6. Analyze timeline for bottlenecks

**Key Areas to Check:**
- **Main Thread Activity**: Look for long tasks (>50ms)
- **JavaScript Execution**: Identify slow functions
- **Network Requests**: Check for slow API calls
- **Memory Usage**: Monitor for leaks (increasing trend)

**Custom Performance Marks:**
The audit system automatically creates performance marks that appear in DevTools:
- `design:start`, `design:complete`
- `validation:start`, `validation:complete`
- `bom:start`, `bom:complete`
- `optimization:start`, `optimization:complete`
- `export:start`, `export:complete`
- `audit:start`, `audit:complete`

**Viewing Marks in DevTools:**
1. After recording, look for **User Timing** section
2. Expand to see all custom marks
3. Click on marks to see timing details
4. Use **Measure** tool to measure duration between marks

### 2. React DevTools Profiler

**Steps:**
1. Install React DevTools browser extension
2. Open DevTools → **Profiler** tab
3. Click **Record** (circle icon)
4. Execute workflow
5. Click **Stop** to see profiling results

**Key Metrics:**
- **Render Time**: Time spent rendering components
- **Commit Time**: Time to apply changes to DOM
- **Component Re-renders**: Identify unnecessary re-renders
- **Flamegraph**: Visual representation of component tree performance

**Optimization Tips:**
- Look for components with high render times
- Check for components re-rendering unnecessarily
- Use `React.memo()` for expensive components
- Verify `useMemo()` and `useCallback()` are used correctly

### 3. Custom Timing Markers in Code

**Using WorkflowPerformanceAudit:**

```typescript
import { getPerformanceAudit, PerformanceCheckpoint } from '@/lib/performance/WorkflowPerformanceAudit';

// In your workflow component/service
const audit = getPerformanceAudit('my-workflow-id');
audit.startWorkflow();

// Mark checkpoints
audit.mark(PerformanceCheckpoint.DESIGN_START);
// ... design work ...
audit.mark(PerformanceCheckpoint.DESIGN_COMPLETE);

audit.mark(PerformanceCheckpoint.VALIDATION_START);
// ... validation ...
audit.mark(PerformanceCheckpoint.VALIDATION_COMPLETE);

// Complete and get results
const result = audit.completeWorkflow();
console.log('Total Duration:', result.totalDuration);
console.log('Phase Durations:', result.phaseDurations);
```

**Integration Points:**

1. **EngineeringBay.tsx** - Add marks in `handleSubmit`:
```typescript
audit.mark(PerformanceCheckpoint.VALIDATION_START);
const { result: validation } = validateDesignWithEnvelopeWrapper(...);
audit.mark(PerformanceCheckpoint.VALIDATION_COMPLETE);
```

2. **PresetAwareBOMGenerator.ts** - Add marks in `generateCompleteBOM`:
```typescript
audit.mark(PerformanceCheckpoint.BOM_START);
audit.mark(PerformanceCheckpoint.BOM_REPLAY_TRACKING);
const replayResult = await DeterministicReplayEngine.executeWithReplayTracking(...);
audit.mark(PerformanceCheckpoint.BOM_COMPLETE);
```

3. **CuttingOptimizationEngine.tsx** - Add marks in optimization:
```typescript
audit.mark(PerformanceCheckpoint.OPTIMIZATION_START);
audit.mark(PerformanceCheckpoint.OPTIMIZATION_ALGORITHM_SELECTION);
const algorithm = selectOptimizationAlgorithm(...);
audit.mark(PerformanceCheckpoint.OPTIMIZATION_EXECUTION);
const result = await executeOptimization(...);
audit.mark(PerformanceCheckpoint.OPTIMIZATION_COMPLETE);
```

### 4. Network Throttling (3G/4G Simulation)

**Steps:**
1. Open Chrome DevTools → **Network** tab
2. Click throttling dropdown (default: "No throttling")
3. Select **Fast 3G** or **Slow 4G**
4. Execute workflow
5. Measure impact on API calls

**Expected Impact:**
- API calls should add <500ms per request
- BOM generation might be slower (depends on caching)
- Audit trail recording should remain fast (batched)

**Testing Scenarios:**
- **No Throttling**: Baseline performance
- **Fast 3G**: 750 Kbps, 100ms RTT
- **Slow 4G**: 400 Kbps, 400ms RTT

---

## Running Performance Tests

### Automated Tests

```bash
# Run all performance tests
npm run test:performance

# Run specific test suite
npm run test src/tests/e2e/WorkflowPerformanceAudit.test.ts

# Run with verbose output
npm run test:performance -- --reporter=verbose
```

### Manual Testing Checklist

- [ ] Simple Window (1x1 grid)
  - [ ] Design completes <100ms
  - [ ] Validation completes <200ms
  - [ ] BOM generation completes <500ms
  - [ ] Total workflow <2 seconds

- [ ] Complex Facade (10x10 grid)
  - [ ] Design completes <500ms
  - [ ] Validation completes <500ms
  - [ ] BOM generation completes <2s
  - [ ] Total workflow <5 seconds

- [ ] Batch Processing (10 designs)
  - [ ] Each design completes in reasonable time
  - [ ] Memory usage stays stable (<100MB increase)
  - [ ] No memory leaks (GC runs successfully)
  - [ ] Total batch <20 seconds

---

## Performance Analysis

### Identifying Bottlenecks

1. **Slow Validation:**
   - Check ValidationEnvelope overhead
   - Review constraint evaluation logic
   - Verify caching is working

2. **Slow BOM Generation:**
   - Check replay tracking overhead
   - Review parallel execution (Promise.all)
   - Verify BOM cache hits

3. **Slow Optimization:**
   - Check algorithm selection time
   - Review optimization execution
   - Verify algorithm caching

4. **Slow Export:**
   - Check DXF generation time
   - Review G-code generation
   - Verify file size impact

5. **Memory Issues:**
   - Check for memory leaks (increasing trend)
   - Review component cleanup
   - Verify cache size limits

### Performance Optimization Tips

1. **Enable Caching:**
   - BOM generation cache
   - Validation cache
   - Algorithm selection cache

2. **Use Parallel Execution:**
   - Promise.all for independent operations
   - Parallel BOM calculations
   - Batch API requests

3. **Optimize React Rendering:**
   - Use React.memo() for expensive components
   - Use useMemo() for expensive calculations
   - Use useCallback() for event handlers

4. **Reduce Network Calls:**
   - Batch API requests
   - Use request caching
   - Implement request deduplication

---

## Reporting Performance Issues

When reporting performance issues, include:

1. **Test Scenario:** Simple Window / Complex Facade / Batch Processing
2. **Performance Metrics:**
   - Total duration
   - Phase durations
   - Memory usage
   - Network requests
3. **Environment:**
   - Browser version
   - Network conditions
   - Device specs (if relevant)
4. **Screenshots:**
   - Chrome DevTools Performance timeline
   - React DevTools Profiler flamegraph
   - Console performance logs
5. **Reproduction Steps:**
   - Exact workflow steps
   - Input data
   - Expected vs actual performance

---

## Continuous Monitoring

### Production Monitoring

- Track performance metrics in production
- Set up alerts for performance degradation
- Monitor memory usage over time
- Track API response times

### Performance Budgets

- **Simple Window**: <2 seconds (must maintain)
- **Complex Facade**: <5 seconds (must maintain)
- **Batch (10)**: <20 seconds (must maintain)
- **Memory Increase**: <100MB per batch (must maintain)

---

## References

- [Chrome DevTools Performance Documentation](https://developer.chrome.com/docs/devtools/performance/)
- [React DevTools Profiler Documentation](https://react.dev/learn/react-developer-tools#profiler)
- [Web Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API)
- AICS-001 Section 7.5: Deterministic Replay Guarantee
