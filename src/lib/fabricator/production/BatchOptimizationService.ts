/**
 * BatchOptimizationService - Cross-position cut optimization
 *
 * Phase 4.2: Aggregates cut requests across all project positions and runs
 * a single bin-packing optimization. Reduces total bars and waste vs per-unit optimization.
 *
 * Gold-tier: deterministic, no side effects, pure computation.
 */

import type { CutRequest } from '@/lib/algorithms/LinearOptimizer';
import { optimizeLinearCuts, type OptimizationResult } from '@/lib/algorithms/LinearOptimizer';
import { ApexEngineV6, type ApexV6Output } from '@/lib/fabricator/goldTier/ApexEngineV6';
import type { WindowUnit } from '@/types/fabricator';
import type { SystemPack } from '@/types/fabricator';
import { SYSTEM_PACKS } from '@/data/systemPacks';

const STOCK_LENGTH_MM = 6000;
const KERF_MM = 5;

export interface BatchOptimizationResult {
  frameStock: OptimizationResult;
  sashStock: OptimizationResult;
  perUnitResults: Map<string, ApexV6Output>;
  barsSaved: number;
  wasteSavedMm: number;
}

/**
 * Converts Apex manufacturing cut lengths (microns) to CutRequest array.
 */
function cutResultToRequests(
  top: number,
  bottom: number,
  left: number,
  right: number,
  unitId: string,
  posNumber: string,
  quantity: number,
  role: 'frame' | 'sash'
): CutRequest[] {
  const toMm = (micron: number) => micron / 1000;
  const qty = Math.max(1, quantity);
  const prefix = role === 'frame' ? 'f' : 's';
  const labelPrefix = role === 'frame' ? 'Frame' : 'Sash';
  return [
    { id: `${prefix}-top-${unitId}`, length: toMm(top), label: `${labelPrefix} Top (${posNumber})`, quantity: qty },
    { id: `${prefix}-btm-${unitId}`, length: toMm(bottom), label: `${labelPrefix} Bottom (${posNumber})`, quantity: qty },
    { id: `${prefix}-left-${unitId}`, length: toMm(left), label: `${labelPrefix} Left (${posNumber})`, quantity: qty },
    { id: `${prefix}-right-${unitId}`, length: toMm(right), label: `${labelPrefix} Right (${posNumber})`, quantity: qty },
  ];
}

/**
 * Runs batch optimization across all project units.
 * Returns consolidated frame/sash stock results plus per-unit results for comparison.
 */
export function runBatchOptimization(
  units: WindowUnit[],
  systemPacks: SystemPack[] = SYSTEM_PACKS
): BatchOptimizationResult {
  const perUnitResults = new Map<string, ApexV6Output>();
  const allFrameRequests: CutRequest[] = [];
  const allSashRequests: CutRequest[] = [];

  for (const unit of units) {
    const pack =
      systemPacks.find((p) => p.meta?.id === (unit.systemPackId ?? 'generic-60')) ?? systemPacks[0];
    const engine = new ApexEngineV6(pack, unit, 'miter');
    const result = engine.generate();
    perUnitResults.set(unit.id, result);

    const { frame, sash } = result.manufacturing;
    const qty = Math.max(1, unit.quantity ?? 1);
    const pos = unit.posNumber ?? unit.id;

    allFrameRequests.push(
      ...cutResultToRequests(
        frame.topLength,
        frame.bottomLength,
        frame.leftLength,
        frame.rightLength,
        unit.id,
        pos,
        qty,
        'frame'
      )
    );
    allSashRequests.push(
      ...cutResultToRequests(
        sash.topLength,
        sash.bottomLength,
        sash.leftLength,
        sash.rightLength,
        unit.id,
        pos,
        qty,
        'sash'
      )
    );
  }

  const frameStock = optimizeLinearCuts(allFrameRequests, STOCK_LENGTH_MM, KERF_MM);
  const sashStock = optimizeLinearCuts(allSashRequests, STOCK_LENGTH_MM, KERF_MM);

  const batchBars = frameStock.barsCount + sashStock.barsCount;
  const batchWaste = frameStock.totalWaste + sashStock.totalWaste;

  let perUnitBars = 0;
  let perUnitWaste = 0;
  for (const r of perUnitResults.values()) {
    perUnitBars += r.optimization.frameStock.barsCount + r.optimization.sashStock.barsCount;
    perUnitWaste += r.optimization.frameStock.totalWaste + r.optimization.sashStock.totalWaste;
  }

  return {
    frameStock,
    sashStock,
    perUnitResults,
    barsSaved: Math.max(0, perUnitBars - batchBars),
    wasteSavedMm: Math.max(0, perUnitWaste - batchWaste),
  };
}
