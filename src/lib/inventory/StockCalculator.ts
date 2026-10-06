/**
 * Stock Calculator — RPC-backed balances. Fail closed (no fabricated zero).
 */

import { supabase } from '@/lib/supabase';

/**
 * Calculate current stock for a specific profile from stock movements (metres).
 * Throws when the RPC is unavailable or rejects the call — never invents 0.
 */
export async function calculateStockFromMovements(
  userId: string,
  profileId: string,
): Promise<number> {
  const db = supabase as any;

  const { data, error } = await db.rpc('calculate_stock_from_movements', {
    p_user_id: userId,
    p_profile_id: profileId,
  });

  if (error) {
    throw new Error(error.message || 'Stock calculation failed.');
  }

  const value = Number(data);
  if (!Number.isFinite(value)) {
    throw new Error('Stock calculation returned a non-numeric balance.');
  }
  return value;
}

/**
 * Sync stock quantities for all profiles of a user from the movement ledger.
 */
export async function syncStockFromMovements(userId: string): Promise<number> {
  const db = supabase as any;

  const { data, error } = await db.rpc('sync_stock_from_movements', {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(error.message || 'Stock reconciliation failed.');
  }

  const count = Number(data ?? 0);
  if (!Number.isInteger(count) || count < 0) {
    throw new Error('Invalid stock reconciliation acknowledgement.');
  }
  return count;
}

/**
 * Calculate stock for multiple profiles. Fails closed on the first RPC error.
 */
export async function calculateStockForProfiles(
  userId: string,
  profileIds: string[],
): Promise<Map<string, number>> {
  const stockMap = new Map<string, number>();

  await Promise.all(
    profileIds.map(async (profileId) => {
      const stock = await calculateStockFromMovements(userId, profileId);
      stockMap.set(profileId, stock);
    }),
  );

  return stockMap;
}
