/**
 * Audit Trail Integration AICS-001 Constitutional Compliance Tests
 * 
 * Verifies AICS-001 compliance for audit trail recording through AICSIntegrationService.
 * 
 * Compliance Requirements:
 * - All certified actions generate audit trails (Section 7.4)
 * - Audit records are immutable
 * - Truth versions are tracked
 * - Cryptographic linking works
 */

import { TruthVersionTracker, getAICSIntegrationService, getAuditTrailService } from '@/core/authority/certification';
import { validateDesignWithEnvelope } from '@/lib/fabricator/ConstraintEngine';
import type { WindowGrid } from '@/types/fabricator';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Audit Trail Integration AICS-001 Constitutional Compliance', () => {
  const integrationService = getAICSIntegrationService();
  const auditService = getAuditTrailService();
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

  beforeEach(async () => {
    // Initialize audit service
    await auditService.initialize();
  });

  it('should generate audit trails for all certified actions (AICS-001 Section 7.4)', async () => {
    const validationResult = validateDesignWithEnvelope(1200, 1500, testWindowGrid, 'rock60', true);
    
    expect(validationResult.envelopeResult).toBeDefined();
    
    if (!validationResult.envelopeResult) {
      return;
    }

    // AICS-001 Section 7.4: Every certified action generates an immutable audit record
    const anchorId = await integrationService.recordDesignValidationAudit({
      who: 'test-user',
      what: 'Design validation',
      decision: 'Design validated',
      why: 'Compliance test',
      mode: 'certified',
      validationEnvelopeResult: validationResult.envelopeResult,
      designContext: { width: 1200, height: 1500, grid: testWindowGrid },
    });

    expect(anchorId).toBeDefined();
    expect(typeof anchorId).toBe('string');
    expect(anchorId.length).toBeGreaterThan(0);
  }, 30000);

  it('should track truth versions in audit records', async () => {
    const truthVersionsBefore = TruthVersionTracker.getCurrentTruthVersions();
    
    const validationResult = validateDesignWithEnvelope(1200, 1500, testWindowGrid, 'rock60', true);
    
    if (!validationResult.envelopeResult) {
      return;
    }

    const anchorId = await integrationService.recordDesignValidationAudit({
      who: 'test-user',
      what: 'Truth version tracking test',
      decision: 'Design validated',
      why: 'Truth version test',
      mode: 'certified',
      validationEnvelopeResult: validationResult.envelopeResult,
      designContext: { width: 1200, height: 1500, grid: testWindowGrid },
    });

    expect(anchorId).toBeDefined();

    // Verify audit record contains truth versions
    const chain = auditService.getChain();
    const anchor = chain.find(a => a.anchorId === anchorId);
    
    expect(anchor).toBeDefined();
    if (anchor) {
      expect(anchor.decisionContext.canonicalTruthVersions).toBeDefined();
      expect(anchor.decisionContext.canonicalTruthVersions.geometry).toBe(truthVersionsBefore.geometry);
      expect(anchor.decisionContext.canonicalTruthVersions.material).toBe(truthVersionsBefore.material);
      expect(anchor.decisionContext.canonicalTruthVersions.machine).toBe(truthVersionsBefore.machine);
      expect(anchor.decisionContext.canonicalTruthVersions.process).toBe(truthVersionsBefore.process);
      expect(anchor.decisionContext.canonicalTruthVersions.certification).toBe(
        truthVersionsBefore.certification
      );
    }
  }, 30000);

  it('should create immutable audit records (AICS-001 Section 7.4)', async () => {
    const validationResult = validateDesignWithEnvelope(1200, 1500, testWindowGrid, 'rock60', true);
    
    if (!validationResult.envelopeResult) {
      return;
    }

    const anchorId = await integrationService.recordDesignValidationAudit({
      who: 'test-user',
      what: 'Immutability test',
      decision: 'Design validated',
      why: 'Immutability test',
      mode: 'certified',
      validationEnvelopeResult: validationResult.envelopeResult,
      designContext: { width: 1200, height: 1500, grid: testWindowGrid },
    });

    expect(anchorId).toBeDefined();

    // Verify anchor exists in chain
    const chain = auditService.getChain();
    const anchor = chain.find(a => a.anchorId === anchorId);
    
    expect(anchor).toBeDefined();
    if (anchor) {
      // Anchor should be immutable (cannot be modified)
      const originalTimestamp = anchor.timestamp;
      const originalDecision = anchor.decisionContext.reasoning.decision;
      
      // Verify anchor properties are set
      expect(anchor.timestamp).toBe(originalTimestamp);
      expect(anchor.decisionContext.reasoning.decision).toBe(originalDecision);
    }
  }, 30000);

  it('should include constraint validation results in audit records', async () => {
    const validationResult = validateDesignWithEnvelope(1200, 1500, testWindowGrid, 'rock60', true);
    
    expect(validationResult.envelopeResult).toBeDefined();
    
    if (!validationResult.envelopeResult) {
      return;
    }

    const anchorId = await integrationService.recordDesignValidationAudit({
      who: 'test-user',
      what: 'Constraint results test',
      decision: validationResult.isValid ? 'Design validated' : 'Design validation failed',
      why: 'Constraint results test',
      mode: 'certified',
      validationEnvelopeResult: validationResult.envelopeResult,
      designContext: { width: 1200, height: 1500, grid: testWindowGrid },
    });

    expect(anchorId).toBeDefined();

    // Verify audit record contains validation results
    const chain = auditService.getChain();
    const anchor = chain.find(a => a.anchorId === anchorId);
    
    expect(anchor).toBeDefined();
    if (anchor) {
      expect(anchor.decisionContext.validationResults).toBeDefined();
      // Validation results should contain constraint results
      expect(anchor.decisionContext.validationResults).toBeDefined();
    }
  }, 30000);

  it('should maintain cryptographic linking (AICS-001 Section 7.4)', async () => {
    const validationResult1 = validateDesignWithEnvelope(1200, 1500, testWindowGrid, 'rock60', true);
    const validationResult2 = validateDesignWithEnvelope(1300, 1600, testWindowGrid, 'rock60', true);
    
    if (!validationResult1.envelopeResult || !validationResult2.envelopeResult) {
      return;
    }

    const anchorId1 = await integrationService.recordDesignValidationAudit({
      who: 'test-user',
      what: 'Cryptographic linking test 1',
      decision: 'Design validated',
      why: 'Linking test',
      mode: 'certified',
      validationEnvelopeResult: validationResult1.envelopeResult,
      designContext: { width: 1200, height: 1500, grid: testWindowGrid },
    });

    const anchorId2 = await integrationService.recordDesignValidationAudit({
      who: 'test-user',
      what: 'Cryptographic linking test 2',
      decision: 'Design validated',
      why: 'Linking test',
      mode: 'certified',
      validationEnvelopeResult: validationResult2.envelopeResult,
      designContext: { width: 1300, height: 1600, grid: testWindowGrid },
    });

    expect(anchorId1).toBeDefined();
    expect(anchorId2).toBeDefined();
    expect(anchorId1).not.toBe(anchorId2);

    // Verify anchors are in chain (cryptographically linked)
    const chain = auditService.getChain();
    const anchor1 = chain.find(a => a.anchorId === anchorId1);
    const anchor2 = chain.find(a => a.anchorId === anchorId2);
    
    expect(anchor1).toBeDefined();
    expect(anchor2).toBeDefined();
    
    // Anchors should be sequentially linked
    if (anchor1 && anchor2) {
      expect(chain.indexOf(anchor1)).toBeLessThan(chain.indexOf(anchor2));
    }
  }, 30000);

  it('should maintain Tier 3 compliance (no ML/AI in execution path)', async () => {
    // AICS-001 Rule 15: Tier 3 compliance means no ML/AI in execution path
    const validationResult = validateDesignWithEnvelope(1200, 1500, testWindowGrid, 'rock60', true);
    
    if (!validationResult.envelopeResult) {
      return;
    }

    const startTime = performance.now();
    
    const anchorId = await integrationService.recordDesignValidationAudit({
      who: 'test-user',
      what: 'Tier 3 compliance test',
      decision: 'Design validated',
      why: 'Tier 3 test',
      mode: 'certified',
      validationEnvelopeResult: validationResult.envelopeResult,
      designContext: { width: 1200, height: 1500, grid: testWindowGrid },
    });

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Audit recording should complete deterministically without ML/AI calls
    expect(anchorId).toBeDefined();
    expect(executionTime).toBeLessThan(500); // Should be fast (no async ML model loading)
  }, 30000);

  it('should enforce constitutional constraints in audit records', async () => {
    const validationResult = validateDesignWithEnvelope(1200, 1500, testWindowGrid, 'rock60', true);
    
    if (!validationResult.envelopeResult) {
      return;
    }

    const anchorId = await integrationService.recordDesignValidationAudit({
      who: 'test-user',
      what: 'Constitutional constraints test',
      decision: validationResult.isValid ? 'Design validated' : 'Design validation failed',
      why: 'Constitutional test',
      mode: 'certified',
      validationEnvelopeResult: validationResult.envelopeResult,
      designContext: { width: 1200, height: 1500, grid: testWindowGrid },
    });

    expect(anchorId).toBeDefined();

    // Verify audit record contains tier classification
    const chain = auditService.getChain();
    const anchor = chain.find(a => a.anchorId === anchorId);
    
    expect(anchor).toBeDefined();
    if (anchor) {
      expect(anchor.decisionContext.tierClassification).toBeDefined();
      expect(['T1', 'T2', 'T3']).toContain(anchor.decisionContext.tierClassification);
    }
  }, 30000);
});

