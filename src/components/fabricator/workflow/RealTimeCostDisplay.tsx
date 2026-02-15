/**
 * Real-time Cost Display Component
 * 
 * Displays live cost calculations with breakdown
 * Prestige theme with luxury styling
 */

import {
    PricingConfig,
    calculateLiveCost,
    calculateROI,
    formatCost,
    getCostDetails,
    getCostPerUnitArea
} from '@/lib/fabricator/CostCalculator';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/ui/collapsible';
import { WindowUnit } from '@/types/fabricator';
import {
    ChevronDown,
    DollarSign,
    Zap
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface RealTimeCostDisplayProps {
  liveProject: WindowUnit | null;
  bomData: any;
  pricingConfig?: Partial<PricingConfig>;
  sellingPrice?: number;
  onPricingChange?: (config: Partial<PricingConfig>) => void;
}

export const RealTimeCostDisplay: React.FC<RealTimeCostDisplayProps> = ({
  liveProject,
  bomData,
  pricingConfig,
  sellingPrice
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const costBreakdown = useMemo(() => {
    return calculateLiveCost(liveProject, bomData, pricingConfig as any);
  }, [liveProject, bomData, pricingConfig]);

  const costDetails = useMemo(() => {
    return getCostDetails(liveProject, bomData, pricingConfig as any);
  }, [liveProject, bomData, pricingConfig]);

  const costPerArea = useMemo(() => {
    if (!costBreakdown || !liveProject) return 0;
    return getCostPerUnitArea(costBreakdown.total, liveProject.overallWidth, liveProject.overallHeight);
  }, [costBreakdown, liveProject]);

  const roi = useMemo(() => {
    if (!costBreakdown || !sellingPrice) return null;
    return calculateROI(costBreakdown.total, sellingPrice);
  }, [costBreakdown, sellingPrice]);

  if (!costBreakdown || !costDetails) {
    return (
      <Card className="bg-slate-900/60 -xl border-slate-700/50 shadow-card card-glass-dark">
        <CardContent className="p-6 text-center text-slate-400">
          No cost data available. Complete design first.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Cost Card */}
      <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 500/30 shadow-premium card-glass-dark">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg text-slate-100">
              <DollarSign className="h-5 w-5 text-amber-400" />
              Real-time Cost Analysis
            </CardTitle>
            <Badge variant="outline" className="btn-primary">
              Live Update
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Total Cost Display */}
          <div className="btn-primary-gradient">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm text-slate-400 uppercase tracking-wide">Total Project Cost</span>
              <span className="text-xs text-slate-500">{costBreakdown.currency}</span>
            </div>
            <div className="text-4xl font-bold text-amber-400 font-mono">
              {formatCost(costBreakdown.total, costBreakdown.currency)}
            </div>
            <div className="text-xs text-slate-400 mt-2">
              {formatCost(costPerArea, costBreakdown.currency)}/m² • {liveProject?.overallWidth}×{liveProject?.overallHeight}mm
            </div>
          </div>

          {/* Cost Breakdown Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <div className="text-xs text-blue-300 mb-1">Profiles</div>
              <div className="text-lg font-bold text-blue-400">
                {formatCost(costBreakdown.profilesCost, costBreakdown.currency)}
              </div>
              <div className="text-[10px] text-blue-400/60 mt-1">
                {costDetails.profileCosts.length} types
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <div className="text-xs text-amber-300 mb-1">Hardware</div>
              <div className="text-lg font-bold text-amber-400">
                {formatCost(costBreakdown.hardwareCost, costBreakdown.currency)}
              </div>
              <div className="text-[10px] text-amber-400/60 mt-1">
                {costDetails.hardwareCosts.length} items
              </div>
            </div>

            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3">
              <div className="text-xs text-cyan-300 mb-1">Glass</div>
              <div className="text-lg font-bold text-cyan-400">
                {formatCost(costBreakdown.glassCost, costBreakdown.currency)}
              </div>
              <div className="text-[10px] text-cyan-400/60 mt-1">
                {bomData?.glassDetails?.totalGlassArea?.toFixed(2)}m²
              </div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <div className="text-xs text-emerald-300 mb-1">Labor</div>
              <div className="text-lg font-bold status-valid">
                {formatCost(costBreakdown.laborCost, costBreakdown.currency)}
              </div>
              <div className="text-[10px] /60 mt-1 status-valid">
                {costDetails.laborCosts.estimatedHours}h
              </div>
            </div>
          </div>

          {/* Markup & Tax */}
          <div className="space-y-2 pt-2 border-t border-slate-700/50">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Subtotal</span>
              <span className="font-mono text-slate-300">{formatCost(costBreakdown.subtotal, costBreakdown.currency)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Markup (30%)</span>
              <span className="font-mono text-amber-400">+{formatCost(costBreakdown.markup, costBreakdown.currency)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Tax (14% VAT)</span>
              <span className="font-mono text-amber-500">+{formatCost(costBreakdown.tax, costBreakdown.currency)}</span>
            </div>
          </div>

          {/* ROI if selling price provided */}
          {roi && (
            <Alert className="bg-emerald-500/10 border-emerald-500/30 backdrop-blur-sm">
              <Zap className="h-4 w-4 status-valid" />
              <AlertDescription className="text-sm text-emerald-300">
                <div className="flex justify-between items-center">
                  <span>Profit Margin: {roi.profitMargin.toFixed(1)}%</span>
                  <span className="font-bold status-valid">
                    {formatCost(roi.profit, costBreakdown.currency)} profit
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <Card className="bg-slate-900/60 -xl border-slate-700/50 shadow-card card-glass-dark">
        <CardHeader>
          <CardTitle className="text-base text-slate-100">Cost Breakdown Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Profiles */}
          <Collapsible
            open={expandedSection === 'profiles'}
            onOpenChange={(open) => setExpandedSection(open ? 'profiles' : null)}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover: rounded-lg transition-colors border border-slate-700/30 hover:border-amber- 500/30 card-premium">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-300">Profiles</span>
                <Badge variant="outline" className="text-xs border-slate-700/50 text-slate-400 bg-slate-800 /30 card-dark">
                  {costDetails.profileCosts.length}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-blue-400">
                  {formatCost(costBreakdown.profilesCost, costBreakdown.currency)}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-500 transition-transform data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2 pl-3 border-l border-slate-700/50">
              {costDetails.profileCosts.map((profile, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs text-slate-400 py-1">
                  <span>{profile.profileName}</span>
                  <span className="font-mono">
                    {(profile.totalLength / 1000).toFixed(2)}m × {profile.costPerMeter.toFixed(2)} = {formatCost(profile.subtotal, costBreakdown.currency)}
                  </span>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Hardware */}
          <Collapsible
            open={expandedSection === 'hardware'}
            onOpenChange={(open) => setExpandedSection(open ? 'hardware' : null)}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover: rounded-lg transition-colors border border-slate-700/30 hover:border-amber- 500/30 card-premium">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-300">Hardware</span>
                <Badge variant="outline" className="text-xs border-slate-700/50 text-slate-400 bg-slate-800 /30 card-dark">
                  {costDetails.hardwareCosts.length}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-amber-400">
                  {formatCost(costBreakdown.hardwareCost, costBreakdown.currency)}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-500 transition-transform data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2 pl-3 border-l border-slate-700/50">
              {costDetails.hardwareCosts.map((hw, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs text-slate-400 py-1">
                  <span>{hw.hardwareName}</span>
                  <span className="font-mono">
                    {hw.quantity}× {hw.costPerUnit.toFixed(2)} = {formatCost(hw.subtotal, costBreakdown.currency)}
                  </span>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Glass */}
          {costDetails.glassCosts.length > 0 && (
            <Collapsible
              open={expandedSection === 'glass'}
              onOpenChange={(open) => setExpandedSection(open ? 'glass' : null)}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover: rounded-lg transition-colors border border-slate-700/30 hover:border-amber- 500/30 card-premium">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-300">Glass</span>
                  <Badge variant="outline" className="text-xs border-slate-700/50 text-slate-400 bg-slate-800 /30 card-dark">
                    {costDetails.glassCosts.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-cyan-400">
                    {formatCost(costBreakdown.glassCost, costBreakdown.currency)}
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-500 transition-transform data-[state=open]:rotate-180" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2 pl-3 border-l border-slate-700/50">
                {costDetails.glassCosts.map((glass, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs text-slate-400 py-1">
                    <span>{glass.glassType}</span>
                    <span className="font-mono">
                      {glass.area.toFixed(2)}m² × {glass.costPerM2.toFixed(2)} = {formatCost(glass.subtotal, costBreakdown.currency)}
                    </span>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeCostDisplay;
