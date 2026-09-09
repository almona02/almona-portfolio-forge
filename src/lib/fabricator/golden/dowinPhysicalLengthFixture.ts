/**
 * FP-024 golden-parity harness — schema only.
 *
 * Do NOT invent a DoWin exported cut list. External measurements stay
 * PENDING_EXTERNAL_FIXTURE until a licensed dealer supplies a real export.
 *
 * Target later: same elevation + profile system + manufacturing settings →
 * ALMONA physical cut lengths within ±0.1 mm of an exported DoWin cut list.
 */

export const DOWIN_GOLDEN_FIXTURE_STATUS = 'PENDING_EXTERNAL_FIXTURE' as const;

export type DowinGoldenFixtureStatus = typeof DOWIN_GOLDEN_FIXTURE_STATUS;

export type DowinPieceRole = 'frame' | 'sash' | 'mullion' | 'transom' | 'bead' | 'other';

export interface DowinPhysicalLengthGoldenRow {
  pieceId: string;
  profileCode: string;
  role: DowinPieceRole;
  /** Null until a real DoWin export is supplied. */
  expectedLengthMm: number | null;
}

export interface DowinPhysicalLengthGoldenFixture {
  id: string;
  status: DowinGoldenFixtureStatus;
  profileSystem: string;
  elevationNote: string;
  manufacturingProfileId: 'yilmazcad-parity';
  referenceSettings: {
    horizontalBasmaMm: number;
    verticalBasmaMm: number;
    horizontalKaynakMm: number;
    verticalKaynakMm: number;
    sashOffsetMm: number;
    weldingWasteMm: number;
    sawKerfMm: number;
  };
  rows: DowinPhysicalLengthGoldenRow[];
}

/**
 * Dealer-audit reference for the preferred first future fixture.
 * Basma/Kaynak here are settings context, not expected cut lengths.
 */
export const DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION: DowinPhysicalLengthGoldenFixture = {
  id: 'deceuninck-70z-sash',
  status: DOWIN_GOLDEN_FIXTURE_STATUS,
  profileSystem: 'Deceuninck 70 Z sash',
  elevationNote:
    'Awaiting a licensed DoWin exported cut list. Do not claim ±0.1 mm parity.',
  manufacturingProfileId: 'yilmazcad-parity',
  referenceSettings: {
    horizontalBasmaMm: 12,
    verticalBasmaMm: 16,
    horizontalKaynakMm: 6,
    verticalKaynakMm: 6,
    sashOffsetMm: 7,
    weldingWasteMm: 3,
    sawKerfMm: 4,
  },
  rows: [],
};
