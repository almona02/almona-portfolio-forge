import { cn } from '@/lib/utils';
import {
  POSE_WORKFLOW_STAGES,
  getPoseWorkflowPathForStage,
  getPoseWorkflowStageFromPath,
  getPoseWorkflowStageIndex,
} from '@/lib/fabricator/workflow/workflowGraph';
import { useWorkflowStore } from '@/store/workflowStore';
import {
  Check,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Factory,
  Layers,
  Paintbrush,
  Ruler,
} from 'lucide-react';
import React, { useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

/**
 * WorkflowStepNavigator — Persistent horizontal stepper shown across all
 * pose-centric workflow routes. Inspired by Logikal's phase bar: users
 * always know where they are in the pipeline.
 */
export const WorkflowStepNavigator: React.FC = () => {
  const location = useLocation();
  const { projectId, poseId } = useParams<{ projectId: string; poseId: string }>();
  const { completedSteps } = useWorkflowStore();

  const activeIndex = useMemo(
    () => getPoseWorkflowStageIndex(getPoseWorkflowStageFromPath(location.pathname)),
    [location.pathname],
  );

  if (!projectId || !poseId) return null;

  const getStepIcon = (stepId: (typeof POSE_WORKFLOW_STAGES)[number]['id']) => {
    switch (stepId) {
      case 'design':
        return <Paintbrush size={14} />;
      case 'bom':
        return <ClipboardList size={14} />;
      case 'optimization':
        return <Layers size={14} />;
      case 'commercial':
        return <DollarSign size={14} />;
      case 'production':
        return <Factory size={14} />;
      case 'quality-control':
        return <CheckCircle2 size={14} />;
      default:
        return <Paintbrush size={14} />;
    }
  };

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

      {POSE_WORKFLOW_STAGES.map((step, i) => {
        const isActive = i === activeIndex;
        const isCompleted = completedSteps.has(step.id);
        const isPast = i < activeIndex;
        const href = getPoseWorkflowPathForStage(step.id, projectId, poseId);

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
                {isCompleted && !isActive ? <Check size={10} /> : getStepIcon(step.id)}
              </span>
              <span className="hidden sm:inline">{step.shortLabel}</span>
            </Link>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
