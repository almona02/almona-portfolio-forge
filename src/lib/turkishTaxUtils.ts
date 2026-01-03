/**
 * Turkish Tax Calculation Utilities (KDV 20%)
 * Comprehensive tax calculation functions for Turkish market compliance
 */

export interface TurkishTaxCalculation {
  baseAmount: number;
  kdvRate: number;
  kdvAmount: number;
  totalWithKdv: number;
  currency: string;
  isKdvInclusive: boolean;
}

export interface TurkishInvoiceItem {
  id: string;
  description: string;
  descriptionTr: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  kdvRate: number;
  kdvAmount: number;
  total: number;
}

export interface TurkishInvoice {
  invoiceNumber: string;
  date: Date;
  customerInfo: {
    name: string;
    address: string;
    taxNumber?: string;
    phone?: string;
    email?: string;
  };
  items: TurkishInvoiceItem[];
  subtotal: number;
  totalKdv: number;
  grandTotal: number;
  currency: string;
  kdvBreakdown: Array<{
    rate: number;
    amount: number;
    kdvAmount: number;
  }>;
}

// Turkish KDV rates (as of 2024)
export const TURKISH_KDV_RATES = {
  STANDARD: 0.20, // 20% - Standard rate
  REDUCED: 0.18,  // 18% - Reduced rate for some goods
  LOWER: 0.08,    // 8% - Lower rate for basic necessities
  ZERO: 0.00,     // 0% - Zero rate for exports and some services
} as const;

export type KdvRate = keyof typeof TURKISH_KDV_RATES;

/**
 * Calculate KDV amount from base amount
 */
export function calculateKdvAmount(baseAmount: number, kdvRate: number = TURKISH_KDV_RATES.STANDARD): number {
  return baseAmount * kdvRate;
}

/**
 * Calculate total amount with KDV included
 */
export function calculateTotalWithKdv(baseAmount: number, kdvRate: number = TURKISH_KDV_RATES.STANDARD): number {
  return baseAmount * (1 + kdvRate);
}

/**
 * Calculate base amount from KDV-inclusive amount
 */
export function calculateBaseAmountFromKdvInclusive(totalAmount: number, kdvRate: number = TURKISH_KDV_RATES.STANDARD): number {
  return totalAmount / (1 + kdvRate);
}

/**
 * Calculate KDV amount from KDV-inclusive amount
 */
export function calculateKdvFromInclusiveAmount(totalAmount: number, kdvRate: number = TURKISH_KDV_RATES.STANDARD): number {
  return totalAmount - calculateBaseAmountFromKdvInclusive(totalAmount, kdvRate);
}

/**
 * Comprehensive Turkish tax calculation
 */
export function calculateTurkishTax(
  baseAmount: number, 
  kdvRate: number = TURKISH_KDV_RATES.STANDARD,
  isKdvInclusive: boolean = true
): TurkishTaxCalculation {
  let finalBaseAmount: number;
  let kdvAmount: number;
  let totalWithKdv: number;

  if (isKdvInclusive) {
    // Amount already includes KDV
    finalBaseAmount = calculateBaseAmountFromKdvInclusive(baseAmount, kdvRate);
    kdvAmount = calculateKdvFromInclusiveAmount(baseAmount, kdvRate);
    totalWithKdv = baseAmount;
  } else {
    // Amount does not include KDV
    finalBaseAmount = baseAmount;
    kdvAmount = calculateKdvAmount(baseAmount, kdvRate);
    totalWithKdv = calculateTotalWithKdv(baseAmount, kdvRate);
  }

  return {
    baseAmount: finalBaseAmount,
    kdvRate,
    kdvAmount,
    totalWithKdv,
    currency: 'TRY',
    isKdvInclusive
  };
}

/**
 * Calculate tax for multiple items with different KDV rates
 */
export function calculateMultiRateTax(items: Array<{
  amount: number;
  kdvRate: number;
  isKdvInclusive?: boolean;
}>): {
  subtotal: number;
  kdvBreakdown: Array<{
    rate: number;
    amount: number;
    kdvAmount: number;
  }>;
  totalKdv: number;
  grandTotal: number;
} {
  const kdvBreakdown: Array<{
    rate: number;
    amount: number;
    kdvAmount: number;
  }> = [];

  let subtotal = 0;
  let totalKdv = 0;

  items.forEach(item => {
    const tax = calculateTurkishTax(item.amount, item.kdvRate, item.isKdvInclusive || true);
    
    subtotal += tax.baseAmount;
    totalKdv += tax.kdvAmount;

    // Group by KDV rate
    const existingRate = kdvBreakdown.find(b => b.rate === item.kdvRate);
    if (existingRate) {
      existingRate.amount += tax.baseAmount;
      existingRate.kdvAmount += tax.kdvAmount;
    } else {
      kdvBreakdown.push({
        rate: item.kdvRate,
        amount: tax.baseAmount,
        kdvAmount: tax.kdvAmount
      });
    }
  });

  return {
    subtotal,
    kdvBreakdown,
    totalKdv,
    grandTotal: subtotal + totalKdv
  };
}

/**
 * Format Turkish currency with proper formatting
 */
export function formatTurkishCurrency(
  amount: number, 
  options: {
    showSymbol?: boolean;
    showKdv?: boolean;
    kdvRate?: number;
    isKdvInclusive?: boolean;
  } = {}
): string {
  const {
    showSymbol = true,
    showKdv = false,
    kdvRate = TURKISH_KDV_RATES.STANDARD,
    isKdvInclusive = true
  } = options;

  let displayAmount = amount;
  let suffix = '';

  if (showKdv) {
    const tax = calculateTurkishTax(amount, kdvRate, isKdvInclusive);
    if (isKdvInclusive) {
      suffix = ` (KDV %${(kdvRate * 100).toFixed(0)} dahil)`;
    } else {
      suffix = ` + KDV %${(kdvRate * 100).toFixed(0)}`;
    }
    displayAmount = tax.totalWithKdv;
  }

  const formatted = displayAmount.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return showSymbol ? `${formatted}₺${suffix}` : `${formatted}${suffix}`;
}

