import { NOT_RECORDED } from '@/lib/fabricator/studioWorkflow';
import { cn } from '@/lib/utils';
import type { WindowUnit, WindowUnitStatus } from '@/types/fabricator';
import { Plus, Search } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface ProjectPositionNavigatorProps {
  positions: WindowUnit[];
  activeId?: string;
  onSelect: (id: string) => void;
  onAdd?: () => void;
  className?: string;
}

const STATUS_LABEL: Record<WindowUnitStatus, string> = {
  measuring: 'Measuring',
  design: 'Design',
  optimized: 'Optimized',
  production: 'Production',
  quality: 'QC',
  delivered: 'Delivered',
};

export const ProjectPositionNavigator: React.FC<ProjectPositionNavigatorProps> = ({
  positions,
  activeId,
  onSelect,
  onAdd,
  className,
}) => {
  const { t } = useTranslation('fabricator');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return positions;
    return positions.filter((p) => {
      const hay = [p.posNumber, p.positionCode, p.projectCode, p.orderNumber, p.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [positions, query]);

  return (
    <div
      className={cn('h-full flex flex-col min-h-0 bg-[#0d0d0d]', className)}
      data-testid="project-position-navigator"
    >
      <div className="p-2 border-b border-amber-600/20 space-y-2">
        <label className="sr-only" htmlFor="pose-search">
          {t('industrial.positions.search', 'Search positions')}
        </label>
        <div className="relative">
          <Search
            size={12}
            className="absolute start-2 top-1/2 -translate-y-1/2 text-amber-700"
            aria-hidden
          />
          <input
            id="pose-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('industrial.positions.search', 'Search positions')}
            className="w-full bg-black/40 border border-amber-900/40 rounded ps-7 pe-2 py-1.5 text-xs text-amber-100 placeholder:text-amber-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
          />
        </div>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="w-full flex items-center justify-center gap-1 text-[11px] py-1.5 border border-amber-700/40 text-amber-300 hover:bg-amber-500/10 rounded"
          >
            <Plus size={12} aria-hidden />
            {t('industrial.positions.add', 'Add position')}
          </button>
        )}
      </div>
      <ul className="flex-1 overflow-y-auto" role="list">
        {filtered.length === 0 && (
          <li className="px-3 py-4 text-[11px] text-slate-500">
            {t('industrial.positions.empty', 'No positions recorded')}
          </li>
        )}
        {filtered.map((pos) => {
          const active = pos.id === activeId;
          return (
            <li key={pos.id}>
              <button
                type="button"
                onClick={() => onSelect(pos.id)}
                className={cn(
                  'w-full text-start px-3 py-2 border-b border-amber-900/20',
                  'hover:bg-amber-500/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400',
                  active && 'bg-amber-500/10 border-s-2 border-s-amber-400',
                )}
                aria-current={active ? 'true' : undefined}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-amber-100" dir="ltr">
                    {pos.posNumber || pos.id.slice(0, 8)}
                  </span>
                  <span
                    className="text-[10px] uppercase tracking-wide text-amber-500/80"
                    title={STATUS_LABEL[pos.status] ?? pos.status}
                  >
                    {STATUS_LABEL[pos.status] ?? pos.status}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono" dir="ltr">
                  {pos.overallWidth && pos.overallHeight
                    ? `${pos.overallWidth} × ${pos.overallHeight} mm`
                    : NOT_RECORDED}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
