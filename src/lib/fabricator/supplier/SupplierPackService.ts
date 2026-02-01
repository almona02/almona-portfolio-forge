/**
 * Supplier Pack Service - Tier 2 Advisory Service
 * 
 * Provides advisory suggestions from supplier packs.
 * All suggestions must pass Tier 3 validation before use.
 * 
 * Constitutional Compliance: AICS-001 §5.2 (Principle of Subordination)
 * 
 * @since Phase 2: Precision Upgrade Plan (January 2026)
 */

import type { SystemPack, WindowUnit } from '@/types/fabricator';
import { supplierPackCache } from './SupplierPackCache';
import { supplierPackValidator } from './SupplierPackValidator';
import type {
    ProfileSuggestion,
    ProfileSuggestionsResult,
    SupplierPack,
    Tier3ValidationResult,
} from './types';

/**
 * Supplier Pack Service
 * 
 * Provides Tier 2 advisory suggestions that must pass Tier 3 validation.
 */
export class SupplierPackService {
  private supplierPacks: Map<string, SupplierPack> = new Map();

  /**
   * Load supplier pack
   */
  async loadSupplierPack(packId: string, pack: SupplierPack): Promise<void> {
    // Validate pack before loading
    const validation = await supplierPackValidator.validatePack(pack);
    if (!validation.isValid) {
      throw new Error(
        `Supplier pack ${packId} failed validation: ${validation.message}`
      );
    }
    this.supplierPacks.set(packId, pack);
  }

  /**
   * Get supplier pack
   */
  getSupplierPack(packId: string): SupplierPack | undefined {
    return this.supplierPacks.get(packId);
  }

  /**
   * Suggest profile from supplier pack (Tier 2 - Advisory)
   * 
   * Constitutional Note: These are advisory suggestions.
   * Final selection must pass Tier 3 validation.
   * 
   * Performance: Uses caching to avoid redundant computations.
   */
  suggestProfile(
    windowUnit: WindowUnit,
    systemPack: SystemPack | null,
    supplierPackId?: string
  ): ProfileSuggestionsResult {
    // Check cache first
    const cached = supplierPackCache.getSuggestions(windowUnit, systemPack, supplierPackId);
    if (cached) {
      return cached;
    }

    // If no supplier pack specified, return empty suggestions
    if (!supplierPackId) {
      const result: ProfileSuggestionsResult = {
        suggestions: [],
        constitutionalNote:
          'No supplier pack specified. Suggestions are Tier 2 advisory only.',
        requiresTier3Validation: true as const,
      };
      supplierPackCache.setSuggestions(windowUnit, systemPack, supplierPackId, result);
      return result;
    }

    const pack = this.getSupplierPack(supplierPackId);
    if (!pack) {
      const result: ProfileSuggestionsResult = {
        suggestions: [],
        constitutionalNote: `Supplier pack ${supplierPackId} not found.`,
        requiresTier3Validation: true as const,
      };
      supplierPackCache.setSuggestions(windowUnit, systemPack, supplierPackId, result);
      return result;
    }

    // Filter profiles that match constraints
    const matchingProfiles = pack.profiles.filter((profile) =>
      this.matchesConstraints(profile, windowUnit, systemPack)
    );

    // Convert to suggestions (Tier 2 advisory)
    const suggestions: ProfileSuggestion[] = matchingProfiles.map((profile) => ({
      profileId: profile.profileId,
      supplier: pack.metadata.supplierId,
      price: profile.priceReference?.unitPrice,
      currency: profile.priceReference?.currency || 'EGP',
      tier: 'Tier 2',
      deterministic: false,
      confidence: 'advisory',
      availability: profile.availability,
      leadTime: profile.leadTime,
    }));

    const result: ProfileSuggestionsResult = {
      suggestions,
      constitutionalNote:
        'These are advisory suggestions. Final selection must pass Tier 3 validation.',
      requiresTier3Validation: true as const,
    };

    // Cache result
    supplierPackCache.setSuggestions(windowUnit, systemPack, supplierPackId, result);

    return result;
  }

