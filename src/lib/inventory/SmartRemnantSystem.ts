/**
 * Smart Remnant Ecosystem
 * Enhanced remnant management with:
 * - Predictive reuse with ML-based matching
 * - Multi-location tracking (workshop-wide remnant visibility)
 * - Remnant marketplace (buy/sell between workshops)
 * - Auto-remnant prioritization (smart suggestion engine)
 */

import { Cut, Profile } from '@/types/fabricator';
import { Remnant, RemnantManager, RemnantMatch } from './RemnantManager';
import { remnantPredictor } from './RemnantPredictor';

export interface RemnantMarketplaceListing {
  id: string;
  remnantId: string;
  sellerWorkshopId: string;
  sellerWorkshopName: string;
  price: number;
  currency: string;
  status: 'available' | 'reserved' | 'sold';
  listedAt: Date;
  expiresAt?: Date;
}

export interface RemnantSuggestion {
  remnant: Remnant;
  matchScore: number;
  predictedReuseLikelihood: number;
  estimatedSavings: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface MultiLocationRemnantView {
  locationId: string;
  locationName: string;
  remnants: Remnant[];
  totalLength: number;
  totalValue: number;
  utilizationRate: number;
}

export class SmartRemnantSystem {
  private remnantManager: RemnantManager;

  constructor(remnantManager: RemnantManager) {
    this.remnantManager = remnantManager;
  }

  /**
   * Find remnants with predictive reuse scoring
   */
  async findPredictiveRemnantMatches(
    cuts: Cut[],
    profile: Profile,
    options: {
      maxSuggestions?: number;
      minMatchScore?: number;
      includeMultiLocation?: boolean;
      prioritizeLocation?: string;
    } = {}
  ): Promise<RemnantSuggestion[]> {
    const suggestions: RemnantSuggestion[] = [];

    // Find all matching remnants (including multi-location if enabled)
    const matches = await this.remnantManager.findRemnantMatches(
      cuts,
      profile,
      profile.material,
      {
        useRemnantsFirst: true,
        locationId: options.prioritizeLocation,
      }
    );

    // Score each match with DETERMINISTIC prediction (CONSTITUTIONAL)
    for (const match of matches) {
      try {
        // DETERMINISTIC ONLY: Rule-based prediction
        const reuseLikelihood = await remnantPredictor.predictReuseLikelihood(match.remnant);

        // Calculate match score (combination of utilization and deterministic prediction)
        const utilizationScore = match.utilization / 100;
        const predictionScore = reuseLikelihood / 100;
        const locationScore = this.calculateLocationScore(
          match.remnant,
          options.prioritizeLocation
        );

        const matchScore = (
          utilizationScore * 0.4 +
          predictionScore * 0.4 +
          locationScore * 0.2
        ) * 100;

        // Calculate estimated savings
        const estimatedSavings = match.savings || 0;

        // Determine priority
        let priority: 'high' | 'medium' | 'low' = 'medium';
        if (matchScore >= 80 && estimatedSavings > 100) {
          priority = 'high';
        } else if (matchScore < 50 || estimatedSavings < 20) {
          priority = 'low';
        }

        // Generate reason
        const reason = this.generateSuggestionReason(
          match,
          { reuseLikelihood },
          locationScore
        );

        suggestions.push({
          remnant: match.remnant,
          matchScore,
          predictedReuseLikelihood: reuseLikelihood,
          estimatedSavings,
          reason,
          priority,
        });
      } catch (error) {
        console.warn('Error scoring remnant match:', error);
      }
    }

    // Sort by match score and priority
    suggestions.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.matchScore - a.matchScore;
    });

    // Apply filters
    const maxSuggestions = options.maxSuggestions || 10;
    const minMatchScore = options.minMatchScore || 50;

    return suggestions
      .filter((s) => s.matchScore >= minMatchScore)
      .slice(0, maxSuggestions);
  }

  /**
   * Get workshop-wide remnant visibility (multi-location view)
   */
  async getMultiLocationRemnantView(
    userId: string,
    _options: {
      profileId?: string;
      material?: string;
      minLength?: number;
    } = {}
  ): Promise<MultiLocationRemnantView[]> {
    // This would query all locations for the user's workshop
    // For now, return a placeholder structure
    // In production, this would query the database for all locations
    
    const views: MultiLocationRemnantView[] = [];

    // TODO: Implement actual multi-location query
    // const locations = await this.getWorkshopLocations(userId);
    // for (const location of locations) {
    //   const remnants = await this.remnantManager.getRemnantsByLocation(
    //     userId,
    //     location.id,
    //     options
    //   );
    //   ...
    // }

    return views;
  }

  /**
   * List remnant on marketplace
   */
  async listRemnantOnMarketplace(
    remnantId: string,
    sellerWorkshopId: string,
    price: number,
    currency: string = 'EGP',
    expiresInDays: number = 30
  ): Promise<RemnantMarketplaceListing> {
    // TODO: Implement marketplace listing
    // This would create a listing in a marketplace table
    
    const listing: RemnantMarketplaceListing = {
      id: `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      remnantId,
      sellerWorkshopId,
      sellerWorkshopName: 'Workshop Name', // Would fetch from database
      price,
      currency,
      status: 'available',
      listedAt: new Date(),
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
    };

    return listing;
  }

  /**
   * Auto-prioritize remnants for a job
   */
  async autoPrioritizeRemnants(
    cuts: Cut[],
    profile: Profile,
    options: {
      maxSuggestions?: number;
      considerMarketplace?: boolean;
    } = {}
  ): Promise<RemnantSuggestion[]> {
    // Get predictive matches
    const suggestions = await this.findPredictiveRemnantMatches(cuts, profile, {
      maxSuggestions: options.maxSuggestions || 20,
      includeMultiLocation: true,
    });

    // If marketplace is enabled, also check marketplace listings
    if (options.considerMarketplace) {
      // TODO: Query marketplace for matching remnants
      // const marketplaceRemnants = await this.queryMarketplace(cuts, profile);
      // suggestions.push(...marketplaceRemnants);
    }

    // Re-sort with updated priorities
    suggestions.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.matchScore - a.matchScore;
    });

    return suggestions.slice(0, options.maxSuggestions || 10);
  }

  /**
   * Calculate location score for prioritization
   */
  private calculateLocationScore(
    remnant: Remnant,
    prioritizeLocation?: string
  ): number {
    if (!prioritizeLocation) {
      return 1.0; // No location preference
    }

    if (remnant.locationId === prioritizeLocation || 
        remnant.locationName === prioritizeLocation) {
      return 1.0; // Preferred location
    }

    // Main location gets higher score
    if (remnant.locationName === 'main' || remnant.locationName === 'Main') {
      return 0.8;
    }

    return 0.6; // Other locations
  }

  /**
   * Generate human-readable reason for suggestion
   */
  private generateSuggestionReason(
    match: RemnantMatch,
    mlPrediction: any,
    locationScore: number
  ): string {
    const reasons: string[] = [];

    if (match.utilization > 90) {
      reasons.push('Excellent utilization');
    }

    if (mlPrediction.reuseLikelihood > 80) {
      reasons.push('High reuse likelihood');
    }

    if (locationScore === 1.0) {
      reasons.push('Preferred location');
    }

    if (match.savings && match.savings > 100) {
      reasons.push(`Significant savings (${match.savings.toFixed(0)} EGP)`);
    }

    return reasons.length > 0 
      ? reasons.join(', ')
      : 'Good match for your requirements';
  }
}

