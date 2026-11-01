/**
 * Load net physical bar lots (profile × length) from stock_movements.
 * Metres-only rows are ignored — they cannot establish bar composition.
 */

import { supabase } from '@/lib/supabase';
import {
  netPhysicalBarsFromMovements,
  type OwnedBarLot,
  type PhysicalBarMovement,
} from './physicalOwnedBars';
import { isTestStockProfile } from './testStock';
import type { Profile } from '@/types/fabricator';

export type LoadOwnedPhysicalBarLotsResult =
  | { ok: true; lots: OwnedBarLot[] }
  | { ok: false; error: string; lots: OwnedBarLot[] };

export async function loadOwnedPhysicalBarLots(options: {
  userId: string;
  ownedProfiles?: readonly Profile[];
}): Promise<LoadOwnedPhysicalBarLotsResult> {
  const { userId, ownedProfiles = [] } = options;
  if (!userId) {
    return { ok: false, error: 'Authenticated user is required to load physical bar lots.', lots: [] };
  }

  const testIds = new Set(
    ownedProfiles.filter((p) => isTestStockProfile(p)).map((p) => p.id),
  );

  const db = supabase as any;
  const { data, error } = await db
    .from('stock_movements')
    .select('profile_id, movement_type, bar_count, bar_length_m, lot_metadata, unit, quantity')
    .eq('user_id', userId);

  if (error) {
    return {
      ok: false,
      error: error.message || 'Failed to load stock_movements for physical bars.',
      lots: [],
    };
  }

  const movements: PhysicalBarMovement[] = (data || []).map((row: Record<string, unknown>) => {
    const profileId = String(row.profile_id);
    const lotMeta = (row.lot_metadata || {}) as Record<string, unknown>;
    const lotId = typeof lotMeta.lot_id === 'string'
      ? lotMeta.lot_id
      : typeof lotMeta.lotId === 'string'
        ? lotMeta.lotId
        : null;
    const status = typeof lotMeta.status === 'string' ? lotMeta.status : 'available';
    let barCount = row.bar_count == null ? null : Number(row.bar_count);
    let barLengthM = row.bar_length_m == null ? null : Number(row.bar_length_m);
    // pieces/bars with quantity but missing bar_count: treat quantity as bars when length known
    const unit = String(row.unit || '').toLowerCase();
    if (barCount == null && (unit === 'pieces' || unit === 'bars') && row.quantity != null && barLengthM != null) {
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
    };
  });

  return { ok: true, lots: netPhysicalBarsFromMovements(movements) };
}
