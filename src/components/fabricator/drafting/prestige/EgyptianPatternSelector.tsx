/**
 * Pattern picker for daily measuring — clear selection, compact scroll, shop language.
 * AICS-001: rule-based catalog only (no ML in the pick path).
 */

import { PrestigePatternIcons } from '@/components/ui/PrestigePatternIcons';
import {
  EGYPTIAN_PATTERNS,
  getPatternsForSystem,
  patternGridSpecToWindowGrid,
  type EgyptianPattern,
} from '@/data/egyptian-window-patterns';
import { cn } from '@/lib/utils';
import type { WindowGrid } from '@/types/fabricator';
import { CheckCircle2, Grid3x3, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { logDraftingAction } from '../utils/constitutionalAudit';

type PatternFilter = 'all' | 'sliding' | 'casement' | 'fixed' | 'door' | 'other';

interface EgyptianPatternSelectorProps {
  selectedPatternId?: string;
  onSelect: (patternId: string, grid: WindowGrid) => void;
  /** Clear pattern selection (keeps current grid unless parent resets it). */
  onClear?: () => void;
  currentSystemId?: string;
  /** @deprecated Details panel removed for daily UX; ignored. */
  defaultShowDetails?: boolean;
  className?: string;
}

function shortName(pattern: EgyptianPattern): string {
  const name = pattern.name.replace(/^Egyptian\s+/i, '').trim();
  return name.length > 28 ? `${name.slice(0, 26)}…` : name;
}

function patternFilter(pattern: EgyptianPattern): PatternFilter {
  const type = (pattern.type || '').toLowerCase();
  const id = pattern.id.toLowerCase();
  if (type.includes('sliding') || id.includes('sliding')) return 'sliding';
  if (type.includes('casement') || type.includes('tilt') || id.includes('casement') || id.includes('tilt')) {
    return 'casement';
  }
  if (type.includes('door') || id.includes('door')) return 'door';
  if (type.includes('fixed') || id.includes('fixed')) return 'fixed';
  return 'other';
}

function resolveIcon(pattern: EgyptianPattern): React.ComponentType<{ className?: string; size?: number }> {
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

  const key = iconMap[pattern.id];
  if (key && PrestigePatternIcons[key]) return PrestigePatternIcons[key];

  const filter = patternFilter(pattern);
  if (filter === 'sliding') return PrestigePatternIcons.Sliding2Sash;
  if (filter === 'casement') return PrestigePatternIcons.CasementDouble;
  if (filter === 'door') return PrestigePatternIcons.FrenchDoor;
  return PrestigePatternIcons.FixedWindow;
}

const FILTERS: { id: PatternFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'sliding', label: 'Sliding' },
  { id: 'casement', label: 'Casement' },
  { id: 'fixed', label: 'Fixed' },
  { id: 'door', label: 'Door' },
];

