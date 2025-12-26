/**
 * RealTimeQuote - Real-Time Quote Component
 * 
 * Shows real-time quote as user designs, with:
 * - Material cost breakdown in Arabic
 * - Labor cost explanation
 * - Payment terms (cash, 30-day credit, 90-day credit)
 * - Maalem advice for specific shapes
 * 
 * @since Egyptian Fabrication Intelligence Enhancement
 */

import React, { useEffect, useState } from 'react';
import { RealTimeQuoteCalculator, type RealTimeQuote } from '@/lib/pricing/RealTimeQuoteCalculator';
import { YDTPricingOracle } from '@/lib/pricing/YDTPricingOracle';
import type { InferredShape } from '@/lib/intelligence/ShapeInferenceEngine';
import type { ComplexShapeDesign } from '@/lib/intelligence/ComplexShapeGenerator';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { InfoIcon, TrendingUpIcon, BrainIcon } from 'lucide-react';

export interface RealTimeQuoteProps {
  shape?: InferredShape;
  dimensions?: {
    width: number; // mm
    height: number; // mm
  };
  materials?: {
    type: 'aluminum' | 'upvc';
    systemPackId: string;
    profiles?: ComplexShapeDesign['material']['profiles'];
  };
  hardware?: ComplexShapeDesign['hardware'];
  glazing?: ComplexShapeDesign['glazing'];
  laborRates?: {
    perSqm: number;
    perHour: number;
  };
  profitMargin?: number;
  egyptianFactors?: {
    location?: 'Cairo' | 'Alexandria' | 'Upper_Egypt' | 'Other';
    transportCost?: number;
    installationComplexity?: 'simple' | 'medium' | 'complex';
    floorHeight?: number;
    accessDifficulty?: 'easy' | 'medium' | 'difficult';
  };
  cashFlowOptions?: {
    cashDiscount?: number;
    credit30DaysMargin?: number;
    credit90DaysMargin?: number;
  };
  workshopContext?: {
    id?: string;
    location?: string;
    preferredMaterials?: string[];
    pricingTier?: 'budget' | 'standard' | 'premium';
  };
  useYDT?: boolean; // Use YDT pricing oracle (default: true)
}

