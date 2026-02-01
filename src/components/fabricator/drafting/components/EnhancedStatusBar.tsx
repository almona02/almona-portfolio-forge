/**
 * Enhanced Status Bar Component
 * 
 * Gold-tier status bar with progress indicators, error messages, operation status,
 * and command history for the Drafting Workbench.
 * 
 * Constitutional: Deterministic status display, no ML/AI
 * Tier: 3 Protected Determinism
 */

import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Progress } from '@/shared/ui/ui/progress';
import { AlertCircle, CheckCircle2, Info, Loader2, X } from 'lucide-react';
import React, { useMemo } from 'react';
import { PerformanceMetrics } from './PerformanceMetrics';

export type OperationStatus = 'idle' | 'processing' | 'success' | 'error' | 'warning';

export interface StatusMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: number;
  dismissible?: boolean;
}

export interface OperationInfo {
  name: string;
  status: OperationStatus;
  progress?: number;
  message?: string;
}

interface EnhancedStatusBarProps {
  /** Current operation status */
  operationStatus?: OperationInfo;
  /** Status messages to display */
  messages?: StatusMessage[];
  /** Progress percentage (0-100) */
  progress?: number;
  /** Current tool name */
  currentTool?: string;
  /** Element count */
  elementCount?: number;
  /** Coordinate display */
  coordinates?: { x: number; y: number };
  /** Grid status */
  gridVisible?: boolean;
  /** Snap status */
  snapEnabled?: boolean;
  /** Zoom level (as percentage string, e.g., "100%" or "50%") */
  zoomLevel?: string;
  /** On message dismiss */
  onDismissMessage?: (messageId: string) => void;
  /** On help trigger */
  onHelp?: () => void;
  /** Class name */
  className?: string;
}

