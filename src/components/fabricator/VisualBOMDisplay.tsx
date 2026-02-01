/**
 * VisualBOMDisplay Component
 * 
 * Production-friendly BOM display with visual representation, cost breakdown,
 * workshop floor view, QR codes, and constitutional transparency.
 * 
 * Part of Journey 1 Polish: Measurement → Design → BOM
 * Week 1, Day 5: BOMGenerator Polish
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Toggle } from '@/shared/ui/ui/toggle';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/ui/collapsible';
import {
  FileText,
  QrCode as QrCodeIcon,
  Factory,
  DollarSign,
  Package,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronDown,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WindowUnit } from '@/types/fabricator';
import type { SystemPack as SystemPackType } from '@/data/systemPacks';
import { QRBarcodeGenerator } from '@/lib/exports/QRBarcodeGenerator';
import { BOMReplayMetadataDisplay } from './BOMReplayMetadataDisplay';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';

const qrBarcodeGenerator = new QRBarcodeGenerator();

/**
 * BOM Data Structure (compatible with EngineeringBay bomData)
 */
export interface BOMDisplayData {
  componentsByCategory: {
    frame: any[];
    sash: any[];
    structural: any[];
    glazing: any[];
    accessory: any[];
    other: any[];
  };
  glassDetails: {
    glassSpecs: Array<{
      sashIndex: number;
      width: number;
      height: number;
      area: number;
      type: string;
    }>;
    totalGlassArea: number;
    glazingType: string;
    glassThickness: number;
    totalGlassWeight: number;
  };
  totals: {
    materialCost: number;
    weight: number;
  };
  aggregatedByCategory: Record<string, Record<string, any>>;
  systemPack?: SystemPackType | null;
  verifyProfileSpecs?: any;
}

export interface VisualBOMDisplayProps {
  /** BOM data (from EngineeringBay bomData) */
  bomData: BOMDisplayData | null;
  /** Window unit for context */
  windowUnit: WindowUnit;
  /** Complete BOM (optional, for AICS-001 compliance) */
  completeBOM?: CompleteBOM | null;
  /** Display mode */
  mode?: 'standard' | 'workshop' | 'print';
  /** Show QR codes */
  showQRCodes?: boolean;
  /** Show cost breakdown */
  showCostBreakdown?: boolean;
  /** Show measurement overlay */
  showMeasurements?: boolean;
  /** Class name */
  className?: string;
  /** Translation function */
  t?: (key: string, defaultValue?: string) => string;
}

/**
 * Color mapping for component categories
 */
const CATEGORY_COLORS = {
  frame: 'rgba(59, 130, 246, 0.2)', // Blue
  sash: 'rgba(34, 197, 94, 0.2)', // Green
  structural: 'rgba(234, 179, 8, 0.2)', // Yellow
  glazing: 'rgba(147, 51, 234, 0.2)', // Purple
  accessory: 'rgba(236, 72, 153, 0.2)', // Pink
  other: 'rgba(107, 114, 128, 0.2)', // Gray
};

const CATEGORY_BORDER_COLORS = {
  frame: '#3b82f6',
  sash: '#22c55e',
  structural: '#eab308',
  glazing: '#9333ea',
  accessory: '#ec4899',
  other: '#6b7280',
};

/**
 * VisualBOMDisplay Component
 * 
 * Production-friendly BOM display with multiple viewing modes
 */
