/**
 * Manufacturing chain E2E (local/CI): 10 positions / 18 units / >100 cuts on caluminium-ps.
 * Classification remains estimate_only — not manufacturing-qualified convert evidence.
 *
 * Two fixtures:
 * - Uniform 1200×1400 (area 30.24 m²) — regression baseline
 * - Diverse sliding poses (distinct patterns + sizes) — FINAL GOAL estimate twin
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EGYPTIAN_PATTERNS,
  patternGridSpecToWindowGrid,
  type EgyptianPattern,
} from '@/data/egyptian-window-patterns';
import { CALUMINIUM_PS_PACK } from '@/data/profileSystems/egyptian/caluminium/ps';
import { ProfileBOMCalculator } from '@/lib/fabricator/bom/ProfileBOMCalculator';
import { optimizeProjectEstimate } from '@/lib/fabricator/production/ProjectOptimizationEstimate';
import type { Profile, WindowUnit } from '@/types/fabricator';

const uniformPattern = {
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

/** Ten genuinely different sliding poses (pattern × size); 8×qty2 + 2×qty1 = 18 units. */
const DIVERSE_POSES: ReadonlyArray<{
  patternId: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
}> = [
  { patternId: 'sliding-2s', widthMm: 1200, heightMm: 1400, quantity: 2 },
  { patternId: 'sliding-2s', widthMm: 1800, heightMm: 1600, quantity: 2 },
  { patternId: 'sliding-2s', widthMm: 2100, heightMm: 1500, quantity: 2 },
  { patternId: 'sliding-4s', widthMm: 2800, heightMm: 1600, quantity: 2 },
  { patternId: 'sliding-4s', widthMm: 3200, heightMm: 2000, quantity: 2 },
  { patternId: 'sliding-3s-center-fixed', widthMm: 2400, heightMm: 1600, quantity: 2 },
  { patternId: 'sliding-door-2p', widthMm: 2200, heightMm: 2200, quantity: 2 },
  { patternId: 'sliding-door-2p', widthMm: 3000, heightMm: 2400, quantity: 2 },
  { patternId: 'sliding-3s-center-fixed', widthMm: 2800, heightMm: 1800, quantity: 1 },
  { patternId: 'sliding-2s', widthMm: 1500, heightMm: 1800, quantity: 1 },
];

function packProfile(code: string): Profile {
  const found = CALUMINIUM_PS_PACK.profiles.find((p: Profile) => p.id === code);
  if (!found) throw new Error(`Missing pack profile ${code}`);
  return found;
}

function catalogPattern(patternId: string): EgyptianPattern {
  const found = EGYPTIAN_PATTERNS.find((p) => p.id === patternId);
  if (!found) throw new Error(`Missing Egyptian pattern ${patternId}`);
  return found;
}

