import { beforeEach, describe, expect, it, vi } from 'vitest';

const terminal = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  single: vi.fn(),
  insertedRow: null as Record<string, unknown> | null,
}));

vi.mock('@/lib/supabase', () => {
  const builder: Record<string, any> = {};
  builder.select = vi.fn(() => builder);
  builder.insert = vi.fn((row: Record<string, unknown>) => {
    terminal.insertedRow = row;
    return builder;
  });
  builder.eq = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.limit = vi.fn(() => builder);
  builder.maybeSingle = terminal.maybeSingle;
  builder.single = terminal.single;
  return { supabase: { from: vi.fn(() => builder), rpc: vi.fn() } };
});

import {
  buildReleaseIdempotencyKey,
  fingerprintBom,
  fingerprintOptimization,
  fingerprintStock,
  freezePositionRelease,
} from './positionRelease';

const identity = {
  ownerUserId: 'user-1',
  projectId: 'project-1',
  positionId: 'position-1',
  source: 'v2' as const,
  revision: 3,
};

const stockReservation = {
  availabilityOk: true,
  profileIds: ['p1'],
  metersByProfile: { p1: 100 },
  reservedAt: '2026-09-26T00:00:00.000Z',
  identity,
} as never;

const bom = {
  profiles: [
    { id: 'p1', profileCode: 'ORTA', length: 6000, quantity: 2, cuttingLengths: [1000, 2000], angles: [] },
  ],
  hardware: [],
  glazing: [],
  qualification: null,
} as never;

const optimizationResult = {
  cuttingPlan: [
    { stockLength: 6000, profile: { id: 'p1' }, cuts: [{ cutId: 'c1', length: 1000, angle: 45 }] },
  ],
  wastePercentage: 10,
  materialUsage: 90,
} as never;

const releasedRow = {
  id: 'rel-1',
  project_id: 'project-1',
  position_id: 'position-1',
  position_source: 'v2',
  revision: 3,
  bom_fingerprint: fingerprintBom(bom),
  stock_fingerprint: fingerprintStock(stockReservation),
  optimization_fingerprint: fingerprintOptimization(optimizationResult),
  released_at: '2026-09-26T00:00:00Z',
};

const input = { identity, bom, stockReservation, optimizationResult };

describe('position release idempotency', () => {
  beforeEach(() => {
    terminal.maybeSingle.mockReset();
    terminal.single.mockReset();
    terminal.insertedRow = null;
  });

  it('builds a deterministic idempotency key for the same release', () => {
    expect(buildReleaseIdempotencyKey(identity)).toBe(buildReleaseIdempotencyKey({ ...identity }));
    expect(buildReleaseIdempotencyKey(identity)).toContain('position-1');
  });

  it('returns the existing row on sequential replay without inserting', async () => {
    terminal.maybeSingle.mockResolvedValueOnce({ data: releasedRow, error: null });

    await expect(freezePositionRelease(input)).resolves.toMatchObject({
      releaseId: 'rel-1',
      revision: 3,
    });
    expect(terminal.single).not.toHaveBeenCalled();
  });

  it('returns the winning row when a concurrent duplicate insert is rejected', async () => {
    terminal.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null }) // initial check: no row yet
      .mockResolvedValueOnce({ data: releasedRow, error: null }); // re-fetch after the race
    terminal.single.mockResolvedValueOnce({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    });

    await expect(freezePositionRelease(input)).resolves.toMatchObject({
      releaseId: 'rel-1',
      revision: 3,
    });
  });

  it('writes the idempotency key on a fresh insert', async () => {
    terminal.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    terminal.single.mockResolvedValueOnce({ data: releasedRow, error: null });

    await freezePositionRelease(input);
    expect(terminal.insertedRow?.idempotency_key).toBe(buildReleaseIdempotencyKey(identity));
  });

  it('rejects an existing release with mismatched fingerprints', async () => {
    terminal.maybeSingle.mockResolvedValueOnce({
      data: { ...releasedRow, bom_fingerprint: 'different' },
      error: null,
    });

    await expect(freezePositionRelease(input)).rejects.toThrow(/different fingerprints/);
  });
});
