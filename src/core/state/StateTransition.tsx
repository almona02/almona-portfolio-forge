/**
 * State Transition Component
 * 
 * Gold-tier state transition UI component for displaying and managing state changes.
 * Provides visual state indicators, transition buttons, and validation feedback.
 * 
 * Features:
 * - Visual state display with prestige styling
 * - Available transition buttons
 * - Transition validation feedback
 * - State history display
 * - Activity logging integration
 * 
 * Usage:
 * ```tsx
 * <StateTransition
 *   machine={stateMachine}
 *   currentState={invoice.status}
 *   entityType="invoice"
 *   entityId={invoice.id}
 *   onTransition={handleTransition}
 * />
 * ```
 */

import React, { useMemo, useState } from 'react';
import { StateMachineEngine, type TransitionContext } from './StateMachine';
import { ActivityTimeline } from '@/core/activity/ActivityTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/ui/dialog';
import { Label } from '@/shared/ui/ui/label';
import { Textarea } from '@/shared/ui/ui/textarea';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  AlertCircle,
  History,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StateTransitionProps<TState extends string> {
  /** State machine engine instance */
  machine: StateMachineEngine<TState>;
  /** Current state */
  currentState: TState;
  /** Entity type */
  entityType: string;
  /** Entity ID */
  entityId: string;
  /** User ID (optional, will use auth context if not provided) */
  userId?: string;
  /** Callback when transition succeeds */
  onTransition?: (from: TState, to: TState) => void;
  /** Callback when transition fails */
  onError?: (error: Error) => void;
  /** Show state history */
  showHistory?: boolean;
  /** Show activity timeline */
  showActivityTimeline?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Compact mode */
  compact?: boolean;
}

/**
 * Get state badge styling
 */
const getStateBadge = (state: string) => {
  const stateColors: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
    draft: {
      bg: 'bg-slate-500/10',
      text: 'text-slate-300',
      border: 'border-slate-500/30',
      icon: <Clock className="w-3 h-3" />
    },
    submitted: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-300',
      border: 'border-blue-500/30',
      icon: <ArrowRight className="w-3 h-3" />
    },
    approved: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-300',
      border: 'border-emerald-500/30',
      icon: <CheckCircle2 className="w-3 h-3" />
    },
    locked: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-300',
      border: 'border-amber-500/30',
      icon: <AlertCircle className="w-3 h-3" />
    },
    executed: {
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-300',
      border: 'border-cyan-500/30',
      icon: <CheckCircle2 className="w-3 h-3" />
    },
    cancelled: {
      bg: 'bg-red-500/10',
      text: 'text-red-300',
      border: 'border-red-500/30',
      icon: <XCircle className="w-3 h-3" />
    },
    pending: {
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-300',
      border: 'border-yellow-500/30',
      icon: <Clock className="w-3 h-3" />
    },
    in_progress: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-300',
      border: 'border-blue-500/30',
      icon: <ArrowRight className="w-3 h-3" />
    },
    completed: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-300',
      border: 'border-emerald-500/30',
      icon: <CheckCircle2 className="w-3 h-3" />
    },
    blocked: {
      bg: 'bg-orange-500/10',
      text: 'text-orange-300',
      border: 'border-orange-500/30',
      icon: <AlertCircle className="w-3 h-3" />
    }
  };

  return stateColors[state] || {
    bg: 'bg-slate-500/10',
    text: 'text-slate-300',
    border: 'border-slate-500/30',
    icon: <Clock className="w-3 h-3" />
  };
};

/**
 * State Transition Component
 */
