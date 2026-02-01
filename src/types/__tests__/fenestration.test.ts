/**
 * Unit Tests for FenestrationSystem Type Guards
 * 
 * Tests type safety and validation of FenestrationSystem interfaces.
 * 
 * @since Gold Tier Phase 1, Task 1
 */

import { describe, it, expect } from 'vitest';
import { isFenestrationSystem, type FenestrationSystem } from '../fenestration';

describe('FenestrationSystem Type Guards', () => {
  describe('isFenestrationSystem', () => {
    it('should return true for valid FenestrationSystem', () => {
      const validSystem: FenestrationSystem = {
        id: 'TEST-SYSTEM-1',
        name: 'Test System',
        manufacturer: 'Test Manufacturer',
        version: '1.0.0',
        region: 'EGY',
        material: 'aluminum',
        category: 'window',
        profiles: {
          frame: {
            code: 'FRAME-001',
            name: 'Frame Profile',
            role: 'frame',
            dimensions: { width: 60 },
            material: 'aluminum',
            standardStockLength: 6000,
            weightPerMeter: 1.5,
            costPerMeter: 10,
          },
          sash: {
            code: 'SASH-001',
            name: 'Sash Profile',
            role: 'sash',
            dimensions: { width: 50 },
            material: 'aluminum',
            standardStockLength: 6000,
            weightPerMeter: 1.2,
            costPerMeter: 8,
          },
          mullion: {
            code: 'MULLION-001',
            name: 'Mullion Profile',
            role: 'mullion',
            dimensions: { width: 60 },
            material: 'aluminum',
            standardStockLength: 6000,
            weightPerMeter: 1.5,
            costPerMeter: 10,
          },
          transom: {
            code: 'TRANSOM-001',
            name: 'Transom Profile',
            role: 'transom',
            dimensions: { width: 60 },
            material: 'aluminum',
            standardStockLength: 6000,
            weightPerMeter: 1.5,
            costPerMeter: 10,
          },
          glazingBead: {
            code: 'BEAD-001',
            name: 'Glazing Bead',
            role: 'glazingBead',
            dimensions: { width: 20 },
            material: 'aluminum',
            standardStockLength: 6000,
            weightPerMeter: 0.3,
            costPerMeter: 2,
          },
        },
        fabricationRules: {
          connectionType: 'miter',
          cutting: {
            sawKerf: 1500,
            miterAllowance: 2000,
            barEndTrim: 500,
            cuttingTolerance: 100,
          },
          assembly: {
            frameClearance: 3000,
            mullionDeduction: 0,
            glazingClearance: 5000,
          },
        },
        hardwareKit: {
          hinges: {
            category: 'hinge',
            defaultId: 'HINGE-001',
            selectionRules: [],
            quantityCalculator: () => 2,
          },
          lockingSystem: {
            category: 'lock',
            defaultId: 'LOCK-001',
            selectionRules: [],
            quantityCalculator: () => 1,
          },
          handle: {
            category: 'handle',
            defaultId: 'HANDLE-001',
            selectionRules: [],
            quantityCalculator: () => 1,
          },
          gaskets: {
            glazingGasket: {
              id: 'GASKET-001',
              supplierCode: 'GT-001',
              name: 'Glazing Gasket',
              category: 'gasket',
              specifications: {},
              unitCost: 0.5,
            },
            weatherSeal: {
              id: 'SEAL-001',
              supplierCode: 'GT-002',
              name: 'Weather Seal',
              category: 'gasket',
              specifications: {},
              unitCost: 0.5,
            },
          },
          cornerKeys: [],
          drainageCaps: [],
        },
        constraints: {
          maxWidth: 3000,
          maxHeight: 2600,
          maxSashArea: 6,
          maxSashWeight: 150,
          minSashWidth: 400,
          aspectRatio: { min: 0.3, max: 3.0 },
          windLoadClass: 'C3',
          requiresReinforcement: (width, height) => {
            const area = (width * height) / 1000000;
            return area > 4.8;
          },
        },
        regionalPhysics: {
          thermalExpansionCoefficient: 0.021,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          validationStatus: 'draft',
        },
      };

      expect(isFenestrationSystem(validSystem)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isFenestrationSystem(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isFenestrationSystem(undefined)).toBe(false);
    });

    it('should return false for missing id', () => {
      const invalid = { name: 'Test' };
      expect(isFenestrationSystem(invalid)).toBe(false);
    });

    it('should return false for invalid region', () => {
      const invalid = {
        id: 'TEST',
        name: 'Test',
        manufacturer: 'Test',
        version: '1.0.0',
        region: 'INVALID',
        material: 'aluminum',
        category: 'window',
      };
      expect(isFenestrationSystem(invalid)).toBe(false);
    });

    it('should return false for invalid material', () => {
      const invalid = {
        id: 'TEST',
        name: 'Test',
        manufacturer: 'Test',
        version: '1.0.0',
        region: 'EGY',
        material: 'invalid',
        category: 'window',
      };
      expect(isFenestrationSystem(invalid)).toBe(false);
    });
  });
});

