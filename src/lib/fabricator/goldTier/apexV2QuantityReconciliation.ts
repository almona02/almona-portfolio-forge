/**
 * FP-028 / A8 — Apex V2 quantity reconciliation (characterization).
 *
 * Compares BOM outputs against grid/unit expectations.
 * Does not change manufacturing formulas; used to prove defects until Phase 4.
 */

import type { WindowGrid, WindowUnit } from '@/types/fabricator';
import type { FabricationData } from './ApexEngineV2';

export interface QuantityExpectation {
  unitQuantity: number;
  operableCellCount: number;
  /** One pane per operable cell × unit quantity (characterization expectation) */
  expectedPaneCount: number;
  /** Cut pieces: 4 sides per frame + 4 sides per operable sash (+ mullion/transom later) */
  expectedFrameSidePieces: number;
  expectedSashSidePieces: number;
}

export interface QuantityActual {
  bomGlazingEntries: number;
  bomGasketEntries: number;
  /** Sum of profile.quantity in BOM (component-node counts, not side pieces) */
  bomProfileComponentCount: number;
  /** Sum of cutList.quantity */
  cutListPieceCount: number;
  cutListHasUnitQuantity: boolean;
  bomGlazingHasUnitQuantity: boolean;
}

export interface QuantityReconciliationReport {
  expectation: QuantityExpectation;
  actual: QuantityActual;
  defects: string[];
  reconciles: boolean;
}

function countOperableCells(grid: WindowGrid | undefined): number {
  if (!grid?.cells?.length) return 0;
  return grid.cells.filter((c) => c.type === 'sash' || c.type === 'sliding').length;
}

export function buildQuantityExpectation(unit: WindowUnit): QuantityExpectation {
  const unitQuantity = Math.max(1, unit.quantity ?? 1);
  const operableCellCount = countOperableCells(unit.grid);
  return {
    unitQuantity,
    operableCellCount,
    expectedPaneCount: operableCellCount * unitQuantity,
    expectedFrameSidePieces: 4 * unitQuantity,
    expectedSashSidePieces: 4 * operableCellCount * unitQuantity,
  };
}

export function inspectApexV2QuantityReconciliation(
  unit: WindowUnit,
  fabricationData: FabricationData
): QuantityReconciliationReport {
  const expectation = buildQuantityExpectation(unit);
  const bom = fabricationData.bom;
  const cutList = fabricationData.cutList;

  const bomProfileComponentCount = bom.profiles.reduce((sum, p) => sum + p.quantity, 0);
  const cutListPieceCount = cutList.reduce((sum, c) => sum + c.quantity, 0);

  const actual: QuantityActual = {
    bomGlazingEntries: bom.glazing.length,
    bomGasketEntries: bom.gaskets.length,
    bomProfileComponentCount,
    cutListPieceCount,
    cutListHasUnitQuantity: cutList.some((c) => c.quantity >= expectation.unitQuantity && expectation.unitQuantity > 1)
      || (expectation.unitQuantity === 1 && cutListPieceCount > 0),
    bomGlazingHasUnitQuantity: bom.glazing.length >= expectation.expectedPaneCount,
  };

  const defects: string[] = [];

  if (actual.bomGlazingEntries !== expectation.expectedPaneCount) {
    defects.push(
      `glazing_count: expected ${expectation.expectedPaneCount} panes ` +
        `(${expectation.operableCellCount} operable × qty ${expectation.unitQuantity}), ` +
        `got ${actual.bomGlazingEntries}`
    );
  }

  // At least one gasket length entry per pane is the conservative characterization expectation
  if (actual.bomGasketEntries < expectation.expectedPaneCount) {
    defects.push(
      `gasket_count: expected ≥ ${expectation.expectedPaneCount} gasket entries for panes, ` +
        `got ${actual.bomGasketEntries}`
    );
  }

  const expectedMinCutPieces =
    expectation.expectedFrameSidePieces + expectation.expectedSashSidePieces;
  if (actual.cutListPieceCount < expectedMinCutPieces) {
    defects.push(
      `cut_list_pieces: expected ≥ ${expectedMinCutPieces} side pieces ` +
        `(4 frame + 4×operable×qty), got ${actual.cutListPieceCount}`
    );
  }

  if (expectation.unitQuantity > 1) {
    const anyScaled = cutList.some((c) => c.quantity === expectation.unitQuantity)
      || bom.profiles.some((p) => p.quantity >= expectation.unitQuantity * 2);
    if (!anyScaled) {
      defects.push(
        `unit_quantity: unit.quantity=${expectation.unitQuantity} not reflected in BOM/cutList`
      );
    }
  }

  return {
    expectation,
    actual,
    defects,
    reconciles: defects.length === 0,
  };
}
