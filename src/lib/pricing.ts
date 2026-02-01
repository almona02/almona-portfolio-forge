// Pricing utilities extracted from supabase.ts to allow removal of @ts-nocheck there
// and provide a focused, testable module.

/**
 * Calculate a tiered unit price based on quantity break discounts.
 * Tiers are inclusive and the first matching tier is applied.
 *
 * Current discount schedule (can be externalized to config later):
 *  1-4:   0%
 *  5-9:   5%
 * 10-24: 10%
 * 25+:   15%
 */
export function calculateTieredPrice(basePrice: number, quantity: number): number {
  if (quantity <= 0) return 0;
  const tiers: { min: number; max: number | null; discount: number }[] = [
    { min: 1, max: 4, discount: 0 },
    { min: 5, max: 9, discount: 0.05 },
    { min: 10, max: 24, discount: 0.1 },
    { min: 25, max: null, discount: 0.15 },
  ];

  const applicable = tiers.find(t => quantity >= t.min && (t.max === null || quantity <= t.max));
  const discount = applicable?.discount ?? 0;
  return Math.max(0, basePrice) * (1 - discount);
}

export function computeLineTotal(basePrice: number, quantity: number): number {
  return calculateTieredPrice(basePrice, quantity) * quantity;
}

// Small helper to expose discount percentage for UI display if needed.
export function getAppliedDiscountRate(quantity: number): number {
  if (quantity >= 25) return 0.15;
  if (quantity >= 10) return 0.10;
  if (quantity >= 5) return 0.05;
  return 0;
}

// Advanced pricing functions for dynamic pricing
export function calculateDynamicPrice(
  basePrice: number, 
  quantity: number, 
  userRole?: string,
  productCategory?: string
): number {
  let price = calculateTieredPrice(basePrice, quantity);
  
  // Apply role-based discounts
  if (userRole === 'admin' || userRole === 'sales_rep') {
    price *= 0.9; // 10% discount for staff
  }
  
  // Apply category-based pricing
  if (productCategory === 'machine') {
    price *= 1.05; // 5% markup for machines
  } else if (productCategory === 'spare_part') {
    price *= 0.95; // 5% discount for spare parts
  }
  
  return Math.max(0, price);
}

// Calculate bulk pricing with custom tiers
export function calculateBulkPrice(
  basePrice: number,
  quantity: number,
  customTiers?: Array<{ min: number; max?: number; discount: number }>
): number {
  if (!customTiers || customTiers.length === 0) {
    return calculateTieredPrice(basePrice, quantity);
  }
  
  const applicableTier = customTiers.find(tier => 
    quantity >= tier.min && (tier.max === undefined || quantity <= tier.max)
  );
  
  if (applicableTier) {
    return basePrice * (1 - applicableTier.discount) * quantity;
  }
  
  return basePrice * quantity;
}

// Re-export from pricing/index.ts to support imports from '@/lib/pricing'
// This allows '@/lib/pricing' to resolve to this file while also exporting services from pricing/index.ts
export * from './pricing/index';