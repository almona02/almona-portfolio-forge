import {
  STUDIO_WORKFLOW_STAGES,
  deriveStageVisualStatus,
  resolveStudioWorkflowHref,
  type StudioWorkflowEvidence,
} from '@/lib/fabricator/studioWorkflow';
import { isRTL } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useWorkflowStore } from '@/store/workflowStore';
import type { WindowUnit } from '@/types/fabricator';
import {
  Check,
  ClipboardList,
  Factory,
  Layers,
  Package,
  Paintbrush,
  Ruler,
  Truck,
  BadgeCheck,
  FolderKanban,
  Calculator,
} from 'lucide-react';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'react-router-dom';

const STAGE_ICONS: Record<string, React.ReactNode> = {
  project: <FolderKanban size={12} />,
  measure: <Ruler size={12} />,
  design: <Paintbrush size={12} />,
  quote: <Calculator size={12} />,
  bom: <ClipboardList size={12} />,
  stock: <Package size={12} />,
  optimize: <Layers size={12} />,
  production: <Factory size={12} />,
  qc: <BadgeCheck size={12} />,
  delivery: <Truck size={12} />,
};

function statusLabel(status: string): string {
  switch (status) {
    case 'complete':
      return 'Complete';
    case 'in_progress':
      return 'In progress';
    case 'blocked':
      return 'Blocked';
    case 'warning':
      return 'Warning';
    case 'not_recorded':
      return 'Not recorded';
    default:
      return 'Not started';
  }
}

/**
 * Canonical Studio workflow bar. Navigates only via fabricatorRoutes.
 * Status is derived from workflow store evidence — never invented.
 */
export const FabricatorWorkflowBar: React.FC = () => {
  const location = useLocation();
  const { projectId, poseId } = useParams<{ projectId?: string; poseId?: string }>();
  const { t, i18n } = useTranslation('fabricator');
  const rtl = isRTL(i18n.language);

  const currentProject = useWorkflowStore((s) => s.currentProject);
  const measurementData = useWorkflowStore((s) => s.measurementData);
  const designData = useWorkflowStore((s) => s.designData);
  const bom = useWorkflowStore((s) => s.bom);
  const quote = useWorkflowStore((s) => s.quote);
  const optimizationResult = useWorkflowStore((s) => s.optimizationResult);
  const productionDocuments = useWorkflowStore((s) => s.productionDocuments);
  const completedSteps = useWorkflowStore((s) => s.completedSteps);
  const activeStep = useWorkflowStore((s) => s.activeStep);

  const evidence: StudioWorkflowEvidence = useMemo(
    () => ({
      currentProject,
      measurementData,
      designData,
      bom,
      quote,
      optimizationResult,
      productionDocuments,
      completedSteps,
      activeStep,
    }),
    [
      currentProject,
      measurementData,
      designData,
      bom,
      quote,
      optimizationResult,
      productionDocuments,
      completedSteps,
      activeStep,
    ],
  );

  const ctx = {
    projectId:
      projectId ??
      (currentProject as (WindowUnit & { projectId?: string }) | null)?.projectId ??
      currentProject?.id,
    poseId: poseId ?? currentProject?.id,
  };

  return (
    <nav
      className={cn(
        'flex items-center gap-0 px-3 py-1.5 bg-[#0c0c0c] border-b border-amber-600/20 overflow-x-auto',
        'scrollbar-thin scrollbar-thumb-amber-900/50',
      )}
      aria-label={t('industrial.workflow_nav', 'Manufacturing workflow')}
      data-testid="fabricator-workflow-bar"
      dir={rtl ? 'rtl' : 'ltr'}
    >
      {STUDIO_WORKFLOW_STAGES.map((stage, i) => {
        const href = resolveStudioWorkflowHref(stage.id, ctx);
        const status = deriveStageVisualStatus(stage, location.pathname, evidence);
        const isActive = stage.isActive(location.pathname, evidence);
        const label = t(stage.labelKey, stage.shortLabel);

        return (
          <React.Fragment key={stage.id}>
            {i > 0 && (
              <div
                className={cn(
                  'w-4 h-px flex-shrink-0',
                  status === 'complete' || isActive ? 'bg-amber-500/50' : 'bg-slate-800',
                )}
                aria-hidden
              />
            )}
            <Link
              to={href}
              data-testid={`workflow-stage-${stage.id}`}
              data-status={status}
              data-canonical-href={href}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
                isActive &&
                  'bg-amber-500/15 text-amber-100 border border-amber-500/40',
                !isActive && status === 'complete' && 'text-amber-400/80 hover:bg-amber-500/5',
                !isActive && status === 'not_recorded' && 'text-slate-500 hover:text-slate-300',
                !isActive &&
                  status === 'not_started' &&
                  'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40',
              )}
              aria-current={isActive ? 'step' : undefined}
              title={`${label} — ${statusLabel(status)}`}
            >
              <span
                className={cn(
                  'w-4 h-4 rounded-full flex items-center justify-center border',
                  isActive && 'border-amber-400 text-amber-200',
                  !isActive && status === 'complete' && 'border-emerald-500/70 text-emerald-400',
                  !isActive && status !== 'complete' && 'border-slate-700 text-slate-500',
                )}
                aria-hidden
              >
                {status === 'complete' && !isActive ? (
                  <Check size={9} />
                ) : (
                  STAGE_ICONS[stage.id]
                )}
              </span>
              <span className="hidden md:inline">{label}</span>
              <span className="sr-only">{statusLabel(status)}</span>
            </Link>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