export const EnhancedStatusBar: React.FC<EnhancedStatusBarProps> = React.memo(({
  operationStatus,
  messages = [],
  progress,
  currentTool,
  elementCount,
  coordinates,
  gridVisible = true,
  snapEnabled = true,
  zoomLevel,
  onDismissMessage,
  onHelp,
  className = '',
}) => {
  // Validate and sanitize props
  const validatedProgress = progress !== undefined 
    ? (typeof progress === 'number' && isFinite(progress) 
        ? Math.max(0, Math.min(100, progress)) 
        : undefined)
    : undefined;
  
  const validatedElementCount = elementCount !== undefined 
    ? (typeof elementCount === 'number' && isFinite(elementCount) && elementCount >= 0
        ? Math.floor(elementCount)
        : 0)
    : undefined;
  
  const validatedCoordinates = coordinates && 
    typeof coordinates.x === 'number' && isFinite(coordinates.x) &&
    typeof coordinates.y === 'number' && isFinite(coordinates.y)
    ? { 
        x: Math.max(-1_000_000, Math.min(1_000_000, coordinates.x)),
        y: Math.max(-1_000_000, Math.min(1_000_000, coordinates.y))
      }
    : undefined;
  
  // Get latest message with validation
  const latestMessage = useMemo(() => {
    if (!Array.isArray(messages) || messages.length === 0) return null;
    
    // Filter valid messages
    const validMessages = messages.filter(msg => 
      msg && 
      typeof msg === 'object' &&
      typeof msg.id === 'string' &&
      typeof msg.type === 'string' &&
      ['info', 'success', 'warning', 'error'].includes(msg.type) &&
      typeof msg.message === 'string' &&
      typeof msg.timestamp === 'number' &&
      isFinite(msg.timestamp)
    );
    
    if (validMessages.length === 0) return null;
    return validMessages.sort((a, b) => b.timestamp - a.timestamp)[0];
  }, [messages]);

  // Get operation status icon and color
  const getOperationStatusDisplay = () => {
    if (!operationStatus) return null;

    const statusConfig = {
      idle: { icon: Info, color: 'text-slate-400', bg: 'bg-slate-800/50' },
      processing: { icon: Loader2, color: 'text-amber-400', bg: 'bg-amber-500/10' },
      success: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
      error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
      warning: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    };

    const config = statusConfig[operationStatus.status];
    const Icon = config.icon;

    return (
      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border border-amber-600/20 ${config.bg}`}>
        <Icon className={`h-2.5 w-2.5 ${config.color} ${operationStatus.status === 'processing' ? 'animate-spin' : ''}`} />
        <span className={`text-[10px] ${config.color} font-semibold`}>
          {operationStatus.name}
        </span>
        {operationStatus.message && (
          <span className="text-[9px] text-slate-400 font-normal">{operationStatus.message}</span>
        )}
        {operationStatus.progress !== undefined && (
          <div className="w-16">
            <Progress value={operationStatus.progress} className="h-0.5" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`h-6 border-t border-amber-600/30 bg-slate-950/95 backdrop-blur-sm flex items-center justify-between px-2 text-xs ${className}`}>
      {/* Left Section - Status & Messages */}
      <div className="flex items-center gap-2 flex-1 min-w-0" style={{ minHeight: '24px' }}>
        {/* Operation Status */}
        {getOperationStatusDisplay()}

        {/* Latest Message */}
        {latestMessage && !operationStatus && (
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
            latestMessage.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
            latestMessage.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
            latestMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            'bg-blue-500/10 text-blue-400 border border-blue-500/20'
          }`}>
            {latestMessage.type === 'error' && <AlertCircle className="h-2.5 w-2.5" />}
            {latestMessage.type === 'warning' && <AlertCircle className="h-2.5 w-2.5" />}
            {latestMessage.type === 'success' && <CheckCircle2 className="h-2.5 w-2.5" />}
            {latestMessage.type === 'info' && <Info className="h-2.5 w-2.5" />}
            <span className="truncate max-w-[150px] text-[10px]">{latestMessage.message}</span>
            {latestMessage.dismissible && onDismissMessage && (
              <Button
                variant="ghost"
                size="icon"
                className="h-3 w-3 ml-0.5 hover:bg-slate-700/50 transition-colors duration-150"
                onClick={() => onDismissMessage(latestMessage.id)}
              >
                <X className="h-2 w-2" />
              </Button>
            )}
          </div>
        )}

        {/* Progress Bar (if no operation status) */}
        {validatedProgress !== undefined && !operationStatus && (
          <div className="flex items-center gap-1">
            <Progress value={validatedProgress} className="w-24 h-1" />
            <span className="text-slate-400 text-[10px]">{Math.round(validatedProgress)}%</span>
          </div>
        )}
      </div>

      {/* Center Section - Tool & Element Info */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {currentTool && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 font-medium">Tool:</span>
            <Badge variant="outline" className="border-amber-600/30 text-amber-400 bg-amber-500/10 text-[10px] font-medium px-1.5 py-0.5">
              {currentTool}
            </Badge>
          </div>
        )}
        {validatedElementCount !== undefined && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 font-medium">Elements:</span>
            <span className="text-[10px] text-amber-300 font-semibold">{validatedElementCount}</span>
          </div>
        )}
      </div>

      {/* Right Section - Coordinates & Settings */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {validatedCoordinates && (
          <div className="flex items-center gap-1 font-mono text-[10px]">
            <span className="text-slate-500 font-medium">X:</span>
            <span className="text-amber-300 font-semibold">{validatedCoordinates.x.toFixed(2)}</span>
            <span className="text-slate-500 font-medium ml-1">Y:</span>
            <span className="text-amber-300 font-semibold">{validatedCoordinates.y.toFixed(2)}</span>
          </div>
        )}
        {zoomLevel && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 font-medium">Zoom:</span>
            <span className="text-[10px] text-amber-300 font-semibold font-mono">{zoomLevel}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Badge 
            variant="outline" 
            className={`text-[10px] font-medium px-1.5 py-0.5 ${gridVisible ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-slate-600/30 text-slate-500 bg-slate-800/50'}`}
          >
            Grid: {gridVisible ? 'ON' : 'OFF'}
          </Badge>
          <Badge 
            variant="outline" 
            className={`text-[10px] font-medium px-1.5 py-0.5 ${snapEnabled ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-slate-600/30 text-slate-500 bg-slate-800/50'}`}
          >
            Snap: {snapEnabled ? 'ON' : 'OFF'}
          </Badge>
        </div>
        <PerformanceMetrics elementCount={validatedElementCount} />
        {/* Help Trigger */}
        {onHelp && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onHelp}
            className="h-4 w-4 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors duration-200"
            aria-label="Open help panel (F1)"
            title="Help (F1)"
          >
            <Info className="h-2.5 w-2.5" />
          </Button>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo
  return (
    prevProps.operationStatus?.name === nextProps.operationStatus?.name &&
    prevProps.operationStatus?.status === nextProps.operationStatus?.status &&
    prevProps.operationStatus?.progress === nextProps.operationStatus?.progress &&
    prevProps.operationStatus?.message === nextProps.operationStatus?.message &&
    prevProps.messages?.length === nextProps.messages?.length &&
    prevProps.progress === nextProps.progress &&
    prevProps.currentTool === nextProps.currentTool &&
    prevProps.elementCount === nextProps.elementCount &&
    prevProps.coordinates?.x === nextProps.coordinates?.x &&
    prevProps.coordinates?.y === nextProps.coordinates?.y &&
    prevProps.gridVisible === nextProps.gridVisible &&
    prevProps.snapEnabled === nextProps.snapEnabled &&
    prevProps.zoomLevel === nextProps.zoomLevel &&
    prevProps.onHelp === nextProps.onHelp
  );
});

EnhancedStatusBar.displayName = 'EnhancedStatusBar';

export default EnhancedStatusBar;

