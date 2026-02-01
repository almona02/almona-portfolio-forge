/**
 * Unit Tests for PatternMigrationService
 * 
 * Tests migration from EgyptianPattern to FenestrationSystem with:
 * - Profile extraction
 * - Manufacturing rules extraction
 * - Hardware kit extraction
 * - Validation integration
 * - Rollback capability
 * 
 * @since Gold Tier Phase 1, Task 1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatternMigrationService } from '../PatternMigrationService';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { SystemPack } from '@/data/systemPacks';
import { FenestrationSystemValidator } from '../FenestrationSystemValidator';

// Mock validator
vi.mock('../FenestrationSystemValidator', () => ({
  FenestrationSystemValidator: {
    validate: vi.fn(),
  },
}));

// Mock audit logging
vi.mock('@/lib/audit/fabricatorAudit', () => ({
  logFabricatorAudit: vi.fn().mockResolvedValue(undefined),
}));

// Mock performance monitor
vi.mock('../PerformanceMonitor', () => ({
  GoldTierPerformanceMonitor: {
    record: vi.fn(),
  },
}));

describe('PatternMigrationService', () => {
  let mockPattern: EgyptianPattern;
  let mockSystemPack: SystemPack;

  beforeEach(() => {
    mockPattern = {
      id: 'test-pattern-1',
      name: 'Test Pattern',
      type: 'sliding',
      layout: '2-panel sliding',
      typicalWidthMm: [1200, 2400],
      typicalHeightMm: [1200, 2000],
      compatibleSystems: ['rock60'],
      gridSpec: {
        rows: 1,
        cols: 2,
        cells: [
          { row: 0, col: 0, type: 'sliding', openingDirection: 'right' },
          { row: 0, col: 1, type: 'sliding', openingDirection: 'left' },
        ],
      },
      constraints: {
        minSashWidth: 400,
        maxSashWidth: 3000,
        maxSashArea: 6,
        windLoadCategory: 'medium',
      },
    };

    mockSystemPack = {
      meta: {
        id: 'rock60',
        name: 'ROCK 60',
        brands: ['Test Brand'],
        regions: ['egypt'],
      },
      windowSystemSpec: {
        stockLengthMm: 6000,
        profiles_cutting_list: [
          {
            profile_number: 'RC 6111-8',
            quantity: 2,
            cutting_length: 'L + 60',
            description: 'Frame profile - length direction',
          },
          {
            profile_number: 'RC 6122',
            quantity: 2,
            cutting_length: 'L - 44',
            description: 'Sash profile - length direction',
          },
          {
            profile_number: 'RC 6166',
            quantity: 2,
            cutting_length: 'L - 167',
            description: 'Glazing bead - length direction',
          },
        ],
        accessories_list: [
          {
            accessory_number: '0253',
            quantity: 2,
            description: 'Hinges',
          },
          {
            accessory_number: 'KIT 10451',
            quantity: 1,
            description: 'Locking Kit',
          },
          {
            accessory_number: 'GT 0122',
            quantity: '21.4H',
            description: 'Glass Gasket',
          },
        ],
      },
    } as SystemPack;

    // Mock successful validation
    (FenestrationSystemValidator.validate as any).mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
      performance: { validationTimeMs: 1, cacheHit: false, validationSteps: 6 },
    });
  });

  describe('migrate', () => {
    it('should successfully migrate pattern to system', () => {
      const result = PatternMigrationService.migrate(mockPattern, mockSystemPack);

      expect(result.success).toBe(true);
      expect(result.system).toBeDefined();
      expect(result.system?.id).toBe('MIGRATED-test-pattern-1');
      expect(result.errors).toHaveLength(0);
      expect(result.rollbackData).toBeDefined();
    });

    it('should provide rollback data', () => {
      const result = PatternMigrationService.migrate(mockPattern, mockSystemPack);

      expect(result.rollbackData).toBeDefined();
      expect(result.rollbackData?.id).toBe(mockPattern.id);
      expect(result.rollbackData?.name).toBe(mockPattern.name);
    });

    it('should extract profiles from cutting list', () => {
      const result = PatternMigrationService.migrate(mockPattern, mockSystemPack);

      expect(result.system?.profiles.frame).toBeDefined();
      expect(result.system?.profiles.sash).toBeDefined();
      expect(result.system?.profiles.glazingBead).toBeDefined();
    });

    it('should extract manufacturing rules', () => {
      const result = PatternMigrationService.migrate(mockPattern, mockSystemPack);

      expect(result.system?.fabricationRules).toBeDefined();
      expect(result.system?.fabricationRules.cutting.sawKerf).toBeGreaterThan(0);
      expect(result.system?.fabricationRules.cutting.miterAllowance).toBeGreaterThan(0);
    });

    it('should extract hardware kit', () => {
      const result = PatternMigrationService.migrate(mockPattern, mockSystemPack);

      expect(result.system?.hardwareKit.hinges).toBeDefined();
      expect(result.system?.hardwareKit.lockingSystem).toBeDefined();
      expect(result.system?.hardwareKit.handle).toBeDefined();
      expect(result.system?.hardwareKit.gaskets.glazingGasket).toBeDefined();
    });

    it('should extract constraints', () => {
      const result = PatternMigrationService.migrate(mockPattern, mockSystemPack);

      expect(result.system?.constraints.maxWidth).toBe(3000);
      expect(result.system?.constraints.maxSashArea).toBe(6);
      expect(typeof result.system?.constraints.requiresReinforcement).toBe('function');
    });

    it('should infer region from systemPack', () => {
      const result = PatternMigrationService.migrate(mockPattern, mockSystemPack);

      expect(result.system?.region).toBe('EGY');
    });

    it('should infer material from systemPack', () => {
      const result = PatternMigrationService.migrate(mockPattern, mockSystemPack);

      expect(result.system?.material).toBe('aluminum');
    });

    it('should handle validation failures', () => {
      (FenestrationSystemValidator.validate as any).mockReturnValue({
        isValid: false,
        errors: [{ code: 'VAL-001', field: 'id', message: 'Invalid ID', severity: 'error' }],
        warnings: [],
        performance: { validationTimeMs: 1, cacheHit: false, validationSteps: 6 },
      });

      const result = PatternMigrationService.migrate(mockPattern, mockSystemPack);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.rollbackData).toBeDefined();
    });

    it('should handle extraction errors', () => {
      // Create invalid systemPack that will cause extraction to fail
      const invalidPack = {
        ...mockSystemPack,
        windowSystemSpec: {},
      } as SystemPack;

      const result = PatternMigrationService.migrate(mockPattern, invalidPack);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.rollbackData).toBeDefined();
    });

    it('should track performance metrics', () => {
      const result = PatternMigrationService.migrate(mockPattern, mockSystemPack);

      expect(result.performance.migrationTimeMs).toBeGreaterThan(0);
      expect(result.performance.migrationTimeMs).toBeLessThan(100); // Should be fast
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing profiles_cutting_list', () => {
      const packWithoutCuttingList = {
        ...mockSystemPack,
        windowSystemSpec: {
          stockLengthMm: 6000,
        },
      } as SystemPack;

      const result = PatternMigrationService.migrate(mockPattern, packWithoutCuttingList);

      // Should still attempt migration with defaults
      expect(result).toBeDefined();
    });

    it('should handle missing accessories_list', () => {
      const packWithoutAccessories = {
        ...mockSystemPack,
        windowSystemSpec: {
          ...mockSystemPack.windowSystemSpec,
          accessories_list: undefined,
        },
      } as SystemPack;

      const result = PatternMigrationService.migrate(mockPattern, packWithoutAccessories);

      // Should use default hardware
      expect(result.system?.hardwareKit).toBeDefined();
    });

    it('should handle UPVC material with welding rules', () => {
      const upvcPack = {
        ...mockSystemPack,
        meta: {
          ...mockSystemPack.meta,
          category: 'upvc_windows',
        },
      } as SystemPack;

      const result = PatternMigrationService.migrate(mockPattern, upvcPack);

      expect(result.system?.material).toBe('upvc');
      expect(result.system?.fabricationRules.welding).toBeDefined();
    });

    it('should handle GCC region with thermal expansion', () => {
      const gccPack = {
        ...mockSystemPack,
        meta: {
          ...mockSystemPack.meta,
          regions: ['gcc'],
        },
      } as SystemPack;

      const result = PatternMigrationService.migrate(mockPattern, gccPack);

      expect(result.system?.region).toBe('GCC');
      expect(result.system?.regionalPhysics.thermalExpansionCoefficient).toBeGreaterThan(0);
    });
  });
});