export function StateTransition<TState extends string>({
  machine,
  currentState,
  entityType,
  entityId,
  userId,
  onTransition,
  onError,
  showHistory = true,
  showActivityTimeline = false,
  className,
  compact = false,
}: StateTransitionProps<TState>) {
  const [transitionDialogOpen, setTransitionDialogOpen] = useState(false);
  const [selectedTargetState, setSelectedTargetState] = useState<TState | null>(null);
  const [transitionReason, setTransitionReason] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Get available transitions
  const availableTransitions = useMemo(() => {
    return machine.getAvailableTransitions();
  }, [machine]);

  // Get state badge
  const stateBadge = useMemo(() => {
    return getStateBadge(currentState);
  }, [currentState]);

  // Get state history
  const stateHistory = useMemo(() => {
    return machine.getHistory();
  }, [machine]);

  const handleTransitionClick = (targetState: TState) => {
    if (!machine.canTransition(targetState)) {
      toast.error(`Cannot transition from "${currentState}" to "${targetState}"`);
      return;
    }
    setSelectedTargetState(targetState);
    setTransitionDialogOpen(true);
  };

  const handleConfirmTransition = async () => {
    if (!selectedTargetState) return;

    setIsTransitioning(true);
    try {
      const context: TransitionContext = {
        entityType,
        entityId,
        userId,
        reason: transitionReason || undefined,
        metadata: {}
      };

      await machine.transition(selectedTargetState, context);
      
      toast.success(`State changed to "${selectedTargetState}"`);
      setTransitionDialogOpen(false);
      setTransitionReason('');
      setSelectedTargetState(null);
      
      onTransition?.(currentState, selectedTargetState);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transition failed';
      toast.error(errorMessage);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsTransitioning(false);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Current State Display */}
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardHeader className={cn(compact && 'pb-3')}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-amber-300/70">Current Status</CardTitle>
            <Badge
              variant="outline"
              className={cn(
                'flex items-center gap-1.5 text-xs',
                stateBadge.bg,
                stateBadge.text,
                stateBadge.border
              )}
            >
              {stateBadge.icon}
              <span className="capitalize">{currentState.replace('_', ' ')}</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className={cn(compact && 'pt-0')}>
          {/* Available Transitions */}
          {availableTransitions.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-xs text-amber-600/70">Available Actions</Label>
              <div className="flex flex-wrap gap-2">
                {availableTransitions.map((targetState) => {
                  const canTransition = machine.canTransition(targetState);
                  return (
                    <Button
                      key={targetState}
                      onClick={() => handleTransitionClick(targetState)}
                      disabled={!canTransition || isTransitioning}
                      size="sm"
                      variant="outline"
                      className={cn(
                        'text-xs border-amber-600/30 text-amber-300 hover:bg-amber-500/10',
                        !canTransition && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <ArrowRight className="w-3 h-3 mr-1" />
                      <span className="capitalize">{targetState.replace('_', ' ')}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-amber-600/50">
                No available transitions from this state
              </p>
            </div>
          )}

          {/* State History */}
          {showHistory && stateHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-amber-600/20">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-amber-600/70" />
                <Label className="text-xs text-amber-600/70">State History</Label>
              </div>
              <div className="space-y-2">
                {stateHistory.slice(0, 5).map((entry, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-xs text-amber-600/60"
                  >
                    <ChevronRight className="w-3 h-3" />
                    <span className="capitalize">{entry.from}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="capitalize">{entry.to}</span>
                    <span className="ml-auto text-[10px]">
                      {entry.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      {showActivityTimeline && (
        <ActivityTimeline
          entityType={entityType}
          entityId={entityId}
          limit={10}
          compact={true}
          showHeader={false}
        />
      )}

      {/* Transition Dialog */}
      <Dialog open={transitionDialogOpen} onOpenChange={setTransitionDialogOpen}>
        <DialogContent className="bg-[#0f0f0f] border-amber-600/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg text-amber-200">
              Confirm State Transition
            </DialogTitle>
            <DialogDescription className="text-sm text-amber-600/70">
              Change status from <span className="font-medium text-amber-300 capitalize">{currentState.replace('_', ' ')}</span> to <span className="font-medium text-amber-300 capitalize">{selectedTargetState?.replace('_', ' ')}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm text-amber-300">
                Reason (optional)
              </Label>
              <Textarea
                id="reason"
                value={transitionReason}
                onChange={(e) => setTransitionReason(e.target.value)}
                placeholder="Add a reason for this state change..."
                className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 placeholder:text-amber-600/50 min-h-[80px]"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setTransitionDialogOpen(false);
                  setTransitionReason('');
                  setSelectedTargetState(null);
                }}
                disabled={isTransitioning}
                className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmTransition}
                disabled={isTransitioning}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isTransitioning ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Transitioning...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirm Transition
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

