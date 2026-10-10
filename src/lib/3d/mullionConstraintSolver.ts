/**
 * Mullion / transom layout solver via @lume/kiwi (BSD-3-Clause).
 * Rule-based Cassowary constraints — AICS-001 Tier-3 safe (no ML).
 */

import { Constraint, Expression, Operator, Solver, Strength, Variable } from '@lume/kiwi';

export type MullionSolveInput = {
  /** Outer clear width (mm) */
  outerWidthMm: number;
  /** Outer clear height (mm) */
  outerHeightMm: number;
  /** Frame face width (mm) */
  frameWidthMm: number;
  /** Desired vertical mullion count (interior divisions) */
  verticalMullionCount: number;
  /** Desired horizontal transom count */
  horizontalTransomCount: number;
  /** Minimum panel clear width (mm) */
  minPanelWidthMm?: number;
  /** Minimum panel clear height (mm) */
  minPanelHeightMm?: number;
};

export type MullionSolveResult = {
  ok: boolean;
  /** X positions of vertical mullion centers (mm from outer left) */
  mullionXs: number[];
  /** Y positions of horizontal transom centers (mm from outer bottom) */
  transomYs: number[];
  panelWidthsMm: number[];
  panelHeightsMm: number[];
  error?: string;
};

/**
 * Solve equal-panel mullion/transom positions with min-panel inequalities.
 */
export function solveMullionTransomLayout(input: MullionSolveInput): MullionSolveResult {
  const {
    outerWidthMm,
    outerHeightMm,
    frameWidthMm,
    verticalMullionCount,
    horizontalTransomCount,
    minPanelWidthMm = 250,
    minPanelHeightMm = 250,
  } = input;

  if (outerWidthMm <= 0 || outerHeightMm <= 0 || frameWidthMm < 0) {
    return { ok: false, mullionXs: [], transomYs: [], panelWidthsMm: [], panelHeightsMm: [], error: 'Invalid dimensions' };
  }

  const clearW = outerWidthMm - 2 * frameWidthMm;
  const clearH = outerHeightMm - 2 * frameWidthMm;
  const vCount = Math.max(0, Math.floor(verticalMullionCount));
  const hCount = Math.max(0, Math.floor(horizontalTransomCount));
  const panelCols = vCount + 1;
  const panelRows = hCount + 1;

  if (clearW / panelCols < minPanelWidthMm || clearH / panelRows < minPanelHeightMm) {
    return {
      ok: false,
      mullionXs: [],
      transomYs: [],
      panelWidthsMm: [],
      panelHeightsMm: [],
      error: 'Min panel size exceeded for requested divisions',
    };
  }

  try {
    const solver = new Solver();
    const panelWs = Array.from({ length: panelCols }, () => new Variable());
    const panelHs = Array.from({ length: panelRows }, () => new Variable());

    let widthSum: Expression = new Expression(panelWs[0]);
    for (let i = 1; i < panelCols; i++) widthSum = widthSum.plus(panelWs[i]);
    solver.addConstraint(new Constraint(widthSum, Operator.Eq, clearW, Strength.required));

    let heightSum: Expression = new Expression(panelHs[0]);
    for (let i = 1; i < panelRows; i++) heightSum = heightSum.plus(panelHs[i]);
    solver.addConstraint(new Constraint(heightSum, Operator.Eq, clearH, Strength.required));

    for (let i = 0; i < panelCols; i++) {
      const w = panelWs[i];
      solver.addConstraint(new Constraint(w, Operator.Ge, minPanelWidthMm, Strength.required));
      if (panelCols > 1) {
        solver.addConstraint(
          new Constraint(w, Operator.Eq, clearW / panelCols, Strength.strong),
        );
      }
    }
    for (let i = 0; i < panelRows; i++) {
      const h = panelHs[i];
      solver.addConstraint(new Constraint(h, Operator.Ge, minPanelHeightMm, Strength.required));
      if (panelRows > 1) {
        solver.addConstraint(
          new Constraint(h, Operator.Eq, clearH / panelRows, Strength.strong),
        );
      }
    }

    solver.updateVariables();

    const panelWidthsMm = panelWs.map((v) => v.value());
    const panelHeightsMm = panelHs.map((v) => v.value());

    const mullionXs: number[] = [];
    let x = frameWidthMm;
    for (let i = 0; i < vCount; i++) {
      x += panelWidthsMm[i];
      mullionXs.push(x);
    }

    const transomYs: number[] = [];
    let y = frameWidthMm;
    for (let i = 0; i < hCount; i++) {
      y += panelHeightsMm[i];
      transomYs.push(y);
    }

    return { ok: true, mullionXs, transomYs, panelWidthsMm, panelHeightsMm };
  } catch (err) {
    return {
      ok: false,
      mullionXs: [],
      transomYs: [],
      panelWidthsMm: [],
      panelHeightsMm: [],
      error: err instanceof Error ? err.message : 'Constraint solve failed',
    };
  }
}

/** Lazy entry for call sites that must not sync-import kiwi into light chunks. */
export async function solveMullionTransomLayoutAsync(
  input: MullionSolveInput,
): Promise<MullionSolveResult> {
  return solveMullionTransomLayout(input);
}
