/**
 * FP-028 / P6.2 — ROCK60 golden length fixture remains fail-closed.
 */
import { describe, expect, it } from 'vitest';
import {
  ROCK60_F1_PHYSICAL_LENGTH_FIXTURE,
  rock60GoldenFixtureIsReady,
} from '../rock60PhysicalLengthFixture';

describe('FP-028 / P6.2 — ROCK60 physical length golden scaffold', () => {
  it('binds F1 geometry without inventing cut lengths', () => {
    expect(ROCK60_F1_PHYSICAL_LENGTH_FIXTURE.systemPackId).toBe('rock60');
    expect(ROCK60_F1_PHYSICAL_LENGTH_FIXTURE.overallWidthMm).toBe(1210);
    expect(ROCK60_F1_PHYSICAL_LENGTH_FIXTURE.overallHeightMm).toBe(1550);
    expect(ROCK60_F1_PHYSICAL_LENGTH_FIXTURE.status).toBe('PENDING_EXTERNAL_FIXTURE');
    expect(
      ROCK60_F1_PHYSICAL_LENGTH_FIXTURE.rows.every((r) => r.expectedLengthMm === null)
    ).toBe(true);
  });

  it('is not ready for manufacturing parity until lengths are supplied', () => {
    expect(rock60GoldenFixtureIsReady()).toBe(false);
  });
});
