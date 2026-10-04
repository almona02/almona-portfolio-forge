/**
 * FP-028 / Phase 0 — F1–F3 expected-piece records (no formula invention).
 */
import { describe, expect, it } from 'vitest';
import {
  FP028_ACCEPTANCE_FIXTURES,
  FP028_F1_FIXTURE,
  FP028_F2_FIXTURE,
  FP028_F3_FIXTURE,
  assertFixtureGeometryClosed,
  countExpectedPiecesByRole,
} from '../fp028AcceptanceFixtures';

describe('FP-028 / F1–F3 expected-piece records', () => {
  it('locks F1 geometry, identity, and piece slot counts', () => {
    expect(FP028_F1_FIXTURE.overallWidthMm).toBe(1210);
    expect(FP028_F1_FIXTURE.overallHeightMm).toBe(1550);
    expect(FP028_F1_FIXTURE.systemPackId).toBe('rock60');
    expect(FP028_F1_FIXTURE.grid.rows).toBe(1);
    expect(FP028_F1_FIXTURE.grid.cols).toBe(2);
    expect(FP028_F1_FIXTURE.grid.cells.every((c) => c.type === 'sliding')).toBe(true);
    expect(assertFixtureGeometryClosed(FP028_F1_FIXTURE)).toEqual({
      widthClosed: true,
      heightClosed: true,
    });

    expect(countExpectedPiecesByRole(FP028_F1_FIXTURE, 'frame_horizontal')).toBe(2);
    expect(countExpectedPiecesByRole(FP028_F1_FIXTURE, 'frame_vertical')).toBe(2);
    expect(countExpectedPiecesByRole(FP028_F1_FIXTURE, 'sash_horizontal')).toBe(4);
    expect(countExpectedPiecesByRole(FP028_F1_FIXTURE, 'sash_vertical')).toBe(4);
    expect(countExpectedPiecesByRole(FP028_F1_FIXTURE, 'mullion_vertical')).toBe(1);
    expect(countExpectedPiecesByRole(FP028_F1_FIXTURE, 'glazing_pane')).toBe(2);
    expect(countExpectedPiecesByRole(FP028_F1_FIXTURE, 'gasket_loop')).toBe(2);

    // Side pieces: 4 frame + 8 sash = 12 (matches A8 characterization expectation)
    const sidePieces =
      countExpectedPiecesByRole(FP028_F1_FIXTURE, 'frame_horizontal') +
      countExpectedPiecesByRole(FP028_F1_FIXTURE, 'frame_vertical') +
      countExpectedPiecesByRole(FP028_F1_FIXTURE, 'sash_horizontal') +
      countExpectedPiecesByRole(FP028_F1_FIXTURE, 'sash_vertical');
    expect(sidePieces).toBe(12);

    expect(FP028_F1_FIXTURE.expectedPieces.every((p) => p.lengthStatus === 'pending_system_evidence')).toBe(
      true
    );
    expect(FP028_F1_FIXTURE.identity).toMatchObject({
      ownerId: 'owner-fp028',
      projectId: 'proj-fp028-f1',
      positionId: 'pos-L01',
      source: 'fp028-acceptance',
      revision: 1,
    });
  });

  it('locks F2 unequal widths and casement/fixed piece slots', () => {
    expect(FP028_F2_FIXTURE.grid.colWidths).toEqual([900, 600]);
    expect(assertFixtureGeometryClosed(FP028_F2_FIXTURE)).toEqual({
      widthClosed: true,
      heightClosed: true,
    });
    expect(FP028_F2_FIXTURE.grid.cells.map((c) => c.type)).toEqual(['sash', 'fixed']);
    expect(countExpectedPiecesByRole(FP028_F2_FIXTURE, 'sash_horizontal')).toBe(2);
    expect(countExpectedPiecesByRole(FP028_F2_FIXTURE, 'sash_vertical')).toBe(2);
    expect(countExpectedPiecesByRole(FP028_F2_FIXTURE, 'glazing_pane')).toBe(2);
    expect(
      FP028_F2_FIXTURE.expectedPieces.filter((p) => p.role.startsWith('sash')).every(
        (p) => p.sourceCellId === 'cell-casement'
      )
    ).toBe(true);
  });

  it('locks F3 quantity=3 scaling on piece slot counts', () => {
    expect(FP028_F3_FIXTURE.quantity).toBe(3);
    expect(assertFixtureGeometryClosed(FP028_F3_FIXTURE)).toEqual({
      widthClosed: true,
      heightClosed: true,
    });
    // 4 panes × qty 3
    expect(countExpectedPiecesByRole(FP028_F3_FIXTURE, 'glazing_pane')).toBe(12);
    expect(countExpectedPiecesByRole(FP028_F3_FIXTURE, 'gasket_loop')).toBe(12);
    // 2 operable × 4 sides × qty 3 = 24 sash side pieces
    expect(
      countExpectedPiecesByRole(FP028_F3_FIXTURE, 'sash_horizontal') +
        countExpectedPiecesByRole(FP028_F3_FIXTURE, 'sash_vertical')
    ).toBe(24);
    expect(countExpectedPiecesByRole(FP028_F3_FIXTURE, 'transom_horizontal')).toBe(3);
    expect(countExpectedPiecesByRole(FP028_F3_FIXTURE, 'mullion_vertical')).toBe(3);
  });

  it('registers all three fixtures without inventing cut lengths', () => {
    expect(FP028_ACCEPTANCE_FIXTURES.map((f) => f.id)).toEqual(['F1', 'F2', 'F3']);
    for (const fixture of FP028_ACCEPTANCE_FIXTURES) {
      expect(fixture.expectedPieces.length).toBeGreaterThan(0);
      expect(fixture.expectedPieces.every((p) => p.pieceId.length > 0)).toBe(true);
      expect(fixture.expectedPieces.every((p) => p.lengthStatus === 'pending_system_evidence')).toBe(
        true
      );
      // No lengthMm field invented on slots
      expect(fixture.expectedPieces.every((p) => !('lengthMm' in p))).toBe(true);
    }
  });
});
