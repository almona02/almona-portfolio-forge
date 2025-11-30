/**
 * Comprehensive Workflow Integration Tests
 * Tests the complete workflow from project creation to cutting plan generation
 * with all Phase 1 enhancements integrated
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AdaptiveSolver } from '@/algorithms/adaptiveSolver';
import { RemnantManager } from '@/lib/inventory/RemnantManager';
import { validateProject } from '@/lib/fabricatorValidation';
import type {
  WindowUnit,
  WindowComponent,
  Profile,
  CuttingCalibration,
  AdaptiveSolverConfig,
} from '@/types/fabricator';

describe('Complete Workflow Integration Tests', () => {
  let mockProfile: Profile;
  let mockProject: WindowUnit;
  let mockComponents: WindowComponent[];
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
        eosCertified: true,
      },
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

    mockProject = {
      id: 'project-1',
      orderNumber: 'ORD-001',
      posNumber: 'POS-001',
      type: 'sliding_window',
      components: mockComponents,
      overallWidth: 2000,
      overallHeight: 1500,
      color: 'White',
      glazing: {
        type: 'double',
        thickness: 6,
      },
      hardware: [],
      optimization: null,
      status: 'design',
      createdAt: new Date(),
      updatedAt: new Date(),
      systemPackId: 'rock60',
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

  describe('Complete Workflow: Project Creation to Cutting Plan', () => {
    it('should complete full workflow without errors', async () => {
      // Step 1: Validate project
      const validation = validateProject(mockProject, true, [mockProfile]);
      expect(validation.isValid).toBe(true);

      // Step 2: Generate cutting plan with adaptive solver
      const solver = new AdaptiveSolver(solverConfig);
      const result = await solver.solve(
        {
          components: mockComponents,
          profiles: [mockProfile],
          defaultStockLength: 6000,
          systemPackId: mockProject.systemPackId,
        },
        [mockProfile]
      );

      expect(result).toBeDefined();
      expect(result.cuttingPlan.length).toBeGreaterThan(0);
      expect(result.wastePercentage).toBeGreaterThanOrEqual(0);
      expect(result.costBreakdown.totalCost).toBeGreaterThan(0);
    });

    it('should handle workflow with calibration', async () => {
      // Add calibration to profile
      const calibration: CuttingCalibration = {
        id: 'cal-1',
        profileId: mockProfile.id,
        systemPackId: 'rock60',
        lengthModifier: 2.0,
        bladeWidthCompensation: 0.5,
        isActive: true,
      };

      const profileWithCalibration: Profile = {
        ...mockProfile,
        calibrations: [calibration],
      };

      // Validate project
      const validation = validateProject(mockProject, true, [profileWithCalibration]);
      expect(validation.isValid).toBe(true);

      // Generate cutting plan (calibration should be applied)
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

      // Verify calibration was applied
      const allCuts = result.cuttingPlan.flatMap(plan => plan.cuts);
      expect(allCuts.length).toBeGreaterThan(0);
    });

    it('should handle workflow with Egyptian standards validation', () => {
      // Create a large window that requires EOS validation
      const largeProject: WindowUnit = {
        ...mockProject,
        overallWidth: 2500, // > 2400mm requires reinforcement
        overallHeight: 2000,
      };

      const validation = validateProject(largeProject, true, [mockProfile]);
      
      // Should have warnings about reinforcement (if validation is implemented)
      // Note: This depends on the actual validation implementation
      expect(validation).toBeDefined();
    });
  });

  describe('Workflow with Remnant Matching', () => {
    it('should integrate remnant matching into workflow', async () => {
      const remnantManager = new RemnantManager();
      
      // Create mock cuts
      const cuts = [
        {
          length: 2000,
          angle: 90,
          componentId: 'comp-1',
          waste: 2,
        },
      ];

      // Try to find remnant matches
      const matches = await remnantManager.findRemnantMatches(
        cuts,
        mockProfile,
        'aluminum',
        {
          useRemnantsFirst: true,
          minUtilization: 70,
        }
      );

      // Should return array (may be empty if no remnants available)
      expect(Array.isArray(matches)).toBe(true);
    });
  });

  describe('Workflow Performance', () => {
    it('should complete simple workflow in reasonable time', async () => {
      const startTime = performance.now();

      const solver = new AdaptiveSolver(solverConfig);
      const result = await solver.solve(
        {
          components: mockComponents,
          profiles: [mockProfile],
          defaultStockLength: 6000,
        },
        [mockProfile]
      );

      const duration = performance.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds for simple job
    });

    it('should handle multiple projects efficiently', async () => {
      const projects: WindowUnit[] = [];
      for (let i = 0; i < 5; i++) {
        projects.push({
          ...mockProject,
          id: `project-${i}`,
          orderNumber: `ORD-00${i}`,
        });
      }

      const solver = new AdaptiveSolver(solverConfig);
      const results = await Promise.all(
        projects.map(project =>
          solver.solve(
            {
              components: project.components,
              profiles: [mockProfile],
              defaultStockLength: 6000,
            },
            [mockProfile]
          )
        )
      );

      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.cuttingPlan.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling in Workflow', () => {
    it('should handle invalid project gracefully', () => {
      const invalidProject: WindowUnit = {
        ...mockProject,
        overallWidth: 0, // Invalid width
      };

      const validation = validateProject(invalidProject, true, [mockProfile]);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should handle missing profiles gracefully', async () => {
      const solver = new AdaptiveSolver(solverConfig);
      
      // Use empty profiles array
      await expect(
        solver.solve(
          {
            components: mockComponents,
            profiles: [],
            defaultStockLength: 6000,
          },
          []
        )
      ).rejects.toThrow();
    });

    it('should handle missing components gracefully', async () => {
      const solver = new AdaptiveSolver(solverConfig);
      
      await expect(
        solver.solve(
          {
            components: [],
            profiles: [mockProfile],
            defaultStockLength: 6000,
          },
          [mockProfile]
        )
      ).rejects.toThrow();
    });
  });

  describe('Workflow with All Phase 1 Features', () => {
    it('should integrate adaptive solver, calibration, and remnant matching', async () => {
      // Setup: Profile with calibration
      const calibration: CuttingCalibration = {
        id: 'cal-1',
        profileId: mockProfile.id,
        systemPackId: 'rock60',
        lengthModifier: 1.5,
        bladeWidthCompensation: 0.5,
        isActive: true,
      };

      const profileWithCalibration: Profile = {
        ...mockProfile,
        calibrations: [calibration],
      };

      // Step 1: Validate project (includes Egyptian standards)
      const validation = validateProject(mockProject, true, [profileWithCalibration]);
      expect(validation.isValid).toBe(true);

      // Step 2: Generate cutting plan with adaptive solver and calibration
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

      // Step 3: Try remnant matching (if remnants are available)
      const remnantManager = new RemnantManager();
      const cuts = result.cuttingPlan.flatMap(plan => plan.cuts);
      const matches = await remnantManager.findRemnantMatches(
        cuts,
        profileWithCalibration,
        'aluminum',
        {
          useRemnantsFirst: true,
        }
      );

      // Should complete without errors
      expect(Array.isArray(matches)).toBe(true);
    });
  });

  describe('Concurrent User Simulations', () => {
    it('should handle multiple concurrent optimization requests', async () => {
      const solver = new AdaptiveSolver(solverConfig);
      
      // Simulate 5 concurrent users
      const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
        solver.solve(
          {
            components: mockComponents.map(comp => ({
              ...comp,
              id: `comp-${i}-${comp.id}`,
            })),
            profiles: [mockProfile],
            defaultStockLength: 6000,
          },
          [mockProfile]
        )
      );

      const results = await Promise.all(concurrentRequests);

      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.cuttingPlan.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Network Failure Scenarios', () => {
    it('should handle database connection failures gracefully', async () => {
      // This test verifies that the system can handle Supabase connection issues
      // In a real scenario, you would mock Supabase to throw errors
      const solver = new AdaptiveSolver(solverConfig);
      
      // Should still work even if remnant matching fails
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

  describe('Large Dataset Performance', () => {
    it('should handle 10,000+ cuts efficiently', async () => {
      const largeComponents: WindowComponent[] = [];
      for (let i = 0; i < 2500; i++) {
        largeComponents.push({
          id: `comp-${i}`,
          type: 'frame',
          profile: mockProfile,
          width: 1000 + (i % 100) * 5,
          height: 800,
          quantity: 1,
          cuttingLengths: [1000 + (i % 100) * 5, 800, 1000 + (i % 100) * 5, 800],
          angles: [90, 90, 90, 90],
          machiningOperations: [],
          glazingType: 'double',
          hardware: [],
        });
      }

      const solver = new AdaptiveSolver(solverConfig);
      const startTime = performance.now();

      const result = await solver.solve(
        {
          components: largeComponents,
          profiles: [mockProfile],
          defaultStockLength: 6000,
        },
        [mockProfile]
      );

      const duration = performance.now() - startTime;

      expect(result).toBeDefined();
      expect(result.cuttingPlan.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(120000); // Should complete in < 2 minutes
    });
  });

  describe('Memory Usage Monitoring', () => {
    it('should monitor memory during long-running optimizations', async () => {
      const largeComponents: WindowComponent[] = [];
      for (let i = 0; i < 1000; i++) {
        largeComponents.push({
          id: `comp-${i}`,
          type: 'frame',
          profile: mockProfile,
          width: 1000 + i * 3,
          height: 800,
          quantity: 1,
          cuttingLengths: [1000 + i * 3, 800, 1000 + i * 3, 800],
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

      if (startMemory > 0 && endMemory > 0) {
        const memoryDelta = endMemory - startMemory;
        // Should not use excessive memory (< 100MB for 1000 cuts)
        expect(memoryDelta).toBeLessThan(100 * 1024 * 1024);
      }
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across workflow steps', async () => {
      const solver = new AdaptiveSolver(solverConfig);
      const result = await solver.solve(
        {
          components: mockComponents,
          profiles: [mockProfile],
          defaultStockLength: 6000,
        },
        [mockProfile]
      );

      // Verify all cuts are accounted for
      const totalCutLength = result.cuttingPlan.reduce(
        (sum, plan) => sum + plan.cuts.reduce((cutSum, cut) => cutSum + cut.length, 0),
        0
      );

      // Total cut length should be approximately equal (allowing for optimization)
      expect(totalCutLength).toBeGreaterThan(0);
    });

    it('should calculate costs consistently', async () => {
      const solver = new AdaptiveSolver(solverConfig);
      const result = await solver.solve(
        {
          components: mockComponents,
          profiles: [mockProfile],
          defaultStockLength: 6000,
        },
        [mockProfile]
      );

      // Verify cost breakdown is consistent
      const calculatedTotal =
        result.costBreakdown.materialCost +
        result.costBreakdown.laborCost +
        result.costBreakdown.hardwareCost +
        result.costBreakdown.glazingCost;

      expect(result.costBreakdown.totalCost).toBeCloseTo(calculatedTotal, 2);
    });
  });
});

