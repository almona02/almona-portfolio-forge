/**
 * Unit Tests for Top Patterns Migration
 * 
 * Tests batch migration of top patterns per region.
 * 
 * @since Gold Tier Phase 1, Task 1.3
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FenestrationSystemValidator } from '../FenestrationSystemValidator';
import { PatternMigrationService } from '../PatternMigrationService';
import {
    exportMigratedSystems,
    generateMigrationReport,
    migrateAllTopPatterns,
    migrateGCCThermalBreakSystems,
    migrateTopEgyptianPatterns,
    migrateTurkishUPVCSystems,
} from '../migrateTopPatterns';

// Mock dependencies
vi.mock('../PatternMigrationService');
vi.mock('../FenestrationSystemValidator');
vi.mock('@/data/systemPacks', () => ({
  SYSTEM_PACKS: [
    { meta: { id: 'rock60', name: 'ROCK 60' } },
    { meta: { id: 'panda-50', name: 'Panda 50' } },
    { meta: { id: 'anadolu_w60', name: 'Anadolu W60' } },
    { meta: { id: 'kale_70_sliding', name: 'Kale 70' } },
    { meta: { id: 'asas_cw100', name: 'Asas CW100' } },
    { meta: { id: 'jumbo100', name: 'Jumbo 100' } },
  ],
}));
vi.mock('@/data/egyptian-window-patterns', () => ({
  EGYPTIAN_PATTERNS: [
    { id: 'sliding-2s', name: 'Sliding 2S', region: 'EGY' },
    { id: 'casement-double', name: 'Casement Double', region: 'EGY' },
    { id: 'sliding-4s', name: 'Sliding 4S', region: 'EGY' },
    { id: 'casement-2sash', name: 'Casement 2 Sash', region: 'EGY' },
    { id: 'casement-2sash-fixed', name: 'Casement Fixed', region: 'EGY' },
  ],
}));
vi.mock('../PerformanceMonitor', () => ({
  GoldTierPerformanceMonitor: {
    clear: vi.fn(),
    getCacheHitRate: vi.fn().mockReturnValue(0.85),
    getStats: vi.fn().mockReturnValue({
      count: 10,
      avgMs: 25,
      minMs: 10,
      maxMs: 50,
      p95Ms: 45,
      p99Ms: 48,
    }),
  },
}));
vi.mock('@/lib/audit/fabricatorAudit', () => ({
  logFabricatorAudit: vi.fn().mockResolvedValue(undefined),
}));

describe('Top Patterns Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful migration
    (PatternMigrationService.migrate as any).mockImplementation((pattern: any) => {
      return {
        success: true,
        system: {
          id: `MIGRATED-${pattern.id}`,
          name: pattern.name,
          region: 'EGY',
          material: 'aluminum',
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            validationStatus: 'draft',
          },
        },
        errors: [],
        warnings: [],
        rollbackData: pattern,
        performance: {
          migrationTimeMs: 25,
        },
      };
    });
    
    // Mock successful validation
    (FenestrationSystemValidator.validate as any).mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
      performance: { validationTimeMs: 1, cacheHit: false, validationSteps: 6 },
    });
  });

  describe('migrateTopEgyptianPatterns', () => {
    it('should migrate top 5 Egyptian patterns', async () => {
      const result = await migrateTopEgyptianPatterns();

      expect(result.total).toBe(5);
      expect(result.successful).toBeGreaterThan(0);
      expect(result.systems.length).toBe(result.successful);
    });

    it('should handle migration errors gracefully', async () => {
      (PatternMigrationService.migrate as any).mockImplementationOnce(() => ({
        success: false,
        errors: ['Migration failed'],
        warnings: [],
        rollbackData: null,
        performance: { migrationTimeMs: 10 },
      }));

      const result = await migrateTopEgyptianPatterns();

      expect(result.failed).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('migrateTurkishUPVCSystems', () => {
    it('should migrate Turkish UPVC systems', async () => {
      const result = await migrateTurkishUPVCSystems();

      expect(result.total).toBe(3);
      expect(result.successful).toBeGreaterThan(0);
    });
  });

  describe('migrateGCCThermalBreakSystems', () => {
    it('should migrate GCC thermal-break systems', async () => {
      const result = await migrateGCCThermalBreakSystems();

      expect(result.total).toBe(2);
      expect(result.successful).toBeGreaterThan(0);
    });
  });

  describe('migrateAllTopPatterns', () => {
    it('should migrate all regions', async () => {
      const results = await migrateAllTopPatterns();

      expect(results.egypt.total).toBe(5);
      expect(results.turkey.total).toBe(3);
      expect(results.gcc.total).toBe(2);
      expect(results.overall.total).toBe(10);
    });

    it('should calculate overall statistics', async () => {
      const results = await migrateAllTopPatterns();

      expect(results.overall.successful).toBeGreaterThan(0);
      expect(results.overall.totalTimeMs).toBeGreaterThan(0);
    });
  });

  describe('generateMigrationReport', () => {
    it('should generate comprehensive report', () => {
      const mockResults = {
        egypt: {
          total: 5,
          successful: 5,
          failed: 0,
          systems: [],
          errors: [],
          performance: {
            totalTimeMs: 125,
            averageTimeMs: 25,
            minTimeMs: 20,
            maxTimeMs: 30,
          },
        },
        turkey: {
          total: 3,
          successful: 3,
          failed: 0,
          systems: [],
          errors: [],
          performance: {
            totalTimeMs: 75,
            averageTimeMs: 25,
            minTimeMs: 20,
            maxTimeMs: 30,
          },
        },
        gcc: {
          total: 2,
          successful: 2,
          failed: 0,
          systems: [],
          errors: [],
          performance: {
            totalTimeMs: 50,
            averageTimeMs: 25,
            minTimeMs: 20,
            maxTimeMs: 30,
          },
        },
        overall: {
          total: 10,
          successful: 10,
          failed: 0,
          totalTimeMs: 250,
        },
      };

      const report = generateMigrationReport(mockResults);

      expect(report).toContain('GOLD TIER PATTERN MIGRATION REPORT');
      expect(report).toContain('EGYPTIAN PATTERNS');
      expect(report).toContain('TURKISH UPVC SYSTEMS');
      expect(report).toContain('GCC THERMAL-BREAK SYSTEMS');
      expect(report).toContain('PERFORMANCE STATISTICS');
    });

    it('should include error details in report', () => {
      const mockResults = {
        egypt: {
          total: 5,
          successful: 4,
          failed: 1,
          systems: [],
          errors: [
            {
              patternId: 'test-pattern',
              errors: ['Migration failed', 'Validation error'],
            },
          ],
          performance: {
            totalTimeMs: 125,
            averageTimeMs: 25,
            minTimeMs: 20,
            maxTimeMs: 30,
          },
        },
        turkey: {
          total: 3,
          successful: 3,
          failed: 0,
          systems: [],
          errors: [],
          performance: {
            totalTimeMs: 75,
            averageTimeMs: 25,
            minTimeMs: 20,
            maxTimeMs: 30,
          },
        },
        gcc: {
          total: 2,
          successful: 2,
          failed: 0,
          systems: [],
          errors: [],
          performance: {
            totalTimeMs: 50,
            averageTimeMs: 25,
            minTimeMs: 20,
            maxTimeMs: 30,
          },
        },
        overall: {
          total: 10,
          successful: 9,
          failed: 1,
          totalTimeMs: 250,
        },
      };

      const report = generateMigrationReport(mockResults);

      expect(report).toContain('test-pattern');
      expect(report).toContain('Migration failed');
    });
  });

  describe('exportMigratedSystems', () => {
    it('should export systems to JSON', () => {
      const systems = [
        {
          id: 'TEST-1',
          name: 'Test System',
          region: 'EGY',
          material: 'aluminum',
        },
      ] as any[];

      const json = exportMigratedSystems(systems);

      expect(json).toContain('TEST-1');
      expect(json).toContain('Test System');
      expect(() => JSON.parse(json)).not.toThrow();
    });
  });
});

