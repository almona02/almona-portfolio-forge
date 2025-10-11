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
 * Extract numeric price from string format
 * Handles formats like "EGP 180,000", "180000", "$180,000"
 */
export const extractNumericPrice = (priceString: string): number => {
  // Remove all non-digit characters and convert to number
  const numericValue = priceString.replace(/[^\d]/g, '');
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
 * Get price range from array of machines
 */
export const getPriceRange = (machines: Array<{price: string}>): PriceRange => {
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
  machinePrice: string, 
  range: [number, number]
): boolean => {
  const price = extractNumericPrice(machinePrice);
  return price >= range[0] && price <= range[1];
};