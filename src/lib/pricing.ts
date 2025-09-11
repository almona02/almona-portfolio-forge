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
