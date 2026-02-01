/**
 * Migrate Top Patterns Per Region - Gold Tier Task 1.3
 * 
 * Surgical migration of top 5 patterns per region to FenestrationSystem:
 * - Egypt: Top 5 most popular patterns
 * - Turkey: 2-3 Turkish UPVC systems
 * - GCC: 1-2 aluminum thermal-break systems
 * 
 * This script provides:
 * - Batch migration with progress tracking
 * - Comprehensive validation
 * - Error reporting
 * - Performance metrics
 * - Migration report generation
 * 
 * @since Gold Tier Phase 1, Task 1.3
 */

import { EGYPTIAN_PATTERNS, type EgyptianPattern } from '@/data/egyptian-window-patterns';
import { SYSTEM_PACKS, type SystemPack } from '@/data/systemPacks';
import { PatternMigrationService, type MigrationResult } from './PatternMigrationService';
import { FenestrationSystemValidator } from './FenestrationSystemValidator';
import { GoldTierPerformanceMonitor } from './PerformanceMonitor';
import { logFabricatorAudit } from '@/lib/audit/fabricatorAudit';
import type { FenestrationSystem } from '@/types/fenestration';

export interface MigrationBatchResult {
  total: number;
  successful: number;
  failed: number;
  systems: FenestrationSystem[];
  errors: Array<{
    patternId: string;
    errors: string[];
  }>;
  performance: {
    totalTimeMs: number;
    averageTimeMs: number;
    minTimeMs: number;
    maxTimeMs: number;
  };
}

export interface PatternMigrationConfig {
  patternId: string;
  systemPackId: string;
  priority: number;
  region: 'EGY' | 'TUR' | 'GCC';
}

/**
 * Top 5 Egyptian Patterns (Most Popular)
 * Based on market analysis and usage frequency
 */
const TOP_EGYPTIAN_PATTERNS: PatternMigrationConfig[] = [
  {
    patternId: 'sliding-2s',
    systemPackId: 'rock60',
    priority: 1,
    region: 'EGY',
  },
  {
    patternId: 'casement-double',
    systemPackId: 'panda-50',
    priority: 2,
    region: 'EGY',
  },
  {
    patternId: 'sliding-4s',
    systemPackId: 'rock60',
    priority: 3,
    region: 'EGY',
  },
  {
    patternId: 'casement-2sash',
    systemPackId: 'panda-50',
    priority: 4,
    region: 'EGY',
  },
  {
    patternId: 'casement-2sash-fixed',
    systemPackId: 'panda-50',
    priority: 5,
    region: 'EGY',
  },
];

/**
 * Turkish UPVC Systems (2-3 systems)
 */
const TURKISH_UPVC_SYSTEMS: PatternMigrationConfig[] = [
  {
    patternId: 'sliding-2s', // Use sliding pattern with Turkish system
    systemPackId: 'anadolu_w60',
    priority: 1,
    region: 'TUR',
  },
  {
    patternId: 'casement-double', // Use casement pattern with Turkish system
    systemPackId: 'kale_70_sliding',
    priority: 2,
    region: 'TUR',
  },
  {
    patternId: 'sliding-2s',
    systemPackId: 'asas_cw100',
    priority: 3,
    region: 'TUR',
  },
];

/**
 * GCC Aluminum Thermal-Break Systems (1-2 systems)
 */
const GCC_THERMAL_BREAK_SYSTEMS: PatternMigrationConfig[] = [
  {
    patternId: 'sliding-2s',
    systemPackId: 'jumbo100', // Large thermal-break system
    priority: 1,
    region: 'GCC',
  },
  {
    patternId: 'casement-double',
    systemPackId: 'rock60', // Can be adapted for GCC
    priority: 2,
    region: 'GCC',
  },
];

/**
 * Migrate single pattern with comprehensive error handling
 */
async function migratePattern(
  pattern: EgyptianPattern,
  systemPack: SystemPack
): Promise<MigrationResult> {
  const startTime = performance.now();
  
  try {
    const result = PatternMigrationService.migrate(pattern, systemPack);
    
    // If migration succeeded, validate the system
    if (result.success && result.system) {
      const validation = FenestrationSystemValidator.validate(result.system);
      
      if (!validation.isValid) {
        // Migration succeeded but validation failed
        return {
          ...result,
          success: false,
          errors: [
            ...result.errors,
            ...validation.errors.map(e => `Validation: ${e.code}: ${e.message}`),
          ],
        };
      }
      
      // Update metadata with validation status
      result.system.metadata.validationStatus = 'validated';
    }
    
    return result;
  } catch (error) {
    const migrationTime = performance.now() - startTime;
    
    return {
      success: false,
      errors: [error instanceof Error ? error.message : String(error)],
      warnings: [],
      rollbackData: pattern,
      performance: {
        migrationTimeMs: migrationTime,
      },
    };
  }
}

