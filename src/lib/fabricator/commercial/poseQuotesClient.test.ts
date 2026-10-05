import { beforeEach, describe, expect, it, vi } from 'vitest';
import { upsertPoseQuote } from './poseQuotesClient';

const single = vi.fn();
const from = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => from(...args),
  },
}));

describe('upsertPoseQuote (UP-15)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    single.mockResolvedValue({
      data: { id: 'q1', status: 'priced' },
      error: null,
    });
    from.mockReturnValue({
      upsert: () => ({
        select: () => ({
          single,
        }),
      }),
    });
  });

  it('rejects missing identity', async () => {
    const result = await upsertPoseQuote({
      ownerUserId: '',
      projectId: 'p',
      positionId: 'pos',
      revision: 1,
      status: 'priced',
      quote: { total: 100, currency: 'EGP', subtotal: 87.72, tax: 12.28 },
    });
    expect(result.ok).toBe(false);
  });

  it('upserts priced quote with project/position/revision', async () => {
    const result = await upsertPoseQuote({
      ownerUserId: 'user-1',
      projectId: 'proj-1',
      positionId: 'pose-1',
      revision: 4,
      status: 'priced',
      quote: {
        total: 114,
        currency: 'EGP',
        subtotal: 100,
        tax: 14,
        lineItems: [{ description: 'Frame', quantity: 1, unitPrice: 100, total: 100 }],
      },
      taxRate: 0.14,
      markupPercent: 35,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.id).toBe('q1');
    expect(result.status).toBe('priced');
    expect(from).toHaveBeenCalledWith('fabricator_pose_quotes');
  });
});
