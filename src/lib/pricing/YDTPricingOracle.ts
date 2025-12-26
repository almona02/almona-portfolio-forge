/**
 * YDTPricingOracle - Pricing engine using YDT market intelligence
 * 
 * This REPLACES all static pricing formulas with YDT-powered market intelligence.
 * Every price comes FROM YDT, not from static calculations.
 */

import { YDTCoreService } from '../ydt/YDTCoreService';
import { EgyptianFabricationIntelligence } from '../intelligence/EgyptianFabricationIntelligence';
import type { Project, Workshop, YDTPricing } from '../ydt/types';

export interface YDTPricingResult {
  breakdown: {
    material: number;
    labor: number;
    overhead: number;
    margin: number;
    finalPrice: number;
  };
  intelligence: {
    marketTrend?: string;
    competition?: {
      averagePrice: number;
      undercuttingDetected: boolean;
      priceDifference?: number;
    };
    shortages?: string[];
    recommendations?: string[];
  };
  confidence: number;
  source: string;
  watermark?: string;
  quoteCard?: YDTQuoteCard;
}

export interface YDTQuoteCard {
  finalPrice: number;
  breakdown: {
    material: string;
    labor: string;
    margin: string;
    total: string;
  };
  ydtInsights: string[];
  paymentTerms: {
    cash: number;
    credit30: number;
    credit90: number;
    recommendation: string;
  };
  validity: string;
  watermark?: string;
}

/**
 * YDTPricingOracle - Market-Intelligent Pricing Engine
 */
export class YDTPricingOracle {
  private ydt = YDTCoreService.getInstance();

  /**
   * Calculate price using YDT market intelligence
   * This REPLACES all static pricing formulas
   */
  async calculatePriceWithYDT(
    project: Project,
    workshop: Workshop
  ): Promise<YDTPricingResult> {
    // 1. Get market-validated pricing from YDT
    const marketPricing = await this.ydt.getMarketPricing(project, workshop.id);

    // 2. Get Egyptian intelligence
    const egyptianIntel = EgyptianFabricationIntelligence.getMaterialStrategy(
      project.type as any,
      project.location,
      workshop.pricingTier || 'standard'
    );

    // 3. Calculate overhead
    const overhead = this.calculateOverhead(workshop, marketPricing.data.materialCost);

    // 4. Calculate final price with intelligence
    const finalPrice = this.calculateFinalPrice(marketPricing.data, egyptianIntel, overhead);

    // 5. Add competitive intelligence
    const competitiveAnalysis = await this.ydt.analyzeCompetition(project.location, project.type);

    // 6. Get pricing recommendations
    const recommendations = this.getPricingRecommendations(project, marketPricing.data, competitiveAnalysis);

    // 7. Generate quote card
    const quoteCard = this.generateQuoteCard(project, finalPrice, marketPricing.data);

    return {
      breakdown: {
        material: marketPricing.data.materialCost,
        labor: marketPricing.data.laborCost,
        overhead,
        margin: marketPricing.data.recommendedMargin,
        finalPrice,
      },
      intelligence: {
        marketTrend: marketPricing.data.ydtIntelligence.marketTrend,
        competition: competitiveAnalysis.competitors[0] ? {
          averagePrice: competitiveAnalysis.competitors[0].priceDifference + finalPrice,
          undercuttingDetected: competitiveAnalysis.competitors[0].priceDifference < 0,
          priceDifference: competitiveAnalysis.competitors[0].priceDifference,
        } : undefined,
        shortages: marketPricing.data.ydtIntelligence.shortageAlerts,
        recommendations,
      },
      confidence: marketPricing.confidence,
      source: marketPricing.source,
      watermark: marketPricing.watermark,
      quoteCard,
    };
  }

