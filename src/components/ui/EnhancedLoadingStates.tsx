import React, { useState, useEffect, Suspense, type ReactNode } from 'react';
import { Factory } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingSkeleton } from './loading/LoadingSkeleton';

/**
 * Enhanced Loading States for Fabricator Workflow
 * Provides specialized loading components with intelligent suspense handling
 */

// ============================================================================
// 1. FabricatorProjectSkeleton - Workspace-specific skeleton
// ============================================================================

export interface FabricatorProjectSkeletonProps {
  className?: string;
  showHeader?: boolean;
  showTabs?: boolean;
  showContent?: boolean;
}

export const FabricatorProjectSkeleton: React.FC<FabricatorProjectSkeletonProps> = ({
  className,
  showHeader = true,
  showTabs = true,
  showContent = true
}) => {
  return (
    <div className={cn('min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900', className)}>
      {showHeader && (
        <div className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-sm">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <LoadingSkeleton className="h-7 w-64" animation="wave" />
                <LoadingSkeleton className="h-4 w-96" animation="wave" />
              </div>
              <div className="flex gap-2">
                <LoadingSkeleton className="h-8 w-24" animation="wave" />
                <LoadingSkeleton className="h-8 w-24" animation="wave" />
              </div>
            </div>
            
            {showTabs && (
              <div className="mt-4 flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <LoadingSkeleton key={i} className="h-9 w-24" animation="wave" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {showContent && (
        <div className="container mx-auto px-4 md:px-6 py-6">
          <div className="space-y-6">
            {/* Project Header Skeleton */}
            <div className="bg-slate-800/50 rounded-lg p-6 space-y-4">
              <LoadingSkeleton className="h-6 w-48" animation="wave" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <LoadingSkeleton className="h-20 w-full" animation="wave" />
                <LoadingSkeleton className="h-20 w-full" animation="wave" />
                <LoadingSkeleton className="h-20 w-full" animation="wave" />
              </div>
            </div>
            
            {/* Content Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 rounded-lg p-6 space-y-4">
                <LoadingSkeleton className="h-5 w-32" animation="wave" />
                <LoadingSkeleton className="h-32 w-full" animation="wave" />
                <LoadingSkeleton className="h-4 w-full" animation="wave" />
                <LoadingSkeleton className="h-4 w-3/4" animation="wave" />
              </div>
              <div className="bg-slate-800/50 rounded-lg p-6 space-y-4">
                <LoadingSkeleton className="h-5 w-32" animation="wave" />
                <LoadingSkeleton className="h-32 w-full" animation="wave" />
                <LoadingSkeleton className="h-4 w-full" animation="wave" />
                <LoadingSkeleton className="h-4 w-3/4" animation="wave" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. ProgressLoader - Progress bar with percentage
// ============================================================================

export interface ProgressLoaderProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressLoader: React.FC<ProgressLoaderProps> = ({
  progress,
  label,
  showPercentage = true,
  className,
  size = 'md'
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={cn('w-full space-y-2', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-slate-400">{label}</span>}
          {showPercentage && (
            <span className="text-slate-300 font-medium">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}
      <div className={cn(
        'w-full bg-slate-700/50 rounded-full overflow-hidden',
        sizeClasses[size]
      )}>
        <div
          className={cn(
            'h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-300 ease-out',
            sizeClasses[size]
          )}
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};

// ============================================================================
// 3. FabricatorLoader - Full-screen loader with stages
// ============================================================================

export interface FabricatorLoaderProps {
  stage?: string;
  progress?: number; // 0-100
  message?: string;
  className?: string;
}

export const FabricatorLoader: React.FC<FabricatorLoaderProps> = ({
  stage = 'Loading workspace...',
  progress = 0,
  message,
  className
}) => {
  const [currentStage, setCurrentStage] = useState(stage);
  const [currentProgress, setCurrentProgress] = useState(progress);

  useEffect(() => {
    setCurrentStage(stage);
  }, [stage]);

  useEffect(() => {
    setCurrentProgress(progress);
  }, [progress]);

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center',
      'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900',
      className
    )}>
      <div className="flex flex-col items-center space-y-6 p-8 max-w-md w-full mx-4">
        {/* Icon with animation */}
        <div className="relative">
          <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative bg-slate-800/80 rounded-full p-6 border border-orange-500/30">
            <Factory className="h-12 w-12 text-orange-500 animate-pulse" />
          </div>
        </div>

        {/* Stage text */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-white">{currentStage}</h3>
          {message && (
            <p className="text-sm text-slate-400">{message}</p>
          )}
        </div>

        {/* Progress bar */}
        {progress > 0 && (
          <div className="w-full max-w-xs">
            <ProgressLoader
              progress={currentProgress}
              showPercentage={true}
              size="md"
            />
          </div>
        )}

        {/* Loading dots */}
        <div className="flex items-center justify-center space-x-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. IntelligentSuspense - Wrapper with min duration to prevent flash
// ============================================================================

export interface IntelligentSuspenseProps {
  children: ReactNode;
  fallback: ReactNode;
  /**
   * Delay before showing fallback (prevents flash on fast loads)
   * @default 300
   */
  delay?: number;
  /**
   * Minimum duration to show fallback (prevents flash when content loads quickly)
   * @default 1000
   */
  minDuration?: number;
  /**
   * Custom loading component
   */
  loadingComponent?: ReactNode;
}

export const IntelligentSuspense: React.FC<IntelligentSuspenseProps> = ({
  children,
  fallback,
  delay = 300,
  minDuration = 1000,
  loadingComponent
}) => {
  const [showFallback, setShowFallback] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [minDurationElapsed, setMinDurationElapsed] = useState(false);

  useEffect(() => {
    // Start timer when component mounts
    const mountTime = Date.now();
    setStartTime(mountTime);

    // Delay before showing fallback
    const delayTimer = setTimeout(() => {
      setShowFallback(true);
    }, delay);

    // Minimum duration timer
    const minDurationTimer = setTimeout(() => {
      setMinDurationElapsed(true);
    }, minDuration);

    return () => {
      clearTimeout(delayTimer);
      clearTimeout(minDurationTimer);
    };
  }, [delay, minDuration]);

  // Determine if we should show fallback
  const shouldShowFallback = showFallback && (!minDurationElapsed || !startTime || Date.now() - startTime < minDuration);

  return (
    <Suspense
      fallback={
        shouldShowFallback ? (
          loadingComponent || fallback
        ) : (
          <div className="min-h-screen" /> // Empty placeholder to prevent layout shift
        )
      }
    >
      {children}
    </Suspense>
  );
};

// Export all components
export default {
  FabricatorProjectSkeleton,
  ProgressLoader,
  FabricatorLoader,
  IntelligentSuspense
};

