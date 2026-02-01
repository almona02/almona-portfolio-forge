/**
 * Real-time Cost Calculator for ALMONA Fabricator
 * 
 * Provides comprehensive cost calculations including:
 * - Profile costs (by length and material)
 * - Hardware costs (by quantity)
 * - Glass/glazing costs (by area)
 * - Labor costs (optional)
 * - Markup and profit margins
 * 
 * Constitutional: Deterministic calculations, no ML/AI
 * Tier: 3 Protected Determinism
 */

import { calculateOperationCost } from '@/lib/commercial/LaborOperations';
import { CurrencyCode, Money } from '@/lib/commercial/Money';
import { WindowUnit } from '@/types/fabricator';

// Re-export Money for consumers
export { Money };

export interface CostBreakdown {
  profilesCost: number;
  hardwareCost: number;
  glassCost: number;
  laborCost: number;
  subtotal: number;
  markup: number;
  tax: number;
  total: number;
  currency: string;
  timestamp: Date;
}

export interface CostDetails {
  profileCosts: Array<{
    profileId: string;
    profileName: string;
    costPerMeter: number;
    totalLength: number;
    quantity: number;
    subtotal: number;
  }>;
  hardwareCosts: Array<{
    hardwareId: string;
    hardwareName: string;
    costPerUnit: number;
    quantity: number;
    subtotal: number;
  }>;
  glassCosts: Array<{
    glassType: string;
    area: number;
    costPerM2: number;
    subtotal: number;
  }>;
  laborCosts: {
    hourlyRate: number;
    estimatedHours: number;
    subtotal: number;
  };
}

export interface PricingConfig {
  glassPrice: number; // Major units (e.g. 50.00)
  markupPercentage: number; // 0-100
  taxPercentage: number; // 0-100 (VAT)
  currency: CurrencyCode;
}

const DEFAULT_PRICING_CONFIG: PricingConfig = {
  glassPrice: 50, 
  markupPercentage: 30,
  taxPercentage: 14,
  currency: 'EGP'
};

/**
 * Calculate total cost for a window unit with FINANCIAL PRECISION
 */
export const calculateLiveCost = (
  liveProject: WindowUnit | null,
  bomData: any,
  pricingConfig: PricingConfig = DEFAULT_PRICING_CONFIG
): CostBreakdown | null => {
  if (!liveProject) return null;

  const currency = pricingConfig.currency;
  let profilesTotal = Money.zero(currency);
  let hardwareTotal = Money.zero(currency);
  let glassTotal = Money.zero(currency);
  let laborTotal = Money.zero(currency);

  // 1. Calculate profile costs (Integer Math)
  if (liveProject.components && liveProject.components.length > 0) {
    liveProject.components.forEach(comp => {
      if (comp.profile?.costPerMeter) {
        const lengthMeters = (comp.cuttingLengths?.[0] || 0) / 1000;
        const quantity = comp.quantity || 1;
        // Cost = rate * length
        const lineCostMajor = comp.profile.costPerMeter * lengthMeters * quantity;
        profilesTotal = profilesTotal.add(Money.fromMajor(lineCostMajor, currency));
        
        // Add Labor: Cutting
        const cutCost = calculateOperationCost('OP_CUT_PROFILE', quantity); // Base cut
        laborTotal = laborTotal.add(Money.fromMajor(cutCost, currency));
        
        // Add Labor: Miters (if applic) - Simplification: assume 2 miters per extrusion
        const miterCost = calculateOperationCost('OP_CUT_MITER', quantity * 2);
        laborTotal = laborTotal.add(Money.fromMajor(miterCost, currency));
      }
    });
  }

  // 2. Calculate hardware costs
  if (liveProject.hardware && liveProject.hardware.length > 0) {
    liveProject.hardware.forEach(hw => {
      if (hw.costPerUnit) {
        const quantity = hw.quantity || 1;
        // Hardware Item Cost
        const lineCostMajor = hw.costPerUnit * quantity;
        hardwareTotal = hardwareTotal.add(Money.fromMajor(lineCostMajor, currency));
        
        // Labor: Assembly install (generic hardware install)
        // Check hardware type for specific labor? For now, use generic assembly.
        const assemblyCost = calculateOperationCost('OP_ASSEMBLE_FRAME', 0.2 * quantity); // 20% of frame assembly time per hardware item?
        laborTotal = laborTotal.add(Money.fromMajor(assemblyCost, currency));
      }
    });
  }

  // 3. Calculate glass costs
  if (bomData?.glassDetails) {
    const area = bomData.glassDetails.totalGlassArea || 0;
    const glassCostMajor = area * pricingConfig.glassPrice;
    glassTotal = glassTotal.add(Money.fromMajor(glassCostMajor, currency));
    
    // Labor: Glazing (Set + Seal)
    const sashCount = liveProject.components?.filter(c => c.profile?.profileRole === 'sash' || c.profile?.type === 'sash').length || 0;
    const setCost = calculateOperationCost('OP_SET_CLASS', Math.max(1, sashCount)); 
    const sealCost = calculateOperationCost('OP_SEAL_GLASS', area * 4); // perimeter approx
    laborTotal = laborTotal.add(Money.fromMajor(setCost + sealCost, currency));
  }
  
  // Fallback Labor (if no components/ops detected, use minimum setup charge)
  if (laborTotal.amount === 0) {
      laborTotal = Money.fromMajor(50, currency); // Minimum charge
  }

  // 5. Calculate totals
  const subtotal = profilesTotal.add(hardwareTotal).add(glassTotal).add(laborTotal);
  
  // Markup
  const markup = subtotal.multiply(pricingConfig.markupPercentage / 100);
  const subtotalWithMarkup = subtotal.add(markup);
  
  // Tax
  const tax = subtotalWithMarkup.multiply(pricingConfig.taxPercentage / 100);
  const total = subtotalWithMarkup.add(tax);

  return {
    profilesCost: profilesTotal.toMajor(),
    hardwareCost: hardwareTotal.toMajor(),
    glassCost: glassTotal.toMajor(),
    laborCost: laborTotal.toMajor(),
    subtotal: subtotal.toMajor(),
    markup: markup.toMajor(),
    tax: tax.toMajor(),
    total: total.toMajor(),
    currency: currency,
    timestamp: new Date()
  };
};

