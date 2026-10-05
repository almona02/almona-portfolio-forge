import { beforeEach, describe, expect, it, vi } from 'vitest';
import { materializeOwnedProfilesFromPack } from './materializeOwnedProfiles';
import type { SystemPack } from '@/types/fabricator';

const maybeSingle = vi.fn();
const insertSingle = vi.fn();
const updateEq = vi.fn();
const from = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => from(...args),
  },
}));

const pack: SystemPack = {
  meta: { id: 'custom-yilmaz-1', name: 'Yilmaz Custom', brands: ['Yilmaz'], regions: ['turkey'] },
  profiles: [
    {
      id: 'YIL-FRAME-01',
      name: 'Yilmaz Frame',
      material: 'aluminum',
      width: 60,
      height: 60,
      thickness: 1.8,
      color: '#C0C0C0',
      costPerMeter: 0,
      cuttingAllowance: 3,
      stockQuantity: 0,
      minStockLevel: 0,
      systemBrand: 'Yilmaz',
      specifications: { originalCatalogCode: 'YIL-FRAME-01' },
    },
  ],
} as SystemPack;

describe('materializeOwnedProfilesFromPack (UP-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingle.mockResolvedValue({ data: null, error: null });
    insertSingle.mockResolvedValue({
      data: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
      error: null,
    });
    updateEq.mockResolvedValue({ error: null });
    from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle,
          }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: insertSingle,
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: updateEq,
        }),
      }),
    }));
  });

  it('requires user id', async () => {
    const result = await materializeOwnedProfilesFromPack(pack, '');
    expect(result.ok).toBe(false);
  });

  it('inserts owned UUID and rewrites pack profile id', async () => {
    const result = await materializeOwnedProfilesFromPack(pack, 'user-1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.materializedCount).toBe(1);
    expect(result.pack.profiles[0].id).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    expect(result.pack.profiles[0].specifications?.originalCatalogCode).toBe('YIL-FRAME-01');
  });
});
