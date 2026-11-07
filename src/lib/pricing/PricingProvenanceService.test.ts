/**
 * Pricing provenance service — Supabase mocked, no database.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SystemPricingState } from '@/types/pricing';

const mocks = vi.hoisted(() => ({ chains: {} as Record<string, any> }));

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (table: string) => mocks.chains[table] },
}));

import { pricingProvenanceService } from './PricingProvenanceService';

const CHAIN_METHODS = ['select', 'eq', 'gte', 'lte', 'order', 'limit', 'range', 'single', 'maybeSingle', 'update', 'insert'];

function chainable(terminal: Record<string, (...args: any[]) => any>, awaited: any = { error: null }): any {
  const chain: Record<string, any> = {};
  for (const key of CHAIN_METHODS) {
    chain[key] = vi.fn((...args: any[]) => (key in terminal ? terminal[key](...args) : chain));
  }
  // Support `await query.update(...).eq(...)` style chains.
  chain.then = (resolve: (value: any) => void) => resolve(awaited);
  return chain;
}

const pricing = {
  currency: 'EGP',
  aluminumPricePerKg: 120,
  glazingTypes: [],
  hardware: {},
  profilePrices: {},
} as unknown as SystemPricingState;

function historyRow(version: number) {
  return {
    id: `h${version}`,
    system_pack_id: 'pack-1',
    profile_id: 'profile-1',
    user_id: 'user-1',
    pricing_data: pricing,
    change_type: 'update',
    reason: 'Q4 update',
    version_number: version,
    created_at: '2026-11-06T00:00:00.000Z',
  };
}

describe('savePricingWithProvenance', () => {
  beforeEach(() => {
    mocks.chains = {};
  });

  it('mints the version from history, stamps the live row, and returns provenance', async () => {
    let singleCalls = 0;
    mocks.chains['system_pricing_history'] = chainable({
      // First single(): max-version lookup → v4 exists. Second: insert return → v5 row.
      single: vi.fn(async () => {
        singleCalls += 1;
        if (singleCalls === 1) return { data: { version_number: 4 }, error: null };
        return { data: historyRow(5), error: null };
      }),
    });
    const profilesChain = chainable({
      single: vi.fn(async () => ({ data: { specifications: {} }, error: null })),
    });
    mocks.chains['fabricator_profiles'] = profilesChain;

    const result = await pricingProvenanceService.savePricingWithProvenance({
      profileId: 'profile-1',
      systemPackId: 'pack-1',
      userId: 'user-1',
      pricing,
      reason: 'Q4 update',
      source: 'admin_catalog',
    });

    expect(result.versionNumber).toBe(5);
    expect(result.provenance).toMatchObject({
      version: 5,
      updatedBy: 'user-1',
      source: 'admin_catalog',
      note: 'Q4 update',
      currency: 'EGP',
    });
    expect(profilesChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        specifications: expect.objectContaining({
          system_pricing: expect.objectContaining({ initialized: true, systemName: 'pack-1' }),
          system_pricing_provenance: expect.objectContaining({ version: 5 }),
        }),
      })
    );
  });
});

describe('resolvePricingProvenance', () => {
  beforeEach(() => {
    mocks.chains = {};
  });

  it('prefers the stamped sibling without touching history', async () => {
    const stamped = { version: 7, updatedBy: 'user-1', updatedAt: '2026-11-06T00:00:00Z', source: 'admin_catalog', note: null, currency: 'EGP' };
    const historySingle = vi.fn(async () => ({ data: null, error: { code: 'PGRST116' } }));
    mocks.chains['fabricator_profiles'] = chainable({
      single: vi.fn(async () => ({
        data: { specifications: { system_pricing: { initialized: true }, system_pricing_provenance: stamped } },
        error: null,
      })),
    });
    mocks.chains['system_pricing_history'] = chainable({ single: historySingle });

    await expect(pricingProvenanceService.resolvePricingProvenance('profile-1', 'pack-1')).resolves.toEqual(stamped);
    expect(historySingle).not.toHaveBeenCalled();
  });

  it('falls back to the latest history snapshot for older writers', async () => {
    mocks.chains['fabricator_profiles'] = chainable({
      single: vi.fn(async () => ({ data: { specifications: { system_pricing: { initialized: true } } }, error: null })),
    });
    mocks.chains['system_pricing_history'] = chainable({
      single: vi.fn(async () => ({ data: historyRow(3), error: null })),
    });

    const provenance = await pricingProvenanceService.resolvePricingProvenance('profile-1', 'pack-1');
    expect(provenance).toMatchObject({ version: 3, updatedBy: 'user-1', source: 'tuning_studio', note: 'Q4 update' });
  });

  it('returns null when no pricing exists', async () => {
    mocks.chains['fabricator_profiles'] = chainable({
      single: vi.fn(async () => ({ data: { specifications: {} }, error: null })),
    });
    mocks.chains['system_pricing_history'] = chainable({
      single: vi.fn(async () => ({ data: null, error: { code: 'PGRST116' } })),
    });
    await expect(pricingProvenanceService.resolvePricingProvenance('profile-1', 'pack-1')).resolves.toBeNull();
  });
});
