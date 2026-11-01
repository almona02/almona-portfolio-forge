import { beforeEach, describe, expect, it, vi } from 'vitest';
import { approvedRuleContentFingerprint } from './validateOptimizationEvidencePayload';
import { recordOptimizationEvidence, requiredCutsFromBom } from './recordOptimizationEvidence';

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
    deductions: { endDeductionMm: 20 },
    allowances: { weldMm: 3 },
    applicability: { materials: ['aluminum'] },
  },
];

const sampleBom = {
  profiles: [
    {
      id: 'PS-FRAME:frame',
      profileCode: 'PS-FRAME',
      cuttingLengths: [1200, 1400],
      cutIds: ['c1:0', 'c1:1'],
      angles: [45, 45],
      quantity: 1,
    },
  ],
};

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
        { cutId: 'c1:0', componentId: 'c1', length: 1200, angle: 45 },
        { cutId: 'c1:1', componentId: 'c1', length: 1400, angle: 45 },
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

function mockAuthority(overrides: Record<string, unknown> = {}) {
  return {
    systemPack: { id: 'caluminium-ps', revision: 3 },
    cuttingRules: authorityRules,
    authorityApprovalId: 'auth-1',
    manufacturingSettings: { sawKerfMm: 4, trimCutMm: 0 },
    profiles: [
      { profileId: 'PS-FRAME', stockLengthMm: 6000, role: 'frame', evidenceStatus: 'approved', approvalId: 'b2000000-0000-4000-8000-000000000010' },
      { profileId: 'PS-SASH', stockLengthMm: 6000, role: 'sash', evidenceStatus: 'approved', approvalId: 'b2000000-0000-4000-8000-000000000011' },
    ],
    ...overrides,
  };
}

