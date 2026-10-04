/**
 * FP-028 / A3 — Apex V6 manufacturing cache identity.
 *
 * Cache keys must isolate system rules, profiles, quantity, glazing, and revision.
 * Pure builder only — does not change cutting formulas.
 */

import type { WindowUnit } from '@/types/fabricator';
import type { FenestrationSystem, ProfileSpec } from '@/types/fenestration';

function profileIdentity(profile: ProfileSpec | undefined): Record<string, unknown> | null {
  if (!profile) return null;
  return {
    code: profile.code,
    role: profile.role,
    widthMm: profile.dimensions?.width ?? null,
    heightMm: profile.dimensions?.height ?? null,
    stockMm: profile.standardStockLength,
    material: profile.material,
    costPerMeter: profile.costPerMeter,
  };
}

/**
 * Deterministic cache key for Apex V6 manufacturing results.
 */
export function buildApexV6CacheKey(
  system: FenestrationSystem,
  unit: WindowUnit,
  strategyName: string
): string {
  const payload = {
    unitId: unit.id,
    revision: unit.revision ?? null,
    systemPackId: unit.systemPackId ?? null,
    overallWidthMm: unit.overallWidth,
    overallHeightMm: unit.overallHeight,
    quantity: unit.quantity ?? 1,
    strategyName,
    grid: unit.grid ?? null,
    glazing: unit.glazing ?? null,
    system: {
      id: system.id,
      version: system.version,
      material: system.material,
      region: system.region,
      profiles: {
        frame: profileIdentity(system.profiles?.frame),
        sash: profileIdentity(system.profiles?.sash),
        mullion: profileIdentity(system.profiles?.mullion),
        transom: profileIdentity(system.profiles?.transom),
        glazingBead: profileIdentity(system.profiles?.glazingBead),
      },
      fabricationRules: system.fabricationRules,
    },
  };

  return JSON.stringify(payload);
}
