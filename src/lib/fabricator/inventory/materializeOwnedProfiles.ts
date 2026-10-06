/**
 * Batch 2 UP-07 — Materialize catalog-style pack profiles into owned fabricator_profiles UUIDs.
 *
 * Preserves original catalog codes in specifications.originalCatalogCode.
 * Does not invent manufacturing costs or substitute materials.
 */

import { isCatalogProfileCode } from '@/lib/fabricator/catalog/CatalogResolver';
import { supabase } from '@/lib/supabase';
import { isFabricatorUuid } from '@/lib/supabase/fabricatorClientV2';
import type { Profile, SystemPack } from '@/types/fabricator';

export type MaterializeResult =
  | { ok: true; pack: SystemPack; materializedCount: number }
  | { ok: false; error: string; pack: SystemPack; materializedCount: number };

function finitePositive(value: unknown, fallback: number | null = null): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return fallback;
}

/**
 * Ensure each pack profile that still uses a catalog/timestamp id has an owned UUID row.
 * Rewrites pack.profiles[].id to the owned UUID; keeps original code in specifications.
 */
export async function materializeOwnedProfilesFromPack(
  pack: SystemPack,
  userId: string,
): Promise<MaterializeResult> {
  if (!userId) {
    return { ok: false, error: 'Authenticated user is required to materialize profiles.', pack, materializedCount: 0 };
  }
  if (!pack?.meta?.id || !Array.isArray(pack.profiles) || pack.profiles.length === 0) {
    return { ok: false, error: 'System pack has no profiles to materialize.', pack, materializedCount: 0 };
  }

  const db = supabase as any;
  const nextProfiles: Profile[] = [];
  let materializedCount = 0;

  for (const profile of pack.profiles) {
    if (isFabricatorUuid(profile.id) && !isCatalogProfileCode(profile.id)) {
      nextProfiles.push(profile);
      continue;
    }

    const originalCode = String(
      (profile.specifications as { originalCatalogCode?: string } | undefined)?.originalCatalogCode
        ?? (profile.specifications as { partNumber?: string } | undefined)?.partNumber
        ?? profile.id,
    );

    const width = finitePositive(profile.width);
    const height = finitePositive(profile.height ?? profile.width);
    if (width == null || height == null) {
      return {
        ok: false,
        error: `Profile "${profile.name}" needs positive measured width/height before materialize.`,
        pack: { ...pack, profiles: nextProfiles },
        materializedCount,
      };
    }

    const specs = {
      ...(profile.specifications || {}),
      profileRole: profile.profileRole,
      originalCatalogCode: originalCode,
      partNumber: originalCode,
      systemPackIds: Array.from(
        new Set([...(profile.systemPackIds || []), pack.meta.id]),
      ),
      catalogAlias: profile.id,
      materializedAt: new Date().toISOString(),
    };

    // Prefer match by original catalog code in specs, then by name.
    const { data: byCodeRows } = await db
      .from('fabricator_profiles')
      .select('id, specifications')
      .eq('user_id', userId)
      .contains('specifications', { originalCatalogCode: originalCode })
      .limit(1);

    const byCode = Array.isArray(byCodeRows) ? byCodeRows[0] : byCodeRows;

    let ownedId: string | null = null;
    if (byCode?.id && isFabricatorUuid(String(byCode.id))) {
      ownedId = String(byCode.id);
      const existingSpecs = (byCode.specifications || {}) as Record<string, unknown>;
      await db
        .from('fabricator_profiles')
        .update({
          specifications: { ...existingSpecs, ...specs },
          system_brand: profile.systemBrand ?? pack.meta.brands?.[0] ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ownedId)
        .eq('user_id', userId);
    }

    if (!ownedId) {
      const { data: byName } = await db
        .from('fabricator_profiles')
        .select('id, specifications')
        .eq('user_id', userId)
        .eq('name', profile.name)
        .maybeSingle();

      if (byName?.id && isFabricatorUuid(String(byName.id))) {
        const existingSpecs = (byName.specifications || {}) as Record<string, unknown>;
        const existingCode = String(existingSpecs.originalCatalogCode ?? existingSpecs.partNumber ?? '');
        if (!existingCode || existingCode === originalCode) {
          ownedId = String(byName.id);
          await db
            .from('fabricator_profiles')
            .update({
              specifications: { ...existingSpecs, ...specs },
              system_brand: profile.systemBrand ?? pack.meta.brands?.[0] ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', ownedId)
            .eq('user_id', userId);
        }
      }
    }

    if (!ownedId) {
      const { data: inserted, error } = await db
        .from('fabricator_profiles')
        .insert({
          user_id: userId,
          name: profile.name,
          material: profile.material === 'wood' ? 'wood' : profile.material === 'upvc' ? 'upvc' : 'aluminum',
          width,
          height,
          thickness: finitePositive(profile.thickness) ?? null,
          color: profile.color || '#C0C0C0',
          cost_per_meter: Number.isFinite(profile.costPerMeter) ? profile.costPerMeter : 0,
          cutting_allowance: Number.isFinite(profile.cuttingAllowance) ? profile.cuttingAllowance : 3,
          stock_quantity: Number.isFinite(profile.stockQuantity) ? profile.stockQuantity : 0,
          min_stock_level: Number.isFinite(profile.minStockLevel) ? profile.minStockLevel : 0,
          supplier: profile.supplier ?? null,
          system_brand: profile.systemBrand ?? pack.meta.brands?.[0] ?? null,
          specifications: specs,
        })
        .select('id')
        .single();

      if (error || !inserted?.id) {
        return {
          ok: false,
          error: error?.message || `Failed to insert owned profile for "${profile.name}".`,
          pack: { ...pack, profiles: nextProfiles },
          materializedCount,
        };
      }
      ownedId = String(inserted.id);
      materializedCount += 1;
    }

    nextProfiles.push({
      ...profile,
      id: ownedId!,
      systemPackIds: specs.systemPackIds as string[],
      specifications: specs,
    });
  }

  return {
    ok: true,
    pack: { ...pack, profiles: nextProfiles },
    materializedCount,
  };
}