/**
 * Migrate batch of patterns
 */
export async function migratePatternBatch(
  configs: PatternMigrationConfig[]
): Promise<MigrationBatchResult> {
  const startTime = performance.now();
  const systems: FenestrationSystem[] = [];
  const errors: Array<{ patternId: string; errors: string[] }> = [];
  const migrationTimes: number[] = [];
  
  // Clear performance monitor for clean metrics
  GoldTierPerformanceMonitor.clear();
  
  for (const config of configs) {
    // Find pattern
    const pattern = EGYPTIAN_PATTERNS.find(p => p.id === config.patternId);
    if (!pattern) {
      errors.push({
        patternId: config.patternId,
        errors: [`Pattern not found: ${config.patternId}`],
      });
      continue;
    }
    
    // Find system pack
    const systemPack = SYSTEM_PACKS.find(p => p.meta.id === config.systemPackId);
    if (!systemPack) {
      errors.push({
        patternId: config.patternId,
        errors: [`System pack not found: ${config.systemPackId}`],
      });
      continue;
    }
    
    // Migrate
    const result = await migratePattern(pattern, systemPack);
    migrationTimes.push(result.performance.migrationTimeMs);
    
    if (result.success && result.system) {
      systems.push(result.system);
    } else {
      errors.push({
        patternId: config.patternId,
        errors: result.errors,
      });
    }
  }
  
  const totalTime = performance.now() - startTime;
  
  // Calculate performance metrics
  const performance = {
    totalTimeMs: totalTime,
    averageTimeMs: migrationTimes.length > 0
      ? migrationTimes.reduce((a, b) => a + b, 0) / migrationTimes.length
      : 0,
    minTimeMs: migrationTimes.length > 0 ? Math.min(...migrationTimes) : 0,
    maxTimeMs: migrationTimes.length > 0 ? Math.max(...migrationTimes) : 0,
  };
  
  // Audit log
  await logFabricatorAudit({
    action: 'BATCH_OPERATION',
    tableName: 'fenestration_systems',
    status: errors.length === 0 ? 'success' : 'partial',
    operationDurationMs: totalTime,
    operationType: 'pattern_batch_migration',
    recordsAffected: systems.length,
    newValues: {
      total: configs.length,
      successful: systems.length,
      failed: errors.length,
      performance,
    },
    errorMessage: errors.length > 0 ? `${errors.length} migrations failed` : undefined,
  });
  
  return {
    total: configs.length,
    successful: systems.length,
    failed: errors.length,
    systems,
    errors,
    performance,
  };
}

/**
 * Migrate top 5 Egyptian patterns
 */
export async function migrateTopEgyptianPatterns(): Promise<MigrationBatchResult> {
  return migratePatternBatch(TOP_EGYPTIAN_PATTERNS);
}

/**
 * Migrate Turkish UPVC systems
 */
export async function migrateTurkishUPVCSystems(): Promise<MigrationBatchResult> {
  return migratePatternBatch(TURKISH_UPVC_SYSTEMS);
}

/**
 * Migrate GCC thermal-break systems
 */
export async function migrateGCCThermalBreakSystems(): Promise<MigrationBatchResult> {
  return migratePatternBatch(GCC_THERMAL_BREAK_SYSTEMS);
}

/**
 * Migrate all top patterns (Egypt + Turkey + GCC)
 */
export async function migrateAllTopPatterns(): Promise<{
  egypt: MigrationBatchResult;
  turkey: MigrationBatchResult;
  gcc: MigrationBatchResult;
  overall: {
    total: number;
    successful: number;
    failed: number;
    totalTimeMs: number;
  };
}> {
  const startTime = performance.now();
  
  // Migrate all regions in parallel
  const [egypt, turkey, gcc] = await Promise.all([
    migrateTopEgyptianPatterns(),
    migrateTurkishUPVCSystems(),
    migrateGCCThermalBreakSystems(),
  ]);
  
  const totalTime = performance.now() - startTime;
  
  const overall = {
    total: egypt.total + turkey.total + gcc.total,
    successful: egypt.successful + turkey.successful + gcc.successful,
    failed: egypt.failed + turkey.failed + gcc.failed,
    totalTimeMs: totalTime,
  };
  
  return {
    egypt,
    turkey,
    gcc,
    overall,
  };
}

