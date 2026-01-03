/**
 * Supply Chain Intelligence System
 * Features:
 * - Optimal order timing prediction (ML predicts best time to order materials)
 * - Supplier performance tracking (rate material quality by supplier)
 * - Price trend analysis (forecast material cost changes)
 * - Remnant marketplace integration (sell/buy remnants across fabricator network)
 */

import { Profile } from '@/types/fabricator';

export interface Supplier {
  id: string;
  name: string;
  region: string;
  materials: string[];
  averageRating: number;
  totalOrders: number;
  onTimeDeliveryRate: number;
  qualityScore: number;
  priceCompetitiveness: number;
}

export interface SupplierPerformance {
  supplierId: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  metrics: {
    totalOrders: number;
    onTimeDelivery: number;
    qualityIssues: number;
    averageRating: number;
    totalSpent: number;
  };
  trends: {
    deliveryTime: 'improving' | 'stable' | 'declining';
    quality: 'improving' | 'stable' | 'declining';
    pricing: 'increasing' | 'stable' | 'decreasing';
  };
}

export interface PriceTrend {
  material: string;
  profileId?: string;
  currentPrice: number;
  currency: string;
  trend: 'increasing' | 'stable' | 'decreasing';
  forecast: PriceForecast[];
  confidence: number;
}

export interface PriceForecast {
  date: Date;
  predictedPrice: number;
  confidence: number;
  factors: string[];
}

export interface OptimalOrderTiming {
  material: string;
  profileId?: string;
  recommendedOrderDate: Date;
  currentStockLevel: number;
  predictedStockoutDate: Date;
  optimalQuantity: number;
  reasoning: string;
  confidence: number;
}

export interface MaterialOrderRecommendation {
  profileId: string;
  profileName: string;
  currentStock: number;
  minStockLevel: number;
  recommendedQuantity: number;
  recommendedSupplier: string;
  estimatedCost: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
}

export class SupplyChainIntelligence {
  private suppliers: Map<string, Supplier> = new Map();
  private priceHistory: Map<string, PriceTrend[]> = new Map();
  private orderHistory: Map<string, any[]> = new Map();

  /**
   * Predict optimal order timing for materials
   */
  async predictOptimalOrderTiming(
    profile: Profile,
    options: {
      leadTimeDays?: number;
      consumptionRate?: number; // units per day
      minStockLevel?: number;
    } = {}
  ): Promise<OptimalOrderTiming> {
    const leadTime = options.leadTimeDays || 14;
    const consumptionRate = options.consumptionRate || this.estimateConsumptionRate(profile);
    const minStock = options.minStockLevel || profile.minStockLevel || 10;

    const currentStock = profile.stockQuantity || 0;
    const daysUntilStockout = currentStock / consumptionRate;

    // Calculate recommended order date (order before stockout minus lead time)
    const recommendedOrderDate = new Date();
    recommendedOrderDate.setDate(recommendedOrderDate.getDate() + Math.max(0, daysUntilStockout - leadTime - 7));

    const predictedStockoutDate = new Date();
    predictedStockoutDate.setDate(predictedStockoutDate.getDate() + daysUntilStockout);

    // Calculate optimal quantity (enough for 30 days + safety margin)
    const optimalQuantity = Math.ceil((consumptionRate * 30) + minStock);

    // Determine confidence based on data availability
    const confidence = this.calculateTimingConfidence(profile, consumptionRate);

    let reasoning = `Current stock: ${currentStock} units. `;
    reasoning += `Consumption rate: ${consumptionRate.toFixed(2)} units/day. `;
    reasoning += `Predicted stockout: ${predictedStockoutDate.toLocaleDateString()}. `;
    reasoning += `Recommended order: ${recommendedOrderDate.toLocaleDateString()} (${leadTime} days lead time).`;

    return {
      material: profile.material,
      profileId: profile.id,
      recommendedOrderDate,
      currentStockLevel: currentStock,
      predictedStockoutDate,
      optimalQuantity,
      reasoning,
      confidence,
    };
  }

