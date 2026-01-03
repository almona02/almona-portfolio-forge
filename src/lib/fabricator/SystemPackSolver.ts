/**
 * System Pack Constraint Solver
 * 
 * Enhanced with Egyptian filters (availability, structural, thermal, price, hardware).
 * Filters and ranks system packs based on engineering constraints.
 * 
 * This is the "Engineering Bay" approach - the system dictates the design.
 */

import type { SystemPack } from '@/data/systemPacks';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { calculateWindLoad } from '@/lib/codex/FormulaRegistry';

/**
 * Engineering constraints
 */
export interface EngineeringConstraints {
  windZone: 'inland' | 'coastal' | 'desert';
  buildingHeight: number; // Floors
  openingWidth: number; // mm
  openingHeight: number; // mm
  glazingType: 'single' | 'double' | 'triple' | 'laminated';
  requiredUValue?: number; // W/m²K
  budget?: number; // EGP per m²
  marketTier?: 'low' | 'medium' | 'high';
}

/**
 * System pack recommendation
 */
export interface SystemPackRecommendation {
  systemPack: SystemPack;
  score: number;
  reasons: string[];
  warnings: string[];
  isRecommended: boolean;
}

/**
 * System Pack Solver
 * 
 * Filters and ranks system packs based on engineering constraints
 */
export class SystemPackSolver {
  /**
   * Solve for system pack recommendations
   */
  solve(constraints: EngineeringConstraints): SystemPackRecommendation[] {
    // Step 1: Filter by Egyptian availability
    const egyptianAvailable = this.filterByEgyptianAvailability(SYSTEM_PACKS);

    // Step 2: Filter by structural limits
    const structurallyValid = this.filterByStructuralCapacity(
      egyptianAvailable,
      constraints
    );

    // Step 3: Filter by thermal performance
    const thermallyValid = this.filterByThermalPerformance(
      structurallyValid,
      constraints
    );

    // Step 4: Filter by price range (if budget specified)
    const priceFiltered = constraints.budget
      ? this.filterByPriceRange(thermallyValid, constraints.budget)
      : thermallyValid;

    // Step 5: Filter by hardware availability
    const hardwareValid = this.filterByHardwareAvailability(priceFiltered);

    // Step 6: Rank by optimization criteria
    return this.rankByOptimizationCriteria(hardwareValid, constraints);
  }

  /**
   * Filter by Egyptian availability
   */
  private filterByEgyptianAvailability(packs: SystemPack[]): SystemPack[] {
    return packs.filter(pack => {
      // Check if pack is available in Egypt region
      return pack.meta.regions.includes('egypt') || 
             pack.meta.regions.includes('mena') ||
             pack.meta.regions.includes('global');
    });
  }

  /**
   * Filter by structural capacity (moment of inertia tables per wind zone)
   */
  private filterByStructuralCapacity(
    packs: SystemPack[],
    constraints: EngineeringConstraints
  ): SystemPack[] {
    const _windLoad = calculateWindLoad(
      constraints.windZone,
      constraints.buildingHeight,
      1.0 // Topography factor (can be enhanced)
    );

    return packs.filter(pack => {
      const spec = pack.windowSystemSpec as any;
      const maxHeight = spec?.constraints?.maxHeightMm || 0;
      const maxWidth = spec?.constraints?.maxWidthMm || 0;

      // Check if opening fits within system limits
      if (constraints.openingHeight > maxHeight || constraints.openingWidth > maxWidth) {
        return false;
      }

      // For high-rise buildings, check if system supports reinforcement
      if (constraints.buildingHeight > 6) {
        // Some systems may not support high-rise applications
        // This would need to be in the system spec
        return true; // For now, allow all
      }

      return true;
    });
  }

  /**
   * Filter by thermal performance (Egyptian Green Building Code U-value requirements)
   */
  private filterByThermalPerformance(
    packs: SystemPack[],
    constraints: EngineeringConstraints
  ): SystemPack[] {
    if (!constraints.requiredUValue) {
      return packs; // No U-value requirement specified
    }

    return packs.filter(pack => {
      // Estimate U-value based on system and glazing
      // This is simplified - actual calculation would use FormulaRegistry
      const estimatedUValue = this.estimateUValue(pack, constraints.glazingType);
      return estimatedUValue <= constraints.requiredUValue!;
    });
  }

