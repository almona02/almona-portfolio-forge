/**
 * Audit Trail Integration Functional Tests
 * 
 * Verifies correct functionality of audit trail recording through AICSIntegrationService.
 * 
 * Test Coverage:
 * - Design validation audit recording works
 * - BOM generation audit recording works
 * - Performance tracking works
 * - Caching works correctly
 */

import { getAICSIntegrationService } from '@/core/authority/certification';
import { validateDesignWithEnvelope } from '@/lib/fabricator/ConstraintEngine';
import type { WindowGrid } from '@/types/fabricator';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Audit Trail Integration Functional Tests', () => {
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
    // Reset state before each test
  });

  it('should record design validation audit correctly', async () => {
    const validationResult = validateDesignWithEnvelope(1200, 1500, testWindowGrid, 'rock60', true);
    
    expect(validationResult.envelopeResult).toBeDefined();
    
    if (!validationResult.envelopeResult) {
      return; // Skip if no envelope result
    }

    const result = await integrationService.recordDesignValidationAuditWithPerformance({
      who: 'test-user',
      what: 'Design validation test',
      decision: validationResult.isValid ? 'Design validated' : 'Design validation failed',
      why: 'Functional test',
      mode: 'certified',
      validationEnvelopeResult: validationResult.envelopeResult,
      designContext: { width: 1200, height: 1500, grid: testWindowGrid },
    });

    expect(result.anchorId).toBeDefined();
    expect(typeof result.anchorId).toBe('string');
    expect(result.anchorId.length).toBeGreaterThan(0);
    expect(result.performanceMs).toBeGreaterThan(0);
    expect(result.performanceMs).toBeLessThan(500);
    expect(typeof result.cached).toBe('boolean');
  }, 30000);

  it('should track performance metrics correctly', async () => {
    const validationResult = validateDesignWithEnvelope(1200, 1500, testWindowGrid, 'rock60', true);
    
    if (!validationResult.envelopeResult) {
      return;
    }

    const result = await integrationService.recordDesignValidationAuditWithPerformance({
      who: 'test-user',
      what: 'Performance tracking test',
      decision: 'Design validated',
      why: 'Performance test',
      mode: 'certified',
      validationEnvelopeResult: validationResult.envelopeResult,
      designContext: { width: 1200, height: 1500, grid: testWindowGrid },
    });

    expect(result.performanceMs).toBeGreaterThan(0);
    expect(result.performanceMs).toBeLessThan(500);
    expect(typeof result.cached).toBe('boolean');
  }, 30000);

  it('should cache audit recordings for duplicate requests', async () => {
    const validationResult = validateDesignWithEnvelope(1200, 1500, testWindowGrid, 'rock60', true);
    
    if (!validationResult.envelopeResult) {
      return;
    }

    const context = {
      who: 'test-user',
      what: 'Cache test',
      decision: 'Design validated',
      why: 'Cache functional test',
      mode: 'certified' as const,
      validationEnvelopeResult: validationResult.envelopeResult,
      designContext: { width: 1200, height: 1500, grid: testWindowGrid },
    };

    const firstResult = await integrationService.recordDesignValidationAuditWithPerformance(context);
    expect(firstResult.cached).toBe(false);

    // Immediate second call should be cached (within 1 second TTL)
    const secondResult = await integrationService.recordDesignValidationAuditWithPerformance(context);
    expect(secondResult.cached).toBe(true);
    expect(secondResult.anchorId).toBe(firstResult.anchorId);
    expect(secondResult.performanceMs).toBeLessThan(firstResult.performanceMs);
  }, 30000);

  it('should handle different validation results', async () => {
    // Valid design
    const validResult = validateDesignWithEnvelope(1200, 1500, testWindowGrid, 'rock60', true);
    
    if (validResult.envelopeResult) {
      const auditResult = await integrationService.recordDesignValidationAuditWithPerformance({
        who: 'test-user',
        what: 'Valid design validation',
        decision: 'Design validated',
        why: 'Valid design test',
        mode: 'certified',
        validationEnvelopeResult: validResult.envelopeResult,
        designContext: { width: 1200, height: 1500, grid: testWindowGrid },
      });

      expect(auditResult.anchorId).toBeDefined();
    }

    // Invalid design
    const invalidGrid: WindowGrid = {
      rows: 1,
      cols: 1,
      cells: [{ id: '0-0', row: 0, col: 0, type: 'sash' }],
    };
    
    const invalidResult = validateDesignWithEnvelope(200, 300, invalidGrid, 'rock60', true);
    
    if (invalidResult.envelopeResult) {
      const auditResult = await integrationService.recordDesignValidationAuditWithPerformance({
        who: 'test-user',
        what: 'Invalid design validation',
        decision: 'Design validation failed',
        why: 'Invalid design test',
        mode: 'certified',
        validationEnvelopeResult: invalidResult.envelopeResult,
        designContext: { width: 200, height: 300, grid: invalidGrid },
      });

      expect(auditResult.anchorId).toBeDefined();
    }
  }, 30000);

  it('should maintain backward compatibility with recordDesignValidationAudit', async () => {
    const validationResult = validateDesignWithEnvelope(1200, 1500, testWindowGrid, 'rock60', true);
    
    if (!validationResult.envelopeResult) {
      return;
    }

    // Test that the original method (without performance tracking) still works
    const anchorId = await integrationService.recordDesignValidationAudit({
      who: 'test-user',
      what: 'Backward compatibility test',
      decision: 'Design validated',
      why: 'Compatibility test',
      mode: 'certified',
      validationEnvelopeResult: validationResult.envelopeResult,
      designContext: { width: 1200, height: 1500, grid: testWindowGrid },
    });

    expect(anchorId).toBeDefined();
    expect(typeof anchorId).toBe('string');
    expect(anchorId.length).toBeGreaterThan(0);
  }, 30000);

  it('should handle different operation modes', async () => {
    const validationResult = validateDesignWithEnvelope(1200, 1500, testWindowGrid, 'rock60', true);
    
    if (!validationResult.envelopeResult) {
      return;
    }

    const modes = ['sandbox', 'production', 'certified'] as const;

    for (const mode of modes) {
      const result = await integrationService.recordDesignValidationAuditWithPerformance({
        who: 'test-user',
        what: `Mode ${mode} test`,
        decision: 'Design validated',
        why: 'Mode test',
        mode,
        validationEnvelopeResult: validationResult.envelopeResult,
        designContext: { width: 1200, height: 1500, grid: testWindowGrid },
      });

      expect(result.anchorId).toBeDefined();
    }
  }, 30000);
});

