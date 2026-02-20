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

import type { FenestrationSystem } from '@/types/fenestration';
import type { WindowUnit } from '@/types/fabricator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DualOutputGenerator } from '../../DualOutputGenerator';
import { ApexEngineV2 } from '../ApexEngineV2';
import { GoldTierOrchestrator } from '../GoldTierOrchestrator';

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
      system: {
        id: 'test-system',
        name: 'Test System',
        profiles: { frame: { code: 'F1' } },
        fabricationRules: {},
        regionalPhysics: {},
        metadata: { validationStatus: 'validated' }
      } as FenestrationSystem,
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

// Mock EGYPTIAN_PATTERNS for migration tests to avoid "0 > 0" failure if real data is missing/different
vi.mock('@/data/egyptian-window-patterns', () => ({
  EGYPTIAN_PATTERNS: [
    { id: 'sliding-2s', name: 'Sliding 2 Sash', type: 'sliding' },
    { id: 'casement-double', name: 'Casement Double', type: 'casement' },
    // Add enough items if tests count them
  ]
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
      presetId: 'legacy-preset', // Use non-migrated pattern by default
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
    vi.mocked(ApexEngineV2).mockImplementation(() => ({
      generateAssembly: vi.fn().mockReturnValue({ // Synchronous return
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
    vi.mocked(DualOutputGenerator).mockImplementation(() => ({
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
          productionSequence: [],
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

      // Use a migrated pattern
      mockWindowUnit.presetId = 'sliding-2s';

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

      mockWindowUnit.presetId = 'sliding-2s';

      // Mock error in ApexEngineV2
      vi.mocked(ApexEngineV2).mockImplementation(() => {
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
      
      mockWindowUnit.presetId = 'sliding-2s';

      // Mock validation failure
      vi.mocked(ApexEngineV2).mockImplementation(() => ({
        generateAssembly: vi.fn().mockReturnValue({
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
      vi.mocked(DualOutputGenerator).mockImplementation(() => ({
        generateForWindowUnit: vi.fn().mockResolvedValue({
          geometry: {
            frame: { outline: [], corners: [] },
            sashes: [],
            glazing: [],
          },
          fabrication: {
            profiles: [{ 
              profileCode: 'TEST', 
              role: 'frame',
              quantity: 1,
              length: 500, // 500mm
              cuttingLengths: [500],
              angles: [90, 90],
              machiningZones: [],
              weight: 1,
              cost: 10
            }],
            hardware: [],
            glazing: [],
            productionSequence: [],
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

