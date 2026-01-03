/**
 * RealTimeQuoteCalculator - Real-Time Quote Calculation
 * 
 * Calculates quote in real-time as design changes, including:
 * - Material costs
 * - Labor costs
 * - Egyptian-specific factors (transport, installation complexity)
 * - Payment terms (cash, 30-day credit, 90-day credit)
 * 
 * @since Egyptian Fabrication Intelligence Enhancement
 */

import type { InferredShape } from '../intelligence/ShapeInferenceEngine';
import type { ComplexShapeDesign } from '../intelligence/ComplexShapeGenerator';
import { getBaseMaterialPrice } from '@/utils/marketData';

export interface EgyptianQuoteFactors {
  transportCost?: number; // EGP
  installationComplexity?: 'simple' | 'medium' | 'complex';
  location?: 'Cairo' | 'Alexandria' | 'Upper_Egypt' | 'Other';
  floorHeight?: number; // meters
  accessDifficulty?: 'easy' | 'medium' | 'difficult';
}

export interface RealTimeQuote {
  materialCost: number; // EGP
  materialBreakdown: {
    profiles: number;
    glass: number;
    hardware: number;
    accessories: number;
    other: number;
  };
  laborCost: number; // EGP
  laborBreakdown: {
    cutting: number;
    assembly: number;
    installation: number;
    other: number;
  };
  transportCost: number; // EGP
  installationCost: number; // EGP
  subtotal: number; // EGP
  profitMargin: number; // percentage
  total: number; // EGP
  
  // Payment terms
  cashPrice: number; // EGP (with discount)
  credit30Days: number; // EGP
  credit90Days: number; // EGP
  
  // Recommendations
  recommendedPaymentTerms: 'cash' | 'credit30' | 'credit90';
  recommendationReason: string;
  recommendationReasonArabic: string;
}

export interface QuoteInput {
  shape?: InferredShape;
  dimensions?: {
    width: number; // mm
    height: number; // mm
    area?: number; // m²
  };
  materials?: {
    type: 'aluminum' | 'upvc';
    systemPackId: string;
    profiles?: ComplexShapeDesign['material']['profiles'];
  };
  hardware?: ComplexShapeDesign['hardware'];
  glazing?: ComplexShapeDesign['glazing'];
  laborRates?: {
    perSqm: number; // EGP per m²
    perHour: number; // EGP per hour
  };
  profitMargin?: number; // percentage (default 30%)
  egyptianFactors?: EgyptianQuoteFactors;
  cashFlowOptions?: {
    cashDiscount?: number; // percentage (default 5%)
    credit30DaysMargin?: number; // percentage (default 10%)
    credit90DaysMargin?: number; // percentage (default 20%)
  };
}

/**
 * RealTimeQuoteCalculator - Calculates real-time quotes
 */
export class RealTimeQuoteCalculator {
  /**
   * Calculate Egyptian quote
   */
  async calculate(input: QuoteInput): Promise<RealTimeQuote> {
    const dimensions = input.dimensions || { width: 0, height: 0 };
    const area = dimensions.area || (dimensions.width * dimensions.height) / 1000000; // m²
    
    // 1. Material costs
    const materialCost = this.calculateMaterialCost(input, area);
    
    // 2. Labor costs
    const laborCost = this.calculateLaborCost(input, area);
    
    // 3. Transport cost (Egyptian factor)
    const transportCost = this.calculateTransportCost(
      input.egyptianFactors?.location,
      input.egyptianFactors?.transportCost,
      area
    );
    
    // 4. Installation cost (Egyptian factor)
    const installationCost = this.calculateInstallationCost(
      input.egyptianFactors,
      area,
      input.laborRates
    );
    
    // 5. Subtotal
    const subtotal = materialCost.total + laborCost.total + transportCost + installationCost;
    
    // 6. Profit margin
    const profitMargin = input.profitMargin || 30; // Default 30%
    const total = subtotal * (1 + profitMargin / 100);
    
    // 7. Payment terms
    const cashDiscount = input.cashFlowOptions?.cashDiscount || 5; // Default 5%
    const credit30Margin = input.cashFlowOptions?.credit30DaysMargin || 10; // Default 10%
    const credit90Margin = input.cashFlowOptions?.credit90DaysMargin || 20; // Default 20%
    
    const cashPrice = total * (1 - cashDiscount / 100);
    const credit30Days = total * (1 + credit30Margin / 100);
    const credit90Days = total * (1 + credit90Margin / 100);
    
    // 8. Payment recommendation
    const { recommendedPaymentTerms, recommendationReason, recommendationReasonArabic } = 
      this.recommendPaymentTerms(total, input.egyptianFactors);
    
    return {
      materialCost: materialCost.total,
      materialBreakdown: materialCost.breakdown,
      laborCost: laborCost.total,
      laborBreakdown: laborCost.breakdown,
      transportCost,
      installationCost,
      subtotal,
      profitMargin,
      total,
      cashPrice: Math.round(cashPrice),
      credit30Days: Math.round(credit30Days),
      credit90Days: Math.round(credit90Days),
      recommendedPaymentTerms,
      recommendationReason,
      recommendationReasonArabic
    };
  }
  
