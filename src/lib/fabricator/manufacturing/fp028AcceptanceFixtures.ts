/**
 * FP-028 / Phase 0 — F1–F3 acceptance fixtures and expected-piece records.
 *
 * Records required physical piece *slots* (role, source cell, counts) without
 * inventing cut lengths, deductions, stock, prices, or profile codes.
 *
 * Length formulas remain pending system evidence (see rock60Evidence.ts).
 */

import type { WindowGrid } from '@/types/fabricator';

export type Fp028FixtureId = 'F1' | 'F2' | 'F3';

export type ExpectedPieceRole =
  | 'frame_horizontal'
  | 'frame_vertical'
  | 'sash_horizontal'
  | 'sash_vertical'
  | 'mullion_vertical'
  | 'transom_horizontal'
  | 'glazing_pane'
  | 'gasket_loop';

export interface ExpectedPieceSlot {
  /** Stable identity for reconciliation (not a cut length claim). */
  pieceId: string;
  role: ExpectedPieceRole;
  /** Source cell id when piece is per-cell; omitted for unit-level frame/mullion. */
  sourceCellId?: string;
  /** Count for a single unit before quantity multiplier. */
  countPerUnit: number;
  /**
   * Length authority status for this slot.
   * Phase 0 records structure only — lengths are never invented here.
   */
  lengthStatus: 'pending_system_evidence';
}

export interface Fp028AcceptanceFixture {
  id: Fp028FixtureId;
  description: string;
  systemPackId: string;
  overallWidthMm: number;
  overallHeightMm: number;
  quantity: number;
  grid: WindowGrid;
  identity: {
    ownerId: string;
    projectId: string;
    positionId: string;
    source: string;
    revision: number;
  };
  /** Required piece slots for one unit × quantity (counts already scaled). */
  expectedPieces: ExpectedPieceSlot[];
}

function scaleSlots(slots: ExpectedPieceSlot[], quantity: number): ExpectedPieceSlot[] {
  return slots.map((slot) => ({
    ...slot,
    countPerUnit: slot.countPerUnit * quantity,
  }));
}

/** F1 — ROCK 60 sliding 1210×1550, 1×2, both sliding */
const F1_GRID: WindowGrid = {
  rows: 1,
  cols: 2,
  cells: [
    { id: 'cell-slide-L', row: 0, col: 0, type: 'sliding', openingDirection: 'right' },
    { id: 'cell-slide-R', row: 0, col: 1, type: 'sliding', openingDirection: 'left' },
  ],
  colWidths: [605, 605],
  rowHeights: [1550],
};

const F1_UNIT_SLOTS: ExpectedPieceSlot[] = [
  { pieceId: 'F1.frame.H', role: 'frame_horizontal', countPerUnit: 2, lengthStatus: 'pending_system_evidence' },
  { pieceId: 'F1.frame.V', role: 'frame_vertical', countPerUnit: 2, lengthStatus: 'pending_system_evidence' },
  { pieceId: 'F1.mullion.V', role: 'mullion_vertical', countPerUnit: 1, lengthStatus: 'pending_system_evidence' },
  {
    pieceId: 'F1.sash.L.H',
    role: 'sash_horizontal',
    sourceCellId: 'cell-slide-L',
    countPerUnit: 2,
    lengthStatus: 'pending_system_evidence',
  },
  {
    pieceId: 'F1.sash.L.V',
    role: 'sash_vertical',
    sourceCellId: 'cell-slide-L',
    countPerUnit: 2,
    lengthStatus: 'pending_system_evidence',
  },
  {
    pieceId: 'F1.sash.R.H',
    role: 'sash_horizontal',
    sourceCellId: 'cell-slide-R',
    countPerUnit: 2,
    lengthStatus: 'pending_system_evidence',
  },
  {
    pieceId: 'F1.sash.R.V',
    role: 'sash_vertical',
    sourceCellId: 'cell-slide-R',
    countPerUnit: 2,
    lengthStatus: 'pending_system_evidence',
  },
  {
    pieceId: 'F1.glass.L',
    role: 'glazing_pane',
    sourceCellId: 'cell-slide-L',
    countPerUnit: 1,
    lengthStatus: 'pending_system_evidence',
  },
  {
    pieceId: 'F1.glass.R',
    role: 'glazing_pane',
    sourceCellId: 'cell-slide-R',
    countPerUnit: 1,
    lengthStatus: 'pending_system_evidence',
  },
  {
    pieceId: 'F1.gasket.L',
    role: 'gasket_loop',
    sourceCellId: 'cell-slide-L',
    countPerUnit: 1,
    lengthStatus: 'pending_system_evidence',
  },
  {
    pieceId: 'F1.gasket.R',
    role: 'gasket_loop',
    sourceCellId: 'cell-slide-R',
    countPerUnit: 1,
    lengthStatus: 'pending_system_evidence',
  },
];

