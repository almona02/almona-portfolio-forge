import ErrorBoundary from '@/components/ErrorBoundary';
import React, { memo, useMemo } from 'react';
import { WindowUnitStatus } from '@/types/fabricator';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { UNIFIED_STAGES, isUnifiedWorkflowEnabled, type UnifiedStageId } from './unifiedWorkflow/unifiedStages';

interface WorkflowProgressProps {
  currentStatus: WindowUnitStatus;
  /** Optional: Force unified mode (overrides feature flag) */
  unifiedMode?: boolean;
  /** Optional: Current unified stage ID (if in unified mode) */
  currentStageId?: UnifiedStageId;
}

// Legacy status flow (backward compatible)
const legacyStatusFlow: WindowUnitStatus[] = [
  'measuring',
  'design',
  'optimized',
  'production',
  'quality',
  'delivered',
];

/**
 * Map legacy status to unified stage
 */
function mapStatusToUnifiedStage(status: WindowUnitStatus): UnifiedStageId | null {
  const statusMap: Record<WindowUnitStatus, UnifiedStageId> = {
    'measuring': 'measure-design',
    'design': 'measure-design',
    'optimized': 'review-optimize',
    'production': 'production',
    'quality': 'quality-delivery',
    'delivered': 'quality-delivery',
  };
  return statusMap[status] || null;
}

const WorkflowProgressComponent: React.FC<WorkflowProgressProps> = ({ 
  currentStatus, 
  unifiedMode,
  currentStageId 
}) => {
  const useUnified = unifiedMode ?? isUnifiedWorkflowEnabled();
  
  // ✅ PERFORMANCE: Memoize active stage calculations
  const activeStageData = useMemo(() => {
    if (!useUnified) return null;
    const activeStageId = currentStageId || mapStatusToUnifiedStage(currentStatus) || 'measure-design';
    const activeStageIndex = UNIFIED_STAGES.findIndex(s => s.id === activeStageId);
    return { activeStageId, activeStageIndex };
  }, [useUnified, currentStageId, currentStatus]);
  
  if (useUnified) {
    // Unified 4-stage mode - Ultra-compact horizontal line
    const { activeStageIndex } = activeStageData!;
    
    return (
      <div className="sticky top-0 z-50 w-full h-2 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-amber-600/20 shadow-sm">
        <div className="relative h-full max-w-6xl mx-auto px-4">
          {/* Progress line background */}
          <div className="absolute top-1/2 left-4 right-4 h-0.5 -translate-y-1/2 bg-amber-600/10"></div>
          
          {/* Progress line fill */}
          <div 
            className="absolute top-1/2 left-4 h-0.5 -translate-y-1/2 bg-gradient-to-r from-emerald-500/60 via-amber-500/60 to-amber-600/40 transition-all duration-500"
            style={{ width: `${(activeStageIndex / (UNIFIED_STAGES.length - 1)) * 100}%` }}
          ></div>
          
          {/* Stage indicators */}
          <div className="relative h-full flex items-center justify-between px-4">
            {UNIFIED_STAGES.map((stage, index) => {
              const isCompleted = index < activeStageIndex;
              const isCurrent = index === activeStageIndex;
              
              return (
                <div
                  key={stage.id}
                  className={`relative z-10 w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-400 shadow-[0_0_4px_rgba(16,185,129,0.6)]'
                      : isCurrent
                      ? 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)] animate-pulse scale-125'
                      : 'bg-amber-600/40'
                  }`}
                  title={`${index + 1}. ${stage.name}`}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Legacy 6-stage mode (backward compatible)
  const currentIndex = legacyStatusFlow.indexOf(currentStatus);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-900/70 border border-gray-800 rounded-lg card-dark">
      {legacyStatusFlow.map((status, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const _isUpcoming = index > currentIndex;

        return (
          <div key={status} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`rounded-full p-1.5 ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isCurrent ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>
              <span
                className={`text-[10px] mt-1 capitalize ${
                  isCompleted || isCurrent ? 'text-white' : 'text-gray-500'
                }`}
              >
                {status}
              </span>
            </div>

            {index < legacyStatusFlow.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-2 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-700'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

WorkflowProgressComponent.displayName = 'WorkflowProgress';

// ✅ HARDENING: Memoize component for performance
const WorkflowProgressMemo = memo(WorkflowProgressComponent);

// ✅ HARDENING: Export with error boundary for production
export const WorkflowProgress: React.FC<WorkflowProgressProps> = (props) => (
  <ErrorBoundary level="component">
    <WorkflowProgressMemo {...props} />
  </ErrorBoundary>
);

WorkflowProgress.displayName = 'WorkflowProgress';

export default WorkflowProgress;


