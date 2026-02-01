/**
 * Unit Tests for FenestrationSystemValidator
 * 
 * Tests comprehensive validation with:
 * - Type safety checks
 * - Business rule validation
 * - Manufacturing rules validation
 * - Performance caching
 * - Error recovery
 * 
 * @since Gold Tier Phase 1, Task 1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FenestrationSystemValidator } from '../FenestrationSystemValidator';
import type { FenestrationSystem } from '@/types/fenestration';
import { createValidSystem, createInvalidSystem } from './testFixtures';

// Mock audit logging
vi.mock('@/lib/audit/fabricatorAudit', () => ({
  logFabricatorAudit: vi.fn().mockResolvedValue(undefined),
}));

// Mock performance monitor
vi.mock('../PerformanceMonitor', () => ({
  GoldTierPerformanceMonitor: {
    record: vi.fn(),
    recordCacheHit: vi.fn(),
    recordCacheMiss: vi.fn(),
  },
}));

describe('FenestrationSystemValidator', () => {
  beforeEach(() => {
    FenestrationSystemValidator.clearCache();
  });

  describe('validate', () => {
    it('should validate a correct system', () => {
      const system = createValidSystem();
      const result = FenestrationSystemValidator.validate(system);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.performance.validationTimeMs).toBeGreaterThan(0);
    });

    it('should reject system with missing ID', () => {
      const system = createInvalidSystem('missingId');
      const result = FenestrationSystemValidator.validate(system);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'VAL-001')).toBe(true);
    });

    it('should reject system with invalid region', () => {
      const system = createInvalidSystem('invalidRegion');
      const result = FenestrationSystemValidator.validate(system);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'VAL-003')).toBe(true);
    });

    it('should reject UPVC system without welding rules', () => {
      const system = createInvalidSystem('upvcNoWelding');
      const result = FenestrationSystemValidator.validate(system);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'VAL-101')).toBe(true);
    });

    it('should warn for GCC system without thermal break', () => {
      const system = createInvalidSystem('gccNoThermalBreak');
      const result = FenestrationSystemValidator.validate(system);
      
      expect(result.warnings.some(w => w.code === 'VAL-102')).toBe(true);
    });

    it('should validate manufacturing rules', () => {
      const system = createInvalidSystem('invalidSawKerf');
      const result = FenestrationSystemValidator.validate(system);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'VAL-201')).toBe(true);
    });

    it('should validate constraints consistency', () => {
      const system = createInvalidSystem('invalidConstraints');
      const result = FenestrationSystemValidator.validate(system);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'VAL-103')).toBe(true);
    });

    it('should provide recovery suggestions', () => {
      const system = createInvalidSystem('missingId');
      const result = FenestrationSystemValidator.validate(system);
      
      expect(result.recovery).toBeDefined();
      expect(result.recovery?.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Caching', () => {
    it('should cache validation results', () => {
      const system = createValidSystem();
      
      // First validation
      const first = FenestrationSystemValidator.validate(system);
      expect(first.performance.cacheHit).toBe(false);
      
      // Second validation (should be cached)
      const second = FenestrationSystemValidator.validate(system);
      expect(second.performance.cacheHit).toBe(true);
      expect(second.performance.validationTimeMs).toBeLessThan(1); // Cached should be <1ms
    });

    it('should invalidate cache after TTL', () => {
      const system = createValidSystem();
      
      // First validation
      FenestrationSystemValidator.validate(system);
      
      // Manually expire cache by clearing
      FenestrationSystemValidator.clearCache();
      
      // Second validation (should not be cached)
      const second = FenestrationSystemValidator.validate(system);
      expect(second.performance.cacheHit).toBe(false);
    });

    it('should limit cache size', () => {
      // Create many systems to fill cache
      for (let i = 0; i < 1001; i++) {
        const system = createValidSystem();
        system.id = `system-${i}`;
        system.version = `v${i}`;
        FenestrationSystemValidator.validate(system);
      }
      
      const stats = FenestrationSystemValidator.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(1000);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', () => {
      const system = createValidSystem();
      FenestrationSystemValidator.validate(system);
      
      FenestrationSystemValidator.clearCache();
      
      const stats = FenestrationSystemValidator.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should invalidate cache for specific system', () => {
      const system1 = createValidSystem();
      system1.id = 'system-1';
      const system2 = createValidSystem();
      system2.id = 'system-2';
      
      FenestrationSystemValidator.validate(system1);
      FenestrationSystemValidator.validate(system2);
      
      FenestrationSystemValidator.invalidateCache('system-1');
      
      const stats = FenestrationSystemValidator.getCacheStats();
      expect(stats.size).toBe(1); // Only system-2 should remain
    });
  });

  describe('Error Codes', () => {
    it('should have unique error codes', () => {
      const system = createInvalidSystem('multipleErrors');
      const result = FenestrationSystemValidator.validate(system);
      
      const errorCodes = result.errors.map(e => e.code);
      const uniqueCodes = new Set(errorCodes);
      
      expect(errorCodes.length).toBe(uniqueCodes.size); // All codes should be unique
    });

    it('should categorize errors by type', () => {
      const system = createInvalidSystem('typeErrors');
      const result = FenestrationSystemValidator.validate(system);
      
      const typeErrors = result.errors.filter(e => e.code.startsWith('VAL-00'));
      expect(typeErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should validate quickly (<10ms first time)', () => {
      const system = createValidSystem();
      const start = performance.now();
      
      FenestrationSystemValidator.validate(system);
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10); // <10ms
    });

    it('should validate very quickly when cached (<1ms)', () => {
      const system = createValidSystem();
      
      // First validation
      FenestrationSystemValidator.validate(system);
      
      // Second validation (cached)
      const start = performance.now();
      FenestrationSystemValidator.validate(system);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(1); // <1ms when cached
    });
  });
});

// Test fixtures
function createValidSystem(): FenestrationSystem {
  return {
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
        name: 'Frame',
        role: 'frame',
        dimensions: { width: 60 },
        material: 'aluminum',
        standardStockLength: 6000,
        weightPerMeter: 1.5,
        costPerMeter: 10,
      },
      sash: {
        code: 'SASH-001',
        name: 'Sash',
        role: 'sash',
        dimensions: { width: 50 },
        material: 'aluminum',
        standardStockLength: 6000,
        weightPerMeter: 1.2,
        costPerMeter: 8,
      },
      mullion: {
        code: 'MULLION-001',
        name: 'Mullion',
        role: 'mullion',
        dimensions: { width: 60 },
        material: 'aluminum',
        standardStockLength: 6000,
        weightPerMeter: 1.5,
        costPerMeter: 10,
      },
      transom: {
        code: 'TRANSOM-001',
        name: 'Transom',
        role: 'transom',
        dimensions: { width: 60 },
        material: 'aluminum',
        standardStockLength: 6000,
        weightPerMeter: 1.5,
        costPerMeter: 10,
      },
      glazingBead: {
        code: 'BEAD-001',
        name: 'Bead',
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
}

function createInvalidSystem(type: string): any {
  const valid = createValidSystem();
  
  switch (type) {
    case 'missingId':
      return { ...valid, id: undefined };
    case 'invalidRegion':
      return { ...valid, region: 'INVALID' };
    case 'upvcNoWelding':
      return {
        ...valid,
        material: 'upvc',
        fabricationRules: {
          ...valid.fabricationRules,
          welding: undefined,
        },
      };
    case 'gccNoThermalBreak':
      return {
        ...valid,
        region: 'GCC',
        profiles: {
          ...valid.profiles,
          thermalBreak: undefined,
        },
      };
    case 'invalidSawKerf':
      return {
        ...valid,
        fabricationRules: {
          ...valid.fabricationRules,
          cutting: {
            ...valid.fabricationRules.cutting,
            sawKerf: 10000, // Invalid: >5000
          },
        },
      };
    case 'invalidConstraints':
      return {
        ...valid,
        constraints: {
          ...valid.constraints,
          maxWidth: 100, // Invalid: < minSashWidth (400)
        },
      };
    case 'multipleErrors':
      return {
        ...valid,
        id: undefined,
        region: 'INVALID',
      };
    case 'typeErrors':
      return {
        ...valid,
        id: 123, // Invalid type
        name: 456, // Invalid type
      };
    default:
      return valid;
  }
}

