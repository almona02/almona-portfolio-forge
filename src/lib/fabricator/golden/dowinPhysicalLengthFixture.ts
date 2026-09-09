/**
 * FP-024 — DoWin physical-length golden fixture schema.
 *
 * Do NOT invent exported DoWin cut lengths. expectedLengthMm stays null
 * until a licensed dealer supplies a real export for the same elevation,
 * system, and manufacturing settings.
 *
 * Acceptance (when status is READY):
 *   ALMONA actualLengthMm within ±0.1 mm of expectedLengthMm, per physical piece,
 *   scored separately for each DowinLengthCategory.
 */

export const DOWIN_GOLDEN_FIXTURE_STATUS = 'PENDING_EXTERNAL_FIXTURE' as const;

export type DowinGoldenFixtureStatus = 'PENDING_EXTERNAL_FIXTURE' | 'READY';

export const DOWIN_PARITY_TOLERANCE_MM = 0.1;

export type DowinLengthCategory =
  | 'frame_horizontal'
  | 'frame_vertical'
  | 'sash_horizontal'
  | 'sash_vertical'
  | 'mullion'
  | 'glass'
  | 'angle_compensation';

export const DOWIN_LENGTH_CATEGORIES: readonly DowinLengthCategory[] = [
  'frame_horizontal',
  'frame_vertical',
  'sash_horizontal',
  'sash_vertical',
  'mullion',
  'glass',
  'angle_compensation',
] as const;

export interface DowinPhysicalLengthGoldenRow {
  pieceId: string;
  profileCode: string;
  category: DowinLengthCategory;
  /** Null until a real DoWin export is supplied. */
  expectedLengthMm: number | null;
}

export interface DowinProfileOverlap {
  horizontalBasmaMm: number;
  verticalBasmaMm: number;
  horizontalKaynakMm: number;
  verticalKaynakMm: number;
}

export interface DowinPhysicalLengthGoldenFixture {
  id: string;
  status: DowinGoldenFixtureStatus;
  profileSystem: string;
  elevationNote: string;
  /** Unknown until the exported job is supplied. */
  overallWidthMm: number | null;
  overallHeightMm: number | null;
  manufacturingProfileId: 'yilmazcad-parity';
  referenceSettings: DowinProfileOverlap & {
    sashOffsetMm: number;
    weldingWasteMm: number;
    sawKerfMm: number;
    glazingClearanceMm: number;
    pvcMullionOffsetMm: number;
    minGlassProductionSizeMm: number;
  };
  rows: DowinPhysicalLengthGoldenRow[];
}

export function isWithinDowinParityTolerance(
  actualMm: number,
  expectedMm: number,
  toleranceMm: number = DOWIN_PARITY_TOLERANCE_MM
): boolean {
  return Math.abs(actualMm - expectedMm) <= toleranceMm;
}

export type DowinGoldenCompareStatus = 'PENDING_EXTERNAL_FIXTURE' | 'COMPARED';

export type DowinCategoryGate = 'PENDING' | 'PASS' | 'FAIL';

export interface DowinGoldenCategoryResult {
  category: DowinLengthCategory;
  pieceId: string;
  expectedLengthMm: number | null;
  actualLengthMm: number | null;
  deltaMm: number | null;
  withinTolerance: boolean | null;
}

export interface DowinGoldenCompareResult {
  status: DowinGoldenCompareStatus;
  allCategoriesRepresented: boolean;
  /** Scored independently. A sash pass must not hide a frame fail. */
  categoryScorecard: Record<DowinLengthCategory, DowinCategoryGate>;
  results: DowinGoldenCategoryResult[];
}

export function scoreDowinCategories(
  results: DowinGoldenCategoryResult[]
): Record<DowinLengthCategory, DowinCategoryGate> {
  const card = {} as Record<DowinLengthCategory, DowinCategoryGate>;
  for (const category of DOWIN_LENGTH_CATEGORIES) {
    const rows = results.filter((row) => row.category === category);
    if (rows.length === 0 || rows.some((row) => row.withinTolerance == null)) {
      card[category] = 'PENDING';
    } else if (rows.every((row) => row.withinTolerance === true)) {
      card[category] = 'PASS';
    } else {
      card[category] = 'FAIL';
    }
  }
  return card;
}

/** Gate pass requires COMPARED, every category represented, and every category PASS. */
export function dowinParityGatePasses(compared: DowinGoldenCompareResult): boolean {
  if (compared.status !== 'COMPARED' || !compared.allCategoriesRepresented) {
    return false;
  }
  return DOWIN_LENGTH_CATEGORIES.every((c) => compared.categoryScorecard[c] === 'PASS');
}

/**
 * Compare ALMONA actuals to a fixture. If any expected length is null,
 * returns PENDING_EXTERNAL_FIXTURE and does not invent a pass.
 */
export function compareDowinGoldenLengths(
  fixture: DowinPhysicalLengthGoldenFixture,
  actuals: Array<{ pieceId: string; category: DowinLengthCategory; actualLengthMm: number }>
): DowinGoldenCompareResult {
  const represented = new Set(fixture.rows.map((row) => row.category));
  const allCategoriesRepresented = DOWIN_LENGTH_CATEGORIES.every((c) => represented.has(c));

  const results: DowinGoldenCategoryResult[] = fixture.rows.map((row) => {
    const actual = actuals.find((a) => a.pieceId === row.pieceId);
    const actualLengthMm = actual?.actualLengthMm ?? null;
    if (row.expectedLengthMm == null || actualLengthMm == null) {
      return {
        category: row.category,
        pieceId: row.pieceId,
        expectedLengthMm: row.expectedLengthMm,
        actualLengthMm,
        deltaMm: null,
        withinTolerance: null,
      };
    }
    const deltaMm = actualLengthMm - row.expectedLengthMm;
    return {
      category: row.category,
      pieceId: row.pieceId,
      expectedLengthMm: row.expectedLengthMm,
      actualLengthMm,
      deltaMm,
      withinTolerance: isWithinDowinParityTolerance(actualLengthMm, row.expectedLengthMm),
    };
  });

  const pending =
    fixture.status === DOWIN_GOLDEN_FIXTURE_STATUS ||
    fixture.rows.length === 0 ||
    results.some((r) => r.expectedLengthMm == null);

  return {
    status: pending ? DOWIN_GOLDEN_FIXTURE_STATUS : 'COMPARED',
    allCategoriesRepresented,
    categoryScorecard: scoreDowinCategories(results),
    results,
  };
}

/**
 * Dealer-audit reference for the preferred first future fixture.
 * Basma/Kaynak are settings context, not expected cut lengths.
 * Elevation and expected rows stay empty until a real DoWin export exists.
 */
export const DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION: DowinPhysicalLengthGoldenFixture = {
  id: 'deceuninck-70z-sash',
  status: DOWIN_GOLDEN_FIXTURE_STATUS,
  profileSystem: 'Deceuninck 70 Z sash',
  elevationNote:
    'Awaiting a licensed DoWin exported cut list. Do not claim ±0.1 mm parity.',
  overallWidthMm: null,
  overallHeightMm: null,
  manufacturingProfileId: 'yilmazcad-parity',
  referenceSettings: {
    horizontalBasmaMm: 12,
    verticalBasmaMm: 16,
    horizontalKaynakMm: 6,
    verticalKaynakMm: 6,
    sashOffsetMm: 7,
    weldingWasteMm: 3,
    sawKerfMm: 4,
    glazingClearanceMm: 2.5,
    pvcMullionOffsetMm: 0,
    minGlassProductionSizeMm: 50,
  },
  rows: [],
};
