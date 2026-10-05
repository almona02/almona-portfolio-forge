/**
 * Batch 2 UP-09 — Authoritative owned workshop inventory.
 *
 * Loads fabricator_profiles for the authenticated owner independently of the
 * active pose. Optional systemPackId filters by Profile.systemPackIds / brand hints.
 * Catalog-only resolveSystemPackProfiles must not be used as stock balances.
 */

import { supabase } from '@/lib/supabase';
import {
  mapProfileRowFromDb,
  profileInventoryValue,
} from '@/lib/fabricator/inventory/profileInventoryMapper';
import type { Profile } from '@/types/fabricator';

export interface LoadOwnedInventoryOptions {
  userId: string;
  /** When set, keep profiles linked to this pack id (systemPackIds) or matching systemBrand. */
  systemPackId?: string | null;
  /** Sync movements before read (same RPC Reports uses). */
  syncFromMovements?: boolean;
}

export type OwnedInventoryResult =
  | { ok: true; profiles: Profile[]; totalValue: number }
  | { ok: false; error: string; profiles: Profile[]; totalValue: number };

function matchesSystemFilter(profile: Profile, systemPackId: string): boolean {
  if (profile.systemPackIds?.includes(systemPackId)) return true;
  // Soft brand/code match for rows that never stored systemPackIds
  const brand = (profile.systemBrand || '').toLowerCase();
  const needle = systemPackId.toLowerCase();
  if (brand && (brand.includes(needle) || needle.includes(brand.replace(/\s+/g, '')))) {
    return true;
  }
  return false;
}

export async function loadOwnedWorkshopInventory(
  options: LoadOwnedInventoryOptions,
): Promise<OwnedInventoryResult> {
  const { userId, systemPackId, syncFromMovements = true } = options;
  if (!userId) {
    return {
      ok: false,
      error: 'Authenticated user is required to load workshop inventory.',
      profiles: [],
      totalValue: 0,
    };
  }

  const db = supabase as any;

  if (syncFromMovements) {
    try {
      await db.rpc('sync_stock_from_movements', { p_user_id: userId });
    } catch (err) {
      console.warn('[ProfileInventoryAdapter] sync_stock_from_movements failed:', err);
    }
  }

  const { data, error } = await db
    .from('fabricator_profiles')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    return {
      ok: false,
      error: error.message || 'Failed to load fabricator_profiles.',
      profiles: [],
      totalValue: 0,
    };
  }

  let profiles = (data || []).map((row: Record<string, unknown>) =>
    mapProfileRowFromDb(row),
  );

  if (systemPackId && systemPackId.trim()) {
    const filtered = profiles.filter((p) => matchesSystemFilter(p, systemPackId.trim()));
    // Explicit filter with zero matches must not fall back to full catalog substitution.
    profiles = filtered;
  }

  const totalValue = profiles.reduce((sum, p) => sum + profileInventoryValue(p), 0);

  return {
    ok: true,
    profiles,
    totalValue: Number.isFinite(totalValue) ? totalValue : 0,
  };
}
