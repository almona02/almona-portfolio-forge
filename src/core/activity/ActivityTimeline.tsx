/**
 * Activity Timeline Component
 * 
 * Gold-tier timeline component for displaying activity events in a visually
 * appealing, prestige-themed timeline format.
 * 
 * Features:
 * - Prestige theme styling (amber/gold accents)
 * - Loading and empty states
 * - Icon and color mapping
 * - Responsive design
 * - Accessibility support
 * 
 * Usage:
 * ```tsx
 * <ActivityTimeline 
 *   entityType="customer" 
 *   entityId={customerId} 
 *   limit={50} 
 * />
 * ```
 */

import { cn } from '@/lib/utils';
import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { formatDistanceToNow } from 'date-fns';
import * as Icons from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ActivityLogEntry, ActivityLogger } from './ActivityLogger';
import { getActivityColor, getActivityIcon, getActivityLabel } from './activityTypes';

interface ActivityTimelineProps {
  /** Type of entity (customer, project, invoice, etc.) */
  entityType: string;
  /** ID of the entity */
  entityId: string;
  /** Maximum number of activities to display */
  limit?: number;
  /** Additional CSS classes */
  className?: string;
  /** Show header */
  showHeader?: boolean;
  /** Compact mode (reduced spacing) */
  compact?: boolean;
}

/**
 * Activity Timeline Component
 * 
 * Displays a vertical timeline of activities for a specific entity.
 * Uses prestige theme styling with amber/gold accents.
 */
export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  entityType,
  entityId,
  limit = 50,
  className = '',
  showHeader = true,
  compact = false,
}) => {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActivities();
  }, [entityType, entityId, limit, loadActivities]);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await ActivityLogger.getTimeline(entityType, entityId, limit);
      setActivities(data);
    } catch (err) {
      console.error('Failed to load activities:', err);
      setError('Failed to load activity timeline');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, limit, setLoading, setError, setActivities]);

  const renderIcon = (eventType: string) => {
    const iconName = getActivityIcon(eventType);
    const IconComponent = (Icons as any)[iconName] || Icons.Activity;
    const colorClass = getActivityColor(eventType);
    
    return (
      <div className={cn(
        'flex items-center justify-center w-10 h-10 rounded-full border-2 flex-shrink-0 transition-all',
        'bg-[#0f0f0f]/60 border-amber-600/30',
        'hover:border-amber-500/50 hover:bg-[#0f0f0f]/80'
      )}>
        <IconComponent className={cn('w-5 h-5', colorClass)} />
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <Card className={cn('bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark', className)}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-amber-200">Activity Timeline</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mb-4" />
            <p className="text-sm text-amber-600/70">Loading activities...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn('bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark', className)}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-amber-200">Activity Timeline</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Icons.AlertCircle className="w-12 h-12 text-red-500/70 mb-4" />
            <p className="text-sm text-red-400/70 mb-2">{error}</p>
            <button
              onClick={loadActivities}
              className="text-xs text-amber-500 hover:text-amber-400 underline"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (activities.length === 0) {
    return (
      <Card className={cn('bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark', className)}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-amber-200">Activity Timeline</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Icons.Activity className="w-16 h-16 text-amber-600/20 mb-4" />
            <p className="text-sm font-medium text-amber-300/70 mb-1">No activity yet</p>
            <p className="text-xs text-amber-600/50">
              Activities will appear here as changes are made
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark', className)}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-amber-200">Activity Timeline</CardTitle>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-600/30 text-xs">
              {activities.length}
            </Badge>
          </div>
        </CardHeader>
      )}
      <CardContent className={cn(compact ? 'p-4' : 'p-6')}>
        <div className="relative">
          {/* Timeline line - prestige gold gradient */}
          <div className={cn(
            'absolute left-5 top-0 bottom-0 w-0.5',
            'bg-gradient-to-b from-amber-600/40 via-amber-500/30 to-transparent'
          )} />
          
          {/* Activities */}
          <div className={cn('space-y-6', compact && 'space-y-4')}>
            {activities.map((activity, index) => {
              const label = getActivityLabel(activity.eventType);
              const _colorClass = getActivityColor(activity.eventType);
              const timeAgo = formatDistanceToNow(activity.timestamp, { addSuffix: true });
              
              return (
                <div key={activity.id} className="relative flex gap-4 group">
                  {/* Icon with timeline connector */}
                  <div className="relative z-10 flex-shrink-0">
                    {renderIcon(activity.eventType)}
                    {/* Connector dot */}
                    {index < activities.length - 1 && (
                      <div className="absolute left-1/2 top-10 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-500/40 border border-amber-600/50" />
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 pt-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'font-medium text-sm mb-1',
                          'text-amber-200 group-hover:text-amber-100 transition-colors'
                        )}>
                          {label}
                        </p>
                        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                          <div className="mt-1.5 text-xs text-amber-600/70 leading-relaxed">
                            {activity.metadata.description ? (
                              <p>{activity.metadata.description}</p>
                            ) : (
                              <details className="cursor-pointer">
                                <summary className="text-amber-500/70 hover:text-amber-400/70">
                                  View details
                                </summary>
                                <pre className="mt-2 p-2 bg-[#0f0f0f]/60 rounded border border-amber-600/20 text-[10px] overflow-x-auto">
                                  {JSON.stringify(activity.metadata, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <span className={cn(
                          'text-xs whitespace-nowrap',
                          'text-amber-600/60 group-hover:text-amber-500/70 transition-colors'
                        )}>
                          {timeAgo}
                        </span>
                      </div>
                    </div>
                    
                    {/* Additional metadata badges */}
                    {activity.metadata && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {activity.metadata.method && (
                          <Badge variant="outline" className="bg-amber-500/5 text-amber-300/70 border-amber-600/20 text-[10px] px-1.5 py-0">
                            {activity.metadata.method}
                          </Badge>
                        )}
                        {activity.metadata.status && (
                          <Badge variant="outline" className="bg-cyan-500/5 text-cyan-300/70 border-cyan-600/20 text-[10px] px-1.5 py-0">
                            {activity.metadata.status}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

