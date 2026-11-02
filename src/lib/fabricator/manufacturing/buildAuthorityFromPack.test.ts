import { describe, expect, it } from 'vitest';
import { buildAuthorityPayloadFromPack } from './buildAuthorityFromPack';
import type { SystemPack } from '@/types/fabricator';

const pack = {
  meta: { id: 'rock60', name: 'Rock 60' },
  windowSystemSpec: {},
  profiles: [
    { id: 'R60-FRAME', type: 'frame', specifications: { profileRole: 'frame' }, barLength: 6000 },
    { id: 'R60-SASH', type: 'sash', specifications: { profileRole: 'sash' }, barLength: 6000 },
  ],
} as unknown as SystemPack;

describe('buildAuthorityPayloadFromPack', () => {
  it('builds authority from live pack profiles', () => {
    const result = buildAuthorityPayloadFromPack(pack, 'a1000000-0000-4000-8000-000000000001', 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.systemPack).toMatchObject({ id: 'rock60', revision: 1 });
    expect((result.payload.profiles as unknown[]).length).toBe(2);
    expect(result.payload.manufacturingSettings).toMatchObject({
      sawKerfMm: expect.any(Number),
      trimCutMm: expect.any(Number),
    });
  });

  it('fails closed without frame+sash', () => {
    const broken = {
      ...pack,
      profiles: [{ id: 'R60-FRAME', type: 'frame', specifications: { profileRole: 'frame' } }],
    } as unknown as SystemPack;
    const result = buildAuthorityPayloadFromPack(broken, 'a1000000-0000-4000-8000-000000000001', 1);
    expect(result.ok).toBe(false);
  });
});
