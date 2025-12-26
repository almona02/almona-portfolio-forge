/**
 * Unit Tests for CustomMullionValidator
 * 
 * Tests structural validation, thermal analysis, and Egyptian Code 2020 compliance
 * 
 * @since Phase 1: Special Presets (Weeks 3-4)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CustomMullionValidator, type MullionType } from '@/lib/presets/CustomMullionValidator';
import type { WindowUnit } from '@/types/fabricator';

describe('CustomMullionValidator', () => {
  let validator: CustomMullionValidator;
  let mockWindowUnit: WindowUnit;

  beforeEach(() => {
    validator = new CustomMullionValidator();
    mockWindowUnit = {
      id: 'test-window-1',
      orderNumber: 'ORD-001',
      posNumber: 'POS-001',
      type: 'sliding_window',
      components: [],
      overallWidth: 2400,
      overallHeight: 1800,
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

  describe('validateCustomMullion', () => {
    it('should validate standard mullion placement', async () => {
      const validation = await validator.validateCustomMullion(
        mockWindowUnit,
        1200, // Center position
        'standard'
      );

      expect(validation).toBeDefined();
      expect(validation.position).toBe(1200);
      expect(validation.type).toBe('standard');
      expect(validation.requiredProfile).toBeDefined();
      expect(validation.connectorSpec).toBeDefined();
    });

    it('should reject mullion position outside window bounds', async () => {
      const validation = await validator.validateCustomMullion(
        mockWindowUnit,
        3000, // Outside bounds
        'standard'
      );

      expect(validation.isFeasible).toBe(false);
      expect(validation.warnings.length).toBeGreaterThan(0);
    });

    it('should validate structural mullion with reinforcement', async () => {
      const validation = await validator.validateCustomMullion(
        mockWindowUnit,
        1200,
        'structural'
      );

      expect(validation.requiredProfile.reinforcement).toBe(true);
      expect(validation.requiredProfile.width).toBe(80); // Structural mullions are wider
    });

    it('should validate thermal break mullion', async () => {
      const validation = await validator.validateCustomMullion(
        mockWindowUnit,
        1200,
        'thermal_break'
      );

      expect(validation.type).toBe('thermal_break');
      expect(validation.connectorSpec.type).toBe('thermal_break_connector');
      expect(validation.thermal.uValueImpact).toBeLessThan(0.5); // Low impact
    });

    it('should calculate structural analysis correctly', async () => {
      const validation = await validator.validateCustomMullion(
        mockWindowUnit,
        1200,
        'standard'
      );

      expect(validation.structural.maxDeflection).toBeGreaterThan(0);
      expect(validation.structural.windLoadCapacity).toBeGreaterThan(0);
      expect(validation.structural.safetyFactor).toBeGreaterThan(0);
    });

    it('should calculate thermal impact correctly', async () => {
      const validation = await validator.validateCustomMullion(
        mockWindowUnit,
        1200,
        'standard'
      );

      expect(validation.thermal.uValueImpact).toBeGreaterThanOrEqual(0);
      expect(validation.thermal.thermalBridgeLength).toBeGreaterThan(0);
      expect(validation.thermal.recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it('should calculate cost impact', async () => {
      const validation = await validator.validateCustomMullion(
        mockWindowUnit,
        1200,
        'standard'
      );

      expect(validation.cost.materialCost).toBeGreaterThan(0);
      expect(validation.cost.laborCost).toBeGreaterThan(0);
      expect(validation.cost.totalCost).toBe(
        validation.cost.materialCost + validation.cost.laborCost
      );
    });

    it('should assess manufacturing feasibility', async () => {
      const validation = await validator.validateCustomMullion(
        mockWindowUnit,
        1200,
        'standard'
      );

      expect(validation.manufacturing.isManufacturable).toBeDefined();
      expect(validation.manufacturing.difficulty).toBeDefined();
      expect(validation.manufacturing.estimatedTime).toBeGreaterThan(0);
    });

    it('should warn for tall windows', async () => {
      const tallWindow = {
        ...mockWindowUnit,
        overallHeight: 3000 // > 2.4m
      };

      const validation = await validator.validateCustomMullion(
        tallWindow,
        1200,
        'standard'
      );

      const hasTallWindowWarning = validation.warnings.some(w => 
        w.toLowerCase().includes('tall') || w.toLowerCase().includes('2.4')
      );
      expect(hasTallWindowWarning).toBe(true);
    });

    it('should warn for mullion too close to edge', async () => {
      const validation = await validator.validateCustomMullion(
        mockWindowUnit,
        50, // Too close to edge (< 100mm)
        'standard'
      );

      const hasEdgeWarning = validation.warnings.some(w => 
        w.toLowerCase().includes('edge') || w.toLowerCase().includes('100mm')
      );
      expect(hasEdgeWarning).toBe(true);
    });
  });
});


