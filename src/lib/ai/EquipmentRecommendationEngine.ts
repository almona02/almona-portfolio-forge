/**
 * Equipment Recommendation Engine
 * Matches user requirements to products and returns recommendations
 */

export interface EquipmentRequirement {
  windowTypes: string[];
  monthlyVolume: number;
  budget: number;
  currency?: string;
}

export interface EquipmentRecommendation {
  productId: string;
  productName: string;
  matchScore: number;
  price: number;
  currency: string;
  reasons: string[];
  features: string[];
}

export class EquipmentRecommendationEngine {
  /**
   * Get equipment recommendations based on requirements
   */
  async getRecommendations(
    requirements: EquipmentRequirement,
    availableProducts: Array<{
      id: string;
      name: string;
      price: number;
      currency: string;
      features: string[];
      windowTypes: string[];
      monthlyCapacity?: number;
    }>
  ): Promise<EquipmentRecommendation[]> {
    const recommendations: EquipmentRecommendation[] = [];

    for (const product of availableProducts) {
      let matchScore = 0;
      const reasons: string[] = [];

      // Check window type compatibility
      const typeMatch = requirements.windowTypes.some((type) =>
        product.windowTypes.includes(type)
      );
      if (typeMatch) {
        matchScore += 30;
        reasons.push(`Supports ${requirements.windowTypes.join(', ')} window types`);
      }

      // Check volume capacity
      if (product.monthlyCapacity) {
        const capacityRatio = product.monthlyCapacity / requirements.monthlyVolume;
        if (capacityRatio >= 1.0 && capacityRatio <= 1.5) {
          matchScore += 30;
          reasons.push('Perfect capacity match for your volume');
        } else if (capacityRatio > 1.5) {
          matchScore += 20;
          reasons.push('High capacity - room for growth');
        } else {
          matchScore += 10;
          reasons.push('May need multiple units for your volume');
        }
      }

      // Check budget compatibility
      const priceRatio = product.price / requirements.budget;
      if (priceRatio <= 1.0 && priceRatio >= 0.8) {
        matchScore += 25;
        reasons.push('Within your budget range');
      } else if (priceRatio < 0.8) {
        matchScore += 15;
        reasons.push('Below budget - good value');
      } else if (priceRatio <= 1.2) {
        matchScore += 10;
        reasons.push('Slightly over budget but good value');
      } else {
        matchScore -= 20; // Penalty for being too expensive
      }

      // Feature matching
      const featureMatch = product.features.length;
      matchScore += Math.min(15, featureMatch * 2);
      if (featureMatch > 0) {
        reasons.push(`Includes ${featureMatch} advanced features`);
      }

      if (matchScore > 0) {
        recommendations.push({
          productId: product.id,
          productName: product.name,
          matchScore: Math.min(100, Math.max(0, matchScore)),
          price: product.price,
          currency: product.currency,
          reasons,
          features: product.features,
        });
      }
    }

    // Sort by match score and return top 3
    return recommendations.sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);
  }
}

export const equipmentRecommendationEngine = new EquipmentRecommendationEngine();

