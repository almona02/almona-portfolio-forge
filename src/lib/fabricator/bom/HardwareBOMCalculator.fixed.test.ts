import { expect, it } from 'vitest';
import type { SystemPack, WindowUnit } from '@/types/fabricator';
import { resolveEstimatePattern } from './resolveEstimatePattern';
import { HardwareBOMCalculator } from './HardwareBOMCalculator';

it('does not invent operating handles or locks for a manually drawn fixed opening', async () => {
  const position = { id: 'fixed-test', type: 'window', overallWidth: 1200, overallHeight: 1400,
    grid: { rows: 1, cols: 2, cells: [
      { id: 'a', row: 0, col: 0, type: 'fixed' },
      { id: 'b', row: 0, col: 1, type: 'fixed' },
    ] },
  } as WindowUnit;
  const result = await new HardwareBOMCalculator().calculateHardwareBOM(position, resolveEstimatePattern(position), {} as SystemPack);
  expect(result).toEqual([]);
});
