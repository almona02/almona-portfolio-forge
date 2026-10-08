import { describe, expect, it } from 'vitest';
import type { SystemPack, WindowUnit } from '@/types/fabricator';
import { estimateSource } from './estimateSource';

describe('saved estimate sources', () => {
  const pose = { id: 'pose', systemPackId: 'custom', quantity: 2, updatedAt: 'saved', grid: { rows: 1, cols: 1 } } as unknown as WindowUnit;
  const pack = { meta: { id: 'custom' }, profiles: [{ id: 'frame', barLength: 6000, specifications: { sawKerf: 4.2 } }] } as unknown as SystemPack;
  it('survives JSON storage and ignores unrelated packs', () => {
    const receipt = estimateSource([pose], [pack]);
    expect(estimateSource(JSON.parse(JSON.stringify([pose])), [pack, { meta: { id: 'other' } } as SystemPack])).toBe(receipt);
  });
  it('invalidates changed quantities, design, stock and kerf', () => {
    const receipt = estimateSource([pose], [pack]);
    expect(estimateSource([{ ...pose, quantity: 3 }], [pack])).not.toBe(receipt);
    expect(estimateSource([{ ...pose, grid: { ...pose.grid!, cols: 2 } }], [pack])).not.toBe(receipt);
    expect(estimateSource([pose], [{ ...pack, profiles: [{ ...pack.profiles![0], barLength: 6500 }] }])).not.toBe(receipt);
    expect(estimateSource([pose], [{ ...pack, profiles: [{ ...pack.profiles![0], specifications: { sawKerf: 5 } }] }])).not.toBe(receipt);
    expect(estimateSource([pose], [])).not.toBe(receipt);
  });
});
