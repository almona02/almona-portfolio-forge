/**
 * Region Detection Hook
 * Integrates with existing i18n structure and provides region-aware functionality
 */

import { RegionCode, getRegionalConfig } from '@/config/regionalConfig';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface RegionDetectionState {
  region: RegionCode;
  isLoading: boolean;
  error: string | null;
  detectedBy: 'ip' | 'preference' | 'language' | 'fallback';
  lastUpdated: Date | null;
}

export interface RegionDetectionOptions {
  enableIPDetection?: boolean;
  enablePreferenceStorage?: boolean;
  fallbackRegion?: RegionCode;
  cacheTimeout?: number; // in milliseconds
  syncWithI18n?: boolean; // sync region changes with i18n language
}

const DEFAULT_OPTIONS: Required<RegionDetectionOptions> = {
  enableIPDetection: true,
  enablePreferenceStorage: true,
  fallbackRegion: 'DEFAULT',
  cacheTimeout: 24 * 60 * 60 * 1000, // 24 hours
  syncWithI18n: true
};

const STORAGE_KEY = 'almona_user_region_preference';
const CACHE_KEY = 'almona_region_cache';

interface CachedRegionData {
  region: RegionCode;
  detectedBy: 'ip' | 'preference' | 'language' | 'fallback';
  timestamp: number;
}

/**
 * IP Geolocation service response interface
 */
interface IPGeolocationResponse {
  country_code: string;
  country_name: string;
  region: string;
  city: string;
  timezone: string;
  latitude: number;
  longitude: number;
}

/**
 * Map country codes to region codes
 */
const COUNTRY_TO_REGION_MAP: Record<string, RegionCode> = {
  'TR': 'TR', // Turkey
  'EG': 'EG', // Egypt
  // Add more mappings as needed
};

/**
 * Map language codes to region codes
 */
const LANGUAGE_TO_REGION_MAP: Record<string, RegionCode> = {
  'tr': 'TR', // Turkish
  'ar': 'EG', // Arabic (Egypt)
  'en': 'DEFAULT' // English
};

/**
 * Get region from country code
 */
function getRegionFromCountryCode(countryCode: string): RegionCode {
  return COUNTRY_TO_REGION_MAP[countryCode] || 'DEFAULT';
}

/**
 * Get region from language code
 */
function getRegionFromLanguageCode(languageCode: string): RegionCode {
  const lang = languageCode.split('-')[0].toLowerCase();
  return LANGUAGE_TO_REGION_MAP[lang] || 'DEFAULT';
}

/**
 * Detect region using IP geolocation
 */
async function detectRegionByIP(): Promise<RegionCode> {
  try {
    // Using a free IP geolocation service with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: IPGeolocationResponse = await response.json();
    return getRegionFromCountryCode(data.country_code);
  } catch (error) {
    console.warn('IP geolocation failed:', error);
    throw error;
  }
}

/**
 * Get cached region data
 */
function getCachedRegion(): CachedRegionData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CachedRegionData = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - data.timestamp > DEFAULT_OPTIONS.cacheTimeout) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data;
  } catch (error) {
    console.warn('Failed to read cached region data:', error);
    return null;
  }
}

/**
 * Set cached region data
 */
function setCachedRegion(data: CachedRegionData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to cache region data:', error);
  }
}

/**
 * Get user's stored region preference
 */
function getUserRegionPreference(): RegionCode | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored as RegionCode || null;
  } catch (error) {
    console.warn('Failed to read user region preference:', error);
    return null;
  }
}

/**
 * Set user's region preference
 */
function setUserRegionPreference(region: RegionCode): void {
  try {
    localStorage.setItem(STORAGE_KEY, region);
  } catch (error) {
    console.warn('Failed to store user region preference:', error);
  }
}

/**
 * Detect region using browser language
 */
function detectRegionByLanguage(): RegionCode {
  const language = navigator.language || navigator.languages?.[0] || 'en';
  return getRegionFromLanguageCode(language);
}

/**
 * Main region detection hook
 */
