import { describe, expect, it } from 'vitest';
import { AdaptiveSolver } from '@/algorithms/adaptiveSolver';
import { ProfileBOMCalculator } from '@/lib/fabricator/bom/ProfileBOMCalculator';
import { bomMatchesPhysicalDesign, validateOptimizationResult } from '@/lib/fabricator/validation/WorkflowValidator';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { Profile, SystemPack, WindowComponent, WindowGrid, WindowUnit } from '@/types/fabricator';
import { generateComponentsFromGrid } from '@/algorithms/smartDraw';
import { PresetAwareBOMGenerator } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { countRequiredProfilePieces } from '@/lib/fabricator/bom/bomQualification';
import { optimizeProjectEstimate } from '@/lib/fabricator/production/ProjectOptimizationEstimate';
import { SYSTEM_PACKS } from '@/data/systemPacks';

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
/**
 * Regression: the sliding track pair is part of the required design ledger. The saved
 * ledger (and any pose saved before that completion existed) is short of it while the
 * BOM enrichment adds it, which made bomMatchesPhysicalDesign false forever and blocked
 * the Optimize step with "BOM cuts differ from the physical design" - regenerating the
 * BOM could never clear it.
 */
describe('sliding ledger completion', () => {
  const pack = SYSTEM_PACKS.find((candidate) => candidate.meta.id === 'caluminium-ps')!;
  const slidingGrid = {
    rows: 1, cols: 2,
    cells: [
      { id: '0-0', row: 0, col: 0, type: 'sash' },
      { id: '0-1', row: 0, col: 1, type: 'sash' },
    ],
    colWidths: [1, 1], rowHeights: [1],
  } as unknown as WindowGrid;
  const slidingPattern = {
    id: 'fixture-sliding', type: 'sliding', openingMechanism: { type: 'sliding' },
    gridSpec: slidingGrid, mullions: [], transoms: [],
  } as unknown as EgyptianPattern;
  const cutCount = (components: Array<{ cuttingLengths: number[] }>) =>
    components.reduce((sum, component) => sum + component.cuttingLengths.length, 0);

  function rawSlidingUnit(id: string) {
    const generated = generateComponentsFromGrid(
      { systemPackId: 'caluminium-ps', type: 'sliding_window_2sash', overallWidth: 1200, overallHeight: 1400, grid: slidingGrid } as never,
      slidingGrid,
      (pack as { profiles?: unknown }).profiles as never,
      'caluminium-ps',
      pack as never,
    ) as { components: WindowComponent[] };
    return {
      id, posNumber: id, systemPackId: 'caluminium-ps', type: 'sliding_window_2sash',
      overallWidth: 1200, overallHeight: 1400, quantity: 1, grid: slidingGrid,
      components: generated.components,
    } as unknown as WindowUnit;
  }

  it('completes a short sliding ledger to the required count and restores BOM parity', async () => {
    const rawUnit = rawSlidingUnit('sliding-a');
    const required = countRequiredProfilePieces(rawUnit, slidingPattern);
    expect(cutCount(rawUnit.components)).toBeLessThan(required);
    expect(bomMatchesPhysicalDesign({ profiles: [] } as unknown as CompleteBOM, rawUnit, pack)).toBe(false);

    const completed = new ProfileBOMCalculator().completeSlidingTrackDesignComponents(
      rawUnit.components, rawUnit, slidingPattern, pack,
    );
    // Idempotent: completing twice must not add a second track pair.
    expect(cutCount(completed)).toBe(required);
    expect(cutCount(new ProfileBOMCalculator().completeSlidingTrackDesignComponents(completed, rawUnit, slidingPattern, pack))).toBe(required);

    const bom = await new PresetAwareBOMGenerator().generateCompleteBOM(
      { ...rawUnit, components: completed } as WindowUnit, slidingPattern, pack as never, false,
    );
    expect(bomMatchesPhysicalDesign(bom, { ...rawUnit, components: completed } as WindowUnit, pack)).toBe(true);
    // A genuine geometry change must still fail the gate.
    const tampered = structuredClone(bom);
    (tampered.profiles[0] as { cuttingLengths: number[] }).cuttingLengths[0] += 7;
    expect(bomMatchesPhysicalDesign(tampered, { ...rawUnit, components: completed } as WindowUnit, pack)).toBe(false);
  });

  it('accepts a pose saved before the completion existed, and unblocks the step gate', async () => {
    const rawUnit = rawSlidingUnit('sliding-b');
    const bom = await new PresetAwareBOMGenerator().generateCompleteBOM(rawUnit, slidingPattern, pack as never, false);
    // The saved ledger is short, but the gate completes it deterministically instead of
    // blocking the operator forever.
    expect(bomMatchesPhysicalDesign(bom, rawUnit, pack)).toBe(true);

    const estimate = optimizeProjectEstimate([rawUnit, { ...rawUnit, id: 'sliding-c' }] as never, SYSTEM_PACKS as never);
    expect(estimate.positions).toBe(2);
    expect(estimate.pieces).toBe(countRequiredProfilePieces(rawUnit, slidingPattern) * 2);
  });
});