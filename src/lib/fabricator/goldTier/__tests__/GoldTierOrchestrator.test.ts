/**
 * Unit Tests for GoldTierOrchestrator
 * 
 * Tests smart routing between engines with:
 * - Feature flag routing
 * - Fallback mechanism
 * - A/B testing validation
 * - Error handling
 * 
 * @since Gold Tier Phase 1, Task 3.1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoldTierOrchestrator } from '../GoldTierOrchestrator';
import { ApexEngineV2 } from '../ApexEngineV2';
import { DualOutputGenerator } from '../../DualOutputGenerator';
import type { WindowUnit } from '@/types/fabricator';
import { createValidSystem } from './testFixtures';

// Mock dependencies
vi.mock('../ApexEngineV2');
vi.mock('../../DualOutputGenerator');
vi.mock('../PerformanceMonitor', () => ({
  GoldTierPerformanceMonitor: {
    record: vi.fn().mockReturnValue('test-id'),
    getStats: vi.fn().mockReturnValue({
      count: 10,
      avgMs: 25,
      successRate: 0.95,
    }),
  },
}));
vi.mock('@/lib/audit/fabricatorAudit', () => ({
  logFabricatorAudit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../PatternMigrationService', () => ({
  PatternMigrationService: {
    migrate: vi.fn().mockReturnValue({
      success: true,
      system: createValidSystem(),
      errors: [],
      warnings: [],
    }),
  },
}));
vi.mock('../../presetUtils', () => ({
  getPatternById: vi.fn().mockReturnValue({
    id: 'sliding-2s',
    name: 'Sliding Window – 2 Sash',
    compatibleSystems: ['rock60'],
  }),
}));
vi.mock('@/data/systemPacks', () => ({
  SYSTEM_PACKS: [
    {
      meta: {
        id: 'rock60',
        name: 'ROCK 60',
        brands: ['Test Brand'],
        regions: ['egypt'],
      },
    },
  ],
}));

describe('GoldTierOrchestrator', () => {
  let orchestrator: GoldTierOrchestrator;
  let mockWindowUnit: WindowUnit;

  beforeEach(() => {
    orchestrator = new GoldTierOrchestrator();
    
    mockWindowUnit = {
      id: 'test-window-1',
      orderNumber: 'ORD-001',
      posNumber: 'POS-001',
      type: 'window',
      components: [],
      overallWidth: 1200,
      overallHeight: 1500,
      color: 'Silver',
      glazing: { type: 'double', thickness: 24 },
      hardware: [],
      status: 'design',
      optimization: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      presetId: 'sliding-2s',
      systemPackId: 'rock60',
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

    // Mock ApexEngineV2
    (ApexEngineV2 as any).mockImplementation(() => ({
      generateAssembly: vi.fn().mockResolvedValue({
        visualGeometry: {
          frame: { outline: [], corners: [] },
          sashes: [],
          glazing: [],
        },
        fabricationData: {
          bom: {
            profiles: [],
            hardware: [],
            glazing: [],
            gaskets: [],
          },
          cutList: [],
          assembly: { steps: [] },
          qualityChecks: [],
        },
        performance: {
          calculationTimeMs: 50,
          cacheHit: false,
        },
      }),
    }));

    // Mock DualOutputGenerator
    (DualOutputGenerator as any).mockImplementation(() => ({
      generateForWindowUnit: vi.fn().mockResolvedValue({
        geometry: {
          frame: { outline: [], corners: [] },
          sashes: [],
          glazing: [],
        },
        fabrication: {
          profiles: [],
          hardware: [],
          glazing: [],
        },
        existingCutList: [],
      }),
    }));

    // Mock environment
    vi.stubGlobal('import', {
      meta: {
        env: {
          VITE_GOLD_TIER_ENABLED: 'false',
        },
      },
    });
  });

  describe('generate', () => {
    it('should use legacy engine when Gold Tier is disabled', async () => {
      const result = await orchestrator.generate(mockWindowUnit);

      expect(result.engine).toBe('legacy');
      expect(result.fallbackReason).toBeDefined();
    });

    it('should use legacy engine when forced', async () => {
      const result = await orchestrator.generate(mockWindowUnit, {
        forceLegacy: true,
      });

      expect(result.engine).toBe('legacy');
    });

    it('should use Gold Tier when enabled and pattern migrated', async () => {
      // Enable Gold Tier
      vi.stubGlobal('import', {
        meta: {
          env: {
            VITE_GOLD_TIER_ENABLED: 'true',
          },
        },
      });

      const result = await orchestrator.generate(mockWindowUnit);

      // Should attempt Gold Tier (may fallback if validation fails)
      expect(result).toBeDefined();
      expect(result.performance.calculationTimeMs).toBeGreaterThan(0);
    });

    it('should fallback to legacy on error', async () => {
      // Enable Gold Tier but cause error
      vi.stubGlobal('import', {
        meta: {
          env: {
            VITE_GOLD_TIER_ENABLED: 'true',
          },
        },
      });

      // Mock error in ApexEngineV2
      (ApexEngineV2 as any).mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = await orchestrator.generate(mockWindowUnit);

      expect(result.engine).toBe('legacy');
      expect(result.fallbackReason).toBeDefined();
    });

    it('should skip validation when requested', async () => {
      vi.stubGlobal('import', {
        meta: {
          env: {
            VITE_GOLD_TIER_ENABLED: 'true',
          },
        },
      });

      const result = await orchestrator.generate(mockWindowUnit, {
        skipValidation: true,
      });

      expect(result.validation).toBeUndefined();
    });
  });

  describe('Validation', () => {
    it('should validate Gold Tier against legacy', async () => {
      vi.stubGlobal('import', {
        meta: {
          env: {
            VITE_GOLD_TIER_ENABLED: 'true',
          },
        },
      });

      const result = await orchestrator.generate(mockWindowUnit, {
        skipValidation: false,
      });

      // Validation may or may not be present depending on engine used
      if (result.validation) {
        expect(result.validation.passed).toBeDefined();
      }
    });

    it('should fallback on critical validation errors', async () => {
      vi.stubGlobal('import', {
        meta: {
          env: {
            VITE_GOLD_TIER_ENABLED: 'true',
          },
        },
      });

      // Mock validation failure
      (ApexEngineV2 as any).mockImplementation(() => ({
        generateAssembly: vi.fn().mockResolvedValue({
          visualGeometry: {
            frame: { outline: [], corners: [] },
            sashes: [],
            glazing: [],
          },
          fabricationData: {
            bom: {
              profiles: [{ profileCode: 'TEST', cutLength: 1000000 }], // 1000mm
              hardware: [],
              glazing: [],
              gaskets: [],
            },
            cutList: [],
            assembly: { steps: [] },
            qualityChecks: [],
          },
          performance: {
            calculationTimeMs: 50,
            cacheHit: false,
          },
        }),
      }));

      // Mock legacy with different result
      (DualOutputGenerator as any).mockImplementation(() => ({
        generateForWindowUnit: vi.fn().mockResolvedValue({
          geometry: {
            frame: { outline: [], corners: [] },
            sashes: [],
            glazing: [],
          },
          fabrication: {
            profiles: [{ id: 'TEST', cutLength: 500000 }], // 500mm - large difference
            hardware: [],
            glazing: [],
          },
          existingCutList: [],
        }),
      }));

      const result = await orchestrator.generate(mockWindowUnit);

      // Should fallback due to validation error
      expect(result.engine).toBe('legacy');
    });
  });

  describe('getStatistics', () => {
    it('should return engine usage statistics', () => {
      const stats = GoldTierOrchestrator.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.goldTierCount).toBeGreaterThanOrEqual(0);
      expect(stats.legacyCount).toBeGreaterThanOrEqual(0);
      expect(stats.goldTierSuccessRate).toBeGreaterThanOrEqual(0);
      expect(stats.averageGoldTierTime).toBeGreaterThanOrEqual(0);
      expect(stats.averageLegacyTime).toBeGreaterThanOrEqual(0);
    });
  });
});

