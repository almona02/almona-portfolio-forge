# Memory Leak Detection Guide

Complete guide for detecting memory leaks in long-running ALMONA sessions.

**Status:** Production-Ready  
**Last Updated:** January 2026  
**Test Scenario:** 8-hour simulated workshop session

---

## Overview

This guide covers memory leak detection for long-running workshop sessions:
- Open/close 100+ designs
- Switch between system packs
- Use collaborative drafting features
- Generate multiple exports

---

## Memory Checkpoints

### 1. Heap Memory Growth

**What to Monitor:**
- JavaScript heap memory usage over time
- Memory growth rate (MB/hour)
- Garbage collection frequency

**Tools:**
- Chrome DevTools Memory tab (heap snapshots)
- Performance Monitor (Memory timeline)
- `MemoryLeakDetector` utility

**Targets:**
- Heap growth: <10MB/hour
- Maximum growth over 8 hours: <80MB
- GC should run regularly (every few minutes)

### 2. DOM Node Accumulation

**What to Monitor:**
- Total DOM nodes in document
- Node count growth over time
- Unmounted component nodes

**Tools:**
- Chrome DevTools Memory tab (DOM nodes)
- React DevTools (component tree)
- `MemoryLeakDetector.domNodes`

**Targets:**
- DOM growth: <100 nodes/hour
- Maximum growth over 8 hours: <800 nodes
- Nodes should decrease when designs are closed

### 3. WebSocket Connection Memory

**What to Monitor:**
- Active WebSocket connections
- Connection cleanup on close
- Message buffer accumulation

**Tools:**
- Chrome DevTools Network tab (WS connections)
- `MemoryLeakDetector.websocketConnections`
- Manual tracking in code

**Targets:**
- No more than 1-2 active connections
- Connections should close when components unmount
- No message buffer accumulation

### 4. Three.js 3D Model Memory

**What to Monitor:**
- Geometry count and memory
- Material count and memory
- Texture count and memory
- Scene cleanup

**Tools:**
- `MemoryMonitor` (Three.js integration)
- Chrome DevTools Memory tab (filter by THREE)
- `MemoryLeakDetector.threejsMemory`

**Targets:**
- Geometries should be disposed when scenes are cleared
- Materials should be disposed when no longer used
- Textures should be disposed when scenes change
- No orphaned scenes

### 5. Cache Memory Management

**What to Monitor:**
- Cache sizes (BOM, geometry, images)
- Cache eviction policies
- Cache hit rates

**Tools:**
- Custom cache statistics
- `MemoryLeakDetector.cacheSizes`
- Chrome DevTools Memory tab

**Targets:**
- Caches should have size limits
- LRU eviction should work correctly
- Cache sizes should stabilize over time

---

## Tools & Setup

### 1. Chrome DevTools Memory Tab (Heap Snapshots)

**Steps:**
1. Open Chrome DevTools (F12)
2. Go to **Memory** tab
3. Select **Heap snapshot** profiling type
4. Click **Take snapshot** (circle icon)
5. Perform action (open design, close design, etc.)
6. Click **Take snapshot** again
7. Compare snapshots using **Comparison** view

**Key Areas to Check:**
- **Size Delta**: Memory increase between snapshots
- **Retained Size**: Memory that would be freed if object is deleted
- **Object Count**: Number of objects of each type

**Filtering:**
- Filter by constructor name (e.g., `THREE.BufferGeometry`, `Image`, `WebSocket`)
- Look for objects that shouldn't exist (orphaned geometries, unclosed WebSockets)

**Comparison View:**
- Shows objects added/removed between snapshots
- Look for objects that should have been cleaned up
- Check for growing object counts

### 2. Performance Monitor for Memory Trends

**Steps:**
1. Open Chrome DevTools (F12)
2. Go to **Performance** tab
3. Check **Memory** checkbox
4. Click **Record** (circle icon)
5. Perform long-running session (or compressed simulation)
6. Click **Stop**
7. Review memory timeline

