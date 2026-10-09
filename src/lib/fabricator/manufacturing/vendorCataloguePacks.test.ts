import { describe, expect, it } from 'vitest';
import {
  VENDOR_CATALOGUE_PACKS,
  buildVendorAuthorityPayload,
} from './vendorCataloguePacks';

describe('vendorCataloguePacks', () => {
  it('includes caluminium-ps with PS frame/sash members', () => {
    const ps = VENDOR_CATALOGUE_PACKS.find((p) => p.id === 'caluminium-ps');
    expect(ps?.frameProfileId).toBe('PS-6601-FRAME');
    expect(ps?.sashProfileId).toBe('PS-5600-SASH');
    expect(ps?.extraProfiles?.some((p) => p.profileId === 'PS-6601-TRACK')).toBe(true);
  });

  it('builds authority payload with approved evidence and revision', () => {
    const pack = VENDOR_CATALOGUE_PACKS[0];
    const payload = buildVendorAuthorityPayload(pack, 'd1000000-0000-4000-8000-000000000099', 2);
    expect(payload.schema).toBe('almona.manufacturing-authority');
    expect((payload.systemPack as { revision: number }).revision).toBe(2);
    expect((payload.systemPack as { approvalId: string }).approvalId).toBe(
      'd1000000-0000-4000-8000-000000000099',
    );
    expect(Array.isArray(payload.profiles)).toBe(true);
    expect((payload.profiles as unknown[]).length).toBeGreaterThanOrEqual(2);
  });
});
