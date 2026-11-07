import { describe, expect, it, vi } from 'vitest';
import {
  fingerprintStockVersions,
  loadOwnedPhysicalBarLotsWithDeps,
  PHYSICAL_BAR_MOVEMENT_PAGE_SIZE,
  type StockMovementPageRow,
} from './loadOwnedPhysicalBarLots';

function row(overrides: Partial<StockMovementPageRow> & { profile_id: string }): StockMovementPageRow {
  return {
    movement_type: 'intake',
    bar_count: 1,
    bar_length_m: 6,
    lot_metadata: {},
    unit: 'pieces',
    quantity: 1,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const stableVersions = { p1: 3 };

describe('loadOwnedPhysicalBarLotsWithDeps', () => {
  it('pages until short page and matches count with stable versions', async () => {
    const pages: StockMovementPageRow[][] = [
      [row({ profile_id: 'p1', bar_count: 2, created_at: '2026-01-01T00:00:00Z' })],
      [row({ profile_id: 'p1', movement_type: 'consume', bar_count: 1, created_at: '2026-01-02T00:00:00Z' })],
    ];
    const fetchPage = vi.fn(({ offset, limit }: { offset: number; limit: number }) => {
      const idx = offset / limit;
      return Promise.resolve({ rows: pages[idx] ?? [], error: null });
    });
    const result = await loadOwnedPhysicalBarLotsWithDeps(
      { userId: 'u1', pageSize: 1 },
      {
        fetchPage,
        fetchCount: () => Promise.resolve({ count: 2, error: null }),
        fetchStockVersions: () => Promise.resolve({ versions: stableVersions, error: null }),
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.complete).toBe(true);
    expect(result.movementCount).toBe(2);
    expect(result.lots[0]?.availableBars).toBe(1);
    expect(result.stockVersionFingerprint).toBe(fingerprintStockVersions(stableVersions));
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('fails closed when page two (outbound) is missing from a truncated history', async () => {
    const result = await loadOwnedPhysicalBarLotsWithDeps(
      { userId: 'u1', pageSize: 1 },
      {
        fetchPage: ({ offset }) => {
          if (offset === 0) {
            return Promise.resolve({
              rows: [row({ profile_id: 'p1', bar_count: 10, created_at: '2026-01-01T00:00:00Z' })],
              error: null,
            });
          }
          return Promise.resolve({ rows: [], error: null });
        },
        fetchCount: () => Promise.resolve({ count: 2, error: null }),
        fetchStockVersions: () => Promise.resolve({ versions: stableVersions, error: null }),
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.complete).toBe(false);
    expect(result.error).toMatch(/Incomplete stock_movements snapshot/);
  });

  it('fails closed when stock versions change during paging', async () => {
    let calls = 0;
    const result = await loadOwnedPhysicalBarLotsWithDeps(
      { userId: 'u1', pageSize: 10 },
      {
        fetchPage: () => Promise.resolve({
          rows: [row({ profile_id: 'p1', bar_count: 2 })],
          error: null,
        }),
        fetchCount: () => Promise.resolve({ count: 1, error: null }),
        fetchStockVersions: () => {
          calls += 1;
          return Promise.resolve({
            versions: calls === 1 ? { p1: 1 } : { p1: 2 },
            error: null,
          });
        },
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/Stock versions changed/);
  });

  it('fails closed when movement count grows after collection (append)', async () => {
    let countCalls = 0;
    const result = await loadOwnedPhysicalBarLotsWithDeps(
      { userId: 'u1', pageSize: 10 },
      {
        fetchPage: () => Promise.resolve({
          rows: [row({ profile_id: 'p1', bar_count: 2 })],
          error: null,
        }),
        fetchCount: () => {
          countCalls += 1;
          return Promise.resolve({ count: countCalls === 1 ? 1 : 2, error: null });
        },
        fetchStockVersions: () => Promise.resolve({ versions: stableVersions, error: null }),
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/grew during collection/);
  });

  it('succeeds when versions and count stay unchanged', async () => {
    const result = await loadOwnedPhysicalBarLotsWithDeps(
      { userId: 'u1', pageSize: 10 },
      {
        fetchPage: () => Promise.resolve({
          rows: [row({ profile_id: 'p1', bar_count: 3 })],
          error: null,
        }),
        fetchCount: () => Promise.resolve({ count: 1, error: null }),
        fetchStockVersions: () => Promise.resolve({ versions: { p1: 9 }, error: null }),
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.stockVersionByProfile).toEqual({ p1: 9 });
    expect(result.lots[0]?.availableBars).toBe(3);
  });

  it('fails closed on page fetch error (never physical bind)', async () => {
    const result = await loadOwnedPhysicalBarLotsWithDeps(
      { userId: 'u1' },
      {
        fetchPage: () => Promise.resolve({ rows: [], error: 'boom' }),
        fetchCount: () => Promise.resolve({ count: 0, error: null }),
        fetchStockVersions: () => Promise.resolve({ versions: {}, error: null }),
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('boom');
  });

  it('fails closed when count query fails', async () => {
    const result = await loadOwnedPhysicalBarLotsWithDeps(
      { userId: 'u1' },
      {
        fetchPage: () => Promise.resolve({ rows: [], error: null }),
        fetchCount: () => Promise.resolve({ count: null, error: 'count failed' }),
        fetchStockVersions: () => Promise.resolve({ versions: {}, error: null }),
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('count failed');
  });

  it('uses default page size constant', () => {
    expect(PHYSICAL_BAR_MOVEMENT_PAGE_SIZE).toBe(500);
  });
});
