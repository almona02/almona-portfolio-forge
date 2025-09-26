/**
 * Regional Configuration for Turkish and Egyptian Markets
 * Centralized configuration for market-specific settings, pricing, and compliance
 */

export type RegionCode = 'TR' | 'EG' | 'DEFAULT';

export interface RegionalMarketConfig {
  region: RegionCode;
  language: string;
  currency: {
    code: string;
    symbol: string;
    position: 'before' | 'after';
    decimalPlaces: number;
    thousandsSeparator: string;
    decimalSeparator: string;
  };
  tax: {
    vatRate: number; // VAT/KDV rate as decimal (0.20 = 20%)
    vatName: string; // Local name for VAT (KDV, VAT, etc.)
    vatInclusive: boolean; // Whether prices are displayed with or without tax
  };
  compliance: {
    standards: string[];
    certifications: string[];
    documentation: {
      required: string[];
      templates: string[];
    };
  };
  business: {
    workingHours: {
      start: string;
      end: string;
      timezone: string;
      workingDays: number[]; // 0 = Sunday, 1 = Monday, etc.
    };
    contactMethods: {
      primary: string;
      secondary: string[];
      support: {
        chat: boolean;
        phone: boolean;
        email: boolean;
        whatsapp: boolean;
      };
    };
  };
  features: {
    rtl: boolean;
    whatsappEnabled: boolean;
    localShipping: boolean;
    cashOnDelivery: boolean;
    ramadanMode: boolean;
    eidMode: boolean;
    arSupport: boolean;
    interactive3D: boolean;
    pricingCalculator: boolean;
  };
  pricing: {
    baseCurrency: string;
    exchangeRate?: number; // If different from base currency
    shipping: {
      domestic: {
        enabled: boolean;
        cost: number;
        estimatedDays: number;
      };
      international: {
        enabled: boolean;
        cost: number;
        estimatedDays: number;
      };
    };
    paymentMethods: string[];
  };
}

// Turkish Market Configuration
export const TURKISH_CONFIG: RegionalMarketConfig = {
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
  tax: {
    vatRate: 0.20, // KDV 20%
    vatName: 'KDV',
    vatInclusive: true
  },
  compliance: {
    standards: ['TS EN 14351-1', 'TS EN 12608', 'TS EN 14024'],
    certifications: ['CE', 'TSE', 'ISO 9001'],
    documentation: {
      required: ['Fatura', 'İrsaliye', 'KDV Beyannamesi'],
      templates: ['turkish-invoice-template', 'turkish-delivery-note', 'turkish-vat-declaration']
    }
  },
  business: {
    workingHours: {
      start: '09:00',
      end: '18:00',
      timezone: 'Europe/Istanbul',
      workingDays: [1, 2, 3, 4, 5] // Monday to Friday
    },
    contactMethods: {
      primary: 'whatsapp',
      secondary: ['phone', 'email'],
      support: {
        chat: true,
        phone: true,
        email: true,
        whatsapp: true
      }
    }
  },
  features: {
    rtl: false,
    whatsappEnabled: true,
    localShipping: true,
    cashOnDelivery: true,
    ramadanMode: true,
    eidMode: true,
    arSupport: true,
    interactive3D: true,
    pricingCalculator: true
  },
  pricing: {
    baseCurrency: 'TRY',
    shipping: {
      domestic: {
        enabled: true,
        cost: 0, // Free shipping within Turkey
        estimatedDays: 3
      },
      international: {
        enabled: true,
        cost: 50,
        estimatedDays: 7
      }
    },
    paymentMethods: ['credit_card', 'bank_transfer', 'cash_on_delivery', 'installment']
  }
};

// Egyptian Market Configuration
export const EGYPTIAN_CONFIG: RegionalMarketConfig = {
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
  tax: {
    vatRate: 0.14, // VAT 14%
    vatName: 'VAT',
    vatInclusive: true
  },
  compliance: {
    standards: ['ES 1109', 'ES 14351-1', 'ES 12608'],
    certifications: ['CE', 'ES', 'ISO 9001'],
    documentation: {
      required: ['فاتورة', 'إيصال تسليم', 'إقرار ضريبة القيمة المضافة'],
      templates: ['egyptian-invoice-template', 'egyptian-delivery-note', 'egyptian-vat-declaration']
    }
  },
  business: {
    workingHours: {
      start: '09:00',
      end: '17:00',
      timezone: 'Africa/Cairo',
      workingDays: [0, 1, 2, 3, 4, 5, 6] // Sunday to Saturday
    },
    contactMethods: {
      primary: 'whatsapp',
      secondary: ['phone', 'email'],
      support: {
        chat: true,
        phone: true,
        email: true,
        whatsapp: true
      }
    }
  },
  features: {
    rtl: true,
    whatsappEnabled: true,
    localShipping: true,
    cashOnDelivery: true,
    ramadanMode: true,
    eidMode: true,
    arSupport: true,
    interactive3D: true,
    pricingCalculator: true
  },
  pricing: {
    baseCurrency: 'EGP',
    shipping: {
      domestic: {
        enabled: true,
        cost: 0, // Free shipping within Egypt
        estimatedDays: 2
      },
      international: {
        enabled: true,
        cost: 75,
        estimatedDays: 10
      }
    },
    paymentMethods: ['credit_card', 'bank_transfer', 'cash_on_delivery', 'mobile_payment']
  }
};

