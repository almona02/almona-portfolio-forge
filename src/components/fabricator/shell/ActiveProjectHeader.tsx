import { NOT_RECORDED } from '@/lib/fabricator/studioWorkflow';
import { isRTL } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { WindowUnit } from '@/types/fabricator';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export interface ActiveProjectHeaderProps {
  project: WindowUnit | null;
  className?: string;
}

function formatWhen(value: Date | string | undefined): string {
  if (!value) return NOT_RECORDED;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return NOT_RECORDED;
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

function ContextCell({
  label,
  value,
  ltr,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="min-w-0 flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-amber-700/80 font-mono">
        {label}
      </span>
      <span
        className={cn(
          'text-xs text-amber-100/90 truncate',
          ltr && 'font-mono',
        )}
        dir={ltr ? 'ltr' : undefined}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

export const ActiveProjectHeader: React.FC<ActiveProjectHeaderProps> = ({
  project,
  className,
}) => {
  const { t, i18n } = useTranslation('fabricator');
  const rtl = isRTL(i18n.language);

  const pack = useMemo(() => {
    if (!project?.systemPackId) return null;
    return SYSTEM_PACKS.find((p) => p.meta.id === project.systemPackId) ?? null;
  }, [project?.systemPackId]);

  const material = pack?.category
    ?? (typeof pack?.windowSystemSpec?.material === 'string'
      ? String(pack.windowSystemSpec.material)
      : null);

  const machineTarget =
    (project as WindowUnit & { machineTarget?: string })?.machineTarget ??
    (project as WindowUnit & { targetMachine?: string })?.targetMachine;

  if (!project) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 min-w-0 text-xs text-amber-600/70',
          className,
        )}
        data-testid="active-project-header"
        data-has-project="false"
      >
        <span>{t('industrial.no_active_project', 'No active project')}</span>
      </div>
    );
  }

  const cells = [
    {
      label: t('industrial.context.project', 'Project'),
      value: project.projectCode || project.orderNumber || project.id,
      ltr: true,
    },
    {
      label: t('industrial.context.pose', 'Position'),
      value: project.posNumber || project.positionCode || NOT_RECORDED,
      ltr: true,
    },
    {
      label: t('industrial.context.customer', 'Customer'),
      value: project.customer || project.positionMeta?.customer || NOT_RECORDED,
    },
    {
      label: t('industrial.context.system', 'System Pack'),
      value: pack?.meta.name || project.systemPackId || NOT_RECORDED,
      ltr: true,
    },
    {
      label: t('industrial.context.material', 'Material'),
      value: material || NOT_RECORDED,
    },
    {
      label: t('industrial.context.status', 'Status'),
      value: project.status || NOT_RECORDED,
    },
    {
      label: t('industrial.context.revision', 'Revision'),
      value: NOT_RECORDED,
    },
    {
      label: t('industrial.context.machine', 'Machine'),
      value: machineTarget || NOT_RECORDED,
      ltr: true,
    },
    {
      label: t('industrial.context.saved', 'Last saved'),
      value: formatWhen(project.updatedAt),
      ltr: true,
    },
  ];

  return (
    <div
      className={cn(
        'grid grid-cols-3 xl:grid-cols-9 gap-x-4 gap-y-2 min-w-0',
        rtl && 'text-start',
        className,
      )}
      data-testid="active-project-header"
      data-has-project="true"
      data-project-id={project.id}
    >
      {cells.map((c) => (
        <ContextCell key={c.label} label={c.label} value={c.value} ltr={c.ltr} />
      ))}
    </div>
  );
};
