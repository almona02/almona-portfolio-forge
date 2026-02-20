/**
 * Audit Trail Constraint Integration Tests
 * 
 * Tests integration of ValidationEnvelope results into AuditTrailService.
 * 
 * AICS-001 Reference: Section 7.4 (Audit Trail Doctrine)
 */

import {
    AuditTrailService,
    getAuditTrailService,
    resetAuditTrailService,
    type AuditRecordRequest,
    type ConstraintResults,
} from '@/core/authority/certification/AuditTrailService';
import { TruthVersionTracker } from '@/core/authority/certification/TruthVersionTracker';
import {
    getValidationEnvelope,
    resetConstraintRegistry,
    resetValidationEnvelope
} from '@/core/authority/validation_envelopes';
import {
    registerGeometricConstraints,
    type DesignValidationContext,
} from '@/core/authority/validation_envelopes/RegisteredConstraints';
import type { GridCell, WindowGrid } from '@/types/fabricator';
import { beforeEach, describe, expect, test } from 'vitest';

/**
 * Helper: Create a simple window grid for testing
 */
function createSimpleWindowGrid(rows: number = 1, cols: number = 1): WindowGrid {
  const cells: GridCell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push({
        id: `${row}-${col}`,
        row,
        col,
        type: col === 0 ? 'sash' : 'fixed',
      });
    }
  }
  return {
    rows,
    cols,
    cells,
  };
}

/**
 * Helper: Create a design validation context
 */
function createDesignContext(
  width: number,
  height: number,
  grid?: WindowGrid,
  systemId?: string
): DesignValidationContext {
  return {
    width,
    height,
    grid: grid || createSimpleWindowGrid(),
    systemId: systemId || 'generic',
  };
}

