/**
 * Resolve Profile[] from a system pack catalog.
 * FP-028: uses only pack / template catalog fields — never invents codes or weights.
 */

import type { SystemPack } from '@/data/systemPacks';
import type { Profile } from '@/types/fabricator';

type CatalogRole = NonNullable<Profile['profileRole']>;

function catalogProfile(input: {
  id: string;
  name: string;
  role: CatalogRole;
  packId: string;
  brand: string;
  faceWidthMm: number;
  weightPerMeter?: number;
}): Profile {
  return {
    id: input.id,
    name: input.name,
    material: 'aluminum',
    width: input.faceWidthMm,
    height: input.faceWidthMm,
    thickness: 1.8,
    color: '#C0C0C0',
    costPerMeter: 0,
    cuttingAllowance: 3,
    stockQuantity: 0,
    minStockLevel: 0,
    maxStockLevel: 1000,
    supplier: input.brand,
    systemBrand: input.brand,
    weightPerMeter: input.weightPerMeter,
    profileRole: input.role,
    systemPackIds: [input.packId],
    specifications: {
      partNumber: input.id,
      catalog_sourced: true,
    },
  };
}

function resolveRock60CatalogProfiles(pack: SystemPack): Profile[] {
  const cfg = (pack.windowSystemSpec as {
    rock60_45_degree_config?: {
      frame_profiles?: { main_frame?: { profile_code?: string; weight_kg_m?: number; physics?: { faceWidth?: number } } };
      sash_profiles?: { main_sash?: { profile_code?: string; weight_kg_m?: number; physics?: { faceWidth?: number } } };
      glazing_beads?: { bead_profile?: { profile_code?: string; weight_kg_m?: number } };
    };
  } | undefined)?.rock60_45_degree_config;

  if (!cfg) return [];

  const brand = pack.meta.brands[0] || pack.meta.name;
  const out: Profile[] = [];

  const frame = cfg.frame_profiles?.main_frame;
  if (frame?.profile_code) {
    out.push(
      catalogProfile({
        id: frame.profile_code,
        name: `Frame ${frame.profile_code}`,
        role: 'frame',
        packId: pack.meta.id,
        brand,
        faceWidthMm: frame.physics?.faceWidth ?? 60,
        weightPerMeter: frame.weight_kg_m,
      }),
    );
  }

  const sash = cfg.sash_profiles?.main_sash;
  if (sash?.profile_code) {
    out.push(
      catalogProfile({
        id: sash.profile_code,
        name: `Sash ${sash.profile_code}`,
        role: 'sash',
        packId: pack.meta.id,
        brand,
        faceWidthMm: sash.physics?.faceWidth ?? 72,
        weightPerMeter: sash.weight_kg_m,
      }),
    );
  }

  const bead = cfg.glazing_beads?.bead_profile;
  if (bead?.profile_code) {
    out.push(
      catalogProfile({
        id: bead.profile_code,
        name: `Bead ${bead.profile_code}`,
        role: 'glazing_bead',
        packId: pack.meta.id,
        brand,
        faceWidthMm: 20,
        weightPerMeter: bead.weight_kg_m,
      }),
    );
  }

  return out;
}

/**
 * Prefer explicit pack.profiles; otherwise derive from known catalog templates (ROCK 60).
 */
export function resolveSystemPackProfiles(pack: SystemPack | null | undefined): Profile[] {
  if (!pack) return [];
  if (pack.profiles && pack.profiles.length > 0) {
    return pack.profiles.map((p) => ({
      ...p,
      systemPackIds: p.systemPackIds?.length ? p.systemPackIds : [pack.meta.id],
    }));
  }
  if (pack.meta.id === 'rock60') {
    return resolveRock60CatalogProfiles(pack);
  }
  return [];
}