function writeMetricsJson(path: string, metrics: Record<string, unknown>): void {
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');
  } catch {
    const fallback = resolve(process.cwd(), path.split('/').pop() || 'e2e-metrics.json');
    writeFileSync(fallback, `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');
  }
}

function metricsPath(kind: 'uniform' | 'diverse'): string {
  const fromEnv =
    kind === 'uniform'
      ? process.env.MFG_E2E_METRICS_PATH?.trim()
      : process.env.MFG_E2E_DIVERSE_METRICS_PATH?.trim();
  if (fromEnv) return resolve(fromEnv);
  return resolve(
    kind === 'uniform'
      ? '/opt/cursor/artifacts/e2e-1018-metrics.json'
      : '/opt/cursor/artifacts/e2e-1018-diverse-metrics.json',
  );
}

function summarizeEstimate(
  estimate: ReturnType<typeof optimizeProjectEstimate>,
  expectedPieces: number,
  unitCount: number,
  areaM2: number,
  areaNote: string,
  extra: Record<string, unknown> = {},
) {
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
  const unplaced = expectedPieces - placed;
  return {
    classification: estimate.classification,
    manufacturingEligible: estimate.manufacturingEligible,
    positions: estimate.positions,
    positionsResolved: estimate.positions,
    units: unitCount,
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
    areaNote,
    recordedAt: new Date().toISOString(),
    ...extra,
  };
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
      grid: uniformPattern.gridSpec,
    } as unknown as WindowUnit;

    const bomRows = await calculator.calculateProfileBOM(template, uniformPattern, CALUMINIUM_PS_PACK);
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

    const areaM2 = Number((1.2 * 1.4 * unitCount).toFixed(2));
    const metrics = summarizeEstimate(
      estimate,
      expectedPieces,
      unitCount,
      areaM2,
      'uniform 1200×1400 fixture; diverse-pose area calculated in sibling test',
      { cutsPerUnit, fixture: 'uniform' },
    );

    expect(metrics.placedCuts).toBe(estimate.pieces);
    expect(metrics.placedCuts).toBe(expectedPieces);
    expect(estimate.groups.every((g) => g.result.stockUsed.every((bar) => bar.waste >= 0))).toBe(true);
    expect(metrics.unplacedCuts).toBe(0);

    writeMetricsJson(metricsPath('uniform'), metrics);

    expect(metrics.positionsResolved).toBe(10);
    expect(metrics.placedCuts).toBeGreaterThan(100);
    expect(metrics.unplacedCuts).toBe(0);
    expect(metrics.areaM2).toBe(30.24);
  });

  it('optimizes ten genuinely different sliding poses totaling 18 units with >100 cuts', async () => {
    const calculator = new ProfileBOMCalculator();
    const poseSummaries: Array<{
      patternId: string;
      widthMm: number;
      heightMm: number;
      quantity: number;
      cutsPerUnit: number;
      areaM2: number;
    }> = [];

    const positions: WindowUnit[] = [];
    for (let index = 0; index < DIVERSE_POSES.length; index += 1) {
      const spec = DIVERSE_POSES[index];
      const pattern = catalogPattern(spec.patternId);
      const grid = patternGridSpecToWindowGrid(pattern.gridSpec);
      const unit = {
        id: `diverse-pose-${index + 1}`,
        posNumber: String(index + 1),
        overallWidth: spec.widthMm,
        overallHeight: spec.heightMm,
        type: 'sliding',
        systemPackId: 'caluminium-ps',
        presetId: pattern.id,
        grid,
        quantity: spec.quantity,
      } as unknown as WindowUnit;

      const bomRows = await calculator.calculateProfileBOM(unit, pattern, CALUMINIUM_PS_PACK);
      expect(bomRows.every((row) => (row.cost ?? 0) > 0)).toBe(true);

      const components = bomRows.map((row, rowIndex) => ({
        id: `comp-${index + 1}-${rowIndex}-${row.profileCode}`,
        type: row.role || 'frame',
        profile: packProfile(String(row.profileCode)),
        cuttingLengths: [...(row.cuttingLengths ?? [])],
        quantity: 1,
      }));
      const cutsPerUnit = components.reduce((sum, c) => sum + c.cuttingLengths.length, 0);
      expect(cutsPerUnit).toBeGreaterThan(0);

      const areaM2 = Number(((spec.widthMm / 1000) * (spec.heightMm / 1000) * spec.quantity).toFixed(4));
      poseSummaries.push({
        patternId: spec.patternId,
        widthMm: spec.widthMm,
        heightMm: spec.heightMm,
        quantity: spec.quantity,
        cutsPerUnit,
        areaM2,
      });

      positions.push({ ...unit, components } as unknown as WindowUnit);
    }

    // Genuinely different: distinct pattern×size signatures
    const signatures = new Set(
      poseSummaries.map((p) => `${p.patternId}:${p.widthMm}x${p.heightMm}`),
    );
    expect(signatures.size).toBe(10);

    const unitCount = positions.reduce((sum, p) => sum + (p.quantity ?? 1), 0);
    expect(positions).toHaveLength(10);
    expect(unitCount).toBe(18);

    const expectedPieces = poseSummaries.reduce(
      (sum, p) => sum + p.cutsPerUnit * p.quantity,
      0,
    );
    expect(expectedPieces).toBeGreaterThan(100);

    const estimate = optimizeProjectEstimate(positions, [CALUMINIUM_PS_PACK]);
    expect(estimate.classification).toBe('estimate_only');
    expect(estimate.manufacturingEligible).toBe(false);
    expect(estimate.positions).toBe(10);
    expect(estimate.pieces).toBe(expectedPieces);

    const areaM2 = Number(
      poseSummaries.reduce((sum, p) => sum + p.areaM2, 0).toFixed(2),
    );
    // Must not accidentally equal the uniform fixture area
    expect(areaM2).not.toBe(30.24);
    expect(areaM2).toBe(76.68);

    const metrics = summarizeEstimate(
      estimate,
      expectedPieces,
      unitCount,
      areaM2,
      'diverse-pose sum of (W/1000)×(H/1000)×qty per position; not uniform 30.24 m²',
      {
        fixture: 'diverse',
        patternIds: [...new Set(poseSummaries.map((p) => p.patternId))],
        poses: poseSummaries,
      },
    );

    expect(metrics.placedCuts).toBe(estimate.pieces);
    expect(metrics.unplacedCuts).toBe(0);
    expect(estimate.groups.every((g) => g.result.stockUsed.every((bar) => bar.waste >= 0))).toBe(true);

    writeMetricsJson(metricsPath('diverse'), metrics);

    expect(metrics.positionsResolved).toBe(10);
    expect(metrics.placedCuts).toBeGreaterThan(100);
    expect(metrics.unplacedCuts).toBe(0);
    expect(metrics.areaM2).toBe(76.68);
  });
});