export const VisualBOMDisplay: React.FC<VisualBOMDisplayProps> = ({
  bomData,
  windowUnit,
  completeBOM,
  mode = 'standard',
  showQRCodes = true,
  showCostBreakdown = true,
  showMeasurements: _showMeasurements = true,
  className = '',
  t = (key: string, defaultValue?: string) => defaultValue || key,
}) => {
  const [viewMode, setViewMode] = useState<'standard' | 'workshop' | 'print'>(mode);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showQR, setShowQR] = useState(showQRCodes);

  // Generate QR codes for components
  useEffect(() => {
    if (!showQR || !bomData) return;

    const generateQRCodes = async () => {
      const codes: Record<string, string> = {};
      
      try {
        // Generate QR code for the entire BOM
        const bomQRData = {
          projectId: windowUnit.id,
          orderNumber: windowUnit.orderNumber,
          generatedAt: new Date(),
          reportType: 'bom',
          url: `${window.location.origin}/projects/${windowUnit.id}/bom`,
        };

        const bomQR = await qrBarcodeGenerator.generateQRCode(bomQRData, { width: 150 });
        codes['bom-main'] = bomQR;

        // Generate QR codes for major categories
        Object.keys(bomData.componentsByCategory).forEach((category) => {
          // QR codes for categories can be generated on-demand
          codes[`category-${category}`] = ''; // Placeholder
        });
      } catch (error) {
        console.error('Failed to generate QR codes:', error);
      }

      setQrCodes(codes);
    };

    generateQRCodes();
  }, [showQR, bomData, windowUnit]);

  // Cost breakdown data
  const costBreakdown = useMemo(() => {
    if (!bomData || !showCostBreakdown) return null;

    const { totals } = bomData;
    
    // Calculate cost categories (simplified - would use actual cost data if available)
    const materialCost = totals.materialCost;
    const glassCost = 0; // Would calculate from glass details
    const hardwareCost = 0; // Would calculate from hardware
    const laborCost = materialCost * 0.3; // Estimate: 30% of material cost
    
    const totalCost = materialCost + glassCost + hardwareCost + laborCost;

    return {
      material: materialCost,
      glass: glassCost,
      hardware: hardwareCost,
      labor: laborCost,
      total: totalCost,
      breakdown: [
        { name: 'Materials', value: materialCost, color: '#3b82f6' },
        { name: 'Glass', value: glassCost, color: '#9333ea' },
        { name: 'Hardware', value: hardwareCost, color: '#eab308' },
        { name: 'Labor', value: laborCost, color: '#22c55e' },
      ].filter(item => item.value > 0),
    };
  }, [bomData, showCostBreakdown]);

  // Category labels
  const categoryLabels = useMemo(() => ({
    frame: t('engineering_bay.bom_frame', 'Frame Profiles'),
    sash: t('engineering_bay.bom_sash', 'Sash Profiles'),
    structural: t('engineering_bay.bom_structural', 'Structural Profiles'),
    glazing: t('engineering_bay.bom_glazing', 'Glazing Profiles'),
    accessory: t('engineering_bay.bom_accessory', 'Accessory Profiles'),
    other: t('engineering_bay.bom_other', 'Other Components'),
  }), [t]);

  // Toggle category expansion
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  if (!bomData) {
    return (
      <Card className={cn('card-glass-dark', className)}>
        <CardContent className="p-6 text-center text-amber-600/70">
          {t('engineering_bay.bom_no_data', 'No BOM data available')}
        </CardContent>
      </Card>
    );
  }

  const { componentsByCategory, glassDetails, totals, aggregatedByCategory } = bomData;
  const isWorkshopMode = viewMode === 'workshop';
  const isPrintMode = viewMode === 'print';

  return (
    <div className={cn('space-y-4', className, isPrintMode && 'print-optimized')}>
      {/* Header with Controls */}
      {!isPrintMode && (
        <Card className="card-glass-dark">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-amber-200">
                <FileText className="h-5 w-5 text-amber-500" />
                {t('engineering_bay.bill_of_materials', 'Bill of Materials')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Toggle
                  pressed={showQR}
                  onPressedChange={setShowQR}
                  className="btn-secondary-dark"
                  title={t('engineering_bay.toggle_qr_codes', 'Toggle QR codes')}
                >
                  <QrCodeIcon className="h-4 w-4 mr-1" />
                  QR
                </Toggle>
                <Toggle
                  pressed={viewMode === 'workshop'}
                  onPressedChange={(pressed) => setViewMode(pressed ? 'workshop' : 'standard')}
                  className="btn-secondary-dark"
                  title={t('engineering_bay.workshop_view', 'Workshop view')}
                >
                  <Factory className="h-4 w-4 mr-1" />
                  Workshop
                </Toggle>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Constitutional Transparency - AICS-001 Compliance */}
      {completeBOM?.replayMetadata && (
        <BOMReplayMetadataDisplay bom={completeBOM} compact={!isWorkshopMode} />
      )}

      {/* Cost Breakdown Visualization */}
      {showCostBreakdown && costBreakdown && !isWorkshopMode && (
        <Card className="card-glass-dark">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-200 text-sm">
              <BarChart3 className="h-4 w-4 text-amber-500" />
              {t('engineering_bay.cost_breakdown', 'Cost Breakdown')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Simple bar chart visualization */}
              <div className="space-y-2">
                {costBreakdown.breakdown.map((item, index) => {
                  const percentage = costBreakdown.total > 0 
                    ? (item.value / costBreakdown.total) * 100 
                    : 0;
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-xs text-amber-300/80">
                        <span>{item.name}</span>
                        <span className="font-mono font-semibold">
                          {item.value.toFixed(2)} {t('engineering_bay.currency', 'EGP')}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-800/50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="pt-2 border-t border-amber-600/30 flex justify-between items-center">
                <span className="text-sm font-semibold text-amber-200">
                  {t('engineering_bay.total_cost', 'Total Cost')}:
                </span>
                <span className="text-lg font-bold font-mono text-amber-400">
                  {costBreakdown.total.toFixed(2)} {t('engineering_bay.currency', 'EGP')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Components by Category */}
      <Card className={cn('card-glass-dark', isWorkshopMode && 'bg-gray-900')}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-200">
            <Package className="h-5 w-5 text-amber-500" />
            {t('engineering_bay.components', 'Components')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(componentsByCategory).map(([category, comps]) => {
            if (comps.length === 0) return null;

            const aggregated = aggregatedByCategory[category] || {};
            const isExpanded = expandedCategories.has(category);
            const categoryColor = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS];
            const borderColor = CATEGORY_BORDER_COLORS[category as keyof typeof CATEGORY_BORDER_COLORS];

            return (
              <Collapsible
                key={category}
                open={isExpanded}
                onOpenChange={() => toggleCategory(category)}
                className="space-y-2"
              >
                <CollapsibleTrigger className="w-full">
                  <div
                    className="flex items-center justify-between p-3 rounded-lg border-2 transition-all duration-200 hover:opacity-90"
                    style={{
                      backgroundColor: categoryColor,
                      borderColor: borderColor,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: borderColor }}
                      />
                      <span className={cn(
                        'font-semibold',
                        isWorkshopMode ? 'text-lg text-white' : 'text-sm text-amber-200'
                      )}>
                        {categoryLabels[category as keyof typeof categoryLabels]}
                      </span>
                      <Badge variant="outline" className="bg-amber-950/30 border-amber-500/40 text-amber-300">
                        {Object.keys(aggregated).length} {t('engineering_bay.items', 'items')}
                      </Badge>
                    </div>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-amber-500 transition-transform duration-200',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  {Object.values(aggregated).map((item: any, idx: number) => {
                    const isVerified = item.verification?.verified !== false;
                    
                    return (
                      <div
                        key={idx}
                        className={cn(
                          'p-3 rounded border',
                          isWorkshopMode 
                            ? 'bg-white text-black border-gray-300 text-base'
                            : 'card-dark border-amber-600/30',
                          !isVerified && 'border-amber-500/50 bg-amber-950/20'
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {item.profile?.thumbnailUrl && (
                                <img
                                  src={item.profile.thumbnailUrl}
                                  alt={item.profile.name || item.type}
                                  className="w-8 h-8 rounded object-contain bg-white/5 flex-shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <span className={cn(
                                'font-semibold truncate',
                                isWorkshopMode ? 'text-lg' : 'text-sm text-amber-200'
                              )}>
                                {item.profile?.name || item.type}
                              </span>
                              {!isVerified && (
                                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                              )}
                              {isVerified && item.verification && (
                                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                              )}
                            </div>
                            <div className={cn(
                              'space-x-2',
                              isWorkshopMode ? 'text-base' : 'text-xs text-amber-600/70'
                            )}>
                              {item.totalLength > 0 && (
                                <span>{Math.round(item.totalLength)}{t('engineering_bay.units.mm', 'mm')}</span>
                              )}
                              {item.totalWeight > 0 && (
                                <span>• {item.totalWeight.toFixed(2)}{t('engineering_bay.units.kg', 'kg')}</span>
                              )}
                              {item.totalCost > 0 && (
                                <span>• {item.totalCost.toFixed(2)} {t('engineering_bay.currency', 'EGP')}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className={cn(
                              'font-bold font-mono',
                              isWorkshopMode ? 'text-2xl' : 'text-sm text-amber-300'
                            )}>
                              {item.quantity}x
                            </span>
                            {showQR && qrCodes['bom-main'] && (
                              <img
                                src={qrCodes['bom-main']}
                                alt="QR Code"
                                className="w-12 h-12 rounded border border-amber-600/30"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>

      {/* Glass Details */}
      {glassDetails.glassSpecs.length > 0 && (
        <Card className="card-glass-dark">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-200 text-sm">
              <Layers className="h-4 w-4 text-amber-500" />
              {t('engineering_bay.bom_glass', 'Glass & Glazing')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {glassDetails.glassSpecs.map((glass, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'p-3 rounded border',
                    isWorkshopMode
                      ? 'bg-white text-black border-gray-300 text-base'
                      : 'card-dark border-amber-600/30'
                  )}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className={cn('font-semibold', isWorkshopMode ? 'text-lg' : 'text-sm text-amber-200')}>
                        {t('engineering_bay.glass_sash', 'Sash')} {glass.sashIndex}
                      </span>
                      <div className={cn('mt-1', isWorkshopMode ? 'text-base' : 'text-xs text-amber-600/70')}>
                        {Math.round(glass.width)}×{Math.round(glass.height)}mm
                        {' • '}
                        {glass.area.toFixed(2)}m²
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-purple-950/30 border-purple-500/40 text-purple-300">
                      {glass.type}
                    </Badge>
                  </div>
                </div>
              ))}
              <div className={cn(
                'p-3 rounded border mt-2',
                isWorkshopMode
                  ? 'bg-gray-100 text-black border-gray-400 text-lg'
                  : 'card-dark border-amber-600/30'
              )}>
                <div className="flex justify-between">
                  <span className={cn('font-semibold', isWorkshopMode ? 'text-lg' : 'text-sm text-amber-200')}>
                    {t('engineering_bay.total_glass_area', 'Total Glass Area')}:
                  </span>
                  <span className={cn('font-bold font-mono', isWorkshopMode ? 'text-xl' : 'text-sm text-amber-400')}>
                    {glassDetails.totalGlassArea.toFixed(2)}m²
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Totals */}
      <Card className="card-glass-dark border-2 border-amber-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-200">
            <DollarSign className="h-5 w-5 text-amber-500" />
            {t('engineering_bay.bom_summary', 'Unit Summary')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className={cn('text-amber-500/80 font-semibold mb-1', isWorkshopMode && 'text-base')}>
                {t('engineering_bay.unit_dimensions', 'Dimensions')}
              </div>
              <div className={cn('font-mono font-bold text-amber-200', isWorkshopMode ? 'text-xl' : 'text-sm')}>
                {Math.round(windowUnit.overallWidth)}×{Math.round(windowUnit.overallHeight)}mm
              </div>
            </div>
            <div>
              <div className={cn('text-amber-500/80 font-semibold mb-1', isWorkshopMode && 'text-base')}>
                {t('engineering_bay.total_weight', 'Total Weight')}
              </div>
              <div className={cn('font-mono font-bold text-amber-300', isWorkshopMode ? 'text-xl' : 'text-sm')}>
                {totals.weight.toFixed(2)}kg
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-amber-600/30">
            <div className="flex justify-between items-center">
              <span className={cn('font-semibold text-amber-200', isWorkshopMode && 'text-lg')}>
                {t('engineering_bay.total_material_cost', 'Total Material Cost')}:
              </span>
              <span className={cn('font-bold font-mono text-amber-400', isWorkshopMode ? 'text-2xl' : 'text-lg')}>
                {totals.materialCost.toFixed(2)} {t('engineering_bay.currency', 'EGP')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          .print-optimized {
            page-break-inside: avoid;
          }
          .print-optimized .card-glass-dark {
            background: white !important;
            color: black !important;
            border: 1px solid #ccc !important;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
};
