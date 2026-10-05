import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadOwnedWorkshopInventory } from './ProfileInventoryAdapter';

const rpc = vi.fn();
const select = vi.fn();
const eq = vi.fn();
const from = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: (...args: unknown[]) => from(...args),
  },
}));

describe('ProfileInventoryAdapter (UP-09)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ data: null, error: null });
    eq.mockResolvedValue({
      data: [
        {
          id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          name: 'Workshop Frame',
          material: 'aluminum',
          width: 60,
          color: '#C0C0C0',
          cost_per_meter: '12.5',
          stock_quantity: '10',
          min_stock_level: '2',
          user_id: 'user-1',
          system_pack_ids: ['rock60'],
        },
        {
          id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
          name: 'Other System',
          material: 'upvc',
          width: 70,
          color: '#fff',
          cost_per_meter: 'bad',
          stock_quantity: null,
          min_stock_level: null,
          user_id: 'user-1',
          system_pack_ids: ['other'],
        },
      ],
      error: null,
    });
    select.mockReturnValue({ eq });
    from.mockReturnValue({ select });
  });

  it('requires authenticated user', async () => {
    const result = await loadOwnedWorkshopInventory({ userId: '' });
    expect(result.ok).toBe(false);
    expect(result.profiles).toEqual([]);
  });

  it('loads owned profiles with finite costs (no NaN)', async () => {
    const result = await loadOwnedWorkshopInventory({ userId: 'user-1' });
    expect(result.ok).toBe(true);
    expect(result.profiles).toHaveLength(2);
    expect(result.profiles.every((p) => Number.isFinite(p.costPerMeter))).toBe(true);
    expect(result.profiles[0].stockQuantity).toBe(10);
    expect(result.profiles[1].costPerMeter).toBe(0);
    expect(result.totalValue).toBe(125);
  });

  it('filters by systemPackId without catalog substitution', async () => {
    const result = await loadOwnedWorkshopInventory({
      userId: 'user-1',
      systemPackId: 'rock60',
    });
    expect(result.ok).toBe(true);
    expect(result.profiles).toHaveLength(1);
    expect(result.profiles[0].name).toBe('Workshop Frame');
  });

  it('returns empty when pack filter matches nothing (no fallback)', async () => {
    const result = await loadOwnedWorkshopInventory({
      userId: 'user-1',
      systemPackId: 'unknown-pack',
    });
    expect(result.ok).toBe(true);
    expect(result.profiles).toEqual([]);
  });
});
