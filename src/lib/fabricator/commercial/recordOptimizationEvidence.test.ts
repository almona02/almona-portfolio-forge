import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canonicalApprovedRuleVersion } from './validateOptimizationEvidencePayload';
import { recordOptimizationEvidence } from './recordOptimizationEvidence';

const rpc = vi.fn();
const resolveManufacturingAuthority = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
  },
}));

vi.mock('@/lib/fabricator/manufacturing/ManufacturingAuthorityResolver', () => ({
  resolveManufacturingAuthority: (...args: unknown[]) => resolveManufacturingAuthority(...args),
}));

const authorityRules = [
  {
    approvalId: 'b2000000-0000-4000-8000-000000000020',
    ruleId: 'cut-a',
    revision: 1,
    evidenceStatus: 'approved' as const,
  },
];

const sampleResult = {
  materialUsage: 0.8,
  wastePercentage: 12,
  estimatedProductionTime: 1,
  nestingEfficiency: 0.88,
  cuttingPlan: [
    {
      stockLength: 6000,
      profile: { id: 'PS-FRAME' },
      cuts: [
        { cutId: 'c1', componentId: 'c1', length: 1200, angle: 45 },
        { cutId: 'c2', componentId: 'c2', length: 1400, angle: 45 },
      ],
    },
  ],
  costBreakdown: {
    materialCost: 1,
    laborCost: 1,
    hardwareCost: 1,
    glazingCost: 1,
    totalCost: 4,
  },
};

describe('recordOptimizationEvidence (#67 / ledger+kerf)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveManufacturingAuthority.mockResolvedValue({
      systemPack: { id: 'caluminium-ps', revision: 3 },
      cuttingRules: authorityRules,
      authorityApprovalId: 'auth-1',
    });
    rpc.mockResolvedValue({ data: 'pos-1', error: null });
  });

  it('rejects empty cutting plans without RPC', async () => {
    const emptyCuts = {
      ...sampleResult,
      cuttingPlan: [],
    };
    const result = await recordOptimizationEvidence({
      positionId: 'pos-1',
      expectedRevision: 1,
      designRevision: 1,
      bom: null,
      optimizationResult: emptyCuts as never,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no cuts/i);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('records via SECURITY DEFINER RPC with authority-bound rule version', async () => {
    const expectedRule = canonicalApprovedRuleVersion(authorityRules);
    const result = await recordOptimizationEvidence({
      positionId: 'pos-1',
      expectedRevision: 2,
      designRevision: 2,
      bom: null,
      optimizationResult: sampleResult as never,
      kerfMm: 4,
      trimMm: 0,
    });
    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith(
      'record_fabricator_optimization_evidence',
      expect.objectContaining({
        p_position_id: 'pos-1',
        p_expected_revision: 2,
        p_design_revision: 2,
        p_system_pack_revision: 3,
        p_rule_version: expectedRule,
        p_cut_count: 2,
        p_evidence_payload: expect.objectContaining({
          schema: 'almona.optimization-result',
          schemaVersion: 2,
          kerfMm: 4,
          trimMm: 0,
          requiredCuts: expect.any(Array),
        }),
      }),
    );
    const args = rpc.mock.calls[0]?.[1] as { p_ledger_fingerprint?: string };
    expect(args.p_ledger_fingerprint).toMatch(/^[a-f0-9]{64}\|\|[a-f0-9]{64}$/);
  });

  it('rejects free-form rule version labels that do not match approved content', async () => {
    const result = await recordOptimizationEvidence({
      positionId: 'pos-1',
      expectedRevision: 1,
      designRevision: 1,
      bom: null,
      optimizationResult: sampleResult as never,
      ruleVersion: 'rules-fixture',
      kerfMm: 4,
      trimMm: 0,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/does not match approved cutting-rule content/i);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects unspecified rule versions when authority has no rules', async () => {
    resolveManufacturingAuthority.mockResolvedValue({
      systemPack: { id: 'caluminium-ps', revision: 3 },
      cuttingRules: [],
      authorityApprovalId: 'auth-1',
    });
    const result = await recordOptimizationEvidence({
      positionId: 'pos-1',
      expectedRevision: 1,
      designRevision: 1,
      bom: null,
      optimizationResult: sampleResult as never,
      ruleVersion: 'unspecified',
      kerfMm: 4,
      trimMm: 0,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/cutting rules|rule version/i);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects kerf-only stock overrun placements without RPC', async () => {
    const overrun = {
      ...sampleResult,
      cuttingPlan: [
        {
          stockLength: 2000,
          profile: { id: 'PS-FRAME' },
          cuts: [
            { cutId: 'c1', componentId: 'c1', length: 1000, angle: 45 },
            { cutId: 'c2', componentId: 'c2', length: 1000, angle: 45 },
          ],
        },
      ],
    };
    const result = await recordOptimizationEvidence({
      positionId: 'pos-1',
      expectedRevision: 1,
      designRevision: 1,
      bom: null,
      optimizationResult: overrun as never,
      kerfMm: 4,
      trimMm: 0,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/stock overrun|kerf/i);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects missing design-ledger cuts without RPC', async () => {
    const result = await recordOptimizationEvidence({
      positionId: 'pos-1',
      expectedRevision: 1,
      designRevision: 1,
      bom: null,
      optimizationResult: sampleResult as never,
      requiredCuts: [{ cutId: 'c1', profileId: 'PS-FRAME', length: 1200, angle: 45 }],
      kerfMm: 4,
      trimMm: 0,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/missing cut|cut count mismatch/i);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('surfaces authority resolution failures', async () => {
    resolveManufacturingAuthority.mockRejectedValue(new Error('approved manufacturing authority is unavailable'));
    const result = await recordOptimizationEvidence({
      positionId: 'pos-1',
      expectedRevision: 1,
      designRevision: 1,
      bom: null,
      optimizationResult: sampleResult as never,
      kerfMm: 4,
      trimMm: 0,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/authority is unavailable/i);
    expect(rpc).not.toHaveBeenCalled();
  });
});
