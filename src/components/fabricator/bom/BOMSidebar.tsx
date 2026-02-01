/**
 * BOMSidebar Component
 * 
 * Extracted BOM rendering component from EngineeringBay with summary view support.
 * Part of Phase 3: Measurement-First Workflow Redesign.
 * 
 * Features:
 * - Full BOM view when expanded
 * - Compact summary view when collapsed (item count, total cost)
 * - Material warning indicators
 * - Cost breakdown by category
 * - Responsive to panel collapse state
 */

import { Button as GoldTierButton } from '@/components/ui/button-gold-tier';
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  GoldTierCard
} from '@/components/ui/card-gold-tier';
import type { SystemPack as SystemPackType } from '@/data/systemPacks';
import { systemPricingService } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { Badge } from '@/shared/ui/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/ui/collapsible';
import type { SystemPack as FabricatorSystemPack, Profile, WindowUnit } from '@/types/fabricator';
import { ChevronDown, ChevronUp, FileText, Settings } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HardenerSelectionPanel } from '../hardener/HardenerSelectionPanel';
import { ProfileSuggestionsPanel } from '../supplier/ProfileSuggestionsPanel';
// EventEmissionPanel - component exists but commented out for now
// import { EventEmissionPanel } from '../../realityos/EventEmissionPanel';

export interface BOMData {
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

export interface BOMSidebarProps {
  bomData: BOMData | null;
  liveProject: WindowUnit | null;
  profiles: Profile[];
  currentUserId?: string;
  collapsed?: boolean;
  showSummary?: boolean;
  onToggleCollapse?: () => void;
  onOpenPricingStudio?: (systemPackId?: string, profileId?: string) => void;
  className?: string;
}

export const BOMSidebar: React.FC<BOMSidebarProps> = ({
  bomData,
  liveProject,
  profiles,
  currentUserId,
  collapsed = false,
  showSummary = true,
  onToggleCollapse,
  onOpenPricingStudio,
  className = '',
}) => {
  const { t } = useTranslation('fabricator');
  const [pricingSource, setPricingSource] = useState<'system_pricing' | 'constants' | 'checking'>('checking');

  // Calculate summary for collapsed view (hooks must be called before early return)
  const summary = useMemo(() => {
    if (!bomData) return null;

    const totalItems = Object.values(bomData.componentsByCategory).reduce(
      (sum, comps) => sum + comps.length,
      0
    );
    const totalCost = bomData.totals.materialCost;
    const itemCount = Object.values(bomData.aggregatedByCategory).reduce(
      (sum, category) => sum + Object.keys(category).length,
      0
    );

    return {
      itemCount,
      totalItems,
      totalCost,
    };
  }, [bomData]);

  // Transform systemPack to FabricatorSystemPack format if needed (hooks must be called before early return)
  const fabricatorSystemPack = useMemo<FabricatorSystemPack | null>(() => {
    if (!bomData?.systemPack || !liveProject) return null;
    const systemPack = bomData.systemPack;
    return {
      id: systemPack.meta.id,
      name: systemPack.meta.name,
      category: 'aluminum_windows' as const,
      brand: systemPack.meta.brands[0] || 'Unknown',
      compatibleProfiles: systemPack.profiles?.map(p => p.id) || [],
      compatibleAccessories: [],
      description: systemPack.meta.name,
      technicalData: systemPack.windowSystemSpec || {},
    };
  }, [bomData?.systemPack, liveProject]);

  // Detect pricing source (system_pricing vs constants)
  useEffect(() => {
    const detectPricingSource = async () => {
      if (!liveProject?.systemPackId || !currentUserId || !profiles.length) {
        setPricingSource('constants');
        return;
      }

      try {
        // Check if any profile in the system pack has system_pricing configured
        const systemPackProfiles = profiles.filter((profile) => {
          const specs = profile.specifications as any;
          const systemName = specs?.window_system || profile.systemBrand || specs?.systemPackId;
          return systemName === liveProject.systemPackId;
        });

        if (systemPackProfiles.length === 0) {
          setPricingSource('constants');
          return;
        }

        // Check first profile for system_pricing
        const firstProfile = systemPackProfiles[0];
        const pricing = await systemPricingService.getSystemPricing(
          firstProfile.id,
          liveProject.systemPackId
        );

        setPricingSource(pricing && pricing.initialized ? 'system_pricing' : 'constants');
      } catch (error) {
        console.warn('Error detecting pricing source:', error);
        setPricingSource('constants');
      }
    };

    void detectPricingSource();
  }, [liveProject?.systemPackId, currentUserId, profiles]);

  // Show empty state if bomData is not available yet
  if (!bomData) {
    return (
      <div className="p-4 text-center text-amber-600/70">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t('engineering_bay.bom_loading', 'Bill of Materials')}</p>
        <p className="text-xs mt-1 opacity-60">{t('engineering_bay.bom_generating', 'Generating components...')}</p>
      </div>
    );
  }

