/**
 * CONSTITUTIONAL PERFORMANCE MONITORING
 * Foundation Test Suite
 * 
 * Comprehensive tests for Phase 0 constitutional performance monitoring
 */

import crypto from 'crypto';
import { beforeEach, describe, expect, test } from 'vitest';
import {
    accuracyTracker,
    auditTrailChecker,
    deterministicExecutionTracker,
    deterministicVerifier,
    tierAuditor
} from '../index';

describe('Constitutional Performance Monitoring - Phase 0', () => {
  describe('DeterministicReplayVerifier', () => {
    beforeEach(() => {
      // Reset state
    });

    test('should verify deterministic behavior for identical operations', async () => {
      let counter = 0;
      const deterministicOp = {
        name: 'incrementCounter',
        tier: 'Tier 3' as const,
        execute: () => {
          counter++;
          return { result: counter };
        }
      };

      const result = await deterministicVerifier.verifyDeterministicBehavior(
        deterministicOp,
        3
      );

      expect(result.deterministic).toBe(false); // Counter changes each time
      expect(result.constitutionalCompliance).toBe('FAIL');
    });

    test('should verify deterministic behavior for pure operations', async () => {
      const pureOp = {
        name: 'multiplyByTwo',
        tier: 'Tier 3' as const,
        execute: () => {
          return { result: 2 * 5 };
        }
      };

      const result = await deterministicVerifier.verifyDeterministicBehavior(
        pureOp,
        3
      );

      expect(result.deterministic).toBe(true);
      expect(result.constitutionalCompliance).toBe('PASS');
      expect(result.avgExecutionTime).toBeGreaterThan(0);
    });

    test('should verify cache integrity', async () => {
      const cachedResult = { value: 100 };
      const recompute = () => ({ value: 100 });

      const verification = await deterministicVerifier.verifyCacheIntegrity(
        cachedResult,
        recompute
      );

      expect(verification.valid).toBe(true);
      expect(verification.reason).toContain('Cache integrity verified');
    });
  });

  describe('TierClassificationAuditor', () => {
    test('should classify files by tier correctly', () => {
      expect(tierAuditor.classifyFile('DraftingWorkbench.tsx')).toBe('Tier 0');
      expect(tierAuditor.classifyFile('AlgorithmSelector.ts')).toBe('Tier 3');
      expect(tierAuditor.classifyFile('SomeOtherFile.tsx')).toBe('Mixed');
    });

    test('should detect Tier 0 violations (execution logic in visual layer)', () => {
      const fileContent = `
        import { BOMCalculator } from './BOMCalculator';
        export function DraftingCanvas() {
          const bom = BOMCalculator.calculate();
          return <canvas />;
        }
      `;

      const violations = tierAuditor.auditFileContent(
        'DraftingCanvas2D.tsx',
        fileContent
      );

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].severity).toBe('ERROR');
      expect(violations[0].constitutionalArticle).toContain('AICS-001');
    });

    test('should detect Tier 3 violations (ML/AI in execution path)', () => {
      const fileContent = `
        import tensorflow from '@tensorflow/tfjs';
        export function AlgorithmSelector() {
          const model = tensorflow.loadLayersModel('model.json');
          return model.predict(inputs);
        }
      `;

      const violations = tierAuditor.auditFileContent(
        'AlgorithmSelector.ts',
        fileContent
      );

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].violation).toContain('ML/AI');
    });
  });

  describe('AuditTrailIntegrityChecker', () => {
    beforeEach(() => {
      auditTrailChecker.clearAuditLog();
    });

    test('should record audit entries with hashes', () => {
      const entry = auditTrailChecker.recordAuditEntry({
        operation: 'BOMCalculation',
        tier: 'Tier 3',
        inputs: { width: 1200, height: 1500 },
        outputs: { profiles: 10, cost: 1500 },
        duration: 150,
        ruleId: 'RULE_CASEMENT_2X2'
      });

      expect(entry.id).toBeDefined();
      expect(entry.hash).toBeDefined();
      expect(entry.timestamp).toBeGreaterThan(0);
    });

    test('should verify audit trail completeness', () => {
      // Clear defaults or previous test residuals
      auditTrailChecker.clearRequiredOperations(); 
      auditTrailChecker.registerRequiredOperation('TestOp', 'Tier 3');

      auditTrailChecker.recordAuditEntry({
        operation: 'TestOp',
        tier: 'Tier 3',
        inputs: {},
        outputs: {},
        duration: 10,
        ruleId: 'TEST_RULE'
      });

      const report = auditTrailChecker.verifyAuditTrailCompleteness();

      expect(report.missingEntries.length).toBe(0);
      expect(report.constitutionalCompliance).toBe('PASS');
    });

    test('should detect missing rule IDs for Tier 3 operations', () => {
      auditTrailChecker.recordAuditEntry({
        operation: 'AlgorithmSelection',
        tier: 'Tier 3',
        inputs: {},
        outputs: {},
        duration: 10
        // Missing ruleId
      });

      const report = auditTrailChecker.verifyAuditTrailCompleteness();

      expect(report.integrityViolations.length).toBeGreaterThan(0);
      expect(report.constitutionalCompliance).toBe('FAIL');
    });
  });

  describe('AccuracyBaselineTracker', () => {
    beforeEach(() => {
      accuracyTracker.clearTestResults();
    });

    test('should register and verify Golden Masters', async () => {
      const goldenMaster = {
        id: 'GM_001',
        name: 'Casement 2x2 BOM',
        category: 'BOM' as const,
        inputs: { width: 1200, height: 1500 },
        expectedOutputHash: 'abc123',
        metadata: {
          egyptianTemplate: 'casement_2x2',
          complexity: 'simple' as const,
          createdDate: '2026-01-20'
        }
      };

      accuracyTracker.registerGoldenMaster(goldenMaster);

      expect(accuracyTracker.getGoldenMastersCount()).toBe(1);
    });

    test('should verify accuracy against Golden Masters', async () => {
      // Simple hash function for testing (browser-compatible)
      // Simple hash function for testing (browser-compatible)
      const sha256 = (data: string): string => {
        return crypto.createHash('sha256').update(data).digest('hex');
      };
      
      const output = { profiles: 10, cost: 1500 };
      // Serialize using same logic as implementation
      const serialized = JSON.stringify(output, (_, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          return Object.keys(value).sort().reduce((sorted, k) => {
            sorted[k] = value[k];
            return sorted;
          }, {} as any);
        }
        return value;
      });
      const hash = sha256(serialized);

      accuracyTracker.registerGoldenMaster({
        id: 'GM_002',
        name: 'Test BOM',
        category: 'BOM',
        inputs: {},
        expectedOutputHash: hash,
        metadata: {
          complexity: 'simple',
          createdDate: '2026-01-20'
        }
      });

      const result = await accuracyTracker.verifyAgainstGoldenMaster(
        'GM_002',
        output
      );

      expect(result.passed).toBe(true);
      expect(result.actualOutputHash).toBe(hash);
    });

    test('should calculate accuracy percentage', () => {
      accuracyTracker.clearTestResults();

      // Manually add test results
      const report = accuracyTracker.generateAccuracyReport([
        { goldenMasterId: 'GM1', passed: true, actualOutputHash: 'a', expectedOutputHash: 'a', duration: 10, timestamp: Date.now() },
        { goldenMasterId: 'GM2', passed: true, actualOutputHash: 'b', expectedOutputHash: 'b', duration: 10, timestamp: Date.now() },
        { goldenMasterId: 'GM3', passed: false, actualOutputHash: 'c', expectedOutputHash: 'x', duration: 10, timestamp: Date.now() }
      ]);

      expect(report.accuracy).toBe(66.66666666666666); // 2/3
      expect(report.constitutionalCompliance).toBe('FAIL'); // Below 99.8%
    });
  });

  describe('DeterministicExecutionTracker', () => {
    beforeEach(() => {
      deterministicExecutionTracker.clearMetrics();
    });

    test('should measure execution time with low variance for deterministic operations', async () => {
      const deterministicOp = () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      };

      const metric = await deterministicExecutionTracker.measureDeterministicOperation(
        'sumOperation',
        deterministicOp,
        3
      );

      expect(metric.runs).toBe(3);
      expect(metric.avgDuration).toBeGreaterThan(0);
      expect(metric.variance).toBeLessThan(50); // Should be fairly consistent
      expect(metric.result).toBe(499500);
    });

    test('should provide performance stats for operations', async () => {
      const op = () => ({ result: 42 });

      await deterministicExecutionTracker.measureSingleExecution(
        'testOp',
        op,
        'Tier 3'
      );

      await deterministicExecutionTracker.measureSingleExecution(
        'testOp',
        op,
        'Tier 3'
      );

      const stats = deterministicExecutionTracker.getOperationStats('testOp');

      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(2);
      expect(stats!.avgDuration).toBeGreaterThan(0);
    });
  });
});