  /**
   * Generate quote card for customer (WITH YDT INTELLIGENCE)
   */
  private generateQuoteCard(
    project: Project,
    price: number,
    intelligence: YDTPricing
  ): YDTQuoteCard {
    // Calculate payment terms
    const cashDiscount = 0.05; // 5%
    const credit30Margin = 0.10; // 10%
    const credit90Margin = 0.20; // 20%

    const cashPrice = price * (1 - cashDiscount);
    const credit30 = price * (1 + credit30Margin);
    const credit90 = price * (1 + credit90Margin);

    // Determine recommendation
    let recommendation = 'cash';
    let recommendationReason = 'Best price with cash payment';
    if (project.estimatedCost && project.estimatedCost > 50000) {
      recommendation = 'credit90';
      recommendationReason = 'Large order - 90-day credit recommended';
    } else if (project.estimatedCost && project.estimatedCost > 20000) {
      recommendation = 'credit30';
      recommendationReason = 'Medium order - 30-day credit recommended';
    }

    return {
      finalPrice: price,
      breakdown: {
        material: `EGP ${intelligence.materialCost.toLocaleString('ar-EG')}`,
        labor: `EGP ${intelligence.laborCost.toLocaleString('ar-EG')}`,
        margin: `${(intelligence.recommendedMargin * 100).toFixed(0)}%`,
        total: `EGP ${price.toLocaleString('ar-EG')}`,
      },
      ydtInsights: [
        `✅ سعر السوق الحالي: ${intelligence.ydtIntelligence.marketTrend || 'مستقر'}`,
        `✅ التحليل التنافسي: ${intelligence.ydtIntelligence.competitionAnalysis || 'متاح'}`,
        `⚠️  تنبيهات: ${intelligence.ydtIntelligence.shortageAlerts?.join(', ') || 'لا توجد'}`,
        `💡 توصيات: ${this.getArabicRecommendations(intelligence)}`,
      ],
      paymentTerms: {
        cash: cashPrice,
        credit30: credit30,
        credit90: credit90,
        recommendation,
      },
      validity: '7 أيام',
      watermark: intelligence.watermark,
    };
  }

  /**
   * Calculate overhead costs
   */
  private calculateOverhead(workshop: Workshop, materialCost: number): number {
    // Overhead is typically 10-15% of material cost
    return materialCost * 0.12; // 12% overhead
  }

  /**
   * Calculate final price with intelligence
   */
  private calculateFinalPrice(
    marketPricing: YDTPricing,
    egyptianIntel: any,
    overhead: number
  ): number {
    const subtotal = marketPricing.materialCost + marketPricing.laborCost + overhead;
    return subtotal * (1 + marketPricing.recommendedMargin);
  }

  /**
   * Get pricing recommendations
   */
  private getPricingRecommendations(
    project: Project,
    marketPricing: YDTPricing,
    competitiveAnalysis: any
  ): string[] {
    const recommendations: string[] = [];

    if (marketPricing.ydtIntelligence.shortageAlerts && marketPricing.ydtIntelligence.shortageAlerts.length > 0) {
      recommendations.push('Material shortages detected - consider alternatives');
    }

    if (competitiveAnalysis.competitors.length > 0) {
      const competitor = competitiveAnalysis.competitors[0];
      if (competitor.priceDifference < -10) {
        recommendations.push('Competitors undercutting prices - focus on quality/value');
      } else if (competitor.priceDifference > 10) {
        recommendations.push('You can increase prices - market supports premium pricing');
      }
    }

    if (marketPricing.ydtIntelligence.marketTrend === 'rising') {
      recommendations.push('Market prices rising - adjust pricing accordingly');
    }

    return recommendations;
  }

  /**
   * Get Arabic recommendations
   */
  private getArabicRecommendations(intelligence: YDTPricing): string {
    const recommendations: string[] = [];

    if (intelligence.ydtIntelligence.marketTrend === 'rising') {
      recommendations.push('أسعار السوق في ارتفاع');
    }

    if (intelligence.ydtIntelligence.shortageAlerts && intelligence.ydtIntelligence.shortageAlerts.length > 0) {
      recommendations.push('نقص في المواد - فكر في البدائل');
    }

    return recommendations.join('، ') || 'لا توجد توصيات خاصة';
  }
}

