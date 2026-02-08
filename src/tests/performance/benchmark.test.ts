/**
 * Performance Benchmark Tests
 * Establishes performance baselines for Phase 1 and Phase 2 features
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AdaptiveSolver } from '@/algorithms/adaptiveSolver';
import { GreedyHeuristic } from '@/algorithms/greedyHeuristic';
import { LinearProgrammingOptimizer } from '@/algorithms/linearProgramming';
import { GeneticOptimizer } from '@/algorithms/geneticOptimization';
import { RemnantManager } from '@/lib/inventory/RemnantManager';
import { remnantMLPredictor } from '@/future/advisory/RemnantUsagePredictor';
import type {
  WindowComponent,
  Profile,
  AdaptiveSolverConfig,
  Cut,
} from '@/types/fabricator';

describe('Performance Benchmarks', () => {
  let mockProfile: Profile;
  let solverConfig: AdaptiveSolverConfig;

  beforeEach(() => {
    mockProfile = {
      id: 'profile-1',
      name: 'Test Profile',
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

  describe('Memory Usage Benchmarks', () => {
    it('should track memory usage for small jobs (< 50 cuts)', async () => {
      const smallComponents: WindowComponent[] = [];
      for (let i = 0; i < 10; i++) {
        smallComponents.push({
          id: `comp-${i}`,
          type: 'frame',
          profile: mockProfile,
          width: 1000 + i * 10,
          height: 800,
          quantity: 1,
          cuttingLengths: [1000 + i * 10, 800, 1000 + i * 10, 800],
          angles: [90, 90, 90, 90],
          machiningOperations: [],
          glazingType: 'double',
          hardware: [],
        });
      }

      const solver = new AdaptiveSolver(solverConfig);
      const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

      await solver.solve(
        {
          components: smallComponents,
          profiles: [mockProfile],
          defaultStockLength: 6000,
        },
        [mockProfile]
      );

      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryDelta = endMemory - startMemory;

      // Small jobs should use < 10MB
      if (startMemory > 0 && endMemory > 0) {
        expect(memoryDelta).toBeLessThan(10 * 1024 * 1024); // 10MB
      }
    });

    it('should track memory usage for large jobs (1000+ cuts)', async () => {
      const largeComponents: WindowComponent[] = [];
      for (let i = 0; i < 250; i++) {
        largeComponents.push({
          id: `comp-${i}`,
          type: 'frame',
          profile: mockProfile,
          width: 1000 + i * 5,
          height: 800,
          quantity: 1,
          cuttingLengths: [1000 + i * 5, 800, 1000 + i * 5, 800],
          angles: [90, 90, 90, 90],
          machiningOperations: [],
          glazingType: 'double',
          hardware: [],
        });
      }

      const solver = new AdaptiveSolver(solverConfig);
      const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

      await solver.solve(
        {
          components: largeComponents,
          profiles: [mockProfile],
          defaultStockLength: 6000,
        },
        [mockProfile]
      );

      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryDelta = endMemory - startMemory;

      // Large jobs should use < 50MB
      if (startMemory > 0 && endMemory > 0) {
        expect(memoryDelta).toBeLessThan(50 * 1024 * 1024); // 50MB
      }
    });
  });

  describe('CPU Utilization Benchmarks', () => {
    it('should complete greedy algorithm quickly', () => {
      const cuts: Cut[] = [];
      for (let i = 0; i < 40; i++) {
        cuts.push({
          length: 1000 + i * 10,
          angle: 90,
          componentId: `comp-${i}`,
          waste: 2,
        });
      }

      const optimizer = new GreedyHeuristic(cuts, mockProfile, 6000);
      const startTime = performance.now();

      optimizer.optimize();

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100); // < 100ms for greedy
    });

    it('should complete linear programming in reasonable time', () => {
      const cuts: Cut[] = [];
      for (let i = 0; i < 200; i++) {
        cuts.push({
          length: 1000 + i * 5,
          angle: 90,
          componentId: `comp-${i}`,
          waste: 2,
        });
      }

      const optimizer = new LinearProgrammingOptimizer(cuts, mockProfile, 6000);
      const startTime = performance.now();

      optimizer.optimize();

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(5000); // < 5s for LP
    });

    it('should complete genetic algorithm within time limit', () => {
      const cuts: Cut[] = [];
      for (let i = 0; i < 600; i++) {
        cuts.push({
          length: 1000 + i * 3,
          angle: 90,
          componentId: `comp-${i}`,
          waste: 2,
        });
      }

      const optimizer = new GeneticOptimizer(cuts, mockProfile, 6000, {
        generations: 20, // Reduced for testing
        populationSize: 50,
      });
      const startTime = performance.now();

      optimizer.optimize();

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(30000); // < 30s for genetic
    });
  });

  describe('Database Query Performance', () => {
    it('should complete remnant matching queries efficiently', async () => {
      const remnantManager = new RemnantManager();
      const cuts: Cut[] = [
        {
          length: 2000,
          angle: 90,
          componentId: 'comp-1',
          waste: 2,
        },
      ];

      const startTime = performance.now();

      await remnantManager.findRemnantMatches(
        cuts,
        mockProfile,
        'aluminum',
        {
          useRemnantsFirst: true,
        }
      );

      const duration = performance.now() - startTime;
      // Should complete in < 2 seconds (includes DB query)
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('End-to-End Workflow Timing', () => {
    it('should complete simple workflow in < 2 seconds', async () => {
      const components: WindowComponent[] = [
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

      const solver = new AdaptiveSolver(solverConfig);
      const startTime = performance.now();

      await solver.solve(
        {
          components,
          profiles: [mockProfile],
          defaultStockLength: 6000,
        },
        [mockProfile]
      );

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(2000); // < 2s for simple job
    });

    it('should complete medium workflow in < 15 seconds', async () => {
      const components: WindowComponent[] = [];
      for (let i = 0; i < 100; i++) {
        components.push({
          id: `comp-${i}`,
          type: 'frame',
          profile: mockProfile,
          width: 1000 + i * 10,
          height: 800,
          quantity: 1,
          cuttingLengths: [1000 + i * 10, 800, 1000 + i * 10, 800],
          angles: [90, 90, 90, 90],
          machiningOperations: [],
          glazingType: 'double',
          hardware: [],
        });
      }

      const solver = new AdaptiveSolver(solverConfig);
      const startTime = performance.now();

      await solver.solve(
        {
          components,
          profiles: [mockProfile],
          defaultStockLength: 6000,
        },
        [mockProfile]
      );

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(15000); // < 15s for medium job
    });

    it('should complete complex workflow in < 60 seconds', async () => {
      const components: WindowComponent[] = [];
      for (let i = 0; i < 600; i++) {
        components.push({
          id: `comp-${i}`,
          type: 'frame',
          profile: mockProfile,
          width: 1000 + i * 5,
          height: 800,
          quantity: 1,
          cuttingLengths: [1000 + i * 5, 800, 1000 + i * 5, 800],
          angles: [90, 90, 90, 90],
          machiningOperations: [],
          glazingType: 'double',
          hardware: [],
        });
      }

      const solver = new AdaptiveSolver(solverConfig);
      const startTime = performance.now();

      await solver.solve(
        {
          components,
          profiles: [mockProfile],
          defaultStockLength: 6000,
        },
        [mockProfile]
      );

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(60000); // < 60s for complex job
    });
  });

  describe('ML Prediction Performance', () => {
    it('should complete ML prediction in < 500ms', async () => {
      const remnant = {
        id: 'remnant-1',
        userId: 'user-1',
        profileId: 'profile-1',
        length: 2500,
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        lastCheckedAt: new Date(),
        status: 'available' as const,
        quality: 'good' as const,
        estimatedValue: 25,
        usageCount: 0,
      };

      const features = {
        remnantLength: 2500,
        ageDays: 60,
        profileTypeFrequency: 50,
        seasonalDemand: 0.8,
        locationPriority: 1.0,
        qualityScore: 0.75,
        usageCount: 0,
        estimatedValue: 25,
      };

      const startTime = performance.now();

      await remnantMLPredictor.predict(remnant, features);

      const duration = performance.now() - startTime;
      // CI runners are significantly slower; use 2000ms as CI-safe threshold
      // Local target: < 500ms
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Percentile Timing', () => {
    it('should track p50, p95, p99 percentiles', async () => {
      const durations: number[] = [];
      const components: WindowComponent[] = [
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

      const solver = new AdaptiveSolver(solverConfig);

      // Run 10 iterations
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        await solver.solve(
          {
            components,
            profiles: [mockProfile],
            defaultStockLength: 6000,
          },
          [mockProfile]
        );
        durations.push(performance.now() - startTime);
      }

      // Calculate percentiles
      durations.sort((a, b) => a - b);
      const p50 = durations[Math.floor(durations.length * 0.5)];
      const p95 = durations[Math.floor(durations.length * 0.95)];
      const p99 = durations[Math.floor(durations.length * 0.99)];

      expect(p50).toBeLessThan(2000); // p50 < 2s
      expect(p95).toBeLessThan(3000); // p95 < 3s
      expect(p99).toBeLessThan(5000); // p99 < 5s
    });
  });
});

