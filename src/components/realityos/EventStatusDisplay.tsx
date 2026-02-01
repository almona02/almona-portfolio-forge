/**
 * Event Status Display Component
 * 
 * Displays RealityOS event status and verification information.
 * Market leader-inspired UI with high precision.
 * 
 * @since Phase 3: Precision Upgrade Plan (January 2026)
 */

import React from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Clock, AlertTriangle, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { EventRecord, CoreEventType } from '@/lib/realityos';

interface EventStatusDisplayProps {
  event: EventRecord;
  className?: string;
}

export const EventStatusDisplay: React.FC<EventStatusDisplayProps> = ({
  event,
  className = '',
}) => {
  const getEventTypeIcon = (eventType: CoreEventType) => {
    switch (eventType) {
      case 'ON':
        return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case 'OFF':
        return <XCircle className="h-5 w-5 text-red-400" />;
      case 'FAULT':
        return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case 'INSPECTION':
        return <Clock className="h-5 w-5 text-amber-400" />;
      case 'VERIFICATION':
        return <ShieldCheck className="h-5 w-5 text-green-400" />;
      default:
        return <Clock className="h-5 w-5 text-amber-400" />;
    }
  };

  const getEventTypeBadge = (eventType: CoreEventType) => {
    switch (eventType) {
      case 'ON':
        return <Badge variant="default" className="bg-green-600/20 text-green-400 border-green-600/50">ON</Badge>;
      case 'OFF':
        return <Badge variant="outline" className="border-red-600/50 text-red-400">OFF</Badge>;
      case 'FAULT':
        return <Badge variant="outline" className="border-red-600/50 text-red-400">FAULT</Badge>;
      case 'INSPECTION':
        return <Badge variant="outline" className="border-amber-600/50 text-amber-400">INSPECTION</Badge>;
      case 'VERIFICATION':
        return <Badge variant="default" className="bg-green-600/20 text-green-400 border-green-600/50">VERIFICATION</Badge>;
      default:
        return <Badge variant="outline">UNKNOWN</Badge>;
    }
  };

  return (
    <TooltipProvider>
      <Card className={`card-glass-dark shadow-glow-strong ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg tracking-[0.02em] uppercase font-semibold text-amber-200">
            <div className="flex items-center gap-2">
              {getEventTypeIcon(event.eventType)}
              <span>RealityOS Event</span>
            </div>
            {getEventTypeBadge(event.eventType)}
          </CardTitle>
          <CardDescription className="text-xs text-amber-600/80 font-medium">
            Immutable, append-only event record
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Event Information */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-amber-300">Entity ID:</span>
              <span className="font-mono text-amber-200">{event.entityId}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-amber-300">Vertical:</span>
              <Badge variant="outline" className="text-xs border-amber-600/30 text-amber-400">
                {event.verticalId}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-amber-300">Chain Position:</span>
              <span className="font-mono text-amber-200">{event.chainPosition}</span>
            </div>
          </div>

          {/* Proof Information */}
          <div className="space-y-2 pt-2 border-t-2 border-amber-600/30">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-200">Human Verification</span>
            </div>
            <div className="space-y-1 text-xs text-amber-600/70">
              <div className="flex items-center justify-between">
                <span>Verified By:</span>
                <span className="font-mono">{event.proof.verifiedBy}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Timestamp:</span>
                <span className="font-mono">
                  {new Date(event.proof.timestamp).toLocaleString()}
                </span>
              </div>
              {event.proof.location && (
                <div className="flex items-center justify-between">
                  <span>Location:</span>
                  <span className="font-mono">
                    {event.proof.location.latitude.toFixed(6)}, {event.proof.location.longitude.toFixed(6)}
                  </span>
                </div>
              )}
              {event.proof.qrData && (
                <div className="flex items-center justify-between">
                  <span>QR Code:</span>
                  <span className="font-mono text-xs truncate max-w-[200px]">{event.proof.qrData}</span>
                </div>
              )}
              {event.proof.photoHashes && event.proof.photoHashes.length > 0 && (
                <div className="flex items-center justify-between">
                  <span>Photos:</span>
                  <span className="font-mono text-xs">{event.proof.photoHashes.length}</span>
                </div>
              )}
            </div>
          </div>

          {/* Chain Information */}
          <div className="space-y-2 pt-2 border-t-2 border-amber-600/30">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-200">Cryptographic Chain</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-amber-600/70">Event Hash:</span>
                <span className="font-mono text-xs text-amber-200 truncate max-w-[200px]">
                  {event.eventHash}
                </span>
              </div>
              {event.prevHash && (
                <div className="flex items-center justify-between">
                  <span className="text-amber-600/70">Previous Hash:</span>
                  <span className="font-mono text-xs text-amber-200 truncate max-w-[200px]">
                    {event.prevHash}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-amber-600/70">Recorded At:</span>
                <span className="font-mono text-xs">
                  {new Date(event.recordedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Constitutional Note */}
          <div className="pt-2 border-t-2 border-amber-600/30">
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-2 text-xs text-amber-600/70 cursor-help">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Append-Only Truth</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs text-xs">
                  <p>
                    This event is immutable and append-only. It cannot be modified or deleted.
                    Events form a cryptographic chain for audit integrity (AICS-001 §7.4, RealityOS Principle 2).
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

