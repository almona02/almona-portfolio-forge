import { describe, expect, it } from 'vitest';
import { ROCK60_SYSTEM_PACK } from '@/data/systemPacks';
import { resolveSystemPackProfiles } from '../resolveSystemPackProfiles';

describe('FP-028 / resolveSystemPackProfiles', () => {
  it('derives ROCK 60 catalog frame/sash/bead profiles from template codes', () => {
    const profiles = resolveSystemPackProfiles(ROCK60_SYSTEM_PACK);
    expect(profiles.map((p) => p.id)).toEqual(['RC 6111-8', 'RC 6122', 'RC 6166']);
    expect(profiles.find((p) => p.id === 'RC 6111-8')?.profileRole).toBe('frame');
    expect(profiles.find((p) => p.id === 'RC 6122')?.profileRole).toBe('sash');
    expect(profiles.find((p) => p.id === 'RC 6166')?.profileRole).toBe('glazing_bead');
  });

  it('returns empty when pack is null', () => {
    expect(resolveSystemPackProfiles(null)).toEqual([]);
  });
});
