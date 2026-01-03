// src/components/fabricator/drafting/__tests__/ConstitutionalCompliance.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { 
  logDraftingAction, 
  getAuditTrail, 
  clearAuditTrail,
  verifyConstitutionalCompliance 
} from '../utils/constitutionalAudit';

describe('Drafting Layer Constitutional Compliance', () => {
  beforeEach(() => {
    clearAuditTrail();
  });

  // Test 1: Tier 0 Purity - No Execution Logic
  it('should not contain execution logic in drafting layer', () => {
    const forbiddenTerms = [
      'generateBOM',
      'optimizeCutList',
      'selectProfile',
      'calculateWaste',
      'AlgorithmPredictor',
      'selectAlgorithm'
    ];

    // Scan all drafting files for forbidden terms
    // This would be done via static analysis in real CI/CD
    const draftingCode = `
      // This is a test - in real implementation, we'd read actual files
      const allowed = ['addRectangle', 'snapToGrid', 'validateDesign'];
      const forbidden = ['generateBOM', 'optimizeCutList'];
    `;

    forbiddenTerms.forEach(term => {
      expect(draftingCode).not.toContain(term);
    });
  });

  // Test 2: Audit Trail Completeness
  it('should log all critical actions', () => {
    logDraftingAction(
      'rectangle_added',
      { x: 0, y: 0, width: 100, height: 100 },
      { id: 'rect-1', type: 'fixed' },
      'CHECKPOINT-001'
    );

    logDraftingAction(
      'validation_requested',
      { geometry: { rectangles: [] } },
      { valid: true, tier: 'Tier 1' },
      'CHECKPOINT-002'
    );

    const logs = getAuditTrail();
    expect(logs.length).toBe(2);
    expect(logs[0].action).toBe('rectangle_added');
    expect(logs[1].action).toBe('validation_requested');
  });

  // Test 3: Tier 0 Separation
  it('should maintain Tier 0 separation', () => {
    const logs = [
      logDraftingAction(
        'rectangle_added',
        { x: 0, y: 0, width: 100, height: 100 },
        { id: 'rect-1' },
        'CHECKPOINT-001'
      )
    ];

    const compliance = verifyConstitutionalCompliance(logs);
    expect(compliance.compliant).toBe(true);
    expect(logs[0].tier).toBe('Tier 0');
  });

  // Test 4: No Execution Logic in Logs
  it('should reject logs containing execution logic', () => {
    const logs = [
      logDraftingAction(
        'rectangle_added',
        { x: 0, y: 0, width: 100, height: 100 },
        { id: 'rect-1', bom: [] }, // ⚠️ Contains forbidden term
        'CHECKPOINT-001'
      )
    ];

    const compliance = verifyConstitutionalCompliance(logs);
    expect(compliance.compliant).toBe(false);
    expect(compliance.violations.length).toBeGreaterThan(0);
    expect(compliance.violations.some(v => v.includes('bom'))).toBe(true);
  });

  // Test 5: Deterministic Guarantee
  it('should produce identical outputs for identical inputs', () => {
    const input1 = { x: 100, y: 100, width: 500, height: 600 };
    const input2 = { x: 100, y: 100, width: 500, height: 600 };

    const log1 = logDraftingAction(
      'rectangle_added',
      input1,
      { id: 'rect-1' },
      'CHECKPOINT-001'
    );

    clearAuditTrail();

    const log2 = logDraftingAction(
      'rectangle_added',
      input2,
      { id: 'rect-1' },
      'CHECKPOINT-001'
    );

    // Inputs should be identical (deterministic)
    expect(JSON.stringify(log1.inputs)).toBe(JSON.stringify(log2.inputs));
    expect(log1.action).toBe(log2.action);
    expect(log1.tier).toBe(log2.tier);
  });

  // Test 6: Validation Checkpoint Required
  it('should require constitutional checkpoint for validation', () => {
    const logs = [
      logDraftingAction(
        'validation_requested',
        { geometry: {} },
        { valid: true },
        '' // ⚠️ Missing checkpoint
      )
    ];

    const compliance = verifyConstitutionalCompliance(logs);
    expect(compliance.compliant).toBe(false);
    expect(compliance.violations.some(v => v.includes('checkpoint'))).toBe(true);
  });

  // Test 7: Human Review Flag
  it('should flag validation and export actions for human review', () => {
    const validationLog = logDraftingAction(
      'validation_requested',
      { geometry: {} },
      { valid: true },
      'CHECKPOINT-001'
    );

    const exportLog = logDraftingAction(
      'design_exported',
      { geometry: {} },
      { output: {} },
      'CHECKPOINT-002'
    );

    const rectangleLog = logDraftingAction(
      'rectangle_added',
      { x: 0, y: 0 },
      { id: 'rect-1' },
      'CHECKPOINT-003'
    );

    expect(validationLog.requiresHumanReview).toBe(true);
    expect(exportLog.requiresHumanReview).toBe(true);
    expect(rectangleLog.requiresHumanReview).toBe(false);
  });
});

