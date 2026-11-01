import {
  UNKNOWN_CODE,
  searchManifest,
  type AssemblyManifest,
  type AssemblyManifestEntry,
} from '@/lib/fabricator/assembly/assemblyManifest';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { PartViewMode } from './WindowPartInspector';

export interface AssemblyPartListProps {
  manifest: AssemblyManifest;
  /** Current selection: an assembly part-ref key or a manifest entry id. */
  selectedKey: string | null;
  /** Select by part ref when the record is drawn, otherwise by entry id. */
  onSelect: (key: string | null) => void;
  mode?: PartViewMode;
  className?: string;
}

const CATEGORY_LABEL: Record<AssemblyManifestEntry['category'], string> = {
  profile: 'Profiles',
  glass: 'Glass',
  hardware: 'Hardware',
  accessory: 'Accessories & seals',
  reinforcement: 'Corner keys & reinforcement',
  fastener: 'Fasteners',
};

const CATEGORY_ORDER: AssemblyManifestEntry['category'][] = ['profile', 'glass', 'hardware', 'reinforcement', 'accessory', 'fastener'];

export function selectionKeyForEntry(entry: AssemblyManifestEntry): string {
  return entry.modelling === 'mapped' && entry.partRefKey ? entry.partRefKey : entry.id;
}

function isSelected(entry: AssemblyManifestEntry, selectedKey: string | null): boolean {
  if (!selectedKey) return false;
  return entry.id === selectedKey || (entry.partRefKey !== null && entry.partRefKey === selectedKey);
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'warn' | 'muted' | 'bad' }) {
  const cls = tone === 'warn' ? 'border-amber-500/60 text-amber-200' : tone === 'bad' ? 'border-red-500/60 text-red-200' : 'border-slate-600 text-slate-400';
  return <span className={`rounded border px-1 py-px text-[10px] leading-tight ${cls}`}>{children}</span>;
}

/**
 * Searchable, keyboard-accessible list of every assembly record, synced with mesh selection.
 * Repeated pieces are distinct rows; unmodelled records and UNKNOWN codes are explicit.
 */
