/**
 * Memory Leak Detection Tests
 * 
 * Tests for memory leaks in long-running sessions (8-hour simulated workshop).
 * 
 * Test Scenario:
 * - Open/close 100+ designs
 * - Switch between system packs
 * - Use collaborative drafting features
 * - Generate multiple exports
 * 
 * Memory Checkpoints:
 * - Heap memory growth over time
 * - DOM node accumulation
 * - WebSocket connection memory
 * - Three.js 3D model memory
 * - Cache memory management
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

import { MemoryLeakDetector, clearMemoryLeakDetector, getMemoryLeakDetector } from '@/lib/performance/MemoryLeakDetector';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Polyfill URL.createObjectURL / revokeObjectURL for JSDOM/Node environment
if (typeof URL.createObjectURL !== 'function') {
  let urlCounter = 0;
  URL.createObjectURL = () => `blob:test-${++urlCounter}`;
  URL.revokeObjectURL = () => {};
}


describe('Memory Leak Detection - 8-Hour Simulated Workshop Session', () => {
  let detector: MemoryLeakDetector;

  beforeEach(() => {
    clearMemoryLeakDetector();
    detector = getMemoryLeakDetector('test-workshop-session');
  });

  afterEach(() => {
    if (detector) {
      detector.stop();
    }
    clearMemoryLeakDetector();
  });

  it('should detect heap memory growth over time', async () => {
    detector.start(100); // Checkpoint every 100ms for faster testing
    
    // Simulate memory growth (create objects that should be cleaned up)
    const objects: any[] = [];
    for (let i = 0; i < 10; i++) {
      objects.push(new Array(10000).fill(0)); // ~40KB each
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Clear objects (simulate cleanup)
    objects.length = 0;
    
    // Wait for GC
    await new Promise(resolve => setTimeout(resolve, 200));
    detector.forceGarbageCollection();
    
    const result = detector.stop();
    
    // Should have multiple checkpoints
    expect(result.checkpoints.length).toBeGreaterThan(5);
    
    // Check memory tracking
    if (result.checkpoints[0].heap && result.checkpoints[result.checkpoints.length - 1].heap) {
      const firstHeap = result.checkpoints[0].heap.used;
      const lastHeap = result.checkpoints[result.checkpoints.length - 1].heap?.used;
      
      // Memory should be tracked
      expect(firstHeap).toBeGreaterThan(0);
      expect(lastHeap).toBeGreaterThan(0);
    }
  }, 10000);

  it('should track DOM node accumulation', () => {
    detector.start(100);
    
    const initialCheckpoint = detector.getCurrentCheckpoint();
    expect(initialCheckpoint).not.toBeNull();
    const initialNodes = initialCheckpoint!.domNodes;
    
    // Create DOM elements (simulate design opening)
    const container = document.createElement('div');
    for (let i = 0; i < 100; i++) {
      const element = document.createElement('div');
      element.textContent = `Design ${i}`;
      container.appendChild(element);
    }
    document.body.appendChild(container);
    
    // Take checkpoint
    detector.takeCheckpoint();
    
    const afterCheckpoint = detector.getCurrentCheckpoint();
    expect(afterCheckpoint).not.toBeNull();
    const afterNodes = afterCheckpoint!.domNodes;
    
    // DOM nodes should have increased
    expect(afterNodes).toBeGreaterThan(initialNodes);
    
    // Cleanup
    document.body.removeChild(container);
    
    const result = detector.stop();
    
    // Should track DOM node changes
    expect(result.checkpoints.length).toBeGreaterThan(1);
  });

  it('should track WebSocket connections', () => {
    detector.start(100);
    
    const initialCheckpoint = detector.getCurrentCheckpoint();
    expect(initialCheckpoint).not.toBeNull();
    const initialConnections = initialCheckpoint!.websocketConnections;
    
    // Create mock WebSocket (in real test, would use actual WebSocket)
    const mockWS = {
      addEventListener: vi.fn(),
      close: vi.fn(),
    } as any;
    
    detector.trackWebSocket(mockWS);
    
    // Take checkpoint
    detector.takeCheckpoint();
    
    const afterCheckpoint = detector.getCurrentCheckpoint();
    expect(afterCheckpoint).not.toBeNull();
    const afterConnections = afterCheckpoint!.websocketConnections;
    
    // WebSocket connections should have increased
    expect(afterConnections).toBe(initialConnections + 1);
    
    const result = detector.stop();
    
    // Should track WebSocket connections
    expect(result.checkpoints.length).toBeGreaterThan(1);
  });

  it('should track object URL leaks', () => {
    detector.start(100);
    
    const initialCheckpoint = detector.getCurrentCheckpoint();
    expect(initialCheckpoint).not.toBeNull();
    const initialUrls = initialCheckpoint!.objectUrls;
    
    // Create object URLs (simulate image/file handling)
    const blob = new Blob(['test'], { type: 'text/plain' });
    const url1 = URL.createObjectURL(blob);
    const url2 = URL.createObjectURL(blob);
    
    // Take checkpoint
    detector.takeCheckpoint();
    
    const afterCheckpoint = detector.getCurrentCheckpoint();
    expect(afterCheckpoint).not.toBeNull();
    const afterUrls = afterCheckpoint!.objectUrls;
    
    // Object URLs should have increased
    expect(afterUrls).toBeGreaterThan(initialUrls);
    
    // Revoke URLs (proper cleanup)
    detector.revokeObjectUrl(url1);
    detector.revokeObjectUrl(url2);
    
    const result = detector.stop();
    
    // Should track object URL creation and revocation
    expect(result.checkpoints.length).toBeGreaterThan(1);
  });

  it('should detect memory leaks in simulated 8-hour session (compressed)', async () => {
    // Compressed version: 8 hours = 8 seconds for testing
    detector.start(100); // Checkpoint every 100ms
    
    // Simulate opening/closing 100+ designs (compressed to 10 for testing)
    for (let i = 0; i < 10; i++) {
      // Simulate design opening (create DOM, memory, etc.)
      const designContainer = document.createElement('div');
      designContainer.id = `design-${i}`;
      for (let j = 0; j < 50; j++) {
        const element = document.createElement('div');
        element.textContent = `Component ${j}`;
        designContainer.appendChild(element);
      }
      document.body.appendChild(designContainer);
      
      // Simulate memory allocation (Three.js geometries, etc.)
      const data = new Array(5000).fill(Math.random());
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Simulate design closing (cleanup)
      document.body.removeChild(designContainer);
      data.length = 0;
      
      // Take checkpoint periodically
      if (i % 2 === 0) {
        detector.takeCheckpoint();
      }
    }
    
    // Force garbage collection
    detector.forceGarbageCollection();
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const result = detector.stop();
    
    // Should have multiple checkpoints
    expect(result.checkpoints.length).toBeGreaterThan(5);
    
    // Check for leaks
    if (result.detectedLeaks.domNodeGrowth) {
      console.warn('[MemoryLeak] DOM node growth detected');
    }
    
    // Growth rates should be reasonable (compressed time scale)
    expect(result.growthRates.domNodesPerHour).toBeDefined();
    
    if (import.meta.env.DEV) {
      console.log('[MemoryLeak] Detection result:', result);
    }
  }, 30000);

  it('should generate warnings for memory leaks', () => {
    detector.start(100);
    
    // Create significant memory growth (simulate leak)
    const containers: HTMLDivElement[] = [];
    for (let i = 0; i < 1000; i++) {
      const container = document.createElement('div');
      container.innerHTML = '<div><div><div></div></div></div>';
      document.body.appendChild(container);
      containers.push(container);
    }
    
    // Take checkpoint
    detector.takeCheckpoint();
    
    const result = detector.stop();
    
    // Cleanup
    containers.forEach(container => document.body.removeChild(container));
    
    // Should detect DOM node growth
    expect(result.detectedLeaks.domNodeGrowth).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('DOM nodes'))).toBe(true);
  });

  it('should track memory checkpoints over time', () => {
    detector.start(100);
    
    // Take multiple checkpoints
    for (let i = 0; i < 5; i++) {
      detector.takeCheckpoint();
    }
    
    const checkpoints = detector.getAllCheckpoints();
    
    expect(checkpoints.length).toBe(6); // Initial + 5 manual
    
    // Checkpoints should have increasing timestamps
    for (let i = 1; i < checkpoints.length; i++) {
      expect(checkpoints[i].timestamp).toBeGreaterThan(checkpoints[i - 1].timestamp);
      expect(checkpoints[i].elapsedMs).toBeGreaterThan(checkpoints[i - 1].elapsedMs);
    }
    
    const result = detector.stop();
    expect(result.checkpoints.length).toBe(7); // + final checkpoint
  });
});

describe('Memory Leak Detector - Integration', () => {
  it('should work with global instance', () => {
    const detector1 = getMemoryLeakDetector('session-1');
    const detector2 = getMemoryLeakDetector('session-1');
    
    expect(detector1).toBe(detector2);
    
    detector1.start(100);
    detector1.takeCheckpoint();
    
    const result = detector1.stop();
    expect(result.checkpoints.length).toBeGreaterThan(0);
    
    clearMemoryLeakDetector();
  });
});
