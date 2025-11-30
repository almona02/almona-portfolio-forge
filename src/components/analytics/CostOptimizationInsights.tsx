/**
 * Cost Optimization Insights
 * AI-driven cost reduction suggestions and analysis
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { costOptimizer } from '@/lib/analytics/CostOptimizer';
import type { OptimizationResult, Profile } from '@/types/fabricator';
import { TrendingDown, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface CostOptimizationInsightsProps {
  optimizationResult: OptimizationResult;
  profiles: Profile[];
  userId?: string;
}

export const CostOptimizationInsights: React.FC<CostOptimizationInsightsProps> = ({
  optimizationResult,
  profiles,
  userId,
}) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const analyze = async () => {
      setLoading(true);
      const result = await costOptimizer.analyzeCostOptimization(
        optimizationResult,
        profiles,
        userId
      );
      setAnalysis(result);
      setLoading(false);
    };

    analyze();
  }, [optimizationResult, profiles, userId]);

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">Analyzing cost optimization...</div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-900/20 border-red-700 text-red-400';
      case 'medium':
        return 'bg-yellow-900/20 border-yellow-700 text-yellow-400';
      case 'low':
        return 'bg-blue-900/20 border-blue-700 text-blue-400';
      default:
        return 'bg-gray-900/20 border-gray-700 text-gray-400';
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-green-400" />
          Cost Optimization Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Savings Summary */}
        {analysis.potentialSavings > 0 && (
          <Alert className="bg-green-900/20 border-green-700">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Potential Savings</AlertTitle>
            <AlertDescription>
              {analysis.savingsPercentage.toFixed(1)}% potential savings (
              {analysis.potentialSavings.toFixed(2)} from current cost of {analysis.currentCost.toFixed(2)})
            </AlertDescription>
          </Alert>
        )}

        {/* Suggestions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300">Optimization Suggestions</h4>
          {analysis.suggestions.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">
              No optimization suggestions at this time
            </div>
          ) : (
            analysis.suggestions.map((suggestion: any, index: number) => (
              <Alert
                key={index}
                className={`bg-gray-800 border-gray-700 ${getPriorityColor(suggestion.priority)}`}
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  <span>{suggestion.title}</span>
                  <Badge variant="outline" className={getPriorityColor(suggestion.priority)}>
                    {suggestion.priority}
                  </Badge>
                </AlertTitle>
                <AlertDescription className="text-sm mt-2">
                  <p className="mb-2">{suggestion.description}</p>
                  {suggestion.potentialSavings > 0 && (
                    <p className="text-green-400 font-medium">
                      Potential savings: {suggestion.potentialSavings.toFixed(2)}
                    </p>
                  )}
                  <p className="text-gray-400 mt-2">
                    <Info className="h-3 w-3 inline mr-1" />
                    {suggestion.actionRequired}
                  </p>
                </AlertDescription>
              </Alert>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

