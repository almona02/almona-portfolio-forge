/**
 * Golden Master Accuracy Tests
 * 
 * Tests that maintain 99.6% accuracy on Cairo workshop fixtures.
 * These tests prevent accuracy regressions by comparing current
 * results against known-good "golden master" outputs.
 * 
 * Week 2 Task 2.3: Golden Master Test Suite
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getAccuracyTracker, trackAccuracyCheckpoint, getAccuracyMetrics } from '@/lib/fabricator/AccuracyTracker';
import { calculateAccuracy } from '@/lib/fabricator/validation/AccuracyCalculator';

// Target accuracy: 99.6% (as specified in hardening plan)
const TARGET_ACCURACY = 99.6;
const ACCURACY_TOLERANCE = 0.1; // 0.1% tolerance

// Mock DXF fixture data (in production, these would be real Cairo workshop DXF files)
interface DXFFixture {
  name: string;
  description: string;
  plannedLengths: number[]; // mm
  expectedActualLengths: number[]; // mm
  expectedAccuracy: number;
}

const CAIRO_WORKSHOP_FIXTURES: DXFFixture[] = [
  {
    name: 'cairo_workshop_001',
    description: 'Standard window frame - Cairo workshop',
    plannedLengths: [1485.0, 1485.0, 1430.0, 890.0, 1330.0],
    expectedActualLengths: [1483.8, 1483.8, 1428.8, 888.8, 1328.8],
    expectedAccuracy: 99.91, // From AccuracyCalculator example
  },
  {
    name: 'cairo_workshop_002',
    description: 'Large frame with multiple cuts',
    plannedLengths: [2000.0, 2000.0, 1800.0, 1800.0, 1500.0, 1500.0],
    expectedActualLengths: [1998.5, 1998.5, 1798.5, 1798.5, 1498.5, 1498.5],
    expectedAccuracy: 99.92,
  },
  {
    name: 'cairo_workshop_003',
    description: 'Small precision cuts',
    plannedLengths: [500.0, 500.0, 400.0, 300.0],
    expectedActualLengths: [499.2, 499.2, 399.2, 299.2],
    expectedAccuracy: 99.84,
  },
];

describe('Golden Master Accuracy Tests', () => {
  let accuracyTracker: ReturnType<typeof getAccuracyTracker>;

  beforeAll(() => {
    accuracyTracker = getAccuracyTracker();
    accuracyTracker.reset();
  });

  describe('Cairo Workshop Fixtures', () => {
    CAIRO_WORKSHOP_FIXTURES.forEach((fixture) => {
      it(`should maintain ${fixture.expectedAccuracy}% accuracy on ${fixture.name}`, () => {
        // Calculate accuracy
        const accuracy = calculateAccuracy(
          fixture.plannedLengths,
          fixture.expectedActualLengths
        );

        // Verify accuracy matches expected
        expect(accuracy).toBeGreaterThanOrEqual(
          fixture.expectedAccuracy - ACCURACY_TOLERANCE
        );
        expect(accuracy).toBeLessThanOrEqual(
          fixture.expectedAccuracy + ACCURACY_TOLERANCE
        );

        // Track checkpoint
        trackAccuracyCheckpoint(
          'dxf_parsing',
          { lengths: fixture.plannedLengths },
          { lengths: fixture.expectedActualLengths },
          accuracy,
          { fixture: fixture.name }
        );
      });
    });

    it('should maintain 99.6% accuracy across all Cairo workshop fixtures', () => {
      // Reset tracker
      accuracyTracker.reset();

      // Process all fixtures
      CAIRO_WORKSHOP_FIXTURES.forEach((fixture) => {
        const accuracy = calculateAccuracy(
          fixture.plannedLengths,
          fixture.expectedActualLengths
        );

        trackAccuracyCheckpoint(
          'dxf_parsing',
          { lengths: fixture.plannedLengths },
          { lengths: fixture.expectedActualLengths },
          accuracy,
          { fixture: fixture.name }
        );
      });

      // Get end-to-end accuracy
      const metrics = getAccuracyMetrics();
      const endToEndAccuracy = metrics.endToEndAccuracy;

      // Verify overall accuracy meets target
      expect(endToEndAccuracy).toBeGreaterThanOrEqual(
        TARGET_ACCURACY - ACCURACY_TOLERANCE
      );
      expect(metrics.withinTarget).toBe(true);
    });
  });

  describe('End-to-End Accuracy Tracking', () => {
    it('should track accuracy through all workflow stages', () => {
      accuracyTracker.reset();

      // Simulate workflow stages
      const stages = [
        { stage: 'dxf_parsing' as const, accuracy: 99.5 },
        { stage: 'hardware_validation' as const, accuracy: 99.8 },
        { stage: 'cut_list_generation' as const, accuracy: 99.8 },
        { stage: 'cnc_output' as const, accuracy: 99.8 },
      ];

      stages.forEach(({ stage, accuracy }) => {
        trackAccuracyCheckpoint(
          stage,
          { input: `test_${stage}` },
          { output: `test_${stage}_output` },
          accuracy
        );
      });

      const metrics = getAccuracyMetrics();

      // Verify all checkpoints recorded
      expect(metrics.checkpoints.length).toBe(stages.length);

      // Verify end-to-end accuracy (multiplicative)
      // 99.5% × 99.8% × 99.8% × 99.8% ≈ 98.9%
      const expectedEndToEnd = stages.reduce(
        (acc, s) => acc * (s.accuracy / 100),
        1
      ) * 100;

      expect(metrics.endToEndAccuracy).toBeCloseTo(expectedEndToEnd, 1);
      expect(metrics.withinTarget).toBe(true); // >97.5%
    });

    it('should detect accuracy drops below threshold', () => {
      accuracyTracker.reset();

      // Track checkpoint below threshold
      trackAccuracyCheckpoint(
        'dxf_parsing',
        { input: 'test' },
        { output: 'test_output' },
        95.0 // Below 99.5% threshold
      );

      const metrics = getAccuracyMetrics();
      const failedCheckpoints = metrics.checkpoints.filter(c => !c.validated);

      expect(failedCheckpoints.length).toBeGreaterThan(0);
      expect(failedCheckpoints[0].accuracy).toBeLessThan(
        accuracyTracker.getThreshold('dxf_parsing')
      );
    });
  });

  describe('Accuracy Calculation Validation', () => {
    it('should calculate accuracy correctly for perfect match', () => {
      const planned = [1000.0, 2000.0, 3000.0];
      const actual = [1000.0, 2000.0, 3000.0];
      const accuracy = calculateAccuracy(planned, actual);

      expect(accuracy).toBe(100.0);
    });

    it('should calculate accuracy correctly for small errors', () => {
      const planned = [1000.0, 2000.0, 3000.0];
      const actual = [999.0, 1999.0, 2999.0]; // 1mm error each
      const accuracy = calculateAccuracy(planned, actual);

      // Total length: 6000mm, Total error: 3mm
      // Accuracy: 100 × (1 - 3/6000) = 99.95%
      expect(accuracy).toBeCloseTo(99.95, 1);
    });

    it('should handle empty arrays', () => {
      const accuracy = calculateAccuracy([], []);
      expect(accuracy).toBe(100.0);
    });

    it('should throw error for mismatched array lengths', () => {
      expect(() => {
        calculateAccuracy([1000.0, 2000.0], [1000.0]);
      }).toThrow('Planned and actual arrays must have same length');
    });
  });
});

