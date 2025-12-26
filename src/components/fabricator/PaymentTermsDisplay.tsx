/**
 * PaymentTermsDisplay - Cash vs Credit Options Display
 * 
 * Displays payment terms with recommendations for Egyptian workshops
 * 
 * @since Egyptian Fabrication Intelligence Enhancement
 */

import React from 'react';
import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent } from '@/shared/ui/ui/card';

export interface PaymentTerms {
  cashPrice: number; // EGP
  credit30Days: number; // EGP
  credit90Days: number; // EGP
  recommended?: 'cash' | 'credit30' | 'credit90';
  recommendationReason?: string;
  recommendationReasonArabic?: string;
}

export interface PaymentTermsDisplayProps {
  terms: PaymentTerms;
  className?: string;
}

export const PaymentTermsDisplay: React.FC<PaymentTermsDisplayProps> = ({
  terms,
  className
}) => {
  return (
    <Card className={`bg-gray-900 border-gray-800 ${className || ''}`}>
      <CardContent className="p-4 space-y-3">
        <div className="text-gray-300 font-medium mb-3">خيارات الدفع</div>
        
        <div className="space-y-2">
          {/* Cash Option */}
          <div className={`p-3 rounded-lg border ${
            terms.recommended === 'cash' 
              ? 'border-green-500 bg-green-500/10' 
              : 'border-gray-700 bg-gray-800'
          }`}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-white font-medium">نقداً</span>
              {terms.recommended === 'cash' && (
                <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500">
                  موصى به
                </Badge>
              )}
            </div>
            <div className="text-lg font-bold text-white">
              {terms.cashPrice.toLocaleString()} ج.م
            </div>
            {terms.recommended === 'cash' && terms.recommendationReasonArabic && (
              <div className="text-xs text-gray-400 mt-1">
                {terms.recommendationReasonArabic}
              </div>
            )}
          </div>
          
          {/* 30-Day Credit Option */}
          <div className={`p-3 rounded-lg border ${
            terms.recommended === 'credit30' 
              ? 'border-green-500 bg-green-500/10' 
              : 'border-gray-700 bg-gray-800'
          }`}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-white font-medium">آجل 30 يوم</span>
              {terms.recommended === 'credit30' && (
                <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500">
                  موصى به
                </Badge>
              )}
            </div>
            <div className="text-lg font-bold text-white">
              {terms.credit30Days.toLocaleString()} ج.م
            </div>
            {terms.recommended === 'credit30' && terms.recommendationReasonArabic && (
              <div className="text-xs text-gray-400 mt-1">
                {terms.recommendationReasonArabic}
              </div>
            )}
          </div>
          
          {/* 90-Day Credit Option */}
          <div className={`p-3 rounded-lg border ${
            terms.recommended === 'credit90' 
              ? 'border-green-500 bg-green-500/10' 
              : 'border-gray-700 bg-gray-800'
          }`}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-white font-medium">آجل 90 يوم</span>
              {terms.recommended === 'credit90' && (
                <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500">
                  موصى به
                </Badge>
              )}
            </div>
            <div className="text-lg font-bold text-white">
              {terms.credit90Days.toLocaleString()} ج.م
            </div>
            {terms.recommended === 'credit90' && terms.recommendationReasonArabic && (
              <div className="text-xs text-gray-400 mt-1">
                {terms.recommendationReasonArabic}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