/**
 * Generate Turkish invoice with proper KDV calculations
 */
export function generateTurkishInvoice(
  invoiceNumber: string,
  customerInfo: TurkishInvoice['customerInfo'],
  items: Array<{
    id: string;
    description: string;
    descriptionTr: string;
    quantity: number;
    unitPrice: number;
    kdvRate?: number;
  }>
): TurkishInvoice {
  const invoiceItems: TurkishInvoiceItem[] = items.map(item => {
    const kdvRate = item.kdvRate || TURKISH_KDV_RATES.STANDARD;
    const subtotal = item.quantity * item.unitPrice;
    const kdvAmount = calculateKdvAmount(subtotal, kdvRate);
    const total = subtotal + kdvAmount;

    return {
      id: item.id,
      description: item.description,
      descriptionTr: item.descriptionTr,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal,
      kdvRate,
      kdvAmount,
      total
    };
  });

  const subtotal = invoiceItems.reduce((sum, item) => sum + item.subtotal, 0);
  const totalKdv = invoiceItems.reduce((sum, item) => sum + item.kdvAmount, 0);
  const grandTotal = subtotal + totalKdv;

  // Group KDV by rate
  const kdvBreakdown: Array<{
    rate: number;
    amount: number;
    kdvAmount: number;
  }> = [];

  invoiceItems.forEach(item => {
    const existingRate = kdvBreakdown.find(b => b.rate === item.kdvRate);
    if (existingRate) {
      existingRate.amount += item.subtotal;
      existingRate.kdvAmount += item.kdvAmount;
    } else {
      kdvBreakdown.push({
        rate: item.kdvRate,
        amount: item.subtotal,
        kdvAmount: item.kdvAmount
      });
    }
  });

  return {
    invoiceNumber,
    date: new Date(),
    customerInfo,
    items: invoiceItems,
    subtotal,
    totalKdv,
    grandTotal,
    currency: 'TRY',
    kdvBreakdown
  };
}

/**
 * Validate Turkish tax number (Vergi Numarası)
 */
export function validateTurkishTaxNumber(taxNumber: string): boolean {
  // Remove any non-digit characters
  const cleanNumber = taxNumber.replace(/\D/g, '');
  
  // Turkish tax number should be 10 digits
  if (cleanNumber.length !== 10) {
    return false;
  }

  // Check if all digits are the same (invalid)
  if (/^(\d)\1{9}$/.test(cleanNumber)) {
    return false;
  }

  // Turkish tax number validation algorithm
  const digits = cleanNumber.split('').map(Number);
  
  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const temp = (digits[i] + (10 - i - 1)) % 10;
    sum += temp * Math.pow(2, 10 - i - 1) % 9;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return checkDigit === digits[9];
}

/**
 * Get KDV rate for specific product category
 */
export function getKdvRateForCategory(category: string): number {
  const categoryKdvRates: Record<string, number> = {
    // Food and basic necessities - 8%
    'food': TURKISH_KDV_RATES.LOWER,
    'medicine': TURKISH_KDV_RATES.LOWER,
    'books': TURKISH_KDV_RATES.LOWER,
    'education': TURKISH_KDV_RATES.LOWER,
    
    // Some services - 18%
    'hotel': TURKISH_KDV_RATES.REDUCED,
    'restaurant': TURKISH_KDV_RATES.REDUCED,
    'transport': TURKISH_KDV_RATES.REDUCED,
    
    // Exports - 0%
    'export': TURKISH_KDV_RATES.ZERO,
    
    // Default - 20%
    'default': TURKISH_KDV_RATES.STANDARD
  };

  return categoryKdvRates[category.toLowerCase()] || TURKISH_KDV_RATES.STANDARD;
}

/**
 * Calculate monthly KDV declaration amounts
 */
export function calculateMonthlyKdvDeclaration(
  sales: Array<{ amount: number; kdvRate: number; isKdvInclusive: boolean }>,
  purchases: Array<{ amount: number; kdvRate: number; isKdvInclusive: boolean }>
): {
  salesKdv: number;
  purchaseKdv: number;
  kdvToPay: number;
  kdvToRefund: number;
  netKdv: number;
} {
  const salesKdv = sales.reduce((sum, sale) => {
    const tax = calculateTurkishTax(sale.amount, sale.kdvRate, sale.isKdvInclusive);
    return sum + tax.kdvAmount;
  }, 0);

  const purchaseKdv = purchases.reduce((sum, purchase) => {
    const tax = calculateTurkishTax(purchase.amount, purchase.kdvRate, purchase.isKdvInclusive);
    return sum + tax.kdvAmount;
  }, 0);

  const netKdv = salesKdv - purchaseKdv;
  const kdvToPay = netKdv > 0 ? netKdv : 0;
  const kdvToRefund = netKdv < 0 ? Math.abs(netKdv) : 0;

  return {
    salesKdv,
    purchaseKdv,
    kdvToPay,
    kdvToRefund,
    netKdv
  };
}

/**
 * Format Turkish date for invoices
 */
export function formatTurkishDate(date: Date): string {
  return date.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Generate Turkish invoice number
 */
export function generateTurkishInvoiceNumber(prefix: string = 'FAT', sequence: number = 1): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const sequenceStr = String(sequence).padStart(6, '0');
  
  return `${prefix}${year}${month}${sequenceStr}`;
}