// Default Configuration
export const DEFAULT_CONFIG: RegionalMarketConfig = {
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
  tax: {
    vatRate: 0.00, // No VAT for default
    vatName: 'VAT',
    vatInclusive: false
  },
  compliance: {
    standards: [],
    certifications: ['CE'],
    documentation: {
      required: ['Invoice', 'Delivery Note'],
      templates: ['default-invoice-template', 'default-delivery-note']
    }
  },
  business: {
    workingHours: {
      start: '09:00',
      end: '17:00',
      timezone: 'UTC',
      workingDays: [1, 2, 3, 4, 5] // Monday to Friday
    },
    contactMethods: {
      primary: 'email',
      secondary: ['phone'],
      support: {
        chat: false,
        phone: true,
        email: true,
        whatsapp: false
      }
    }
  },
  features: {
    rtl: false,
    whatsappEnabled: false,
    localShipping: false,
    cashOnDelivery: false,
    ramadanMode: false,
    eidMode: false,
    arSupport: false,
    interactive3D: false,
    pricingCalculator: false
  },
  pricing: {
    baseCurrency: 'USD',
    shipping: {
      domestic: {
        enabled: false,
        cost: 0,
        estimatedDays: 0
      },
      international: {
        enabled: true,
        cost: 100,
        estimatedDays: 14
      }
    },
    paymentMethods: ['credit_card', 'bank_transfer']
  }
};

// Regional configurations mapping
export const REGIONAL_CONFIGS: Record<RegionCode, RegionalMarketConfig> = {
  TR: TURKISH_CONFIG,
  EG: EGYPTIAN_CONFIG,
  DEFAULT: DEFAULT_CONFIG
};

/**
 * Get regional configuration by region code
 */
export function getRegionalConfig(regionCode: RegionCode): RegionalMarketConfig {
  return REGIONAL_CONFIGS[regionCode] || REGIONAL_CONFIGS.DEFAULT;
}

/**
 * Format currency according to regional settings
 */
export function formatCurrency(
  amount: number,
  regionCode: RegionCode,
  options?: { showSymbol?: boolean; showCode?: boolean; includeTax?: boolean }
): string {
  const config = getRegionalConfig(regionCode);
  const { currency, tax } = config;
  
  let finalAmount = amount;
  
  // Add tax if requested and not already included
  if (options?.includeTax && !tax.vatInclusive) {
    finalAmount = amount * (1 + tax.vatRate);
  }
  
  // Remove tax if requested and already included
  if (!options?.includeTax && tax.vatInclusive) {
    finalAmount = amount / (1 + tax.vatRate);
  }
  
  const formattedAmount = finalAmount.toLocaleString('en-US', {
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
 * Calculate tax amount
 */
export function calculateTax(amount: number, regionCode: RegionCode): number {
  const config = getRegionalConfig(regionCode);
  return amount * config.tax.vatRate;
}

/**
 * Calculate total with tax
 */
export function calculateTotalWithTax(amount: number, regionCode: RegionCode): number {
  const config = getRegionalConfig(regionCode);
  if (config.tax.vatInclusive) {
    return amount; // Tax already included
  }
  return amount * (1 + config.tax.vatRate);
}

/**
 * Calculate amount without tax
 */
export function calculateAmountWithoutTax(amount: number, regionCode: RegionCode): number {
  const config = getRegionalConfig(regionCode);
  if (!config.tax.vatInclusive) {
    return amount; // Tax not included
  }
  return amount / (1 + config.tax.vatRate);
}

/**
 * Get available payment methods for a region
 */
export function getPaymentMethods(regionCode: RegionCode): string[] {
  const config = getRegionalConfig(regionCode);
  return config.pricing.paymentMethods;
}

/**
 * Check if a feature is enabled for a region
 */
export function isFeatureEnabled(regionCode: RegionCode, feature: keyof RegionalMarketConfig['features']): boolean {
  const config = getRegionalConfig(regionCode);
  return config.features[feature];
}

/**
 * Get business hours for a region
 */
export function getBusinessHours(regionCode: RegionCode) {
  const config = getRegionalConfig(regionCode);
  return config.business.workingHours;
}

/**
 * Check if current time is within business hours for a region
 */
export function isBusinessHours(regionCode: RegionCode): boolean {
  const config = getRegionalConfig(regionCode);
  const { workingHours } = config.business;
  
  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-US', {
    timeZone: workingHours.timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const currentDay = now.getDay();
  const isWorkingDay = workingHours.workingDays.includes(currentDay);
  
  return isWorkingDay && currentTime >= workingHours.start && currentTime <= workingHours.end;
}

/**
 * Get compliance documentation templates for a region
 */
export function getComplianceTemplates(regionCode: RegionCode): string[] {
  const config = getRegionalConfig(regionCode);
  return config.compliance.documentation.templates;
}

/**
 * Get required compliance documents for a region
 */
export function getRequiredComplianceDocuments(regionCode: RegionCode): string[] {
  const config = getRegionalConfig(regionCode);
  return config.compliance.documentation.required;
}

/**
 * Get shipping information for a region
 */
export function getShippingInfo(regionCode: RegionCode, type: 'domestic' | 'international') {
  const config = getRegionalConfig(regionCode);
  return config.pricing.shipping[type];
}

/**
 * Get support contact methods for a region
 */
export function getSupportContactMethods(regionCode: RegionCode) {
  const config = getRegionalConfig(regionCode);
  return config.business.contactMethods.support;
}
