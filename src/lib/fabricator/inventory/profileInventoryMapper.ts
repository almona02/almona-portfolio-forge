/**
 * Batch 2 UP-09 — Map fabricator_profiles rows to domain Profile (camelCase).
 * Shared by Reports, Stock, and inventory adapters. Never leave costPerMeter undefined.
 */

import type { Profile } from '@/types/fabricator';

function finiteNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

/**
 * Convert a raw PostgREST / DB row into a workshop Profile.
 * Accepts snake_case columns and already-partial camelCase spreads.
 */
export function mapProfileRowFromDb(data: Record<string, unknown>): Profile {
  const specs = (data.specifications as Record<string, unknown>) || {};

  const costPerMeter = finiteNumber(
    data.costPerMeter ?? data.cost_per_meter,
    0,
  );
  const stockQuantity = finiteNumber(
    data.stockQuantity ?? data.stock_quantity,
    0,
  );
  const minStockLevel = finiteNumber(
    data.minStockLevel ?? data.min_stock_level,
    0,
  );
  const maxRaw = data.maxStockLevel ?? data.max_stock_level;
  let maxStockLevel: number | undefined;
  if (maxRaw !== undefined && maxRaw !== null && maxRaw !== '') {
    const n = finiteNumber(maxRaw, NaN);
    maxStockLevel = Number.isFinite(n) ? n : undefined;
  }

  const weight =
    typeof specs.weightPerMeterKg === 'number'
      ? specs.weightPerMeterKg
      : typeof data.weightPerMeter === 'number'
        ? data.weightPerMeter
        : undefined;

  const createdAtRaw = data.createdAt ?? data.created_at;
  const updatedAtRaw = data.updatedAt ?? data.updated_at;

  return {
    id: String(data.id ?? ''),
    name: String(data.name ?? ''),
    material: (data.material as Profile['material']) || 'aluminum',
    width: finiteNumber(data.width, 0),
    height: data.height != null ? finiteNumber(data.height) : undefined,
    thickness: data.thickness != null ? finiteNumber(data.thickness) : undefined,
    color: String(data.color ?? '#C0C0C0'),
    costPerMeter,
    cuttingAllowance: finiteNumber(
      data.cuttingAllowance ?? data.cutting_allowance,
      3,
    ),
    stockQuantity,
    minStockLevel,
    maxStockLevel,
    supplier: (data.supplier as string) || undefined,
    systemBrand: (data.systemBrand as string) || (data.system_brand as string) || undefined,
    weightPerMeter: weight,
    profileRole: data.profileRole as Profile['profileRole'] | undefined,
    systemPackIds: Array.isArray(data.systemPackIds)
      ? (data.systemPackIds as string[])
      : Array.isArray(data.system_pack_ids)
        ? (data.system_pack_ids as string[])
        : undefined,
    specifications: specs,
    grainDirection: (data.grainDirection ?? data.grain_direction ?? null) as Profile['grainDirection'],
    userId: (data.userId as string) || (data.user_id as string) || undefined,
    createdAt: createdAtRaw ? new Date(String(createdAtRaw)) : undefined,
    updatedAt: updatedAtRaw ? new Date(String(updatedAtRaw)) : undefined,
  };
}

/** Inventory value that never yields NaN. */
export function profileInventoryValue(profile: Profile): number {
  const qty = Number.isFinite(profile.stockQuantity) ? profile.stockQuantity : 0;
  const cost = Number.isFinite(profile.costPerMeter) ? profile.costPerMeter : 0;
  return qty * cost;
}
