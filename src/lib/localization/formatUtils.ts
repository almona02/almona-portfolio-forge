/**
 * Localization Format Utilities
 * Week 4: Comprehensive Localization Polish
 * 
 * Provides region-specific formatting for dates, numbers, currencies, and units
 */

export type Locale = 'en' | 'tr' | 'ar' | 'de' | 'fr';

export interface LocaleConfig {
  locale: Locale;
  currency: string;
  currencySymbol: string;
  decimalSeparator: string;
  thousandsSeparator: string;
  dateFormat: string;
  timeFormat: string;
  paperSize: 'A4' | 'Letter';
  defaultUnit: 'mm' | 'cm' | 'm' | 'inches';
  rtl: boolean;
}

/**
 * Locale configurations
 */
export const localeConfigs: Record<Locale, LocaleConfig> = {
  en: {
    locale: 'en',
    currency: 'USD',
    currencySymbol: '$',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    paperSize: 'Letter',
    defaultUnit: 'inches',
    rtl: false,
  },
  tr: {
    locale: 'tr',
    currency: 'TRY',
    currencySymbol: '₺',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h',
    paperSize: 'A4',
    defaultUnit: 'mm',
    rtl: false,
  },
  ar: {
    locale: 'ar',
    currency: 'EGP',
    currencySymbol: 'ج.م',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    paperSize: 'A4',
    defaultUnit: 'mm',
    rtl: true,
  },
  de: {
    locale: 'de',
    currency: 'EUR',
    currencySymbol: '€',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h',
    paperSize: 'A4',
    defaultUnit: 'mm',
    rtl: false,
  },
  fr: {
    locale: 'fr',
    currency: 'EUR',
    currencySymbol: '€',
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    paperSize: 'A4',
    defaultUnit: 'mm',
    rtl: false,
  },
};

/**
 * Get locale configuration
 */
export function getLocaleConfig(locale: Locale): LocaleConfig {
  return localeConfigs[locale] || localeConfigs.en;
}

/**
 * Format number according to locale
 */
export function formatNumber(
  value: number,
  locale: Locale = 'en',
  decimals: number = 2
): string {
  const config = getLocaleConfig(locale);
  const formatted = value.toFixed(decimals);
  
  // Replace decimal separator
  const result = formatted.replace('.', config.decimalSeparator);
  
  // Add thousands separator
  const parts = result.split(config.decimalSeparator);
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, config.thousandsSeparator);
  
  return parts.join(config.decimalSeparator);
}

/**
 * Format currency according to locale
 */
export function formatCurrency(
  value: number,
  locale: Locale = 'en',
  decimals: number = 2
): string {
  const config = getLocaleConfig(locale);
  const formatted = formatNumber(value, locale, decimals);
  
  if (config.rtl) {
    return `${formatted} ${config.currencySymbol}`;
  } else {
    return `${config.currencySymbol}${formatted}`;
  }
}

/**
 * Format date according to locale
 */
export function formatDate(
  date: Date,
  locale: Locale = 'en'
): string {
  const config = getLocaleConfig(locale);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  switch (config.dateFormat) {
    case 'DD.MM.YYYY':
      return `${day}.${month}.${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    default:
      return date.toLocaleDateString(config.locale);
  }
}

/**
 * Convert units (mm, cm, m, inches)
 */
export function convertUnit(
  value: number,
  fromUnit: 'mm' | 'cm' | 'm' | 'inches',
  toUnit: 'mm' | 'cm' | 'm' | 'inches'
): number {
  // Convert to mm first
  let valueInMm: number;
  switch (fromUnit) {
    case 'mm':
      valueInMm = value;
      break;
    case 'cm':
      valueInMm = value * 10;
      break;
    case 'm':
      valueInMm = value * 1000;
      break;
    case 'inches':
      valueInMm = value * 25.4;
      break;
    default:
      valueInMm = value;
  }
  
  // Convert from mm to target unit
  switch (toUnit) {
    case 'mm':
      return valueInMm;
    case 'cm':
      return valueInMm / 10;
    case 'm':
      return valueInMm / 1000;
    case 'inches':
      return valueInMm / 25.4;
    default:
      return valueInMm;
  }
}

/**
 * Format unit with locale preference
 */
export function formatUnit(
  value: number,
  locale: Locale = 'en',
  precision: number = 2
): string {
  const config = getLocaleConfig(locale);
  const converted = convertUnit(value, 'mm', config.defaultUnit);
  const formatted = formatNumber(converted, locale, precision);
  
  // Unit labels
  const unitLabels: Record<string, Record<Locale, string>> = {
    mm: { en: 'mm', tr: 'mm', ar: 'مم', de: 'mm', fr: 'mm' },
    cm: { en: 'cm', tr: 'cm', ar: 'سم', de: 'cm', fr: 'cm' },
    m: { en: 'm', tr: 'm', ar: 'م', de: 'm', fr: 'm' },
    inches: { en: 'in', tr: 'inç', ar: 'بوصة', de: 'Zoll', fr: 'po' },
  };
  
  const unitLabel = unitLabels[config.defaultUnit]?.[locale] || config.defaultUnit;
  
  if (config.rtl) {
    return `${unitLabel} ${formatted}`;
  } else {
    return `${formatted} ${unitLabel}`;
  }
}

/**
 * Get RTL direction class
 */
export function getRTLClass(locale: Locale): string {
  const config = getLocaleConfig(locale);
  return config.rtl ? 'rtl' : 'ltr';
}

/**
 * Get text alignment for locale
 */
export function getTextAlign(locale: Locale, defaultAlign: 'left' | 'right' | 'center' = 'left'): string {
  const config = getLocaleConfig(locale);
  
  if (defaultAlign === 'center') return 'text-center';
  
  if (config.rtl) {
    return defaultAlign === 'left' ? 'text-right' : 'text-left';
  } else {
    return defaultAlign === 'left' ? 'text-left' : 'text-right';
  }
}

/**
 * Reverse array for RTL display
 */
export function reverseForRTL<T>(array: T[], locale: Locale): T[] {
  const config = getLocaleConfig(locale);
  return config.rtl ? [...array].reverse() : array;
}