describe('AuditTrailService Constraint Integration', () => {
  let auditTrailService: AuditTrailService;
  let validationEnvelope: ReturnType<typeof getValidationEnvelope>;

  beforeEach(() => {
    // Reset services
    resetAuditTrailService();
    resetValidationEnvelope();
    resetConstraintRegistry();
    
    // Register constraints
    registerGeometricConstraints();
    
    // Get service instances
    auditTrailService = getAuditTrailService();
    validationEnvelope = getValidationEnvelope();
  });

  test('Records constraint validation results in audit trail', async () => {
    // Create validation context
    const context = createDesignContext(1500, 2000);
    
    // Run validation
    const validationResult = validationEnvelope.validate(context);
    
    // Create constraint results
    const constraintResults: ConstraintResults = {
      validationEnvelopeResult: validationResult,
      summary: validationResult.complies 
        ? 'All constraints passed' 
        : 'Some constraints failed',
    };
    
    // Create audit record request
    const truthVersions = TruthVersionTracker.getCurrentTruthVersions();
    const request: AuditRecordRequest = {
      who: 'test-user',
      what: 'design_validation',
      truthVersions,
      constraintResults,
      decision: validationResult.complies ? 'approved' : 'rejected',
      why: 'Design validation completed',
      mode: 'production',
    };
    
    // Record audit trail
    const anchor = await auditTrailService.recordAuditTrail(request);
    
    // Verify audit record contains constraint results
    expect(anchor.decisionContext.validationResults).toBeDefined();
    expect(anchor.decisionContext.validationResults).toHaveProperty('validationEnvelope');
    expect(anchor.decisionContext.validationResults).toHaveProperty('summary');
    expect(anchor.decisionContext.validationResults).toHaveProperty('constraintResultsHash');
    
    // Verify constraint results structure
    const validationResults = anchor.decisionContext.validationResults;
    const validationEnvelopeData = validationResults.validationEnvelope as Record<string, unknown>;
    
    expect(validationEnvelopeData.complies).toBe(validationResult.complies);
    expect(validationEnvelopeData.failedCategories).toBeDefined();
    expect(validationEnvelopeData.metadata).toBeDefined();
    expect(validationEnvelopeData.categoryResults).toBeDefined();
    
    // Verify hash is present
    expect(validationResults.constraintResultsHash).toBeDefined();
    expect(typeof validationResults.constraintResultsHash).toBe('string');
    expect((validationResults.constraintResultsHash as string).length).toBeGreaterThan(0);
  });

  test('Serializes ValidationEnvelopeResult correctly (Map conversion)', async () => {
    // Create validation context with valid design
    const context = createDesignContext(1500, 2000);
    
    // Run validation
    const validationResult = validationEnvelope.validate(context);
    
    // Create constraint results
    const constraintResults: ConstraintResults = {
      validationEnvelopeResult: validationResult,
      summary: 'Validation completed',
    };
    
    // Create audit record request
    const truthVersions = TruthVersionTracker.getCurrentTruthVersions();
    const request: AuditRecordRequest = {
      who: 'test-user',
      what: 'design_validation',
      truthVersions,
      constraintResults,
      decision: 'approved',
      why: 'Design validation completed',
      mode: 'production',
    };
    
    // Record audit trail
    const anchor = await auditTrailService.recordAuditTrail(request);
    
    // Verify category results are serialized (converted from Map to object)
    const validationResults = anchor.decisionContext.validationResults;
    const validationEnvelopeData = validationResults.validationEnvelope as Record<string, unknown>;
    const categoryResults = validationEnvelopeData.categoryResults as Record<string, unknown>;
    
    // Verify category results is an object (not a Map)
    expect(categoryResults).toBeDefined();
    expect(typeof categoryResults).toBe('object');
    expect(Array.isArray(categoryResults)).toBe(false);
    
    // Verify category results contain expected categories
    if (validationResult.categoryResults.size > 0) {
      const categoryKeys = Object.keys(categoryResults);
      expect(categoryKeys.length).toBeGreaterThan(0);
      
      // Verify each category result has expected structure
      categoryKeys.forEach((key) => {
        const categoryResult = categoryResults[key] as Record<string, unknown>;
        expect(categoryResult).toHaveProperty('category');
        expect(categoryResult).toHaveProperty('passed');
        expect(categoryResult).toHaveProperty('constraintResults');
        expect(categoryResult).toHaveProperty('errorCount');
        expect(categoryResult).toHaveProperty('totalConstraints');
      });
    }
  });

  test('Includes constraint results hash for integrity verification', async () => {
    // Create validation context
    const context = createDesignContext(1500, 2000);
    
    // Run validation
    const validationResult = validationEnvelope.validate(context);
    
    // Create constraint results
    const constraintResults: ConstraintResults = {
      validationEnvelopeResult: validationResult,
      summary: 'Validation completed',
    };
    
    // Create audit record request
    const truthVersions = TruthVersionTracker.getCurrentTruthVersions();
    const request: AuditRecordRequest = {
      who: 'test-user',
      what: 'design_validation',
      truthVersions,
      constraintResults,
      decision: 'approved',
      why: 'Design validation completed',
      mode: 'production',
    };
    
    // Record audit trail
    const anchor = await auditTrailService.recordAuditTrail(request);
    
    // Verify hash is present
    const validationResults = anchor.decisionContext.validationResults;
    const hash = validationResults.constraintResultsHash as string;
    
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
    
    // Verify hash is consistent (same constraint results = same hash)
    const anchor2 = await auditTrailService.recordAuditTrail(request);
    const validationResults2 = anchor2.decisionContext.validationResults;
    const hash2 = validationResults2.constraintResultsHash as string;
    
    expect(hash).toBe(hash2);
  });

  test('Records failed constraint validation results', async () => {
    // Create validation context with invalid design (very small dimensions)
    const context = createDesignContext(100, 100); // Too small
    
    // Run validation
    const validationResult = validationEnvelope.validate(context);
    
    // Expect validation to fail
    expect(validationResult.complies).toBe(false);
    expect(validationResult.failedCategories.length).toBeGreaterThan(0);
    
    // Create constraint results
    const constraintResults: ConstraintResults = {
      validationEnvelopeResult: validationResult,
      summary: 'Validation failed: Constraints not met',
    };
    
    // Create audit record request
    const truthVersions = TruthVersionTracker.getCurrentTruthVersions();
    const request: AuditRecordRequest = {
      who: 'test-user',
      what: 'design_validation',
      truthVersions,
      constraintResults,
      decision: 'rejected',
      why: 'Design failed constraint validation',
      mode: 'production',
    };
    
    // Record audit trail
    const anchor = await auditTrailService.recordAuditTrail(request);
    
    // Verify audit record contains failed constraint results
    const validationResults = anchor.decisionContext.validationResults;
    const validationEnvelopeData = validationResults.validationEnvelope as Record<string, unknown>;
    
    expect(validationEnvelopeData.complies).toBe(false);
    expect(validationEnvelopeData.failedCategories).toBeDefined();
    const failedCategories = validationEnvelopeData.failedCategories as string[];
    expect(failedCategories.length).toBeGreaterThan(0);
    
    // Verify failed constraints are recorded
    const allConstraintResults = validationEnvelopeData.allConstraintResults as Array<{
      passed: boolean;
      constraintId: string;
    }>;
    expect(allConstraintResults).toBeDefined();
    const failedConstraints = allConstraintResults.filter((r) => !r.passed);
    expect(failedConstraints.length).toBeGreaterThan(0);
  });

  test('Handles audit record without constraint results', async () => {
    // Create audit record request without constraint results
    const truthVersions = TruthVersionTracker.getCurrentTruthVersions();
    const request: AuditRecordRequest = {
      who: 'test-user',
      what: 'design_action',
      truthVersions,
      decision: 'approved',
      why: 'Action completed',
      mode: 'production',
    };
    
    // Record audit trail
    const anchor = await auditTrailService.recordAuditTrail(request);
    
    // Verify validation results is empty object
    expect(anchor.decisionContext.validationResults).toBeDefined();
    expect(anchor.decisionContext.validationResults).toEqual({});
  });

  test('Constraint results hash changes when results change', async () => {
    // Create first validation context
    const context1 = createDesignContext(1500, 2000);
    const validationResult1 = validationEnvelope.validate(context1);
    
    const constraintResults1: ConstraintResults = {
      validationEnvelopeResult: validationResult1,
      summary: 'First validation',
    };
    
    const truthVersions = TruthVersionTracker.getCurrentTruthVersions();
    const request1: AuditRecordRequest = {
      who: 'test-user',
      what: 'design_validation',
      truthVersions,
      constraintResults: constraintResults1,
      decision: 'approved',
      why: 'First validation',
      mode: 'production',
    };
    
    const anchor1 = await auditTrailService.recordAuditTrail(request1);
    const hash1 = (anchor1.decisionContext.validationResults).constraintResultsHash as string;
    
    // Create second validation context with different dimensions
    const context2 = createDesignContext(2000, 2500);
    const validationResult2 = validationEnvelope.validate(context2);
    
    const constraintResults2: ConstraintResults = {
      validationEnvelopeResult: validationResult2,
      summary: 'Second validation',
    };
    
    const request2: AuditRecordRequest = {
      who: 'test-user',
      what: 'design_validation',
      truthVersions,
      constraintResults: constraintResults2,
      decision: 'approved',
      why: 'Second validation',
      mode: 'production',
    };
    
    const anchor2 = await auditTrailService.recordAuditTrail(request2);
    const hash2 = (anchor2.decisionContext.validationResults).constraintResultsHash as string;
    
    // Verify hashes are different (different constraint results = different hash)
    expect(hash1).toBeDefined();
    expect(hash2).toBeDefined();
    expect(hash1).not.toBe(hash2);
  });
});


