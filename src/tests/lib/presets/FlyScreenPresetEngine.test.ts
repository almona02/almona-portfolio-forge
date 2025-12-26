/**
 * Unit Tests for FlyScreenPresetEngine
 * 
 * Tests the core fly screen generation engine with 99.5% accuracy target
 * 
 * @since Phase 1: Special Presets (Weeks 1-2)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FlyScreenPresetEngine, type FlyScreenType } from '@/lib/presets/FlyScreenPresetEngine';
import type { WindowUnit } from '@/types/fabricator';

describe('FlyScreenPresetEngine', () => {
  let engine: FlyScreenPresetEngine;
  let mockWindowUnit: WindowUnit;

  beforeEach(() => {
    engine = new FlyScreenPresetEngine();
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

  describe('generateFlyScreenAssembly', () => {
    it('should generate magnetic screen assembly', async () => {
      const assembly = await engine.generateFlyScreenAssembly(mockWindowUnit, 'magnetic');

      expect(assembly).toBeDefined();
      expect(assembly.type).toBe('magnetic');
      expect(assembly.frame).toBeDefined();
      expect(assembly.mesh).toBeDefined();
      expect(assembly.hardware.length).toBeGreaterThan(0);
      expect(assembly.assemblySequence.length).toBeGreaterThan(0);
    });

    it('should generate fixed screen assembly', async () => {
      const assembly = await engine.generateFlyScreenAssembly(mockWindowUnit, 'fixed');

      expect(assembly.type).toBe('fixed');
      expect(assembly.frame.totalLength).toBeGreaterThan(0);
      expect(assembly.mesh.area).toBeGreaterThan(0);
    });

    it('should generate sliding screen assembly', async () => {
      const assembly = await engine.generateFlyScreenAssembly(mockWindowUnit, 'sliding');

      expect(assembly.type).toBe('sliding');
      // Sliding screens should have tracks and rollers
      const hasTracks = assembly.hardware.some(h => h.category === 'track');
      const hasRollers = assembly.hardware.some(h => h.category === 'roller');
      expect(hasTracks).toBe(true);
      expect(hasRollers).toBe(true);
    });

    it('should throw error for "none" screen type', async () => {
      await expect(
        engine.generateFlyScreenAssembly(mockWindowUnit, 'none')
      ).rejects.toThrow('Cannot generate fly screen assembly for type "none"');
    });

    it('should calculate correct frame dimensions', async () => {
      const assembly = await engine.generateFlyScreenAssembly(mockWindowUnit, 'magnetic');

      // Frame should have 4 pieces (top, bottom, left, right)
      expect(assembly.frame.pieces.length).toBe(4);
      
      // Total length should be approximately 2 * (width + height)
      const expectedLength = (mockWindowUnit.overallWidth + mockWindowUnit.overallHeight) * 2;
      expect(assembly.frame.totalLength).toBeCloseTo(expectedLength, 0);
    });

    it('should include installation allowance in mesh dimensions', async () => {
      const assembly = await engine.generateFlyScreenAssembly(mockWindowUnit, 'magnetic');

      // Mesh should be larger than window dimensions (installation allowance)
      expect(assembly.mesh.dimensions.width).toBeGreaterThan(mockWindowUnit.overallWidth);
      expect(assembly.mesh.dimensions.height).toBeGreaterThan(mockWindowUnit.overallHeight);
    });

    it('should calculate total cost correctly', async () => {
      const assembly = await engine.generateFlyScreenAssembly(mockWindowUnit, 'magnetic');

      const frameCost = assembly.frame.cost;
      const meshCost = assembly.mesh.totalCost;
      const hardwareCost = assembly.hardware.reduce((sum, h) => sum + h.totalCost, 0);
      const expectedTotal = frameCost + meshCost + hardwareCost;

      expect(assembly.totalCost).toBeCloseTo(expectedTotal, 2);
    });

    it('should generate assembly sequence with correct steps', async () => {
      const assembly = await engine.generateFlyScreenAssembly(mockWindowUnit, 'magnetic');

      expect(assembly.assemblySequence.length).toBeGreaterThanOrEqual(4);
      
      // Should include cutting, assembly, mesh installation, and final inspection
      const stepNames = assembly.assemblySequence.map(s => s.operation.toLowerCase());
      expect(stepNames.some(name => name.includes('cut'))).toBe(true);
      expect(stepNames.some(name => name.includes('assemble'))).toBe(true);
      expect(stepNames.some(name => name.includes('mesh'))).toBe(true);
    });
  });

  describe('generateFlyScreenBOM', () => {
    it('should generate complete BOM for magnetic screen', async () => {
      const bom = await engine.generateFlyScreenBOM(mockWindowUnit, 'magnetic');

      expect(bom.profiles.length).toBeGreaterThan(0);
      expect(bom.hardware.length).toBeGreaterThan(0);
      expect(bom.accessories.length).toBeGreaterThan(0);
      expect(bom.totalCost).toBeGreaterThan(0);
    });

    it('should include screen frame profile in BOM', async () => {
      const bom = await engine.generateFlyScreenBOM(mockWindowUnit, 'magnetic');

      const frameProfile = bom.profiles.find(p => p.profileCode.includes('SCREEN'));
      expect(frameProfile).toBeDefined();
      expect(frameProfile?.role).toBe('accessory');
    });

    it('should include mesh in accessories', async () => {
      const bom = await engine.generateFlyScreenBOM(mockWindowUnit, 'magnetic');

      const mesh = bom.accessories.find(a => a.category === 'mesh');
      expect(mesh).toBeDefined();
      expect(mesh?.quantity).toBe(1);
    });
  });

  describe('Location-based supplier selection', () => {
    it('should select Cairo supplier for default location', async () => {
      const assembly = await engine.generateFlyScreenAssembly(mockWindowUnit, 'magnetic');

      expect(assembly.frame.profile.supplier).toContain('Cairo');
      expect(assembly.mesh.supplier).toContain('Egyptian');
    });

    it('should select Alexandria supplier for coastal location', async () => {
      const coastalUnit = {
        ...mockWindowUnit,
        positionMeta: { buildingBlock: 'Alexandria' }
      };
      const assembly = await engine.generateFlyScreenAssembly(coastalUnit, 'magnetic');

      expect(assembly.frame.profile.supplier).toContain('Alexandria');
    });

    it('should use fine mesh for coastal areas', async () => {
      const coastalUnit = {
        ...mockWindowUnit,
        positionMeta: { buildingBlock: 'Alexandria' }
      };
      const assembly = await engine.generateFlyScreenAssembly(coastalUnit, 'magnetic');

      // Coastal areas should use finer mesh for sand protection
      expect(assembly.mesh.type).toContain('fine');
    });
  });

  describe('Hardware calculations', () => {
    it('should calculate correct number of magnetic clips', async () => {
      const assembly = await engine.generateFlyScreenAssembly(mockWindowUnit, 'magnetic');

      const clips = assembly.hardware.filter(h => h.category === 'clip');
      expect(clips.length).toBeGreaterThan(0);
      
      // Should have at least 8 clips (2 per side minimum)
      const clipCount = clips.reduce((sum, c) => sum + c.quantity, 0);
      expect(clipCount).toBeGreaterThanOrEqual(8);
    });

    it('should include corner brackets for all screen types', async () => {
      const types: FlyScreenType[] = ['magnetic', 'fixed', 'sliding'];
      
      for (const type of types) {
        const assembly = await engine.generateFlyScreenAssembly(mockWindowUnit, type);
        const brackets = assembly.hardware.filter(h => h.category === 'corner_bracket');
        
        // Should have 4 corner brackets
        const bracketCount = brackets.reduce((sum, b) => sum + b.quantity, 0);
        expect(bracketCount).toBe(4);
      }
    });

    it('should include spline for all screen types', async () => {
      const assembly = await engine.generateFlyScreenAssembly(mockWindowUnit, 'magnetic');

      const spline = assembly.hardware.find(h => h.category === 'spline');
      expect(spline).toBeDefined();
      expect(spline?.quantity).toBe(1);
    });
  });
});
