/**
 * Integration Tests for Fly Screen Presets
 * 
 * Tests the complete fly screen preset flow:
 * - FlyScreenPresetEngine generation
 * - Integration with DualOutputGenerator
 * - BOM accuracy validation
 * 
 * @since Phase 1: Special Presets (Weeks 1-2)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FlyScreenPresetEngine } from '@/lib/presets/FlyScreenPresetEngine';
import { DualOutputGenerator } from '@/lib/fabricator/DualOutputGenerator';
import type { WindowUnit } from '@/types/fabricator';

describe('Fly Screen Preset Integration', () => {
  let engine: FlyScreenPresetEngine;
  let dualOutputGenerator: DualOutputGenerator;
  let mockWindowUnit: WindowUnit;

  beforeEach(() => {
    engine = new FlyScreenPresetEngine();
    dualOutputGenerator = new DualOutputGenerator();
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
      flyScreenType: 'magnetic',
      positionMeta: {
        buildingBlock: 'Cairo'
      }
    };
  });

  describe('DualOutputGenerator Integration', () => {
    it('should include fly screen BOM in DualOutputGenerator output', async () => {
      const result = await dualOutputGenerator.generateForWindowUnit(mockWindowUnit);

      // Should have fly screen profile in fabrication data
      const flyScreenProfiles = result.fabrication.profiles.filter(
        p => p.profileCode.includes('SCREEN')
      );
      expect(flyScreenProfiles.length).toBeGreaterThan(0);

      // Should have fly screen warning
      const flyScreenWarning = result.fabrication.warnings.find(
        w => w.code.includes('FLY-SCREEN')
      );
      expect(flyScreenWarning).toBeDefined();
    });

    it('should merge fly screen hardware with window hardware', async () => {
      const result = await dualOutputGenerator.generateForWindowUnit(mockWindowUnit);

      // Should have both window hardware and fly screen hardware
      expect(result.fabrication.hardware.length).toBeGreaterThan(0);

      // Should have fly screen specific hardware (clips, brackets, spline)
      const hasClips = result.fabrication.hardware.some(
        h => h.name.toLowerCase().includes('clip')
      );
      const hasBrackets = result.fabrication.hardware.some(
        h => h.name.toLowerCase().includes('bracket')
      );
      expect(hasClips || hasBrackets).toBe(true);
    });

    it('should handle missing flyScreenType gracefully', async () => {
      const unitWithoutFlyScreen = {
        ...mockWindowUnit,
        flyScreenType: undefined
      };

      const result = await dualOutputGenerator.generateForWindowUnit(unitWithoutFlyScreen);

      // Should not have fly screen profiles
      const flyScreenProfiles = result.fabrication.profiles.filter(
        p => p.profileCode.includes('SCREEN')
      );
      expect(flyScreenProfiles.length).toBe(0);
    });

    it('should handle "none" flyScreenType', async () => {
      const unitWithNoFlyScreen = {
        ...mockWindowUnit,
        flyScreenType: 'none'
      };

      const result = await dualOutputGenerator.generateForWindowUnit(unitWithNoFlyScreen);

      // Should not have fly screen profiles
      const flyScreenProfiles = result.fabrication.profiles.filter(
        p => p.profileCode.includes('SCREEN')
      );
      expect(flyScreenProfiles.length).toBe(0);
    });
  });

  describe('BOM Accuracy Validation', () => {
    it('should generate accurate frame length calculations', async () => {
      const assembly = await engine.generateFlyScreenAssembly(mockWindowUnit, 'magnetic');

      // Frame total length should match sum of pieces
      const calculatedLength = assembly.frame.pieces.reduce(
        (sum, piece) => sum + piece.length * piece.quantity, 0
      );
      expect(assembly.frame.totalLength).toBeCloseTo(calculatedLength, 1);
    });

    it('should generate accurate mesh area calculations', async () => {
      const assembly = await engine.generateFlyScreenAssembly(mockWindowUnit, 'magnetic');

      // Mesh area should match dimensions
      const calculatedArea = (assembly.mesh.dimensions.width * assembly.mesh.dimensions.height) / 1_000_000;
      expect(assembly.mesh.area).toBeCloseTo(calculatedArea, 2);
    });

    it('should generate accurate cost calculations', async () => {
      const bom = await engine.generateFlyScreenBOM(mockWindowUnit, 'magnetic');

      // Total cost should match sum of components
      const calculatedCost = 
        bom.profiles.reduce((sum, p) => sum + p.cost, 0) +
        bom.accessories.reduce((sum, a) => sum + a.totalCost, 0);

      expect(bom.totalCost).toBeCloseTo(calculatedCost, 2);
    });
  });

  describe('Different Screen Types', () => {
    it('should generate different hardware for different screen types', async () => {
      const magnetic = await engine.generateFlyScreenAssembly(mockWindowUnit, 'magnetic');
      const fixed = await engine.generateFlyScreenAssembly(mockWindowUnit, 'fixed');
      const sliding = await engine.generateFlyScreenAssembly(mockWindowUnit, 'sliding');

      // Magnetic should have clips
      const magneticClips = magnetic.hardware.filter(h => h.category === 'clip');
      expect(magneticClips.length).toBeGreaterThan(0);

      // Fixed should have mounting brackets
      const fixedBrackets = fixed.hardware.filter(h => h.category === 'corner_bracket');
      expect(fixedBrackets.length).toBeGreaterThan(0);

      // Sliding should have tracks and rollers
      const slidingTracks = sliding.hardware.filter(h => h.category === 'track');
      const slidingRollers = sliding.hardware.filter(h => h.category === 'roller');
      expect(slidingTracks.length).toBeGreaterThan(0);
      expect(slidingRollers.length).toBeGreaterThan(0);
    });
  });

  describe('Assembly Sequence Validation', () => {
    it('should generate complete assembly sequence', async () => {
      const assembly = await engine.generateFlyScreenAssembly(mockWindowUnit, 'magnetic');

      expect(assembly.assemblySequence.length).toBeGreaterThanOrEqual(4);
      
      // Should have sequential step numbers
      const stepNumbers = assembly.assemblySequence.map(s => s.step);
      expect(stepNumbers).toEqual([1, 2, 3, 4, 5]);

      // Each step should have required fields
      assembly.assemblySequence.forEach(step => {
        expect(step.operation).toBeDefined();
        expect(step.estimatedTime).toBeGreaterThan(0);
        expect(step.toolsRequired.length).toBeGreaterThan(0);
      });
    });

    it('should calculate total assembly time correctly', async () => {
      const assembly = await engine.generateFlyScreenAssembly(mockWindowUnit, 'magnetic');

      const calculatedTime = assembly.assemblySequence.reduce(
        (sum, step) => sum + step.estimatedTime, 0
      );
      expect(assembly.estimatedAssemblyTime).toBe(calculatedTime);
    });
  });
});
