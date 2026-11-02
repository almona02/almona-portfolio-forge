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

  // Workshop guidance (shown as checklist, not “automation”)
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
            <ShieldCheck className="w-5 h-5 text-warning shrink-0" />
            <h2 className="typography-h2 text-foreground text-lg sm:text-xl">
              Pattern reliability toolkit
            </h2>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Verify grid, pack fit, and complexity before applying. No auto-invented layouts.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleToggleDetails(!showDetails)}
          className="shrink-0 border-border text-foreground"
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
        <TabsList className="bg-background/80 border border-border">
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
            <div className="rounded-lg border border-border bg-background/60 p-6 text-center text-sm text-muted-foreground">
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
                      'relative overflow-hidden border bg-background/70 text-foreground',
                      isSelected
                        ? 'border-amber-500 ring-1 ring-amber-500/40'
                        : 'border-border hover:border-amber-600/50',
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 z-10">
                        <CheckCircle2 className="w-5 h-5 text-warning" />
                      </div>
                    )}

                    <CardContent className="p-4 sm:p-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-amber-600/40 bg-amber-500/10">
                          <Grid3x3 className="h-5 w-5 text-warning" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="typography-h3 text-base text-foreground leading-snug">
                            {preset.title}
                          </h3>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {preset.description}
                          </p>
                        </div>
                      </div>

                      {/* Human verification checklist */}
                      <div className="rounded-md border border-border/80 bg-background/70 p-3 space-y-1.5 text-xs">
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Grid</span>
                          <span className="font-mono text-warning">
                            {grid
                              ? `${grid.rows}×${grid.cols}`
                              : preset.intelligence.gridPattern}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Pack fit</span>
                          <span
                            className={cn(
                              'font-medium',
                              packMatch ? 'text-success' : 'text-destructive',
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
                          <span className="text-muted-foreground">Complexity</span>
                          <span className="text-foreground">{preset.complexity}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Evidence</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px]',
                              evidence === 'approved'
                                ? 'border-emerald-500/50 text-success'
                                : 'border-amber-500/40 text-warning',
                            )}
                          >
                            {evidence}
                          </Badge>
                        </div>
                      </div>

                      {showDetails && details && (
                        <div className="rounded-md border border-border bg-background/50 p-3 space-y-2 text-xs text-foreground">
                          {details.bestFor && (
                            <p>
                              <span className="text-warning font-medium">Best for: </span>
                              {details.bestFor}
                            </p>
                          )}
                          {details.architecturalStyle && (
                            <p>
                              <span className="text-warning font-medium">Style: </span>
                              {details.architecturalStyle}
                            </p>
                          )}
                          {preset.intelligence.optimization && (
                            <p>
                              <span className="text-warning font-medium">Workshop note: </span>
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
                            ? 'bg-amber-500 hover:bg-amber-600 text-foreground'
                            : 'bg-muted hover:bg-card text-foreground',
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
