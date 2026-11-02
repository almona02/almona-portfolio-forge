/**
 * Batch A — pose quantity must expand the evidence ledger as a multiset of
 * shared cutIds (componentId:index), matching expandPhysicalCutsForPoseQuantity
 * and derive_required_cuts_from_position. Design BOM stays per-window.
 */
import { describe, expect, it } from 'vitest';
import { CALUMINIUM_PS_PACK } from '@/data/profileSystems/egyptian/caluminium/ps';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { WindowUnit } from '@/types/fabricator';
import { ProfileBOMCalculator } from '@/lib/fabricator/bom/ProfileBOMCalculator';
import { countRequiredProfilePieces } from '@/lib/fabricator/bom/bomQualification';
import { expandPhysicalCutsForPoseQuantity } from '@/lib/fabricator/optimization/physicalCutContract';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { requiredCutsFromBom } from './recordOptimizationEvidence';
import {
  validateOptimizationEvidencePayload,
  type EvidenceCutSpec,
  type OptimizationEvidencePayload,
} from './validateOptimizationEvidencePayload';

const pattern = {
  id: 'sliding-2s-qty-evidence',
  name: 'Sliding 2 Sash',
  type: 'sliding',
  openingMechanism: { type: 'sliding' },
  gridSpec: {
    rows: 1,
    cols: 2,
    cells: [
      { id: '0-0', row: 0, col: 0, type: 'sash' },
      { id: '0-1', row: 0, col: 1, type: 'sash' },
    ],
    colWidths: [1, 1],
    rowHeights: [1],
  },
} as unknown as EgyptianPattern;

function payloadFrom(
  required: EvidenceCutSpec[],
  placed: EvidenceCutSpec[],
): OptimizationEvidencePayload {
  // One cut per bar so bar-pack accounting stays out of the identity assertion.
  const kerfMm = 4;
  const trimMm = 0;
  const cuttingPlan = placed.map((c) => {
    const stockLength = Math.ceil(c.length + kerfMm + trimMm * 2 + 100);
    const consumed = c.length;
    const totalWaste = stockLength - consumed;
    return {
      stockLength,
      profile: { id: c.profileId, specifications: {} },
      cuts: [
        {
          cutId: c.cutId,
          componentId: c.cutId.slice(0, c.cutId.lastIndexOf(':')),
          length: c.length,
          angle: c.angle,
          occurrenceIndex: Number(c.cutId.slice(c.cutId.lastIndexOf(':') + 1)),
        },
      ],
      totalWaste,
      utilization: (consumed / stockLength) * 100,
    };
  });
  const stockTotal = cuttingPlan.reduce((s, p) => s + p.stockLength, 0);
  const wasteTotal = cuttingPlan.reduce((s, p) => s + p.totalWaste, 0);
  return {
    schema: 'almona.optimization-result',
    schemaVersion: 2,
    cutCount: placed.length,
    kerfMm,
    trimMm,
    requiredCuts: required,
    cuttingPlan,
    materialUsage: 1,
    wastePercentage: (wasteTotal / stockTotal) * 100,
    nestingEfficiency: 100 - (wasteTotal / stockTotal) * 100,
    displayResult: {
      estimatedProductionTime: 1,
      costBreakdown: {
        materialCost: 1,
        laborCost: 1,
        hardwareCost: 1,
        glazingCost: 1,
        totalCost: 4,
      },
    },
  };
}

describe('pose quantity × evidence multiset (23-cut sliding)', () => {
  const calculator = new ProfileBOMCalculator();

  async function buildFixture() {
    const baseUnit = {
      id: 'wu-qty-evidence',
      overallWidth: 1200,
      overallHeight: 1400,
      type: 'sliding_window_2sash',
      systemPackId: 'caluminium-ps',
      grid: pattern.gridSpec,
      quantity: 1,
    } as unknown as WindowUnit;

    const components = await calculator.resolvePhysicalDesignComponents(
      baseUnit,
      pattern,
      CALUMINIUM_PS_PACK,
    );
    const savedUnit = { ...baseUnit, components } as WindowUnit;
    const profiles = await calculator.calculateProfileBOM(savedUnit, pattern, CALUMINIUM_PS_PACK);
    const designCuts = profiles.reduce((n, p) => n + p.cuttingLengths.length, 0);
    expect(designCuts).toBe(countRequiredProfilePieces(savedUnit, pattern));
    expect(designCuts).toBe(23);

    const bom = { profiles } as CompleteBOM;
    return { savedUnit, bom, components };
  }

  it.each([1, 2, 3] as const)(
    'qty %i requires design×qty cuts matching expanded placements',
    async (qty) => {
      const { bom, components } = await buildFixture();
      const ledger = requiredCutsFromBom(bom, qty);
      expect(ledger.ok).toBe(true);
      if (!ledger.ok) return;

      expect(ledger.cuts).toHaveLength(23 * qty);

      const placed = expandPhysicalCutsForPoseQuantity(components, qty, 'caluminium-ps').map(
        (cut) =>
          ({
            cutId: cut.cutId!,
            profileId: components.find((c) => c.id === cut.componentId)?.profile.id ?? '',
            length: cut.length,
            angle: cut.angle,
          }) satisfies EvidenceCutSpec,
      );
      // Placed lengths include allowance/calibration; evidence BOM lengths are the
      // BOM row values. For multiset count + identity, align placed to BOM lengths.
      const byId = new Map(ledger.cuts.map((c) => [c.cutId, c]));
      const placedAligned = placed.map((p) => {
        const req = byId.get(p.cutId);
        expect(req).toBeDefined();
        return { ...p, length: req!.length, angle: req!.angle ?? 0, profileId: req!.profileId };
      });

      expect(placedAligned).toHaveLength(23 * qty);
      const uniqueIds = new Set(ledger.cuts.map((c) => c.cutId));
      expect(uniqueIds.size).toBe(23);
      for (const id of uniqueIds) {
        expect(ledger.cuts.filter((c) => c.cutId === id)).toHaveLength(qty);
        expect(placedAligned.filter((c) => c.cutId === id)).toHaveLength(qty);
      }

      const validated = validateOptimizationEvidencePayload(
        payloadFrom(ledger.cuts, placedAligned),
        placedAligned.length,
      );
      if (!validated.ok) {
        expect.fail(validated.error);
      }
      expect(validated.ok).toBe(true);
    },
  );

  it('rejects a design BOM that lists the same occurrence twice before expansion', async () => {
    const { bom } = await buildFixture();
    const bad = {
      ...bom,
      profiles: bom.profiles.map((p, i) =>
        i === 0 && p.cutIds?.length
          ? { ...p, cutIds: p.cutIds.map(() => p.cutIds![0]) }
          : p,
      ),
    } as CompleteBOM;
    const ledger = requiredCutsFromBom(bad, 2);
    expect(ledger.ok).toBe(false);
    if (ledger.ok) return;
    expect(ledger.error).toMatch(/more than once/i);
  });

  it('rejects invalid pose quantities', async () => {
    const { bom } = await buildFixture();
    expect(requiredCutsFromBom(bom, 0).ok).toBe(false);
    expect(requiredCutsFromBom(bom, 1.5).ok).toBe(false);
    expect(requiredCutsFromBom(bom, -1).ok).toBe(false);
  });
});
