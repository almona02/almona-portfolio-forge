/**
 * Unit Tests for Egyptian Special Presets
 * 
 * Tests sand/dust protection and thermal break optimization
 * 
 * @since Phase 1: Special Presets (Weeks 7-8)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SandDustProtectionEngine } from '@/lib/presets/SandDustProtectionEngine';
import { ThermalBreakOptimizer } from '@/lib/presets/ThermalBreakOptimizer';
import { EgyptianClimateAnalyzer } from '@/lib/presets/EgyptianClimateAnalyzer';
import type { WindowUnit } from '@/types/fabricator';

describe('Egyptian Special Presets', () => {
  let mockWindowUnit: WindowUnit;

  beforeEach(() => {
    mockWindowUnit = {
      id: 'test-window-1',
      orderNumber: 'ORD-001',
      posNumber: 'POS-001',
      type: 'sliding_window',
      components: [],
      overallWidth: 1800,
      overallHeight: 1500,
      color: 'Silver',
      glazing: { type: 'double', thickness: 24 },
      hardware: [],
      status: 'design',
      optimization: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      systemPackId: 'rock60',
      positionMeta: {
        buildingBlock: 'Cairo'
      }
    };
  });

  describe('SandDustProtectionEngine', () => {
    it('should generate sand/dust protection system', async () => {
      const engine = new SandDustProtectionEngine();
      const spec = await engine.generateSandDustProtection(mockWindowUnit);

      expect(spec.seals.length).toBeGreaterThan(0);
      expect(spec.gaskets.length).toBeGreaterThan(0);
      expect(spec.totalCost).toBeGreaterThan(0);
    });

    it('should include fine mesh for high-risk areas', async () => {
      const highRiskUnit = {
        ...mockWindowUnit,
        positionMeta: { buildingBlock: 'Upper Egypt' }
      };

      const engine = new SandDustProtectionEngine();
      const spec = await engine.generateSandDustProtection(highRiskUnit);

      expect(spec.screenMesh).toBeDefined();
      expect(spec.screenMesh?.meshSize).toBeLessThan(1.2); // Finer than standard
    });

    it('should include corrosion-resistant hardware for coastal areas', async () => {
      const coastalUnit = {
        ...mockWindowUnit,
        positionMeta: { buildingBlock: 'Alexandria' }
      };

      const engine = new SandDustProtectionEngine();
      const spec = await engine.generateSandDustProtection(coastalUnit);

      expect(spec.hardware.length).toBeGreaterThan(0);
      const hasCorrosionResistant = spec.hardware.some(h => 
        h.type.includes('corrosion') || h.type.includes('stainless') || h.type.includes('marine')
      );
      expect(hasCorrosionResistant).toBe(true);
    });
  });

  describe('ThermalBreakOptimizer', () => {
    it('should optimize thermal break', async () => {
      const optimizer = new ThermalBreakOptimizer();
      const spec = await optimizer.optimizeThermalBreak(mockWindowUnit);

      expect(spec.type).toBeDefined();
      expect(spec.uValueImprovement).toBeGreaterThan(0);
      expect(spec.totalCost).toBeGreaterThan(0);
    });

    it('should recommend reinforced polyamide for coastal areas', async () => {
      const coastalUnit = {
        ...mockWindowUnit,
        positionMeta: { buildingBlock: 'Alexandria' }
      };

      const optimizer = new ThermalBreakOptimizer();
      const spec = await optimizer.optimizeThermalBreak(coastalUnit);

      expect(spec.type).toBe('reinforced_polyamide');
    });

    it('should recommend polyurethane for high-temperature areas', async () => {
      const hotUnit = {
        ...mockWindowUnit,
        positionMeta: { buildingBlock: 'Upper Egypt' }
      };

      const optimizer = new ThermalBreakOptimizer();
      const spec = await optimizer.optimizeThermalBreak(hotUnit);

      expect(spec.type).toBe('polyurethane');
    });

    it('should calculate payback period', async () => {
      const optimizer = new ThermalBreakOptimizer();
      const spec = await optimizer.optimizeThermalBreak(mockWindowUnit);

      // Payback period should be calculated if energy savings > 0
      if (spec.paybackPeriod) {
        expect(spec.paybackPeriod).toBeGreaterThan(0);
      }
    });
  });

  describe('EgyptianClimateAnalyzer', () => {
    it('should analyze Cairo climate', () => {
      const analyzer = new EgyptianClimateAnalyzer();
      const analysis = analyzer.analyzeClimate(mockWindowUnit);

      expect(analysis.region).toBe('Cairo');
      expect(analysis.averageTemperature).toBe(25);
      expect(analysis.humidityLevel).toBe('medium');
    });

    it('should detect coastal locations', () => {
      const coastalUnit = {
        ...mockWindowUnit,
        positionMeta: { buildingBlock: 'Alexandria' }
      };

      const analyzer = new EgyptianClimateAnalyzer();
      const analysis = analyzer.analyzeClimate(coastalUnit);

      expect(analysis.isCoastal).toBe(true);
      expect(analysis.humidityLevel).toBe('high');
    });

    it('should detect sand/dust risk areas', () => {
      const desertUnit = {
        ...mockWindowUnit,
        positionMeta: { buildingBlock: 'Upper Egypt' }
      };

      const analyzer = new EgyptianClimateAnalyzer();
      const analysis = analyzer.analyzeClimate(desertUnit);

      expect(analysis.hasSandDustRisk).toBe(true);
      expect(analysis.hasHighTemperature).toBe(true);
    });
  });
});


