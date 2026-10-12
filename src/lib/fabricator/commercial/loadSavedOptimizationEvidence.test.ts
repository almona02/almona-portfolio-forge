import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSavedOptimizationEvidence } from './loadSavedOptimizationEvidence';
import { approvedRuleContentFingerprint } from './validateOptimizationEvidencePayload';
const mocks = vi.hoisted(() => ({ row: null as any, resolve: vi.fn(), eq: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { from: () => { const query = { select: () => query, eq: (...args: unknown[]) => { mocks.eq(...args); return query; }, is: () => query, maybeSingle: async () => ({ data: mocks.row, error: null }) }; return query; } } }));
vi.mock('../manufacturing/ManufacturingAuthorityResolver', () => ({ resolveManufacturingAuthority: (...args: unknown[]) => mocks.resolve(...args) }));
const identity = { ownerUserId: 'owner', projectId: 'project', positionId: 'pose', source: 'v2' as const, revision: 4 };
const rules = [{ approvalId: 'approval', ruleId: 'cut', revision: 1, evidenceStatus: 'approved' as const }];
const pose = { systemPackId: 'pack', quantity: 5 } as never;
beforeEach(async () => {
    vi.clearAllMocks();
    mocks.resolve.mockResolvedValue({ authorityApprovalId: 'approved', systemPack: { revision: 2 }, cuttingRules: rules });
    mocks.row = { system_pack_id: 'pack', quantity: 5, authority_approval_id: 'approved', system_pack_revision: 2, rule_version: await approvedRuleContentFingerprint(rules), cut_count: 2, evidence_payload: { schema: 'almona.optimization-result', schemaVersion: 2, kerfMm: 3, trimMm: 0, materialUsage: 0.5, wastePercentage: 50, nestingEfficiency: 0.5, requiredCuts: [{ cutId: 'a:0', profileId: 'frame', length: 1200, angle: 45 }, { cutId: 'a:1', profileId: 'frame', length: 1400, angle: 45 }], cuttingPlan: [{ stockLength: 6000, profile: { id: 'frame' }, cuts: [{ cutId: 'a:0', componentId: 'a', length: 1200, angle: 45 }, { cutId: 'a:1', componentId: 'a', length: 1400, angle: 45 }] }], displayResult: { estimatedProductionTime: 1, costBreakdown: { materialCost: 1, laborCost: 1, hardwareCost: 1, totalCost: 3 } } } };
});
describe('saved optimization restoration', () => {
    it('restores only after current approval validation and owner/revision-scoped reads', async () => { const result = await loadSavedOptimizationEvidence(identity, pose); expect(result?.cuttingPlan[0].cuts).toHaveLength(2); expect(mocks.eq).toHaveBeenCalledWith('owner_user_id', 'owner'); expect(mocks.eq).toHaveBeenCalledWith('position_revision', 4); });
    it('rejects changed quantity, rule content and invalidated catalogue approval', async () => { mocks.row.quantity = 4; expect(await loadSavedOptimizationEvidence(identity, pose)).toBeNull(); mocks.row.quantity = 5; mocks.row.rule_version = 'obsolete'; expect(await loadSavedOptimizationEvidence(identity, pose)).toBeNull(); });
});