**Key Metrics:**
- **JS Heap**: JavaScript heap memory usage over time
- **Documents**: DOM node count over time
- **Nodes**: Total DOM nodes over time
- **Listeners**: Event listener count over time

**Analysis:**
- Look for steadily increasing trends (leaks)
- Look for sawtooth patterns (GC working correctly)
- Identify memory spikes (potential issues)

### 3. React DevTools for Component Memory

**Steps:**
1. Install React DevTools browser extension
2. Open DevTools → **Components** tab
3. Select component in tree
4. Check **Rendered by** and **Rendering frequency**
5. Use **Profiler** tab for memory analysis

**Key Checks:**
- Components that should unmount but don't
- Components with high render frequency
- Components with large props/state

**Memory Analysis:**
- Use Profiler to identify components using memory
- Check for components that should be memoized
- Verify cleanup functions are called

### 4. Manual Garbage Collection Triggers

**Chrome:**
1. Open Chrome with `--js-flags="--expose-gc"` flag
2. Or use Chrome DevTools → Console
3. Run `window.gc()` to trigger garbage collection

**Usage in Code:**
```typescript
import { getMemoryLeakDetector } from '@/lib/performance/MemoryLeakDetector';

const detector = getMemoryLeakDetector();
detector.forceGarbageCollection();
```

**When to Use:**
- Before taking heap snapshots (for accurate comparison)
- After cleanup operations (to verify memory is freed)
- During memory leak testing (to isolate leaks)

---

## Focus Areas

### 1. Three.js Scene Cleanup (dispose() calls)

**Critical Points:**
- Geometries must be disposed: `geometry.dispose()`
- Materials must be disposed: `material.dispose()`
- Textures must be disposed: `texture.dispose()`
- Scenes should be cleared: `scene.clear()`

**Code Pattern:**
```typescript
useEffect(() => {
  // Setup Three.js scene
  
  return () => {
    // Cleanup
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose());
        } else {
          object.material?.dispose();
        }
      }
    });
    scene.clear();
  };
}, []);
```

**Verification:**
- Check heap snapshots for THREE.* objects
- Verify object counts decrease after cleanup
- Use `MemoryMonitor.disposeObject()` helper

### 2. React Component Unmount Cleanup

**Critical Points:**
- Event listeners must be removed
- Timers/intervals must be cleared
- Subscriptions must be unsubscribed
- Object URLs must be revoked

**Code Pattern:**
```typescript
useEffect(() => {
  const handleResize = () => { /* ... */ };
  window.addEventListener('resize', handleResize);
  
  const timer = setInterval(() => { /* ... */ }, 1000);
  
  const subscription = observable.subscribe(/* ... */);
  
  const objectUrl = URL.createObjectURL(blob);
  
  return () => {
    // Cleanup
    window.removeEventListener('resize', handleResize);
    clearInterval(timer);
    subscription.unsubscribe();
    URL.revokeObjectURL(objectUrl);
  };
}, []);
```

**Verification:**
- Use React DevTools to verify components unmount
- Check event listener count in Performance Monitor
- Verify object URLs are revoked

### 3. WebSocket Message Accumulation

**Critical Points:**
- WebSocket connections must be closed
- Message handlers must be removed
- Reconnect timers must be cleared
- Message buffers should be limited

**Code Pattern:**
```typescript
useEffect(() => {
  const ws = new WebSocket(url);
  
  ws.onmessage = (event) => {
    // Handle message (keep handler simple, avoid closures)
  };
  
  return () => {
    ws.close();
    ws.onmessage = null; // Clear handler
  };
}, []);
```

**Verification:**
- Check Network tab for WebSocket connections
- Use `MemoryLeakDetector.trackWebSocket()`
- Verify connections close when components unmount

### 4. Image/DXF File Memory Retention

**Critical Points:**
- Object URLs must be revoked: `URL.revokeObjectURL(url)`
- Image elements should be cleared
- Canvas contexts should be released
- Blob references should be cleared