export const RealTimeQuote: React.FC<RealTimeQuoteProps> = ({
  shape,
  dimensions,
  materials,
  hardware,
  glazing,
  laborRates,
  profitMargin,
  egyptianFactors,
  cashFlowOptions,
  workshopContext,
  useYDT = true
}) => {
  const [quote, setQuote] = useState<RealTimeQuote | null>(null);
  const [ydtIntelligence, setYdtIntelligence] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const calculator = new RealTimeQuoteCalculator();
  const ydtOracle = new YDTPricingOracle();
  
  useEffect(() => {
    if (!dimensions || !dimensions.width || !dimensions.height) {
      setQuote(null);
      setYdtIntelligence(null);
      return;
    }
    
    setLoading(true);
    
    // Use YDT pricing oracle if enabled and workshop context available
    if (useYDT && workshopContext?.id && workshopContext?.location) {
      const project = {
        type: materials?.type === 'aluminum' ? 'residential' : 'residential',
        location: workshopContext.location,
        material: materials?.type || 'aluminum',
        estimatedCost: undefined,
        quantity: 1,
      };
      
      const workshop = {
        id: workshopContext.id,
        location: workshopContext.location,
        pricingTier: workshopContext.pricingTier || 'standard',
      };
      
      ydtOracle.calculatePriceWithYDT(project, workshop)
        .then((ydtResult) => {
          // Convert YDT result to RealTimeQuote format
          const convertedQuote: RealTimeQuote = {
            materialCost: ydtResult.breakdown.material,
            materialBreakdown: {
              profiles: ydtResult.breakdown.material * 0.4,
              glass: ydtResult.breakdown.material * 0.3,
              hardware: ydtResult.breakdown.material * 0.2,
              accessories: ydtResult.breakdown.material * 0.1,
              other: 0,
            },
            laborCost: ydtResult.breakdown.labor,
            laborBreakdown: {
              cutting: ydtResult.breakdown.labor * 0.3,
              assembly: ydtResult.breakdown.labor * 0.4,
              installation: ydtResult.breakdown.labor * 0.2,
              other: ydtResult.breakdown.labor * 0.1,
            },
            transportCost: egyptianFactors?.transportCost || 0,
            installationCost: 0,
            subtotal: ydtResult.breakdown.material + ydtResult.breakdown.labor + ydtResult.breakdown.overhead,
            profitMargin: ydtResult.breakdown.margin * 100,
            total: ydtResult.breakdown.finalPrice,
            cashPrice: ydtResult.quoteCard?.paymentTerms.cash || ydtResult.breakdown.finalPrice * 0.95,
            credit30Days: ydtResult.quoteCard?.paymentTerms.credit30 || ydtResult.breakdown.finalPrice * 1.1,
            credit90Days: ydtResult.quoteCard?.paymentTerms.credit90 || ydtResult.breakdown.finalPrice * 1.2,
            recommendedPaymentTerms: ydtResult.quoteCard?.paymentTerms.recommendation as any || 'cash',
            recommendationReason: ydtResult.quoteCard?.paymentTerms.recommendation || 'Best price with cash payment',
            recommendationReasonArabic: ydtResult.quoteCard?.paymentTerms.recommendation === 'cash' 
              ? 'أفضل سعر مع الدفع نقداً'
              : ydtResult.quoteCard?.paymentTerms.recommendation === 'credit30'
              ? 'مناسب للمشاريع المتوسطة'
              : 'مناسب للمشاريع الكبيرة',
          };
          
          setQuote(convertedQuote);
          setYdtIntelligence(ydtResult.intelligence);
          setLoading(false);
        })
        .catch((error) => {
          console.error('YDT pricing error, falling back to calculator:', error);
          // Fallback to regular calculator
          calculateWithRegularCalculator();
        });
    } else {
      // Use regular calculator
      calculateWithRegularCalculator();
    }
    
    function calculateWithRegularCalculator() {
      calculator.calculate({
        shape,
        dimensions: {
          width: dimensions.width,
          height: dimensions.height,
          area: (dimensions.width * dimensions.height) / 1000000 // m²
        },
        materials,
        hardware,
        glazing,
        laborRates,
        profitMargin,
        egyptianFactors,
        cashFlowOptions
      }).then((calculatedQuote) => {
        setQuote(calculatedQuote);
        setYdtIntelligence(null);
        setLoading(false);
      }).catch((error) => {
        console.error('Quote calculation error:', error);
        setLoading(false);
      });
    }
  }, [shape, dimensions, materials, hardware, glazing, laborRates, profitMargin, egyptianFactors, cashFlowOptions, workshopContext, useYDT]);
  
  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <div className="text-center text-gray-400">جاري الحساب...</div>
        </CardContent>
      </Card>
    );
  }
  
  if (!quote) {
    return null;
  }
  
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
          {ydtIntelligence ? (
            <BrainIcon className="w-5 h-5 text-blue-400" />
          ) : (
            <TrendingUpIcon className="w-5 h-5" />
          )}
          <span>💰 التكلفة في الوقت الحقيقي</span>
          {ydtIntelligence && (
            <Badge variant="outline" className="ml-2 bg-blue-500/20 text-blue-400 border-blue-500">
              YDT Intelligence
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Material Cost Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-medium">تكلفة المواد</span>
            <span className="text-white font-bold">{quote.materialCost.toLocaleString()} ج.م</span>
          </div>
          <div className="pl-4 space-y-1 text-sm text-gray-400">
            <div className="flex justify-between">
              <span>البروفايلات</span>
              <span>{quote.materialBreakdown.profiles.toLocaleString()} ج.م</span>
            </div>
            <div className="flex justify-between">
              <span>الزجاج</span>
              <span>{quote.materialBreakdown.glass.toLocaleString()} ج.م</span>
            </div>
            <div className="flex justify-between">
              <span>الأكسسوارات</span>
              <span>{quote.materialBreakdown.hardware.toLocaleString()} ج.م</span>
            </div>
            <div className="flex justify-between">
              <span>مستلزمات أخرى</span>
              <span>{quote.materialBreakdown.accessories.toLocaleString()} ج.م</span>
            </div>
          </div>
        </div>
        
        {/* Labor Cost Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-medium">تكلفة العمالة</span>
            <span className="text-white font-bold">{quote.laborCost.toLocaleString()} ج.م</span>
          </div>
          <div className="pl-4 space-y-1 text-sm text-gray-400">
            <div className="flex justify-between">
              <span>القطع</span>
              <span>{quote.laborBreakdown.cutting.toLocaleString()} ج.م</span>
            </div>
            <div className="flex justify-between">
              <span>التجميع</span>
              <span>{quote.laborBreakdown.assembly.toLocaleString()} ج.م</span>
            </div>
            <div className="flex justify-between">
              <span>التركيب</span>
              <span>{quote.laborBreakdown.installation.toLocaleString()} ج.م</span>
            </div>
          </div>
        </div>
        
        {/* Additional Costs */}
        {(quote.transportCost > 0 || quote.installationCost > 0) && (
          <div className="space-y-2">
            {quote.transportCost > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-300">تكلفة النقل</span>
                <span className="text-white">{quote.transportCost.toLocaleString()} ج.م</span>
              </div>
            )}
            {quote.installationCost > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-300">تكلفة التركيب</span>
                <span className="text-white">{quote.installationCost.toLocaleString()} ج.م</span>
              </div>
            )}
          </div>
        )}
        
        {/* Subtotal */}
        <div className="border-t border-gray-700 pt-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">المجموع الفرعي</span>
            <span className="text-white">{quote.subtotal.toLocaleString()} ج.م</span>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-400">
            <span>هامش الربح ({quote.profitMargin}%)</span>
            <span>{(quote.total - quote.subtotal).toLocaleString()} ج.م</span>
          </div>
        </div>
        
        {/* Total */}
        <div className="border-t border-gray-700 pt-2">
          <div className="flex justify-between items-center">
            <span className="text-white font-bold text-lg">الإجمالي</span>
            <span className="text-white font-bold text-lg">{quote.total.toLocaleString()} ج.م</span>
          </div>
        </div>
        
        {/* Payment Terms */}
        <div className="space-y-2 pt-2 border-t border-gray-700">
          <div className="text-gray-300 font-medium mb-2">خيارات الدفع</div>
          
          <div className="space-y-2">
            <div className={`p-3 rounded-lg border ${
              quote.recommendedPaymentTerms === 'cash' 
                ? 'border-green-500 bg-green-500/10' 
                : 'border-gray-700 bg-gray-800'
            }`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-white font-medium">نقداً</span>
                {quote.recommendedPaymentTerms === 'cash' && (
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500">
                    موصى به
                  </Badge>
                )}
              </div>
              <div className="text-lg font-bold text-white">
                {quote.cashPrice.toLocaleString()} ج.م
              </div>
            </div>
            
            <div className={`p-3 rounded-lg border ${
              quote.recommendedPaymentTerms === 'credit30' 
                ? 'border-green-500 bg-green-500/10' 
                : 'border-gray-700 bg-gray-800'
            }`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-white font-medium">آجل 30 يوم</span>
                {quote.recommendedPaymentTerms === 'credit30' && (
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500">
                    موصى به
                  </Badge>
                )}
              </div>
              <div className="text-lg font-bold text-white">
                {quote.credit30Days.toLocaleString()} ج.م
              </div>
            </div>
            
            <div className={`p-3 rounded-lg border ${
              quote.recommendedPaymentTerms === 'credit90' 
                ? 'border-green-500 bg-green-500/10' 
                : 'border-gray-700 bg-gray-800'
            }`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-white font-medium">آجل 90 يوم</span>
                {quote.recommendedPaymentTerms === 'credit90' && (
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500">
                    موصى به
                  </Badge>
                )}
              </div>
              <div className="text-lg font-bold text-white">
                {quote.credit90Days.toLocaleString()} ج.م
              </div>
            </div>
          </div>
          
          {/* Recommendation */}
          {quote.recommendedPaymentTerms && (
            <Alert className="mt-2 bg-blue-500/10 border-blue-500">
              <InfoIcon className="w-4 h-4 text-blue-400" />
              <AlertDescription className="text-blue-300 text-sm">
                {quote.recommendationReasonArabic}
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        {/* YDT Intelligence Insights */}
        {ydtIntelligence && (
          <div className="space-y-2 pt-2 border-t border-gray-700">
            <div className="text-gray-300 font-medium mb-2 flex items-center gap-2">
              <BrainIcon className="w-4 h-4 text-blue-400" />
              <span>YDT Intelligence Insights</span>
            </div>
            {ydtIntelligence.marketTrend && (
              <Alert className="bg-blue-500/10 border-blue-500">
                <InfoIcon className="w-4 h-4 text-blue-400" />
                <AlertDescription className="text-blue-300 text-sm">
                  سعر السوق الحالي: {ydtIntelligence.marketTrend}
                </AlertDescription>
              </Alert>
            )}
            {ydtIntelligence.shortages && ydtIntelligence.shortages.length > 0 && (
              <Alert className="bg-yellow-500/10 border-yellow-500">
                <InfoIcon className="w-4 h-4 text-yellow-400" />
                <AlertDescription className="text-yellow-300 text-sm">
                  تنبيهات نقص المواد: {ydtIntelligence.shortages.join(', ')}
                </AlertDescription>
              </Alert>
            )}
            {ydtIntelligence.recommendations && ydtIntelligence.recommendations.length > 0 && (
              <Alert className="bg-green-500/10 border-green-500">
                <InfoIcon className="w-4 h-4 text-green-400" />
                <AlertDescription className="text-green-300 text-sm">
                  توصيات: {ydtIntelligence.recommendations.join('، ')}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        {/* Maalem Advice */}
        {shape?.maalemAdvice && (
          <Alert className="bg-yellow-500/10 border-yellow-500">
            <InfoIcon className="w-4 h-4 text-yellow-400" />
            <AlertDescription className="text-yellow-300 text-sm">
              {shape.maalemAdvice}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

