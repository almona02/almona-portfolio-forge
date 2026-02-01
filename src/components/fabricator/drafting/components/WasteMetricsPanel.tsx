/**
 * Waste Metrics Panel
 * 
 * Real-time waste calculation and efficiency display for drafting
 * 
 * Constitutional: Deterministic calculations, no ML/AI
 * Tier: 3 Protected Determinism
 */

'use client';

import { generateComponentsFromGrid } from '@/algorithms/smartDraw';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { SimplifiedOptimizationEngine } from '@/lib/fabricator/OptimizationEngine';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import type { Profile, WindowGrid } from '@/types/fabricator';
import {
    AlertCircle,
    DollarSign,
    Loader2,
    Package,
    TrendingDown,
    TrendingUp
} from 'lucide-react';
import React, { useMemo } from 'react';

import type { EgyptianTemplate, Geometry2D } from '../types/drafting';

interface WasteMetricsPanelProps {
  geometry: Geometry2D | null; // Geometry2D from drafting
  template: EgyptianTemplate | null; // EgyptianTemplate
  grid: WindowGrid | null;
  profiles: Profile[];
  systemPackId: string | null;
  className?: string;
}

const CALCULATION_MULTIPLIERS = {
  MM_TO_M: 1000,
  ROUNDING_MULTIPLIER_1_DECIMAL: 10,
  ROUNDING_MULTIPLIER_2_DECIMAL: 100
};

