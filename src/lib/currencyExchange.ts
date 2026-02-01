/**
 * Multi-Currency Support with Real-Time Exchange Rates
 * Handles TRY/EGP/USD conversions with caching and fallback rates
 */

import { useState, useCallback } from 'react';
import { RegionCode } from '@/config/regionalConfig';

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: number;
  source: 'api' | 'fallback' | 'cached';
}

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  region: RegionCode;
}

// Currency information
export const CURRENCY_INFO: Record<string, CurrencyInfo> = {
  TRY: {
    code: 'TRY',
    name: 'Turkish Lira',
    symbol: '₺',
    flag: '🇹🇷',
    region: 'TR'
  },
  EGP: {
    code: 'EGP',
    name: 'Egyptian Pound',
    symbol: 'ج.م',
    flag: '🇪🇬',
    region: 'EG'
  },
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    flag: '🇺🇸',
    region: 'DEFAULT'
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    flag: '🇪🇺',
    region: 'DEFAULT'
  }
};

// Fallback exchange rates (updated periodically)
const FALLBACK_RATES: Record<string, number> = {
  'USD_TRY': 34.50,
  'USD_EGP': 48.75,
  'EUR_TRY': 37.25,
  'EUR_EGP': 52.80,
  'TRY_EGP': 1.41,
  'EGP_TRY': 0.71
};

// Cache for exchange rates
const RATE_CACHE = new Map<string, ExchangeRate>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get exchange rate from cache or API
 */
export async function getExchangeRate(from: string, to: string): Promise<ExchangeRate> {
  const cacheKey = `${from}_${to}`;
  const cached = RATE_CACHE.get(cacheKey);
  
  // Return cached rate if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { ...cached, source: 'cached' };
  }

  try {
    // Try to fetch from API
    const rate = await fetchExchangeRateFromAPI(from, to);
    RATE_CACHE.set(cacheKey, rate);
    return rate;
  } catch (error) {
    console.warn('Failed to fetch exchange rate from API:', error);
    
    // Use fallback rate
    const fallbackRate = getFallbackRate(from, to);
    const rate: ExchangeRate = {
      from,
      to,
      rate: fallbackRate,
      timestamp: Date.now(),
      source: 'fallback'
    };
    
    RATE_CACHE.set(cacheKey, rate);
    return rate;
  }
}

/**
 * Fetch exchange rate from external API
 */
async function fetchExchangeRateFromAPI(from: string, to: string): Promise<ExchangeRate> {
  // Using exchangerate-api.com (free tier)
  const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  
  const data = await response.json();
  const rate = data.rates[to];
  
  if (!rate) {
    throw new Error(`Rate not found for ${from} to ${to}`);
  }
  
  return {
    from,
    to,
    rate,
    timestamp: Date.now(),
    source: 'api'
  };
}

/**
 * Get fallback exchange rate
 */
function getFallbackRate(from: string, to: string): number {
  const directKey = `${from}_${to}`;
  const reverseKey = `${to}_${from}`;
  
  if (FALLBACK_RATES[directKey]) {
    return FALLBACK_RATES[directKey];
  }
  
  if (FALLBACK_RATES[reverseKey]) {
    return 1 / FALLBACK_RATES[reverseKey];
  }
  
  // Default to 1 if no rate found
  return 1;
}

/**
 * Convert amount between currencies
 */
export async function convertCurrency(
  amount: number,
  from: string,
  to: string
): Promise<{
  amount: number;
  rate: number;
  source: string;
  timestamp: number;
}> {
  if (from === to) {
    return {
      amount,
      rate: 1,
      source: 'same_currency',
      timestamp: Date.now()
    };
  }
  
  const exchangeRate = await getExchangeRate(from, to);
  const convertedAmount = amount * exchangeRate.rate;
  
  return {
    amount: convertedAmount,
    rate: exchangeRate.rate,
    source: exchangeRate.source,
    timestamp: exchangeRate.timestamp
  };
}

/**
 * Format currency with proper locale
 */
export function formatCurrency(
  amount: number,
  currency: string,
  options: {
    showSymbol?: boolean;
    showFlag?: boolean;
    locale?: string;
    precision?: number;
  } = {}
): string {
  const {
    showSymbol = true,
    showFlag = false,
    locale = 'en-US',
    precision = 2
  } = options;
  
  const currencyInfo = CURRENCY_INFO[currency];
  if (!currencyInfo) {
    return amount.toLocaleString(locale, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    });
  }
  
  const formatted = amount.toLocaleString(locale, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  });
  
  let result = formatted;
  
  if (showFlag) {
    result = `${currencyInfo.flag} ${result}`;
  }
  
  if (showSymbol) {
    result = `${result} ${currencyInfo.symbol}`;
  }
  
  return result;
}

/**
 * Get all available currencies
 */
export function getAvailableCurrencies(): CurrencyInfo[] {
  return Object.values(CURRENCY_INFO);
}

/**
 * Get currency info by code
 */
export function getCurrencyInfo(currency: string): CurrencyInfo | null {
  return CURRENCY_INFO[currency] || null;
}

/**
 * Get currency for region
 */
export function getCurrencyForRegion(region: RegionCode): string {
  switch (region) {
    case 'TR':
      return 'TRY';
    case 'EG':
      return 'EGP';
    default:
      return 'USD';
  }
}

/**
 * Batch convert multiple amounts
 */
export async function batchConvertCurrency(
  amounts: Array<{ amount: number; from: string; to: string }>
): Promise<Array<{
  originalAmount: number;
  convertedAmount: number;
  from: string;
  to: string;
  rate: number;
  source: string;
}>> {
  const results = await Promise.all(
    amounts.map(async ({ amount, from, to }) => {
      const conversion = await convertCurrency(amount, from, to);
      return {
        originalAmount: amount,
        convertedAmount: conversion.amount,
        from,
        to,
        rate: conversion.rate,
        source: conversion.source
      };
    })
  );
  
  return results;
}

/**
 * Get exchange rate history (mock implementation)
 */
export function getExchangeRateHistory(
  from: string,
  to: string,
  days: number = 30
): Array<{ date: string; rate: number }> {
  // Mock historical data - in real implementation, this would fetch from API
  const history = [];
  const baseRate = getFallbackRate(from, to);
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Add some random variation to simulate real exchange rate fluctuations
    const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
    const rate = baseRate * (1 + variation);
    
    history.push({
      date: date.toISOString().split('T')[0],
      rate: Number(rate.toFixed(4))
    });
  }
  
  return history;
}

/**
 * Currency converter hook for React components
 */
export function useCurrencyConverter() {
  const [rates, setRates] = useState<Map<string, ExchangeRate>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const convert = useCallback(async (amount: number, from: string, to: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await convertCurrency(amount, from, to);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Conversion failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getRate = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const rate = await getExchangeRate(from, to);
      setRates(prev => new Map(prev.set(`${from}_${to}`, rate)));
      return rate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Rate fetch failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshRates = useCallback(async (pairs: Array<{ from: string; to: string }>) => {
    setLoading(true);
    setError(null);
    
    try {
      const promises = pairs.map(({ from, to }) => getExchangeRate(from, to));
      const newRates = await Promise.all(promises);
      
      const newRatesMap = new Map<string, ExchangeRate>();
      newRates.forEach(rate => {
        newRatesMap.set(`${rate.from}_${rate.to}`, rate);
      });
      
      setRates(newRatesMap);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Rate refresh failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    convert,
    getRate,
    refreshRates,
    rates,
    loading,
    error
  };
}

// Auto-refresh rates every 5 minutes
setInterval(() => {
  RATE_CACHE.clear();
}, CACHE_DURATION);
