/**
 * Audit Trail Integration Performance Tests
 * 
 * Tests performance of audit trail recording through AICSIntegrationService.
 * 
 * Performance Targets:
 * - Average audit recording time: <100ms
 * - Peak load (50 concurrent recordings): <1000ms
 * - Memory usage: <20MB increase
 */

import { getAICSIntegrationService } from '@/core/authority/certification';
import { validateDesignWithEnvelope } from '@/lib/fabricator/ConstraintEngine';
import type { WindowGrid } from '@/types/fabricator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('Audit Trail Integration Performance Tests', () => {
  const integrationService = getAICSIntegrationService();
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
    // Clear any caches
    if (global.gc) {
      global.gc();
    }
  });

  afterEach(() => {
    // Cleanup
    if (global.gc) {
      global.gc();
    }
  });

  it('should complete single audit recording in <100ms (average)', async () => {
    const validationResult = validateDesignWithEnvelope(1200, 1500, testWindowGrid, 'rock60', true);
    
    expect(validationResult.envelopeResult).toBeDefined();
    
    if (!validationResult.envelopeResult) {
      return; // Skip if no envelope result
    }

    const iterations = 10;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      const result = await integrationService.recordDesignValidationAuditWithPerformance({
        who: 'test-user',
        what: `Design validation test ${i}`,
        decision: validationResult.isValid ? 'Design validated' : 'Design validation failed',
        why: 'Performance test',
        mode: 'certified',
        validationEnvelopeResult: validationResult.envelopeResult,
        designContext: { width: 1200, height: 1500, grid: testWindowGrid },
      });
      
      const endTime = performance.now();
      times.push(endTime - startTime);
      
      expect(result.anchorId).toBeDefined();
      expect(result.performanceMs).toBeGreaterThan(0);
    }

    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);

    expect(averageTime).toBeLessThan(100);
    expect(maxTime).toBeLessThan(500); // Individual recording should not exceed 500ms

    if (import.meta.env.DEV) {
      console.log(`[Performance] Average audit recording time: ${averageTime.toFixed(2)}ms`);
      console.log(`[Performance] Max audit recording time: ${maxTime.toFixed(2)}ms`);
    }
  }, 30000);

  it('should handle 50 concurrent audit recordings in <1000ms', async () => {
    const validationResult = validateDesignWithEnvelope(1200, 1500, testWindowGrid, 'rock60', true);
    
    if (!validationResult.envelopeResult) {
      return; // Skip if no envelope result
    }

    const concurrentCount = 50;
    const startTime = performance.now();

    const promises = Array.from({ length: concurrentCount }, (_, i) =>
      integrationService.recordDesignValidationAuditWithPerformance({
        who: 'test-user',
        what: `Concurrent audit recording ${i}`,
        decision: 'Design validated',
        why: 'Concurrent performance test',
        mode: 'certified',
        validationEnvelopeResult: validationResult.envelopeResult!,
        designContext: { width: 1200, height: 1500, grid: testWindowGrid },
      })
    );

    const results = await Promise.all(promises);

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTimePerRecording = totalTime / concurrentCount;

    expect(totalTime).toBeLessThan(1000);
    expect(averageTimePerRecording).toBeLessThan(100);

    // Verify all results are valid
    results.forEach(result => {
      expect(result.anchorId).toBeDefined();
      expect(result.performanceMs).toBeGreaterThan(0);
    });

    if (import.meta.env.DEV) {
      console.log(`[Performance] 50 concurrent audit recordings completed in ${totalTime.toFixed(2)}ms`);
      console.log(`[Performance] Average time per recording: ${averageTimePerRecording.toFixed(2)}ms`);
    }
  }, 30000);

  it('should not increase memory usage by >20MB during audit recording', async () => {
    if (typeof (performance as any).memory === 'undefined') {
      console.warn('[Performance] Memory API not available, skipping memory test');
      return;
    }

    const validationResult = validateDesignWithEnvelope(1200, 1500, testWindowGrid, 'rock60', true);
    
    if (!validationResult.envelopeResult) {
      return; // Skip if no envelope result
    }

    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    // Run multiple audit recordings
    for (let i = 0; i < 100; i++) {
      await integrationService.recordDesignValidationAuditWithPerformance({
        who: 'test-user',
        what: `Memory test recording ${i}`,
        decision: 'Design validated',
        why: 'Memory test',
        mode: 'certified',
        validationEnvelopeResult: validationResult.envelopeResult,
        designContext: { width: 1200, height: 1500, grid: testWindowGrid },
      });
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Wait for GC
    await new Promise(resolve => setTimeout(resolve, 200));

    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryIncreaseMB = (finalMemory - initialMemory) / (1024 * 1024);

    expect(memoryIncreaseMB).toBeLessThan(20);

    if (import.meta.env.DEV) {
      console.log(`[Performance] Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
    }
  }, 30000);

  it('should cache audit recordings to prevent duplicates', async () => {
    const validationResult = validateDesignWithEnvelope(1200, 1500, testWindowGrid, 'rock60', true);
    
    if (!validationResult.envelopeResult) {
      return; // Skip if no envelope result
    }

    const context = {
      who: 'test-user',
      what: 'Duplicate prevention test',
      decision: 'Design validated',
      why: 'Cache test',
      mode: 'certified' as const,
      validationEnvelopeResult: validationResult.envelopeResult,
      designContext: { width: 1200, height: 1500, grid: testWindowGrid },
    };

    const firstResult = await integrationService.recordDesignValidationAuditWithPerformance(context);
    
    // Immediate second call should be cached
    const secondResult = await integrationService.recordDesignValidationAuditWithPerformance(context);

    expect(secondResult.cached).toBe(true);
    expect(secondResult.performanceMs).toBeLessThan(firstResult.performanceMs);
    expect(secondResult.anchorId).toBe(firstResult.anchorId);
  }, 30000);
});