export const WasteMetricsPanelComponent: React.FC<WasteMetricsPanelProps> = ({
  geometry: _geometry,
  template: _template,
  grid,
  profiles,
  systemPackId,
  className = ''
}) => {
  // Generate components from grid
  const components = useMemo(() => {
    if (!grid || profiles.length === 0 || !systemPackId) return [];
    
    try {
      // Create minimal WindowUnit for component generation
      const windowUnit = {
        id: 'draft-metrics',
        orderNumber: 'DRAFT',
        overallWidth: 0,
        overallHeight: 0,
        grid,
        systemPackId,
        components: [],
        status: 'draft' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const systemPack = SYSTEM_PACKS.find(p => p.meta.id === systemPackId) || null;
      const result = generateComponentsFromGrid(
        windowUnit as any,
        grid,
        profiles,
        systemPackId,
        systemPack
      );
      
      return result.components;
    } catch (error) {
      console.error('Error generating components for waste metrics:', error);
      return [];
    }
  }, [grid, profiles, systemPackId]);

  // Calculate waste metrics with comprehensive validation
  const wasteMetrics = useMemo(() => {
    if (components.length === 0 || profiles.length === 0) {
      return null;
    }

    // Performance guard: limit component processing
    const MAX_COMPONENTS = 1000;
    const componentsToProcess = components.slice(0, MAX_COMPONENTS);
    if (components.length > MAX_COMPONENTS) {
      console.warn(`WasteMetricsPanel: Processing ${MAX_COMPONENTS} of ${components.length} components for performance`);
    }

    try {
      const optimizationEngine = new SimplifiedOptimizationEngine();

      // Convert components to cuts with validation
      const cuts = componentsToProcess.flatMap(comp => {
        if (!comp || !comp.cuttingLengths || !Array.isArray(comp.cuttingLengths)) {
          return [];
        }
        
        return comp.cuttingLengths
          .map((length: number, idx: number) => {
            // Validate length: must be finite, positive number
            const validatedLength = typeof length === 'number' && 
                                   isFinite(length) && 
                                   length > 0 
                                   ? length 
                                   : 0;
            
            if (validatedLength === 0) {
              return null; // Skip invalid cuts
            }
            
            // Validate profile exists
            if (!comp.profile || !comp.profile.id) {
              return null;
            }
            
            return {
              id: `${comp.id || 'unknown'}-${idx}`,
              label: `${comp.type || 'unknown'}-${idx}`,
              plannedLength: validatedLength,
              profileId: comp.profile.id,
              role: comp.type as any,
              quantity: (typeof comp.quantity === 'number' && comp.quantity > 0) ? comp.quantity : 1
            };
          })
          .filter((cut): cut is NonNullable<typeof cut> => cut !== null);
      });

      if (cuts.length === 0) {
        return null;
      }

      // Get unique profiles with validation
      const uniqueProfiles = Array.from(
        new Map(componentsToProcess
          .filter(c => c && c.profile && c.profile.id)
          .map(c => [c.profile.id, c.profile])
        ).values()
      );

      // Optimize for each profile
      let totalWaste = 0;
      let totalMaterial = 0;
      let totalPrice = 0;
      let totalWeight = 0;

      for (const profile of uniqueProfiles) {
        if (!profile || !profile.id) continue;
        
        const profileCuts = cuts.filter(c => c.profileId === profile.id);
        if (profileCuts.length === 0) continue;

        try {
          const optimizationResult = optimizationEngine.optimize(
            profileCuts,
            systemPackId || undefined
          );

          // Validate optimization result
          if (!optimizationResult || !Array.isArray(optimizationResult.bars)) {
            console.warn(`Invalid optimization result for profile ${profile.id}`);
            continue;
          }

          // Calculate total material used from bars with validation
          const totalBarLength = optimizationResult.bars.reduce(
            (sum, bar) => {
              const barLength = typeof bar.nominalLength === 'number' && 
                               isFinite(bar.nominalLength) && 
                               bar.nominalLength > 0
                               ? bar.nominalLength 
                               : 0;
              return sum + barLength;
            }, 
            0
          );
          
          // Validate waste value
          const waste = typeof optimizationResult.waste === 'number' && 
                       isFinite(optimizationResult.waste) && 
                       optimizationResult.waste >= 0
                       ? optimizationResult.waste 
                       : 0;
          
          totalWaste += waste;
          totalMaterial += totalBarLength;

          // Calculate price with validation
          // TODO: Use PricingEngine when pricing calculation is needed
          // const pricingEngine = new PricingEngine({ region: 'egypt', currency: 'EGP' });
          const lengthM = totalBarLength / CALCULATION_MULTIPLIERS.MM_TO_M;
          
          const costPerMeter = typeof profile.costPerMeter === 'number' && 
                               isFinite(profile.costPerMeter) && 
                               profile.costPerMeter >= 0
                               ? profile.costPerMeter 
                               : 0;
          
          const price = lengthM * costPerMeter;
          if (isFinite(price) && price >= 0) {
            totalPrice += price;
          }

          // Calculate weight with validation
          const weightPerM = typeof profile.weightPerMeter === 'number' && 
                            isFinite(profile.weightPerMeter) && 
                            profile.weightPerMeter >= 0
                            ? profile.weightPerMeter 
                            : 0;
          
          const weight = lengthM * weightPerM;
          if (isFinite(weight) && weight >= 0) {
            totalWeight += weight;
          }
        } catch (profileError) {
          console.error(`Error optimizing profile ${profile.id}:`, profileError);
          // Continue with other profiles
          continue;
        }
      }

      // Validate totals before calculation
      if (!isFinite(totalMaterial) || totalMaterial < 0) {
        totalMaterial = 0;
      }
      if (!isFinite(totalWaste) || totalWaste < 0) {
        totalWaste = 0;
      }
      if (!isFinite(totalPrice) || totalPrice < 0) {
        totalPrice = 0;
      }
      if (!isFinite(totalWeight) || totalWeight < 0) {
        totalWeight = 0;
      }

      // Calculate efficiency with division by zero protection
      const efficiency = totalMaterial > 0 
        ? Math.max(0, Math.min(100, ((totalMaterial - totalWaste) / totalMaterial) * 100))
        : 0;
      
      // Calculate waste percentage with division by zero protection
      const wastePercentage = totalMaterial > 0 
        ? Math.max(0, Math.min(100, (totalWaste / totalMaterial) * 100))
        : 0;

      // Final validation: ensure all values are finite
      const validatedEfficiency = isFinite(efficiency) ? efficiency : 0;
      const validatedWastePercentage = isFinite(wastePercentage) ? wastePercentage : 0;
      const validatedPrice = isFinite(totalPrice) ? totalPrice : 0;
      const validatedWeight = isFinite(totalWeight) ? totalWeight : 0;
      const validatedTotalMaterial = isFinite(totalMaterial) ? totalMaterial : 0;
      const validatedTotalWaste = isFinite(totalWaste) ? totalWaste : 0;

      return {
        efficiency: Math.round(validatedEfficiency * CALCULATION_MULTIPLIERS.ROUNDING_MULTIPLIER_1_DECIMAL) / 
                   CALCULATION_MULTIPLIERS.ROUNDING_MULTIPLIER_1_DECIMAL,
        wastePercentage: Math.round(validatedWastePercentage * CALCULATION_MULTIPLIERS.ROUNDING_MULTIPLIER_1_DECIMAL) / 
                         CALCULATION_MULTIPLIERS.ROUNDING_MULTIPLIER_1_DECIMAL,
        price: Math.round(validatedPrice * CALCULATION_MULTIPLIERS.ROUNDING_MULTIPLIER_2_DECIMAL) / 
               CALCULATION_MULTIPLIERS.ROUNDING_MULTIPLIER_2_DECIMAL,
        materialWeight: Math.round(validatedWeight * CALCULATION_MULTIPLIERS.ROUNDING_MULTIPLIER_1_DECIMAL) / 
                        CALCULATION_MULTIPLIERS.ROUNDING_MULTIPLIER_1_DECIMAL,
        totalMaterial: validatedTotalMaterial,
        totalWaste: validatedTotalWaste
      };
    } catch (error) {
      console.error('Error calculating waste metrics:', error);
      return null;
    }
  }, [components, systemPackId, profiles.length]);

  if (!grid || profiles.length === 0) {
    return (
      <Card className={`bg-slate-900/60 border-slate-700/50 ${className}`}>
        <CardContent className="p-4">
          <Alert className="bg-cyan-500/10 border-cyan-500/30">
            <AlertCircle className="h-4 w-4 text-cyan-400" />
            <AlertDescription className="text-sm text-cyan-300">
              Profiles required for waste calculation. Select a system pack to enable metrics.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!wasteMetrics) {
    return (
      <Card className={`bg-slate-900/60 border-slate-700/50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Calculating waste metrics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const efficiencyColor = wasteMetrics.efficiency >= 90 
    ? 'text-green-400' 
    : wasteMetrics.efficiency >= 75 
    ? 'text-yellow-400' 
    : 'text-red-400';

  const wasteColor = wasteMetrics.wastePercentage <= 10 
    ? 'text-green-400' 
    : wasteMetrics.wastePercentage <= 20 
    ? 'text-yellow-400' 
    : 'text-red-400';

  return (
    <Card className={`bg-slate-900/60 border-slate-700/50 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-amber-400" />
          Real-time Waste Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Efficiency */}
        <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-300">Efficiency</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${efficiencyColor}`}>
              {wasteMetrics.efficiency}%
            </span>
            <Badge 
              variant="outline" 
              className={`text-[10px] ${
                wasteMetrics.efficiency >= 90 
                  ? 'border-green-500/30 text-green-400 bg-green-500/10' 
                  : wasteMetrics.efficiency >= 75 
                  ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' 
                  : 'border-red-500/30 text-red-400 bg-red-500/10'
              }`}
            >
              {wasteMetrics.efficiency >= 90 
                ? 'Excellent' 
                : wasteMetrics.efficiency >= 75 
                ? 'Good' 
                : 'Needs Improvement'}
            </Badge>
          </div>
        </div>

        {/* Waste Percentage */}
        <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-300">Waste</span>
          </div>
          <span className={`text-lg font-bold ${wasteColor}`}>
            {wasteMetrics.wastePercentage}%
          </span>
        </div>

        {/* Material Cost */}
        <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-300">Material Cost</span>
          </div>
          <span className="text-lg font-bold text-blue-400">
            {wasteMetrics.price.toFixed(2)} EGP
          </span>
        </div>

        {/* Material Weight */}
        <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-300">Weight</span>
          </div>
          <span className="text-lg font-bold text-slate-100">
            {wasteMetrics.materialWeight} kg
          </span>
        </div>

        {/* Additional Stats */}
        <div className="pt-2 border-t border-slate-700/50 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400">Total Material:</span>
            <span className="ml-2 text-slate-200 font-semibold">
              {(wasteMetrics.totalMaterial / 1000).toFixed(2)} m
            </span>
          </div>
          <div>
            <span className="text-slate-400">Total Waste:</span>
            <span className="ml-2 text-slate-200 font-semibold">
              {(wasteMetrics.totalWaste / 1000).toFixed(2)} m
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const WasteMetricsPanel = React.memo(WasteMetricsPanelComponent);

