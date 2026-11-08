/**
 * Supabase Service for System Packs
 *
 * Syncs custom system packs to Supabase database for persistence across devices
 * Falls back to localStorage if Supabase is unavailable
 *
 * P1 versioning: every save stamps a monotonic version on the live row and
 * appends the previous spec to fabricator_system_pack_history, so admins get
 * audit + rollback. Until supabase/migrations/20261106000000 is applied, saves
 * fall back to the legacy unversioned write with a loud warning.
 */

import { supabase } from '@/lib/supabase';
import type { SystemPack } from '@/types/fabricator';
import type { Database } from '@/types/database';
import {
  buildPackProvenance,
  catalogMigrationMissingMessage,
  isMissingCatalogDdlError,
  nextCatalogVersion,
  type CatalogProvenanceSource,
  type PackHistoryEntry,
  type PackProvenance,
} from '@/types/catalogProvenance';

type SystemPackRow = Database['public']['Tables']['fabricator_system_packs']['Row'];
type SystemPackInsert = Database['public']['Tables']['fabricator_system_packs']['Insert'];
type SystemPackUpdate = Database['public']['Tables']['fabricator_system_packs']['Update'];

export interface StoredSystemPack extends SystemPack {
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  isArchived?: boolean;
  /** Live-row provenance when the versioning migration is applied. */
  provenance?: PackProvenance;
}

export interface SavePackOptions {
  changeNote?: string | null;
  source?: CatalogProvenanceSource;
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
    scope: userId ? 'tenant' : 'global',
  };
}

/**
 * Convert Supabase row to SystemPack
 */
function supabaseToSystemPack(row: SystemPackRow): StoredSystemPack {
  const spec = row.spec as any;
  const versioned = row as SystemPackRow & { version?: number; updated_by?: string | null; change_note?: string | null };
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
    version: typeof versioned.version === 'number' ? versioned.version : undefined,
    provenance:
      typeof versioned.version === 'number'
        ? buildPackProvenance({
            version: versioned.version,
            updatedBy: versioned.updated_by ?? null,
            updatedAt: row.updated_at ?? undefined,
            changeNote: versioned.change_note ?? null,
            source: 'tuning_studio',
          })
        : undefined,
  };
}

