/**
 * Supabase Service for System Packs
 * 
 * Syncs custom system packs to Supabase database for persistence across devices
 * Falls back to localStorage if Supabase is unavailable
 */

import { supabase } from '@/lib/supabase';
import type { SystemPack } from '@/types/fabricator';
import type { Database } from '@/types/database';

type SystemPackRow = Database['public']['Tables']['fabricator_system_packs']['Row'];
type SystemPackInsert = Database['public']['Tables']['fabricator_system_packs']['Insert'];
type SystemPackUpdate = Database['public']['Tables']['fabricator_system_packs']['Update'];

export interface StoredSystemPack extends SystemPack {
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  isArchived?: boolean;
}

/**
 * Convert SystemPack to Supabase format
 */
function systemPackToSupabase(system: SystemPack, userId: string | null): SystemPackInsert {
  return {
    id: system.meta.id,
    label: system.meta.name,
    regions: system.meta.regions || [],
    brands: system.meta.brands || [],
    spec: system as any, // Store full system pack in spec
    is_active: true,
    owner_user_id: userId,
    scope: userId ? 'user' : 'public', // 'user' for custom, 'public' for shared
  };
}

/**
 * Convert Supabase row to SystemPack
 */
function supabaseToSystemPack(row: SystemPackRow): StoredSystemPack {
  const spec = row.spec as any;
  return {
    ...spec,
    meta: {
      ...spec.meta,
      id: row.id,
      name: row.label,
      regions: row.regions || [],
      brands: row.brands || [],
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Load custom system packs from Supabase
 */
export async function loadCustomSystemsFromSupabase(userId: string | null): Promise<StoredSystemPack[]> {
  try {
    const query = supabase
      .from('fabricator_system_packs')
      .select('*')
      .eq('is_active', true);

    // If userId provided, get user's custom packs, otherwise get public ones
    if (userId) {
      query.eq('owner_user_id', userId);
    } else {
      query.is('owner_user_id', null).eq('scope', 'public');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading system packs from Supabase:', error);
      return [];
    }

    return (data || []).map(supabaseToSystemPack);
  } catch (error) {
    console.error('Error loading system packs from Supabase:', error);
    return [];
  }
}

/**
 * Save system pack to Supabase
 */
export async function saveSystemPackToSupabase(
  system: SystemPack,
  userId: string | null
): Promise<boolean> {
  try {
    const payload = systemPackToSupabase(system, userId);

    // Check if exists
    const { data: existing } = await supabase
      .from('fabricator_system_packs')
      .select('id')
      .eq('id', system.meta.id)
      .maybeSingle();

    if (existing) {
      // Update existing
      const updatePayload: SystemPackUpdate = {
        label: payload.label,
        regions: payload.regions,
        brands: payload.brands,
        spec: payload.spec,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('fabricator_system_packs')
        .update(updatePayload)
        .eq('id', system.meta.id);

      if (error) throw error;
    } else {
      // Insert new
      const { error } = await supabase
        .from('fabricator_system_packs')
        .insert(payload);

      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error('Error saving system pack to Supabase:', error);
    return false;
  }
}

/**
 * Delete system pack from Supabase
 */
export async function deleteSystemPackFromSupabase(
  id: string,
  userId: string | null
): Promise<boolean> {
  try {
    const query = supabase
      .from('fabricator_system_packs')
      .delete()
      .eq('id', id);

    // Only allow deletion if user owns it
    if (userId) {
      query.eq('owner_user_id', userId);
    }

    const { error } = await query;

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting system pack from Supabase:', error);
    return false;
  }
}

/**
 * Archive system pack in Supabase (soft delete)
 */
export async function archiveSystemPackInSupabase(
  id: string,
  userId: string | null
): Promise<boolean> {
  try {
    const query = supabase
      .from('fabricator_system_packs')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (userId) {
      query.eq('owner_user_id', userId);
    }

    const { error } = await query;

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error archiving system pack in Supabase:', error);
    return false;
  }
}