  const { componentsByCategory, glassDetails, totals, aggregatedByCategory, systemPack } = bomData;

  const categoryLabels = {
    frame: t('engineering_bay.bom_frame', 'Frame Profiles'),
    sash: t('engineering_bay.bom_sash', 'Sash Profiles'),
    structural: t('engineering_bay.bom_structural', 'Structural Profiles'),
    glazing: t('engineering_bay.bom_glazing', 'Glazing Profiles'),
    accessory: t('engineering_bay.bom_accessory', 'Accessory Profiles'),
    other: t('engineering_bay.bom_other', 'Other Components'),
  };

  // Format cost for display
  const formatCost = (amount: number) => {
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={cn('h-full flex flex-col', className)}>
      <GoldTierCard variant="elevated" className="card-glass-dark shadow-glow-intense flex-1 flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 tracking-[0.15em] uppercase text-amber-200 font-semibold">
              <FileText className="h-5 w-5 text-amber-500 text-shadow-glow" />
              {t('engineering_bay.bill_of_materials', 'Real-time Bill of Materials')}
            </CardTitle>
            {onToggleCollapse && (
              <GoldTierButton
                onClick={onToggleCollapse}
                className="h-6 w-6 p-0 text-amber-400 hover:text-amber-300"
                aria-label={collapsed ? t('engineering_bay.expand_bom', 'Expand BOM') : t('engineering_bay.collapse_bom', 'Collapse BOM')}
              >
                {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </GoldTierButton>
            )}
          </div>
          <CardDescription className="text-xs text-amber-600/80 font-medium flex items-center justify-between gap-2">
            <span>{t('engineering_bay.bom_precision_note', 'Maalem-grade precision - All components from unit preset')}</span>
            {pricingSource !== 'checking' && (
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    pricingSource === 'system_pricing'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[10px]'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-400 text-[10px]'
                  }
                >
                  {pricingSource === 'system_pricing'
                    ? t('engineering_bay.pricing_source.custom', 'Custom Pricing')
                    : t('engineering_bay.pricing_source.default', 'Default Pricing')}
                </Badge>
                {onOpenPricingStudio && liveProject?.systemPackId && (
                  <GoldTierButton
                    onClick={() => {
                      const systemPackProfile = profiles.find((p) => {
                        const specs = p.specifications as any;
                        const systemName = specs?.window_system || p.systemBrand || specs?.systemPackId;
                        return systemName === liveProject.systemPackId;
                      });
                      onOpenPricingStudio(liveProject.systemPackId, systemPackProfile?.id);
                    }}
                    className="h-6 px-2 text-[10px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                    title={t('engineering_bay.configure_pricing', 'Configure Pricing')}
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    {t('engineering_bay.configure', 'Configure')}
                  </GoldTierButton>
                )}
              </div>
            )}
          </CardDescription>
          {/* Summary when collapsed */}
          {collapsed && showSummary && summary && (
            <div className="mt-2 p-2 bg-amber-900/20 border border-amber-600/30 rounded">
              <div className="text-sm text-amber-200 font-semibold">
                {summary.itemCount} {t('engineering_bay.items', 'items')} • {formatCost(summary.totalCost)}
              </div>
            </div>
          )}
        </CardHeader>

        {!collapsed && (
          <CardContent className="space-y-4 flex-1 overflow-y-auto">
            {/* Grouped by category */}
            {Object.entries(componentsByCategory).map(([category, comps]) => {
              if (comps.length === 0) return null;

              const aggregated = aggregatedByCategory[category] || {};

              return (
                <Collapsible key={category} defaultOpen={false} className="space-y-2">
                  <CollapsibleTrigger className="btn-secondary-dark">
                    <h4 className="typography-h4 typography-label-compact text-amber-500/80 truncate flex-1 text-left">
                      {categoryLabels[category as keyof typeof categoryLabels]}
                    </h4>
                    <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600/70 transition-transform duration-200 data-[state=open]:rotate-180 flex-shrink-0 ml-2" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1.5 sm:space-y-2 pt-1">
                    {Object.values(aggregated).map((item: any, idx) => {
                      const isVerified = item.verification?.verified !== false;
                      const hasMissing = item.verification?.missing?.length > 0;
                      const hasMismatched = item.verification?.mismatched?.length > 0;

                      return (
                        <div
                          key={idx}
                          className={cn(
                            'flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 sm:p-2.5 rounded border text-xs sm:text-sm gap-1 sm:gap-0',
                            isVerified
                              ? 'bg-[#0f0f0f]/60 border border-amber-600/40'
                              : hasMissing || hasMismatched
                              ? 'bg-[#1a1a1a]/60 border border-amber-600/50'
                              : 'bg-[#0f0f0f]/60 border border-amber-600/30'
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {/* Profile Thumbnail in BOM */}
                              {item.profile?.thumbnailUrl && (
                                <img
                                  src={item.profile.thumbnailUrl}
                                  alt={item.profile.name || item.type}
                                  className="w-6 h-6 sm:w-8 sm:h-8 rounded border-amber-600/30 object-contain bg-white/5 flex-shrink-0 card-premium"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <div className="font-semibold text-amber-200 text-xs sm:text-sm truncate">
                                {item.profile?.name || item.type}
                              </div>
                              {!isVerified && (
                                <span
                                  className="status-warning text-[8px] sm:text-[10px] px-1 py-0.5 rounded"
                                  title={
                                    hasMissing
                                      ? `${t('engineering_bay.verification.missing', 'Missing:')} ${item.verification.missing.map((m: string) => t(`engineering_bay.specs.${m}`, m)).join(', ')}`
                                      : hasMismatched
                                      ? `${t('engineering_bay.verification.mismatch', 'Mismatch:')} ${item.verification.mismatched.join(', ')}`
                                      : t('engineering_bay.verification.not_verified', 'Not verified')
                                  }
                                />
                              )}
                              {isVerified && item.verification && (
                                <span
                                  className="status-valid text-[8px] sm:text-[10px]"
                                  title={t('engineering_bay.verification.verified', 'Verified against system pack')}
                                />
                              )}
                            </div>
                            <div className="text-[10px] sm:text-xs text-amber-600/70 mt-0.5 break-words space-x-1">
                              <span className="inline-block">{item.type}</span>
                              {item.role && <span className="inline-block"> • {item.role}</span>}
                              {item.specs?.material && <span className="inline-block"> • {item.specs.material}</span>}
                              {item.specs?.width && <span className="inline-block"> • {item.specs.width}{t('engineering_bay.units.mm', 'mm')}</span>}
                              {item.specs?.height && <span className="inline-block"> × {item.specs.height}{t('engineering_bay.units.mm', 'mm')}</span>}
                              {item.totalLength > 0 && <span className="inline-block"> • {Math.round(item.totalLength)}{t('engineering_bay.units.mm', 'mm')}</span>}
                              {item.totalWeight > 0 && <span className="inline-block"> • {item.totalWeight.toFixed(2)}{t('engineering_bay.units.kg', 'kg')}</span>}
                              {item.totalCost > 0 && <span className="inline-block"> • {item.totalCost.toFixed(2)} {t('engineering_bay.currency', 'EGP')}</span>}
                            </div>
                            {/* Show missing specs warning */}
                            {hasMissing && (
                              <div className="status-warning text-[9px] mt-1">
                                {t('engineering_bay.verification.missing', 'Missing:')} {item.verification.missing.map((m: string) => t(`engineering_bay.specs.${m}`, m)).join(', ')}
                              </div>
                            )}
                            {hasMismatched && (
                              <div className="status-warning text-[9px] mt-1">
                                {t('engineering_bay.verification.mismatch', 'Mismatch:')} {item.verification.mismatched.join(', ')}
                              </div>
                            )}
                          </div>
                          <span className="font-mono text-amber-300 font-bold sm:ml-4 text-xs sm:text-sm flex-shrink-0">
                            {item.quantity}{t('engineering_bay.units.quantity', 'x')}
                          </span>
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}

            {/* Glass/Glazing Details - Collapsible */}
            {glassDetails.glassSpecs.length > 0 && (
              <Collapsible defaultOpen={false} className="space-y-2 pt-2 border-t border-amber-600/30">
                <CollapsibleTrigger className="btn-secondary-dark">
                  <h4 className="typography-h4 typography-label text-amber-500/80">
                    {t('engineering_bay.bom_glass', 'Glass & Glazing')}
                  </h4>
                  <ChevronDown className="h-4 w-4 text-amber-600/70 transition-transform duration-200 data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-1">
                  {glassDetails.glassSpecs.map((glass, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 card-dark rounded text-sm">
                      <div className="flex-1">
                        <div className="font-semibold text-amber-200">
                          {t('engineering_bay.glass_sash', 'Sash')} {glass.sashIndex} - {glass.type} {glassDetails.glassThickness}mm
                        </div>
                        <div className="text-xs text-amber-600/70 mt-0.5">
                          {Math.round(glass.width)}{t('engineering_bay.units.mm', 'mm')} × {Math.round(glass.height)}{t('engineering_bay.units.mm', 'mm')}
                          {` • ${glass.area.toFixed(2)}${t('engineering_bay.units.m2', 'm²')}`}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="p-2 card-dark rounded text-xs">
                    <div className="flex justify-between text-amber-200">
                      <span className="font-semibold">{t('engineering_bay.total_glass_area', 'Total Glass Area')}:</span>
                      <span className="font-mono font-bold text-amber-400 text-shadow-glow-strong">{glassDetails.totalGlassArea.toFixed(2)}{t('engineering_bay.units.m2', 'm²')}</span>
                    </div>
                    <div className="flex justify-between text-amber-200 mt-1">
                      <span className="font-semibold">{t('engineering_bay.total_glass_weight', 'Total Glass Weight')}:</span>
                      <span className="font-mono font-bold text-amber-400 text-shadow-glow-strong">{glassDetails.totalGlassWeight.toFixed(2)}{t('engineering_bay.units.kg', 'kg')}</span>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Hardware - Collapsible */}
            {liveProject?.hardware && liveProject.hardware.length > 0 && (
              <Collapsible defaultOpen={false} className="space-y-2 pt-2 border-t border-amber-600/30">
                <CollapsibleTrigger className="btn-secondary-dark">
                  <h4 className="typography-h4 text-[10px] sm:text-xs text-amber-500/80 tracking-[0.15em] truncate flex-1 text-left">
                    {t('engineering_bay.bom_hardware', 'Hardware')}
                  </h4>
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600/70 transition-transform duration-200 data-[state=open]:rotate-180 flex-shrink-0 ml-2" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1.5 sm:space-y-2 pt-1">
                  {liveProject.hardware.map(hw => (
                    <div key={hw.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 sm:p-2.5 card-dark rounded text-xs sm:text-sm gap-1 sm:gap-0">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-amber-200 text-xs sm:text-sm truncate">{hw.name}</div>
                        <div className="text-[10px] sm:text-xs text-amber-600/70 mt-0.5 break-words">
                          <span className="inline-block">{hw.type}</span>
                          {hw.length && <span className="inline-block"> • {Math.round(hw.length)}{t('engineering_bay.units.mm', 'mm')}</span>}
                          {hw.position && <span className="inline-block"> • {hw.position}</span>}
                        </div>
                      </div>
                      <span className="font-mono text-amber-300 font-bold sm:ml-4 text-xs sm:text-sm flex-shrink-0">
                        {hw.quantity || 1}{hw.type === 'gasket' ? t('engineering_bay.units.meters', 'm') : hw.type === 'reinforcement' ? ` ${t('engineering_bay.units.bars', 'bars')}` : t('engineering_bay.units.quantity', 'x')}
                      </span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Hardener Code Selection */}
            {liveProject && systemPack && (
              <div className="pt-2 border-t border-amber-600/30">
                <HardenerSelectionPanel
                  windowUnit={liveProject}
                  systemPack={fabricatorSystemPack}
                  mode="production"
                  className="mt-2"
                />
              </div>
            )}

            {/* Profile Suggestions */}
            {liveProject && systemPack && (
              <div className="pt-2 border-t border-amber-600/30">
                <ProfileSuggestionsPanel
                  windowUnit={liveProject}
                  systemPack={fabricatorSystemPack}
                  className="mt-2"
                />
              </div>
            )}

            {/* RealityOS Event Emission */}
            {/* EventEmissionPanel - component may not exist yet, commented out for now */}
            {/* {liveProject && (
              <div className="pt-2 border-t border-amber-600/30">
                <EventEmissionPanel
                  windowUnit={liveProject}
                  operatorId={currentUserId}
                  className="mt-2"
                />
              </div>
            )} */}

            {/* Unit Summary & Totals - Always visible */}
            <div className="space-y-2 pt-2 border-t border-amber-600/30">
              <h4 className="typography-h4 typography-label text-amber-200">
                {t('engineering_bay.bom_summary', 'Unit Summary')}
              </h4>
              <div className="p-3 card-dark rounded space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-amber-500/80 font-semibold">{t('engineering_bay.unit_dimensions', 'Dimensions')}:</span>
                    <div className="font-mono text-amber-200 font-bold mt-0.5 text-shadow-glow-subtle">
                      {Math.round(liveProject?.overallWidth || 0)}{t('engineering_bay.units.mm', 'mm')} × {Math.round(liveProject?.overallHeight || 0)}{t('engineering_bay.units.mm', 'mm')}
                    </div>
                  </div>
                  <div>
                    <span className="text-amber-500/80 font-semibold">{t('engineering_bay.system_pack', 'System Pack')}:</span>
                    <div className="text-amber-200 font-semibold mt-0.5">
                      {systemPack?.meta.name || liveProject?.systemPackId || t('engineering_bay.not_specified', 'Not specified')}
                    </div>
                  </div>
                  {liveProject?.positionMeta && (
                    <>
                      {liveProject.positionMeta.flatNumber && (
                        <div>
                          <span className="text-amber-500/80 font-semibold">{t('engineering_bay.flat_number', 'Flat')}:</span>
                          <div className="text-amber-200 mt-0.5">{liveProject.positionMeta.flatNumber}</div>
                        </div>
                      )}
                      {liveProject.positionMeta.floor && (
                        <div>
                          <span className="text-amber-500/80 font-semibold">{t('engineering_bay.floor', 'Floor')}:</span>
                          <div className="text-amber-200 mt-0.5">{liveProject.positionMeta.floor}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="pt-2 border-t border-amber-600/30 space-y-1">
                  <div className="flex justify-between text-amber-200">
                    <span className="font-semibold">{t('engineering_bay.total_material_cost', 'Total Material Cost')}:</span>
                    <span className="font-mono font-bold text-amber-400 text-shadow-glow-strong">
                      {totals.materialCost.toFixed(2)} {t('engineering_bay.currency', 'EGP')}
                    </span>
                  </div>
                  <div className="flex justify-between text-amber-200">
                    <span className="font-semibold">{t('engineering_bay.total_profile_weight', 'Total Profile Weight')}:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {totals.weight.toFixed(2)}{t('engineering_bay.units.kg', 'kg')}
                    </span>
                  </div>
                  {glassDetails.totalGlassWeight > 0 && (
                    <div className="flex justify-between text-amber-200">
                      <span className="font-semibold">{t('engineering_bay.total_unit_weight', 'Total Unit Weight')}:</span>
                      <span className="font-mono font-bold text-amber-400">
                        {(totals.weight + glassDetails.totalGlassWeight).toFixed(2)}{t('engineering_bay.units.kg', 'kg')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </GoldTierCard>
    </div>
  );
};