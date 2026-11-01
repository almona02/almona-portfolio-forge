/**
 * Load net physical bar lots (profile × length) from stock_movements.
 *
 * Completeness contract:
 * - Pages until a short page or explicit count match.
 * - Any page error / partial history → ok:false (never physical bind).
 * - stockVersionFingerprint ties acknowledgement to the owned-profile versions used.
 */

import { supabase } from '@/lib/supabase';
import {
  netPhysicalBarsFromMovements,
  type OwnedBarLot,
  type PhysicalBarMovement,
} from './physicalOwnedBars';
import { isTestStockProfile } from './testStock';
import type { Profile } from '@/types/fabricator';

export const PHYSICAL_BAR_MOVEMENT_PAGE_SIZE = 500;

export type LoadOwnedPhysicalBarLotsResult =
  | {
      ok: true;
      lots: OwnedBarLot[];
      invalidatedProfileIds: string[];
      reasons: string[];
      complete: true;
      movementCount: number;
      stockVersionFingerprint: string;
    }
  | {
      ok: false;
      error: string;
      lots: OwnedBarLot[];
      invalidatedProfileIds: string[];
      reasons: string[];
      complete: false;
      movementCount: number;
      stockVersionFingerprint: string;
    };

export interface StockMovementPageRow {
  profile_id: string;
  movement_type: string;
  bar_count: number | string | null;
  bar_length_m: number | string | null;
  lot_metadata: Record<string, unknown> | null;
  unit: string | null;
  quantity: number | string | null;
  created_at: string | null;
}

export interface LoadOwnedPhysicalBarLotsDeps {
  /** Fetch one page [offset, offset+limit). Must return exact rows for that window. */
  fetchPage: (args: {
    userId: string;
    offset: number;
    limit: number;
  }) => Promise<{ rows: StockMovementPageRow[]; error: string | null }>;
  /** Optional total count for completeness check. */
  fetchCount?: (userId: string) => Promise<{ count: number | null; error: string | null }>;
}

function stockVersionFingerprint(profiles: readonly Profile[]): string {
  const parts = profiles
    .map((p) => `${p.id}:${typeof p.stockVersion === 'number' ? p.stockVersion : 0}`)
    .sort();
  return parts.join('|');
}

function mapRow(
  row: StockMovementPageRow,
  testIds: Set<string>,
): PhysicalBarMovement {
  const profileId = String(row.profile_id);
  const lotMeta = (row.lot_metadata || {}) as Record<string, unknown>;
  const lotId = typeof lotMeta.lot_id === 'string'
    ? lotMeta.lot_id
    : typeof lotMeta.lotId === 'string'
      ? lotMeta.lotId
      : null;
  const status = typeof lotMeta.status === 'string' ? lotMeta.status : null;
  let barCount = row.bar_count == null ? null : Number(row.bar_count);
  let barLengthM = row.bar_length_m == null ? null : Number(row.bar_length_m);
  const unit = String(row.unit || '').toLowerCase();
  if (
    barCount == null
    && (unit === 'pieces' || unit === 'bars')
    && row.quantity != null
    && barLengthM != null
  ) {
    barCount = Number(row.quantity);
  }
  return {
    profileId,
    movementType: String(row.movement_type || ''),
    barCount: barCount != null && Number.isFinite(barCount) ? barCount : null,
    barLengthM: barLengthM != null && Number.isFinite(barLengthM) ? barLengthM : null,
    lotId,
    status,
    isTestStock: testIds.has(profileId),
    createdAt: row.created_at,
  };
}

async function defaultFetchPage(args: {
  userId: string;
  offset: number;
  limit: number;
}): Promise<{ rows: StockMovementPageRow[]; error: string | null }> {
  const db = supabase as { from: (t: string) => any };
  const to = args.offset + args.limit - 1;
  const { data, error } = await db
    .from('stock_movements')
    .select(
      'profile_id, movement_type, bar_count, bar_length_m, lot_metadata, unit, quantity, created_at',
    )
    .eq('user_id', args.userId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .range(args.offset, to);

  if (error) {
    return { rows: [], error: error.message || 'Failed to load stock_movements page.' };
  }
  return { rows: (data || []) as StockMovementPageRow[], error: null };
}

async function defaultFetchCount(
  userId: string,
): Promise<{ count: number | null; error: string | null }> {
  const db = supabase as { from: (t: string) => any };
  const { count, error } = await db
    .from('stock_movements')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) {
    return { count: null, error: error.message || 'Failed to count stock_movements.' };
  }
  return { count: typeof count === 'number' ? count : null, error: null };
}

/**
 * Pure pagination + reconcile helper (injectable for tests).
 */
export async function loadOwnedPhysicalBarLotsWithDeps(
  options: {
    userId: string;
    ownedProfiles?: readonly Profile[];
    pageSize?: number;
  },
  deps: LoadOwnedPhysicalBarLotsDeps,
): Promise<LoadOwnedPhysicalBarLotsResult> {
  const { userId, ownedProfiles = [], pageSize = PHYSICAL_BAR_MOVEMENT_PAGE_SIZE } = options;
  const fingerprint = stockVersionFingerprint(ownedProfiles);
  const emptyFail = (error: string): LoadOwnedPhysicalBarLotsResult => ({
    ok: false,
    error,
    lots: [],
    invalidatedProfileIds: [],
    reasons: [error],
    complete: false,
    movementCount: 0,
    stockVersionFingerprint: fingerprint,
  });

  if (!userId) {
    return emptyFail('Authenticated user is required to load physical bar lots.');
  }
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    return emptyFail('Invalid physical-bar movement page size.');
  }

  const testIds = new Set(
    ownedProfiles.filter((p) => isTestStockProfile(p)).map((p) => p.id),
  );

  let expectedCount: number | null = null;
  if (deps.fetchCount) {
    const counted = await deps.fetchCount(userId);
    if (counted.error) {
      return emptyFail(counted.error);
    }
    expectedCount = counted.count;
  }

  const allRows: StockMovementPageRow[] = [];
  let offset = 0;
  for (;;) {
    const page = await deps.fetchPage({ userId, offset, limit: pageSize });
    if (page.error) {
      return emptyFail(page.error);
    }
    allRows.push(...page.rows);
    if (page.rows.length < pageSize) break;
    offset += pageSize;
    // Safety cap: refuse unbounded loops; treat as incomplete.
    if (offset > 100_000) {
      return emptyFail('stock_movements pagination exceeded safety cap — refusing partial physical bind.');
    }
  }

  if (expectedCount != null && allRows.length !== expectedCount) {
    return emptyFail(
      `Incomplete stock_movements snapshot: loaded ${allRows.length} of ${expectedCount} rows.`,
    );
  }

  const movements = allRows.map((row) => mapRow(row, testIds));
  const net = netPhysicalBarsFromMovements(movements);

  return {
    ok: true,
    lots: net.lots,
    invalidatedProfileIds: net.invalidatedProfileIds,
    reasons: net.reasons,
    complete: true,
    movementCount: allRows.length,
    stockVersionFingerprint: fingerprint,
  };
}

export async function loadOwnedPhysicalBarLots(options: {
  userId: string;
  ownedProfiles?: readonly Profile[];
  pageSize?: number;
}): Promise<LoadOwnedPhysicalBarLotsResult> {
  return loadOwnedPhysicalBarLotsWithDeps(options, {
    fetchPage: defaultFetchPage,
    fetchCount: defaultFetchCount,
  });
}