  /**
   * Validate supplier suggestion against Tier 3 constraints
   * 
   * Constitutional Requirement: All supplier suggestions must pass Tier 3 validation.
   * 
   * Performance: Uses caching to avoid redundant validations.
   */
  validateSupplierSuggestion(
    suggestion: ProfileSuggestion,
    windowUnit: WindowUnit,
    systemPack: SystemPack | null
  ): Tier3ValidationResult {
    // Check cache first
    const cached = supplierPackCache.getValidation(suggestion.profileId, windowUnit, systemPack);
    if (cached) {
      return cached;
    }

    // Tier 3: Deterministic validation
    // In production, this would query the Tier 3 constraint engine
    // For now, we perform basic validation

    // Check that profile exists in system pack
    if (!systemPack) {
      const result: Tier3ValidationResult = {
        isValid: false,
        tier: 'Tier 3',
        deterministic: true as const,
        reason: 'System pack is required for Tier 3 validation',
        systemStop: true,
      };
      supplierPackCache.setValidation(suggestion.profileId, windowUnit, systemPack, result);
      return result;
    }

    // Check that suggestion profile is compatible with system pack
    const pack = this.getSupplierPack(suggestion.supplier);
    if (!pack) {
      const result: Tier3ValidationResult = {
        isValid: false,
        tier: 'Tier 3',
        deterministic: true as const,
        reason: `Supplier pack ${suggestion.supplier} not found`,
        systemStop: true,
      };
      supplierPackCache.setValidation(suggestion.profileId, windowUnit, systemPack, result);
      return result;
    }

    const profile = pack.profiles.find((p) => p.profileId === suggestion.profileId);
    if (!profile) {
      const result: Tier3ValidationResult = {
        isValid: false,
        tier: 'Tier 3',
        deterministic: true as const,
        reason: `Profile ${suggestion.profileId} not found in supplier pack`,
        systemStop: true,
      };
      supplierPackCache.setValidation(suggestion.profileId, windowUnit, systemPack, result);
      return result;
    }

    // Check compatibility with system pack
    // Handle both SystemPack types (from data/systemPacks.ts and types/fabricator.ts)
    const systemPackId = (systemPack as any).id || (systemPack as any).meta?.id || '';
    const isCompatible = systemPackId && profile.compatibleSystemPacks.includes(systemPackId);
    if (!isCompatible) {
      const result: Tier3ValidationResult = {
        isValid: false,
        tier: 'Tier 3',
        deterministic: true as const,
        reason: `Profile ${suggestion.profileId} is not compatible with system pack ${systemPackId}`,
        systemStop: true,
      };
      supplierPackCache.setValidation(suggestion.profileId, windowUnit, systemPack, result);
      return result;
    }

    // All validations passed
    const result: Tier3ValidationResult = {
      isValid: true,
      tier: 'Tier 3',
      deterministic: true as const,
      profileId: suggestion.profileId,
    };

    // Cache result
    supplierPackCache.setValidation(suggestion.profileId, windowUnit, systemPack, result);

    return result;
  }

  /**
   * Check if profile matches constraints
   * 
   * This is a simplified check. In production, this would query
   * the Tier 3 constraint engine for full validation.
   */
  private matchesConstraints(
    profile: SupplierPack['profiles'][0],
    windowUnit: WindowUnit,
    systemPack: SystemPack | null
  ): boolean {
    // Check material compatibility
    if (systemPack) {
      const systemMaterial = systemPack.category.includes('upvc') ? 'upvc' : 'aluminum';
      if (profile.material !== systemMaterial) {
        return false;
      }
    }

    // Check system pack compatibility
    if (systemPack && !profile.compatibleSystemPacks.includes(systemPack.id)) {
      return false;
    }

    // Additional constraint checks would go here
    // In production, this would query Tier 3 constraint engine

    return true;
  }

  /**
   * Get all supplier packs
   */
  getAllSupplierPacks(): SupplierPack[] {
    return Array.from(this.supplierPacks.values());
  }

  /**
   * Get supplier packs by region
   */
  getSupplierPacksByRegion(
    region: 'egypt' | 'uae' | 'saudi' | 'kuwait' | 'qatar'
  ): SupplierPack[] {
    return this.getAllSupplierPacks().filter((pack) =>
      pack.metadata.regions.includes(region)
    );
  }

  /**
   * Get supplier packs by tier
   */
  getSupplierPacksByTier(tier: 'Tier 1' | 'Tier 2' | 'Tier 3'): SupplierPack[] {
    return this.getAllSupplierPacks().filter(
      (pack) => pack.metadata.tier === tier
    );
  }
}

/**
 * Singleton instance
 */
export const supplierPackService = new SupplierPackService();

