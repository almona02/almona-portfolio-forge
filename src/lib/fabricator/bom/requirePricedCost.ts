/**
 * Fail-closed manufacturing price resolution.
 * Never coerce missing/expired/zero prices to 0.00 for BOM money lines.
 */

import {
  CALUMINIUM_PS_PRICING_EVIDENCE,
  MissingOrExpiredPriceError,
  isCaluminiumPsHardwarePriceProvisional,
  isCaluminiumPsHardwarePriceTbd,
  requireHardwareUnitPriceEgp,
  requireProfileCostPerMeterEgp,
} from '@/data/profileSystems/egyptian/caluminium/psPricingEvidence';
import type { Profile } from '@/types/fabricator';

export { MissingOrExpiredPriceError };

export type BomHardwarePriceStatus = 'priced' | 'provisional' | 'admin_override';

export type BomHardwarePriceResolution =
  | { status: 'priced'; unitPriceEgp: number; priceStatus: BomHardwarePriceStatus }
  | { status: 'tbd' };

export function requireBomProfileCostPerMeter(
  systemPackId: string | undefined,
  profile: Pick<Profile, 'id' | 'costPerMeter'>,
): number {
  // Dated evidence is mandatory for caluminium-ps manufacturing money lines.
  if (systemPackId === 'caluminium-ps' || profile.id.startsWith('PS-')) {
    return requireProfileCostPerMeterEgp(profile.id, CALUMINIUM_PS_PRICING_EVIDENCE);
  }
  // Legacy packs keep prior numeric-or-zero behaviour; PS never falls through here.
  const price = Number(profile.costPerMeter);
  return Number.isFinite(price) && price >= 0 ? price : 0;
}

/**
 * Resolve hardware unit price. TBD kits return `{ status: 'tbd' }` — never silent 0.00.
 * Provisional kits use evidence approx; positive pack kit unit_price is admin override.
 */
export function resolveBomHardwareUnitPrice(
  systemPackId: string | undefined,
  hardwareId: string,
  fallbackUnitPrice?: number,
): BomHardwarePriceResolution {
  if (systemPackId === 'caluminium-ps' || hardwareId.startsWith('ps_')) {
    if (isCaluminiumPsHardwarePriceTbd(hardwareId)) {
      return { status: 'tbd' };
    }
    if (isCaluminiumPsHardwarePriceProvisional(hardwareId)) {
      assertPricingForProvisional(hardwareId);
      const evidencePrice = CALUMINIUM_PS_PRICING_EVIDENCE.hardware[hardwareId];
      const admin = Number(fallbackUnitPrice);
      const adminOk = Number.isFinite(admin) && admin > 0;
      if (
        adminOk &&
        typeof evidencePrice === 'number' &&
        Number.isFinite(evidencePrice) &&
        admin !== evidencePrice
      ) {
        return { status: 'priced', unitPriceEgp: admin, priceStatus: 'admin_override' };
      }
      if (typeof evidencePrice === 'number' && Number.isFinite(evidencePrice) && evidencePrice > 0) {
        return {
          status: 'priced',
          unitPriceEgp: evidencePrice,
          priceStatus: 'provisional',
        };
      }
      if (adminOk) {
        return { status: 'priced', unitPriceEgp: admin, priceStatus: 'admin_override' };
      }
      return { status: 'tbd' };
    }
    return {
      status: 'priced',
      unitPriceEgp: requireHardwareUnitPriceEgp(hardwareId, CALUMINIUM_PS_PRICING_EVIDENCE),
      priceStatus: 'priced',
    };
  }
  const price = Number(fallbackUnitPrice);
  if (!Number.isFinite(price) || price < 0) {
    return { status: 'priced', unitPriceEgp: 0, priceStatus: 'priced' };
  }
  return { status: 'priced', unitPriceEgp: price, priceStatus: 'priced' };
}

function assertPricingForProvisional(hardwareId: string): void {
  // Keep date window fail-closed even for provisional kits.
  requireHardwareUnitPriceEgp(hardwareId, CALUMINIUM_PS_PRICING_EVIDENCE);
}

export function requireBomHardwareUnitPrice(
  systemPackId: string | undefined,
  hardwareId: string,
  fallbackUnitPrice?: number,
): number {
  const resolved = resolveBomHardwareUnitPrice(systemPackId, hardwareId, fallbackUnitPrice);
  if (resolved.status === 'tbd') {
    throw new MissingOrExpiredPriceError(
      `EGP unit price TBD for hardware ${hardwareId} (pack ${systemPackId ?? 'unknown'}) — awaiting owner confirmation`,
    );
  }
  return resolved.unitPriceEgp;
}
