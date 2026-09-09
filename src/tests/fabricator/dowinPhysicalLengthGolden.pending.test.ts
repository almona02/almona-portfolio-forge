/**
 * FP-024 — DoWin physical-length golden. No invented expected millimetres.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculateKFactor } from '@/lib/fabricator/UPVCCuttingEngine';
import {
  DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION,
  DOWIN_GOLDEN_FIXTURE_STATUS,
  DOWIN_LENGTH_CATEGORIES,
  DOWIN_PARITY_TOLERANCE_MM,
  compareDowinGoldenLengths,
  dowinParityGatePasses,
  isWithinDowinParityTolerance,
  type DowinPhysicalLengthGoldenFixture,
} from '@/lib/fabricator/golden/dowinPhysicalLengthFixture';
import {
  computeDowinParityLengths,
  deceuninck70zParityInput,
  glassSizeMm,
  sashHorizontalCutMm,
  sashInnerOpeningMm,
  sashVerticalCutMm,
} from '@/lib/fabricator/dowinParity/DowinParityLengthEngine';

describe('FP-024 DoWin physical-length golden', () => {
  it('requires all length categories and keeps expected rows empty until a real export', () => {
    expect(DOWIN_LENGTH_CATEGORIES).toEqual([
      'frame_horizontal',
      'frame_vertical',
      'sash_horizontal',
      'sash_vertical',
      'mullion',
      'glass',
      'angle_compensation',
    ]);
    expect(DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.status).toBe(DOWIN_GOLDEN_FIXTURE_STATUS);
    expect(DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.overallWidthMm).toBeNull();
    expect(DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.overallHeightMm).toBeNull();
    expect(DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.rows).toEqual([]);
    expect(DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.rows.every((r) => r.expectedLengthMm == null)).toBe(
      true
    );
  });

  it('compare helper stays PENDING and does not invent a ±0.1 mm pass', () => {
    const compared = compareDowinGoldenLengths(DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION, [
      { pieceId: 'invented', category: 'sash_horizontal', actualLengthMm: 1207 },
    ]);
    expect(compared.status).toBe(DOWIN_GOLDEN_FIXTURE_STATUS);
    expect(compared.allCategoriesRepresented).toBe(false);
    expect(dowinParityGatePasses(compared)).toBe(false);
    for (const category of DOWIN_LENGTH_CATEGORIES) {
      expect(compared.categoryScorecard[category]).toBe('PENDING');
    }
    expect(isWithinDowinParityTolerance(100.0, 100.1)).toBe(true);
    expect(isWithinDowinParityTolerance(100.0, 100.11)).toBe(false);
    expect(DOWIN_PARITY_TOLERANCE_MM).toBe(0.1);
  });

  it('scores the seven length categories independently and refuses a blended pass', () => {
    const pendingFixture: DowinPhysicalLengthGoldenFixture = {
      ...DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION,
      rows: DOWIN_LENGTH_CATEGORIES.map((category) => ({
        pieceId: `pending-${category}`,
        profileCode: 'PENDING',
        category,
        expectedLengthMm: null,
      })),
    };
    const pendingCompared = compareDowinGoldenLengths(
      pendingFixture,
      pendingFixture.rows.map((row) => ({
        pieceId: row.pieceId,
        category: row.category,
        actualLengthMm: 0,
      }))
    );
    expect(pendingCompared.allCategoriesRepresented).toBe(true);
    expect(pendingCompared.status).toBe(DOWIN_GOLDEN_FIXTURE_STATUS);
    expect(dowinParityGatePasses(pendingCompared)).toBe(false);
    expect(pendingCompared.categoryScorecard.frame_horizontal).toBe('PENDING');
    expect(pendingCompared.categoryScorecard.sash_horizontal).toBe('PENDING');
    expect(pendingCompared.categoryScorecard.glass).toBe('PENDING');

    // Synthetic harness only — not a DoWin export. Proves sash PASS cannot hide frame FAIL.
    const readyFixture: DowinPhysicalLengthGoldenFixture = {
      ...DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION,
      status: 'READY',
      rows: [
        { pieceId: 'fh', profileCode: 'F', category: 'frame_horizontal', expectedLengthMm: 1000 },
        { pieceId: 'fv', profileCode: 'F', category: 'frame_vertical', expectedLengthMm: 1400 },
        { pieceId: 'sh', profileCode: 'S', category: 'sash_horizontal', expectedLengthMm: 1207 },
        { pieceId: 'sv', profileCode: 'S', category: 'sash_vertical', expectedLengthMm: 1411 },
        { pieceId: 'm', profileCode: 'M', category: 'mullion', expectedLengthMm: 1300 },
        { pieceId: 'g', profileCode: 'G', category: 'glass', expectedLengthMm: 1181 },
        { pieceId: 'a', profileCode: 'A', category: 'angle_compensation', expectedLengthMm: 0 },
      ],
    };
    const mixed = compareDowinGoldenLengths(readyFixture, [
      { pieceId: 'fh', category: 'frame_horizontal', actualLengthMm: 1000.5 },
      { pieceId: 'fv', category: 'frame_vertical', actualLengthMm: 1400 },
      { pieceId: 'sh', category: 'sash_horizontal', actualLengthMm: 1207 },
      { pieceId: 'sv', category: 'sash_vertical', actualLengthMm: 1411 },
      { pieceId: 'm', category: 'mullion', actualLengthMm: 1300 },
      { pieceId: 'g', category: 'glass', actualLengthMm: 1181 },
      { pieceId: 'a', category: 'angle_compensation', actualLengthMm: 0 },
    ]);
    expect(mixed.status).toBe('COMPARED');
    expect(mixed.categoryScorecard.sash_horizontal).toBe('PASS');
    expect(mixed.categoryScorecard.frame_horizontal).toBe('FAIL');
    expect(dowinParityGatePasses(mixed)).toBe(false);
  });

  it('implements evidenced sash formula without treating the result as a DoWin expected length', () => {
    // ALMONA model of the documented dealer formula — not a DoWin export.
    expect(sashInnerOpeningMm(1200, 7)).toBe(1186);
    expect(
      sashHorizontalCutMm(1200, 7, { horizontalBasmaMm: 12, horizontalKaynakMm: 6 }, 3)
    ).toBe(1207);
    expect(sashVerticalCutMm(1400, 7, { verticalBasmaMm: 16, verticalKaynakMm: 6 }, 3)).toBe(1411);

    expect(glassSizeMm(1186, 2.5, 50).lengthMm).toBe(1181);
    expect(glassSizeMm(40, 2.5, 50).rejected).toBe(true);

    const result = computeDowinParityLengths(deceuninck70zParityInput(1200, 1400));
    const sashH = result.lines.find((l) => l.category === 'sash_horizontal');
    const sashV = result.lines.find((l) => l.category === 'sash_vertical');
    const frameH = result.lines.find((l) => l.category === 'frame_horizontal');
    const mullion = result.lines.find((l) => l.category === 'mullion');
    const glass = result.lines.find((l) => l.category === 'glass');
    const angle = result.lines.find((l) => l.category === 'angle_compensation');
    expect(sashH?.status).toBe('evidenced');
    expect(sashH?.lengthMm).toBe(1207);
    expect(sashV?.lengthMm).toBe(1411);
    expect(glass?.status).toBe('evidenced');
    expect(glass?.lengthMm).toBe(1181);
    expect(angle?.status).toBe('evidenced');
    expect(angle?.lengthMm).toBe(0);
    expect(frameH?.status).toBe('unevidenced');
    expect(frameH?.lengthMm).toBeNull();
    expect(mullion?.status).toBe('unevidenced');
    expect(mullion?.lengthMm).toBeNull();
  });

  it('does not delete calculateKFactor and does not wire parity into UPVCCuttingEngine', () => {
    const k = calculateKFactor({
      profileWidthMm: 70,
      wallThicknessMm: 2.5,
      miterAngleDegrees: 45,
    });
    expect(k).toBeGreaterThan(0);
    const upvc = readFileSync(
      resolve(process.cwd(), 'src/lib/fabricator/UPVCCuttingEngine.ts'),
      'utf8'
    );
    expect(upvc).not.toContain('DowinParityLengthEngine');
    expect(upvc).toContain('calculateKFactor');
  });
});
