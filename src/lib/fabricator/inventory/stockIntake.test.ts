import { describe, expect, it, vi, beforeEach } from 'vitest';
import { recordStockIntakeThenSync } from './stockIntake';

const insert = vi.fn();
const from = vi.fn();
const syncRpc = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => from(...args),
    rpc: (...args: unknown[]) => syncRpc(...args),
  },
}));

vi.mock('@/lib/inventory/StockCalculator', () => ({
  syncStockFromMovements: vi.fn(async () => 1),
}));

describe('stockIntake (UP-10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insert.mockResolvedValue({ error: null });
    from.mockReturnValue({ insert });
  });

  it('rejects missing user', async () => {
    const result = await recordStockIntakeThenSync('', [
      { profileId: 'p1', quantity: 1, unit: 'meters' },
    ]);
    expect(result.ok).toBe(false);
  });

  it('rejects empty / invalid rows', async () => {
    const result = await recordStockIntakeThenSync('user-1', [
      { profileId: 'p1', quantity: 0, unit: 'meters' },
    ]);
    expect(result.ok).toBe(false);
  });

  it('inserts movements then syncs (no client qty write)', async () => {
    const { syncStockFromMovements } = await import('@/lib/inventory/StockCalculator');
    const result = await recordStockIntakeThenSync('user-1', [
      {
        profileId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        quantity: 6,
        unit: 'meters',
        notes: 'Invoice 1',
        requestId: 'req-abc',
      },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.movementCount).toBe(1);
    expect(insert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'user-1',
        profile_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        movement_type: 'in',
        quantity: 6,
        notes: expect.stringContaining('[idempotency=req-abc]'),
      }),
    ]);
    expect(syncStockFromMovements).toHaveBeenCalledWith('user-1');
  });
});