export const EgyptianPatternSelector: React.FC<EgyptianPatternSelectorProps> = ({
  selectedPatternId,
  onSelect,
  onClear,
  currentSystemId,
  className,
}) => {
  const [filter, setFilter] = useState<PatternFilter>('all');

  const availablePatterns = useMemo(() => {
    if (currentSystemId) return getPatternsForSystem(currentSystemId);
    return EGYPTIAN_PATTERNS;
  }, [currentSystemId]);

  const counts = useMemo(() => {
    const next: Record<PatternFilter, number> = {
      all: availablePatterns.length,
      sliding: 0,
      casement: 0,
      fixed: 0,
      door: 0,
      other: 0,
    };
    for (const p of availablePatterns) next[patternFilter(p)] += 1;
    return next;
  }, [availablePatterns]);

  const filteredPatterns = useMemo(() => {
    if (filter === 'all') return availablePatterns;
    return availablePatterns.filter((p) => patternFilter(p) === filter);
  }, [availablePatterns, filter]);

  const selected = useMemo(
    () => availablePatterns.find((p) => p.id === selectedPatternId) ?? null,
    [availablePatterns, selectedPatternId],
  );

  const handleSelect = (pattern: EgyptianPattern) => {
    const grid = patternGridSpecToWindowGrid(pattern.gridSpec);
    logDraftingAction(
      'egyptian_pattern_selected',
      {
        patternId: pattern.id,
        patternName: pattern.name,
        systemId: currentSystemId,
        gridSpec: pattern.gridSpec,
      },
      { patternId: pattern.id, grid },
      `CHECKPOINT-EGYPTIAN-PATTERN-${Date.now()}`,
    );
    onSelect(pattern.id, grid);
  };

  const visibleFilters = FILTERS.filter((f) => f.id === 'all' || counts[f.id] > 0);

  return (
    <div className={cn('w-full min-w-0 space-y-2.5', className)} role="group" aria-label="Opening patterns">
      {/* Selected summary — always visible for daily confirmation */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border px-2.5 py-2',
          selected
            ? 'border-amber-500/50 bg-amber-500/10'
            : 'border-amber-600/20 bg-slate-950/50',
        )}
      >
        <Grid3x3 className="h-4 w-4 text-amber-500 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Pattern</p>
          <p className="text-sm font-medium text-amber-100 truncate">
            {selected ? shortName(selected) : 'None — pick a layout below'}
          </p>
          {selected && (
            <p className="font-mono text-[11px] text-slate-500 tabular-nums">
              {selected.gridSpec.cols}×{selected.gridSpec.rows} panes
            </p>
          )}
        </div>
        {selected && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 shrink-0 rounded-md border border-amber-600/30 px-2 py-1 text-[11px] text-amber-200/90 hover:bg-amber-500/10"
            aria-label="Clear pattern selection"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Type filters */}
      <div
        className="flex gap-1 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:thin]"
        role="tablist"
        aria-label="Pattern type"
      >
        {visibleFilters.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.id)}
              className={cn(
                'shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium border transition-colors touch-manipulation',
                active
                  ? 'border-amber-500/60 bg-amber-500/20 text-amber-100'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/80',
              )}
            >
              {f.label}
              <span className="ml-1 tabular-nums opacity-70">{counts[f.id]}</span>
            </button>
          );
        })}
      </div>

      {/* Pattern chips — swipe on phone, capped wrap scroll on desktop */}
      <div
        className={cn(
          'flex gap-2 -mx-0.5 px-0.5 pb-1',
          'overflow-x-auto overscroll-x-contain snap-x snap-mandatory',
          '[scrollbar-width:thin]',
          'md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-2 md:overflow-x-visible md:overflow-y-auto md:max-h-[min(36vh,280px)] md:snap-none md:pb-0',
        )}
        role="listbox"
        aria-label="Available patterns"
      >
        {filteredPatterns.map((pattern) => {
          const isSelected = selectedPatternId === pattern.id;
          const Icon = resolveIcon(pattern);
          const cols = pattern.gridSpec.cols;
          const rows = pattern.gridSpec.rows;

          return (
            <button
              key={pattern.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => handleSelect(pattern)}
              className={cn(
                'relative shrink-0 snap-start rounded-lg border text-left transition-colors',
                'flex flex-col items-center justify-center gap-1',
                'w-[7.25rem] min-h-[5.75rem] px-2 py-2',
                'md:w-auto md:min-h-[6rem]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50',
                'active:scale-[0.98] touch-manipulation',
                isSelected
                  ? 'border-amber-500 bg-amber-500/20 ring-1 ring-amber-500/40'
                  : 'border-amber-600/30 bg-slate-950/70 hover:border-amber-500/50 hover:bg-amber-500/5',
              )}
            >
              {isSelected && (
                <span className="absolute top-1.5 right-1.5 text-amber-400" aria-hidden>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
              )}

              <span className="absolute top-1.5 left-1.5 rounded bg-slate-900/80 px-1 py-px font-mono text-[9px] text-amber-300/90 tabular-nums border border-amber-600/25">
                {cols}×{rows}
              </span>

              <Icon size={34} className="mt-3 text-amber-400/90 md:hidden" />
              <span className="mt-3 hidden md:inline-flex">
                <Icon size={40} className="text-amber-400/90" />
              </span>

              <span className="w-full truncate text-center text-[11px] font-semibold text-amber-100/95 px-0.5" title={pattern.name}>
                {shortName(pattern)}
              </span>

              <span
                className={cn(
                  'text-[10px] font-medium',
                  isSelected ? 'text-amber-300' : 'text-slate-500',
                )}
              >
                {isSelected ? 'Selected' : 'Use'}
              </span>
            </button>
          );
        })}
      </div>

      {filteredPatterns.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-3">No patterns in this filter for the current system.</p>
      )}
    </div>
  );
};