function mapHistoryRow(row: Record<string, any>): PackHistoryEntry {
  return {
    id: String(row.id),
    packId: String(row.pack_id),
    version: Number(row.version),
    spec: row.spec,
    changeNote: (row.change_note as string | null) ?? null,
    source: (row.source as CatalogProvenanceSource) ?? 'tuning_studio',
    createdBy: (row.created_by as string | null) ?? null,
    createdAt: String(row.created_at),
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
      query.is('owner_user_id', null).eq('scope', 'global');
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

async function insertPackHistory(entry: {
  packId: string;
  ownerUserId: string | null;
  scope: 'global' | 'tenant';
  version: number;
  spec: unknown;
  changeNote: string | null;
  source: CatalogProvenanceSource;
  createdBy: string | null;
}): Promise<void> {
  const db = supabase as any;
  const { error } = await db.from('fabricator_system_pack_history').insert({
    pack_id: entry.packId,
    owner_user_id: entry.ownerUserId,
    scope: entry.scope,
    version: entry.version,
    spec: entry.spec,
    change_note: entry.changeNote,
    source: entry.source,
    created_by: entry.createdBy,
  });
  if (error) throw error;
}

/**
 * List version history for one pack, newest first. Returns [] when the
 * versioning migration is not applied yet.
 */
export async function listPackVersionsFromSupabase(
  packId: string,
  userId: string | null
): Promise<PackHistoryEntry[]> {
  try {
    const db = supabase as any;
    let query = db
      .from('fabricator_system_pack_history')
      .select('*')
      .eq('pack_id', packId)
      .order('version', { ascending: false })
      .limit(50);
    if (userId) query = query.eq('owner_user_id', userId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapHistoryRow);
  } catch (error) {
    if (isMissingCatalogDdlError(error)) {
      console.warn(catalogMigrationMissingMessage('Pack version history'));
      return [];
    }
    console.error('Error listing pack versions:', error);
    return [];
  }
}

/**
 * Save system pack to Supabase (versioned).
 *
 * Update path: snapshot the current live spec into history, then write the new
 * spec with version + 1. Insert path: write version 1 and snapshot it. When the
 * versioning migration is missing, falls back to the legacy unversioned write.
 */
export async function saveSystemPackToSupabase(
  system: SystemPack,
  userId: string | null,
  options: SavePackOptions = {}
): Promise<boolean> {
  const changeNote = options.changeNote ?? null;
  const source = options.source ?? 'tuning_studio';
  try {
    const payload = systemPackToSupabase(system, userId);

    // Check if exists (need current version + spec for the history snapshot).
    // Untyped query: version/updated_by/change_note postdate the generated types.
    const { data: existing } = await (supabase as any)
      .from('fabricator_system_packs')
      .select('id, version, spec, scope, owner_user_id')
      .eq('id', system.meta.id)
      .maybeSingle();

    if (existing) {
      const current = existing as unknown as {
        version?: number;
        spec?: unknown;
        scope?: 'global' | 'tenant';
        owner_user_id?: string | null;
      };
      const currentVersion =
        typeof current.version === 'number' && current.version >= 1 ? current.version : 1;
      const newVersion = nextCatalogVersion(currentVersion);

      await insertPackHistory({
        packId: system.meta.id,
        ownerUserId: (current.owner_user_id as string | null) ?? userId,
        scope: current.scope ?? (userId ? 'tenant' : 'global'),
        version: currentVersion,
        spec: current.spec ?? null,
        changeNote,
        source,
        createdBy: userId,
      });

      const updatePayload = {
        label: payload.label,
        regions: payload.regions,
        brands: payload.brands,
        spec: payload.spec,
        version: newVersion,
        updated_by: userId,
        change_note: changeNote,
        updated_at: new Date().toISOString(),
      } as unknown as SystemPackUpdate;

      const { error } = await supabase
        .from('fabricator_system_packs')
        .update(updatePayload)
        .eq('id', system.meta.id);

      if (error) throw error;
    } else {
      await insertPackHistory({
        packId: system.meta.id,
        ownerUserId: userId,
        scope: userId ? 'tenant' : 'global',
        version: 1,
        spec: payload.spec,
        changeNote,
        source: source === 'rollback' ? 'rollback' : 'initial_setup',
        createdBy: userId,
      });

      const insertPayload = {
        ...payload,
        version: 1,
        updated_by: userId,
        change_note: changeNote,
      } as unknown as SystemPackInsert;
      const { error } = await supabase
        .from('fabricator_system_packs')
        .insert(insertPayload);

      if (error) throw error;
    }

    return true;
  } catch (error) {
    if (isMissingCatalogDdlError(error)) {
      console.warn(catalogMigrationMissingMessage('Pack versioning'));
      return saveSystemPackLegacy(system, userId);
    }
    console.error('Error saving system pack to Supabase:', error);
    return false;
  }
}

/** Pre-versioning write path, kept as fallback until the migration is applied. */
async function saveSystemPackLegacy(system: SystemPack, userId: string | null): Promise<boolean> {
  try {
    const payload = systemPackToSupabase(system, userId);
    const { data: existing } = await supabase
      .from('fabricator_system_packs')
      .select('id')
      .eq('id', system.meta.id)
      .maybeSingle();

    if (existing) {
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
      const { error } = await supabase.from('fabricator_system_packs').insert(payload);
      if (error) throw error;
    }
    return true;
  } catch (error) {
    console.error('Error saving system pack to Supabase:', error);
    return false;
  }
}

/**
 * Roll back a pack to a historical version. Rollback always creates a NEW
 * live version copying the old spec — history rows are never mutated.
 */
export async function rollbackSystemPackInSupabase(
  packId: string,
  version: number,
  userId: string | null,
  changeNote?: string | null
): Promise<boolean> {
  try {
    const db = supabase as any;
    let query = db
      .from('fabricator_system_pack_history')
      .select('*')
      .eq('pack_id', packId)
      .eq('version', version)
      .limit(1);
    if (userId) query = query.eq('owner_user_id', userId);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) {
      console.error(`No pack history found for ${packId} v${version}`);
      return false;
    }
    const entry = mapHistoryRow(data as Record<string, any>);
    const spec = entry.spec as SystemPack;
    if (!spec || typeof spec !== 'object' || !spec.meta) {
      console.error(`Corrupt pack history snapshot for ${packId} v${version}`);
      return false;
    }
    return saveSystemPackToSupabase(spec, userId, {
      changeNote: changeNote ?? `Rolled back to version ${version}`,
      source: 'rollback',
    });
  } catch (error) {
    if (isMissingCatalogDdlError(error)) {
      console.error(catalogMigrationMissingMessage('Pack rollback'));
      return false;
    }
    console.error('Error rolling back system pack:', error);
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
