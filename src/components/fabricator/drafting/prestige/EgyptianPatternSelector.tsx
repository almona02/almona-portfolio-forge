/**
 * Egyptian Pattern Selector - Prestige Edition
 * 
 * Uses actual patterns from egyptian-window-patterns.ts
 * Displays real Egyptian window patterns with technical specifications
 * 
 * Constitutional: Rule-based, full audit trail
 * Tier: 3 Protected Determinism
 */

import { PrestigePatternIcons } from '@/components/ui/PrestigePatternIcons';
import { EGYPTIAN_PATTERNS, getPatternsForSystem, patternGridSpecToWindowGrid, type EgyptianPattern } from '@/data/egyptian-window-patterns';
import { cn } from '@/lib/utils';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent } from '@/shared/ui/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import type { WindowGrid } from '@/types/fabricator';
import {
  Award,
  Box,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Grid3x3,
  Home,
  Info,
  Layers,
  Ruler,
  Sparkles,
  TrendingUp,
  Zap
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { logDraftingAction } from '../utils/constitutionalAudit';

interface EgyptianPatternSelectorProps {
  selectedPatternId?: string;
  onSelect: (patternId: string, grid: WindowGrid) => void;
  currentSystemId?: string;
  defaultShowDetails?: boolean;
  className?: string;
}

export const EgyptianPatternSelector: React.FC<EgyptianPatternSelectorProps> = ({
  selectedPatternId,
  onSelect,
  currentSystemId,
  defaultShowDetails = false,
  className
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'residential' | 'commercial' | 'villa' | 'specialty'>('all');
  const [showDetails, setShowDetails] = useState(() => {
    const saved = localStorage.getItem('almona-pattern-details');
    if (saved !== null) return saved === 'true';
    return defaultShowDetails;
  });
  const [hasSeenHint, setHasSeenHint] = useState(() => {
    return localStorage.getItem('almona-pattern-hint-seen') === 'true';
  });

  // Filter patterns by system compatibility
  const availablePatterns = useMemo(() => {
    if (currentSystemId) {
      return getPatternsForSystem(currentSystemId);
    }
    return EGYPTIAN_PATTERNS;
  }, [currentSystemId]);

  // Categorize patterns
  const categorizedPatterns = useMemo(() => {
    const categories: Record<string, EgyptianPattern[]> = {
      residential: [],
      commercial: [],
      villa: [],
      specialty: []
    };

    availablePatterns.forEach(pattern => {
      if (pattern.type === 'curtain_wall' || pattern.type === 'skylight') {
        categories.commercial.push(pattern);
      } else if (pattern.type === 'door' || pattern.id.includes('door')) {
        categories.specialty.push(pattern);
      } else if (pattern.id.includes('villa') || pattern.id.includes('luxury') || pattern.id.includes('arched')) {
        categories.villa.push(pattern);
      } else {
        categories.residential.push(pattern);
      }
    });

    return categories;
  }, [availablePatterns]);

  const filteredPatterns = useMemo(() => {
    if (activeCategory === 'all') return availablePatterns;
    return categorizedPatterns[activeCategory] || [];
  }, [activeCategory, availablePatterns, categorizedPatterns]);

  const handleToggleDetails = useCallback((value: boolean) => {
    setShowDetails(value);
    localStorage.setItem('almona-pattern-details', value.toString());

    logDraftingAction(
      'pattern_details_toggle',
      { from: showDetails, to: value },
      { showDetails: value },
      `CHECKPOINT-PATTERN-DETAILS-${Date.now()}`
    );

    if (value && !hasSeenHint) {
      setHasSeenHint(true);
      localStorage.setItem('almona-pattern-hint-seen', 'true');
    }
  }, [showDetails, hasSeenHint]);

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

  const handleSelect = (pattern: EgyptianPattern) => {
    const grid = patternGridSpecToWindowGrid(pattern.gridSpec);

    logDraftingAction(
      'egyptian_pattern_selected',
      {
        patternId: pattern.id,
        patternName: pattern.name,
        systemId: currentSystemId,
        gridSpec: pattern.gridSpec
      },
      { patternId: pattern.id, grid },
      `CHECKPOINT-EGYPTIAN-PATTERN-${Date.now()}`
    );

    onSelect(pattern.id, grid);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sliding': return Layers;
      case 'casement': return Box;
      case 'tilt_turn': return Zap;
      case 'door': return Box;
      case 'fixed': return Grid3x3;
      case 'curtain_wall': return Building2;
      case 'skylight': return TrendingUp;
      default: return Box;
    }
  };

  // Map EgyptianPattern IDs to PrestigePatternIcons
  const getPatternIcon = (pattern: EgyptianPattern): React.ComponentType<{ className?: string; size?: number }> | null => {
    const iconMap: Record<string, keyof typeof PrestigePatternIcons> = {
      'sliding-2s': 'Sliding2Sash',
      'sliding-4s': 'Sliding4Sash',
      'sliding-3s-center-fixed': 'Sliding3SashCenterFixed',
      'casement-double': 'CasementDouble',
      'casement-2sash': 'CasementDouble',
      'casement-2sash-fixed': 'FixedSideCasements',
      'fixed-with-side-casements': 'FixedSideCasements',
      'sliding-door-2p': 'SlidingDoor2Panel',
      'fixed': 'FixedWindow',
      'with-shish': 'WindowWithShish',
      'kitchen-door-acp': 'KitchenDoorACP',
      'arched-panda': 'ArchedWindow',
      'tilt-turn': 'TiltTurn',
      'casement-single': 'SingleCasementSmall',
      'with-latish': 'CasementLatish',
      'with-shish-latish': 'ShishLatishCombo',
      'french-door': 'FrenchDoor',
      'awning-window': 'AwningWindow',
      'corner-window': 'CornerWindow',
      'picture-window': 'PictureWindow',
      'bi-fold-door': 'BiFoldDoor',
    };

    // Try exact match first
    const iconKey = iconMap[pattern.id];
    if (iconKey && PrestigePatternIcons[iconKey]) {
      return PrestigePatternIcons[iconKey];
    }

    // Try pattern matching by type and layout
    if (pattern.type === 'sliding' && pattern.layout.includes('2')) {
      return PrestigePatternIcons.Sliding2Sash;
    }
    if (pattern.type === 'sliding' && pattern.layout.includes('4')) {
      return PrestigePatternIcons.Sliding4Sash;
    }
    if (pattern.type === 'casement' && pattern.layout.includes('Double')) {
      return PrestigePatternIcons.CasementDouble;
    }
    if (pattern.type === 'tilt_turn') {
      return PrestigePatternIcons.TiltTurn;
    }
    if (pattern.type === 'fixed' && pattern.layout.includes('Single')) {
      return PrestigePatternIcons.FixedWindow;
    }
    if (pattern.type === 'door' && pattern.layout.includes('French')) {
      return PrestigePatternIcons.FrenchDoor;
    }
    if (pattern.layout.includes('Panda') || pattern.layout.includes('Screen')) {
      return PrestigePatternIcons.PandaCasementScreen;
    }
    if (pattern.layout.includes('Shish') || pattern.id.includes('shish')) {
      return PrestigePatternIcons.WindowWithShish;
    }
    if (pattern.layout.includes('Latish') || pattern.id.includes('latish')) {
      return PrestigePatternIcons.CasementLatish;
    }
    if (pattern.layout.includes('Arched')) {
      return PrestigePatternIcons.ArchedWindow;
    }
    if (pattern.layout.includes('Awning')) {
      return PrestigePatternIcons.AwningWindow;
    }

    // Default fallback
    return PrestigePatternIcons.FixedWindow;
  };

  // Premium Pattern Icon Component with Gold Card Style
  const PatternIconCard: React.FC<{ pattern: EgyptianPattern }> = ({ pattern }) => {
    const IconComponent = getPatternIcon(pattern);

    if (!IconComponent) {
      // Fallback to grid representation if no icon match
      const { rows, cols, cells } = pattern.gridSpec;
      const cellSize = Math.min(40 / Math.max(rows, cols), 8);

      return (
        <div
          className="flex items-center justify-center p-2 bg-gradient-to-br from-amber-600/20 to-amber-500/10 rounded-lg border border-amber-600/30 card-premium"
          style={{ width: `${cols * cellSize + 16}px`, height: `${rows * cellSize + 16}px` }}
        >
          <div
            className="grid gap-0.5"
            style={{
              gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${rows}, ${cellSize}px)`
            }}
          >
            {Array.from({ length: rows * cols }, (_, i) => {
              const row = Math.floor(i / cols);
              const col = i % cols;
              const cell = cells.find(c => c.row === row && c.col === col);
              const cellType = cell?.type || 'fixed';

              const cellColors: Record<string, string> = {
                fixed: 'bg-amber-600/40',
                sliding: 'bg-amber-500/60',
                sash: 'bg-amber-400/60',
                panel: 'bg-amber-500/50',
                empty: 'bg-slate-600/20'
              };

              return (
                <div
                  key={i}
                  className={cn(
                    "border border-amber-600/30",
                    cellColors[cellType] || cellColors.fixed
                  )}
                  style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
                />
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center p-3 bg-gradient-to-br from-amber-600/20 via-amber-500/15 to-amber-600/20 rounded-lg border border-amber-600/40 shadow-glow-premium card-premium relative overflow-hidden">
        {/* Ancient gold texture overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(245, 158, 11, 0.1) 2px, rgba(245, 158, 11, 0.1) 4px)'
        }} />
        <div className="relative z-10">
          <IconComponent size={48} className="text-amber-400" />
        </div>
      </div>
    );
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sliding': return 'cyan';
      case 'casement': return 'blue';
      case 'tilt_turn': return 'amber';
      case 'door': return 'amber';
      case 'fixed': return 'slate';
      case 'curtain_wall': return 'emerald';
      case 'skylight': return 'amber';
      default: return 'slate';
    }
  };

  const getComplexity = (pattern: EgyptianPattern): 'Basic' | 'Moderate' | 'Advanced' | 'Expert' => {
    const cellCount = pattern.gridSpec.rows * pattern.gridSpec.cols;
    const hasMullions = (pattern.mullions?.length || 0) > 0;
    const hasTransoms = (pattern.transoms?.length || 0) > 0;
    const isMixed = pattern.type === 'mixed';

    if (cellCount === 1 && !hasMullions && !hasTransoms) return 'Basic';
    if (cellCount <= 2 && !isMixed) return 'Moderate';
    if (cellCount <= 4 || isMixed) return 'Advanced';
    return 'Expert';
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Detail Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-amber-400" />
          <h2 className="typography-h2 text-slate-100">
            Egyptian Window Patterns
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {!hasSeenHint && !showDetails && (
            <Badge variant="outline" className="bg-cyan-500/10 border-cyan-500/30 text-cyan-300 text-xs">
              <Info className="w-3 h-3 mr-1" />
              Tip: Toggle for technical details
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleDetails(!showDetails)}
            className="btn-secondary"
            title={showDetails ? "Switch to simple view (Ctrl+D)" : "Show technical details (Ctrl+D)"}
          >
            <Info className="w-4 h-4" />
            {showDetails ? (
              <>
                <span>Simple View</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Show Details</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as typeof activeCategory)}>
        <TabsList className="bg-slate-900/60 -sm border border-slate-700/50 card-glass-dark">
          <TabsTrigger value="all" className="btn-primary">
            <Layers className="w-4 h-4" />
            All ({availablePatterns.length})
          </TabsTrigger>
          <TabsTrigger value="residential" className="btn-primary">
            <Home className="w-4 h-4" />
            Residential ({categorizedPatterns.residential.length})
          </TabsTrigger>
          <TabsTrigger value="commercial" className="btn-primary">
            <Building2 className="w-4 h-4" />
            Commercial ({categorizedPatterns.commercial.length})
          </TabsTrigger>
          <TabsTrigger value="villa" className="btn-primary">
            <Award className="w-4 h-4" />
            Villa ({categorizedPatterns.villa.length})
          </TabsTrigger>
          <TabsTrigger value="specialty" className="btn-primary">
            <Zap className="w-4 h-4" />
            Specialty ({categorizedPatterns.specialty.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeCategory} className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredPatterns.map((pattern) => {
              const isSelected = selectedPatternId === pattern.id;
              const typeColor = getTypeColor(pattern.type);
              const complexity = getComplexity(pattern);

              return (
                <Card
                  key={pattern.id}
                  className={cn(
                    "relative overflow-hidden transition-all duration-300 group cursor-pointer",
                    "hover:shadow-glow-premium hover:-translate-y-1",
                    // Premium Gold Card Style - FC Card Gold Old Style
                    "bg-gradient-to-br from-[#0a0a0a] via-amber-900/20 to-[#0a0a0a] backdrop-blur-xl border",
                    "card-premium",
                    isSelected
                      ? "border-2 border-amber-500/80 bg-gradient-to-br from-amber-500/20 via-amber-600/15 to-amber-500/20 shadow-glow-strong ring-2 ring-amber-500/40"
                      : "border-amber-600/40 hover:border-amber-500/60 hover:bg-gradient-to-br hover:from-amber-900/30 hover:via-amber-800/20 hover:to-amber-900/30"
                  )}
                >
                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="absolute top-4 right-4 z-10">
                      <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-full p-1.5 shadow-glow">
                        <CheckCircle2 className="w-5 h-5 text-slate-900" />
                      </div>
                    </div>
                  )}

                  {/* Type Badge */}
                  <div className="absolute top-4 left-4 z-10">
                    <Badge
                      className={cn(
                        "shadow-md text-xs",
                        typeColor === 'cyan' && "bg-cyan-500/20 border-cyan-500/50 text-cyan-300",
                        typeColor === 'blue' && "bg-blue-500/20 border-blue-500/50 text-blue-300",
                        typeColor === 'amber' && "bg-amber-500/20 border-amber-500/50 text-amber-300",
                        typeColor === 'amber' && "bg-amber-500/20 border-amber-500/50 text-amber-300",
                        typeColor === 'emerald' && "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
                        typeColor === 'slate' && "bg-slate-500/20 border-slate-500/50 text-slate-300"
                      )}
                    >
                      {pattern.type.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>

                  <CardContent className="p-6 pt-16">
                    {/* Premium Pattern Icon & Title */}
                    <div className="mb-4">
                      <div className="flex flex-col items-center gap-3 mb-3">
                        <PatternIconCard pattern={pattern} />
                        <div className="flex-1 w-full text-center">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            {React.createElement(getTypeIcon(pattern.type), {
                              className: "w-5 h-5 text-amber-400"
                            })}
                            <h3 className="typography-h3 text-lg text-amber-200">
                              {pattern.name}
                            </h3>
                          </div>
                          <p className="text-xs text-amber-600/70 leading-relaxed">
                            {pattern.layout}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Technical Details (when showDetails = true) */}
                    {showDetails && (
                      <div className="mb-4 p-3 border border-amber- 500/20 rounded-lg space-y-2 card-premium">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Grid:</span>
                          <span className="text-amber-300 font-mono">
                            {pattern.gridSpec.rows}×{pattern.gridSpec.cols}
                          </span>
                        </div>
                        {pattern.mullions && pattern.mullions.length > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Mullions:</span>
                            <span className="text-cyan-300">{pattern.mullions.length}</span>
                          </div>
                        )}
                        {pattern.transoms && pattern.transoms.length > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Transoms:</span>
                            <span className="text-cyan-300">{pattern.transoms.length}</span>
                          </div>
                        )}
                        {pattern.constraints && (
                          <div className="pt-2 border-t border-slate-700/50">
                            <div className="text-xs text-slate-400">
                              <div className="flex items-center gap-1 mb-1">
                                <Ruler className="w-3 h-3" />
                                <span>Dimensions:</span>
                              </div>
                              <div className="text-amber-300 font-mono pl-4">
                                {pattern.typicalWidthMm[0]}-{pattern.typicalWidthMm[1]}mm × {pattern.typicalHeightMm[0]}-{pattern.typicalHeightMm[1]}mm
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick Info */}
                    <div className="mb-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Complexity:</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            complexity === 'Basic' && "border-emerald-500/50 text-emerald-300",
                            complexity === 'Moderate' && "border-blue-500/50 text-blue-300",
                            complexity === 'Advanced' && "border-amber-500/50 text-amber-300",
                            complexity === 'Expert' && "border-amber-500/50 text-amber-300"
                          )}
                        >
                          {complexity}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Typical Size:</span>
                        <span className="text-slate-300 font-mono">
                          {Math.round((pattern.typicalWidthMm[0] + pattern.typicalWidthMm[1]) / 2)}×{Math.round((pattern.typicalHeightMm[0] + pattern.typicalHeightMm[1]) / 2)}mm
                        </span>
                      </div>
                    </div>

                    {/* Accessories */}
                    {pattern.accessories && pattern.accessories.length > 0 && (
                      <div className="mb-4">
                        <h4 className="typography-h4 text-xs text-slate-400 mb-2">Accessories</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {pattern.accessories.slice(0, 3).map((acc, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-xs bg-slate-800/50 text-slate-300 border-slate-700 /50 card-dark"
                            >
                              {acc}
                            </Badge>
                          ))}
                          {pattern.accessories.length > 3 && (
                            <Badge variant="secondary" className="text-xs bg-slate-800/50 text-slate-400">
                              +{pattern.accessories.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {pattern.notes && showDetails && (
                      <div className="mb-4 p-2 bg-cyan-500/10 border border-cyan-500/20 rounded text-xs text-cyan-300">
                        <Info className="w-3 h-3 inline mr-1" />
                        {pattern.notes}
                      </div>
                    )}

                    {/* Premium Action Button */}
                    <Button
                      onClick={() => handleSelect(pattern)}
                      className={cn(
                        "w-full transition-all duration-300",
                        isSelected
                          ? "btn-primary-gradient text-[#0a0a0a] font-bold shadow-glow-strong"
                          : "btn-secondary hover:bg-gradient-to-r hover:from-amber-600/20 hover:to-amber-500/20 hover:border-amber-500/50"
                      )}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Selected
                        </>
                      ) : (
                        <>
                          <Layers className="w-4 h-4 mr-2" />
                          Select Pattern
                        </>
                      )}
                    </Button>
                  </CardContent>

                  {/* Premium Gold Hover Overlay - Ancient Accent */}
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-amber-500/10",
                    "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                    "pointer-events-none"
                  )} />
                  {/* Ancient gold texture on hover */}
                  <div className={cn(
                    "absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300",
                    "pointer-events-none"
                  )} style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(245, 158, 11, 0.1) 4px, rgba(245, 158, 11, 0.1) 8px)'
                  }} />
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

