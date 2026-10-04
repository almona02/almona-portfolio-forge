// src/components/fabricator/drafting/prestige/ArchitecturalPresetSelector.tsx
/**
 * Window Pattern Toolkit — human reliability selector
 *
 * Constitutional: Rule-based, full audit trail
 * Philosophy: Operator verifies grid, pack, and complexity before apply
 */

import { cn } from '@/lib/utils';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent } from '@/shared/ui/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import type { WindowGrid } from '@/types/fabricator';
import {
  Award,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Grid3x3,
  Home,
  Info,
  ShieldCheck,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { logDraftingAction } from '../utils/constitutionalAudit';

export interface ArchitecturalPreset {
  id: string;

  // Always shown (simple)
  title: string;
  description: string;
  icon: string;
  complexity: 'Basic' | 'Moderate' | 'Advanced' | 'Expert' | 'Bespoke';

  // Workshop guidance (shown as checklist, not “AI”)
  intelligence: {
    gridPattern: string;
    systemRecommendation: string;
    materialRecommendation: string;
    optimization?: string;
  };

  // Applications (simple list)
  applications: string[];

  // Pricing tier
  pricingTier: 'Local' | 'Standard' | 'Premium' | 'Enterprise' | 'Bespoke';

  /** FP-028: normalized catalogue authority. Legacy/custom presets may omit it and fail closed. */
  templateSchema?: {
    version: 1;
    status: 'selectable' | 'blocked';
    evidenceStatus: 'illustrative' | 'approved';
    compatibleSystemPackIds: string[];
    grid?: WindowGrid;
    blockedReason?: string;
  };

  // Only shown when showDetails = true
  architecturalDetails?: {
    narrative?: string;
    architecturalStyle?: string;
    principles?: string[];
    bestFor?: string;
  };
}

interface ArchitecturalPresetSelectorProps {
  presets: ArchitecturalPreset[];
  selectedPreset?: string;
  onSelect: (presetId: string) => void;
  currentSystem?: string;
  currentMaterial?: string;
  defaultShowDetails?: boolean;
}

export const ArchitecturalPresetSelector: React.FC<ArchitecturalPresetSelectorProps> = ({
  presets,
  selectedPreset,
  onSelect,
  currentSystem,
  currentMaterial,
  defaultShowDetails = false,
}) => {
  const [activeCategory, setActiveCategory] = useState<'residential' | 'commercial' | 'heritage'>(
    'residential',
  );

  const [showDetails, setShowDetails] = useState(() => {
    const saved = localStorage.getItem('almona-show-details');
    if (saved !== null) return saved === 'true';
    return defaultShowDetails;
  });

  const handleToggleDetails = useCallback(
    (value: boolean) => {
      setShowDetails(value);
      localStorage.setItem('almona-show-details', value.toString());
      logDraftingAction(
        'template_selected',
        { from: showDetails, to: value, timestamp: new Date().toISOString() },
        { showDetails: value },
        `CHECKPOINT-DETAIL-TOGGLE-${Date.now()}`,
      );
    },
    [showDetails],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        handleToggleDetails(!showDetails);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDetails, handleToggleDetails]);

  const handleSelect = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    logDraftingAction(
      'preset_intelligence_applied',
      {
        presetId,
        presetTitle: preset?.title,
        showDetails,
        currentSystem,
        currentMaterial,
        pricingTier: preset?.pricingTier,
      },
      { presetId },
      `CHECKPOINT-ARCHITECTURAL-PRESET-${Date.now()}`,
    );
    onSelect(presetId);
  };

  const getFilteredPresets = () => {
    return presets.filter((preset) => {
      if (preset.templateSchema?.status === 'blocked') return false;
      if (
        activeCategory === 'residential' &&
        !preset.id.includes('residential') &&
        !preset.id.includes('villa') &&
        !preset.id.includes('apartment')
      ) {
        return false;
      }
      if (
        activeCategory === 'commercial' &&
        !preset.id.includes('commercial') &&
        !preset.id.includes('curtain') &&
        !preset.id.includes('shop')
      ) {
        return false;
      }
      if (
        activeCategory === 'heritage' &&
        !preset.id.includes('heritage') &&
        !preset.id.includes('islamic') &&
        !preset.id.includes('geometric')
      ) {
        return false;
      }
      return true;
    });
  };

  const filteredPresets = getFilteredPresets();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
            <h2 className="typography-h2 text-slate-100 text-lg sm:text-xl">
              Pattern reliability toolkit
            </h2>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Verify grid, pack fit, and complexity before applying. No auto-invented layouts.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleToggleDetails(!showDetails)}
          className="shrink-0 border-slate-600 text-slate-200"
          title={showDetails ? 'Simple view (Ctrl+D)' : 'Workshop notes (Ctrl+D)'}
        >
          <Info className="w-4 h-4" />
          <span className="hidden sm:inline ml-1">{showDetails ? 'Simple' : 'Notes'}</span>
          {showDetails ? (
            <ChevronUp className="w-4 h-4 ml-1" />
          ) : (
            <ChevronDown className="w-4 h-4 ml-1" />
          )}
        </Button>
      </div>

      <Tabs
        value={activeCategory}
        onValueChange={(v) => setActiveCategory(v as typeof activeCategory)}
      >
        <TabsList className="bg-slate-900/80 border border-slate-700">
          <TabsTrigger value="residential" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Residential
          </TabsTrigger>
          <TabsTrigger value="commercial" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Commercial
          </TabsTrigger>
          <TabsTrigger value="heritage" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Heritage
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4 sm:mt-6">
          {filteredPresets.length === 0 ? (
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-6 text-center text-sm text-slate-400">
              No selectable patterns in this category for the current catalog.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPresets.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                const details = preset.architecturalDetails;
                const grid = preset.templateSchema?.grid;
                const packIds = preset.templateSchema?.compatibleSystemPackIds ?? [];
                const packMatch =
                  !currentSystem || packIds.length === 0 || packIds.includes(currentSystem);
                const evidence = preset.templateSchema?.evidenceStatus ?? 'illustrative';

                return (
                  <Card
                    key={preset.id}
                    className={cn(
                      'relative overflow-hidden border bg-slate-950/70 text-slate-100',
                      isSelected
                        ? 'border-amber-500 ring-1 ring-amber-500/40'
                        : 'border-slate-700 hover:border-amber-600/50',
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 z-10">
                        <CheckCircle2 className="w-5 h-5 text-amber-400" />
                      </div>
                    )}

                    <CardContent className="p-4 sm:p-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-amber-600/40 bg-amber-500/10">
                          <Grid3x3 className="h-5 w-5 text-amber-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="typography-h3 text-base text-slate-100 leading-snug">
                            {preset.title}
                          </h3>
                          <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                            {preset.description}
                          </p>
                        </div>
                      </div>

                      {/* Human verification checklist */}
                      <div className="rounded-md border border-slate-700/80 bg-slate-900/70 p-3 space-y-1.5 text-xs">
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Grid</span>
                          <span className="font-mono text-amber-200">
                            {grid
                              ? `${grid.rows}×${grid.cols}`
                              : preset.intelligence.gridPattern}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Pack fit</span>
                          <span
                            className={cn(
                              'font-medium',
                              packMatch ? 'text-emerald-300' : 'text-red-300',
                            )}
                          >
                            {packIds[0] || preset.intelligence.systemRecommendation}
                            {currentSystem
                              ? packMatch
                                ? ' · OK'
                                : ' · mismatch'
                              : ''}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Complexity</span>
                          <span className="text-slate-200">{preset.complexity}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-400">Evidence</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px]',
                              evidence === 'approved'
                                ? 'border-emerald-500/50 text-emerald-300'
                                : 'border-amber-500/40 text-amber-200',
                            )}
                          >
                            {evidence}
                          </Badge>
                        </div>
                      </div>

                      {showDetails && details && (
                        <div className="rounded-md border border-slate-700 bg-slate-900/50 p-3 space-y-2 text-xs text-slate-300">
                          {details.bestFor && (
                            <p>
                              <span className="text-amber-300 font-medium">Best for: </span>
                              {details.bestFor}
                            </p>
                          )}
                          {details.architecturalStyle && (
                            <p>
                              <span className="text-amber-300 font-medium">Style: </span>
                              {details.architecturalStyle}
                            </p>
                          )}
                          {preset.intelligence.optimization && (
                            <p>
                              <span className="text-amber-300 font-medium">Workshop note: </span>
                              {preset.intelligence.optimization}
                            </p>
                          )}
                        </div>
                      )}

                      <Button
                        onClick={() => handleSelect(preset.id)}
                        disabled={!packMatch && Boolean(currentSystem)}
                        className={cn(
                          'w-full',
                          isSelected
                            ? 'bg-amber-500 hover:bg-amber-600 text-slate-900'
                            : 'bg-slate-100 hover:bg-white text-slate-900',
                        )}
                      >
                        {isSelected ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Pattern applied
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4 mr-2" />
                            Apply pattern
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
