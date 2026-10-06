import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPendingStockIntake,
  readPendingStockIntake,
  resolveIntakeRequestId,
  writePendingStockIntake,
} from './stockIntakeRequest';

describe('stockIntakeRequest persistence', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    });
  });

  it('reuses request id when draft and hash match', () => {
    writePendingStockIntake('user-a', {
      requestId: '11111111-1111-4111-8111-111111111111',
      payloadHash: 'hash1',
      draftKey: 'invoice:p1',
      createdAt: '2026-10-06T00:00:00.000Z',
    });
    const id = resolveIntakeRequestId({
      userId: 'user-a',
      draftKey: 'invoice:p1',
      payloadHash: 'hash1',
    });
    expect(id).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('issues a new request id when payload hash changes', () => {
    writePendingStockIntake('user-a', {
      requestId: '11111111-1111-4111-8111-111111111111',
      payloadHash: 'hash1',
      draftKey: 'invoice:p1',
      createdAt: '2026-10-06T00:00:00.000Z',
    });
    const id = resolveIntakeRequestId({
      userId: 'user-a',
      draftKey: 'invoice:p1',
      payloadHash: 'hash2',
    });
    expect(id).not.toBe('11111111-1111-4111-8111-111111111111');
    expect(readPendingStockIntake('user-a')?.payloadHash).toBe('hash2');
  });

  it('clears pending identity after verified receipt', () => {
    writePendingStockIntake('user-a', {
      requestId: '11111111-1111-4111-8111-111111111111',
      payloadHash: 'hash1',
      draftKey: 'csv',
      createdAt: '2026-10-06T00:00:00.000Z',
    });
    clearPendingStockIntake('user-a');
    expect(readPendingStockIntake('user-a')).toBeNull();
  });
});