  /**
   * Estimate U-value for a system pack
   */
  private estimateUValue(
    pack: SystemPack,
    glazingType: string
  ): number {
    // Simplified estimation
    // ROCK 60 with 24mm double: ~2.8 W/m²K
    // JUMBO 100 with 24mm double: ~2.6 W/m²K
    // Panda with 24mm double: ~2.8 W/m²K

    const baseUValues: Record<string, number> = {
      'rock60': 2.8,
      'jumbo100': 2.6,
      'panda-50': 2.8,
      'panda-100': 2.7,
      'caluminium-ps': 2.9
    };

    const baseUValue = baseUValues[pack.meta.id] || 3.0;

    // Adjust for glazing type
    const glazingAdjustments: Record<string, number> = {
      'single': 0,
      'double': -0.5,
      'triple': -1.0,
      'laminated': -0.3
    };

    return baseUValue + (glazingAdjustments[glazingType] || 0);
  }

  /**
   * Filter by price range
   */
  private filterByPriceRange(
    packs: SystemPack[],
    budget: number
  ): SystemPack[] {
    // Price ranges in EGP/m² (Dec 2024)
    const priceRanges: Record<string, { min: number; max: number }> = {
      'panda-50': { min: 850, max: 1200 },
      'panda-100': { min: 1200, max: 1700 },
      'rock60': { min: 950, max: 1400 },
      'jumbo100': { min: 1200, max: 1700 },
      'caluminium-ps': { min: 1000, max: 1500 }
    };

    return packs.filter(pack => {
      const range = priceRanges[pack.meta.id];
      if (!range) return true; // Unknown price, don't filter
      return budget >= range.min;
    });
  }

  /**
   * Filter by hardware availability in Egypt
   */
  private filterByHardwareAvailability(packs: SystemPack[]): SystemPack[] {
    // For now, assume all packs have available hardware
    // This would check against EGYPTIAN_HARDWARE_DATABASE
    return packs;
  }

  /**
   * Rank by optimization criteria
   */
  private rankByOptimizationCriteria(
    packs: SystemPack[],
    constraints: EngineeringConstraints
  ): SystemPackRecommendation[] {
    return packs.map(pack => {
      let score = 0;
      const reasons: string[] = [];
      const warnings: string[] = [];

      // Market penetration (higher is better)
      const marketPenetration = (pack.windowSystemSpec as any)?.catalog_metadata?.marketPenetration || 50;
      score += marketPenetration * 0.5;
      if (marketPenetration > 80) {
        reasons.push(`High market penetration (${marketPenetration}%)`);
      }

      // Structural suitability
      const spec = pack.windowSystemSpec as any;
      const maxHeight = spec?.constraints?.maxHeightMm || 0;
      const maxWidth = spec?.constraints?.maxWidthMm || 0;
      
      if (constraints.openingHeight <= maxHeight * 0.8 && constraints.openingWidth <= maxWidth * 0.8) {
        score += 20;
        reasons.push('Well within structural limits');
      } else if (constraints.openingHeight > maxHeight * 0.9 || constraints.openingWidth > maxWidth * 0.9) {
        score -= 10;
        warnings.push('Near structural limits - may require reinforcement');
      }

      // Thermal performance
      const estimatedUValue = this.estimateUValue(pack, constraints.glazingType);
      if (constraints.requiredUValue && estimatedUValue <= constraints.requiredUValue) {
        score += 15;
        reasons.push(`U-value (${estimatedUValue.toFixed(1)}) meets requirement`);
      }

      // Egyptian market preference (Panda system gets bonus)
      if (pack.meta.id.includes('panda')) {
        score += 30;
        reasons.push('Panda system - 90% of Egyptian residential market');
      }

      // Price alignment (if budget specified)
      if (constraints.budget) {
        const priceRanges: Record<string, { min: number; max: number }> = {
          'panda-50': { min: 850, max: 1200 },
          'panda-100': { min: 1200, max: 1700 },
          'rock60': { min: 950, max: 1400 },
          'jumbo100': { min: 1200, max: 1700 }
        };
        const range = priceRanges[pack.meta.id];
        if (range) {
          const priceMid = (range.min + range.max) / 2;
          const priceDiff = Math.abs(priceMid - constraints.budget);
          score -= priceDiff * 0.1;
        }
      }

      return {
        systemPack: pack,
        score,
        reasons,
        warnings,
        isRecommended: score > 50
      };
    }).sort((a, b) => b.score - a.score);
  }
}

// Export singleton instance
export const systemPackSolver = new SystemPackSolver();

