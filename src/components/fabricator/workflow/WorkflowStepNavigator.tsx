import { cn } from '@/lib/utils';
import { useWorkflowStore } from '@/store/workflowStore';
import {
  Check,
  ClipboardList,
  DollarSign,
  Factory,
  Layers,
  Paintbrush,
  Ruler,
} from 'lucide-react';
import React, { useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

interface StepDef {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  pathSuffix: string;
}

const STEPS: StepDef[] = [
  { id: 'design', label: 'Design', shortLabel: 'Design', icon: <Paintbrush size={14} />, pathSuffix: 'design' },
  { id: 'bom', label: 'Bill of Materials', shortLabel: 'BOM', icon: <ClipboardList size={14} />, pathSuffix: 'bom' },
  { id: 'optimization', label: 'Optimization', shortLabel: 'Optimize', icon: <Layers size={14} />, pathSuffix: 'optimization' },
  { id: 'commercial', label: 'Commercial', shortLabel: 'Quote', icon: <DollarSign size={14} />, pathSuffix: 'commercial' },
  { id: 'production', label: 'Production', shortLabel: 'Production', icon: <Factory size={14} />, pathSuffix: 'production' },
];

/**
 * WorkflowStepNavigator — Persistent horizontal stepper shown across all
 * pose-centric workflow routes. Inspired by Logikal's phase bar: users
 * always know where they are in the pipeline.
 */
export const WorkflowStepNavigator: React.FC = () => {
  const location = useLocation();
  const { projectId, poseId } = useParams<{ projectId: string; poseId: string }>();
  const { completedSteps } = useWorkflowStore();

  const basePath = useMemo(
    () =>
      projectId && poseId
        ? `/fabricator/studio/projects/${projectId}/positions/${poseId}`
        : null,
    [projectId, poseId],
  );

  if (!basePath) return null;

  const activeIndex = STEPS.findIndex((s) =>
    location.pathname.endsWith(`/${s.pathSuffix}`),
  );

  return (
    <nav
      className="flex items-center gap-0 px-4 py-2 bg-[#0c0c0c] border-b border-amber-600/20 overflow-x-auto"
      aria-label="Workflow steps"
    >
      <div className="flex items-center gap-1 mr-3">
        <Ruler size={12} className="text-amber-600/60" />
        <span className="text-[10px] font-mono text-amber-600/60 uppercase tracking-widest whitespace-nowrap">
          Pipeline
        </span>
      </div>

      {STEPS.map((step, i) => {
        const isActive = i === activeIndex;
        const isCompleted = completedSteps.has(step.id);
        const isPast = i < activeIndex;
        const href = `${basePath}/${step.pathSuffix}`;

        return (
          <React.Fragment key={step.id}>
            {i > 0 && (
              <div
                className={cn(
                  'w-6 h-px flex-shrink-0',
                  isPast || isActive ? 'bg-amber-500/60' : 'bg-slate-700/40',
                )}
              />
            )}
            <Link
              to={href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                isActive &&
                  'bg-amber-500/15 text-amber-200 border border-amber-500/40 shadow-sm shadow-amber-500/10',
                !isActive && isPast && 'text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/5',
                !isActive && !isPast && 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30',
              )}
              aria-current={isActive ? 'step' : undefined}
            >
              <span
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold border',
                  isActive && 'border-amber-400 bg-amber-500/20 text-amber-300',
                  !isActive && isCompleted && 'border-green-500/60 bg-green-500/10 text-green-400',
                  !isActive && !isCompleted && isPast && 'border-amber-600/40 text-amber-600/60',
                  !isActive && !isCompleted && !isPast && 'border-slate-700 text-slate-600',
                )}
              >
                {isCompleted && !isActive ? <Check size={10} /> : step.icon}
              </span>
              <span className="hidden sm:inline">{step.shortLabel}</span>
            </Link>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
