import { NOT_RECORDED } from '@/lib/fabricator/studioWorkflow';
import { cn } from '@/lib/utils';
import type { WindowUnit } from '@/types/fabricator';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import React from 'react';
import { useTranslation } from 'react-i18next';

export type InspectorSelectionKind =
  | 'pose'
  | 'frame'
  | 'sash'
  | 'mullion'
  | 'glass'
  | 'bead'
  | 'hardware'
  | 'none';

export interface EngineeringInspectorProps {
  project: WindowUnit | null;
  selectionKind?: InspectorSelectionKind;
  className?: string;
}

const KIND_LABEL: Record<InspectorSelectionKind, string> = {
  pose: 'Position',
  frame: 'Frame',
  sash: 'Sash',
  mullion: 'Mullion',
  glass: 'Glass',
  bead: 'Glazing bead',
  hardware: 'Hardware',
  none: 'No selection',
};

function Row({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1 border-b border-amber-900/20">
      <span className="text-[10px] uppercase tracking-wider text-amber-700">{label}</span>
      <span className={cn('text-xs text-amber-100', ltr && 'font-mono')} dir={ltr ? 'ltr' : undefined}>
        {value}
      </span>
    </div>
  );
}

/**
 * Context-sensitive inspector. Displays existing pose / selection metadata.
 * Does not compute manufacturing lengths.
 */
export const EngineeringInspector: React.FC<EngineeringInspectorProps> = ({
  project,
  selectionKind = 'pose',
  className,
}) => {
  const { t } = useTranslation('fabricator');
  const pack = project?.systemPackId
    ? SYSTEM_PACKS.find((p) => p.meta.id === project.systemPackId)
    : null;

  const kind = !project ? 'none' : selectionKind;

  return (
    <aside
      className={cn('h-full overflow-y-auto bg-[#0d0d0d] p-3', className)}
      data-testid="engineering-inspector"
      data-selection={kind}
      aria-label={t('industrial.inspector.title', 'Properties')}
    >
      <h2 className="text-[10px] uppercase tracking-widest text-amber-500 mb-3">
        {t('industrial.inspector.title', 'Properties')} · {KIND_LABEL[kind]}
      </h2>

      {!project && (
        <p className="text-xs text-slate-500">{NOT_RECORDED}</p>
      )}

      {project && kind === 'pose' && (
        <div>
          <Row label="Position" value={project.posNumber || NOT_RECORDED} ltr />
          <Row
            label="Width"
            value={project.overallWidth ? `${project.overallWidth} mm` : NOT_RECORDED}
            ltr
          />
          <Row
            label="Height"
            value={project.overallHeight ? `${project.overallHeight} mm` : NOT_RECORDED}
            ltr
          />
          <Row label="Type" value={project.type || NOT_RECORDED} />
          <Row label="System" value={pack?.meta.name || project.systemPackId || NOT_RECORDED} ltr />
          <Row label="Color" value={project.color || NOT_RECORDED} ltr />
          <Row
            label="Opening"
            value={
              project.grid?.cells?.[0]?.type
                ? String(project.grid.cells[0].type)
                : NOT_RECORDED
            }
          />
          <Row
            label="Hardware"
            value={
              project.hardware?.length
                ? `${project.hardware.length} item(s)`
                : NOT_RECORDED
            }
          />
        </div>
      )}

      {project && kind !== 'pose' && kind !== 'none' && (
        <div>
          <p className="text-xs text-amber-200 mb-2">{KIND_LABEL[kind]}</p>
          <Row label="Linked position" value={project.posNumber || NOT_RECORDED} ltr />
          <Row
            label="Detail"
            value={t(
              'industrial.inspector.selection_from_canvas',
              'Selection metadata is shown from the active canvas when available.',
            )}
          />
        </div>
      )}
    </aside>
  );
};
