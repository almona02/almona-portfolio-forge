/**
 * Currency Converter Component
 * Real-time currency conversion with exchange rate display
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRegionDetection } from '@/hooks/useRegionDetection';
import { 
  getAvailableCurrencies, 
  getCurrencyInfo, 
  getCurrencyForRegion,
  formatCurrency,
  useCurrencyConverter,
  ExchangeRate
} from '@/lib/currencyExchange';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CurrencyConverterProps {
  className?: string;
  showRateInfo?: boolean;
  autoDetectRegion?: boolean;
}

export const CurrencyConverter: React.FC<CurrencyConverterProps> = ({
  className = '',
  showRateInfo = true,
  autoDetectRegion = true
}) => {
  const { t } = useTranslation();
  const { regionState } = useRegionDetection();
  const { convert, getRate, refreshRates, loading, error } = useCurrencyConverter();
  
  const [fromCurrency, setFromCurrency] = useState<string>('USD');
  const [toCurrency, setToCurrency] = useState<string>('TRY');
  const [amount, setAmount] = useState<string>('100');
  const [convertedAmount, setConvertedAmount] = useState<number>(0);
  const [currentRate, setCurrentRate] = useState<ExchangeRate | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const currencies = getAvailableCurrencies();

  // Auto-detect region currency
  useEffect(() => {
    if (autoDetectRegion && regionState.region) {
      const regionCurrency = getCurrencyForRegion(regionState.region);
      setToCurrency(regionCurrency);
    }
  }, [regionState.region, autoDetectRegion]);

  // Convert currency when inputs change
  useEffect(() => {
    const performConversion = async () => {
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        setConvertedAmount(0);
        return;
      }

      try {
        const result = await convert(numericAmount, fromCurrency, toCurrency);
        setConvertedAmount(result.amount);
        setLastUpdated(new Date(result.timestamp));
      } catch (err) {
        console.error('Conversion failed:', err);
      }
    };

    performConversion();
  }, [amount, fromCurrency, toCurrency, convert]);

  // Get exchange rate
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const rate = await getRate(fromCurrency, toCurrency);
        setCurrentRate(rate);
      } catch (err) {
        console.error('Rate fetch failed:', err);
      }
    };

    fetchRate();
  }, [fromCurrency, toCurrency, getRate]);

  const handleSwapCurrencies = useCallback(() => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  }, [fromCurrency, toCurrency]);

  const handleRefreshRates = useCallback(async () => {
    try {
      await refreshRates([{ from: fromCurrency, to: toCurrency }]);
    } catch (err) {
      console.error('Rate refresh failed:', err);
    }
  }, [fromCurrency, toCurrency, refreshRates]);

  const formatAmount = useCallback((value: number, currency: string) => {
    const currencyInfo = getCurrencyInfo(currency);
    if (!currencyInfo) return value.toString();

    return formatCurrency(value, currency, {
      showSymbol: true,
      showFlag: true,
      locale: currencyInfo.region === 'TR' ? 'tr-TR' : 
              currencyInfo.region === 'EG' ? 'ar-EG' : 'en-US',
      precision: 2
    });
  }, []);

  const getRateSourceColor = (source: string) => {
    switch (source) {
      case 'api': return 'text-green-500';
      case 'cached': return 'text-blue-500';
      case 'fallback': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getRateSourceText = (source: string) => {
    switch (source) {
      case 'api': return t('currency.source.live', 'Canlı');
      case 'cached': return t('currency.source.cached', 'Önbellek');
      case 'fallback': return t('currency.source.fallback', 'Yedek');
      default: return source;
    }
  };

  return (
    <Card className={`bg-almona-dark border-almona-light/20 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <span>💱</span>
            <span>{t('currency.converter.title', 'Döviz Çevirici')}</span>
          </span>
          {currentRate && (
            <Badge 
              variant="outline" 
              className={`${getRateSourceColor(currentRate.source)} border-current`}
            >
              {getRateSourceText(currentRate.source)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert className="bg-red-900/20 border-red-700">
            <AlertDescription className="text-red-300">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-gray-300">
            {t('currency.converter.amount', 'Miktar')}
          </Label>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            className="bg-gray-700 border-gray-600 text-white text-lg"
          />
        </div>

        {/* Currency Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-300">
              {t('currency.converter.from', 'Kaynak')}
            </Label>
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    <div className="flex items-center space-x-2">
                      <span>{currency.flag}</span>
                      <span>{currency.code}</span>
                      <span className="text-gray-500">{currency.symbol}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">
              {t('currency.converter.to', 'Hedef')}
            </Label>
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    <div className="flex items-center space-x-2">
                      <span>{currency.flag}</span>
                      <span>{currency.code}</span>
                      <span className="text-gray-500">{currency.symbol}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSwapCurrencies}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </Button>
        </div>

        {/* Conversion Result */}
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400 mb-2">
              {formatAmount(convertedAmount, toCurrency)}
            </div>
            <div className="text-sm text-gray-400">
              {formatAmount(parseFloat(amount) || 0, fromCurrency)} = {formatAmount(convertedAmount, toCurrency)}
            </div>
          </div>
        </div>

        {/* Exchange Rate Info */}
        {showRateInfo && currentRate && (
          <div className="space-y-2">
            <Separator className="bg-gray-700" />
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-300">
                {t('currency.converter.exchangeRate', 'Döviz Kuru')}:
              </span>
              <span className="text-white font-medium">
                1 {fromCurrency} = {currentRate.rate.toFixed(4)} {toCurrency}
              </span>
            </div>
            
            {lastUpdated && (
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>
                  {t('currency.converter.lastUpdated', 'Son Güncelleme')}:
                </span>
                <span>
                  {lastUpdated.toLocaleTimeString('tr-TR')}
                </span>
              </div>
            )}
            
            <div className="flex justify-between items-center text-xs text-gray-400">
              <span>
                {t('currency.converter.source', 'Kaynak')}:
              </span>
              <span className={getRateSourceColor(currentRate.source)}>
                {getRateSourceText(currentRate.source)}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button
            onClick={handleRefreshRates}
            disabled={loading}
            variant="outline"
            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                <span>{t('currency.converter.updating', 'Güncelleniyor')}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{t('currency.converter.refresh', 'Yenile')}</span>
              </div>
            )}
          </Button>
        </div>

        {/* Regional Info */}
        {autoDetectRegion && regionState.region && (
          <div className="mt-4 p-2 bg-blue-900/20 border border-blue-700/30 rounded text-xs text-blue-300">
            <p>
              {t('currency.converter.regionDetected', 'Bölge algılandı')}: {regionState.region} - 
              {t('currency.converter.autoSelected', 'Otomatik seçildi')}: {getCurrencyForRegion(regionState.region)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CurrencyConverter;
