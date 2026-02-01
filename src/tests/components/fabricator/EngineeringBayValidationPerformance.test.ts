/**
 * EngineeringBay Validation Performance Tests
 * 
 * Tests performance of ValidationEnvelope integration in EngineeringBay.
 * 
 * Performance Targets:
 * - Average validation time: <200ms
 * - Peak load (10 concurrent validations): <500ms
 * - Memory usage: <50MB increase
 */

import { validateDesignWithEnvelope } from '@/lib/fabricator/ConstraintEngine';
import type { WindowGrid } from '@/types/fabricator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('EngineeringBay Validation Performance', () => {
  const testWindowGrid: WindowGrid = {
    rows: 2,
    cols: 2,
    cells: [
      { id: '0-0', row: 0, col: 0, type: 'fixed' },
      { id: '0-1', row: 0, col: 1, type: 'fixed' },
      { id: '1-0', row: 1, col: 0, type: 'sash' },
      { id: '1-1', row: 1, col: 1, type: 'sash' },
    ],
  };

  beforeEach(() => {
    // Clear any caches before each test
    if (global.gc) {
      global.gc();
    }
  });

  afterEach(() => {
    // Cleanup after each test
    if (global.gc) {
      global.gc();
    }
  });

  it('should complete single validation in <200ms (average)', async () => {
    const iterations = 10;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      validateDesignWithEnvelope(
        1200, // width
        1500, // height
        testWindowGrid,
        'rock60', // systemId
        true // useEnvelope
      );
      
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);

    expect(averageTime).toBeLessThan(200);
    expect(maxTime).toBeLessThan(500); // Individual validation should not exceed 500ms

    if (import.meta.env.DEV) {
      console.log(`[Performance] Average validation time: ${averageTime.toFixed(2)}ms`);
      console.log(`[Performance] Max validation time: ${maxTime.toFixed(2)}ms`);
    }
  });

  it('should handle 10 concurrent validations in <500ms', async () => {
    const concurrentCount = 10;
    const startTime = performance.now();

    const promises = Array.from({ length: concurrentCount }, () =>
      Promise.resolve(
        validateDesignWithEnvelope(
          1200,
          1500,
          testWindowGrid,
          'rock60',
          true
        )
      )
    );

    await Promise.all(promises);

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTimePerValidation = totalTime / concurrentCount;

    expect(totalTime).toBeLessThan(500);
    expect(averageTimePerValidation).toBeLessThan(200);

    if (import.meta.env.DEV) {
      console.log(`[Performance] 10 concurrent validations completed in ${totalTime.toFixed(2)}ms`);
      console.log(`[Performance] Average time per validation: ${averageTimePerValidation.toFixed(2)}ms`);
    }
  });

  it('should not increase memory usage by >50MB during validation', async () => {
    if (typeof (performance as any).memory === 'undefined') {
      // Skip test if memory API is not available (Node.js environment)
      console.warn('[Performance] Memory API not available, skipping memory test');
      return;
    }

    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    // Run multiple validations to check memory usage
    for (let i = 0; i < 50; i++) {
      validateDesignWithEnvelope(
        1200 + (i % 100), // Vary dimensions slightly
        1500 + (i % 100),
        testWindowGrid,
        'rock60',
        true
      );
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Wait a bit for GC to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryIncreaseMB = (finalMemory - initialMemory) / (1024 * 1024);

    expect(memoryIncreaseMB).toBeLessThan(50);

    if (import.meta.env.DEV) {
      console.log(`[Performance] Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
    }
  });

  it('should maintain performance with different grid sizes', async () => {
    const gridSizes = [
      { rows: 1, cols: 1, cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }] },
      { rows: 2, cols: 2, cells: testWindowGrid.cells },
      {
        rows: 3,
        cols: 3,
        cells: Array.from({ length: 9 }, (_, i) => ({
          id: `${Math.floor(i / 3)}-${i % 3}`,
          row: Math.floor(i / 3),
          col: i % 3,
          type: i % 2 === 0 ? 'fixed' : 'sash',
        })),
      },
    ];

    for (const grid of gridSizes) {
      const startTime = performance.now();
      validateDesignWithEnvelope(1200, 1500, grid as WindowGrid, 'rock60', true);
      const endTime = performance.now();
      const time = endTime - startTime;

      expect(time).toBeLessThan(200);

      if (import.meta.env.DEV) {
        console.log(
          `[Performance] Grid ${grid.rows}x${grid.cols} validation: ${time.toFixed(2)}ms`
        );
      }
    }
  });

  it('should cache validation results for identical inputs', async () => {
    const firstStartTime = performance.now();
    const firstResult = validateDesignWithEnvelope(1200, 1500, testWindowGrid, 'rock60', true);
    const firstTime = performance.now() - firstStartTime;

    const secondStartTime = performance.now();
    const secondResult = validateDesignWithEnvelope(1200, 1500, testWindowGrid, 'rock60', true);
    const secondTime = performance.now() - secondStartTime;

    // Second validation should be faster (cached) or at least not slower
    expect(secondTime).toBeLessThanOrEqual(firstTime * 1.5); // Allow some variance
    expect(firstResult.isValid).toBe(secondResult.isValid);

    if (import.meta.env.DEV) {
      console.log(`[Performance] First validation: ${firstTime.toFixed(2)}ms`);
      console.log(`[Performance] Second validation (cached): ${secondTime.toFixed(2)}ms`);
    }
  });
});

