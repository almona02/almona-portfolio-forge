import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  hashIntakePayload,
  recordAtomicStockIntake,
  recordStockIntakeThenSync,
  serializeIntakePayload,
} from './stockIntake';

const rpc = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
  },
}));

describe('stockIntake (PR1 atomic RPC)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({
      data: {
        request_id: '11111111-1111-4111-8111-111111111111',
        payload_hash: 'abc',
        replay: false,
        movement_ids: ['m1'],
        balances: [
          {
            profile_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            stock_quantity: 60,
            stock_version: 2,
            canonical_metres_added: 60,
          },
        ],
        movement_count: 1,
      },
      error: null,
    });
  });

  it('rejects empty / invalid rows', async () => {
    const result = await recordAtomicStockIntake({
      requestId: '11111111-1111-4111-8111-111111111111',
      lines: [{ profileId: 'p1', quantity: 0, inputUnit: 'meters' }],
    });
    expect(result.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects pieces without bar length', async () => {
    const result = await recordAtomicStockIntake({
      requestId: '11111111-1111-4111-8111-111111111111',
      lines: [{ profileId: 'p1', quantity: 10, inputUnit: 'pieces' }],
    });
    expect(result.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('calls record_stock_intake with metres for bar lots via legacy helper', async () => {
    const result = await recordStockIntakeThenSync(
      'user-1',
      [
        {
          profileId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          quantity: 10,
          unit: 'pieces',
          barLengthM: 6,
          notes: 'Invoice 1',
          requestId: '11111111-1111-4111-8111-111111111111',
        },
      ],
      { requestId: '11111111-1111-4111-8111-111111111111' },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.movementCount).toBe(1);
    expect(result.receipt.balances[0].stock_quantity).toBe(60);
    expect(rpc).toHaveBeenCalledWith(
      'record_stock_intake',
      expect.objectContaining({
        p_request_id: '11111111-1111-4111-8111-111111111111',
        p_lines: [
          expect.objectContaining({
            profile_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            input_unit: 'pieces',
            quantity: 10,
            bar_length_m: 6,
          }),
        ],
      }),
    );
  });

  it('surfaces RPC errors instead of fabricating success', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Forbidden' } });
    const result = await recordAtomicStockIntake({
      requestId: '11111111-1111-4111-8111-111111111111',
      lines: [{ profileId: 'p1', quantity: 6, inputUnit: 'meters' }],
    });
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ error: expect.stringContaining('Forbidden') });
  });

  it('rejects invalid receipts', async () => {
    rpc.mockResolvedValue({ data: { ok: true }, error: null });
    const result = await recordAtomicStockIntake({
      requestId: '11111111-1111-4111-8111-111111111111',
      lines: [{ profileId: 'p1', quantity: 6, inputUnit: 'meters' }],
    });
    expect(result.ok).toBe(false);
  });

  it('hashes payloads stably for identical lines', async () => {
    const lines = [
      { profileId: 'p1', quantity: 10, inputUnit: 'pieces' as const, barLengthM: 6 },
    ];
    const a = await hashIntakePayload(lines);
    const b = await hashIntakePayload(lines);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(serializeIntakePayload(lines)).toContain('"input_unit":"pieces"');
  });
});
