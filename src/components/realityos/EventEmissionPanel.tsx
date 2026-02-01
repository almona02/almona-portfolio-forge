/**
 * Event Emission Panel Component
 * 
 * Displays event emission status and allows manual event emission.
 * Market leader-inspired UI with high precision.
 * 
 * @since Phase 3: Precision Upgrade Plan (January 2026)
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    realityOSEventEmitter,
    type EventEmissionResult,
    type EventRecord,
} from '@/lib/realityos';
import type { WindowUnit } from '@/types/fabricator';
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, Send, ShieldCheck } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface EventEmissionPanelProps {
  windowUnit: WindowUnit | null;
  operatorId?: string;
  onEventEmitted?: (event: EventRecord) => void;
  className?: string;
}

export const EventEmissionPanel: React.FC<EventEmissionPanelProps> = ({
  windowUnit,
  operatorId,
  onEventEmitted,
  className = '',
}) => {
  const [emissionStatus, setEmissionStatus] = useState<{
    lastEvent: EventRecord | null;
    lastResult: EventEmissionResult | null;
    loading: boolean;
    error: string | null;
  }>({
    lastEvent: null,
    lastResult: null,
    loading: false,
    error: null,
  });

  const emitFabricationIntent = useCallback(async () => {
    if (!windowUnit || !operatorId) {
      toast.error('Window unit and operator ID are required');
      return;
    }

    setEmissionStatus((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await realityOSEventEmitter.emitFabricationIntentCreated(
        windowUnit,
        operatorId
      );

      setEmissionStatus({
        lastEvent: result.event || null,
        lastResult: result,
        loading: false,
        error: result.error || null,
      });

      if (result.success && result.event) {
        toast.success('Fabrication Intent event emitted', {
          description: `Event ${result.event.entityId} recorded to RealityOS Event Ledger`,
        });
        if (onEventEmitted) {
          onEventEmitted(result.event);
        }
      } else if (result.faultEvent) {
        toast.error('FAULT event emitted', {
          description: result.error || 'Original event was missed. FAULT event emitted instead.',
        });
      } else {
        toast.error('Event emission failed', {
          description: result.error || 'Unknown error',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to emit event';
      setEmissionStatus((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      toast.error('Event emission error', {
        description: errorMessage,
      });
      console.error('Event emission error:', error);
    }
  }, [windowUnit, operatorId, onEventEmitted]);

  const getStatusBadge = () => {
    if (emissionStatus.loading) {
      return (
        <Badge variant="outline" className="border-amber-600/50 text-amber-400">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          EMITTING
        </Badge>
      );
    }

    if (emissionStatus.lastResult?.success) {
      if (emissionStatus.lastResult.faultEvent) {
        return (
          <Badge variant="outline" className="border-red-600/50 text-red-400">
            <AlertTriangle className="h-3 w-3 mr-1" />
            FAULT
          </Badge>
        );
      }
      return (
        <Badge variant="default" className="bg-green-600/20 text-green-400 border-green-600/50">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          EMITTED
        </Badge>
      );
    }

    if (emissionStatus.error) {
      return (
        <Badge variant="outline" className="border-red-600/50 text-red-400">
          <AlertCircle className="h-3 w-3 mr-1" />
          ERROR
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="border-amber-600/50 text-amber-400">
        PENDING
      </Badge>
    );
  };

  return (
    <TooltipProvider>
      <Card className={`card-glass-dark shadow-glow-strong ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg tracking-[0.02em] uppercase font-semibold text-amber-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              <span>RealityOS Event Emission</span>
            </div>
            {getStatusBadge()}
          </CardTitle>
          <CardDescription className="text-xs text-amber-600/80 font-medium">
            Emit events to RealityOS Event Ledger (append-only, immutable)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {emissionStatus.error && (
            <div className="flex items-center gap-2 text-sm text-red-400 p-3 rounded-lg bg-red-900/20 border border-red-700">
              <AlertCircle className="h-4 w-4" />
              <span>Error: {emissionStatus.error}</span>
            </div>
          )}

          {emissionStatus.lastResult?.faultEvent && (
            <div className="flex items-center gap-2 text-sm text-amber-400 p-3 rounded-lg bg-amber-900/20 border border-amber-700">
              <AlertTriangle className="h-4 w-4" />
              <div className="flex-1">
                <div className="font-semibold">FAULT Event Emitted</div>
                <div className="text-xs text-amber-600/70 mt-1">
                  {emissionStatus.lastResult.constitutionalNote}
                </div>
              </div>
            </div>
          )}

          {emissionStatus.lastEvent && (
            <div className="space-y-2 p-3 rounded-lg bg-amber-900/20 border border-amber-600/30">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="font-semibold text-amber-200">Last Event Emitted</span>
              </div>
              <div className="space-y-1 text-xs text-amber-600/70">
                <div className="flex items-center justify-between">
                  <span>Entity ID:</span>
                  <span className="font-mono">{emissionStatus.lastEvent.entityId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Chain Position:</span>
                  <span className="font-mono">{emissionStatus.lastEvent.chainPosition}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Event Type:</span>
                  <Badge variant="outline" className="text-xs border-amber-600/30 text-amber-400">
                    {emissionStatus.lastEvent.eventType}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Button
              onClick={emitFabricationIntent}
              disabled={!windowUnit || !operatorId || emissionStatus.loading}
              className="w-full h-9 text-xs bg-amber-700/30 hover:bg-amber-700/40 border-amber-600/50 text-amber-200"
            >
              {emissionStatus.loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Emitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Emit Fabrication Intent
                </>
              )}
            </Button>

            {(!windowUnit || !operatorId) && (
              <div className="text-xs text-amber-600/70 text-center">
                {!windowUnit && 'Window unit is required'}
                {!operatorId && 'Operator ID is required'}
              </div>
            )}
          </div>

          <div className="pt-2 border-t-2 border-amber-600/30">
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-2 text-xs text-amber-600/70 cursor-help">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Constitutional Guarantees</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs text-xs">
                  <p>
                    Events are emitted in real-time only. Retroactive emission is forbidden.
                    If an event is missed, a FAULT event is emitted instead (AICS-001 §7.4, RealityOS Principle 2).
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

