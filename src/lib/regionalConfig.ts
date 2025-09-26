/**
 * Dynamic Regional Configuration System
 * Supports Turkey (TR) and Egypt (EG) with currency, date formats, and market-specific settings
 */

export type RegionCode = 'TR' | 'EG' | 'DEFAULT';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  position: 'before' | 'after';
  decimalPlaces: number;
  thousandsSeparator: string;
  decimalSeparator: string;
}

export interface DateConfig {
  format: string;
  locale: string;
  timezone: string;
  firstDayOfWeek: number; // 0 = Sunday, 1 = Monday
}

export interface MarketConfig {
  businessHours: {
    start: string;
    end: string;
    timezone: string;
  };
  contactMethods: {
    primary: string;
    secondary: string[];
  };
  shipping: {
    domestic: {
      enabled: boolean;
      estimatedDays: number;
      cost: number;
    };
    international: {
      enabled: boolean;
      estimatedDays: number;
      cost: number;
    };
  };
  paymentMethods: string[];
  cultural: {
    greeting: string;
    farewell: string;
    specialOccasions: string[];
  };
}

export interface RegionalConfig {
  region: RegionCode;
  language: string;
  currency: CurrencyConfig;
  date: DateConfig;
  market: MarketConfig;
  features: {
    rtl: boolean;
    whatsappEnabled: boolean;
    localShipping: boolean;
    cashOnDelivery: boolean;
    ramadanMode: boolean;
    eidMode: boolean;
  };
}

// Regional configurations
export const regionalConfigs: Record<RegionCode, RegionalConfig> = {
  TR: {
    region: 'TR',
    language: 'tr',
    currency: {
      code: 'TRY',
      symbol: '₺',
      position: 'after',
      decimalPlaces: 2,
      thousandsSeparator: '.',
      decimalSeparator: ','
    },
    date: {
      format: 'DD.MM.YYYY',
      locale: 'tr-TR',
      timezone: 'Europe/Istanbul',
      firstDayOfWeek: 1 // Monday
    },
    market: {
      businessHours: {
        start: '09:00',
        end: '18:00',
        timezone: 'Europe/Istanbul'
      },
      contactMethods: {
        primary: 'whatsapp',
        secondary: ['phone', 'email']
      },
      shipping: {
        domestic: {
          enabled: true,
          estimatedDays: 3,
          cost: 0 // Free shipping for Turkey
        },
        international: {
          enabled: true,
          estimatedDays: 7,
          cost: 50
        }
      },
      paymentMethods: ['credit_card', 'bank_transfer', 'cash_on_delivery'],
      cultural: {
        greeting: 'Merhaba',
        farewell: 'Görüşürüz',
        specialOccasions: ['Ramazan Bayramı', 'Kurban Bayramı', 'Cumhuriyet Bayramı']
      }
    },
    features: {
      rtl: false,
      whatsappEnabled: true,
      localShipping: true,
      cashOnDelivery: true,
      ramadanMode: true,
      eidMode: true
    }
  },
  EG: {
    region: 'EG',
    language: 'ar',
    currency: {
      code: 'EGP',
      symbol: 'ج.م',
      position: 'after',
      decimalPlaces: 2,
      thousandsSeparator: ',',
      decimalSeparator: '.'
    },
    date: {
      format: 'DD/MM/YYYY',
      locale: 'ar-EG',
      timezone: 'Africa/Cairo',
      firstDayOfWeek: 0 // Sunday
    },
    market: {
      businessHours: {
        start: '09:00',
        end: '17:00',
        timezone: 'Africa/Cairo'
      },
      contactMethods: {
        primary: 'whatsapp',
        secondary: ['phone', 'email']
      },
      shipping: {
        domestic: {
          enabled: true,
          estimatedDays: 2,
          cost: 0 // Free shipping for Egypt
        },
        international: {
          enabled: true,
          estimatedDays: 10,
          cost: 75
        }
      },
      paymentMethods: ['credit_card', 'bank_transfer', 'cash_on_delivery', 'mobile_payment'],
      cultural: {
        greeting: 'أهلاً وسهلاً',
        farewell: 'مع السلامة',
        specialOccasions: ['رمضان', 'عيد الفطر', 'عيد الأضحى', 'ثورة 25 يناير']
      }
    },
    features: {
      rtl: true,
      whatsappEnabled: true,
      localShipping: true,
      cashOnDelivery: true,
      ramadanMode: true,
      eidMode: true
    }
  },
  DEFAULT: {
    region: 'DEFAULT',
    language: 'en',
    currency: {
      code: 'USD',
      symbol: '$',
      position: 'before',
      decimalPlaces: 2,
      thousandsSeparator: ',',
      decimalSeparator: '.'
    },
    date: {
      format: 'MM/DD/YYYY',
      locale: 'en-US',
      timezone: 'UTC',
      firstDayOfWeek: 0 // Sunday
    },
    market: {
      businessHours: {
        start: '09:00',
        end: '17:00',
        timezone: 'UTC'
      },
      contactMethods: {
        primary: 'email',
        secondary: ['phone']
      },
      shipping: {
        domestic: {
          enabled: false,
          estimatedDays: 0,
          cost: 0
        },
        international: {
          enabled: true,
          estimatedDays: 14,
          cost: 100
        }
      },
      paymentMethods: ['credit_card', 'bank_transfer'],
      cultural: {
        greeting: 'Hello',
        farewell: 'Goodbye',
        specialOccasions: []
      }
    },
    features: {
      rtl: false,
      whatsappEnabled: false,
      localShipping: false,
      cashOnDelivery: false,
      ramadanMode: false,
      eidMode: false
    }
  }
};

