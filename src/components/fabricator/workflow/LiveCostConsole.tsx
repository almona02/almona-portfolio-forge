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
        // Calculate material costs
        let totalAluminum = 0;
        let totalGlass = 0;
        let totalAccessories = 0;

        for (const component of components) {
          const profile = profiles.find((p) => p.id === component.profile.id);
          if (profile) {
            const lengthM = component.cuttingLengths.reduce((a, b) => a + b, 0) / 1000;
            const cost = (profile.costPerMeter || 0) * lengthM * (component.quantity || 1);
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
          (sum, c) => sum + c.cuttingLengths.reduce((a, b) => a + b, 0) * (c.quantity || 1),
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
              const profile = profiles.find((p) => p.id === component.profile.id);
              if (profile) {
                const matches = await remnantManager.findRemnantMatches(
                  [
                    {
                      length: component.cuttingLengths.reduce((a, b) => a + b, 0),
                      angle: 0,
                      componentId: component.id,
                      waste: 0,
                    },
                  ],
                  profile,
                  profile.material || 'aluminum',
                  { useRemnantsFirst: true }
                );

                for (const match of matches.slice(0, 1)) {
                  // Calculate savings
                  const remnantLength = match.remnant.length;
                  const costPerMeter = profile.costPerMeter || 0;
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
      <Card className="bg-card/50 border-border">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Calculating costs...</div>
        </CardContent>
      </Card>
    );
  }

  if (!costData) {
    return (
      <Card className="bg-card/50 border-border">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Start designing to see live costs</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-warning" />
          Live Cost & Engineering Console
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cost Breakdown */}
        <div className="space-y-2">
          <h4 className="typography-h4 text-sm text-foreground">Cost Breakdown</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Aluminum:</span>
              <span className="font-medium">{costData.totalAluminum.toFixed(0)} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Glass:</span>
              <span className="font-medium">{costData.totalGlass.toFixed(0)} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Accessories:</span>
              <span className="font-medium">{costData.totalAccessories.toFixed(0)} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Labor:</span>
              <span className="font-medium">{costData.totalLabor.toFixed(0)} {currency}</span>
            </div>
            <div className="border-t border-border pt-1 mt-1 flex justify-between font-bold">
              <span>Total:</span>
              <span className="text-warning">{costData.total.toFixed(0)} {currency}</span>
            </div>
          </div>
        </div>

        {/* Waste Prediction */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="typography-h4 text-sm text-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-warning" />
              Waste Prediction
            </h4>
            <Badge
              variant="outline"
              className={
                costData.wastePercentage < 10
                  ? 'bg-green-500/10 border-green-500/30 text-success'
                  : costData.wastePercentage < 15
                    ? 'bg-yellow-500/10 border-yellow-500/30 text-warning'
                    : 'bg-red-500/10 border-red-500/30 text-destructive'
              }
            >
              {costData.wastePercentage.toFixed(1)}%
            </Badge>
          </div>
          <Progress value={costData.wastePercentage} className="h-2" />
          {costData.wastePercentage > 14 && (
            <p className="text-xs text-warning">
              Consider adjusting dimensions to reduce waste
            </p>
          )}
        </div>

        {/* Structural Warnings */}
        {costData.structuralWarnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="typography-h4 text-sm text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Structural Warnings
            </h4>
            {costData.structuralWarnings.map((warning, idx) => (
              <Alert key={idx} className="bg-yellow-500/10 border-yellow-500/30">
                <AlertDescription className="text-xs text-warning">{warning}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Remnant Suggestions */}
        {costData.remnantSuggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="typography-h4 text-sm text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-success" />
              Remnant Suggestions
            </h4>
            {costData.remnantSuggestions.map((suggestion, idx) => (
              <Alert key={idx} className="bg-green-500/10 border-green-500/30">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertDescription className="text-xs text-success">
                  {suggestion.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {costData.structuralWarnings.length === 0 && costData.remnantSuggestions.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-2">
            <Info className="h-4 w-4 inline mr-1" />
            No warnings or suggestions
          </div>
        )}
      </CardContent>
    </Card>
  );
};

