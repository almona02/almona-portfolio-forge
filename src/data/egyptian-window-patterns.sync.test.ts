import { describe, expect, it } from 'vitest';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import {
  getPatternsForSystem,
  resolvePatternSystemIds,
  SYSTEM_PACK_PATTERN_DONORS,
} from '@/data/egyptian-window-patterns';

describe('pattern sync across similar system packs', () => {
  it('resolves caluminium-ps to PS aliases and sliding peers', () => {
    const ids = resolvePatternSystemIds('caluminium-ps');
    expect(ids).toContain('caluminium-ps');
    expect(ids).toContain('ps-9600');
    expect(ids).toContain('jumbo100');
  });

  it('gives formerly empty packs a usable pattern catalog', () => {
    const emptyBefore = Object.keys(SYSTEM_PACK_PATTERN_DONORS).filter((id) =>
      SYSTEM_PACKS.some((p) => p.meta.id === id),
    );
    expect(emptyBefore.length).toBeGreaterThan(0);
    for (const id of emptyBefore) {
      const patterns = getPatternsForSystem(id);
      expect(patterns.length, `${id} should sync patterns from donors`).toBeGreaterThan(0);
      expect(patterns.some((p) => p.gridSpec.cols >= 1 && p.gridSpec.rows >= 1)).toBe(true);
    }
  });

  it('keeps rock60 / panda-50 direct matches intact', () => {
    expect(getPatternsForSystem('rock60').length).toBeGreaterThanOrEqual(10);
    expect(getPatternsForSystem('panda-50').length).toBeGreaterThanOrEqual(10);
  });

  it('exposes sliding-2s to caluminium-ps via donors', () => {
    const ids = getPatternsForSystem('caluminium-ps').map((p) => p.id);
    expect(ids).toContain('sliding-2s');
  });
});
