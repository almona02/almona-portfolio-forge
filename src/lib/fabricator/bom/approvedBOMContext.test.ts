import { describe, expect, it, vi } from 'vitest';
import { AdaptiveSolver } from '@/algorithms/adaptiveSolver';
import { validateOptimizationReconciliation } from '../validation/WorkflowValidator';
import { assessBOMQualification, isQualifiedBOM } from './bomQualification';
import { approvedBOMContext } from './approvedBOMContext';
import type { WindowUnit, Profile } from '@/types/fabricator';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';

const mocks = vi.hoisted(() => ({ resolve: vi.fn() }));
vi.mock('../manufacturing/ManufacturingAuthorityResolver', () => ({ resolveManufacturingAuthority: mocks.resolve }));
const identity = { ownerUserId: 'test-owner', projectId: 'test-project', positionId: 'test-position', source: 'v2' as const, revision: 1 };
const profile: Profile = { name: 'Test frame', width: 50, color: 'Silver', stockQuantity: 10, minStockLevel: 0, supplier: 'Test fixture', id: 'test-frame', material: 'aluminum', cuttingAllowance: 0, costPerMeter: 10, specifications: { stockLengthMm: 6000 } };
const project = { id: identity.positionId, systemPackId: 'test-pack', overallWidth: 1200, overallHeight: 1400, quantity: 1,
  grid: { rows: 1, cols: 1, cells: [{ id: 'fixed', row: 0, col: 0, type: 'fixed' }] },
  components: [{ id: 'frame', type: 'frame', profile, quantity: 1, cuttingLengths: [1200,1400,1200,1400], angles: [90,90,90,90] }],
} as WindowUnit;
const authority = { projectId: identity.projectId, positionSource: identity.source, systemPack: { id: 'test-pack', revision: 1 }, authorityApprovalId: 'test-approval', profiles: [{ profileId: profile.id }], cuttingRules: [{ approvalId: 'test-rule-approval', ruleId: 'test-cut-rule', revision: 1 }] };

describe('approved catalogue to cutting optimization integration (test evidence)', () => {
  it('qualifies a complete fixed-frame ledger and reconciles real deterministic optimization', async () => {
    mocks.resolve.mockResolvedValue(authority);
    const context = await approvedBOMContext(project, identity);
    const qualification = assessBOMQualification(project, { mullions: [], transoms: [] } as unknown as EgyptianPattern,
      [{ cuttingLengths: project.components[0].cuttingLengths }] as never, context);
    expect(isQualifiedBOM({ qualification })).toBe(true);
    const result = await new AdaptiveSolver({ maxSolvingTime: 30, complexityThresholds: { simple: 50, medium: 500 } })
      .solve({ components: project.components, profiles: [profile], systemPackId: project.systemPackId }, [profile]);
    expect(result.cuttingPlan.flatMap(plan => plan.cuts)).toHaveLength(4);
    expect(validateOptimizationReconciliation(result, project).valid).toBe(true);
  });
  it('rejects another system or unapproved selected profile', async () => {
    mocks.resolve.mockResolvedValue({ ...authority, systemPack: { id: 'other', revision: 1 } });
    await expect(approvedBOMContext(project, identity)).rejects.toThrow('does not match');
    mocks.resolve.mockResolvedValue({ ...authority, profiles: [] });
    await expect(approvedBOMContext(project, identity)).rejects.toThrow('not in the approved catalogue');
  });
  it('does not invent versions when approval is unavailable', async () => {
    mocks.resolve.mockRejectedValue(new Error('approval unavailable'));
    await expect(approvedBOMContext(project, identity)).rejects.toThrow('approval unavailable');
    expect(await approvedBOMContext(project, null)).toEqual({});
  });
});
