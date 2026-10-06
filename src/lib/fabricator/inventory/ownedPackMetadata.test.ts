import { describe, expect, it } from 'vitest';
import type { Profile, SystemPack } from '@/types/fabricator';
import { applyOwnedPackMetadata } from './ownedPackMetadata';

describe('owned pack metadata', () => {
  it('restores legacy sash membership by UUID without changing purchased stock', () => {
    const profiles = [{ id: 'sash-uuid', name: 'Sash', stockQuantity: 18 }] as Profile[];
    const packs = [{ meta: { id: 'custom' }, profiles: [{ id: 'sash-uuid', profileRole: 'sash', stockQuantity: 0 }] }] as SystemPack[];
    expect(applyOwnedPackMetadata(profiles, packs)[0]).toMatchObject({
      profileRole: 'sash', systemPackIds: ['custom'], stockQuantity: 18,
    });
  });
  it('does not match same-name profiles from another pack or infer a conflicting role', () => {
    const profiles = [{ id: 'sash-uuid', name: 'Sash', stockQuantity: 18 }] as Profile[];
    const packs = [
      { meta: { id: 'other' }, profiles: [{ id: 'different', name: 'Sash', profileRole: 'frame' }] },
      { meta: { id: 'a' }, profiles: [{ id: 'sash-uuid', profileRole: 'frame' }] },
      { meta: { id: 'b' }, profiles: [{ id: 'sash-uuid', profileRole: 'sash' }] },
    ] as SystemPack[];
    expect(applyOwnedPackMetadata(profiles, packs)[0]).toMatchObject({
      profileRole: undefined, systemPackIds: ['a', 'b'], stockQuantity: 18,
    });
  });
});
