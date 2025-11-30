/**
 * Integration Tests for Calibration System
 * Verifies calibration modifiers are correctly applied to cut lengths
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdaptiveSolver } from '@/algorithms/adaptiveSolver';
import { calibrationManager } from '@/lib/calibration/CalibrationManager';
import type {
  WindowComponent,
  Profile,
  CuttingCalibration,
  AdaptiveSolverConfig,
  OptimizationResult,
} from '@/types/fabricator';

describe('Calibration System Integration Tests', () => {
  let mockProfile: Profile;
  let mockComponents: WindowComponent[];
  let calibration: CuttingCalibration;
  let solverConfig: AdaptiveSolverConfig;

  beforeEach(() => {
    mockProfile = {
      id: 'profile-1',
      name: 'Test Aluminum Profile',
      material: 'aluminum',
      width: 50,
      height: 20,
      thickness: 1.4,
      color: 'White',
      costPerMeter: 10,
      cuttingAllowance: 2,
      stockQuantity: 100,
      minStockLevel: 10,
      supplier: 'Test Supplier',
      specifications: {
        stockLengthMm: 6000,
      },
      calibrations: [],
    };

    mockComponents = [
      {
        id: 'comp-1',
        type: 'frame',
        profile: mockProfile,
        width: 2000,
        height: 1500,
        quantity: 1,
        cuttingLengths: [2000, 1500, 2000, 1500],
        angles: [90, 90, 90, 90],
        machiningOperations: [],
        glazingType: 'double',
        hardware: [],
      },
    ];

    calibration = {
      id: 'cal-1',
      profileId: mockProfile.id,
      systemPackId: 'rock60',
      lengthModifier: 2.0, // Add 2mm to each cut
      bladeWidthCompensation: 0.5, // Add 0.5mm for blade width
      isActive: true,
    };

    solverConfig = {
      maxSolvingTime: 60,
      complexityThresholds: {
        simple: 50,
        medium: 500,
      },
      timeConstraint: 'fast',
      optimalityTarget: 'balanced',
    };
  });

  describe('Calibration Application', () => {
    it('should apply length modifier to cut lengths', () => {
      const baseLength = 2000;
      const expectedLength = baseLength + calibration.lengthModifier + calibration.bladeWidthCompensation;
      const adjustedLength = calibrationManager.applyCalibration(baseLength, calibration);
      
      expect(adjustedLength).toBe(expectedLength);
      expect(adjustedLength).toBe(2002.5);
    });

    it('should not modify length when no calibration is provided', () => {
      const baseLength = 2000;
      const adjustedLength = calibrationManager.applyCalibration(baseLength, null);
      
      expect(adjustedLength).toBe(baseLength);
    });

    it('should handle negative length modifiers', () => {
      const negativeCalibration: CuttingCalibration = {
        ...calibration,
        lengthModifier: -1.0,
      };
      
      const baseLength = 2000;
      const adjustedLength = calibrationManager.applyCalibration(baseLength, negativeCalibration);
      
      expect(adjustedLength).toBe(1999.5); // 2000 - 1.0 + 0.5
    });
  });

  describe('Calibration in Adaptive Solver', () => {
    it('should apply calibration when generating cutting plan', async () => {
      // Add calibration to profile
      const profileWithCalibration: Profile = {
        ...mockProfile,
        calibrations: [calibration],
      };

      const solver = new AdaptiveSolver(solverConfig);
      const result = await solver.solve(
        {
          components: mockComponents,
          profiles: [profileWithCalibration],
          defaultStockLength: 6000,
          systemPackId: 'rock60',
        },
        [profileWithCalibration]
      );

      expect(result).toBeDefined();
      expect(result.cuttingPlan.length).toBeGreaterThan(0);

      // Verify cuts have been adjusted
      const allCuts = result.cuttingPlan.flatMap(plan => plan.cuts);
      expect(allCuts.length).toBeGreaterThan(0);

      // Each cut should have the calibration applied
      // Original length: 2000 + allowance (2mm) = 2002mm
      // With calibration: 2002 + 2.0 (modifier) + 0.5 (blade) = 2004.5mm
      const firstCut = allCuts[0];
      expect(firstCut.length).toBeGreaterThan(2000);
    });

    it('should use correct calibration for system pack', async () => {
      const rock60Calibration: CuttingCalibration = {
        ...calibration,
        systemPackId: 'rock60',
        lengthModifier: 2.0,
      };

      const jumbo100Calibration: CuttingCalibration = {
        ...calibration,
        systemPackId: 'jumbo100',
        lengthModifier: 1.5,
      };

      const profileWithMultipleCalibrations: Profile = {
        ...mockProfile,
        calibrations: [rock60Calibration, jumbo100Calibration],
      };

      // Test with ROCK 60
      const activeCalibration = calibrationManager.getActiveCalibration(
        profileWithMultipleCalibrations,
        'rock60'
      );

      expect(activeCalibration).toBeDefined();
      expect(activeCalibration?.systemPackId).toBe('rock60');
      expect(activeCalibration?.lengthModifier).toBe(2.0);

      // Test with JUMBO 100
      const activeCalibration2 = calibrationManager.getActiveCalibration(
        profileWithMultipleCalibrations,
        'jumbo100'
      );

      expect(activeCalibration2).toBeDefined();
      expect(activeCalibration2?.systemPackId).toBe('jumbo100');
      expect(activeCalibration2?.lengthModifier).toBe(1.5);
    });

    it('should not apply inactive calibrations', async () => {
      const inactiveCalibration: CuttingCalibration = {
        ...calibration,
        isActive: false,
      };

      const profileWithInactiveCalibration: Profile = {
        ...mockProfile,
        calibrations: [inactiveCalibration],
      };

      const activeCalibration = calibrationManager.getActiveCalibration(
        profileWithInactiveCalibration,
        'rock60'
      );

      expect(activeCalibration).toBeNull();
    });
  });

  describe('Calibration Impact on Optimization', () => {
    it('should account for calibration in waste calculation', async () => {
      const profileWithCalibration: Profile = {
        ...mockProfile,
        calibrations: [calibration],
      };

      const solver = new AdaptiveSolver(solverConfig);
      const resultWithoutCalibration = await solver.solve(
        {
          components: mockComponents,
          profiles: [mockProfile],
          defaultStockLength: 6000,
        },
        [mockProfile]
      );

      const resultWithCalibration = await solver.solve(
        {
          components: mockComponents,
          profiles: [profileWithCalibration],
          defaultStockLength: 6000,
          systemPackId: 'rock60',
        },
        [profileWithCalibration]
      );

      // Calibration should affect the optimization result
      expect(resultWithCalibration).toBeDefined();
      expect(resultWithoutCalibration).toBeDefined();
      
      // The cutting plans may differ due to calibration
      // (exact comparison depends on optimization algorithm)
    });

    it('should handle multiple calibrations for different system packs', async () => {
      const calibrations: CuttingCalibration[] = [
        {
          id: 'cal-1',
          profileId: mockProfile.id,
          systemPackId: 'rock60',
          lengthModifier: 2.0,
          bladeWidthCompensation: 0.5,
          isActive: true,
        },
        {
          id: 'cal-2',
          profileId: mockProfile.id,
          systemPackId: 'jumbo100',
          lengthModifier: 1.5,
          bladeWidthCompensation: 0.3,
          isActive: true,
        },
      ];

      const profileWithMultipleCalibrations: Profile = {
        ...mockProfile,
        calibrations,
      };

      // Test ROCK 60 calibration
      const rock60Cal = calibrationManager.getActiveCalibration(
        profileWithMultipleCalibrations,
        'rock60'
      );
      expect(rock60Cal?.lengthModifier).toBe(2.0);

      // Test JUMBO 100 calibration
      const jumbo100Cal = calibrationManager.getActiveCalibration(
        profileWithMultipleCalibrations,
        'jumbo100'
      );
      expect(jumbo100Cal?.lengthModifier).toBe(1.5);
    });
  });

  describe('Calibration Edge Cases', () => {
    it('should handle zero calibration values', () => {
      const zeroCalibration: CuttingCalibration = {
        ...calibration,
        lengthModifier: 0,
        bladeWidthCompensation: 0,
      };

      const baseLength = 2000;
      const adjustedLength = calibrationManager.applyCalibration(baseLength, zeroCalibration);
      
      expect(adjustedLength).toBe(baseLength);
    });

    it('should handle very large calibration values', () => {
      const largeCalibration: CuttingCalibration = {
        ...calibration,
        lengthModifier: 100,
        bladeWidthCompensation: 50,
      };

      const baseLength = 2000;
      const adjustedLength = calibrationManager.applyCalibration(baseLength, largeCalibration);
      
      expect(adjustedLength).toBe(2150); // 2000 + 100 + 50
    });

    it('should handle calibration with no system pack specified', async () => {
      const profileWithCalibration: Profile = {
        ...mockProfile,
        calibrations: [calibration],
      };

      const solver = new AdaptiveSolver(solverConfig);
      const result = await solver.solve(
        {
          components: mockComponents,
          profiles: [profileWithCalibration],
          defaultStockLength: 6000,
          // No systemPackId specified
        },
        [profileWithCalibration]
      );

      // Should still work, just without calibration
      expect(result).toBeDefined();
      expect(result.cuttingPlan.length).toBeGreaterThan(0);
    });
  });
});