/**
 * Get regional configuration by region code
 */
export function getRegionalConfig(regionCode: RegionCode): RegionalConfig {
  return regionalConfigs[regionCode] || regionalConfigs.DEFAULT;
}

/**
 * Format currency according to regional settings
 */
export function formatCurrency(
  amount: number,
  regionCode: RegionCode,
  options?: { showSymbol?: boolean; showCode?: boolean }
): string {
  const config = getRegionalConfig(regionCode);
  const { currency } = config;
  
  const formattedAmount = amount.toLocaleString(currency.locale || 'en-US', {
    minimumFractionDigits: currency.decimalPlaces,
    maximumFractionDigits: currency.decimalPlaces
  });

  const symbol = options?.showSymbol !== false ? currency.symbol : '';
  const code = options?.showCode ? ` ${currency.code}` : '';

  if (currency.position === 'before') {
    return `${symbol}${formattedAmount}${code}`;
  } else {
    return `${formattedAmount}${symbol}${code}`;
  }
}

/**
 * Format date according to regional settings
 */
export function formatDate(
  date: Date | string,
  regionCode: RegionCode,
  options?: { format?: string; includeTime?: boolean }
): string {
  const config = getRegionalConfig(regionCode);
  const { date: dateConfig } = config;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString(dateConfig.locale, {
    timeZone: dateConfig.timezone,
    ...(options?.includeTime && {
      hour: '2-digit',
      minute: '2-digit'
    })
  });
}

/**
 * Get business hours for a region
 */
export function getBusinessHours(regionCode: RegionCode): { start: string; end: string; timezone: string } {
  const config = getRegionalConfig(regionCode);
  return config.market.businessHours;
}

/**
 * Check if a feature is enabled for a region
 */
export function isFeatureEnabled(regionCode: RegionCode, feature: keyof RegionalConfig['features']): boolean {
  const config = getRegionalConfig(regionCode);
  return config.features[feature];
}

/**
 * Get available payment methods for a region
 */
export function getPaymentMethods(regionCode: RegionCode): string[] {
  const config = getRegionalConfig(regionCode);
  return config.market.paymentMethods;
}

/**
 * Get cultural greetings and farewells for a region
 */
export function getCulturalPhrases(regionCode: RegionCode): { greeting: string; farewell: string } {
  const config = getRegionalConfig(regionCode);
  return {
    greeting: config.market.cultural.greeting,
    farewell: config.market.cultural.farewell
  };
}

/**
 * Check if current time is within business hours for a region
 */
export function isBusinessHours(regionCode: RegionCode): boolean {
  const config = getRegionalConfig(regionCode);
  const { businessHours } = config.market;
  
  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-US', {
    timeZone: businessHours.timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return currentTime >= businessHours.start && currentTime <= businessHours.end;
}

/**
 * Get shipping information for a region
 */
export function getShippingInfo(regionCode: RegionCode, type: 'domestic' | 'international') {
  const config = getRegionalConfig(regionCode);
  return config.market.shipping[type];
}

/**
 * Get special occasions for a region
 */
export function getSpecialOccasions(regionCode: RegionCode): string[] {
  const config = getRegionalConfig(regionCode);
  return config.market.cultural.specialOccasions;
}
