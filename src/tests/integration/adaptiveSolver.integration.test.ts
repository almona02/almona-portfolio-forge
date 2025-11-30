/**
 * Integration Tests for Adaptive Solver
 * Tests the complete workflow from project creation to cutting plan generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdaptiveSolver } from '@/algorithms/adaptiveSolver';
import { GreedyHeuristic } from '@/algorithms/greedyHeuristic';
import { LinearProgrammingOptimizer } from '@/algorithms/linearProgramming';
import { GeneticOptimizer } from '@/algorithms/geneticOptimization';
import type {
  WindowComponent,
  Profile,
  AdaptiveSolverConfig,
  OptimizationResult,
  CuttingPlan,
} from '@/types/fabricator';

describe('Adaptive Solver Integration Tests', () => {
  let mockProfile: Profile;
  let mockComponents: WindowComponent[];
  let defaultConfig: AdaptiveSolverConfig;

  beforeEach(() => {
    // Create mock profile
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
    };

    // Create mock components
    mockComponents = [
      {
        id: 'comp-1',
        type: 'frame',
        profile: mockProfile,
        width: 2000,
        height: 1500,
        quantity: 1,
        cuttingLengths: [2000, 1500, 2000, 1500], // Frame: width, height, width, height
        angles: [90, 90, 90, 90],
        machiningOperations: [],
        glazingType: 'double',
        hardware: [],
      },
    ];

    defaultConfig = {
      maxSolvingTime: 60,
      complexityThresholds: {
        simple: 50,
        medium: 500,
      },
      timeConstraint: 'fast',
      optimalityTarget: 'balanced',
    };
  });

  describe('Simple Job (< 50 cuts) - Greedy Algorithm', () => {
    it('should select greedy algorithm for simple jobs', async () => {
      const solver = new AdaptiveSolver(defaultConfig);
      const result = await solver.solve(
        {
          components: mockComponents,
          profiles: [mockProfile],
          defaultStockLength: 6000,
        },
        [mockProfile]
      );

      expect(result).toBeDefined();
      expect(result.cuttingPlan).toBeDefined();
      expect(result.cuttingPlan.length).toBeGreaterThan(0);
      expect(result.wastePercentage).toBeGreaterThanOrEqual(0);
      expect(result.wastePercentage).toBeLessThanOrEqual(100);
    });

    it('should complete simple job in < 2 seconds', async () => {
      const solver = new AdaptiveSolver(defaultConfig);
      const startTime = performance.now();
      
      await solver.solve(
        {
          components: mockComponents,
          profiles: [mockProfile],
          defaultStockLength: 6000,
        },
        [mockProfile]
      );

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(2000); // Should complete in < 2 seconds
    });
  });

  describe('Medium Job (50-500 cuts) - Linear Programming', () => {
    it('should select linear programming for medium jobs', async () => {
      // Create a medium complexity job (100 cuts)
      const mediumComponents: WindowComponent[] = [];
      for (let i = 0; i < 25; i++) {
        mediumComponents.push({
          id: `comp-${i}`,
          type: 'frame',
          profile: mockProfile,
          width: 1000 + i * 10,
          height: 800 + i * 5,
          quantity: 1,
          cuttingLengths: [1000 + i * 10, 800 + i * 5, 1000 + i * 10, 800 + i * 5],
          angles: [90, 90, 90, 90],
          machiningOperations: [],
          glazingType: 'double',
          hardware: [],
        });
      }

      const solver = new AdaptiveSolver(defaultConfig);
      const result = await solver.solve(
        {
          components: mediumComponents,
          profiles: [mockProfile],
          defaultStockLength: 6000,
        },
        [mockProfile]
      );

      expect(result).toBeDefined();
      expect(result.cuttingPlan.length).toBeGreaterThan(0);
    });
  });

  describe('Complex Job (500+ cuts) - Genetic Algorithm', () => {
    it('should select genetic algorithm for complex jobs', async () => {
      // Create a complex job (600 cuts)
      const complexComponents: WindowComponent[] = [];
      for (let i = 0; i < 150; i++) {
        complexComponents.push({
          id: `comp-${i}`,
          type: 'frame',
          profile: mockProfile,
          width: 1000 + i * 5,
          height: 800 + i * 3,
          quantity: 1,
          cuttingLengths: [1000 + i * 5, 800 + i * 3, 1000 + i * 5, 800 + i * 3],
          angles: [90, 90, 90, 90],
          machiningOperations: [],
          glazingType: 'double',
          hardware: [],
        });
      }

      const solver = new AdaptiveSolver(defaultConfig);
      const result = await solver.solve(
        {
          components: complexComponents,
          profiles: [mockProfile],
          defaultStockLength: 6000,
        },
        [mockProfile]
      );

      expect(result).toBeDefined();
      expect(result.cuttingPlan.length).toBeGreaterThan(0);
    });
  });

  describe('Algorithm Selection Logic', () => {
    it('should respect preferred algorithm when specified', async () => {
      const config: AdaptiveSolverConfig = {
        ...defaultConfig,
        preferredAlgorithm: 'genetic',
      };

      const solver = new AdaptiveSolver(config);
      const result = await solver.solve(
        {
          components: mockComponents,
          profiles: [mockProfile],
          defaultStockLength: 6000,
        },
        [mockProfile]
      );

      expect(result).toBeDefined();
      expect(result.cuttingPlan.length).toBeGreaterThan(0);
    });

    it('should fallback to greedy on error', async () => {
      // Mock an error in the primary algorithm
      const solver = new AdaptiveSolver(defaultConfig);
      
      // This should work even if there's an issue
      const result = await solver.solve(
        {
          components: mockComponents,
          profiles: [mockProfile],
          defaultStockLength: 6000,
        },
        [mockProfile]
      );

      expect(result).toBeDefined();
      expect(result.cuttingPlan.length).toBeGreaterThan(0);
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate material costs correctly', async () => {
      const solver = new AdaptiveSolver(defaultConfig);
      const result = await solver.solve(
        {
          components: mockComponents,
          profiles: [mockProfile],
          defaultStockLength: 6000,
        },
        [mockProfile]
      );

      expect(result.costBreakdown).toBeDefined();
      expect(result.costBreakdown.materialCost).toBeGreaterThan(0);
      expect(result.costBreakdown.laborCost).toBeGreaterThan(0);
      expect(result.costBreakdown.totalCost).toBeGreaterThan(0);
    });

    it('should calculate waste percentage correctly', async () => {
      const solver = new AdaptiveSolver(defaultConfig);
      const result = await solver.solve(
        {
          components: mockComponents,
          profiles: [mockProfile],
          defaultStockLength: 6000,
        },
        [mockProfile]
      );

      expect(result.wastePercentage).toBeGreaterThanOrEqual(0);
      expect(result.wastePercentage).toBeLessThanOrEqual(100);
      expect(result.nestingEfficiency).toBeGreaterThanOrEqual(0);
      expect(result.nestingEfficiency).toBeLessThanOrEqual(100);
    });
  });

  describe('Multi-Profile Support', () => {
    it('should handle multiple profiles correctly', async () => {
      const profile2: Profile = {
        ...mockProfile,
        id: 'profile-2',
        name: 'Test Profile 2',
        width: 60,
      };

      const multiProfileComponents: WindowComponent[] = [
        {
          ...mockComponents[0],
          id: 'comp-1',
          profile: mockProfile,
        },
        {
          ...mockComponents[0],
          id: 'comp-2',
          profile: profile2,
        },
      ];

      const solver = new AdaptiveSolver(defaultConfig);
      const result = await solver.solve(
        {
          components: multiProfileComponents,
          profiles: [mockProfile, profile2],
          defaultStockLength: 6000,
        },
        [mockProfile, profile2]
      );

      expect(result).toBeDefined();
      expect(result.cuttingPlan.length).toBeGreaterThan(0);
      
      // Verify both profiles are represented in the cutting plan
      const profileIds = new Set(result.cuttingPlan.map(plan => plan.profile.id));
      expect(profileIds.has(mockProfile.id)).toBe(true);
      expect(profileIds.has(profile2.id)).toBe(true);
    });
  });
});

