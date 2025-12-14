/**
 * Interactive Pricing Calculator for 3D Model Parts
 * Integrates with InteractiveGLBViewer to provide real-time pricing calculations
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { getRegionalConfig } from '@/config/regionalConfig';
import { useRegionDetection, useRegionUtils, useTurkishTaxUtils } from '@/hooks/useRegionDetection';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PartAnnotation } from './InteractiveGLBViewer';

interface InteractivePricingCalculatorProps {
  selectedParts: PartAnnotation[];
  onPricingUpdate?: (totalPricing: TotalPricingCalculation) => void;
  enableQuantityAdjustment?: boolean;
  showTaxBreakdown?: boolean;
  showRegionalPricing?: boolean;
  className?: string;
}

export interface TotalPricingCalculation {
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  region: string;
  parts: Array<{
    part: PartAnnotation;
    quantity: number;
    subtotal: number;
    taxAmount: number;
    total: number;
  }>;
}

export const InteractivePricingCalculator: React.FC<InteractivePricingCalculatorProps> = ({
  selectedParts,
  onPricingUpdate,
  enableQuantityAdjustment = true,
  showTaxBreakdown = true,
  showRegionalPricing = true,
  className = ''
}) => {
  const { t, i18n } = useTranslation();
  const { regionState } = useRegionDetection();
  const utils = useRegionUtils();
  const turkishTaxUtils = useTurkishTaxUtils();
  
  const [partQuantities, setPartQuantities] = useState<Record<string, number>>({});
  const [totalPricing, setTotalPricing] = useState<TotalPricingCalculation | null>(null);

  // Initialize quantities
  useEffect(() => {
    const initialQuantities: Record<string, number> = {};
    selectedParts.forEach(part => {
      if (!(part.id in partQuantities)) {
        initialQuantities[part.id] = 1;
      }
    });
    setPartQuantities(prev => ({ ...prev, ...initialQuantities }));
  }, [selectedParts]);

  // Calculate pricing when parts or quantities change
  useEffect(() => {
    if (selectedParts.length === 0) {
      setTotalPricing(null);
      onPricingUpdate?.(null as any);
      return;
    }

    const parts = selectedParts.map(part => {
      const quantity = partQuantities[part.id] || 1;
      const subtotal = part.price * quantity;
      const taxAmount = utils.calculateTax(subtotal);
      const total = utils.calculateTotalWithTax(subtotal);

      return {
        part,
        quantity,
        subtotal,
        taxAmount,
        total
      };
    });

    const subtotal = parts.reduce((sum, item) => sum + item.subtotal, 0);
    const taxAmount = parts.reduce((sum, item) => sum + item.taxAmount, 0);
    const total = parts.reduce((sum, item) => sum + item.total, 0);

    const config = getRegionalConfig(regionState.region);
    const pricing: TotalPricingCalculation = {
      subtotal,
      taxAmount,
      total,
      currency: config.currency.code,
      region: regionState.region,
      parts
    };

    setTotalPricing(pricing);
    onPricingUpdate?.(pricing);
  }, [selectedParts, partQuantities, utils, regionState.region, onPricingUpdate]);

  const updateQuantity = useCallback((partId: string, quantity: number) => {
    setPartQuantities(prev => ({
      ...prev,
      [partId]: Math.max(1, quantity)
    }));
  }, []);

  const removePart = useCallback((partId: string) => {
    setPartQuantities(prev => {
      const newQuantities = { ...prev };
      delete newQuantities[partId];
      return newQuantities;
    });
  }, []);

  const getLocalizedPartName = (part: PartAnnotation) => {
    switch (i18n.language) {
      case 'tr':
        return part.nameTr || part.name;
      case 'ar':
        return part.nameAr || part.name;
      default:
        return part.name;
    }
  };

  const getLocalizedPartDescription = (part: PartAnnotation) => {
    switch (i18n.language) {
      case 'tr':
        return part.descriptionTr || part.description;
      case 'ar':
        return part.descriptionAr || part.description;
      default:
        return part.description;
    }
  };

  if (selectedParts.length === 0) {
    return (
      <Card className={`bg-almona-dark border-almona-light/20 ${className}`}>
        <CardHeader>
          <CardTitle className="text-white">
            {t('pricing.calculator.title', 'Pricing Calculator')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-400 py-8">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p>{t('pricing.calculator.noParts', 'Select parts from the 3D model to see pricing')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-almona-dark border-almona-light/20 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>{t('pricing.calculator.title', 'Pricing Calculator')}</span>
          {showRegionalPricing && (
            <Badge variant="outline" className="text-orange-400 border-orange-400">
              {regionState.region} - {getRegionalConfig(regionState.region).currency.symbol}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Parts */}
        <div className="space-y-3">
          <h4 className="text-white font-medium">
            {t('pricing.calculator.selectedParts', 'Selected Parts')} ({selectedParts.length})
          </h4>
          
          {totalPricing?.parts.map((item) => (
            <div key={item.part.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h5 className="text-white font-medium text-sm">
                    {getLocalizedPartName(item.part)}
                  </h5>
                  <p className="text-gray-400 text-xs">
                    {getLocalizedPartDescription(item.part)}
                  </p>
                  {item.part.material && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {item.part.material}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePart(item.part.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {enableQuantityAdjustment && (
                    <>
                      <Label htmlFor={`qty-${item.part.id}`} className="text-gray-300 text-xs">
                        {t('pricing.calculator.quantity', 'Qty')}:
                      </Label>
                      <Input
                        id={`qty-${item.part.id}`}
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.part.id, parseInt(e.target.value) || 1)}
                        className="w-16 h-8 text-xs bg-gray-700 border-gray-600 text-white"
                      />
                    </>
                  )}
                </div>
                
                <div className="text-right">
                  <div className="text-orange-400 font-bold text-sm">
                    {utils.formatCurrency(item.total, { showSymbol: true })}
                  </div>
                  {showTaxBreakdown && (
                    <div className="text-gray-400 text-xs">
                      {utils.formatCurrency(item.subtotal, { showSymbol: true })} + {utils.formatCurrency(item.taxAmount, { showSymbol: true })} {getRegionalConfig(regionState.region).tax.vatName}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <Separator className="bg-gray-700" />

        {/* Total Calculation */}
        {totalPricing && (
          <div className="space-y-2">
            <div className="flex justify-between text-gray-300">
              <span>{t('pricing.calculator.subtotal', 'Subtotal')}:</span>
              <span>{utils.formatCurrency(totalPricing.subtotal, { showSymbol: true })}</span>
            </div>
            
            {showTaxBreakdown && (
              <div className="flex justify-between text-gray-300">
                <span>
                  {t('pricing.calculator.tax', 'Tax')} ({getRegionalConfig(regionState.region).tax.vatName} {getRegionalConfig(regionState.region).tax.vatRate * 100}%):
                </span>
                <span>{utils.formatCurrency(totalPricing.taxAmount, { showSymbol: true })}</span>
              </div>
            )}
            
            <Separator className="bg-gray-600" />
            
            <div className="flex justify-between text-white font-bold text-lg">
              <span>{t('pricing.calculator.total', 'Total')}:</span>
              <span className="text-orange-400">
                {utils.formatCurrency(totalPricing.total, { showSymbol: true })}
              </span>
            </div>

            {/* Turkish-specific KDV information */}
            {turkishTaxUtils.isTurkish && (
              <div className="mt-3 p-2 bg-blue-900/20 border border-blue-700/30 rounded text-xs text-blue-300">
                <p>🇹🇷 {t('pricing.calculator.kdvInfo', 'KDV %20 dahil fiyatlar. Tüm fiyatlar Türk Lirası cinsindendir.')}</p>
              </div>
            )}

            {/* Egyptian-specific VAT information */}
            {regionState.region === 'EG' && (
              <div className="mt-3 p-2 bg-green-900/20 border border-green-700/30 rounded text-xs text-green-300">
                <p>🇪🇬 {t('pricing.calculator.vatInfo', 'VAT 14% included in prices. All prices are in Egyptian Pounds.')}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-4">
          <Button 
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            disabled={!totalPricing || totalPricing.parts.length === 0}
          >
            {t('pricing.calculator.requestQuote', 'Request Quote')}
          </Button>
          <Button 
            variant="outline" 
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
            disabled={!totalPricing || totalPricing.parts.length === 0}
          >
            {t('pricing.calculator.addToCart', 'Add to Cart')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InteractivePricingCalculator;
