/**
 * Loading State Component
 * 
 * Enterprise-grade loading state component with skeleton screens,
 * progress indicators, and contextual messaging for the Drafting Workbench.
 * 
 * Constitutional: Deterministic UI, no ML/AI
 * Tier: 3 Protected Determinism
 */

import { Progress } from '@/shared/ui/ui/progress';
import { Loader2 } from 'lucide-react';
import React from 'react';
import { getTypographyPreset } from '../styles/typography';
import { getPadding, getGap } from '../styles/spacing';

export interface LoadingStateProps {
  /** Loading message */
  message?: string;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Show skeleton screen instead of spinner */
  skeleton?: boolean;
  /** Skeleton lines count */
  skeletonLines?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Full screen overlay */
  overlay?: boolean;
  /** Class name */
  className?: string;
  /** Children to show while loading (for skeleton content) */
  children?: React.ReactNode;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  progress,
  skeleton = false,
  skeletonLines = 3,
  size = 'md',
  overlay = false,
  className = '',
  children,
}) => {
  const sizeConfig = {
    sm: {
      spinnerSize: 20,
      messageClass: getTypographyPreset('bodySmall'),
      containerPadding: getPadding('componentTight'),
    },
    md: {
      spinnerSize: 32,
      messageClass: getTypographyPreset('body'),
      containerPadding: getPadding('component'),
    },
    lg: {
      spinnerSize: 48,
      messageClass: getTypographyPreset('h5'),
      containerPadding: getPadding('componentLoose'),
    },
  };

  const config = sizeConfig[size];

  // Skeleton screen
  if (skeleton) {
    return (
      <div
        className={`${overlay ? 'absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50' : ''} ${config.containerPadding} ${className}`}
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        {children || (
          <div className={`flex flex-col ${getGap('normal')}`}>
            {Array.from({ length: skeletonLines }).map((_, i) => (
              <div
                key={i}
                className="h-4 bg-slate-700/50 rounded animate-pulse"
                style={{
                  width: i === skeletonLines - 1 ? '60%' : '100%',
                  animationDelay: `${i * 100}ms`,
                }}
                aria-hidden="true"
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Spinner with optional progress
  return (
    <div
      className={`flex flex-col items-center justify-center ${config.containerPadding} ${getGap('normal')} ${overlay ? 'absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50' : ''} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <Loader2
        className="animate-spin text-amber-400"
        size={config.spinnerSize}
        aria-hidden="true"
      />
      {message && (
        <p className={`${config.messageClass} text-slate-400 text-center`}>
          {message}
        </p>
      )}
      {progress !== undefined && (
        <div className="w-full max-w-xs mt-2">
          <Progress
            value={Math.max(0, Math.min(100, progress))}
            className="h-1.5"
            aria-label={`${Math.round(progress)}% complete`}
          />
          <p className={`${getTypographyPreset('caption')} text-slate-500 text-center mt-1`}>
            {Math.round(progress)}%
          </p>
        </div>
      )}
    </div>
  );
};

LoadingState.displayName = 'LoadingState';

export default LoadingState;