  /**
   * Calculate material costs
   */
  private calculateMaterialCost(
    input: QuoteInput,
    area: number
  ): { total: number; breakdown: RealTimeQuote['materialBreakdown'] } {
    const systemPackId = input.materials?.systemPackId || 'panda-50';
    const basePrice = getBaseMaterialPrice(systemPackId as any);
    
    // Profile costs (estimate based on perimeter)
    const dimensions = input.dimensions || { width: 0, height: 0 };
    const perimeter = (dimensions.width + dimensions.height) * 2 / 1000; // meters
    const profileCost = perimeter * basePrice * 0.4; // Rough estimate: 40% of base price per meter
    
    // Glass costs
    const glassType = input.glazing?.type || 'double';
    const glassThickness = input.glazing?.thickness || 24;
    const glassCostPerSqm = this.getGlassCostPerSqm(glassType, glassThickness);
    const glassCost = area * glassCostPerSqm;
    
    // Hardware costs
    const hardwareCost = this.calculateHardwareCost(input.hardware || []);
    
    // Accessories (gaskets, beads, etc.)
    const accessoriesCost = perimeter * 50; // EGP per meter
    
    const total = profileCost + glassCost + hardwareCost + accessoriesCost;
    
    return {
      total: Math.round(total),
      breakdown: {
        profiles: Math.round(profileCost),
        glass: Math.round(glassCost),
        hardware: Math.round(hardwareCost),
        accessories: Math.round(accessoriesCost),
        other: 0
      }
    };
  }
  
  /**
   * Get glass cost per m²
   */
  private getGlassCostPerSqm(type: string, thickness: number): number {
    // Base prices in EGP per m²
    const basePrices: Record<string, number> = {
      'float': 200,
      'tempered': 350,
      'laminated': 400,
      'double': 500,
      'triple': 700
    };
    
    const basePrice = basePrices[type] || 500;
    
    // Thickness multiplier
    const thicknessMultiplier = thickness / 24; // Normalize to 24mm
    
    return basePrice * thicknessMultiplier;
  }
  
  /**
   * Calculate hardware costs
   */
  private calculateHardwareCost(hardware: ComplexShapeDesign['hardware']): number {
    let total = 0;
    
    hardware.forEach(item => {
      const basePrice = this.getHardwareBasePrice(item.type, item.category);
      total += basePrice * item.quantity;
    });
    
    return total;
  }
  
  /**
   * Get hardware base price
   */
  private getHardwareBasePrice(type: string, category: string): number {
    // Base prices in EGP
    const prices: Record<string, number> = {
      'roller': 150,
      'handle': 80,
      'hinge': 120,
      'espagnolette': 200,
      'corner_connector': 100,
      'interlock_kit': 250
    };
    
    return prices[type] || prices[category] || 100;
  }
  
