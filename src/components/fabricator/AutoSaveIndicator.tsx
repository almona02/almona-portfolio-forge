import React from 'react';
import { CheckCircle2, Loader2, AlertCircle, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AutoSaveIndicatorProps {
  isSaving: boolean;
  lastSaved: string | null;
  hasUnsavedChanges: boolean;
  onManualSave?: () => void;
  className?: string;
}

/**
 * AutoSaveIndicator Component
 * 
 * Visual feedback for auto-save status with color-coded indicators:
 * - Green: Saved successfully
 * - Yellow: Saving in progress
 * - Red: Unsaved changes or error
 */
export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  isSaving,
  lastSaved,
  hasUnsavedChanges,
  onManualSave,
  className
}) => {
  const formatTimeAgo = (timestamp: string | null): string => {
    if (!timestamp) return 'Never';
    
    const now = new Date();
    const saved = new Date(timestamp);
    const diffMs = now.getTime() - saved.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    
    return saved.toLocaleDateString();
  };

  const getStatusColor = (): string => {
    if (isSaving) return 'text-yellow-500';
    if (hasUnsavedChanges) return 'text-amber-500';
    if (lastSaved) return 'text-green-500';
    return 'text-gray-500';
  };

  const getStatusText = (): string => {
    if (isSaving) return 'Saving...';
    if (hasUnsavedChanges) return 'Unsaved changes';
    if (lastSaved) return `Saved ${formatTimeAgo(lastSaved)}`;
    return 'Not saved';
  };

  const getStatusIcon = () => {
    if (isSaving) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (hasUnsavedChanges) {
      return <AlertCircle className="h-4 w-4" />;
    }
    if (lastSaved) {
      return <CheckCircle2 className="h-4 w-4" />;
    }
    return <Save className="h-4 w-4" />;
  };

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <div className={cn('flex items-center gap-1.5', getStatusColor())}>
        {getStatusIcon()}
        <span className="font-medium">{getStatusText()}</span>
      </div>
      
      {hasUnsavedChanges && onManualSave && (
        <button
          onClick={onManualSave}
          disabled={isSaving}
          className={cn(
            'px-2 py-1 text-xs rounded-md transition-colors',
            'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title="Save now"
        >
          Save Now
        </button>
      )}
    </div>
  );
};

export default AutoSaveIndicator;

