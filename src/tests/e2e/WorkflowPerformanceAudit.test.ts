/**
 * End-to-End Workflow Performance Audit Tests
 * 
 * Tests complete workflow performance from design to export.
 * 
 * Test Scenarios:
 * 1. Simple Window (1x1 grid, basic profile): Target <2 seconds
 * 2. Complex Facade (10x10 grid, mixed profiles): Target <5 seconds
 * 3. Batch Processing (10 designs sequentially): Target <20 seconds
 * 
 * Tools Integration:
 * - Chrome DevTools Performance API
 * - Custom timing markers
 * - Memory usage tracking
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

import { validateDesignWithEnvelope } from '@/lib/fabricator/ConstraintEngine';
import { PerformanceCheckpoint, WorkflowPerformanceAudit, clearPerformanceAudit, getPerformanceAudit } from '@/lib/performance/WorkflowPerformanceAudit';
import type { WindowGrid, WindowUnit } from '@/types/fabricator';
import { beforeEach, describe, expect, it } from 'vitest';

// Mock window unit for testing
function createTestWindowUnit(id: string, grid: WindowGrid): WindowUnit {
  return {
    id,
    type: 'casement',
    overallWidth: 1200,
    overallHeight: 1500,
    grid,
    systemPackId: 'rock60',
    glazing: {
      type: 'double',
      thickness: 6,
    },
  } as WindowUnit;
}



describe('Workflow Performance Audit - Simple Window (1x1)', () => {
  beforeEach(() => {
    clearPerformanceAudit();
  });

  it('should complete simple window workflow in <2 seconds', async () => {
    const workflowId = `simple-window-${Date.now()}`;
    const audit = getPerformanceAudit(workflowId);
    
    audit.startWorkflow();
    
    // Design Phase
    audit.mark(PerformanceCheckpoint.DESIGN_START);
    const grid: WindowGrid = {
      rows: 1,
      cols: 1,
      cells: [{
        id: 'cell-1',
        row: 0,
        col: 0,
        type: 'fixed',
      }],
    };
    const windowUnit = createTestWindowUnit('test-1', grid);
    audit.mark(PerformanceCheckpoint.DESIGN_COMPLETE);
    
    // Validation Phase
    audit.mark(PerformanceCheckpoint.VALIDATION_START);
    validateDesignWithEnvelope(
      windowUnit.overallWidth,
      windowUnit.overallHeight,
      grid,
      windowUnit.systemPackId || 'generic',
      true
    );
    audit.mark(PerformanceCheckpoint.VALIDATION_COMPLETE);
    
    // BOM Generation Phase (mock - full implementation would use actual BOM generator)
    audit.mark(PerformanceCheckpoint.BOM_START);
    // Simulate BOM generation delay
    await new Promise(resolve => setTimeout(resolve, 50));
    audit.mark(PerformanceCheckpoint.BOM_COMPLETE);
    
    // Optimization Phase (mock)
    audit.mark(PerformanceCheckpoint.OPTIMIZATION_START);
    await new Promise(resolve => setTimeout(resolve, 30));
    audit.mark(PerformanceCheckpoint.OPTIMIZATION_COMPLETE);
    
    // Export Phase (mock)
    audit.mark(PerformanceCheckpoint.EXPORT_START);
    await new Promise(resolve => setTimeout(resolve, 20));
    audit.mark(PerformanceCheckpoint.EXPORT_COMPLETE);
    
    // Audit Trail Phase (mock)
    audit.mark(PerformanceCheckpoint.AUDIT_START);
    await new Promise(resolve => setTimeout(resolve, 10));
    audit.mark(PerformanceCheckpoint.AUDIT_COMPLETE);
    
    const result = audit.completeWorkflow();
    
    // Assertions
    expect(result.totalDuration).toBeLessThan(2000); // <2 seconds
    expect(result.phaseDurations.validation).toBeLessThan(200); // Validation should be fast
    expect(result.phaseDurations.bom).toBeGreaterThan(0);
    expect(result.phaseDurations.optimization).toBeGreaterThan(0);
    expect(result.phaseDurations.export).toBeGreaterThan(0);
    
    if (import.meta.env.DEV) {
      console.log('[Performance] Simple Window Workflow:', result);
    }
  }, 5000);
});

describe('Workflow Performance Audit - Complex Facade (10x10)', () => {
  beforeEach(() => {
    clearPerformanceAudit();
  });

  it('should complete complex facade workflow in <5 seconds', async () => {
    const workflowId = `complex-facade-${Date.now()}`;
    const audit = getPerformanceAudit(workflowId);
    
    audit.startWorkflow();
    
    // Design Phase - Create 10x10 grid
    audit.mark(PerformanceCheckpoint.DESIGN_START);
    const cells: import('@/types/fabricator').GridCell[] = [];
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        cells.push({
          id: `cell-${row}-${col}`,
          row,
          col,
          type: (row + col) % 2 === 0 ? 'fixed' : 'sash',
        });
      }
    }
    const grid: WindowGrid = {
      rows: 10,
      cols: 10,
      cells,
    };
    const windowUnit = createTestWindowUnit('test-2', grid);
    audit.mark(PerformanceCheckpoint.DESIGN_COMPLETE);
    
    // Validation Phase
    audit.mark(PerformanceCheckpoint.VALIDATION_START);
    validateDesignWithEnvelope(
      windowUnit.overallWidth,
      windowUnit.overallHeight,
      grid,
      windowUnit.systemPackId || 'generic',
      true
    );
    audit.mark(PerformanceCheckpoint.VALIDATION_COMPLETE);
    
    // BOM Generation Phase (mock - full implementation would use actual BOM generator)
    audit.mark(PerformanceCheckpoint.BOM_START);
    await new Promise(resolve => setTimeout(resolve, 500));
    audit.mark(PerformanceCheckpoint.BOM_COMPLETE);
    
    // Optimization Phase (mock)
    audit.mark(PerformanceCheckpoint.OPTIMIZATION_START);
    await new Promise(resolve => setTimeout(resolve, 300));
    audit.mark(PerformanceCheckpoint.OPTIMIZATION_COMPLETE);
    
    // Export Phase (mock)
    audit.mark(PerformanceCheckpoint.EXPORT_START);
    await new Promise(resolve => setTimeout(resolve, 200));
    audit.mark(PerformanceCheckpoint.EXPORT_COMPLETE);
    
    // Audit Trail Phase (mock)
    audit.mark(PerformanceCheckpoint.AUDIT_START);
    await new Promise(resolve => setTimeout(resolve, 50));
    audit.mark(PerformanceCheckpoint.AUDIT_COMPLETE);
    
    const result = audit.completeWorkflow();
    
    // Assertions
    expect(result.totalDuration).toBeLessThan(5000); // <5 seconds
    expect(result.phaseDurations.validation).toBeLessThan(500); // Validation should still be reasonable
    expect(result.phaseDurations.bom).toBeGreaterThan(0);
    
    if (import.meta.env.DEV) {
      console.log('[Performance] Complex Facade Workflow:', result);
    }
  }, 10000);
});

describe('Workflow Performance Audit - Batch Processing', () => {
  beforeEach(() => {
    clearPerformanceAudit();
  });

  it('should complete 10 designs sequentially in <20 seconds', async () => {
    const workflowId = `batch-processing-${Date.now()}`;
    const audit = getPerformanceAudit(workflowId);
    
    audit.startWorkflow();
    
    const designs = Array.from({ length: 10 }, (_, i) => {
      const grid: WindowGrid = {
        rows: 2,
        cols: 2,
        cells: [
          { id: `cell-${i}-0`, row: 0, col: 0, type: 'fixed' },
          { id: `cell-${i}-1`, row: 0, col: 1, type: 'sash' },
          { id: `cell-${i}-2`, row: 1, col: 0, type: 'sash' },
          { id: `cell-${i}-3`, row: 1, col: 1, type: 'fixed' },
        ],
      };
      return createTestWindowUnit(`test-batch-${i}`, grid);
    });
    
    // Process each design sequentially
    for (let i = 0; i < designs.length; i++) {
      const design = designs[i];
      
      // Design Phase
      audit.mark(PerformanceCheckpoint.DESIGN_START, { designIndex: i });
      audit.mark(PerformanceCheckpoint.DESIGN_COMPLETE, { designIndex: i });
      
      // Validation Phase
      audit.mark(PerformanceCheckpoint.VALIDATION_START, { designIndex: i });
      validateDesignWithEnvelope(
        design.overallWidth,
        design.overallHeight,
        design.grid!,
        design.systemPackId || 'generic',
        true
      );
      audit.mark(PerformanceCheckpoint.VALIDATION_COMPLETE, { designIndex: i });
      
      // BOM Generation Phase (mock)
      audit.mark(PerformanceCheckpoint.BOM_START, { designIndex: i });
      await new Promise(resolve => setTimeout(resolve, 100));
      audit.mark(PerformanceCheckpoint.BOM_COMPLETE, { designIndex: i });
    }
    
    const result = audit.completeWorkflow();
    
    // Assertions
    expect(result.totalDuration).toBeLessThan(20000); // <20 seconds
    expect(result.checkpoints.length).toBeGreaterThan(30); // Should have multiple checkpoints per design
    
    // Memory stability check (if available)
    if (result.memoryUsage) {
      const memoryIncrease = result.memoryUsage.final - result.memoryUsage.initial;
      expect(memoryIncrease).toBeLessThan(100); // Should not increase by more than 100MB
    }
    
    if (import.meta.env.DEV) {
      console.log('[Performance] Batch Processing Workflow:', result);
    }
  }, 25000);
});

describe('Performance Checkpoint Tracking', () => {
  let audit: WorkflowPerformanceAudit;

  beforeEach(() => {
    audit = new WorkflowPerformanceAudit('test-workflow');
  });

  it('should track all checkpoints correctly', () => {
    audit.startWorkflow();
    audit.mark(PerformanceCheckpoint.DESIGN_START);
    audit.mark(PerformanceCheckpoint.DESIGN_COMPLETE);
    audit.mark(PerformanceCheckpoint.VALIDATION_START);
    audit.mark(PerformanceCheckpoint.VALIDATION_COMPLETE);
    
    const checkpoints = audit.getCheckpoints();
    
    expect(checkpoints.length).toBe(5); // WORKFLOW_START + 4 checkpoints
    expect(checkpoints[0].checkpoint).toBe(PerformanceCheckpoint.WORKFLOW_START);
    expect(checkpoints[1].checkpoint).toBe(PerformanceCheckpoint.DESIGN_START);
    expect(checkpoints[2].checkpoint).toBe(PerformanceCheckpoint.DESIGN_COMPLETE);
    expect(checkpoints[3].checkpoint).toBe(PerformanceCheckpoint.VALIDATION_START);
    expect(checkpoints[4].checkpoint).toBe(PerformanceCheckpoint.VALIDATION_COMPLETE);
    
    // Check durations are calculated (each checkpoint has duration relative to previous)
    // checkpoint[0] = WORKFLOW_START (no prior checkpoint, so duration may be 0 or undefined)
    // checkpoint[1..N] all have duration measured from the previous checkpoint
    expect(checkpoints[2].duration).toBeDefined();
    expect(checkpoints[3].duration).toBeDefined();
  });

  it('should measure duration between checkpoints', () => {
    audit.startWorkflow();
    audit.mark(PerformanceCheckpoint.DESIGN_START);
    
    // Small delay
    const start = performance.now();
    while (performance.now() - start < 10) {
      // Wait ~10ms
    }
    
    audit.mark(PerformanceCheckpoint.DESIGN_COMPLETE);
    
    const duration = audit.measure(PerformanceCheckpoint.DESIGN_START, PerformanceCheckpoint.DESIGN_COMPLETE);
    
    expect(duration).toBeGreaterThan(5);
    expect(duration).toBeLessThan(50); // Should be around 10ms
  });
});