export function useRegionDetection(options: RegionDetectionOptions = {}): {
  regionState: RegionDetectionState;
  setRegion: (region: RegionCode) => void;
  refreshRegion: () => Promise<void>;
} {
  const opts = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);
  const { i18n } = useTranslation();
  
  const [regionState, setRegionState] = useState<RegionDetectionState>({
    region: opts.fallbackRegion,
    isLoading: false, // Start with false to avoid loading state
    error: null,
    detectedBy: 'fallback',
    lastUpdated: new Date() // Initialize with current time
  });

  /**
   * Update region state and sync with i18n if enabled
   */
  const updateRegionState = useCallback((
    region: RegionCode,
    detectedBy: RegionDetectionState['detectedBy'],
    error: string | null = null
  ) => {
    setRegionState({
      region,
      isLoading: false,
      error,
      detectedBy,
      lastUpdated: new Date()
    });

    // Sync with i18n language if enabled
    if (opts.syncWithI18n) {
      const config = getRegionalConfig(region);
      const targetLanguage = config.language;
      
      if (i18n.language !== targetLanguage) {
        i18n.changeLanguage(targetLanguage);
      }
    }
  }, [opts.syncWithI18n, i18n]);

  /**
   * Set user's preferred region
   */
  const setRegion = useCallback((region: RegionCode) => {
    if (opts.enablePreferenceStorage) {
      setUserRegionPreference(region);
    }
    
    // Cache the user's choice
    setCachedRegion({
      region,
      detectedBy: 'preference',
      timestamp: Date.now()
    });
    
    updateRegionState(region, 'preference');
  }, [opts.enablePreferenceStorage, updateRegionState]);

  /**
   * Refresh region detection
   */
  const refreshRegion = useCallback(async () => {
    // Only set loading if we don't already have a valid region
    if (regionState.region === opts.fallbackRegion && !regionState.lastUpdated) {
      setRegionState(prev => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      // 1. Check cache first
      const cached = getCachedRegion();
      if (cached) {
        updateRegionState(cached.region, cached.detectedBy);
        return;
      }

      // 2. Check user preference
      const userPreference = getUserRegionPreference();
      if (userPreference) {
        setCachedRegion({
          region: userPreference,
          detectedBy: 'preference',
          timestamp: Date.now()
        });
        updateRegionState(userPreference, 'preference');
        return;
      }

      // 3. Try IP geolocation with timeout
      if (opts.enableIPDetection) {
        try {
          const detectedRegion = await Promise.race([
            detectRegionByIP(),
            new Promise<RegionCode>((_, reject) => 
              setTimeout(() => reject(new Error('IP detection timeout')), 2000)
            )
          ]);
          setCachedRegion({
            region: detectedRegion,
            detectedBy: 'ip',
            timestamp: Date.now()
          });
          updateRegionState(detectedRegion, 'ip');
          return;
        } catch (ipError) {
          console.warn('IP detection failed, falling back to language detection:', ipError);
        }
      }

      // 4. Fallback to language detection
      const languageRegion = detectRegionByLanguage();
      setCachedRegion({
        region: languageRegion,
        detectedBy: 'language',
        timestamp: Date.now()
      });
      updateRegionState(languageRegion, 'language');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateRegionState(opts.fallbackRegion, 'fallback', errorMessage);
    }
  }, [opts, updateRegionState, regionState.region, regionState.lastUpdated]);

  /**
   * Initial region detection
   */
  useEffect(() => {
    // Only refresh if we don't have a valid region yet
    if (regionState.region === opts.fallbackRegion && !regionState.lastUpdated) {
      refreshRegion();
    }
  }, [refreshRegion, regionState.region, regionState.lastUpdated, opts.fallbackRegion]);

  /**
   * Listen to i18n language changes and update region accordingly
   */
  useEffect(() => {
    if (!opts.syncWithI18n) return;

    const handleLanguageChange = (lng: string) => {
      const regionFromLanguage = getRegionFromLanguageCode(lng);
      if (regionFromLanguage !== regionState.region) {
        setRegionState(prev => ({
          ...prev,
          region: regionFromLanguage,
          detectedBy: 'language'
        }));
      }
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n, opts.syncWithI18n, regionState.region]);

  return {
    regionState,
    setRegion,
    refreshRegion
  };
}

/**
 * Hook to get current regional configuration
 */
export function useRegionalConfig(options: RegionDetectionOptions = {}) {
  const { regionState } = useRegionDetection(options);
  
  return {
    config: getRegionalConfig(regionState.region),
    region: regionState.region,
    isLoading: regionState.isLoading,
    error: regionState.error
  };
}

/**
 * Hook for region-specific utilities
 */
export function useRegionUtils(options: RegionDetectionOptions = {}) {
  const { regionState } = useRegionDetection(options);
  const config = getRegionalConfig(regionState.region);

  return {
    formatCurrency: (amount: number, currencyOptions?: { showSymbol?: boolean; showCode?: boolean; includeTax?: boolean }) => {
      let finalAmount = amount;
      
      // Handle tax inclusion/exclusion
      if (currencyOptions?.includeTax && !config.tax.vatInclusive) {
        finalAmount = amount * (1 + config.tax.vatRate);
      } else if (!currencyOptions?.includeTax && config.tax.vatInclusive) {
        finalAmount = amount / (1 + config.tax.vatRate);
      }
      
      const formattedAmount = finalAmount.toLocaleString('en-US', {
        minimumFractionDigits: config.currency.decimalPlaces,
        maximumFractionDigits: config.currency.decimalPlaces
      });

      const symbol = currencyOptions?.showSymbol !== false ? config.currency.symbol : '';
      const code = currencyOptions?.showCode ? ` ${config.currency.code}` : '';

      if (config.currency.position === 'before') {
        return `${symbol}${formattedAmount}${code}`;
      } else {
        return `${formattedAmount}${symbol}${code}`;
      }
    },
    
    formatDate: (date: Date | string, dateOptions?: { includeTime?: boolean }) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString(config.language === 'tr' ? 'tr-TR' : config.language === 'ar' ? 'ar-EG' : 'en-US', {
        timeZone: config.business.workingHours.timezone,
        ...(dateOptions?.includeTime && {
          hour: '2-digit',
          minute: '2-digit'
        })
      });
    },
    
    isBusinessHours: () => {
      const now = new Date();
      const currentTime = now.toLocaleTimeString('en-US', {
        timeZone: config.business.workingHours.timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const currentDay = now.getDay();
      const isWorkingDay = config.business.workingHours.workingDays.includes(currentDay);
      
      return isWorkingDay && currentTime >= config.business.workingHours.start && 
             currentTime <= config.business.workingHours.end;
    },
    
    calculateTax: (amount: number) => amount * config.tax.vatRate,
    calculateTotalWithTax: (amount: number) => config.tax.vatInclusive ? amount : amount * (1 + config.tax.vatRate),
    calculateAmountWithoutTax: (amount: number) => !config.tax.vatInclusive ? amount : amount / (1 + config.tax.vatRate),
    getPaymentMethods: () => config.pricing.paymentMethods,
    getShippingInfo: (type: 'domestic' | 'international') => config.pricing.shipping[type],
    getSupportContactMethods: () => config.business.contactMethods.support,
    getComplianceTemplates: () => config.compliance.documentation.templates,
    getRequiredComplianceDocuments: () => config.compliance.documentation.required,
    isFeatureEnabled: (feature: keyof typeof config.features) => config.features[feature]
  };
}

/**
 * Hook for Turkish-specific tax calculations (KDV)
 */
export function useTurkishTaxUtils() {
  const { regionState } = useRegionDetection();
  const config = getRegionalConfig(regionState.region);
  
  const isTurkish = regionState.region === 'TR';
  
  return {
    isTurkish,
    kdvRate: config.tax.vatRate, // 0.20 for Turkey
    kdvName: config.tax.vatName, // 'KDV'
    vatInclusive: config.tax.vatInclusive,
    
    calculateKDV: (amount: number) => isTurkish ? amount * config.tax.vatRate : 0,
    calculateTotalWithKDV: (amount: number) => isTurkish ? (config.tax.vatInclusive ? amount : amount * (1 + config.tax.vatRate)) : amount,
    calculateAmountWithoutKDV: (amount: number) => isTurkish ? (!config.tax.vatInclusive ? amount : amount / (1 + config.tax.vatRate)) : amount,
    
    formatTurkishCurrency: (amount: number, options?: { showSymbol?: boolean; includeKDV?: boolean }) => {
      if (!isTurkish) return amount.toString();
      
      let finalAmount = amount;
      if (options?.includeKDV && !config.tax.vatInclusive) {
        finalAmount = amount * (1 + config.tax.vatRate);
      } else if (!options?.includeKDV && config.tax.vatInclusive) {
        finalAmount = amount / (1 + config.tax.vatRate);
      }
      
      const formattedAmount = finalAmount.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      
      const symbol = options?.showSymbol !== false ? '₺' : '';
      return `${formattedAmount}${symbol}`;
    }
  };
}