  /**
   * Track supplier performance
   */
  async trackSupplierPerformance(
    supplierId: string,
    period: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<SupplierPerformance> {
    const supplier = this.suppliers.get(supplierId);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    // TODO: Query actual order history from database
    // For now, return calculated metrics based on supplier data

    const metrics = {
      totalOrders: supplier.totalOrders,
      onTimeDelivery: supplier.onTimeDeliveryRate * supplier.totalOrders,
      qualityIssues: Math.round(supplier.totalOrders * (1 - supplier.qualityScore / 100)),
      averageRating: supplier.averageRating,
      totalSpent: 0, // Would calculate from order history
    };

    // Determine trends (simplified - would use actual historical data)
    const trends = {
      deliveryTime: 'stable' as const,
      quality: supplier.qualityScore > 80 ? 'improving' as const : 'stable' as const,
      pricing: 'stable' as const,
    };

    return {
      supplierId,
      period,
      metrics,
      trends,
    };
  }

  /**
   * Analyze price trends and forecast
   */
  async analyzePriceTrend(
    profile: Profile,
    forecastDays: number = 30
  ): Promise<PriceTrend> {
    const currentPrice = profile.costPerMeter;
    const history = this.priceHistory.get(profile.id) || [];

    // Calculate trend from history
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (history.length >= 2) {
      const recent = history.slice(-3);
      const avgRecent = recent.reduce((sum, p) => sum + p.currentPrice, 0) / recent.length;
      const older = history.slice(-6, -3);
      if (older.length > 0) {
        const avgOlder = older.reduce((sum, p) => sum + p.currentPrice, 0) / older.length;
        if (avgRecent > avgOlder * 1.05) {
          trend = 'increasing';
        } else if (avgRecent < avgOlder * 0.95) {
          trend = 'decreasing';
        }
      }
    }

    // Generate forecast
    const forecast: PriceForecast[] = [];
    const basePrice = currentPrice;
    const trendFactor = trend === 'increasing' ? 1.02 : trend === 'decreasing' ? 0.98 : 1.0;

    for (let i = 1; i <= forecastDays; i += 7) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const predictedPrice = basePrice * Math.pow(trendFactor, i / 7);
      
      forecast.push({
        date,
        predictedPrice,
        confidence: Math.max(0.5, 1.0 - (i / forecastDays) * 0.5), // Confidence decreases over time
        factors: ['Historical trend', 'Market conditions'],
      });
    }

    return {
      material: profile.material,
      profileId: profile.id,
      currentPrice,
      currency: 'EGP',
      trend,
      forecast,
      confidence: 0.7,
    };
  }

  /**
   * Get material order recommendations
   */
  async getOrderRecommendations(
    profiles: Profile[],
    options: {
      urgencyThreshold?: number;
      maxRecommendations?: number;
    } = {}
  ): Promise<MaterialOrderRecommendation[]> {
    const recommendations: MaterialOrderRecommendation[] = [];

    for (const profile of profiles) {
      const timing = await this.predictOptimalOrderTiming(profile);
      const currentStock = profile.stockQuantity || 0;
      const minStock = profile.minStockLevel || 10;

      // Determine urgency
      let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
      const daysUntilStockout = (currentStock - minStock) / (this.estimateConsumptionRate(profile) || 1);
      
      if (daysUntilStockout < 7) {
        urgency = 'critical';
      } else if (daysUntilStockout < 14) {
        urgency = 'high';
      } else if (daysUntilStockout < 30) {
        urgency = 'medium';
      }

      // Find best supplier
      const bestSupplier = this.findBestSupplier(profile.material);

      const recommendation: MaterialOrderRecommendation = {
        profileId: profile.id,
        profileName: profile.name,
        currentStock,
        minStockLevel: minStock,
        recommendedQuantity: timing.optimalQuantity,
        recommendedSupplier: bestSupplier?.id || 'unknown',
        estimatedCost: timing.optimalQuantity * profile.costPerMeter * 6, // Assume 6m bars
        urgency,
        reasoning: timing.reasoning,
      };

      recommendations.push(recommendation);
    }

    // Sort by urgency
    const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    recommendations.sort((a, b) => urgencyOrder[b.urgency] - urgencyOrder[a.urgency]);

    // Filter by urgency threshold if provided
    const threshold = options.urgencyThreshold || 0;
    const filtered = recommendations.filter((r) => {
      const urgencyValue = urgencyOrder[r.urgency];
      return urgencyValue >= threshold;
    });

    return filtered.slice(0, options.maxRecommendations || 20);
  }

  /**
   * Estimate consumption rate for a profile
   */
  private estimateConsumptionRate(_profile: Profile): number {
    // Simple heuristic: estimate based on stock level and typical usage
    // In production, this would use historical consumption data
    return 0.5; // units per day (placeholder)
  }

  /**
   * Calculate timing confidence
   */
  private calculateTimingConfidence(_profile: Profile, _consumptionRate: number): number {
    // Confidence increases with more historical data
    // For now, return moderate confidence
    return 0.7;
  }

  /**
   * Find best supplier for a material
   */
  private findBestSupplier(material: string): Supplier | null {
    const materialSuppliers = Array.from(this.suppliers.values()).filter(
      (s) => s.materials.includes(material)
    );

    if (materialSuppliers.length === 0) {
      return null;
    }

    // Score suppliers based on rating, quality, and price
    const scored = materialSuppliers.map((s) => ({
      supplier: s,
      score: s.averageRating * 0.4 + s.qualityScore * 0.4 + s.priceCompetitiveness * 0.2,
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored[0].supplier;
  }

  /**
   * Register a supplier
   */
  registerSupplier(supplier: Supplier): void {
    this.suppliers.set(supplier.id, supplier);
  }
}

// Export singleton instance
export const supplyChainIntelligence = new SupplyChainIntelligence();