/** F2 — Unequal casement/fixed 1500×1400, widths 900/600 */
const F2_GRID: WindowGrid = {
  rows: 1,
  cols: 2,
  cells: [
    { id: 'cell-casement', row: 0, col: 0, type: 'sash', openingDirection: 'right' },
    { id: 'cell-fixed', row: 0, col: 1, type: 'fixed' },
  ],
  colWidths: [900, 600],
  rowHeights: [1400],
};

const F2_UNIT_SLOTS: ExpectedPieceSlot[] = [
  { pieceId: 'F2.frame.H', role: 'frame_horizontal', countPerUnit: 2, lengthStatus: 'pending_system_evidence' },
  { pieceId: 'F2.frame.V', role: 'frame_vertical', countPerUnit: 2, lengthStatus: 'pending_system_evidence' },
  { pieceId: 'F2.mullion.V', role: 'mullion_vertical', countPerUnit: 1, lengthStatus: 'pending_system_evidence' },
  {
    pieceId: 'F2.sash.H',
    role: 'sash_horizontal',
    sourceCellId: 'cell-casement',
    countPerUnit: 2,
    lengthStatus: 'pending_system_evidence',
  },
  {
    pieceId: 'F2.sash.V',
    role: 'sash_vertical',
    sourceCellId: 'cell-casement',
    countPerUnit: 2,
    lengthStatus: 'pending_system_evidence',
  },
  {
    pieceId: 'F2.glass.casement',
    role: 'glazing_pane',
    sourceCellId: 'cell-casement',
    countPerUnit: 1,
    lengthStatus: 'pending_system_evidence',
  },
  {
    pieceId: 'F2.glass.fixed',
    role: 'glazing_pane',
    sourceCellId: 'cell-fixed',
    countPerUnit: 1,
    lengthStatus: 'pending_system_evidence',
  },
  {
    pieceId: 'F2.gasket.casement',
    role: 'gasket_loop',
    sourceCellId: 'cell-casement',
    countPerUnit: 1,
    lengthStatus: 'pending_system_evidence',
  },
  {
    pieceId: 'F2.gasket.fixed',
    role: 'gasket_loop',
    sourceCellId: 'cell-fixed',
    countPerUnit: 1,
    lengthStatus: 'pending_system_evidence',
  },
];

/** F3 — Multi-row quantity: 1800×2100, 2×2 mixed, quantity 3 */
const F3_GRID: WindowGrid = {
  rows: 2,
  cols: 2,
  cells: [
    { id: '0-0', row: 0, col: 0, type: 'fixed' },
    { id: '0-1', row: 0, col: 1, type: 'sash', openingDirection: 'right' },
    { id: '1-0', row: 1, col: 0, type: 'sash', openingDirection: 'left' },
    { id: '1-1', row: 1, col: 1, type: 'fixed' },
  ],
  colWidths: [900, 900],
  rowHeights: [1050, 1050],
};

