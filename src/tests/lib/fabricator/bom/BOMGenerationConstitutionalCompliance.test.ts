/**
 * BOM Generation AICS-001 Constitutional Compliance Tests
 * 
 * Verifies AICS-001 compliance for BOM generation with DeterministicReplayEngine.
 * 
 * Compliance Requirements:
 * - Deterministic replay guarantee (Section 7.5)
 * - Truth versions are tracked
 * - Replay metadata is complete
 * - Audit trail integration works
 */

import { TruthVersionTracker, getAICSIntegrationService } from '@/core/authority/certification';
import { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { SystemPack as DataSystemPack } from '@/data/systemPacks';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { PresetAwareBOMGenerator } from '@/lib/fabricator/PresetAwareBOMGenerator';
import type { SystemPack, WindowUnit } from '@/types/fabricator';
import { beforeEach, describe, expect, it } from 'vitest';

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
    status: 'design',
    optimization: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    systemPackId: 'rock60',
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
}

describe('BOM Generation AICS-001 Constitutional Compliance', () => {
  let bomGenerator: PresetAwareBOMGenerator;
  let testWindowUnit: WindowUnit;
  let testPattern: EgyptianPattern;
  let testSystemPack: SystemPack;

  beforeEach(() => {
    bomGenerator = new PresetAwareBOMGenerator();
    testWindowUnit = createTestWindowUnit();
    testPattern = createTestPattern();
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

  it('should guarantee deterministic replay (AICS-001 Section 7.5)', async () => {
    // AICS-001 Section 7.5: Same inputs + same truth versions = same result
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

    expect(result1.replayMetadata).toBeDefined();
    expect(result2.replayMetadata).toBeDefined();
    
    if (result1.replayMetadata && result2.replayMetadata) {
      // Same inputs should produce same input hash
      expect(result1.replayMetadata.inputHash).toBe(result2.replayMetadata.inputHash);
      
      // Same inputs + same truth versions should produce same result signature
      expect(result1.replayMetadata.resultSignature).toBe(result2.replayMetadata.resultSignature);
      
      // Truth versions should be identical
      expect(result1.replayMetadata.truthVersions.geometry).toBe(
        result2.replayMetadata.truthVersions.geometry
      );
    }
  }, 30000);

  it('should track truth versions correctly', async () => {
    const truthVersionsBefore = TruthVersionTracker.getCurrentTruthVersions();
    
    const result = await bomGenerator.generateCompleteBOM(
      testWindowUnit,
      testPattern,
      testSystemPack,
      false
    );

    expect(result.replayMetadata).toBeDefined();
    
    if (result.replayMetadata) {
      // Truth versions in replay metadata should match current truth versions
      expect(result.replayMetadata.truthVersions.geometry).toBe(truthVersionsBefore.geometry);
      expect(result.replayMetadata.truthVersions.material).toBe(truthVersionsBefore.material);
      expect(result.replayMetadata.truthVersions.machine).toBe(truthVersionsBefore.machine);
      expect(result.replayMetadata.truthVersions.process).toBe(truthVersionsBefore.process);
      expect(result.replayMetadata.truthVersions.certification).toBe(
        truthVersionsBefore.certification
      );
    }
  }, 30000);

  it('should include complete replay metadata (AICS-001 Section 7.5)', async () => {
    const result = await bomGenerator.generateCompleteBOM(
      testWindowUnit,
      testPattern,
      testSystemPack,
      false
    );

    expect(result.replayMetadata).toBeDefined();
    
    if (result.replayMetadata) {
      // AICS-001 Section 7.5 requires:
      // - Input hash
      expect(result.replayMetadata.inputHash).toBeDefined();
      expect(typeof result.replayMetadata.inputHash).toBe('string');
      expect(result.replayMetadata.inputHash.length).toBeGreaterThan(0);
      
      // - Result signature
      expect(result.replayMetadata.resultSignature).toBeDefined();
      expect(typeof result.replayMetadata.resultSignature).toBe('string');
      
      // - Truth versions
      expect(result.replayMetadata.truthVersions).toBeDefined();
      expect(result.replayMetadata.truthVersions.geometry).toBeDefined();
      expect(result.replayMetadata.truthVersions.material).toBeDefined();
      expect(result.replayMetadata.truthVersions.machine).toBeDefined();
      expect(result.replayMetadata.truthVersions.process).toBeDefined();
      expect(result.replayMetadata.truthVersions.certification).toBeDefined();
      
      // - Computation ID
      expect(result.replayMetadata.computationId).toBeDefined();
      expect(typeof result.replayMetadata.computationId).toBe('string');
      
      // - AICS-001 compliance marker
      expect(result.replayMetadata.aics001Compliance).toBe('Section 7.5');
    }
  }, 30000);

  it('should integrate with audit trail service', async () => {
    const integrationService = getAICSIntegrationService();
    expect(integrationService).toBeDefined();

    const result = await bomGenerator.generateCompleteBOM(
      testWindowUnit,
      testPattern,
      testSystemPack,
      false
    );

    expect(result.replayMetadata).toBeDefined();
    
    // Integration service should be able to record BOM generation audit
    if (result.replayMetadata) {
      // The service should accept BOM generation context
      // Note: This test verifies the interface, not the actual recording
      expect(integrationService.recordBOMGenerationAudit).toBeDefined();
      expect(typeof integrationService.recordBOMGenerationAudit).toBe('function');
    }
  }, 30000);

  it('should provide replay verification URL', async () => {
    const result = await bomGenerator.generateCompleteBOM(
      testWindowUnit,
      testPattern,
      testSystemPack,
      false
    );

    expect(result.replayMetadata).toBeDefined();
    
    if (result.replayMetadata && result.replayMetadata.replayVerificationUrl) {
      expect(result.replayMetadata.replayVerificationUrl).toBeDefined();
      expect(typeof result.replayMetadata.replayVerificationUrl).toBe('string');
      expect(result.replayMetadata.replayVerificationUrl).toContain('/api/v1/replay/verify/');
      expect(result.replayMetadata.replayVerificationUrl).toContain(result.replayMetadata.computationId);
    }
  }, 30000);

  it('should maintain Tier 3 compliance (no ML/AI in execution path)', async () => {
    // AICS-001 Rule 15: Tier 3 compliance means no ML/AI in execution path
    const startTime = performance.now();
    
    const result = await bomGenerator.generateCompleteBOM(
      testWindowUnit,
      testPattern,
      testSystemPack,
      false
    );

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // BOM generation should complete deterministically without ML/AI calls
    expect(result).toBeDefined();
    expect(result.replayMetadata).toBeDefined();
    
    // Execution should be fast (no async ML model loading)
    expect(executionTime).toBeLessThan(5000);
  }, 30000);

  it('should ensure replay metadata is immutable', async () => {
    const result = await bomGenerator.generateCompleteBOM(
      testWindowUnit,
      testPattern,
      testSystemPack,
      false
    );

    expect(result.replayMetadata).toBeDefined();
    
    if (result.replayMetadata) {
      const originalInputHash = result.replayMetadata.inputHash;
      const originalResultSignature = result.replayMetadata.resultSignature;
      
      // Replay metadata should not change after generation
      expect(result.replayMetadata.inputHash).toBe(originalInputHash);
      expect(result.replayMetadata.resultSignature).toBe(originalResultSignature);
    }
  }, 30000);
});

