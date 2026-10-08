/**
 * Manufacturing chain E2E (local): 10 positions / 18 units / >100 cuts on caluminium-ps.
 * Requires dated pricing (#63) + ledger BOM. Authority seed (#54) is checked via local DB
 * in the companion shell step (see .tmp-pr-assess/mfg-e2e-report.md).
 */
import { describe, expect, it } from 'vitest';
import { optimizeLinearCuts, type CutRequest } from '@/lib/algorithms/LinearOptimizer';
import { CALUMINIUM_PS_PACK } from '@/data/profileSystems/egyptian/caluminium/ps';
import { ProfileBOMCalculator } from '@/lib/fabricator/bom/ProfileBOMCalculator';
import { physicalCutForOccurrence } from '@/lib/fabricator/optimization/physicalCutContract';
import { PLATFORM_MANUFACTURING_DEFAULTS } from '@/lib/fabricator/ManufacturingSettings';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { Profile, WindowUnit } from '@/types/fabricator';

const pattern = {
  id: 'sliding-2s-ps',
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

function packProfile(code: string): Profile {
  const found = CALUMINIUM_PS_PACK.profiles.find((p: Profile) => p.id === code);
  if (!found) throw new Error(`Missing pack profile ${code}`);
  return found;
}

describe('manufacturing E2E — caluminium-ps 10/18/>100-cut', () => {
  it('optimizes eighteen units across ten positions with >100 reconciled cuts', async () => {
    const calculator = new ProfileBOMCalculator();
    const template = {
      id: 'wu-template',
      overallWidth: 1200,
      overallHeight: 1400,
      type: 'sliding',
      systemPackId: 'caluminium-ps',
      grid: pattern.gridSpec,
    } as unknown as WindowUnit;

    const bomRows = await calculator.calculateProfileBOM(template, pattern, CALUMINIUM_PS_PACK);
    expect(bomRows.every((row) => (row.cost ?? 0) > 0)).toBe(true);

    const components = bomRows.map((row, index) => ({
      id: `comp-${index}-${row.profileCode}`,
      type: row.role || 'frame',
      profile: packProfile(String(row.profileCode)),
      cuttingLengths: [...(row.cuttingLengths ?? [])],
      quantity: 1,
    }));
    const cutsPerUnit = components.reduce((sum, c) => sum + c.cuttingLengths.length, 0);
    expect(cutsPerUnit).toBeGreaterThan(0);

    // Same fixture as ProjectSummaryDashboard: 8×qty2 + 2×qty1 = 18 units, 10 positions
    const positions = Array.from({ length: 10 }, (_, index) => ({
      ...template,
      id: `pose-${index + 1}`,
      posNumber: String(index + 1),
      quantity: index < 8 ? 2 : 1,
      components,
    })) as unknown as WindowUnit[];

    const unitCount = positions.reduce((sum, p) => sum + (p.quantity ?? 1), 0);
    expect(positions).toHaveLength(10);
    expect(unitCount).toBe(18);

    const expectedPieces = cutsPerUnit * unitCount;
    expect(expectedPieces).toBeGreaterThan(100);

    // Sliding pack path: pool cuts by profile (ProjectOptimizationEstimate is fixed-grid only).
    const stockLengthMm = 6000;
    const kerfMm = PLATFORM_MANUFACTURING_DEFAULTS.sawKerfMm;
    const trimMm = PLATFORM_MANUFACTURING_DEFAULTS.trimCutMm;
    const byProfile = new Map<string, CutRequest[]>();
    let pieces = 0;
    for (const position of positions) {
      const quantity = position.quantity ?? 1;
      for (const component of position.components ?? []) {
        const profile = component.profile!;
        const list = byProfile.get(profile.id) ?? [];
        component.cuttingLengths.forEach((_length: number, index: number) => {
          const cut = physicalCutForOccurrence(component, index, profile, position.systemPackId);
          list.push({
            id: `${position.id}:${component.id}:${index}`,
            length: cut.length,
            quantity,
            label: `Pose ${position.posNumber} · ${component.type} · ${index + 1}`,
          });
          pieces += quantity;
        });
        byProfile.set(profile.id, list);
      }
    }
    expect(pieces).toBe(expectedPieces);

    let placed = 0;
    for (const [profileId, requests] of byProfile) {
      const result = optimizeLinearCuts(requests, stockLengthMm, kerfMm, trimMm);
      const required = requests.reduce((sum: number, request: CutRequest) => sum + request.quantity, 0);
      const barCuts = result.stockUsed.reduce((sum: number, bar) => sum + bar.cuts.length, 0);
      expect(barCuts).toBe(required);
      expect(result.stockUsed.every((bar) => bar.waste >= 0), profileId).toBe(true);
      placed += barCuts;
    }
    expect(placed).toBe(pieces);
    expect(placed).toBeGreaterThan(100);
  });
});