/**
 * Generate migration report
 */
export function generateMigrationReport(results: {
  egypt: MigrationBatchResult;
  turkey: MigrationBatchResult;
  gcc: MigrationBatchResult;
  overall: {
    total: number;
    successful: number;
    failed: number;
    totalTimeMs: number;
  };
}): string {
  const report: string[] = [];
  
  report.push('='.repeat(80));
  report.push('GOLD TIER PATTERN MIGRATION REPORT');
  report.push('='.repeat(80));
  report.push('');
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push('');
  
  // Overall Summary
  report.push('OVERALL SUMMARY');
  report.push('-'.repeat(80));
  report.push(`Total Patterns: ${results.overall.total}`);
  report.push(`Successful: ${results.overall.successful} (${((results.overall.successful / results.overall.total) * 100).toFixed(1)}%)`);
  report.push(`Failed: ${results.overall.failed} (${((results.overall.failed / results.overall.total) * 100).toFixed(1)}%)`);
  report.push(`Total Time: ${results.overall.totalTimeMs.toFixed(2)}ms`);
  report.push('');
  
  // Egypt Results
  report.push('EGYPTIAN PATTERNS (Top 5)');
  report.push('-'.repeat(80));
  report.push(`Successful: ${results.egypt.successful}/${results.egypt.total}`);
  report.push(`Average Time: ${results.egypt.performance.averageTimeMs.toFixed(2)}ms`);
  if (results.egypt.errors.length > 0) {
    report.push('Errors:');
    results.egypt.errors.forEach(err => {
      report.push(`  - ${err.patternId}: ${err.errors.join(', ')}`);
    });
  }
  report.push('');
  
  // Turkey Results
  report.push('TURKISH UPVC SYSTEMS');
  report.push('-'.repeat(80));
  report.push(`Successful: ${results.turkey.successful}/${results.turkey.total}`);
  report.push(`Average Time: ${results.turkey.performance.averageTimeMs.toFixed(2)}ms`);
  if (results.turkey.errors.length > 0) {
    report.push('Errors:');
    results.turkey.errors.forEach(err => {
      report.push(`  - ${err.patternId}: ${err.errors.join(', ')}`);
    });
  }
  report.push('');
  
  // GCC Results
  report.push('GCC THERMAL-BREAK SYSTEMS');
  report.push('-'.repeat(80));
  report.push(`Successful: ${results.gcc.successful}/${results.gcc.total}`);
  report.push(`Average Time: ${results.gcc.performance.averageTimeMs.toFixed(2)}ms`);
  if (results.gcc.errors.length > 0) {
    report.push('Errors:');
    results.gcc.errors.forEach(err => {
      report.push(`  - ${err.patternId}: ${err.errors.join(', ')}`);
    });
  }
  report.push('');
  
  // Performance Statistics
  report.push('PERFORMANCE STATISTICS');
  report.push('-'.repeat(80));
  const allSystems = [
    ...results.egypt.systems,
    ...results.turkey.systems,
    ...results.gcc.systems,
  ];
  report.push(`Total Systems Migrated: ${allSystems.length}`);
  report.push(`Cache Hit Rate: ${(GoldTierPerformanceMonitor.getCacheHitRate() * 100).toFixed(1)}%`);
  
  const perfStats = GoldTierPerformanceMonitor.getStats('migrate');
  if (perfStats.count > 0) {
    report.push(`Migration Performance:`);
    report.push(`  - Average: ${perfStats.avgMs.toFixed(2)}ms`);
    report.push(`  - Min: ${perfStats.minMs.toFixed(2)}ms`);
    report.push(`  - Max: ${perfStats.maxMs.toFixed(2)}ms`);
    report.push(`  - P95: ${perfStats.p95Ms.toFixed(2)}ms`);
    report.push(`  - P99: ${perfStats.p99Ms.toFixed(2)}ms`);
  }
  report.push('');
  
  report.push('='.repeat(80));
  
  return report.join('\n');
}

/**
 * Export migrated systems to JSON
 */
export function exportMigratedSystems(systems: FenestrationSystem[]): string {
  return JSON.stringify(systems, null, 2);
}

