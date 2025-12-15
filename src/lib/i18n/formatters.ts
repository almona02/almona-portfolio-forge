/**
 * Internationalization Formatting Utilities
 * 
 * University-grade formatting functions for numbers, currency, dates, and units
 * with proper locale support for English, Arabic, and Turkish.
 * 
 * @author Almona Portfolio Forge Engineering Team
 * @version 1.0.0
 */

/**
 * Format a number according to locale
 * 
 * @param value - Number to format
 * @param locale - Locale code (e.g., 'en', 'ar', 'tr')
 * @param options - Intl.NumberFormatOptions
 * @returns Formatted number string
 * 
 * @example
 * formatNumber(1234.56, 'en') // "1,234.56"
 * formatNumber(1234.56, 'ar') // "١٬٢٣٤٫٥٦" or "1,234.56" (depending on preference)
 * formatNumber(1234.56, 'tr') // "1.234,56"
 */
export function formatNumber(
  value: number,
  locale: string = 'en',
  options: Intl.NumberFormatOptions = {}
): string {
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: options.minimumFractionDigits ?? 2,
      maximumFractionDigits: options.maximumFractionDigits ?? 2,
      ...options,
    }).format(value);
  } catch {
    // Fallback to simple string conversion
    return value.toFixed(options.maximumFractionDigits ?? 2);
  }
}

/**
 * Format currency according to locale and region
 * 
 * @param value - Amount to format
 * @param locale - Locale code (e.g., 'en', 'ar', 'tr')
 * @param currency - Currency code (e.g., 'EGP', 'TRY', 'USD')
 * @param options - Intl.NumberFormatOptions
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(1234.56, 'en', 'EGP') // "EGP 1,234.56"
 * formatCurrency(1234.56, 'ar', 'EGP') // "١٬٢٣٤٫٥٦ ج.م"
 * formatCurrency(1234.56, 'tr', 'TRY') // "1.234,56 ₺"
 */
export function formatCurrency(
  value: number,
  locale: string = 'en',
  currency: string = 'EGP',
  options: Intl.NumberFormatOptions = {}
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: options.minimumFractionDigits ?? 2,
      maximumFractionDigits: options.maximumFractionDigits ?? 2,
      ...options,
    }).format(value);
  } catch {
    // Fallback to simple format
    return `${value.toFixed(2)} ${currency}`;
  }
}

/**
 * Format a date according to locale
 * 
 * @param date - Date to format
 * @param locale - Locale code (e.g., 'en', 'ar', 'tr')
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 * 
 * @example
 * formatDate(new Date(), 'en') // "1/15/2025"
 * formatDate(new Date(), 'ar') // "١٥/١/٢٠٢٥" or "15/1/2025"
 * formatDate(new Date(), 'tr') // "15.01.2025"
 */
export function formatDate(
  date: Date | string | number,
  locale: string = 'en',
  options: Intl.DateTimeFormatOptions = {}
): string {
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' 
      ? new Date(date) 
      : date;
    
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...options,
    }).format(dateObj);
  } catch {
    // Fallback to ISO string
    const dateObj = typeof date === 'string' || typeof date === 'number' 
      ? new Date(date) 
      : date;
    return dateObj.toLocaleDateString();
  }
}

/**
 * Get currency code based on region
 * 
 * @param region - Region code (e.g., 'egypt', 'turkey', 'mena')
 * @returns Currency code
 */
export function getCurrencyForRegion(region?: string): string {
  const regionLower = region?.toLowerCase() || '';
  
  if (regionLower.includes('turkey') || regionLower.includes('tr')) {
    return 'TRY';
  }
  if (regionLower.includes('egypt') || regionLower.includes('eg') || regionLower.includes('mena')) {
    return 'EGP';
  }
  if (regionLower.includes('gulf') || regionLower.includes('uae') || regionLower.includes('saudi')) {
    return 'SAR'; // or AED, depending on specific country
  }
  
  return 'USD'; // Default
}

/**
 * Format measurement with unit
 * 
 * @param value - Measurement value
 * @param unit - Unit key (e.g., 'mm', 'kg', 'm2')
 * @param locale - Locale code
 * @param t - Translation function
 * @returns Formatted measurement string
 * 
 * @example
 * formatMeasurement(1234.56, 'mm', 'en', t) // "1,234.56 mm"
 * formatMeasurement(1234.56, 'kg', 'ar', t) // "١٬٢٣٤٫٥٦ كجم"
 */
export function formatMeasurement(
  value: number,
  unit: string,
  locale: string = 'en',
  t: (key: string, fallback?: string) => string
): string {
  const formattedValue = formatNumber(value, locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  
  const unitLabel = t(`engineering_bay.units.${unit}`, unit);
  
  // For RTL languages, unit might come before number
  const isRTL = ['ar', 'fa', 'he', 'ur'].some(prefix => locale.startsWith(prefix));
  
  return isRTL ? `${unitLabel} ${formattedValue}` : `${formattedValue} ${unitLabel}`;
}

/**
 * Format quantity with proper pluralization
 * 
 * @param quantity - Quantity value
 * @param unit - Unit key (e.g., 'quantity', 'bars', 'meters')
 * @param locale - Locale code
 * @param t - Translation function
 * @returns Formatted quantity string
 * 
 * @example
 * formatQuantity(5, 'bars', 'en', t) // "5 bars"
 * formatQuantity(1, 'bars', 'en', t) // "1 bar" (if pluralization implemented)
 */
export function formatQuantity(
  quantity: number,
  unit: string,
  locale: string = 'en',
  t: (key: string, fallback?: string) => string
): string {
  const unitLabel = t(`engineering_bay.units.${unit}`, unit);
  
  // Simple pluralization (can be enhanced with i18next pluralization)
  if (quantity === 1 && unit !== 'quantity') {
    // For singular forms, you might want to add singular keys
    // For now, we'll use the same label
    return `${quantity}${unit === 'quantity' ? unitLabel : ` ${unitLabel}`}`;
  }
  
  return `${quantity}${unit === 'quantity' ? unitLabel : ` ${unitLabel}`}`;
}

