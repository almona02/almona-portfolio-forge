import { describe, expect, it, vi } from 'vitest';
import {
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

describe('loadOwnedPhysicalBarLotsWithDeps', () => {
  it('pages until short page and matches count', async () => {
    const pages: StockMovementPageRow[][] = [
      [row({ profile_id: 'p1', bar_count: 2, created_at: '2026-01-01T00:00:00Z' })],
      [row({ profile_id: 'p1', movement_type: 'consume', bar_count: 1, created_at: '2026-01-02T00:00:00Z' })],
    ];
    const fetchPage = vi.fn(async ({ offset, limit }: { offset: number; limit: number }) => {
      const idx = offset / limit;
      return { rows: pages[idx] ?? [], error: null };
    });
    // Force page size 1 so both pages are fetched
    const result = await loadOwnedPhysicalBarLotsWithDeps(
      { userId: 'u1', pageSize: 1 },
      {
        fetchPage,
        fetchCount: async () => ({ count: 2, error: null }),
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.complete).toBe(true);
    expect(result.movementCount).toBe(2);
    expect(result.lots[0]?.availableBars).toBe(1);
    // page0 (full), page1 (full), page2 (empty short page) → stop
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('fails closed when page two (outbound) is missing from a truncated history', async () => {
    const result = await loadOwnedPhysicalBarLotsWithDeps(
      { userId: 'u1', pageSize: 1 },
      {
        fetchPage: async ({ offset }) => {
          if (offset === 0) {
            return {
              rows: [row({ profile_id: 'p1', bar_count: 10, created_at: '2026-01-01T00:00:00Z' })],
              error: null,
            };
          }
          // Simulated server truncation: empty second page while count says 2
          return { rows: [], error: null };
        },
        fetchCount: async () => ({ count: 2, error: null }),
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.complete).toBe(false);
    expect(result.error).toMatch(/Incomplete stock_movements snapshot/);
  });

  it('fails closed on page fetch error (never physical bind)', async () => {
    const result = await loadOwnedPhysicalBarLotsWithDeps(
      { userId: 'u1' },
      {
        fetchPage: async () => ({ rows: [], error: 'boom' }),
        fetchCount: async () => ({ count: 0, error: null }),
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
        fetchPage: async () => ({ rows: [], error: null }),
        fetchCount: async () => ({ count: null, error: 'count failed' }),
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