  /**
   * Calculate labor costs
   */
  private calculateLaborCost(
    input: QuoteInput,
    area: number
  ): { total: number; breakdown: RealTimeQuote['laborBreakdown'] } {
    const perSqm = input.laborRates?.perSqm || 300; // Default 300 EGP per m²
    const perHour = input.laborRates?.perHour || 100; // Default 100 EGP per hour
    
    // Cutting labor (estimate 0.5 hours per m²)
    const cuttingHours = area * 0.5;
    const cuttingCost = cuttingHours * perHour;
    
    // Assembly labor (estimate 1 hour per m²)
    const assemblyHours = area * 1;
    const assemblyCost = assemblyHours * perHour;
    
    // Installation labor (estimate 0.5 hours per m²)
    const installationHours = area * 0.5;
    const installationCost = installationHours * perHour;
    
    // Alternative: use perSqm rate
    const totalPerSqm = area * perSqm;
    
    // Use the higher of the two methods
    const total = Math.max(
      cuttingCost + assemblyCost + installationCost,
      totalPerSqm
    );
    
    return {
      total: Math.round(total),
      breakdown: {
        cutting: Math.round(cuttingCost),
        assembly: Math.round(assemblyCost),
        installation: Math.round(installationCost),
        other: 0
      }
    };
  }
  
  /**
   * Calculate transport cost
   */
  private calculateTransportCost(
    location?: string,
    customCost?: number,
    area: number = 0
  ): number {
    if (customCost !== undefined) {
      return customCost;
    }
    
    // Base transport cost by location (EGP)
    const baseCosts: Record<string, number> = {
      'Cairo': 200,
      'Alexandria': 300,
      'Upper_Egypt': 500,
      'Other': 400
    };
    
    const baseCost = baseCosts[location || 'Other'] || 400;
    
    // Add area-based cost (larger windows cost more to transport)
    const areaCost = area * 50; // 50 EGP per m²
    
    return Math.round(baseCost + areaCost);
  }
  
  /**
   * Calculate installation cost
   */
  private calculateInstallationCost(
    factors?: EgyptianQuoteFactors,
    area: number = 0,
    laborRates?: { perHour: number }
  ): number {
    const perHour = laborRates?.perHour || 100;
    
    // Base installation time (hours per m²)
    let baseHoursPerSqm = 0.5;
    
    // Adjust for complexity
    if (factors?.installationComplexity === 'medium') {
      baseHoursPerSqm = 0.75;
    } else if (factors?.installationComplexity === 'complex') {
      baseHoursPerSqm = 1.0;
    }
    
    // Adjust for floor height
    if (factors?.floorHeight) {
      const heightMultiplier = 1 + (factors.floorHeight / 10) * 0.1; // 10% per floor
      baseHoursPerSqm *= heightMultiplier;
    }
    
    // Adjust for access difficulty
    if (factors?.accessDifficulty === 'medium') {
      baseHoursPerSqm *= 1.2;
    } else if (factors?.accessDifficulty === 'difficult') {
      baseHoursPerSqm *= 1.5;
    }
    
    const totalHours = area * baseHoursPerSqm;
    const cost = totalHours * perHour;
    
    return Math.round(cost);
  }
  
  /**
   * Recommend payment terms
   */
  private recommendPaymentTerms(
    total: number,
    _factors?: EgyptianQuoteFactors
  ): {
    recommendedPaymentTerms: 'cash' | 'credit30' | 'credit90';
    recommendationReason: string;
    recommendationReasonArabic: string;
  } {
    // Small orders: recommend cash
    if (total < 5000) {
      return {
        recommendedPaymentTerms: 'cash',
        recommendationReason: 'Small order - cash payment recommended for best price',
        recommendationReasonArabic: 'طلب صغير - الدفع نقداً موصى به للحصول على أفضل سعر'
      };
    }
    
    // Medium orders: recommend 30-day credit
    if (total < 20000) {
      return {
        recommendedPaymentTerms: 'credit30',
        recommendationReason: 'Medium order - 30-day credit provides flexibility',
        recommendationReasonArabic: 'طلب متوسط - الائتمان لمدة 30 يوماً يوفر المرونة'
      };
    }
    
    // Large orders: recommend 90-day credit
    return {
      recommendedPaymentTerms: 'credit90',
      recommendationReason: 'Large order - 90-day credit recommended for cash flow management',
      recommendationReasonArabic: 'طلب كبير - الائتمان لمدة 90 يوماً موصى به لإدارة التدفق النقدي'
    };
  }
}

