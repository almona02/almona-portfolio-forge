/**
 * FP-028 / Phase 0 — Apex V6 piece inspection helpers.
 *
 * Characterization only: does not change cutting formulas.
 * Phase 4 will extend ApexV6Output with per-cell assemblies; these helpers
 * already prefer that shape when present and fall back to the legacy single sash.
 */

import type { WindowGrid } from '@/types/fabricator';
import type { ApexV6Output } from './ApexEngineV6';

export interface ApexV6SashAssemblyView {
  /** Stable source cell id when per-cell generation exists (Phase 4). */
  sourceCellId?: string;
  topLengthMicrons: number;
  bottomLengthMicrons: number;
  leftLengthMicrons: number;
  rightLengthMicrons: number;
}

export interface ApexV6PieceInspection {
  frameAssemblyCount: number;
  sashAssemblyCount: number;
  operableCellCount: number;
  hasPerCellSashLinkage: boolean;
  sashAssemblies: ApexV6SashAssemblyView[];
}

function countOperableCells(grid: WindowGrid | undefined): number {
  if (!grid?.cells?.length) return 0;
  return grid.cells.filter((c) => c.type === 'sash' || c.type === 'sliding').length;
}

/**
 * Inspect Apex V6 manufacturing output against the authoritative grid.
 */
export function inspectApexV6Pieces(
  output: ApexV6Output,
  grid: WindowGrid | undefined
): ApexV6PieceInspection {
  const manufacturing = output.manufacturing;

  const sashAssemblies: ApexV6SashAssemblyView[] = manufacturing.sashes.length > 0
    ? manufacturing.sashes.map((sash) => ({
        sourceCellId: sash.sourceCellId,
        topLengthMicrons: sash.topLength,
        bottomLengthMicrons: sash.bottomLength,
        leftLengthMicrons: sash.leftLength,
        rightLengthMicrons: sash.rightLength,
      }))
    : manufacturing.sash
      ? [
          {
            sourceCellId: undefined,
            topLengthMicrons: manufacturing.sash.topLength,
            bottomLengthMicrons: manufacturing.sash.bottomLength,
            leftLengthMicrons: manufacturing.sash.leftLength,
            rightLengthMicrons: manufacturing.sash.rightLength,
          },
        ]
      : [];

  const hasPerCellSashLinkage =
    sashAssemblies.length > 0 &&
    sashAssemblies.every((s) => typeof s.sourceCellId === 'string' && s.sourceCellId.length > 0);

  return {
    frameAssemblyCount: manufacturing.frame ? 1 : 0,
    sashAssemblyCount: sashAssemblies.length,
    operableCellCount: countOperableCells(grid),
    hasPerCellSashLinkage,
    sashAssemblies,
  };
}
