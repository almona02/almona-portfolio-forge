/**
 * FP-028 / Batch 2 UP-06 — Shared system-pack catalog resolution.
 *
 * Unknown pack IDs must fail closed. Never substitute ROCK60 or SYSTEM_PACKS[0].
 * Catalog profile codes remain distinct from owned fabricator_profiles UUIDs.
 */

import { SYSTEM_PACKS } from '@/data/systemPacks';
import { loadCustomSystems } from '@/lib/fabricator/customSystemStorage';
import { resolveSystemPackProfiles } from '@/lib/fabricator/engineering/resolveSystemPackProfiles';
import { isFabricatorUuid } from '@/lib/supabase/fabricatorClientV2';
import type { Profile, SystemPack } from '@/types/fabricator';

export type CatalogResolveErrorCode =
  | 'MISSING_PACK_ID'
  | 'UNKNOWN_SYSTEM_PACK'
  | 'NO_CATALOG_PROFILES';

export interface CatalogResolveError {
  code: CatalogResolveErrorCode;
  message: string;
  packId: string | null;
}

export type SystemPackResolveResult =
  | { ok: true; pack: SystemPack; source: 'catalog' | 'custom' }
  | { ok: false; error: CatalogResolveError };

export type CatalogProfilesResolveResult =
  | { ok: true; pack: SystemPack; profiles: Profile[]; source: 'catalog' | 'custom' }
  | { ok: false; error: CatalogResolveError };

export function isCatalogProfileCode(id: string | null | undefined): boolean {
  if (!id) return false;
  return !isFabricatorUuid(id);
}

/** Find a pack in built-in catalog or owned custom local packs. No substitution. */
export function findSystemPack(packId: string | null | undefined): SystemPackResolveResult {
  if (!packId || !packId.trim()) {
    return {
      ok: false,
      error: {
        code: 'MISSING_PACK_ID',
        message: 'System pack id is missing; catalog was not resolved.',
        packId: packId ?? null,
      },
    };
  }

  const id = packId.trim();
  const fromCatalog = SYSTEM_PACKS.find((p) => p.meta.id === id);
  if (fromCatalog) {
    return { ok: true, pack: fromCatalog, source: 'catalog' };
  }

  const fromCustom = loadCustomSystems().find((p) => p.meta.id === id);
  if (fromCustom) {
    return { ok: true, pack: fromCustom, source: 'custom' };
  }

  return {
    ok: false,
    error: {
      code: 'UNKNOWN_SYSTEM_PACK',
      message: `System pack "${id}" is not in the catalog or custom packs; no substitute was applied.`,
      packId: id,
    },
  };
}

/**
 * Resolve catalog profiles for a pack id.
 * Empty profile lists are an error (except callers that only need the pack meta).
 */
export function resolveCatalogProfiles(
  packId: string | null | undefined,
): CatalogProfilesResolveResult {
  const packResult = findSystemPack(packId);
  if (!packResult.ok) return packResult;

  const profiles = resolveSystemPackProfiles(packResult.pack);
  if (!profiles.length) {
    return {
      ok: false,
      error: {
        code: 'NO_CATALOG_PROFILES',
        message: `System pack "${packResult.pack.meta.id}" has no resolvable catalog profiles.`,
        packId: packResult.pack.meta.id,
      },
    };
  }

  return {
    ok: true,
    pack: packResult.pack,
    profiles,
    source: packResult.source,
  };
}

/** Convenience: profiles array or [] when unresolved (callers that already show a blocked gate). */
export function catalogProfilesOrEmpty(packId: string | null | undefined): Profile[] {
  const result = resolveCatalogProfiles(packId);
  return result.ok ? result.profiles : [];
}

/** All built-in + custom packs (for galleries). */
export function listResolvableSystemPacks(): SystemPack[] {
  return [...SYSTEM_PACKS, ...loadCustomSystems()];
}
