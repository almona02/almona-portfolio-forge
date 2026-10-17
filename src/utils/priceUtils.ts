/**
 * Price Utilities for Used Machinery
 * 
 * Handles price extraction, formatting, and filtering logic
 */

export interface PriceRange {
  min: number;
  max: number;
}

/**
 * Extract numeric price from string or number
 * Handles formats like "EGP 180,000", "180000", "$180,000", 180000
 */
export const extractNumericPrice = (price: string | number): number => {
  if (typeof price === 'number') return price || 0;
  const numericValue = price.replace(/[^\d]/g, '');
  return parseInt(numericValue) || 0;
};

/**
 * Format price for display in Egyptian Pounds
 */
export const formatEGP = (price: number, compact = false): string => {
  if (compact) {
    if (price >= 1000000) {
      return `EGP ${(price / 1000000).toFixed(1)}M`;
    }
    if (price >= 1000) {
      return `EGP ${(price / 1000).toFixed(0)}K`;
    }
  }
  
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price).replace('EGP', 'EGP');
};

/**
 * Get price range from array of machines (numeric price)
 */
export const getPriceRange = (machines: Array<{price: number | string}>): PriceRange => {
  const prices = machines
    .map(machine => extractNumericPrice(machine.price))
    .filter(price => price > 0);
  
  if (prices.length === 0) {
    return { min: 0, max: 1000000 };
  }
  
  return {
    min: Math.min(...prices),
    max: Math.max(...prices)
  };
};

/**
 * Check if machine price falls within range
 */
export const isPriceInRange = (
  machinePrice: string | number,
  range: [number, number]
): boolean => {
  const price = extractNumericPrice(machinePrice);
  return price >= range[0] && price <= range[1];
};