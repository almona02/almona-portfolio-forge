import { describe, expect, it } from 'vitest';
import { CALUMINIUM_PS_PACK } from '@/data/profileSystems/egyptian/caluminium/ps';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { WindowUnit } from '@/types/fabricator';
import { PresetAwareBOMGenerator } from '../PresetAwareBOMGenerator';
import { resolveExpectedDesignLedger } from './ledgerParity';

const pattern = {
  id: 'sliding-2s', name: 'Sliding 2', type: 'sliding', openingMechanism: { type: 'sliding' },
  gridSpec: { rows: 1, cols: 2, colWidths: [1, 1], rowHeights: [1],
    cells: [{ id: '0-0', row: 0, col: 0, type: 'sash' }, { id: '0-1', row: 0, col: 1, type: 'sash' }] },
} as unknown as EgyptianPattern;

describe('BOM cache binds cut members, not component counts', () => {
  it('reuses reordered equivalent members but recalculates a same-count length substitution', async () => {
    const unit = { id: 'cache-pose', overallWidth: 1200, overallHeight: 1400,
      type: 'sliding_window_2sash', systemPackId: 'caluminium-ps', presetId: 'sliding-2s',
      grid: pattern.gridSpec, components: [], hardware: [], glazing: { type: 'double', thickness: 24 },
    } as unknown as WindowUnit;
    unit.components = await resolveExpectedDesignLedger(unit, pattern, CALUMINIUM_PS_PACK);
    const generator = new PresetAwareBOMGenerator();
    const first = await generator.generateCompleteBOM(unit, pattern, CALUMINIUM_PS_PACK);
    const reordered = await generator.generateCompleteBOM({ ...unit, components: [...unit.components].reverse() }, pattern, CALUMINIUM_PS_PACK);
    expect(reordered).toBe(first);
    const changed = { ...unit, components: unit.components.map((component, index) => index === 0
      ? { ...component, cuttingLengths: component.cuttingLengths.map((length, cut) => cut === 0 ? length + 17 : length) }
      : component) };
    const next = await generator.generateCompleteBOM(changed, pattern, CALUMINIUM_PS_PACK);
    expect(next).not.toBe(first);
    expect(next.profiles).not.toEqual(first.profiles);
  });
});
