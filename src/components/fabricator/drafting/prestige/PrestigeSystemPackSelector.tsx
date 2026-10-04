/**
 * System pack picker — compact, scroll-safe across phone / tablet / desktop.
 * AICS-001: rule-based catalog selection only (no ML in the pick path).
 */

import { PrestigePatternIcons } from '@/components/ui/PrestigePatternIcons';
import { getPatternsForSystem } from '@/data/egyptian-window-patterns';
import { SYSTEM_PACKS, type SystemPack } from '@/data/systemPacks';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';
import React, { useMemo } from 'react';

type PackLike = {
  meta: {
    id: string;
    name: string;
  };
};

interface PrestigeSystemPackSelectorProps {
  selectedSystemId?: string;
  onSelect: (systemId: string) => void;
  allowedSystemIds?: string[];
  /** Prefer passing the studio catalog (includes custom packs). */
  packs?: PackLike[];
  className?: string;
  showPatternCount?: boolean;
  /** vertical = capped grid scroll; horizontal = snap row (default on small screens via CSS) */
  layout?: 'auto' | 'vertical' | 'horizontal';
}

function patternIconForSystem(systemId: string) {
  const patterns = getPatternsForSystem(systemId);
  const primary = patterns[0];
  if (!primary) return PrestigePatternIcons.FixedWindow;

  const patternId = primary.id.toLowerCase();
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
}

export const PrestigeSystemPackSelector: React.FC<PrestigeSystemPackSelectorProps> = ({
  selectedSystemId,
  onSelect,
  allowedSystemIds,
  packs,
  className,
  showPatternCount = false,
  layout = 'auto',
}) => {
  const availablePacks = useMemo((): PackLike[] => {
    const source: PackLike[] = packs?.length
      ? packs
      : SYSTEM_PACKS.map((p: SystemPack) => ({ meta: { id: p.meta.id, name: p.meta.name } }));

    if (allowedSystemIds && allowedSystemIds.length > 0) {
      const allow = new Set(allowedSystemIds);
      return source.filter((p) => allow.has(p.meta.id));
    }
    return source;
  }, [allowedSystemIds, packs]);

  return (
    <div
      className={cn('w-full min-w-0', className)}
      role="listbox"
      aria-label="System packs"
      aria-orientation="horizontal"
    >
      {/* Phone: horizontal snap scroller. md+: wrapping grid with own vertical scroll cap. */}
      <div
        className={cn(
          'flex gap-2 pb-1 -mx-0.5 px-0.5',
          'overflow-x-auto overscroll-x-contain snap-x snap-mandatory',
          'scrollbar-thin scrollbar-thumb-amber-900/50 scrollbar-track-transparent',
          '[scrollbar-width:thin]',
          layout === 'vertical' && 'flex-col overflow-x-hidden overflow-y-auto max-h-[min(42vh,280px)] snap-none',
          layout === 'auto' && 'md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-2 md:overflow-x-visible md:overflow-y-auto md:max-h-[min(40vh,320px)] md:snap-none md:pb-0',
          layout === 'horizontal' && 'flex-nowrap',
        )}
      >
        {availablePacks.map((pack) => {
          const isSelected = selectedSystemId === pack.meta.id;
          const patterns = getPatternsForSystem(pack.meta.id);
          const PatternIcon = patternIconForSystem(pack.meta.id);

          return (
            <button
              key={pack.meta.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect(pack.meta.id)}
              className={cn(
                'relative shrink-0 snap-start rounded-lg border text-left transition-colors',
                'flex flex-col items-center justify-center gap-1',
                'w-[7.5rem] min-h-[5.5rem] px-2 py-2.5',
                'md:w-auto md:min-h-[5.75rem] md:px-2.5 md:py-3',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50',
                'active:scale-[0.98] touch-manipulation',
                isSelected
                  ? 'border-amber-500 bg-amber-500/15 ring-1 ring-amber-500/35'
                  : 'border-amber-600/30 bg-slate-950/60 hover:border-amber-500/50 hover:bg-amber-500/5',
              )}
            >
              {isSelected && (
                <span className="absolute top-1.5 right-1.5 text-amber-400" aria-hidden>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
              )}

              <PatternIcon size={36} className="md:hidden opacity-90" />
              <span className="hidden md:inline-flex">
                <PatternIcon size={44} />
              </span>

              <span
                className="w-full truncate text-center text-[11px] font-semibold text-amber-100/95 px-0.5"
                title={pack.meta.name}
              >
                {pack.meta.name}
              </span>

              {showPatternCount && (
                <span className="text-[10px] text-slate-500 tabular-nums">
                  {patterns.length} pattern{patterns.length === 1 ? '' : 's'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {availablePacks.length === 0 && (
        <p className="text-xs text-slate-500 py-4 text-center">No systems available for this project.</p>
      )}
    </div>
  );
};
