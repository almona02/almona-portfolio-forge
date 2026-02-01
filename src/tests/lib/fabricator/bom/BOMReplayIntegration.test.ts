/**
 * BOM Replay Integration Tests
 * 
 * Tests deterministic replay guarantee for BOM generation (AICS-001 Section 7.5)
 * 
 * Verifies:
 * - Identical inputs → identical BOM + identical replay metadata
 * - Replay verification endpoint works
 * - Performance with replay tracking
 */

import { EgyptianPattern } from '@/data/egyptian-window-patterns';
import { PresetAwareBOMGenerator } from '@/lib/fabricator/PresetAwareBOMGenerator';
import type { SystemPack, WindowUnit } from '@/types/fabricator';
import { beforeEach, describe, expect, test } from 'vitest';

/**
 * Create a test window unit
 */
function createTestWindowUnit(): WindowUnit {
  return {
    id: 'test-window-1',
    orderNumber: 'TEST-001',
    posNumber: 'POS-001',
    type: 'window',
    color: 'white',
    glazing: { type: 'double', thickness: 24 },
    overallWidth: 1200,
    overallHeight: 1500,
    systemPackId: 'test-system-pack',
    components: [],
    hardware: [],
    status: 'design',
    optimization: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    grid: {
      rows: 1,
      cols: 1,
      cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }]
    }
  } as WindowUnit;
}

/**
 * Create a test pattern
 */
function createTestPattern(): EgyptianPattern {
  return {
    id: 'test-pattern-1',
    name: 'Test Pattern',
    type: 'casement',
    layout: 'Test pattern layout',
    gridSpec: {
      rows: 1,
      cols: 1,
      cells: [{ row: 0, col: 0, type: 'fixed' }]
    },
    typicalWidthMm: [1200, 1500],
    typicalHeightMm: [1500, 2000],
    compatibleSystems: ['test-system-pack'],
  } as EgyptianPattern;
}

/**
 * Create a test system pack
 */
function createTestSystemPack(): SystemPack {
  return {
    id: 'test-system-pack',
    name: 'Test System Pack',
    category: 'aluminum_windows',
    brand: 'Test Brand',
    compatibleProfiles: [],
    compatibleAccessories: [],
    description: 'Test system pack',
    technicalData: {}
  };
}

