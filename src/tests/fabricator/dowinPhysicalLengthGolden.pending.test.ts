/**
 * FP-024 harness — no invented DoWin lengths.
 */
import { describe, expect, it } from 'vitest';
import {
  DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION,
  DOWIN_GOLDEN_FIXTURE_STATUS,
} from '@/lib/fabricator/golden/dowinPhysicalLengthFixture';

describe('FP-024 DoWin physical-length golden (pending)', () => {
  it('marks Deceuninck 70 Z sash as PENDING_EXTERNAL_FIXTURE with empty expected rows', () => {
    expect(DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.status).toBe(DOWIN_GOLDEN_FIXTURE_STATUS);
    expect(DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.referenceSettings.sawKerfMm).toBe(4);
    expect(DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.referenceSettings.sashOffsetMm).toBe(7);
    expect(DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.rows).toHaveLength(0);
  });
});
