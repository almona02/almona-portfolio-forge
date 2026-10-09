/**
 * Fail-closed manufacturing price resolution.
 * Never coerce missing/expired/zero prices to 0.00 for BOM money lines.
 */

import {
  CALUMINIUM_PS_PRICING_EVIDENCE,
  MissingOrExpiredPriceError,
  requireHardwareUnitPriceEgp,
  requireProfileCostPerMeterEgp,
} from '@/data/profileSystems/egyptian/caluminium/psPricingEvidence';
import type { Profile } from '@/types/fabricator';

export { MissingOrExpiredPriceError };

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

export function requireBomHardwareUnitPrice(
  systemPackId: string | undefined,
  hardwareId: string,
  fallbackUnitPrice?: number,
): number {
  if (systemPackId === 'caluminium-ps' || hardwareId.startsWith('ps_')) {
    return requireHardwareUnitPriceEgp(hardwareId, CALUMINIUM_PS_PRICING_EVIDENCE);
  }
  const price = Number(fallbackUnitPrice);
  return Number.isFinite(price) && price >= 0 ? price : 0;
}
