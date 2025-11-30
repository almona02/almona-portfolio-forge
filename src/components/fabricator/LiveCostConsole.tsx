/**
 * Live Cost & Engineering Console
 * Real-time feedback panel showing costs, waste prediction, structural warnings, and remnant suggestions
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Progress } from '@/shared/ui/ui/progress';
import {
  DollarSign,
  AlertTriangle,
  TrendingDown,
  Package,
  Info,
  CheckCircle2,
} from 'lucide-react';
import type { WindowComponent, Profile } from '@/types/fabricator';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { designAISuggestor, type ShapeAnalysis } from '@/lib/ai/DesignAISuggestor';
import { RemnantManager } from '@/lib/inventory/RemnantManager';

interface LiveCostConsoleProps {
  components: WindowComponent[];
  profiles: Profile[];
  projectWidth?: number;
  projectHeight?: number;
  currency?: string;
  userId?: string;
}

export interface LiveCostData {
  totalAluminum: number;
  totalGlass: number;
  totalAccessories: number;
  totalLabor: number;
  total: number;
  estimatedWaste: number;
  wastePercentage: number;
  structuralWarnings: string[];
  remnantSuggestions: Array<{
    remnantId: string;
    profileId: string;
    length: number;
    savings: number;
    message: string;
  }>;
}

export const LiveCostConsole: React.FC<LiveCostConsoleProps> = ({
  components,
  profiles,
  projectWidth = 0,
  projectHeight = 0,
  currency = 'EGP',
  userId,
}) => {
  const [costData, setCostData] = useState<LiveCostData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const calculateCosts = async () => {
      if (components.length === 0) {
        setCostData(null);
        return;
      }

      setLoading(true);
      try {
        const pricingEngine = new PricingEngine({
          region: 'egypt',
          currency: currency as any,
        });

        // Calculate material costs
        let totalAluminum = 0;
        let totalGlass = 0;
        let totalAccessories = 0;

        for (const component of components) {
          const profile = profiles.find((p) => p.id === component.profileId);
          if (profile) {
            const lengthM = (component.cuttingLength || component.length) / 1000;
            const cost = (profile.cost_per_meter || 0) * lengthM * (component.quantity || 1);
            totalAluminum += cost;
          }
        }

        // Estimate glass cost (simplified - would use actual glass pricing)
        const areaM2 = (projectWidth * projectHeight) / 1000000;
        totalGlass = areaM2 * 500; // 500 EGP per m2 estimate

        // Estimate accessories (simplified)
        totalAccessories = components.length * 50; // 50 EGP per component estimate

        // Estimate labor (simplified)
        const totalLabor = (totalAluminum + totalGlass) * 0.3; // 30% markup for labor

        // Calculate waste estimate (simplified - would use ML predictor)
        const totalLength = components.reduce(
          (sum, c) => sum + (c.cuttingLength || c.length) * (c.quantity || 1),
          0
        );
        const estimatedWaste = totalLength * 0.12; // 12% waste estimate
        const wastePercentage = 12;

        // Structural warnings (simplified - would use actual structural analysis)
        const structuralWarnings: string[] = [];
        if (projectWidth > 3500) {
          structuralWarnings.push(
            `Warning: The ${(projectWidth / 1000).toFixed(1)}m span may cause excessive deflection. Consider a reinforced profile.`
          );
        }

        // Remnant suggestions
        const remnantSuggestions: Array<{
          remnantId: string;
          profileId: string;
          length: number;
          savings: number;
          message: string;
        }> = [];

        if (userId) {
          try {
            const remnantManager = new RemnantManager();
            for (const component of components) {
              const profile = profiles.find((p) => p.id === component.profileId);
              if (profile) {
                const matches = await remnantManager.findRemnantMatches(
                  [
                    {
                      id: component.id,
                      length: component.cuttingLength || component.length,
                      quantity: component.quantity || 1,
                    },
                  ],
                  profile,
                  profile.material || 'aluminum',
                  { useRemnantsFirst: true }
                );

                for (const match of matches.slice(0, 1)) {
                  // Calculate savings
                  const remnantLength = match.remnant.length;
                  const costPerMeter = profile.cost_per_meter || 0;
                  const savings = (remnantLength / 1000) * costPerMeter * 0.8; // 80% of cost saved

                  remnantSuggestions.push({
                    remnantId: match.remnant.id,
                    profileId: profile.id,
                    length: remnantLength,
                    savings,
                    message: `You have a ${(remnantLength / 1000).toFixed(2)}m remnant of this exact profile in stock, saving ${savings.toFixed(0)} ${currency}`,
                  });
                }
              }
            }
          } catch (error) {
            console.warn('Failed to fetch remnant suggestions:', error);
          }
        }

        setCostData({
          totalAluminum,
          totalGlass,
          totalAccessories,
          totalLabor,
          total: totalAluminum + totalGlass + totalAccessories + totalLabor,
          estimatedWaste,
          wastePercentage,
          structuralWarnings,
          remnantSuggestions,
        });
      } catch (error) {
        console.error('Failed to calculate costs:', error);
      } finally {
        setLoading(false);
      }
    };

    void calculateCosts();
  }, [components, profiles, projectWidth, projectHeight, currency, userId]);

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-4">
          <div className="text-sm text-gray-400">Calculating costs...</div>
        </CardContent>
      </Card>
    );
  }

  if (!costData) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-4">
          <div className="text-sm text-gray-400">Start designing to see live costs</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700 sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-orange-400" />
          Live Cost & Engineering Console
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cost Breakdown */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-300">Cost Breakdown</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Aluminum:</span>
              <span className="font-medium">{costData.totalAluminum.toFixed(0)} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Glass:</span>
              <span className="font-medium">{costData.totalGlass.toFixed(0)} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Accessories:</span>
              <span className="font-medium">{costData.totalAccessories.toFixed(0)} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Labor:</span>
              <span className="font-medium">{costData.totalLabor.toFixed(0)} {currency}</span>
            </div>
            <div className="border-t border-gray-700 pt-1 mt-1 flex justify-between font-bold">
              <span>Total:</span>
              <span className="text-orange-400">{costData.total.toFixed(0)} {currency}</span>
            </div>
          </div>
        </div>

        {/* Waste Prediction */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-yellow-400" />
              Waste Prediction
            </h4>
            <Badge
              variant="outline"
              className={
                costData.wastePercentage < 10
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : costData.wastePercentage < 15
                    ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
              }
            >
              {costData.wastePercentage.toFixed(1)}%
            </Badge>
          </div>
          <Progress value={costData.wastePercentage} className="h-2" />
          {costData.wastePercentage > 14 && (
            <p className="text-xs text-yellow-400">
              Consider adjusting dimensions to reduce waste
            </p>
          )}
        </div>

        {/* Structural Warnings */}
        {costData.structuralWarnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              Structural Warnings
            </h4>
            {costData.structuralWarnings.map((warning, idx) => (
              <Alert key={idx} className="bg-yellow-500/10 border-yellow-500/30">
                <AlertDescription className="text-xs text-yellow-300">{warning}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Remnant Suggestions */}
        {costData.remnantSuggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Package className="h-4 w-4 text-green-400" />
              Remnant Suggestions
            </h4>
            {costData.remnantSuggestions.map((suggestion, idx) => (
              <Alert key={idx} className="bg-green-500/10 border-green-500/30">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-xs text-green-300">
                  {suggestion.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {costData.structuralWarnings.length === 0 && costData.remnantSuggestions.length === 0 && (
          <div className="text-xs text-gray-500 text-center py-2">
            <Info className="h-4 w-4 inline mr-1" />
            No warnings or suggestions
          </div>
        )}
      </CardContent>
    </Card>
  );
};

