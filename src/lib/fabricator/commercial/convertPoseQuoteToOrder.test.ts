import { beforeEach, describe, expect, it, vi } from 'vitest';
import { convertPoseQuoteToOrder } from './convertPoseQuoteToOrder';

const maybeSingle = vi.fn();
const insertSingle = vi.fn();
const upsertSingle = vi.fn();
const from = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => from(...args),
  },
}));

describe('convertPoseQuoteToOrder (UP-16)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertSingle.mockResolvedValue({ data: { id: 'pose-quote-1', status: 'accepted' }, error: null });
    maybeSingle.mockResolvedValue({ data: null, error: null });
    insertSingle.mockResolvedValue({ data: { id: 'order-1' }, error: null });

    from.mockImplementation((table: string) => {
      if (table === 'fabricator_pose_quotes') {
        return {
          upsert: () => ({
            select: () => ({
              single: upsertSingle,
            }),
          }),
        };
      }
      return {
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
      };
    });
  });

  it('rejects inconsistent money (double-tax guard)', async () => {
    const result = await convertPoseQuoteToOrder({
      ownerUserId: 'user-1',
      projectId: 'p',
      positionId: 'pos',
      revision: 1,
      quote: { total: 228, currency: 'EGP', subtotal: 100, tax: 14 },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/inconsistent/i);
  });

  it('creates order once with pose quote link', async () => {
    const result = await convertPoseQuoteToOrder({
      ownerUserId: 'user-1',
      projectId: 'p',
      positionId: 'pos',
      revision: 2,
      quote: { total: 114, currency: 'EGP', subtotal: 100, tax: 14 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.orderId).toBe('order-1');
    expect(result.poseQuoteId).toBe('pose-quote-1');
    expect(result.reused).toBe(false);
  });

  it('reuses existing order for same pose quote', async () => {
    maybeSingle.mockResolvedValue({ data: { id: 'order-existing' }, error: null });
    const result = await convertPoseQuoteToOrder({
      ownerUserId: 'user-1',
      projectId: 'p',
      positionId: 'pos',
      revision: 2,
      quote: { total: 114, currency: 'EGP', subtotal: 100, tax: 14 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.orderId).toBe('order-existing');
    expect(result.reused).toBe(true);
    expect(insertSingle).not.toHaveBeenCalled();
  });
});
