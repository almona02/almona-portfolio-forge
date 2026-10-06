/**
 * PR3 — ledger-backed stock analytics (no AI / demand-forecast claims).
 * Consumption, ageing, reorder coverage and remnant reuse from recorded data only.
 */

import { partitionProductionInventory } from './testStock';

export interface StockAnalyticsProfile {
  id: string;
  name?: string | null;
  stockQuantity: number;
  minStockLevel: number;
  costPerMeter: number;
  specifications?: unknown;
}

export interface StockAnalyticsMovement {
  profileId: string;
  movementType: string;
  quantity: number;
  unit: string;
  canonicalMetres?: number | null;
  createdAt: Date | string;
}

export interface StockAnalyticsRemnantStats {
  totalRemnants: number;
  availableRemnants: number;
  unusedRemnants: number;
}

export interface StockAnalyticsReport {
  productionProfiles: number;
  testStockExcluded: number;
  totalMetresOnHand: number;
  totalInventoryValue: number;
  consumedMetres30d: number;
  intakeMetres30d: number;
  /** Profiles with a ledger touch in the last 30 days */
  activeProfiles30d: number;
  /** Profiles whose newest loaded movement is older than 90 days */
  ageingOver90d: number;
  /** Profiles with no movement in the provided ledger sample */
  ageingUnknown: number;
  /**
   * Metres needed to reach min stock for production profiles only.
   * This is threshold coverage — not a demand forecast.
   */
  reorderCoverageMetres: number;
  /** available / total remnants when totals exist; otherwise null */
  remnantReuseRate: number | null;
  notes: string[];
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function metresOf(movement: StockAnalyticsMovement): number {
  if (typeof movement.canonicalMetres === 'number' && Number.isFinite(movement.canonicalMetres)) {
    return movement.canonicalMetres;
  }
  const qty = Number(movement.quantity);
  if (!Number.isFinite(qty)) return 0;
  const unit = (movement.unit || '').toLowerCase();
  if (unit === 'meters' || unit === 'metres' || unit === 'm') return qty;
  // Pieces/kg without canonical metres are not inventable metre consumption.
  return 0;
}

function isConsumption(type: string): boolean {
  const t = type.toLowerCase();
  return t === 'out' || t === 'consumption' || t === 'consume' || t === 'adjustment_out';
}

function isIntake(type: string): boolean {
  const t = type.toLowerCase();
  return t === 'in' || t === 'purchase' || t === 'opening' || t === 'adjustment_in' || t === 'return';
}

export function computeStockAnalytics(input: {
  profiles: StockAnalyticsProfile[];
  movements: StockAnalyticsMovement[];
  remnantStats?: StockAnalyticsRemnantStats | null;
  now?: Date;
}): StockAnalyticsReport {
  const now = input.now ?? new Date();
  const windowMs = 30 * 24 * 60 * 60 * 1000;
  const ageingMs = 90 * 24 * 60 * 60 * 1000;
  const since30 = now.getTime() - windowMs;

  const { production, testStock } = partitionProductionInventory(input.profiles);
  const productionIds = new Set(production.map((p) => p.id));

  const notes: string[] = [
    'Values exclude lots marked TEST STOCK.',
    'Reorder coverage is metres below each profile minimum — not a sales forecast.',
  ];
  if (testStock.length > 0) {
    notes.push(`${testStock.length} test stock lot(s) excluded from production readiness.`);
  }

  let totalMetresOnHand = 0;
  let totalInventoryValue = 0;
  let reorderCoverageMetres = 0;
  for (const profile of production) {
    const qty = Number(profile.stockQuantity) || 0;
    const cost = Number(profile.costPerMeter) || 0;
    const min = Number(profile.minStockLevel) || 0;
    totalMetresOnHand += qty;
    totalInventoryValue += qty * cost;
    if (qty < min) reorderCoverageMetres += min - qty;
  }

  let consumedMetres30d = 0;
  let intakeMetres30d = 0;
  const lastTouch = new Map<string, number>();

  for (const movement of input.movements) {
    if (!productionIds.has(movement.profileId)) continue;
    const at = toDate(movement.createdAt).getTime();
    if (!Number.isFinite(at)) continue;
    const prev = lastTouch.get(movement.profileId);
    if (prev === undefined || at > prev) lastTouch.set(movement.profileId, at);

    const metres = metresOf(movement);
    if (at < since30) continue;
    if (isConsumption(movement.movementType)) consumedMetres30d += Math.abs(metres);
    if (isIntake(movement.movementType)) intakeMetres30d += Math.abs(metres);
  }

  let activeProfiles30d = 0;
  let ageingOver90d = 0;
  let ageingUnknown = 0;
  for (const profile of production) {
    const touch = lastTouch.get(profile.id);
    if (touch === undefined) {
      ageingUnknown += 1;
      continue;
    }
    const age = now.getTime() - touch;
    if (age <= windowMs) activeProfiles30d += 1;
    if (age > ageingMs) ageingOver90d += 1;
  }

  let remnantReuseRate: number | null = null;
  const remnantStats = input.remnantStats;
  if (remnantStats && remnantStats.totalRemnants > 0) {
    remnantReuseRate = remnantStats.availableRemnants / remnantStats.totalRemnants;
    notes.push(
      `Remnant reuse rate uses available÷total remnants (${remnantStats.availableRemnants}/${remnantStats.totalRemnants}).`,
    );
  } else {
    notes.push('Remnant reuse rate unavailable until remnant statistics load.');
  }

  if (input.movements.length === 0) {
    notes.push('No ledger movements in the analytics sample — ageing/consumption stay at zero until history loads.');
  }

  return {
    productionProfiles: production.length,
    testStockExcluded: testStock.length,
    totalMetresOnHand,
    totalInventoryValue,
    consumedMetres30d,
    intakeMetres30d,
    activeProfiles30d,
    ageingOver90d,
    ageingUnknown,
    reorderCoverageMetres,
    remnantReuseRate,
    notes,
  };
}