/**
 * Get detailed cost breakdown
 */
export const getCostDetails = (
  liveProject: WindowUnit | null,
  bomData: any,
  pricingConfig: PricingConfig = DEFAULT_PRICING_CONFIG
): CostDetails | null => {
  if (!liveProject) return null;

  const profileCosts: CostDetails['profileCosts'] = [];
  const hardwareCosts: CostDetails['hardwareCosts'] = [];
  const glassCosts: CostDetails['glassCosts'] = [];

  // Profile costs
  if (liveProject.components && liveProject.components.length > 0) {
    const profileMap = new Map<string, {
      profileId: string;
      profileName: string;
      costPerMeter: number;
      totalLength: number;
      quantity: number;
    }>();

    liveProject.components.forEach(comp => {
      if (comp.profile?.costPerMeter) {
        const key = comp.profile.id;
        const length = comp.cuttingLengths?.[0] || 0;
        const quantity = comp.quantity || 1;

        if (profileMap.has(key)) {
          const existing = profileMap.get(key)!;
          existing.totalLength += length * quantity;
          existing.quantity += quantity;
        } else {
          profileMap.set(key, {
            profileId: comp.profile.id,
            profileName: comp.profile.name,
            costPerMeter: comp.profile.costPerMeter,
            totalLength: length * quantity,
            quantity
          });
        }
      }
    });

    profileMap.forEach(profile => {
      profileCosts.push({
        ...profile,
        subtotal: (profile.totalLength / 1000) * profile.costPerMeter
      });
    });
  }

  // Hardware costs
  if (liveProject.hardware && liveProject.hardware.length > 0) {
    const hardwareMap = new Map<string, {
      hardwareId: string;
      hardwareName: string;
      costPerUnit: number;
      quantity: number;
    }>();

    liveProject.hardware.forEach(hw => {
      if (hw.costPerUnit) {
        const key = hw.id;
        const quantity = hw.quantity || 1;

        if (hardwareMap.has(key)) {
          const existing = hardwareMap.get(key)!;
          existing.quantity += quantity;
        } else {
          hardwareMap.set(key, {
            hardwareId: hw.id,
            hardwareName: hw.name,
            costPerUnit: hw.costPerUnit,
            quantity
          });
        }
      }
    });

    hardwareMap.forEach(hw => {
      hardwareCosts.push({
        ...hw,
        subtotal: hw.costPerUnit * hw.quantity
      });
    });
  }

  // Glass costs
  if (bomData?.glassDetails?.glassSpecs) {
    bomData.glassDetails.glassSpecs.forEach((glass: any) => {
      glassCosts.push({
        glassType: `${glass.type} ${bomData.glassDetails.glassThickness}mm`,
        area: glass.area,
        costPerM2: pricingConfig.glassPrice,
        subtotal: glass.area * pricingConfig.glassPrice
      });
    });
  }

  // Labor costs
  const componentCount = liveProject.components?.length || 0;
  const estimatedHours = Math.max(1, Math.ceil(componentCount / 10));

  return {
    profileCosts,
    hardwareCosts,
    glassCosts,
    laborCosts: {
      hourlyRate: 0, // Legacy field, now using granular operations
      estimatedHours,
      subtotal: estimatedHours * 100 // Fallback estimate if no granular data
    }
  };
};

/**
 * Calculate cost difference between two designs
 */
export const calculateCostDifference = (
  design1: WindowUnit | null,
  design2: WindowUnit | null,
  bomData1: any,
  bomData2: any,
  pricingConfig: PricingConfig = DEFAULT_PRICING_CONFIG
): { difference: number; percentChange: number; savings: boolean } | null => {
  const cost1 = calculateLiveCost(design1, bomData1, pricingConfig);
  const cost2 = calculateLiveCost(design2, bomData2, pricingConfig);

  if (!cost1 || !cost2) return null;

  const difference = cost2.total - cost1.total;
  const percentChange = (difference / cost1.total) * 100;
  const savings = difference < 0;

  return {
    difference: Math.abs(difference),
    percentChange: Math.abs(percentChange),
    savings
  };
};

/**
 * Format cost for display
 */
export const formatCost = (
  amount: number,
  currency: string = 'EGP',
  decimals: number = 2
): string => {
  const formatted = amount.toFixed(decimals);
  const currencySymbol = {
    'EGP': '£',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'AED': 'د.إ'
  }[currency] || currency;

  return `${formatted} ${currencySymbol}`;
};

/**
 * Get cost per unit area (useful for comparison)
 */
export const getCostPerUnitArea = (
  totalCost: number,
  width: number,
  height: number
): number => {
  const areaM2 = (width * height) / 1_000_000;
  return areaM2 > 0 ? totalCost / areaM2 : 0;
};

/**
 * Estimate ROI based on selling price
 */
export const calculateROI = (
  cost: number,
  sellingPrice: number
): { profit: number; profitMargin: number; roi: number } => {
  const profit = sellingPrice - cost;
  const profitMargin = (profit / sellingPrice) * 100;
  const roi = (profit / cost) * 100;

  return {
    profit,
    profitMargin,
    roi
  };
};
