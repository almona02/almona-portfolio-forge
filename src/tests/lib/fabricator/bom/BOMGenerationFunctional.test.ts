/**
 * BOM Generation Functional Tests
 * 
 * Verifies correct functionality of BOM generation with DeterministicReplayEngine.
 * 
 * Test Coverage:
 * - BOM generation produces complete results
 * - Replay metadata is correctly included
 * - Performance tracking works
 * - Caching works correctly
 */

import { EgyptianPattern } from '@/data/egyptian-window-patterns';
import { SYSTEM_PACKS, type SystemPack as DataSystemPack } from '@/data/systemPacks';
import { PresetAwareBOMGenerator } from '@/lib/fabricator/PresetAwareBOMGenerator';
import type { SystemPack, WindowUnit } from '@/types/fabricator';
import { beforeEach, describe, expect, it } from 'vitest';

describe('BOM Generation Functional Tests', () => {
  let bomGenerator: PresetAwareBOMGenerator;
  let testWindowUnit: WindowUnit;
  let testPattern: EgyptianPattern;
  let testSystemPack: SystemPack;

  beforeEach(() => {
    bomGenerator = new PresetAwareBOMGenerator();
    
    testWindowUnit = {
      id: 'test-window-1',
      overallWidth: 1200,
      overallHeight: 1500,
      grid: {
        rows: 2,
        cols: 2,
        cells: [
          { id: '0-0', row: 0, col: 0, type: 'fixed' },
          { id: '0-1', row: 0, col: 1, type: 'fixed' },
          { id: '1-0', row: 1, col: 0, type: 'sash' },
          { id: '1-1', row: 1, col: 1, type: 'sash' },
        ],
      },
      components: [],
      hardware: [],
      systemPackId: 'rock60',
    } as WindowUnit;

    // Create a test pattern that matches EgyptianPattern interface
    testPattern = {
      id: 'test-pattern-1',
      name: 'Test Pattern',
      type: 'casement',
      layout: 'Test pattern layout',
      gridSpec: {
        rows: 2,
        cols: 2,
        cells: [
          { row: 0, col: 0, type: 'fixed' },
          { row: 0, col: 1, type: 'fixed' },
          { row: 1, col: 0, type: 'sash' },
          { row: 1, col: 1, type: 'sash' },
        ],
      },
      typicalWidthMm: [1200, 1500],
      typicalHeightMm: [1500, 2000],
      compatibleSystems: ['rock60'],
    } as EgyptianPattern;
    const dataSystemPack: DataSystemPack = SYSTEM_PACKS.find(p => p.meta.id === 'rock60') || SYSTEM_PACKS[0];
    // Convert data/systemPacks SystemPack to types/fabricator SystemPack
    testSystemPack = {
      id: dataSystemPack.meta.id,
      name: dataSystemPack.meta.name,
      category: 'aluminum_windows',
      brand: dataSystemPack.meta.brands[0] || 'Unknown',
      compatibleProfiles: dataSystemPack.profiles?.map(p => p.id) || [],
      compatibleAccessories: [],
      description: dataSystemPack.meta.name,
      technicalData: dataSystemPack.windowSystemSpec || {},
    } as SystemPack;
  });

  it('should generate complete BOM with all required components', async () => {
    const result = await bomGenerator.generateCompleteBOMWithPerformance(
      testWindowUnit,
      testPattern,
      testSystemPack,
      false
    );

    expect(result.bom).toBeDefined();
    expect(result.bom.profiles).toBeDefined();
    expect(result.bom.hardware).toBeDefined();
    expect(result.bom.glazing).toBeDefined();
    expect(result.bom.accessories).toBeDefined();
    expect(result.bom.assemblySequence).toBeDefined();
    expect(result.bom.cost).toBeDefined();
    expect(result.bom.metadata).toBeDefined();
    
    // Metadata should include all required fields
    expect(result.bom.metadata.generationTimestamp).toBeDefined();
    expect(result.bom.metadata.patternUsed).toBe(testPattern.id);
    expect(result.bom.metadata.systemPackUsed).toBe(testSystemPack.id);
    expect(result.bom.metadata.checksum).toBeDefined();
  }, 30000);

  it('should include replay metadata in BOM result', async () => {
    const result = await bomGenerator.generateCompleteBOMWithPerformance(
      testWindowUnit,
      testPattern,
      testSystemPack,
      false
    );

    expect(result.bom.replayMetadata).toBeDefined();
    
    if (result.bom.replayMetadata) {
      expect(result.bom.replayMetadata.inputHash).toBeDefined();
      expect(typeof result.bom.replayMetadata.inputHash).toBe('string');
      expect(result.bom.replayMetadata.inputHash.length).toBeGreaterThan(0);
      
      expect(result.bom.replayMetadata.resultSignature).toBeDefined();
      expect(typeof result.bom.replayMetadata.resultSignature).toBe('string');
      
      expect(result.bom.replayMetadata.truthVersions).toBeDefined();
      expect(result.bom.replayMetadata.truthVersions.geometry).toBeDefined();
      expect(result.bom.replayMetadata.truthVersions.material).toBeDefined();
      expect(result.bom.replayMetadata.truthVersions.machine).toBeDefined();
      expect(result.bom.replayMetadata.truthVersions.process).toBeDefined();
      expect(result.bom.replayMetadata.truthVersions.certification).toBeDefined();
      
      expect(result.bom.replayMetadata.computationId).toBeDefined();
      expect(result.bom.replayMetadata.aics001Compliance).toBe('Section 7.5');
    }
  }, 30000);

  it('should track performance metrics correctly', async () => {
    const result = await bomGenerator.generateCompleteBOMWithPerformance(
      testWindowUnit,
      testPattern,
      testSystemPack,
      false
    );

    expect(result.performanceMs).toBeGreaterThan(0);
    expect(result.performanceMs).toBeLessThan(5000); // Should complete within reasonable time
    expect(typeof result.cached).toBe('boolean');
    expect(result.cached).toBe(false); // First generation should not be cached
  }, 30000);

  it('should cache results for identical inputs', async () => {
    const firstResult = await bomGenerator.generateCompleteBOMWithPerformance(
      testWindowUnit,
      testPattern,
      testSystemPack,
      true // Enable cache
    );

    const secondResult = await bomGenerator.generateCompleteBOMWithPerformance(
      testWindowUnit,
      testPattern,
      testSystemPack,
      true // Enable cache
    );

    expect(secondResult.cached).toBe(true);
    expect(secondResult.performanceMs).toBeLessThan(firstResult.performanceMs);
    
    // Cached result should have identical metadata
    expect(firstResult.bom.metadata.patternUsed).toBe(secondResult.bom.metadata.patternUsed);
    expect(firstResult.bom.metadata.systemPackUsed).toBe(secondResult.bom.metadata.systemPackUsed);
  }, 30000);

  it('should generate deterministic results for identical inputs', async () => {
    const result1 = await bomGenerator.generateCompleteBOM(
      testWindowUnit,
      testPattern,
      testSystemPack,
      false
    );

    const result2 = await bomGenerator.generateCompleteBOM(
      testWindowUnit,
      testPattern,
      testSystemPack,
      false
    );

    // Results should be deterministic (same inputs = same outputs)
    expect(result1.metadata.patternUsed).toBe(result2.metadata.patternUsed);
    expect(result1.metadata.systemPackUsed).toBe(result2.metadata.systemPackUsed);
    
    // Replay metadata should have same input hash
    if (result1.replayMetadata && result2.replayMetadata) {
      expect(result1.replayMetadata.inputHash).toBe(result2.replayMetadata.inputHash);
    }
  }, 30000);

  it('should handle different window unit configurations', async () => {
    const configurations = [
      { width: 1000, height: 1200 },
      { width: 1500, height: 1800 },
      { width: 2000, height: 2400 },
    ];

    for (const config of configurations) {
      const windowUnit = {
        ...testWindowUnit,
        overallWidth: config.width,
        overallHeight: config.height,
      };

      const result = await bomGenerator.generateCompleteBOMWithPerformance(
        windowUnit,
        testPattern,
        testSystemPack,
        false
      );

      expect(result.bom).toBeDefined();
      expect(result.bom.cost).toBeDefined();
      expect(result.bom.cost.totalCost).toBeGreaterThan(0);
    }
  }, 30000);

  it('should maintain backward compatibility with generateCompleteBOM', async () => {
    // Test that the original method still works
    const result = await bomGenerator.generateCompleteBOM(
      testWindowUnit,
      testPattern,
      testSystemPack,
      false
    );

    expect(result).toBeDefined();
    expect(result.profiles).toBeDefined();
    expect(result.hardware).toBeDefined();
    expect(result.glazing).toBeDefined();
    expect(result.accessories).toBeDefined();
    expect(result.metadata).toBeDefined();
    
    // Replay metadata should be included
    expect(result.replayMetadata).toBeDefined();
  }, 30000);
});