export const AssemblyPartList: React.FC<AssemblyPartListProps> = ({ manifest, selectedKey, onSelect, mode = 'manufacturing', className = '' }) => {
  const [query, setQuery] = useState('');
  const listId = useId();
  const listRef = useRef<HTMLUListElement | null>(null);
  const results = useMemo(() => searchManifest(manifest, query), [manifest, query]);
  const visualOnly = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? manifest.unmappedVisualParts.filter(part => part.name.toLowerCase().includes(needle)) : manifest.unmappedVisualParts;
  }, [manifest, query]);
  const grouped = useMemo(() => {
    const groups = new Map<AssemblyManifestEntry['category'], AssemblyManifestEntry[]>();
    for (const entry of results) {
      const list = groups.get(entry.category) ?? [];
      list.push(entry);
      groups.set(entry.category, list);
    }
    return CATEGORY_ORDER.filter(category => groups.has(category)).map(category => ({ category, entries: groups.get(category)! }));
  }, [results]);
  const selectedIndex = results.findIndex(entry => isSelected(entry, selectedKey));
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (selectedIndex >= 0) setActiveIndex(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    if (typeof active?.scrollIntoView === 'function') active.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, results]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!results.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex(i => Math.min(results.length - 1, i + 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(i => Math.max(0, i - 1)); }
    else if (event.key === 'Home') { event.preventDefault(); setActiveIndex(0); }
    else if (event.key === 'End') { event.preventDefault(); setActiveIndex(results.length - 1); }
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const entry = results[Math.min(activeIndex, results.length - 1)];
      if (entry) onSelect(selectionKeyForEntry(entry));
    } else if (event.key === 'Escape') { event.preventDefault(); onSelect(null); }
  };

  const activeEntry = results[Math.min(activeIndex, Math.max(0, results.length - 1))];
  const { summary } = manifest;

  return (
    <section aria-label="Part list" className={`flex h-full min-h-0 flex-col rounded-lg border border-slate-700 bg-slate-950/95 text-sm text-slate-100 shadow-lg ${className}`}>
      <div className="border-b border-slate-800 p-3">
        <label htmlFor={`${listId}-search`} className="sr-only">Search parts</label>
        <input
          id={`${listId}-search`}
          type="search"
          value={query}
          onChange={event => { setQuery(event.target.value); setActiveIndex(0); }}
          onKeyDown={handleKeyDown}
          placeholder="Search by name, code or cell…"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={activeEntry ? `${listId}-${activeEntry.id}` : undefined}
          aria-autocomplete="list"
          className="h-9 w-full rounded border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
        />
        <p className="mt-2 text-[11px] text-slate-400" aria-live="polite">
          {results.length} of {summary.total} parts
          {summary.unmodelled > 0 && ` · ${summary.unmodelled} not drawn`}
          {summary.unknownCodes > 0 && ` · ${summary.unknownCodes} without code`}
          {mode === 'manufacturing' && summary.bomAvailable && summary.bomMissing > 0 && ` · ${summary.bomMissing} not in BOM`}
          {mode === 'manufacturing' && !summary.bomAvailable && ' · BOM not generated'}
        </p>
      </div>
      <ul
        id={listId}
        ref={listRef}
        role="listbox"
        aria-label="Assembly parts"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="min-h-0 flex-1 overflow-y-auto p-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
      >
        {results.length === 0 && <li className="px-2 py-3 text-xs text-slate-400">No parts match “{query}”.</li>}
        {grouped.map(({ category, entries }) => (
          <li key={category} role="presentation">
            <div role="presentation" className="sticky top-0 bg-slate-950/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {CATEGORY_LABEL[category]} ({entries.length})
            </div>
            <ul role="group" aria-label={CATEGORY_LABEL[category]}>
              {entries.map(entry => {
                const index = results.indexOf(entry);
                const selected = isSelected(entry, selectedKey);
                const active = index === activeIndex;
                return (
                  <li
                    key={entry.id}
                    id={`${listId}-${entry.id}`}
                    role="option"
                    aria-selected={selected}
                    data-active={active ? 'true' : undefined}
                    data-entry-id={entry.id}
                    onClick={() => { setActiveIndex(index); onSelect(selectionKeyForEntry(entry)); }}
                    className={`cursor-pointer rounded px-2 py-1.5 ${selected ? 'bg-amber-500/20 text-amber-100' : active ? 'bg-slate-800' : 'hover:bg-slate-800/70'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{entry.name}</span>
                      <span className="flex shrink-0 gap-1">
                        {entry.modelling === 'unmodelled' && <Badge tone="muted">not drawn</Badge>}
                        {entry.catalogueCode === UNKNOWN_CODE && <Badge tone="warn">no code</Badge>}
                        {mode === 'manufacturing' && (entry.bom === 'missing_from_bom' || entry.bom === 'profile_mismatch') && <Badge tone="bad">BOM</Badge>}
                        {entry.source === 'system_pack' && <Badge tone="muted">system</Badge>}
                      </span>
                    </div>
                    <div className="truncate text-[11px] text-slate-400">
                      {entry.catalogueCode === UNKNOWN_CODE ? 'Code not assigned' : entry.catalogueCode}
                      {entry.material ? ` · ${entry.material}` : ''}
                      {mode === 'manufacturing' && entry.dimensions.designLengthMm != null ? ` · ${entry.dimensions.designLengthMm.toFixed(1)} mm` : ''}
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
        {visualOnly.length > 0 && (
          <li role="presentation">
            <div role="presentation" className="sticky top-0 bg-slate-950/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Visual only ({visualOnly.length})
            </div>
            <ul role="group" aria-label="Visual only parts">
              {visualOnly.map(part => (
                <li
                  key={part.partRefKey}
                  role="option"
                  aria-selected={selectedKey === part.partRefKey}
                  onClick={() => onSelect(part.partRefKey)}
                  className={`cursor-pointer rounded px-2 py-1.5 text-slate-400 ${selectedKey === part.partRefKey ? 'bg-amber-500/20 text-amber-100' : 'hover:bg-slate-800/70'}`}
                >
                  <span className="truncate">{part.name}</span>
                  <span className="ml-2"><Badge tone="muted">no record</Badge></span>
                </li>
              ))}
            </ul>
          </li>
        )}
      </ul>
    </section>
  );
};
