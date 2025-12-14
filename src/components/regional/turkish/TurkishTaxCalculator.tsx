/**
 * Turkish Tax Calculator Component
 * Interactive KDV calculation tool for Turkish market
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    KdvRate,
    TURKISH_KDV_RATES,
    calculateTurkishTax,
    formatTurkishCurrency,
    getKdvRateForCategory,
    validateTurkishTaxNumber
} from '@/lib/turkishTaxUtils';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TurkishTaxCalculatorProps {
  className?: string;
  onCalculationComplete?: (result: any) => void;
}

export const TurkishTaxCalculator: React.FC<TurkishTaxCalculatorProps> = ({
  className = '',
  onCalculationComplete
}) => {
  const { t } = useTranslation();
  
  const [amount, setAmount] = useState<string>('');
  const [kdvRate, setKdvRate] = useState<KdvRate>('STANDARD');
  const [isKdvInclusive, setIsKdvInclusive] = useState<boolean>(true);
  const [category, setCategory] = useState<string>('');
  const [taxNumber, setTaxNumber] = useState<string>('');
  const [calculation, setCalculation] = useState<any>(null);
  const [isValidTaxNumber, setIsValidTaxNumber] = useState<boolean | null>(null);

  const handleCalculate = useCallback(() => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return;
    }

    const rate = category ? getKdvRateForCategory(category) : TURKISH_KDV_RATES[kdvRate];
    const result = calculateTurkishTax(numericAmount, rate, isKdvInclusive);
    
    setCalculation(result);
    onCalculationComplete?.(result);
  }, [amount, kdvRate, isKdvInclusive, category, onCalculationComplete]);

  const handleTaxNumberValidation = useCallback((value: string) => {
    setTaxNumber(value);
    if (value.length === 10) {
      setIsValidTaxNumber(validateTurkishTaxNumber(value));
    } else {
      setIsValidTaxNumber(null);
    }
  }, []);

  const clearCalculation = useCallback(() => {
    setCalculation(null);
    setAmount('');
    setTaxNumber('');
    setIsValidTaxNumber(null);
  }, []);

  return (
    <Card className={`bg-almona-dark border-almona-light/20 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <span>🇹🇷</span>
          <span>{t('turkish.taxCalculator.title', 'KDV Hesaplayıcısı')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-gray-300">
            {t('turkish.taxCalculator.amount', 'Tutar')}
          </Label>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>

        {/* KDV Rate Selection */}
        <div className="space-y-2">
          <Label className="text-gray-300">
            {t('turkish.taxCalculator.kdvRate', 'KDV Oranı')}
          </Label>
          <Select value={kdvRate} onValueChange={(value: KdvRate) => setKdvRate(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STANDARD">
                %20 - {t('turkish.taxCalculator.standardRate', 'Standart Oran')}
              </SelectItem>
              <SelectItem value="REDUCED">
                %18 - {t('turkish.taxCalculator.reducedRate', 'İndirimli Oran')}
              </SelectItem>
              <SelectItem value="LOWER">
                %8 - {t('turkish.taxCalculator.lowerRate', 'Düşük Oran')}
              </SelectItem>
              <SelectItem value="ZERO">
                %0 - {t('turkish.taxCalculator.zeroRate', 'Sıfır Oran')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Selection */}
        <div className="space-y-2">
          <Label className="text-gray-300">
            {t('turkish.taxCalculator.category', 'Kategori')} ({t('turkish.taxCalculator.optional', 'İsteğe bağlı')})
          </Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder={t('turkish.taxCalculator.selectCategory', 'Kategori seçin')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="food">{t('turkish.taxCalculator.food', 'Gıda')} (%8)</SelectItem>
              <SelectItem value="medicine">{t('turkish.taxCalculator.medicine', 'İlaç')} (%8)</SelectItem>
              <SelectItem value="books">{t('turkish.taxCalculator.books', 'Kitap')} (%8)</SelectItem>
              <SelectItem value="hotel">{t('turkish.taxCalculator.hotel', 'Otel')} (%18)</SelectItem>
              <SelectItem value="restaurant">{t('turkish.taxCalculator.restaurant', 'Restoran')} (%18)</SelectItem>
              <SelectItem value="export">{t('turkish.taxCalculator.export', 'İhracat')} (%0)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KDV Inclusive Toggle */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="kdvInclusive"
            checked={isKdvInclusive}
            onChange={(e) => setIsKdvInclusive(e.target.checked)}
            className="rounded border-gray-600 bg-gray-700 text-orange-500"
          />
          <Label htmlFor="kdvInclusive" className="text-gray-300">
            {t('turkish.taxCalculator.kdvInclusive', 'KDV dahil fiyat')}
          </Label>
        </div>

        {/* Tax Number Validation */}
        <div className="space-y-2">
          <Label htmlFor="taxNumber" className="text-gray-300">
            {t('turkish.taxCalculator.taxNumber', 'Vergi Numarası')} ({t('turkish.taxCalculator.optional', 'İsteğe bağlı')})
          </Label>
          <div className="flex space-x-2">
            <Input
              id="taxNumber"
              value={taxNumber}
              onChange={(e) => handleTaxNumberValidation(e.target.value)}
              placeholder="1234567890"
              maxLength={10}
              className="bg-gray-700 border-gray-600 text-white"
            />
            {isValidTaxNumber !== null && (
              <Badge variant={isValidTaxNumber ? "default" : "default"} className={`px-2 ${!isValidTaxNumber ? 'bg-red-600 text-white' : ''}`}>
                {isValidTaxNumber ? '✓' : '✗'}
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button
            onClick={handleCalculate}
            disabled={!amount || parseFloat(amount) <= 0}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
          >
            {t('turkish.taxCalculator.calculate', 'Hesapla')}
          </Button>
          <Button
            variant="outline"
            onClick={clearCalculation}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            {t('turkish.taxCalculator.clear', 'Temizle')}
          </Button>
        </div>

        {/* Calculation Results */}
        {calculation && (
          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <h4 className="text-white font-semibold mb-3">
              {t('turkish.taxCalculator.results', 'Hesaplama Sonuçları')}
            </h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-300">
                <span>{t('turkish.taxCalculator.baseAmount', 'Ana Tutar')}:</span>
                <span>{formatTurkishCurrency(calculation.baseAmount, { showSymbol: true })}</span>
              </div>
              
              <div className="flex justify-between text-gray-300">
                <span>
                  {t('turkish.taxCalculator.kdv', 'KDV')} (%{(calculation.kdvRate * 100).toFixed(0)}):
                </span>
                <span>{formatTurkishCurrency(calculation.kdvAmount, { showSymbol: true })}</span>
              </div>
              
              <Separator className="bg-gray-600" />
              
              <div className="flex justify-between text-white font-bold">
                <span>{t('turkish.taxCalculator.total', 'Toplam')}:</span>
                <span className="text-orange-400">
                  {formatTurkishCurrency(calculation.totalWithKdv, { showSymbol: true })}
                </span>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-3 p-2 bg-blue-900/20 border border-blue-700/30 rounded text-xs text-blue-300">
              <p>
                {isKdvInclusive 
                  ? t('turkish.taxCalculator.kdvIncludedInfo', 'KDV dahil fiyat hesaplandı')
                  : t('turkish.taxCalculator.kdvExcludedInfo', 'KDV hariç fiyat hesaplandı')
                }
              </p>
            </div>
          </div>
        )}

        {/* Quick Reference */}
        <div className="mt-4 p-3 bg-gray-800/30 rounded border border-gray-700">
          <h5 className="text-white font-medium text-sm mb-2">
            {t('turkish.taxCalculator.quickReference', 'Hızlı Referans')}
          </h5>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
            <div>%20: {t('turkish.taxCalculator.standardGoods', 'Standart mallar')}</div>
            <div>%18: {t('turkish.taxCalculator.services', 'Hizmetler')}</div>
            <div>%8: {t('turkish.taxCalculator.basicNeeds', 'Temel ihtiyaçlar')}</div>
            <div>%0: {t('turkish.taxCalculator.exports', 'İhracat')}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TurkishTaxCalculator;
