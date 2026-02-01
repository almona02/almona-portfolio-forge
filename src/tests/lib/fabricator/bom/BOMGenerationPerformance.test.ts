/**
 * BOM Generation Performance Tests
 * 
 * Tests performance of BOM generation with DeterministicReplayEngine integration.
 * 
 * Performance Targets:
 * - Average BOM generation time: <500ms
 * - Peak load (10 concurrent generations): <2000ms
 * - Memory usage: <100MB increase
 */

import { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { SystemPack as DataSystemPack } from '@/data/systemPacks';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { PresetAwareBOMGenerator } from '@/lib/fabricator/PresetAwareBOMGenerator';
import type { SystemPack, WindowUnit } from '@/types/fabricator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * Create a test window unit
 */
function createTestWindowUnit(): WindowUnit {
  return {
    id: 'test-window-1',
    orderNumber: 'TEST-001',
    posNumber: 'POS-001',
    type: 'window',
    color: 'white',
    glazing: { type: 'double', thickness: 24 },
    overallWidth: 1200,
    overallHeight: 1500,
    grid: {
      rows: 2,
      cols: 2,
      cells: [
        { id: '0-0', row: 0, col: 0, type: 'fixed' },
        { id: '0-1', row: 0, col: 1, type: 'fixed' },
        { id: '1-0', row: 1, col: 0, type: 'sash' },
        { id: '1-1', row: 1, col: 1, type: 'sash' },
      ],
    },
    components: [],
    hardware: [],
    status: 'design',
    optimization: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    systemPackId: 'rock60',
  } as WindowUnit;
}

/**
 * Create a test pattern
 */
function createTestPattern(): EgyptianPattern {
  // Use a simple pattern from the patterns array
  // For testing, we'll create a minimal pattern structure
  return {
    id: 'test-pattern-1',
    name: 'Test Pattern',
    type: 'casement',
    layout: 'Test pattern layout',
    gridSpec: {
      rows: 2,
      cols: 2,
      cells: [
        { row: 0, col: 0, type: 'fixed' },
        { row: 0, col: 1, type: 'fixed' },
        { row: 1, col: 0, type: 'sash' },
        { row: 1, col: 1, type: 'sash' },
      ],
    },
    typicalWidthMm: [1200, 1500],
    typicalHeightMm: [1500, 2000],
    compatibleSystems: ['rock60'],
  } as EgyptianPattern;
}

describe('BOM Generation Performance Tests', () => {
  let bomGenerator: PresetAwareBOMGenerator;
  let testWindowUnit: WindowUnit;
  let testPattern: EgyptianPattern;
  let testSystemPack: SystemPack;

  beforeEach(() => {
    bomGenerator = new PresetAwareBOMGenerator();
    testWindowUnit = createTestWindowUnit();
    testPattern = createTestPattern();
    const dataSystemPack: DataSystemPack = SYSTEM_PACKS.find(p => p.meta.id === 'rock60') || SYSTEM_PACKS[0];
    // Convert data/systemPacks SystemPack to types/fabricator SystemPack
    testSystemPack = {
      id: dataSystemPack.meta.id,
      name: dataSystemPack.meta.name,
      category: 'aluminum_windows',
      brand: dataSystemPack.meta.brands[0] || 'Unknown',
      compatibleProfiles: dataSystemPack.profiles?.map(p => p.id) || [],
      compatibleAccessories: [],
      description: dataSystemPack.meta.name,
      technicalData: dataSystemPack.windowSystemSpec || {},
    } as SystemPack;
  });

  afterEach(() => {
    // Cleanup
    if (global.gc) {
      global.gc();
    }
  });

  it('should complete single BOM generation in <500ms (average)', async () => {
    const iterations = 5;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      const result = await bomGenerator.generateCompleteBOMWithPerformance(
        testWindowUnit,
        testPattern,
        testSystemPack,
        false // Disable cache for accurate timing
      );
      
      const endTime = performance.now();
      times.push(endTime - startTime);
      
      expect(result.bom).toBeDefined();
      expect(result.performanceMs).toBeGreaterThan(0);
    }

    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);

    expect(averageTime).toBeLessThan(500);
    expect(maxTime).toBeLessThan(2000); // Individual generation should not exceed 2s

    if (import.meta.env.DEV) {
      console.log(`[Performance] Average BOM generation time: ${averageTime.toFixed(2)}ms`);
      console.log(`[Performance] Max BOM generation time: ${maxTime.toFixed(2)}ms`);
    }
  }, 30000); // Increase timeout for async operations

  it('should handle 10 concurrent BOM generations in <2000ms', async () => {
    const concurrentCount = 10;
    const startTime = performance.now();

    const promises = Array.from({ length: concurrentCount }, () =>
      bomGenerator.generateCompleteBOMWithPerformance(
        testWindowUnit,
        testPattern,
        testSystemPack,
        false // Disable cache
      )
    );

    const results = await Promise.all(promises);

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTimePerGeneration = totalTime / concurrentCount;

    expect(totalTime).toBeLessThan(2000);
    expect(averageTimePerGeneration).toBeLessThan(500);

    // Verify all results are valid
    results.forEach(result => {
      expect(result.bom).toBeDefined();
      expect(result.bom.replayMetadata).toBeDefined();
    });

    if (import.meta.env.DEV) {
      console.log(`[Performance] 10 concurrent BOM generations completed in ${totalTime.toFixed(2)}ms`);
      console.log(`[Performance] Average time per generation: ${averageTimePerGeneration.toFixed(2)}ms`);
    }
  }, 30000);

  it('should not increase memory usage by >100MB during BOM generation', async () => {
    if (typeof (performance as any).memory === 'undefined') {
      console.warn('[Performance] Memory API not available, skipping memory test');
      return;
    }

    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    // Run multiple BOM generations
    for (let i = 0; i < 20; i++) {
      await bomGenerator.generateCompleteBOMWithPerformance(
        { ...testWindowUnit, id: `test-window-${i}` },
        testPattern,
        testSystemPack,
        false // Disable cache
      );
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Wait for GC
    await new Promise(resolve => setTimeout(resolve, 200));

    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryIncreaseMB = (finalMemory - initialMemory) / (1024 * 1024);

    expect(memoryIncreaseMB).toBeLessThan(100);

    if (import.meta.env.DEV) {
      console.log(`[Performance] Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
    }
  }, 30000);

  it('should cache BOM results for identical inputs', async () => {
    const firstResult = await bomGenerator.generateCompleteBOMWithPerformance(
      testWindowUnit,
      testPattern,
      testSystemPack,
      true // Enable cache
    );

    const secondResult = await bomGenerator.generateCompleteBOMWithPerformance(
      testWindowUnit,
      testPattern,
      testSystemPack,
      true // Enable cache
    );

    // Second generation should be faster (cached)
    expect(secondResult.performanceMs).toBeLessThan(firstResult.performanceMs * 0.5);
    expect(secondResult.cached).toBe(true);
    
    // Results should be identical
    expect(firstResult.bom.metadata.patternUsed).toBe(secondResult.bom.metadata.patternUsed);
    expect(firstResult.bom.metadata.systemPackUsed).toBe(secondResult.bom.metadata.systemPackUsed);

    if (import.meta.env.DEV) {
      console.log(`[Performance] First generation: ${firstResult.performanceMs.toFixed(2)}ms`);
      console.log(`[Performance] Second generation (cached): ${secondResult.performanceMs.toFixed(2)}ms`);
    }
  }, 30000);

  it('should include replay metadata with performance tracking', async () => {
    const result = await bomGenerator.generateCompleteBOMWithPerformance(
      testWindowUnit,
      testPattern,
      testSystemPack,
      false
    );

    expect(result.bom.replayMetadata).toBeDefined();
    expect(result.bom.replayMetadata?.inputHash).toBeDefined();
    expect(result.bom.replayMetadata?.resultSignature).toBeDefined();
    expect(result.bom.replayMetadata?.truthVersions).toBeDefined();
    expect(result.bom.replayMetadata?.computationId).toBeDefined();
    
    // Performance metrics should be tracked
    expect(result.performanceMs).toBeGreaterThan(0);
    expect(result.performanceMs).toBeLessThan(500);
    expect(typeof result.cached).toBe('boolean');
  }, 30000);
});

