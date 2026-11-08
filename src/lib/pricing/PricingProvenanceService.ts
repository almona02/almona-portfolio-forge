/**
 * Pricing Provenance Service (P1).
 *
 * Gives every live system_pricing block an answerable provenance: version, set
 * by whom, when, from what source, and why.
 *
 * Write path mirrors PricingTuningStudio.handleSave so both writers stay in
 * sync: append a versioned snapshot to system_pricing_history, stamp the live
 * fabricator_profiles row (system_pricing + system_pricing_provenance
 * sibling), then clear the SystemPricingService cache.
 *
 * Read path is sibling-first with history fallback, so prices saved by older
 * writers (which only appended history) still resolve a provenance.
 */

import { supabase } from '@/lib/supabase';
import type { SystemPricingState } from '@/types/pricing';
import {
  buildPricingProvenance,
  type CatalogProvenanceSource,
  type PricingProvenance,
} from '@/types/catalogProvenance';
import { priceHistoryService, type PriceHistoryEntry } from './PriceHistoryService';
import { systemPricingService } from './SystemPricingService';

export interface SavePricingInput {
  profileId: string;
  systemPackId: string;
  userId: string;
  pricing: SystemPricingState;
  reason?: string | null;
  source?: CatalogProvenanceSource;
}

export interface SavePricingResult {
  versionNumber: number;
  provenance: PricingProvenance;
  historyId: string;
}

function historyChangeToSource(changeType: PriceHistoryEntry['changeType']): CatalogProvenanceSource {
  if (changeType === 'rollback') return 'rollback';
  if (changeType === 'initial_setup') return 'initial_setup';
  return 'tuning_studio';
}

export class PricingProvenanceService {
  private static instance: PricingProvenanceService;

  private constructor() {}

  static getInstance(): PricingProvenanceService {
    if (!PricingProvenanceService.instance) {
      PricingProvenanceService.instance = new PricingProvenanceService();
    }
    return PricingProvenanceService.instance;
  }

  /**
   * Save pricing with provenance: history snapshot first (mints the version),
   * then the live row stamped with that version, then cache invalidation.
   */
  async savePricingWithProvenance(input: SavePricingInput): Promise<SavePricingResult> {
    const source = input.source ?? 'admin_catalog';
    const entry = await priceHistoryService.savePriceHistory(
      input.profileId,
      input.systemPackId,
      input.userId,
      input.pricing,
      source === 'rollback' ? 'rollback' : 'update',
      input.reason ?? undefined
    );

    const provenance = buildPricingProvenance({
      version: entry.versionNumber,
      updatedBy: input.userId,
      source,
      note: input.reason ?? null,
      currency: input.pricing.currency ?? null,
    });

    const db = supabase as any;
    const { data: profileData, error: readError } = await db
      .from('fabricator_profiles')
      .select('specifications')
      .eq('id', input.profileId)
      .single();
    if (readError) throw readError;

    const specs = (profileData?.specifications as Record<string, unknown>) || {};
    const { error: writeError } = await db
      .from('fabricator_profiles')
      .update({
        specifications: {
          ...specs,
          system_pricing: {
            ...input.pricing,
            initialized: true,
            systemName: input.systemPackId,
          },
          system_pricing_provenance: provenance,
        },
      })
      .eq('id', input.profileId)
      .eq('user_id', input.userId);
    if (writeError) throw writeError;

    systemPricingService.clearCache(input.profileId, input.systemPackId);

    return { versionNumber: entry.versionNumber, provenance, historyId: entry.id };
  }

  /**
   * Resolve live provenance: stamped sibling first, latest history snapshot
   * as fallback for prices saved by older writers. Null when unpriced.
   */
  async resolvePricingProvenance(
    profileId: string,
    systemPackId: string
  ): Promise<PricingProvenance | null> {
    const db = supabase as any;
    const { data, error } = await db
      .from('fabricator_profiles')
      .select('specifications')
      .eq('id', profileId)
      .single();
    if (error || !data) return null;

    const specs = (data.specifications as Record<string, unknown>) || {};
    const stamped = specs.system_pricing_provenance as PricingProvenance | undefined;
    if (stamped && typeof stamped.version === 'number') return stamped;
    if (!specs.system_pricing && !specs.rock60_pricing) return null;

    const latest = await priceHistoryService.getLatestVersion(profileId, systemPackId);
    if (!latest) return null;
    return buildPricingProvenance({
      version: latest.versionNumber,
      updatedBy: latest.userId,
      updatedAt: latest.createdAt.toISOString(),
      source: historyChangeToSource(latest.changeType),
      note: latest.reason ?? null,
      currency: (latest.pricingData as SystemPricingState | undefined)?.currency ?? null,
    });
  }
}

export const pricingProvenanceService = PricingProvenanceService.getInstance();
