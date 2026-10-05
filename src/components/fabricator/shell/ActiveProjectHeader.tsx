import { NOT_RECORDED } from '@/lib/fabricator/studioWorkflow';
import { getManufacturingSaveChrome } from '@/lib/fabricator/manufacturingSaveChrome';
import { resolveSystemPackProfiles } from '@/lib/fabricator/engineering/resolveSystemPackProfiles';
import { loadCustomSystems } from '@/lib/fabricator/customSystemStorage';
import { isRTL } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { SystemPack, WindowUnit } from '@/types/fabricator';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { useWorkflowStore } from '@/store/workflowStore';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export interface ActiveProjectHeaderProps {
  project: WindowUnit | null;
  className?: string;
  /** Compact strip for narrow viewports */
  compact?: boolean;
}

function findPack(systemPackId: string | undefined): SystemPack | null {
  if (!systemPackId) return null;
  const fromCatalog = SYSTEM_PACKS.find((p) => p.meta.id === systemPackId);
  if (fromCatalog) return fromCatalog;
  const custom = loadCustomSystems().find((p) => p.meta.id === systemPackId);
  return custom ?? null;
}

function resolveMaterial(pack: SystemPack | null): string | null {
  if (!pack) return null;

  if (pack.category) {
    if (pack.category.startsWith('aluminum')) return 'aluminum';
    if (pack.category.startsWith('upvc')) return 'upvc';
    if (pack.category === 'curtain_walls') return 'aluminum';
  }

  const spec = pack.windowSystemSpec as Record<string, unknown> | undefined;
  if (typeof spec?.material === 'string' && spec.material.trim()) {
    return spec.material;
  }

  const profiles = resolveSystemPackProfiles(pack);
  const fromProfiles = profiles.find((p) => p.material)?.material;
  if (fromProfiles) return fromProfiles;

  if (Array.isArray(spec?.aluminum_profiles) && (spec.aluminum_profiles as unknown[]).length > 0) {
    return 'aluminum';
  }
  if (Array.isArray(spec?.upvc_profiles) && (spec.upvc_profiles as unknown[]).length > 0) {
    return 'upvc';
  }

  return null;
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
  compact = false,
}) => {
  const { t, i18n } = useTranslation('fabricator');
  const rtl = isRTL(i18n.language);
  const workflowIdentity = useWorkflowStore((s) => s.workflowIdentity);
  const draftDirty = useWorkflowStore((s) => s.workflowDraftDirty);

  const pack = useMemo(
    () => findPack(project?.systemPackId),
    [project?.systemPackId],
  );

  const material = project ? resolveMaterial(pack) : null;
  const saveChrome = getManufacturingSaveChrome({ draftDirty, workflowIdentity, project });

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
        data-compact={compact ? 'true' : 'false'}
      >
        <span>{t('industrial.no_active_project', 'No active project')}</span>
      </div>
    );
  }

  const projectCode = project.projectCode || project.orderNumber || project.id;
  const position = project.posNumber || project.positionCode || NOT_RECORDED;
  const systemName = pack?.meta.name || project.systemPackId || NOT_RECORDED;
  const revision = saveChrome.revisionLabel;

  if (compact) {
    const chips = [
      { label: 'Project', value: projectCode },
      { label: 'Pos', value: position },
      { label: 'System', value: systemName },
      { label: 'Material', value: material || NOT_RECORDED },
      { label: 'Status', value: project.status || NOT_RECORDED },
      { label: 'Rev', value: revision },
    ];

    return (
      <div
        className={cn(
          'flex items-center gap-2 min-w-0 overflow-x-auto scrollbar-thin scrollbar-thumb-amber-900/40 pb-0.5',
          className,
        )}
        data-testid="active-project-header"
        data-has-project="true"
        data-project-id={project.id}
        data-compact="true"
        dir={rtl ? 'rtl' : 'ltr'}
      >
        {chips.map((chip) => (
          <div
            key={chip.label}
            className="flex items-center gap-1.5 shrink-0 rounded border border-amber-600/25 bg-amber-500/5 px-2 py-1"
            title={`${chip.label}: ${chip.value}`}
          >
            <span className="text-[9px] uppercase tracking-wider text-amber-700/90 font-mono">
              {chip.label}
            </span>
            <span className="text-[11px] text-amber-100/90 font-mono max-w-[11rem] truncate">
              {chip.value}
            </span>
          </div>
        ))}
      </div>
    );
  }

  const cells = [
    {
      label: t('industrial.context.project', 'Project'),
      value: projectCode,
      ltr: true,
    },
    {
      label: t('industrial.context.pose', 'Position'),
      value: position,
      ltr: true,
    },
    {
      label: t('industrial.context.customer', 'Customer'),
      value: project.customer || project.positionMeta?.customer || NOT_RECORDED,
    },
    {
      label: t('industrial.context.system', 'System Pack'),
      value: systemName,
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
      value: revision,
      ltr: true,
    },
    {
      label: t('industrial.context.machine', 'Machine'),
      value: machineTarget || NOT_RECORDED,
      ltr: true,
    },
    {
      label: t('industrial.context.saved', 'Last saved'),
      value: saveChrome.tone === 'dirty' ? 'Unsaved draft' : saveChrome.savedAtLabel,
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
      data-compact="false"
    >
      {cells.map((c) => (
        <ContextCell key={c.label} label={c.label} value={c.value} ltr={c.ltr} />
      ))}
    </div>
  );
};
