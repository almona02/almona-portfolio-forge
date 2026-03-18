/**
 * Prestige System Pack Selector
 * 
 * Dark Gold Prestige styling for system pack selection
 * Shows system details, compatibility, and recommendations
 * 
 * Constitutional: Rule-based, full audit trail
 * Tier: 3 Protected Determinism
 */

import { PrestigePatternIcons } from '@/components/ui/PrestigePatternIcons';
import { getPatternsForSystem } from '@/data/egyptian-window-patterns';
import { SYSTEM_PACKS, type SystemPack } from '@/data/systemPacks';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/shared/ui/ui/card';
import {
  CheckCircle2
} from 'lucide-react';
import React, { useMemo } from 'react';

interface PrestigeSystemPackSelectorProps {
  selectedSystemId?: string;
  onSelect: (systemId: string) => void;
  allowedSystemIds?: string[];
  className?: string;
  showPatternCount?: boolean;
}

export const PrestigeSystemPackSelector: React.FC<PrestigeSystemPackSelectorProps> = ({
  selectedSystemId,
  onSelect,
  allowedSystemIds,
  className,
  showPatternCount = false
}) => {
  const availablePacks = useMemo((): SystemPack[] => {
    if (allowedSystemIds && allowedSystemIds.length > 0) {
      return SYSTEM_PACKS.filter((p: SystemPack) => allowedSystemIds.includes(p.meta.id));
    }
    return SYSTEM_PACKS;
  }, [allowedSystemIds]);

  const getSystemTier = (pack: SystemPack): 'Local' | 'Standard' | 'Premium' | 'Enterprise' => {
    const name = String(pack.meta?.name ?? '').toLowerCase();
    if (name.includes('panda') || name.includes('rock') || name.includes('jumbo')) {
      return 'Premium';
    }
    if (name.includes('caluminium') || name.includes('ps')) {
      return 'Enterprise';
    }
    if (name.includes('upvc') || name.includes('economy')) {
      return 'Local';
    }
    return 'Standard';
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Local': return 'blue';
      case 'Standard': return 'emerald';
      case 'Premium': return 'amber';
      case 'Enterprise': return 'amber';
      default: return 'slate';
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {availablePacks.map((pack: SystemPack) => {
          const isSelected = selectedSystemId === pack.meta.id;
          const tier = getSystemTier(pack);
          const tierColor = getTierColor(tier);
          const patterns = getPatternsForSystem(pack.meta.id);
          // Get the first pattern or a default one
          const primaryPattern = patterns.length > 0 ? patterns[0] : null;

          // Get pattern icon component
          const getPatternIcon = () => {
            if (!primaryPattern) return PrestigePatternIcons.FixedWindow;
            
            const patternId = primaryPattern.id.toLowerCase();
            if (patternId.includes('sliding')) {
              if (patternId.includes('4')) return PrestigePatternIcons.Sliding4Sash;
              if (patternId.includes('3')) return PrestigePatternIcons.Sliding3SashCenterFixed;
              return PrestigePatternIcons.Sliding2Sash;
            }
            if (patternId.includes('casement')) {
              if (patternId.includes('panda')) return PrestigePatternIcons.PandaCasementScreen;
              return PrestigePatternIcons.CasementDouble;
            }
            if (patternId.includes('fixed')) return PrestigePatternIcons.FixedWindow;
            if (patternId.includes('tilt') && patternId.includes('turn')) return PrestigePatternIcons.TiltTurn;
            if (patternId.includes('tilt')) return PrestigePatternIcons.TiltWindow;
            if (patternId.includes('shish')) return PrestigePatternIcons.WindowWithShish;
            if (patternId.includes('panda')) return PrestigePatternIcons.PandaCasementScreen;
            if (patternId.includes('corner')) return PrestigePatternIcons.CornerWindow;
            if (patternId.includes('picture')) return PrestigePatternIcons.PictureWindow;
            if (patternId.includes('bi-fold') || patternId.includes('bifold')) return PrestigePatternIcons.BiFoldDoor;
            
            return PrestigePatternIcons.FixedWindow;
          };

          const PatternIcon = getPatternIcon();

          return (
            <Card
              key={pack.meta.id}
              className={cn(
                "relative overflow-hidden transition-all duration-300 group cursor-pointer",
                "hover:shadow-premium hover:-translate-y-1",
                "bg-gradient-to-br from-[#0a0a0a] via-amber-900/20 to-[#0a0a0a] border",
                isSelected
                  ? "border-2 border-amber-500/80 bg-gradient-to-br from-amber-500/20 via-amber-600/15 to-amber-500/20 shadow-glow-strong ring-2 ring-amber-500/40"
                  : "border-amber-600/40 hover:border-amber-500/60"
              )}
              onClick={() => onSelect(pack.meta.id)}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 z-10">
                  <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-full p-1 shadow-glow">
                    <CheckCircle2 className="w-4 h-4 text-slate-900" />
                  </div>
                </div>
              )}

              {/* Tier Color Indicator (no text) */}
              <div className="absolute top-2 left-2 z-10">
                <div className={cn(
                  "w-3 h-3 rounded-full shadow-md",
                  tierColor === 'blue' && "bg-blue-500",
                  tierColor === 'emerald' && "bg-emerald-500",
                  tierColor === 'amber' && "bg-amber-500",
                  tierColor === 'amber' && "bg-amber-500"
                )} />
              </div>

              <CardContent className="p-4 flex flex-col items-center justify-center min-h-[120px]">
                {/* Pattern Icon */}
                <div className="flex items-center justify-center mb-2">
                  <PatternIcon size={64} />
                </div>
                
                {/* System Name */}
                <div className="text-xs font-semibold text-amber-200/90 text-center mb-1 truncate w-full px-1">
                  {pack.meta.name}
                </div>
                
                {/* Pattern Count Display */}
                {showPatternCount && (
                  <div className="mt-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    <span className="text-[10px] font-medium text-amber-400">
                      {patterns.length} {patterns.length === 1 ? 'pattern' : 'patterns'}
                    </span>
                  </div>
                )}
              </CardContent>

              {/* Hover Overlay */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent",
                "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                "pointer-events-none"
              )} />
            </Card>
          );
        })}
      </div>
    </div>
  );
};

