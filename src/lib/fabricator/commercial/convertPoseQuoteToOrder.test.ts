import { beforeEach, describe, expect, it, vi } from 'vitest';
import { convertPoseQuoteToOrder } from './convertPoseQuoteToOrder';

const rpc = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: vi.fn(),
  },
}));

describe('convertPoseQuoteToOrder (UP-16 / #57)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({
      data: [{ order_id: 'order-1', pose_quote_id: 'pose-quote-1', reused: false }],
      error: null,
    });
  });

  it('rejects inconsistent money (double-tax guard) without calling RPC', async () => {
    const result = await convertPoseQuoteToOrder({
      ownerUserId: 'user-1',
      projectId: 'p',
      positionId: 'pos',
      revision: 1,
      quote: { total: 228, currency: 'EGP', subtotal: 100, tax: 14 } as never,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/inconsistent/i);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects when optimizationApproved is explicitly false', async () => {
    const result = await convertPoseQuoteToOrder({
      ownerUserId: 'user-1',
      projectId: 'proj-1',
      positionId: 'pos-1',
      revision: 1,
      quote: { total: 114, currency: 'EGP', subtotal: 100, tax: 14 } as never,
      optimizationApproved: false,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/blocked until optimization/i);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('calls server RPC and returns order id', async () => {
    const result = await convertPoseQuoteToOrder({
      ownerUserId: 'user-1',
      projectId: 'p',
      positionId: 'pos',
      revision: 2,
      quote: { total: 114, currency: 'EGP', subtotal: 100, tax: 14 } as never,
      optimizationApproved: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.orderId).toBe('order-1');
    expect(result.poseQuoteId).toBe('pose-quote-1');
    expect(result.reused).toBe(false);
    expect(rpc).toHaveBeenCalledWith(
      'convert_fabricator_pose_quote_to_order',
      expect.objectContaining({
        p_project_id: 'p',
        p_position_id: 'pos',
        p_revision: 2,
        p_subtotal: 100,
        p_tax_amount: 14,
        p_total_amount: 114,
      }),
    );
  });

  it('maps RPC reuse flag', async () => {
    rpc.mockResolvedValue({
      data: [{ order_id: 'order-existing', pose_quote_id: 'pose-quote-1', reused: true }],
      error: null,
    });
    const result = await convertPoseQuoteToOrder({
      ownerUserId: 'user-1',
      projectId: 'p',
      positionId: 'pos',
      revision: 2,
      quote: { total: 114, currency: 'EGP', subtotal: 100, tax: 14 } as never,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reused).toBe(true);
    expect(result.orderId).toBe('order-existing');
  });

  it('surfaces server fail-closed optimization error', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'optimization not approved on position (durable status required)' },
    });
    const result = await convertPoseQuoteToOrder({
      ownerUserId: 'user-1',
      projectId: 'p',
      positionId: 'pos',
      revision: 1,
      quote: { total: 114, currency: 'EGP', subtotal: 100, tax: 14 } as never,
      optimizationApproved: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/optimization not approved/i);
  });
});
