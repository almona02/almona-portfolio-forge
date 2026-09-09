import { NOT_RECORDED } from '@/lib/fabricator/studioWorkflow';
import { isRTL } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useWorkflowStore } from '@/store/workflowStore';
import { Cable, Save, Ruler, Cpu, SlidersHorizontal } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

export const ManufacturingStatusBar: React.FC = () => {
  const { t, i18n } = useTranslation('fabricator');
  const rtl = isRTL(i18n.language);
  const project = useWorkflowStore((s) => s.currentProject);

  const online =
    typeof navigator === 'undefined' ? true : navigator.onLine;

  const cells = [
    {
      icon: <Cable size={11} />,
      label: t('industrial.status.connection', 'Connection'),
      value: online
        ? t('industrial.status.online', 'Online')
        : t('industrial.status.offline', 'Offline'),
    },
    {
      icon: <Save size={11} />,
      label: t('industrial.status.autosave', 'Autosave'),
      value: project?.updatedAt
        ? t('industrial.status.saved', 'Saved')
        : NOT_RECORDED,
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
      value: 'platform-default',
      ltr: true,
    },
  ];

  return (
    <footer
      className={cn(
        'h-7 flex-shrink-0 border-t border-amber-600/20 bg-[#080808]',
        'flex items-center gap-4 px-3 overflow-x-auto text-[10px] font-mono text-amber-700/90',
      )}
      data-testid="manufacturing-status-bar"
      dir={rtl ? 'rtl' : 'ltr'}
    >
      {cells.map((c) => (
        <div key={c.label} className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-amber-600/70" aria-hidden>
            {c.icon}
          </span>
          <span className="uppercase tracking-wider">{c.label}</span>
          <span
            className="text-amber-200/80"
            dir={'ltr' in c && c.ltr ? 'ltr' : undefined}
          >
            {c.value}
          </span>
        </div>
      ))}
    </footer>
  );
};