**Code Pattern:**
```typescript
useEffect(() => {
  const objectUrl = URL.createObjectURL(blob);
  const img = new Image();
  
  img.onload = () => {
    // Use image
  };
  img.src = objectUrl;
  
  return () => {
    URL.revokeObjectURL(objectUrl);
    img.src = ''; // Clear image source
  };
}, []);
```

**Verification:**
- Use `MemoryLeakDetector.trackObjectUrl()`
- Check heap snapshots for Image/Canvas objects
- Verify object URL count doesn't grow

---

## Running Memory Leak Tests

### Automated Tests

```bash
# Run memory leak detection tests
npm run test src/tests/e2e/MemoryLeakDetection.test.ts

# Run with verbose output
npm run test -- --reporter=verbose src/tests/e2e/MemoryLeakDetection.test.ts
```

### Manual Testing (8-Hour Simulation)

**Compressed Version (for testing):**
- 8 hours → 8 seconds (1000x compression)
- 100 designs → 10 designs
- Checkpoints every 100ms

**Full Version (for production):**
- Use `MemoryLeakDetector` with 1-minute intervals
- Run for actual 8-hour session
- Monitor in production environment

**Manual Testing Checklist:**
- [ ] Start memory leak detector
- [ ] Open 10+ designs sequentially
- [ ] Close designs and verify cleanup
- [ ] Switch system packs multiple times
- [ ] Use collaborative drafting features
- [ ] Generate multiple exports (DXF, G-code)
- [ ] Stop detector and review report
- [ ] Check for detected leaks
- [ ] Verify growth rates are within targets

---

## Memory Leak Detection Results

### Interpreting Results

**Heap Growth:**
- <10MB/hour: ✅ Acceptable
- 10-50MB/hour: ⚠️ Warning (investigate)
- >50MB/hour: ❌ Leak detected

**DOM Node Growth:**
- <100 nodes/hour: ✅ Acceptable
- 100-500 nodes/hour: ⚠️ Warning (investigate)
- >500 nodes/hour: ❌ Leak detected

**Object URL Growth:**
- <5 URLs/hour: ✅ Acceptable
- 5-10 URLs/hour: ⚠️ Warning (investigate)
- >10 URLs/hour: ❌ Leak detected

### Common Leak Patterns

1. **Three.js Geometries Not Disposed:**
   - Symptom: Growing THREE.BufferGeometry objects
   - Fix: Call `geometry.dispose()` in cleanup

2. **Event Listeners Not Removed:**
   - Symptom: Growing event listener count
   - Fix: Remove listeners in useEffect cleanup

3. **Object URLs Not Revoked:**
   - Symptom: Growing object URL count
   - Fix: Call `URL.revokeObjectURL()` in cleanup

4. **WebSocket Connections Not Closed:**
   - Symptom: Multiple WebSocket connections
   - Fix: Call `ws.close()` in cleanup

5. **React Components Not Unmounting:**
   - Symptom: Growing component count
   - Fix: Check component lifecycle, remove from DOM

---

## Reporting Memory Leaks

When reporting memory leaks, include:

1. **Memory Leak Detection Report:**
   - Detected leaks
   - Growth rates
   - Warnings

2. **Heap Snapshots:**
   - Before/after comparison
   - Object count deltas
   - Retained size analysis

3. **Performance Timeline:**
   - Memory usage over time
   - GC frequency
   - Memory spikes

4. **Reproduction Steps:**
   - Exact actions performed
   - Number of designs opened/closed
   - System packs switched
   - Exports generated

5. **Environment:**
   - Browser version
   - Device specs
   - Session duration

---

## References

- [Chrome DevTools Memory Documentation](https://developer.chrome.com/docs/devtools/memory-problems/)
- [React DevTools Profiler Documentation](https://react.dev/learn/react-developer-tools#profiler)
- [Three.js Memory Management](https://threejs.org/docs/#manual/en/introduction/How-to-dispose-of-objects)
- [Web Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API)
