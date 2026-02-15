/**
 * @file DecisionJustification.tsx
 * @description System-verified recommendations with data backing (not "AI transparency").
 * Shows confidence, reasoning, data points, and alternative options.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Database,
  Lightbulb,
  AlertCircle,
} from 'lucide-react';

export interface DecisionJustificationData {
  recommendation: string;
  confidence: number; // 0-100
  reasoning: {
    en: string;
    ar: string;
  };
  dataPoints: {
    label: string;
    value: string | number;
  }[];
  alternatives?: {
    option: string;
    pros: string[];
    cons: string[];
  }[];
  source?: 'system' | 'ydt' | 'market' | 'historical';
}

interface DecisionJustificationProps {
  data: DecisionJustificationData;
  className?: string;
  compact?: boolean;
}

export const DecisionJustification: React.FC<DecisionJustificationProps> = ({
  data,
  className,
  compact = false,
}) => {
  const { i18n } = useTranslation('fabricator');
  const isRTL = i18n.language.startsWith('ar');
  const lang = isRTL ? 'ar' : 'en';
  const [showAlternatives, setShowAlternatives] = useState(false);

  const confidenceColor = 
    data.confidence >= 80 ? 'bg-green-500/20 text-green-300 border-green-500/50' :
    data.confidence >= 60 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' :
    'bg-amber-500/20 text-amber-300 border-amber-500/50';

  const sourceConfig = {
    system: { label: 'System', icon: CheckCircle2, color: 'text-blue-400' },
    ydt: { label: 'YDT Intelligence', icon: Lightbulb, color: 'text-amber-400' },
    market: { label: 'Market Data', icon: TrendingUp, color: 'text-green-400' },
    historical: { label: 'Historical', icon: Database, color: 'text-gray-400' },
  }[data.source || 'system'];

  const SourceIcon = sourceConfig.icon;

  if (compact) {
    return (
      <div className={cn('p-3 rounded-lg border bg-gray-900/50 border-gray-700', className)}>
        <div className="flex items-center gap-2 mb-2">
          <SourceIcon className={cn('h-4 w-4', sourceConfig.color)} />
          <span className="text-sm font-semibold text-white">{data.recommendation}</span>
          <Badge variant="outline" className={cn('text-xs ml-auto', confidenceColor)}>
            {data.confidence}%
          </Badge>
        </div>
        <p className="text-xs text-gray-400">{data.reasoning[lang]}</p>
      </div>
    );
  }

  return (
    <Card className={cn('bg-gray-900/50 border-gray-700', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <SourceIcon className={cn('h-5 w-5', sourceConfig.color)} />
              <CardTitle className="text-lg">{data.recommendation}</CardTitle>
              <Badge variant="outline" className={cn('text-xs font-semibold', confidenceColor)}>
                {data.confidence}% Confidence
              </Badge>
            </div>
            <p className="text-sm text-gray-400 mt-1">{sourceConfig.label} Recommendation</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reasoning */}
        <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-white mb-1">Reasoning</p>
              <p className="text-sm text-gray-300 leading-relaxed">{data.reasoning[lang]}</p>
            </div>
          </div>
        </div>

        {/* Data Points */}
        {data.dataPoints.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Based on Data
            </p>
            <div className="grid grid-cols-2 gap-2">
              {data.dataPoints.map((point, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-gray-800/50 border border-gray-700"
                >
                  <p className="text-xs text-gray-400 mb-1">{point.label}</p>
                  <p className="text-sm font-semibold text-white">{point.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alternatives */}
        {data.alternatives && data.alternatives.length > 0 && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAlternatives(!showAlternatives)}
              className="w-full justify-between text-gray-400 hover:text-white"
            >
              <span className="text-xs font-semibold uppercase tracking-wider">
                {showAlternatives ? 'Hide' : 'Show'} Alternatives ({data.alternatives.length})
              </span>
              {showAlternatives ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            {showAlternatives && (
              <div className="space-y-3 pt-2">
                {data.alternatives.map((alt, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-gray-800/50 border border-gray-700"
                  >
                    <p className="text-sm font-semibold text-white mb-2">{alt.option}</p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-green-400 font-medium mb-1">Pros</p>
                        <ul className="space-y-1 text-gray-300">
                          {alt.pros.map((pro, pIdx) => (
                            <li key={pIdx} className="flex items-start gap-1">
                              <span className="text-green-400 mt-0.5">•</span>
                              <span>{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-amber-400 font-medium mb-1">Cons</p>
                        <ul className="space-y-1 text-gray-300">
                          {alt.cons.map((con, cIdx) => (
                            <li key={cIdx} className="flex items-start gap-1">
                              <span className="text-amber-400 mt-0.5">•</span>
                              <span>{con}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};




























