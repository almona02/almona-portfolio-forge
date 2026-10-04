/**
 * FP-028 / P6.2 — ROCK 60 physical-length golden fixture scaffold.
 *
 * Fail closed: expectedLengthMm stays null until an approved external golden
 * job is supplied. Do not invent cut lengths, deductions, or stock.
 */

import { FP028_F1_FIXTURE } from '@/lib/fabricator/manufacturing/fp028AcceptanceFixtures';

export const ROCK60_GOLDEN_FIXTURE_STATUS = 'PENDING_EXTERNAL_FIXTURE' as const;

export type Rock60GoldenFixtureStatus = 'PENDING_EXTERNAL_FIXTURE' | 'READY';

export const ROCK60_PARITY_TOLERANCE_MM = 0.1;

export interface Rock60PhysicalLengthGoldenRow {
  readonly pieceId: string;
  readonly role: string;
  /** Null until an approved golden job supplies lengths. */
  readonly expectedLengthMm: number | null;
}

export interface Rock60PhysicalLengthGoldenFixture {
  readonly id: string;
  readonly status: Rock60GoldenFixtureStatus;
  readonly systemPackId: 'rock60';
  readonly overallWidthMm: number;
  readonly overallHeightMm: number;
  readonly rows: readonly Rock60PhysicalLengthGoldenRow[];
}

/**
 * F1 scaffold bound to acceptance fixture geometry only.
 * Lengths intentionally null — manufacturing parity cannot pass yet.
 */
export const ROCK60_F1_PHYSICAL_LENGTH_FIXTURE: Rock60PhysicalLengthGoldenFixture = {
  id: 'rock60-f1-physical-length',
  status: ROCK60_GOLDEN_FIXTURE_STATUS,
  systemPackId: 'rock60',
  overallWidthMm: FP028_F1_FIXTURE.overallWidthMm,
  overallHeightMm: FP028_F1_FIXTURE.overallHeightMm,
  rows: FP028_F1_FIXTURE.expectedPieces.map((slot) => ({
    pieceId: slot.pieceId,
    role: slot.role,
    expectedLengthMm: null,
  })),
};

export function rock60GoldenFixtureIsReady(
  fixture: Rock60PhysicalLengthGoldenFixture = ROCK60_F1_PHYSICAL_LENGTH_FIXTURE
): boolean {
  return (
    fixture.status === 'READY' &&
    fixture.rows.length > 0 &&
    fixture.rows.every((row) => typeof row.expectedLengthMm === 'number')
  );
}
