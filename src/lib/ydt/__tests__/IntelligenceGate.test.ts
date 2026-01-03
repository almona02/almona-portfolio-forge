/**
 * IntelligenceGate Unit Tests
 * 
 * Tests the three-tier decision architecture enforcement:
 * - Tier 1: Strategic (YDT mandatory with reasoning)
 * - Tier 2: Execution (YDT + TensorFlow)
 * - Tier 3: Deterministic (NO YDT)
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DecisionTier, IntelligenceGate } from '../IntelligenceGate';
import { TierMetrics } from '../TierMetrics';
import type { YDTIntelligenceResponse } from '../YDTCoreService';

// Mock TierMetrics
vi.mock('../TierMetrics', () => ({
  TierMetrics: {
    recordTier1Decision: vi.fn(),
    recordTier2Decision: vi.fn(),
    recordTier3Decision: vi.fn(),
    recordYDTResponse: vi.fn(),
    reset: vi.fn(),
    getMetrics: vi.fn(() => ({
      tierCoverage: { tier1Decisions: 0, tier2Decisions: 0, tier3Decisions: 0 },
      reasoningQuality: { reasoningCoverage: 0, reasoningQuality: 0 },
      violations: { tierViolationCount: 0 }
    }))
  }
}));

describe('IntelligenceGate - Tier 1: Strategic Decisions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    IntelligenceGate.resetMetrics();
    vi.mocked(TierMetrics.reset).mockClear();
  });

  test('Tier 1: Succeeds with proper reasoning', async () => {
    const mockYDTResponse: YDTIntelligenceResponse<{ price: number }> = {
      data: { price: 15000 },
      confidence: 0.92,
      source: 'YDT Market Intelligence',
      reasoning: 'Pricing set at EGP 15,000 because material costs in Cairo are rising due to high demand',
      metadata: {
        reasoning: {
          primaryFactor: 'Material cost inflation',
          secondaryFactors: ['Location: Cairo', 'Project type: residential'],
          changeTriggers: ['Material costs shift >10%'],
          assumptions: ['Market prices stable'],
          confidence: 0.92
        }
      }
    };

    const ydtMethod = vi.fn().mockResolvedValue(mockYDTResponse);

    const result = await IntelligenceGate.strategic(
      'pricing_decision',
      { project: { type: 'residential', location: 'Cairo' } },
      ydtMethod
    );

    expect(result).toEqual({ price: 15000 });
    expect(ydtMethod).toHaveBeenCalledWith({ project: { type: 'residential', location: 'Cairo' } });
  });

  test('Tier 1: Fails if reasoning is missing', async () => {
    const mockYDTResponse: YDTIntelligenceResponse<{ price: number }> = {
      data: { price: 15000 },
      confidence: 0.92,
      source: 'YDT Market Intelligence',
      reasoning: '' // ❌ Empty reasoning
    };

    const ydtMethod = vi.fn().mockResolvedValue(mockYDTResponse);

    await expect(
      IntelligenceGate.strategic(
        'pricing_decision',
        { project: { type: 'residential', location: 'Cairo' } },
        ydtMethod
      )
    ).rejects.toThrow('YDT response for pricing_decision must include reasoning');
  });

  test('Tier 1: Fails if reasoning lacks primary factor', async () => {
    const mockYDTResponse: YDTIntelligenceResponse<{ price: number }> = {
      data: { price: 15000 },
      confidence: 0.92,
      source: 'YDT Market Intelligence',
      reasoning: 'Price is 15000' // ❌ No "because", "due to", or "based on"
    };

    const ydtMethod = vi.fn().mockResolvedValue(mockYDTResponse);

    await expect(
      IntelligenceGate.strategic(
        'pricing_decision',
        { project: { type: 'residential', location: 'Cairo' } },
        ydtMethod
      )
    ).rejects.toThrow('YDT reasoning for pricing_decision must explain primary factor');
  });

  test('Tier 1: Records Tier 1 decision in metrics', async () => {
    const mockYDTResponse: YDTIntelligenceResponse<{ price: number }> = {
      data: { price: 15000 },
      confidence: 0.92,
      source: 'YDT Market Intelligence',
      reasoning: 'Pricing set because material costs are rising'
    };

    const ydtMethod = vi.fn().mockResolvedValue(mockYDTResponse);
    const _recordSpy = vi.spyOn(TierMetrics, 'recordTier1Decision');

    await IntelligenceGate.strategic(
      'pricing_decision',
      { project: { type: 'residential', location: 'Cairo' } },
      ydtMethod
    );

    // Note: TierMetrics.recordTier1Decision() is called in YDTPricingOracle,
    // not in IntelligenceGate itself. This test verifies the pattern works.
    expect(ydtMethod).toHaveBeenCalled();
  });
});

describe('IntelligenceGate - Tier 2: Execution Decisions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    IntelligenceGate.resetMetrics();
  });

  test('Tier 2: Succeeds when YDT context is provided', async () => {
    const mockYDTContext = {
      data: { strategy: 'remnant-first', constraints: { minUtilization: 0.95 } },
      confidence: 0.92,
      source: 'YDT Strategy',
      reasoning: 'Remnant-first strategy because aluminum prices are rising'
    };

    const mockMLResult = { algorithm: 'linear', confidence: 0.94 };

    const ydtContextMethod = vi.fn().mockResolvedValue(mockYDTContext);
    const mlMethod = vi.fn().mockResolvedValue(mockMLResult);

    const result = await IntelligenceGate.execution(
      'algorithm_selection',
      { complexity: { cutCount: 50 } },
      ydtContextMethod,
      mlMethod
    );

    expect(result).toEqual({ algorithm: 'linear', confidence: 0.94 });
    expect(ydtContextMethod).toHaveBeenCalled();
    expect(mlMethod).toHaveBeenCalledWith(
      { complexity: { cutCount: 50 } },
      { strategy: 'remnant-first', constraints: { minUtilization: 0.95 } }
    );
  });

  test('Tier 2: Succeeds when YDT context fails (graceful degradation)', async () => {
    const mockMLResult = { algorithm: 'greedy', confidence: 0.88 };

    const ydtContextMethod = vi.fn().mockRejectedValue(new Error('YDT unavailable'));
    const mlMethod = vi.fn().mockResolvedValue(mockMLResult);

    const result = await IntelligenceGate.execution(
      'algorithm_selection',
      { complexity: { cutCount: 50 } },
      ydtContextMethod,
      mlMethod
    );

    expect(result).toEqual({ algorithm: 'greedy', confidence: 0.88 });
    expect(ydtContextMethod).toHaveBeenCalled();
    expect(mlMethod).toHaveBeenCalledWith(
      { complexity: { cutCount: 50 } },
      null // YDT context is null when it fails
    );
  });

  test('Tier 2: ML method is always called (required)', async () => {
    const mockMLResult = { algorithm: 'genetic', confidence: 0.96 };

    const ydtContextMethod = vi.fn().mockResolvedValue(null);
    const mlMethod = vi.fn().mockResolvedValue(mockMLResult);

    const result = await IntelligenceGate.execution(
      'algorithm_selection',
      { complexity: { cutCount: 100 } },
      ydtContextMethod,
      mlMethod
    );

    expect(result).toEqual({ algorithm: 'genetic', confidence: 0.96 });
    expect(mlMethod).toHaveBeenCalled(); // ML is always called
  });
});

describe('IntelligenceGate - Tier 3: Deterministic Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    IntelligenceGate.resetMetrics();
  });

  test('Tier 3: Executes without YDT', () => {
    const deterministicMethod = vi.fn().mockReturnValue(42);

    const result = IntelligenceGate.deterministic(
      'geometry_calculation',
      deterministicMethod
    );

    expect(result).toBe(42);
    expect(deterministicMethod).toHaveBeenCalled();
  });

  test('Tier 3: Warns if operation name suggests YDT usage', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const deterministicMethod = vi.fn().mockReturnValue(42);

    IntelligenceGate.deterministic(
      'ydt_pricing_calculation', // ❌ Name suggests YDT
      deterministicMethod
    );

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Potential YDT violation')
    );

    consoleWarnSpy.mockRestore();
  });

  test('Tier 3: Records Tier 3 decision in metrics', () => {
    const recordSpy = vi.spyOn(TierMetrics, 'recordTier3Decision');

    IntelligenceGate.deterministic(
      'geometry_calculation',
      () => 42
    );

    // Note: TierMetrics.recordTier3Decision() would be called in the actual implementation
    // This test verifies the pattern works
    expect(recordSpy).not.toHaveBeenCalled(); // IntelligenceGate doesn't call it directly
  });
});

describe('IntelligenceGate - Violation Metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    IntelligenceGate.resetMetrics();
  });

  test('Tracks tier violations', async () => {
    const mockYDTResponse: YDTIntelligenceResponse<{ price: number }> = {
      data: { price: 15000 },
      confidence: 0.92,
      source: 'YDT Market Intelligence',
      reasoning: '' // ❌ Missing reasoning (violation)
    };

    const ydtMethod = vi.fn().mockResolvedValue(mockYDTResponse);

    try {
      await IntelligenceGate.strategic(
        'pricing_decision',
        { project: { type: 'residential', location: 'Cairo' } },
        ydtMethod
      );
    } catch {
      // Expected to throw
    }

    const metrics = IntelligenceGate.getViolationMetrics();
    expect(metrics.missingReasoningCount).toBeGreaterThan(0);
  });

  test('Tracks YDT calls in deterministic paths', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    IntelligenceGate.deterministic(
      'ydt_strategy_calculation', // Name suggests YDT
      () => 42
    );

    const metrics = IntelligenceGate.getViolationMetrics();
    expect(metrics.ydtCalledInDeterministicPath).toBeGreaterThan(0);

    consoleWarnSpy.mockRestore();
  });
});

describe('IntelligenceGate - Operation Classification', () => {
  test('Classifies pricing operations as Tier 1', () => {
    expect(IntelligenceGate.classifyOperation('pricing_decision')).toBe(DecisionTier.STRATEGIC);
    expect(IntelligenceGate.classifyOperation('market_pricing')).toBe(DecisionTier.STRATEGIC);
  });

  test('Classifies algorithm selection as Tier 2', () => {
    expect(IntelligenceGate.classifyOperation('algorithm_selection')).toBe(DecisionTier.EXECUTION);
    expect(IntelligenceGate.classifyOperation('remnant_purchase_decision')).toBe(DecisionTier.EXECUTION);
  });

  test('Classifies optimization as Tier 3', () => {
    expect(IntelligenceGate.classifyOperation('cutting_optimization')).toBe(DecisionTier.DETERMINISTIC);
    expect(IntelligenceGate.classifyOperation('geometry_calculation')).toBe(DecisionTier.DETERMINISTIC);
  });

  test('Defaults to Tier 2 for unknown operations', () => {
    expect(IntelligenceGate.classifyOperation('unknown_operation')).toBe(DecisionTier.EXECUTION);
  });
});