describe('BOM Replay Integration Tests (AICS-001 Section 7.5)', () => {
  let generator: PresetAwareBOMGenerator;
  let testWindowUnit: WindowUnit;
  let testPattern: EgyptianPattern;
  let testSystemPack: SystemPack;

  beforeEach(() => {
    generator = new PresetAwareBOMGenerator();
    testWindowUnit = createTestWindowUnit();
    testPattern = createTestPattern();
    testSystemPack = createTestSystemPack();
  });

  describe('Test 1: Identical Inputs → Identical BOM + Identical Replay Metadata', () => {
    test('Same inputs produce identical BOM results', async () => {
      // Generate BOM twice with identical inputs
      const bom1 = await generator.generateCompleteBOM(testWindowUnit, testPattern, testSystemPack);
      const bom2 = await generator.generateCompleteBOM(testWindowUnit, testPattern, testSystemPack);

      // BOM results should be identical (except metadata timestamps)
      expect(bom1.profiles.length).toBe(bom2.profiles.length);
      expect(bom1.hardware.length).toBe(bom2.hardware.length);
      expect(bom1.glazing.length).toBe(bom2.glazing.length);
      expect(bom1.accessories.length).toBe(bom2.accessories.length);
      expect(bom1.cost.totalCost).toBe(bom2.cost.totalCost);

      // Replay metadata should exist
      expect(bom1.replayMetadata).toBeDefined();
      expect(bom2.replayMetadata).toBeDefined();

      if (bom1.replayMetadata && bom2.replayMetadata) {
        // Input hashes should be identical
        expect(bom1.replayMetadata.inputHash).toBe(bom2.replayMetadata.inputHash);

        // Result signatures should be identical
        expect(bom1.replayMetadata.resultSignature).toBe(bom2.replayMetadata.resultSignature);

        // Computation IDs should be identical (cached result)
        expect(bom1.replayMetadata.computationId).toBe(bom2.replayMetadata.computationId);

        // Truth versions should match
        expect(bom1.replayMetadata.truthVersions.geometry).toBe(bom2.replayMetadata.truthVersions.geometry);
        expect(bom1.replayMetadata.truthVersions.material).toBe(bom2.replayMetadata.truthVersions.material);
        expect(bom1.replayMetadata.truthVersions.machine).toBe(bom2.replayMetadata.truthVersions.machine);
        expect(bom1.replayMetadata.truthVersions.process).toBe(bom2.replayMetadata.truthVersions.process);
        expect(bom1.replayMetadata.truthVersions.certification).toBe(bom2.replayMetadata.truthVersions.certification);
      }
    });

    test('Replay metadata includes AICS-001 Section 7.5 compliance marker', async () => {
      const bom = await generator.generateCompleteBOM(testWindowUnit, testPattern, testSystemPack);

      expect(bom.replayMetadata).toBeDefined();
      if (bom.replayMetadata) {
        expect(bom.replayMetadata.aics001Compliance).toBe('Section 7.5');
        expect(bom.replayMetadata.inputHash).toBeDefined();
        expect(bom.replayMetadata.resultSignature).toBeDefined();
        expect(bom.replayMetadata.computationId).toBeDefined();
        expect(bom.replayMetadata.truthVersions).toBeDefined();
      }
    });
  });

  describe('Test 2: Replay Verification Endpoint', () => {
    test('Replay verification URL is provided', async () => {
      const bom = await generator.generateCompleteBOM(testWindowUnit, testPattern, testSystemPack);

      expect(bom.replayMetadata).toBeDefined();
      if (bom.replayMetadata) {
        // Replay verification URL should be provided
        expect(bom.replayMetadata.replayVerificationUrl).toBeDefined();
        expect(typeof bom.replayMetadata.replayVerificationUrl).toBe('string');
        expect(bom.replayMetadata.replayVerificationUrl).toContain('/api/v1/replay/verify/');
        expect(bom.replayMetadata.replayVerificationUrl).toContain(bom.replayMetadata.computationId);
      }
    });
  });

  describe('Test 3: Performance with Replay Tracking', () => {
    test('Replay tracking does not significantly impact performance', async () => {
      const startTime = performance.now();
      
      await generator.generateCompleteBOM(testWindowUnit, testPattern, testSystemPack);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // BOM generation with replay tracking should complete in reasonable time
      // (adjust threshold based on actual performance requirements)
      expect(duration).toBeLessThan(5000); // 5 seconds threshold

      // Second generation should be faster (cached result)
      const startTime2 = performance.now();
      await generator.generateCompleteBOM(testWindowUnit, testPattern, testSystemPack);
      const endTime2 = performance.now();
      const duration2 = endTime2 - startTime2;

      // Cached result should be faster
      expect(duration2).toBeLessThan(duration);
    });
  });

  describe('Test 4: Different Inputs → Different Replay Metadata', () => {
    test('Different inputs produce different result signatures', async () => {
      const bom1 = await generator.generateCompleteBOM(testWindowUnit, testPattern, testSystemPack);
      
      // Create different input
      const differentWindowUnit = {
        ...testWindowUnit,
        overallWidth: 1500, // Different width
      };
      const bom2 = await generator.generateCompleteBOM(differentWindowUnit, testPattern, testSystemPack);

      // Result signatures should be different
      expect(bom1.replayMetadata).toBeDefined();
      expect(bom2.replayMetadata).toBeDefined();

      if (bom1.replayMetadata && bom2.replayMetadata) {
        expect(bom1.replayMetadata.inputHash).not.toBe(bom2.replayMetadata.inputHash);
        expect(bom1.replayMetadata.resultSignature).not.toBe(bom2.replayMetadata.resultSignature);
      }
    });
  });

  describe('Test 5: Truth Versions Display', () => {
    test('Truth versions are included in replay metadata', async () => {
      const bom = await generator.generateCompleteBOM(testWindowUnit, testPattern, testSystemPack);

      expect(bom.replayMetadata).toBeDefined();
      if (bom.replayMetadata) {
        const { truthVersions } = bom.replayMetadata;
        
        expect(truthVersions.geometry).toBeDefined();
        expect(truthVersions.material).toBeDefined();
        expect(truthVersions.machine).toBeDefined();
        expect(truthVersions.process).toBeDefined();
        expect(truthVersions.certification).toBeDefined();
        expect(truthVersions.timestamp).toBeInstanceOf(Date);
      }
    });
  });
});

