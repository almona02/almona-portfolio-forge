/**
 * Batch 2 UP-10 — Stock intake via movements + authoritative sync.
 *
 * Never trust stale client stockQuantity for writes. Insert movements, then
 * sync_stock_from_movements. Callers must invalidate owned-inventory queries.
 */

import { syncStockFromMovements } from '@/lib/inventory/StockCalculator';
import { supabase } from '@/lib/supabase';

export interface StockIntakeMovement {
  profileId: string;
  quantity: number;
  unit: 'meters' | 'pieces';
  notes?: string | null;
  /** Client-generated idempotency token (embedded in notes when column absent). */
  requestId?: string;
}

export type StockIntakeResult =
  | { ok: true; movementCount: number }
  | { ok: false; error: string };

/**
 * Insert stock_movements rows then recompute fabricator_profiles.stock_quantity
 * from movements. Skips zero/invalid quantities. Does not invent profile rows.
 */
export async function recordStockIntakeThenSync(
  userId: string,
  movements: StockIntakeMovement[],
): Promise<StockIntakeResult> {
  if (!userId) {
    return { ok: false, error: 'Authenticated user is required for stock intake.' };
  }

  const rows = movements
    .filter((m) => m.profileId && Number.isFinite(m.quantity) && m.quantity > 0)
    .map((m) => {
      const noteParts: string[] = [];
      if (m.notes) noteParts.push(m.notes);
      if (m.requestId) noteParts.push(`[idempotency=${m.requestId}]`);
      return {
        user_id: userId,
        profile_id: m.profileId,
        movement_type: 'in' as const,
        quantity: m.quantity,
        unit: m.unit,
        notes: noteParts.length ? noteParts.join(' – ') : null,
        idempotency_key: m.requestId || null,
      };
    });

  if (!rows.length) {
    return { ok: false, error: 'No valid intake rows to record.' };
  }

  const db = supabase as any;
  const { error } = await db.from('stock_movements').insert(rows);
  if (error) {
    // Unique violation on (user_id, idempotency_key) → treat as already recorded.
    if (String(error.code) === '23505' || /idempotency/i.test(error.message || '')) {
      await syncStockFromMovements(userId);
      return { ok: true, movementCount: rows.length };
    }
    return { ok: false, error: error.message || 'Failed to insert stock movements.' };
  }

  await syncStockFromMovements(userId);
  return { ok: true, movementCount: rows.length };
}

/** React Query keys that must refresh after intake. */
export const OWNED_INVENTORY_QUERY_KEYS = [
  'studio-owned-inventory',
  'fabricator-reports-inventory',
] as const;
