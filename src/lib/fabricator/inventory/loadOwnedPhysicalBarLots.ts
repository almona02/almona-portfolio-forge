/**
 * Load net physical bar lots (profile × length) from stock_movements.
 *
 * Consistency contract:
 * - Read authoritative stock versions before and after paging; mismatch → fail.
 * - Pages until a short page; exact count match when count is available.
 * - Any page error / partial history / version drift → ok:false (never physical bind).
 * - Returned stockVersionFingerprint is the verified post-read snapshot, not stale input.
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
      /** Verified fingerprint from post-collection stock_version read. */
      stockVersionFingerprint: string;
      stockVersionByProfile: Record<string, number>;
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
      stockVersionByProfile: Record<string, number>;
    };

export interface StockMovementPageRow {
  profile_id: string;
  movement_type: string;
  bar_count: number | string | null;
  bar_length_m: number | string | null;
  canonical_metres?: number | string | null;
  lot_metadata: Record<string, unknown> | null;
  unit: string | null;
  quantity: number | string | null;
  created_at: string | null;
}

export interface LoadOwnedPhysicalBarLotsDeps {
  fetchPage: (args: {
    userId: string;
    offset: number;
    limit: number;
  }) => Promise<{ rows: StockMovementPageRow[]; error: string | null }>;
  fetchCount?: (userId: string) => Promise<{ count: number | null; error: string | null }>;
  /** Authoritative owned-profile stock_version map (DB read). */
  fetchStockVersions: (userId: string) => Promise<{
    versions: Record<string, number>;
    error: string | null;
  }>;
}

export function fingerprintStockVersions(versions: Readonly<Record<string, number>>): string {
  return Object.keys(versions)
    .sort()
    .map((id) => `${id}:${versions[id] ?? 0}`)
    .join('|');
}

export function stockVersionsEqual(
  a: Readonly<Record<string, number>>,
  b: Readonly<Record<string, number>>,
): boolean {
  return fingerprintStockVersions(a) === fingerprintStockVersions(b);
}

