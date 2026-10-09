/**
 * Manufacturing chain E2E (local/CI): 10 positions / 18 units / >100 cuts on caluminium-ps.
 * Classification remains estimate_only — not manufacturing-qualified convert evidence.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CALUMINIUM_PS_PACK } from '@/data/profileSystems/egyptian/caluminium/ps';
import { ProfileBOMCalculator } from '@/lib/fabricator/bom/ProfileBOMCalculator';
import { optimizeProjectEstimate } from '@/lib/fabricator/production/ProjectOptimizationEstimate';
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

function metricsPath(): string {
  const fromEnv = process.env.MFG_E2E_METRICS_PATH?.trim();
  if (fromEnv) return resolve(fromEnv);
  return resolve('/opt/cursor/artifacts/e2e-1018-metrics.json');
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

    const estimate = optimizeProjectEstimate(positions, [CALUMINIUM_PS_PACK]);
    expect(estimate.classification).toBe('estimate_only');
    expect(estimate.manufacturingEligible).toBe(false);
    expect(estimate.positions).toBe(10);
    expect(estimate.pieces).toBe(expectedPieces);
    expect(estimate.pieces).toBeGreaterThan(100);

    const placed = estimate.groups.reduce(
      (sum, group) => sum + group.result.stockUsed.reduce((barSum, bar) => barSum + bar.cuts.length, 0),
      0,
    );
    const bars = estimate.groups.reduce((sum, group) => sum + group.result.stockUsed.length, 0);
    const wasteMm = estimate.groups.reduce((sum, group) => sum + group.result.totalWaste, 0);
    const cutLengthMm = estimate.groups.reduce((sum, group) => sum + group.result.totalCutLength, 0);
    const stockLengthMm = estimate.groups.reduce((sum, group) => sum + group.result.totalStockLength, 0);
    const kerfMm = estimate.groups[0]?.kerfMm ?? null;
    const trimMm = estimate.groups[0]?.trimMm ?? null;
    const efficiency =
      stockLengthMm > 0 ? Number((((stockLengthMm - wasteMm) / stockLengthMm) * 100).toFixed(2)) : 0;
    // Uniform 1200×1400 × 18 units
    const areaM2 = Number(((1.2 * 1.4 * unitCount)).toFixed(2));

    expect(placed).toBe(estimate.pieces);
    expect(placed).toBe(expectedPieces);
    expect(estimate.groups.every((g) => g.result.stockUsed.every((bar) => bar.waste >= 0))).toBe(true);

    const unplaced = expectedPieces - placed;
    expect(unplaced).toBe(0);

    const metrics = {
      classification: estimate.classification,
      manufacturingEligible: estimate.manufacturingEligible,
      positions: estimate.positions,
      positionsResolved: estimate.positions,
      units: unitCount,
      cutsPerUnit,
      placedCuts: placed,
      unplacedCuts: unplaced,
      bars,
      kerfMm,
      trimMm,
      wasteMm,
      cutLengthMm,
      stockLengthMm,
      efficiencyPercent: efficiency,
      areaM2,
      areaNote: 'uniform 1200×1400 fixture; diverse-pose area must be calculated separately',
      recordedAt: new Date().toISOString(),
    };

    const out = metricsPath();
    try {
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');
    } catch {
      // CI / sandbox without /opt/cursor — still assert metrics in-process
      const fallback = resolve(process.cwd(), 'e2e-1018-metrics.json');
      writeFileSync(fallback, `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');
    }

    expect(metrics.positionsResolved).toBe(10);
    expect(metrics.placedCuts).toBeGreaterThan(100);
    expect(metrics.unplacedCuts).toBe(0);
    expect(metrics.areaM2).toBe(30.24);
  });
});