describe('recordOptimizationEvidence (authoritative binding)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveManufacturingAuthority.mockResolvedValue(mockAuthority());
    rpc.mockImplementation((name: string) => {
      if (name === 'derive_required_cuts_from_position') {
        return Promise.resolve({
          data: [
            { cutId: 'c1:0', profileId: 'PS-FRAME', length: 1200, angle: 45 },
            { cutId: 'c1:1', profileId: 'PS-FRAME', length: 1400, angle: 45 },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: 'pos-1', error: null });
    });
  });

  it('records grouped BOM rows using original design occurrence IDs', async () => {
    const result = await recordOptimizationEvidence({
      positionId: 'pos-1', expectedRevision: 1, designRevision: 1,
      bom: { profiles: [{ ...sampleBom.profiles[0], id: 'PS-FRAME:frame', cutIds: ['c1:0', 'c1:1'] }] } as never,
      optimizationResult: sampleResult as never,
    });
    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith('record_fabricator_optimization_evidence', expect.anything());
  });

  it('rejects a BOM cached without occurrence identities instead of inventing row-based IDs', async () => {
    const legacy = { profiles: [{ ...sampleBom.profiles[0], cutIds: undefined }] };
    const result = await recordOptimizationEvidence({
      positionId: 'pos-1', expectedRevision: 1, designRevision: 1,
      bom: legacy as never,
      optimizationResult: sampleResult as never,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no cut occurrence identities/i);
    expect(result.error).toMatch(/Rebuild the BOM from the saved design/i);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects misaligned or duplicated BOM occurrence identities', async () => {
    const misaligned = { profiles: [{ ...sampleBom.profiles[0], cutIds: ['c1:0'] }] };
    const duplicated = { profiles: [{ ...sampleBom.profiles[0], cutIds: ['c1:0', 'c1:0'] }] };
    for (const bom of [misaligned, duplicated]) {
      const result = await recordOptimizationEvidence({
        positionId: 'pos-1', expectedRevision: 1, designRevision: 1,
        bom: bom as never,
        optimizationResult: sampleResult as never,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/occurrence identit|more than once/i);
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it('strips solver-bound kerf/trim from plan profiles so the payload carries approved machining once', async () => {
    const bound = {
      ...sampleResult,
      cuttingPlan: sampleResult.cuttingPlan.map((plan) => ({
        ...plan,
        totalWaste: 3400, utilization: 43.33,
        profile: { id: 'PS-FRAME', name: 'Frame', specifications: { sawKerf: 4, barEndTrim: 0, stockLengthMm: 6000, supplierCode: 'PS-FRAME' } },
      })),
    };
    const result = await recordOptimizationEvidence({
      positionId: 'pos-1', expectedRevision: 1, designRevision: 1,
      bom: sampleBom as never, optimizationResult: bound as never,
    });
    expect(result.ok).toBe(true);
    const call = rpc.mock.calls.find(([name]) => name === 'record_fabricator_optimization_evidence');
    const payload = (call![1] as { p_evidence_payload: { kerfMm: number; cuttingPlan: Array<{ profile: { specifications: Record<string, unknown> }; totalWaste: number }> } }).p_evidence_payload;
    expect(payload.kerfMm).toBe(4);
    expect(payload.cuttingPlan[0].profile.specifications).toEqual({ stockLengthMm: 6000, supplierCode: 'PS-FRAME' });
    expect(payload.cuttingPlan[0].totalWaste).toBe(3400);
  });

  it('requiredCutsFromBom carries identity, profile, length and angle per occurrence', () => {
    const ledger = requiredCutsFromBom(sampleBom as never);
    expect(ledger.ok).toBe(true);
    if (!ledger.ok) return;
    expect(ledger.cuts).toEqual([
      { cutId: 'c1:0', profileId: 'PS-FRAME', length: 1200, angle: 45 },
      { cutId: 'c1:1', profileId: 'PS-FRAME', length: 1400, angle: 45 },
    ]);
  });

  it('names the server ledger when the saved revision disagrees with a BOM-consistent placement', async () => {
    rpc.mockImplementation((name: string) => {
      if (name === 'derive_required_cuts_from_position') {
        // Server returns raw design lengths (no cutting allowance) for the same identities.
        return Promise.resolve({
          data: [
            { cutId: 'c1:0', profileId: 'PS-FRAME', length: 1197, angle: 45 },
            { cutId: 'c1:1', profileId: 'PS-FRAME', length: 1397, angle: 45 },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: 'pos-1', error: null });
    });
    const result = await recordOptimizationEvidence({
      positionId: 'pos-1', expectedRevision: 1, designRevision: 1,
      bom: sampleBom as never,
      optimizationResult: sampleResult as never,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/^Server design ledger wrongly sized cut c1:0 \(required 1197\.000 mm, placed 1200\.000 mm\)/);
    expect(result.error).toMatch(/saved position revision 1/);
    expect(rpc).not.toHaveBeenCalledWith('record_fabricator_optimization_evidence', expect.anything());
  });

  it('rejects missing BOM design ledger without RPC write', async () => {
    const result = await recordOptimizationEvidence({
      positionId: 'pos-1',
      expectedRevision: 1,
      designRevision: 1,
      bom: null,
      optimizationResult: sampleResult as never,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/BOM cuttingLengths are missing/i);
    expect(rpc).not.toHaveBeenCalledWith(
      'record_fabricator_optimization_evidence',
      expect.anything(),
    );
  });

  it('records with authority-bound kerf/trim and content fingerprint', async () => {
    const contentFp = await approvedRuleContentFingerprint(authorityRules);
    const result = await recordOptimizationEvidence({
      positionId: 'pos-1',
      expectedRevision: 2,
      designRevision: 2,
      bom: sampleBom as never,
      optimizationResult: sampleResult as never,
    });
    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith(
      'record_fabricator_optimization_evidence',
      expect.objectContaining({
        p_rule_version: contentFp,
        p_evidence_payload: expect.objectContaining({
          schemaVersion: 2,
          kerfMm: 4,
          trimMm: 0,
        }),
      }),
    );
  });

  it('rejects fabricated but internally consistent ledger/placement that disagrees with server pose', async () => {
    rpc.mockImplementation((name: string) => {
      if (name === 'derive_required_cuts_from_position') {
        // Server pose has different lengths than client fabricated pair
        return Promise.resolve({
          data: [
            { cutId: 'c1:0', profileId: 'PS-FRAME', length: 1100, angle: 45 },
            { cutId: 'c1:1', profileId: 'PS-FRAME', length: 1300, angle: 45 },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: 'pos-1', error: null });
    });
    const result = await recordOptimizationEvidence({
      positionId: 'pos-1',
      expectedRevision: 1,
      designRevision: 1,
      bom: sampleBom as never,
      optimizationResult: sampleResult as never,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/wrongly sized|missing cut|unexpected cut|mismatch/i);
    expect(rpc).not.toHaveBeenCalledWith(
      'record_fabricator_optimization_evidence',
      expect.anything(),
    );
  });

  it('rejects zero-kerf tampering against approved settings', async () => {
    // Client cannot lower kerf: authority is 4; validation uses authority kerf.
    // Simulate by authority kerf 4 and a plan that only fits at kerf 0.
    const tight = {
      ...sampleResult,
      cuttingPlan: [
        {
          stockLength: 6000,
          profile: { id: 'PS-FRAME' },
          cuts: [
            { cutId: 'c1:0', length: 3000, angle: 0 },
            { cutId: 'c1:1', length: 2996, angle: 0 },
          ],
        },
      ],
    };
    const bom = {
      profiles: [
        {
          id: 'PS-FRAME:frame',
          profileCode: 'PS-FRAME',
          cuttingLengths: [3000, 2996],
          cutIds: ['c1:0', 'c1:1'],
          angles: [0, 0],
        },
      ],
    };
    rpc.mockImplementation((name: string) => {
      if (name === 'derive_required_cuts_from_position') {
        return Promise.resolve({
          data: [
            { cutId: 'c1:0', profileId: 'PS-FRAME', length: 3000, angle: 0 },
            { cutId: 'c1:1', profileId: 'PS-FRAME', length: 2996, angle: 0 },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: 'pos-1', error: null });
    });
    // lengths 3000+2996=5996; kerf 4*2=8 → 6004 > 6000
    const result = await recordOptimizationEvidence({
      positionId: 'pos-1',
      expectedRevision: 1,
      designRevision: 1,
      bom: bom as never,
      optimizationResult: tight as never,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/kerf\/trim|stock overrun/i);
  });

  it('rejects invented stock lengths not in approved catalogue', async () => {
    const invented = {
      ...sampleResult,
      cuttingPlan: [
        {
          stockLength: 9999,
          profile: { id: 'PS-FRAME' },
          cuts: [
            { cutId: 'c1:0', length: 1200, angle: 45 },
            { cutId: 'c1:1', length: 1400, angle: 45 },
          ],
        },
      ],
    };
    const result = await recordOptimizationEvidence({
      positionId: 'pos-1',
      expectedRevision: 1,
      designRevision: 1,
      bom: sampleBom as never,
      optimizationResult: invented as never,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/not in approved catalogue/i);
  });

  it('rejects changed rule content under unchanged identifiers', async () => {
    const contentFp = await approvedRuleContentFingerprint(authorityRules);
    const tampered = [
      {
        ...authorityRules[0],
        deductions: { endDeductionMm: 99 },
      },
    ];
    const tamperedFp = await approvedRuleContentFingerprint(tampered);
    expect(tamperedFp).not.toBe(contentFp);

    resolveManufacturingAuthority.mockResolvedValue(
      mockAuthority({ cuttingRules: tampered }),
    );
    const result = await recordOptimizationEvidence({
      positionId: 'pos-1',
      expectedRevision: 1,
      designRevision: 1,
      bom: sampleBom as never,
      optimizationResult: sampleResult as never,
      ruleVersion: contentFp, // old fingerprint under same ruleId/revision
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/does not match approved cutting-rule content/i);
  });

  it('rejects free-form rule version labels', async () => {
    const result = await recordOptimizationEvidence({
      positionId: 'pos-1',
      expectedRevision: 1,
      designRevision: 1,
      bom: sampleBom as never,
      optimizationResult: sampleResult as never,
      ruleVersion: 'rules-fixture',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/does not match approved cutting-rule content/i);
  });

  it('surfaces authority resolution failures', async () => {
    resolveManufacturingAuthority.mockRejectedValue(
      new Error('approved manufacturing authority is unavailable'),
    );
    const result = await recordOptimizationEvidence({
      positionId: 'pos-1',
      expectedRevision: 1,
      designRevision: 1,
      bom: sampleBom as never,
      optimizationResult: sampleResult as never,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/authority is unavailable/i);
  });
});

describe('profile-bound stock authority', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveManufacturingAuthority.mockResolvedValue(mockAuthority({
      profiles: [
        { profileId: 'PS-FRAME', stockLengthMm: 6000, evidenceStatus: 'approved' },
        { profileId: 'PS-SASH', stockLengthMm: 6500, evidenceStatus: 'approved' },
        { profileId: 'PS-FRAME', stockLengthMm: 7000, evidenceStatus: 'pending' },
      ],
    }));
  });

  it.each([6500, 7000])('rejects stock %s not approved for the placed profile before RPC', async (stockLength) => {
    const result = await recordOptimizationEvidence({
      positionId: 'pos-1', expectedRevision: 1, designRevision: 1,
      bom: sampleBom as never,
      optimizationResult: { ...sampleResult, cuttingPlan: sampleResult.cuttingPlan.map(plan => ({ ...plan, stockLength })) } as never,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/stock length.*approved/);
    expect(rpc).not.toHaveBeenCalled();
  });
});