function mapRow(
  row: StockMovementPageRow,
  testIds: Set<string>,
): PhysicalBarMovement {
  const profileId = String(row.profile_id);
  const lotMeta = row.lot_metadata || {};
  const lotId = typeof lotMeta.lot_id === 'string'
    ? lotMeta.lot_id
    : typeof lotMeta.lotId === 'string'
      ? lotMeta.lotId
      : null;
  const status = typeof lotMeta.status === 'string' ? lotMeta.status : null;
  const peerRaw = lotMeta.transfer_peer_profile_id ?? lotMeta.transferPeerProfileId ?? lotMeta.peer_profile_id;
  const transferPeerProfileId = typeof peerRaw === 'string' ? peerRaw : null;
  let barCount = row.bar_count == null ? null : Number(row.bar_count);
  const barLengthM = row.bar_length_m == null ? null : Number(row.bar_length_m);
  const unit = String(row.unit || '').toLowerCase();
  if (
    barCount == null
    && (unit === 'pieces' || unit === 'bars')
    && row.quantity != null
    && barLengthM != null
  ) {
    barCount = Number(row.quantity);
  }
  const canonicalMetres = row.canonical_metres == null ? null : Number(row.canonical_metres);
  return {
    profileId,
    movementType: String(row.movement_type || ''),
    barCount: barCount != null && Number.isFinite(barCount) ? barCount : null,
    barLengthM: barLengthM != null && Number.isFinite(barLengthM) ? barLengthM : null,
    canonicalMetres: canonicalMetres != null && Number.isFinite(canonicalMetres) ? canonicalMetres : null,
    lotId,
    status,
    isTestStock: testIds.has(profileId),
    createdAt: row.created_at,
    transferPeerProfileId,
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
      'profile_id, movement_type, bar_count, bar_length_m, canonical_metres, lot_metadata, unit, quantity, created_at',
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

/** Authoritative owned-profile stock_version map (DB read). */
export async function fetchOwnedStockVersions(
  userId: string,
): Promise<{ versions: Record<string, number>; error: string | null }> {
  const db = supabase as { from: (t: string) => any };
  const { data, error } = await db
    .from('fabricator_profiles')
    .select('id, stock_version')
    .eq('user_id', userId);
  if (error) {
    return { versions: {}, error: error.message || 'Failed to load stock versions.' };
  }
  const versions: Record<string, number> = {};
  for (const row of data || []) {
    const id = String((row as { id: string }).id);
    const v = Number((row as { stock_version: number | null }).stock_version ?? 0);
    versions[id] = Number.isFinite(v) ? v : 0;
  }
  return { versions, error: null };
}

async function defaultFetchStockVersions(
  userId: string,
): Promise<{ versions: Record<string, number>; error: string | null }> {
  return fetchOwnedStockVersions(userId);
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
  const emptyFail = (
    error: string,
    versions: Record<string, number> = {},
    movementCount = 0,
  ): LoadOwnedPhysicalBarLotsResult => ({
    ok: false,
    error,
    lots: [],
    invalidatedProfileIds: [],
    reasons: [error],
    complete: false,
    movementCount,
    stockVersionFingerprint: fingerprintStockVersions(versions),
    stockVersionByProfile: versions,
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

  const before = await deps.fetchStockVersions(userId);
  if (before.error) {
    return emptyFail(before.error);
  }
  const versionsBefore = before.versions;

  let expectedCount: number | null = null;
  if (deps.fetchCount) {
    const counted = await deps.fetchCount(userId);
    if (counted.error) {
      return emptyFail(counted.error, versionsBefore);
    }
    expectedCount = counted.count;
  }

  const allRows: StockMovementPageRow[] = [];
  let offset = 0;
  for (;;) {
    const page = await deps.fetchPage({ userId, offset, limit: pageSize });
    if (page.error) {
      return emptyFail(page.error, versionsBefore, allRows.length);
    }
    allRows.push(...page.rows);
    if (page.rows.length < pageSize) break;
    offset += pageSize;
    if (offset > 100_000) {
      return emptyFail(
        'stock_movements pagination exceeded safety cap — refusing partial physical bind.',
        versionsBefore,
        allRows.length,
      );
    }
  }

  if (expectedCount != null && allRows.length !== expectedCount) {
    return emptyFail(
      `Incomplete stock_movements snapshot: loaded ${allRows.length} of ${expectedCount} rows.`,
      versionsBefore,
      allRows.length,
    );
  }

  const after = await deps.fetchStockVersions(userId);
  if (after.error) {
    return emptyFail(after.error, versionsBefore, allRows.length);
  }
  if (!stockVersionsEqual(versionsBefore, after.versions)) {
    return emptyFail(
      'Stock versions changed during physical-bar collection — retry acknowledgement.',
      after.versions,
      allRows.length,
    );
  }

  // Optional: count must still match after collection (append during paging).
  if (deps.fetchCount) {
    const recounted = await deps.fetchCount(userId);
    if (recounted.error) {
      return emptyFail(recounted.error, after.versions, allRows.length);
    }
    if (recounted.count != null && recounted.count !== allRows.length) {
      return emptyFail(
        `stock_movements grew during collection (${allRows.length} → ${recounted.count}) — refusing stale bind.`,
        after.versions,
        allRows.length,
      );
    }
  }

  const movements = allRows.map((row) => mapRow(row, testIds));
  const net = netPhysicalBarsFromMovements(movements);
  const verifiedFingerprint = fingerprintStockVersions(after.versions);

  return {
    ok: true,
    lots: net.lots,
    invalidatedProfileIds: net.invalidatedProfileIds,
    reasons: net.reasons,
    complete: true,
    movementCount: allRows.length,
    stockVersionFingerprint: verifiedFingerprint,
    stockVersionByProfile: after.versions,
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
    fetchStockVersions: defaultFetchStockVersions,
  });
}