const F3_UNIT_SLOTS: ExpectedPieceSlot[] = [
  { pieceId: 'F3.frame.H', role: 'frame_horizontal', countPerUnit: 2, lengthStatus: 'pending_system_evidence' },
  { pieceId: 'F3.frame.V', role: 'frame_vertical', countPerUnit: 2, lengthStatus: 'pending_system_evidence' },
  { pieceId: 'F3.mullion.V', role: 'mullion_vertical', countPerUnit: 1, lengthStatus: 'pending_system_evidence' },
  { pieceId: 'F3.transom.H', role: 'transom_horizontal', countPerUnit: 1, lengthStatus: 'pending_system_evidence' },
  {
    pieceId: 'F3.sash.0-1.H',
    role: 'sash_horizontal',
    sourceCellId: '0-1',
    countPerUnit: 2,
    lengthStatus: 'pending_system_evidence',
  },
  {
    pieceId: 'F3.sash.0-1.V',
    role: 'sash_vertical',
    sourceCellId: '0-1',
    countPerUnit: 2,
    lengthStatus: 'pending_system_evidence',
  },
  {
    pieceId: 'F3.sash.1-0.H',
    role: 'sash_horizontal',
    sourceCellId: '1-0',
    countPerUnit: 2,
    lengthStatus: 'pending_system_evidence',
  },
  {
    pieceId: 'F3.sash.1-0.V',
    role: 'sash_vertical',
    sourceCellId: '1-0',
    countPerUnit: 2,
    lengthStatus: 'pending_system_evidence',
  },
  // One pane per cell (fixed + operable)
  {
    pieceId: 'F3.glass.0-0',
    role: 'glazing_pane',
    sourceCellId: '0-0',
    countPerUnit: 1,
    lengthStatus: 'pending_system_evidence',
  },
  {
    pieceId: 'F3.glass.0-1',
    role: 'glazing_pane',
    sourceCellId: '0-1',
    countPerUnit: 1,
    lengthStatus: 'pending_system_evidence',
  },
  {
    pieceId: 'F3.glass.1-0',
    role: 'glazing_pane',
    sourceCellId: '1-0',
    countPerUnit: 1,
    lengthStatus: 'pending_system_evidence',
  },
  {
    pieceId: 'F3.glass.1-1',
    role: 'glazing_pane',
    sourceCellId: '1-1',
    countPerUnit: 1,
    lengthStatus: 'pending_system_evidence',
  },
  {
    pieceId: 'F3.gasket.0-0',
    role: 'gasket_loop',
    sourceCellId: '0-0',
    countPerUnit: 1,
    lengthStatus: 'pending_system_evidence',
  },
  {
    pieceId: 'F3.gasket.0-1',
    role: 'gasket_loop',
    sourceCellId: '0-1',
    countPerUnit: 1,
    lengthStatus: 'pending_system_evidence',
  },
  {
    pieceId: 'F3.gasket.1-0',
    role: 'gasket_loop',
    sourceCellId: '1-0',
    countPerUnit: 1,
    lengthStatus: 'pending_system_evidence',
  },
  {
    pieceId: 'F3.gasket.1-1',
    role: 'gasket_loop',
    sourceCellId: '1-1',
    countPerUnit: 1,
    lengthStatus: 'pending_system_evidence',
  },
];

export const FP028_F1_FIXTURE: Fp028AcceptanceFixture = {
  id: 'F1',
  description: 'ROCK 60 sliding 1210×1550, 1×2 both sliding',
  systemPackId: 'rock60',
  overallWidthMm: 1210,
  overallHeightMm: 1550,
  quantity: 1,
  grid: F1_GRID,
  identity: {
    ownerId: 'owner-fp028',
    projectId: 'proj-fp028-f1',
    positionId: 'pos-L01',
    source: 'fp028-acceptance',
    revision: 1,
  },
  expectedPieces: scaleSlots(F1_UNIT_SLOTS, 1),
};

export const FP028_F2_FIXTURE: Fp028AcceptanceFixture = {
  id: 'F2',
  description: 'Unequal casement/fixed 1500×1400, widths 900/600',
  systemPackId: 'rock60',
  overallWidthMm: 1500,
  overallHeightMm: 1400,
  quantity: 1,
  grid: F2_GRID,
  identity: {
    ownerId: 'owner-fp028',
    projectId: 'proj-fp028-f2',
    positionId: 'pos-L02',
    source: 'fp028-acceptance',
    revision: 1,
  },
  expectedPieces: scaleSlots(F2_UNIT_SLOTS, 1),
};

export const FP028_F3_FIXTURE: Fp028AcceptanceFixture = {
  id: 'F3',
  description: 'Multi-row 1800×2100, 2×2 mixed, quantity 3',
  systemPackId: 'rock60',
  overallWidthMm: 1800,
  overallHeightMm: 2100,
  quantity: 3,
  grid: F3_GRID,
  identity: {
    ownerId: 'owner-fp028',
    projectId: 'proj-fp028-f3',
    positionId: 'pos-L03',
    source: 'fp028-acceptance',
    revision: 1,
  },
  expectedPieces: scaleSlots(F3_UNIT_SLOTS, 3),
};

export const FP028_ACCEPTANCE_FIXTURES: readonly Fp028AcceptanceFixture[] = [
  FP028_F1_FIXTURE,
  FP028_F2_FIXTURE,
  FP028_F3_FIXTURE,
];

export function countExpectedPiecesByRole(
  fixture: Fp028AcceptanceFixture,
  role: ExpectedPieceRole
): number {
  return fixture.expectedPieces
    .filter((p) => p.role === role)
    .reduce((sum, p) => sum + p.countPerUnit, 0);
}

export function assertFixtureGeometryClosed(fixture: Fp028AcceptanceFixture): {
  widthClosed: boolean;
  heightClosed: boolean;
} {
  const widthSum = (fixture.grid.colWidths ?? []).reduce((a, b) => a + b, 0);
  const heightSum = (fixture.grid.rowHeights ?? []).reduce((a, b) => a + b, 0);
  return {
    widthClosed: widthSum === fixture.overallWidthMm,
    heightClosed: heightSum === fixture.overallHeightMm,
  };
}
