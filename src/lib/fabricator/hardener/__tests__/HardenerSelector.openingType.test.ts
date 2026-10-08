import { describe, expect, it } from 'vitest';
import { HardenerSelector } from '../HardenerSelector';
import type { SystemPack, WindowUnit } from '@/types/fabricator';

describe('HardenerSelector opening type for generic window', () => {
  const selector = new HardenerSelector();
  const pack = { id: 'caluminium-ps', category: 'aluminum', meta: { id: 'caluminium-ps' } } as unknown as SystemPack;

  it('uses sliding for generic window with multi-sash grid', () => {
    const unit = {
      id: 'u1',
      type: 'window',
      overallWidth: 1400,
      overallHeight: 1500,
      systemPackId: 'caluminium-ps',
      grid: {
        rows: 1,
        cols: 2,
        cells: [
          { id: '0-0', row: 0, col: 0, type: 'sash' },
          { id: '0-1', row: 0, col: 1, type: 'sash' },
        ],
      },
      glazing: { thickness: 6 },
    } as unknown as WindowUnit;

    const ctx = selector.extractContext(unit, pack);
    expect(ctx.openingType).toBe('sliding');
  });
});
