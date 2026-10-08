/**
 * Dated pricing evidence for CALUMINIUM PS (caluminium-ps).
 *
 * Source of truth for manufacturing BOM money lines. Anonymous hardcoded
 * costPerMeter / unit_price values must not be treated as verified without
 * this schedule. BOM code consults these helpers and fails closed on
 * missing, non-positive, or expired prices.
 *
 * Currency: EGP
 * Effective: 2026-10-01 — Expires: 2027-01-01 (90-day workshop schedule)
 * Source: Cairo distributor / fabricator workshop purchase schedule for
 * CALUMINIUM PS 6600/9600/5600/4800/100 members (recorded 2026-10-08).
 */

export type PricingSourceKind = 'workshop_schedule' | 'supplier_quote' | 'distributor_list';

export interface DatedPricingEvidence {
  systemPackId: 'caluminium-ps';
  currency: 'EGP';
  effectiveDate: string;
  expiresAt: string;
  source: {
    kind: PricingSourceKind;
    reference: string;
    recordedAt: string;
    market: 'egypt';
  };
  /** EGP per linear metre */
  profiles: Record<string, number>;
  /** EGP per unit */
  hardware: Record<string, number>;
}

export const CALUMINIUM_PS_PRICING_EVIDENCE: DatedPricingEvidence = {
  systemPackId: 'caluminium-ps',
  currency: 'EGP',
  effectiveDate: '2026-10-01',
  expiresAt: '2027-01-01',
  source: {
    kind: 'workshop_schedule',
    reference:
      'Cairo CALUMINIUM distributor workshop purchase schedule — PS members (PS-6601/9601/5600/4800/101 + sliding hardware kits)',
    recordedAt: '2026-10-08',
    market: 'egypt',
  },
  profiles: {
    'PS-6601-FRAME': 185,
    'PS-9601-FRAME': 220,
    'PS-6601-SASH': 165,
    'PS-6601-INTERLOCK': 95,
    'PS-6601-TRACK': 110,
    'PS-6601-BEAD': 42,
    'PS-5600-FRAME': 170,
    'PS-5600-SASH': 155,
    'PS-4800-FRAME': 145,
    'PS-101-MULLION': 310,
  },
  hardware: {
    ps_sliding_roller: 15,
    ps_interlock_kit: 45,
    ps_hinge_kit: 12,
    // ps_sliding_handle / ps_sliding_lock — owner price confirmation pending (#63 hold)
  },
};

/** Registered PS sliding kits awaiting owner EGP unit prices (never invent 0.00). */
export const CALUMINIUM_PS_HARDWARE_PRICE_TBD = [
  'ps_sliding_handle',
  'ps_sliding_lock',
] as const;

export type CaluminiumPsHardwarePriceTbdId =
  (typeof CALUMINIUM_PS_HARDWARE_PRICE_TBD)[number];

export function isCaluminiumPsHardwarePriceTbd(hardwareId: string): boolean {
  return (CALUMINIUM_PS_HARDWARE_PRICE_TBD as readonly string[]).includes(hardwareId);
}

export class MissingOrExpiredPriceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingOrExpiredPriceError';
  }
}

function asUtcDay(isoDate: string): number {
  const t = Date.parse(`${isoDate}T00:00:00.000Z`);
  if (!Number.isFinite(t)) {
    throw new MissingOrExpiredPriceError(`Invalid pricing date: ${isoDate}`);
  }
  return t;
}

export function assertPricingEvidenceCurrent(
  evidence: DatedPricingEvidence,
  asOfIsoDate: string = new Date().toISOString().slice(0, 10),
): void {
  const asOf = asUtcDay(asOfIsoDate);
  const effective = asUtcDay(evidence.effectiveDate);
  const expires = asUtcDay(evidence.expiresAt);
  if (asOf < effective) {
    throw new MissingOrExpiredPriceError(
      `Pricing evidence for ${evidence.systemPackId} not yet effective (effective ${evidence.effectiveDate}, asOf ${asOfIsoDate})`,
    );
  }
  if (asOf > expires) {
    throw new MissingOrExpiredPriceError(
      `Pricing evidence for ${evidence.systemPackId} expired on ${evidence.expiresAt} (asOf ${asOfIsoDate})`,
    );
  }
}

export function requireProfileCostPerMeterEgp(
  profileId: string,
  evidence: DatedPricingEvidence = CALUMINIUM_PS_PRICING_EVIDENCE,
  asOfIsoDate?: string,
): number {
  assertPricingEvidenceCurrent(evidence, asOfIsoDate);
  const price = evidence.profiles[profileId];
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    throw new MissingOrExpiredPriceError(
      `Missing or non-positive EGP/m price for profile ${profileId} in ${evidence.systemPackId} evidence (${evidence.source.reference})`,
    );
  }
  return price;
}

export function requireHardwareUnitPriceEgp(
  hardwareId: string,
  evidence: DatedPricingEvidence = CALUMINIUM_PS_PRICING_EVIDENCE,
  asOfIsoDate?: string,
): number {
  assertPricingEvidenceCurrent(evidence, asOfIsoDate);
  const price = evidence.hardware[hardwareId];
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    throw new MissingOrExpiredPriceError(
      `Missing or non-positive EGP unit price for hardware ${hardwareId} in ${evidence.systemPackId} evidence (${evidence.source.reference})`,
    );
  }
  return price;
}

/** Provenance stamp attached to pack / BOM metadata (not a price itself). */
export function pricingProvenanceStamp(
  evidence: DatedPricingEvidence = CALUMINIUM_PS_PRICING_EVIDENCE,
) {
  return {
    systemPackId: evidence.systemPackId,
    currency: evidence.currency,
    effectiveDate: evidence.effectiveDate,
    expiresAt: evidence.expiresAt,
    sourceKind: evidence.source.kind,
    sourceReference: evidence.source.reference,
    recordedAt: evidence.source.recordedAt,
    market: evidence.source.market,
  };
}
