import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));
vi.mock('./poseQuotesClient', () => ({
  upsertPoseQuote: vi.fn(),
}));

import { convertPoseQuoteToOrder } from './convertPoseQuoteToOrder';

describe('convertPoseQuoteToOrder optimization gate', () => {
  it('rejects convert when optimization is not approved', async () => {
    const result = await convertPoseQuoteToOrder({
      ownerUserId: 'user-1',
      projectId: 'proj-1',
      positionId: 'pos-1',
      revision: 1,
      quote: {
        id: 'q1',
        subtotal: 100,
        tax: 14,
        total: 114,
        currency: 'EGP',
        lineItems: [],
      } as never,
      optimizationApproved: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/optimization/i);
    }
  });
});
