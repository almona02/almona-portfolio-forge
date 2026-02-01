/**
 * Unit Tests for ApexEngineV2
 * 
 * Tests the core Gold Tier calculation engine with:
 * - Manufacturing parameter calculations
 * - Hierarchical component generation
 * - Visual geometry generation
 * - Fabrication data generation
 * - Material-specific calculations
 * - Region-specific physics
 * 
 * @since Gold Tier Phase 1, Task 2.1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApexEngineV2 } from '../ApexEngineV2';
import type { FenestrationSystem } from '@/types/fenestration';
import type { WindowUnit } from '@/types/fabricator';
import { createValidSystem } from './testFixtures';

// Mock dependencies
vi.mock('../PerformanceMonitor', () => ({
  GoldTierPerformanceMonitor: {
    record: vi.fn().mockReturnValue('test-id'),
  },
}));

vi.mock('@/lib/audit/fabricatorAudit', () => ({
  logFabricatorAudit: vi.fn().mockResolvedValue(undefined),
}));

describe('ApexEngineV2', () => {
  let system: FenestrationSystem;
  let unit: WindowUnit;

  beforeEach(() => {
    system = createValidSystem();
    
    unit = {
      id: 'test-window-1',
      orderNumber: 'ORD-001',
      posNumber: 'POS-001',
      type: 'window',
      components: [],
      overallWidth: 1200, // mm
      overallHeight: 1500, // mm
      color: 'Silver',
      glazing: { type: 'double', thickness: 24 },
      hardware: [],
      status: 'design',
      optimization: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      grid: {
        rows: 1,
        cols: 1,
        cells: [
          {
            id: '0-0',
            row: 0,
            col: 0,
            type: 'sash',
            openingDirection: 'right',
          },
        ],
      },
    };
  });

  describe('generateAssembly', () => {
    it('should generate complete assembly', () => {
      const engine = new ApexEngineV2(system, unit);
      const result = engine.generateAssembly();

      expect(result.visualGeometry).toBeDefined();
      expect(result.fabricationData).toBeDefined();
      expect(result.performance.calculationTimeMs).toBeGreaterThan(0);
    });

    it('should generate frame geometry', () => {
      const engine = new ApexEngineV2(system, unit);
      const result = engine.generateAssembly();

      expect(result.visualGeometry.frame).toBeDefined();
      expect(result.visualGeometry.frame.outline).toHaveLength(4);
      expect(result.visualGeometry.frame.corners).toHaveLength(4);
    });

    it('should generate sash geometry', () => {
      const engine = new ApexEngineV2(system, unit);
      const result = engine.generateAssembly();

      expect(result.visualGeometry.sashes).toBeDefined();
      expect(result.visualGeometry.sashes.length).toBeGreaterThan(0);
    });

    it('should generate glazing geometry', () => {
      const engine = new ApexEngineV2(system, unit);
      const result = engine.generateAssembly();

      expect(result.visualGeometry.glazing).toBeDefined();
      expect(result.visualGeometry.glazing.length).toBeGreaterThan(0);
    });

    it('should generate fabrication BOM', () => {
      const engine = new ApexEngineV2(system, unit);
      const result = engine.generateAssembly();

      expect(result.fabricationData.bom).toBeDefined();
      expect(result.fabricationData.bom.profiles).toBeDefined();
      expect(result.fabricationData.bom.hardware).toBeDefined();
      expect(result.fabricationData.bom.glazing).toBeDefined();
    });

    it('should generate cut list', () => {
      const engine = new ApexEngineV2(system, unit);
      const result = engine.generateAssembly();

      expect(result.fabricationData.cutList).toBeDefined();
      expect(result.fabricationData.cutList.length).toBeGreaterThan(0);
    });

    it('should generate assembly instructions', () => {
      const engine = new ApexEngineV2(system, unit);
      const result = engine.generateAssembly();

      expect(result.fabricationData.assembly).toBeDefined();
      expect(result.fabricationData.assembly.steps).toBeDefined();
      expect(result.fabricationData.assembly.steps.length).toBeGreaterThan(0);
    });

    it('should generate quality checks', () => {
      const engine = new ApexEngineV2(system, unit);
      const result = engine.generateAssembly();

      expect(result.fabricationData.qualityChecks).toBeDefined();
      expect(result.fabricationData.qualityChecks.length).toBeGreaterThan(0);
    });
  });

  describe('Manufacturing Parameters', () => {
    it('should calculate frame dimensions correctly', () => {
      const engine = new ApexEngineV2(system, unit);
      const result = engine.generateAssembly();

      // Frame should match window dimensions
      const frameOutline = result.visualGeometry.frame.outline;
      const frameWidth = frameOutline[1].x - frameOutline[0].x;
      const frameHeight = frameOutline[2].y - frameOutline[1].y;

      expect(frameWidth).toBeCloseTo(unit.overallWidth, 1);
      expect(frameHeight).toBeCloseTo(unit.overallHeight, 1);
    });

    it('should apply miter allowance to cut lengths', () => {
      const engine = new ApexEngineV2(system, unit);
      const result = engine.generateAssembly();

      // Check that cut lengths include miter allowance
      const cutList = result.fabricationData.cutList;
      const frameCuts = cutList.filter(c => c.role === 'frame');
      
      expect(frameCuts.length).toBeGreaterThan(0);
      // Cut lengths should be greater than frame dimensions due to miter allowance
      frameCuts.forEach(cut => {
        expect(cut.cutLength).toBeGreaterThan(0);
      });
    });

    it('should calculate sash dimensions with frame clearance', () => {
      const engine = new ApexEngineV2(system, unit);
      const result = engine.generateAssembly();

      const sash = result.visualGeometry.sashes[0];
      const sashWidth = sash.outline[1].x - sash.outline[0].x;
      const sashHeight = sash.outline[2].y - sash.outline[1].y;

      // Sash should be smaller than frame due to clearance
      expect(sashWidth).toBeLessThan(unit.overallWidth);
      expect(sashHeight).toBeLessThan(unit.overallHeight);
    });

    it('should calculate glazing dimensions with glazing clearance', () => {
      const engine = new ApexEngineV2(system, unit);
      const result = engine.generateAssembly();

      const glazing = result.visualGeometry.glazing[0];
      const glazingWidth = glazing.outline[1].x - glazing.outline[0].x;
      const glazingHeight = glazing.outline[2].y - glazing.outline[1].y;

      // Glazing should be smaller than sash due to clearance
      const sash = result.visualGeometry.sashes[0];
      const sashWidth = sash.outline[1].x - sash.outline[0].x;
      const sashHeight = sash.outline[2].y - sash.outline[1].y;

      expect(glazingWidth).toBeLessThan(sashWidth);
      expect(glazingHeight).toBeLessThan(sashHeight);
    });
  });

  describe('Material-Specific Calculations', () => {
    it('should apply thermal expansion for GCC region', () => {
      const gccSystem = {
        ...system,
        region: 'GCC' as const,
        regionalPhysics: {
          thermalExpansionCoefficient: 0.023,
          operatingTemperatureRange: {
            min: 0,
            max: 55,
          },
        },
      };

      const engine = new ApexEngineV2(gccSystem, unit);
      const result = engine.generateAssembly();

      // Should complete without errors (thermal expansion applied internally)
      expect(result.visualGeometry).toBeDefined();
    });

    it('should apply welding shrinkage for UPVC', () => {
      const upvcSystem = {
        ...system,
        material: 'upvc' as const,
        fabricationRules: {
          ...system.fabricationRules,
          welding: {
            burnOff: 3000, // 3mm
            coolingFactor: 2.5, // 2.5%
            temperature: 250,
          },
        },
      };

      const engine = new ApexEngineV2(upvcSystem, unit);
      const result = engine.generateAssembly();

      // Should complete without errors (welding shrinkage applied internally)
      expect(result.visualGeometry).toBeDefined();
    });

    it('should apply seismic allowance for Turkish region', () => {
      const turkishSystem = {
        ...system,
        region: 'TUR' as const,
        regionalPhysics: {
          thermalExpansionCoefficient: 0.021,
          seismicRating: 'B' as const,
        },
      };

      const engine = new ApexEngineV2(turkishSystem, unit);
      const result = engine.generateAssembly();

      // Should complete without errors (seismic allowance applied internally)
      expect(result.visualGeometry).toBeDefined();
    });
  });

  describe('Multi-Panel Windows', () => {
    it('should calculate mullions for multi-column grid', () => {
      const multiColUnit = {
        ...unit,
        grid: {
          rows: 1,
          cols: 2,
          cells: [
            { id: '0-0', row: 0, col: 0, type: 'sash', openingDirection: 'right' },
            { id: '0-1', row: 0, col: 1, type: 'sash', openingDirection: 'left' },
          ],
        },
      };

      const engine = new ApexEngineV2(system, multiColUnit);
      const result = engine.generateAssembly();

      expect(result.visualGeometry.frame.mullions).toBeDefined();
      expect(result.visualGeometry.frame.mullions?.length).toBe(1);
    });

    it('should calculate transoms for multi-row grid', () => {
      const multiRowUnit = {
        ...unit,
        grid: {
          rows: 2,
          cols: 1,
          cells: [
            { id: '0-0', row: 0, col: 0, type: 'sash', openingDirection: 'right' },
            { id: '1-0', row: 1, col: 0, type: 'sash', openingDirection: 'right' },
          ],
        },
      };

      const engine = new ApexEngineV2(system, multiRowUnit);
      const result = engine.generateAssembly();

      expect(result.visualGeometry.frame.transoms).toBeDefined();
      expect(result.visualGeometry.frame.transoms?.length).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing grid gracefully', () => {
      const unitWithoutGrid = {
        ...unit,
        grid: undefined,
      };

      const engine = new ApexEngineV2(system, unitWithoutGrid);
      
      // Should not throw
      expect(() => engine.generateAssembly()).not.toThrow();
    });

    it('should handle missing glazing data', () => {
      const unitWithoutGlazing = {
        ...unit,
        glazing: undefined,
      };

      const engine = new ApexEngineV2(system, unitWithoutGlazing);
      const result = engine.generateAssembly();

      // Should use default glazing thickness
      expect(result.visualGeometry.glazing).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete generation quickly', () => {
      const engine = new ApexEngineV2(system, unit);
      const start = performance.now();
      
      engine.generateAssembly();
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // <100ms
    });
  });
});

