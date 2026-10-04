import { describe, expect, it } from 'vitest';
import { buildStarterSystemPack } from '../systemPackBuilder';

describe('buildStarterSystemPack', () => {
  it('creates a pack with engine-ready frame and sash profiles', () => {
    const pack = buildStarterSystemPack('Workshop Alpha');
    expect(pack.meta.name).toBe('Workshop Alpha');
    expect(pack.profiles).toHaveLength(2);
    expect(pack.profiles.map((p) => p.profileRole)).toEqual(['frame', 'sash']);
    expect(pack.profiles.every((p) => p.systemPackIds?.includes(pack.meta.id))).toBe(true);
  });
});
