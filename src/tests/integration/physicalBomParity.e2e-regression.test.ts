import { describe, expect, it } from 'vitest';
import { AdaptiveSolver } from '@/algorithms/adaptiveSolver';
import { ProfileBOMCalculator } from '@/lib/fabricator/bom/ProfileBOMCalculator';
import { bomMatchesPhysicalDesign, validateOptimizationResult } from '@/lib/fabricator/validation/WorkflowValidator';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { Profile, SystemPack, WindowUnit } from '@/types/fabricator';

const profile = { id: 'owned-sash', profileRole: 'sash', material: 'aluminum', costPerMeter: 0, cuttingAllowance: 3,
  barLength: 6000, specifications: { sawKerf: 4.5, barEndTrim: 20 } } as Profile;
const project = { systemPackId: 'test-pack', components: [{ id: 'sash', type: 'sash', quantity: 1,
  profile, cuttingLengths: [1980,1980,1980], angles: [45,45,45] }] } as WindowUnit;
const solver = () => new AdaptiveSolver({ maxSolvingTime: 30, complexityThresholds: { simple: 50, medium: 500 } });

describe('live E2E cut ledger regression', () => {
  it('BOM uses exactly the solver physical lengths and angles, including allowance once', async () => {
    const profiles = await new ProfileBOMCalculator().calculateProfileBOM(project, {} as EgyptianPattern, {} as SystemPack);
    expect(profiles[0].cuttingLengths).toEqual([1983,1983,1983]);
    expect(profiles[0].length).toBe(5949);
    expect(bomMatchesPhysicalDesign({ profiles } as CompleteBOM, project)).toBe(true);
    const mismatched = structuredClone(profiles); mismatched[0].cuttingLengths[0] = 2102.8;
    expect(bomMatchesPhysicalDesign({ profiles: mismatched } as CompleteBOM, project)).toBe(false);
  });
  it('cannot fit three 1983 mm cuts after 4.5 mm kerf and 20 mm trim at each end', async () => {
    const result = await solver().solve({ components: project.components, profiles: [profile] }, [profile]);
    expect(result.cuttingPlan).toHaveLength(2);
    expect(result.cuttingPlan.flatMap(plan => plan.cuts.map(cut => cut.length))).toEqual([1983,1983,1983]);
    expect(validateOptimizationResult(result).valid).toBe(true);
    result.cuttingPlan[0].cuts.push(result.cuttingPlan[1].cuts[0]);
    expect(validateOptimizationResult(result).errors.map(error => error.code)).toContain('MACHINING_CAPACITY_EXCEEDED');
  });
  it('rejects a cut longer than usable bar capacity, including on fallback', async () => {
    const oversize = { ...project.components[0], cuttingLengths: [5960] };
    await expect(solver().solve({ components: [oversize], profiles: [profile] }, [profile])).rejects.toThrow('usable stock');
  });
});
