import { useActiveStudioProject } from '@/hooks/fabricator/useActiveStudioProject';
import { getManufacturingSaveChrome } from '@/lib/fabricator/manufacturingSaveChrome';
import { NOT_RECORDED } from '@/lib/fabricator/studioWorkflow';
import { isRTL } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useWorkflowStore } from '@/store/workflowStore';
import { Cable, Save, Ruler, Cpu, SlidersHorizontal } from 'lucide-react';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export const ManufacturingStatusBar: React.FC = () => {
  const { t, i18n } = useTranslation('fabricator');
  const rtl = isRTL(i18n.language);
  const project = useActiveStudioProject();
  const draftDirty = useWorkflowStore(s => s.workflowDraftDirty);
  const workflowIdentity = useWorkflowStore(s => s.workflowIdentity);

  const saveChrome = useMemo(
    () => getManufacturingSaveChrome({ draftDirty, workflowIdentity, project }),
    [draftDirty, workflowIdentity, project],
  );

  const cells = [
    {
      icon: <Cable size={11} />,
      label: t('industrial.status.browser_network', 'Browser network'),
      value: t('industrial.status.browser_only', 'Browser only'),
    },
    {
      icon: <Save size={11} />,
      label: t('industrial.status.save_status', 'Save status'),
      value: saveChrome.label,
    },
    {
      icon: <Ruler size={11} />,
      label: t('industrial.status.units', 'Units'),
      value: 'mm',
    },
    {
      icon: <SlidersHorizontal size={11} />,
      label: t('industrial.status.system', 'System'),
      value: project?.systemPackId || NOT_RECORDED,
      ltr: true,
    },
    {
      icon: <Cpu size={11} />,
      label: t('industrial.status.machine', 'Machine'),
      value: NOT_RECORDED,
    },
    {
      icon: <SlidersHorizontal size={11} />,
      label: t('industrial.status.mfg_profile', 'Mfg settings'),
      value: NOT_RECORDED,
      ltr: true,
    },
  ];

  return (
    <footer
      className={cn(
        'h-7 flex-shrink-0 border-t border-amber-600/20 bg-[#080808]',
        'flex items-center gap-3 sm:gap-4 px-2 sm:px-3 overflow-x-auto text-[10px] font-mono text-amber-700/90',
        'scrollbar-thin scrollbar-thumb-amber-900/40',
      )}
      data-testid="manufacturing-status-bar"
      dir={rtl ? 'rtl' : 'ltr'}
    >
      {cells.map((c, index) => (
        <div
          key={c.label}
          className={cn(
            'flex items-center gap-1.5 whitespace-nowrap',
            index >= 3 && 'hidden sm:flex',
          )}
        >
          <span className="text-amber-600/70" aria-hidden>
            {c.icon}
          </span>
          <span className="uppercase tracking-wider hidden md:inline">{c.label}</span>
          <span
            className="text-amber-200/80"
            dir={'ltr' in c && c.ltr ? 'ltr' : undefined}
            title={`${c.label}: ${c.value}`}
          >
            {c.value}
          </span>
        </div>
      ))}
    </footer>
  );
};
