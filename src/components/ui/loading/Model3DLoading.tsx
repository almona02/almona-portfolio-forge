import React from 'react';
import { cn } from '@/lib/utils';
import { LoadingSkeleton } from './LoadingSkeleton';
import { Box, Loader2, RotateCcw } from 'lucide-react';

interface Model3DLoadingProps {
  className?: string;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'landscape';
  showIcon?: boolean;
  message?: string;
  variant?: 'default' | 'minimal' | 'detailed';
}

const aspectRatioClasses = {
  square: 'aspect-square',
  video: 'aspect-video',
  portrait: 'aspect-[3/4]',
  landscape: 'aspect-[4/3]'
};

const variantStyles = {
  default: {
    container: 'bg-gradient-to-br from-gray-900 via-gray-800 to-black',
    icon: 'text-blue-400',
    text: 'text-gray-300'
  },
  minimal: {
    container: 'bg-gray-100 dark:bg-gray-800',
    icon: 'text-gray-500 dark:text-gray-400',
    text: 'text-gray-600 dark:text-gray-300'
  },
  detailed: {
    container: 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900',
    icon: 'text-cyan-400',
    text: 'text-gray-200'
  }
};

export const Model3DLoading: React.FC<Model3DLoadingProps> = ({
  className,
  aspectRatio = 'square',
  showIcon = true,
  message = 'Loading 3D model...',
  variant = 'default'
}) => {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden',
        aspectRatioClasses[aspectRatio],
        styles.container,
        className
      )}
      role="status"
      aria-label={message}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent,rgba(59,130,246,0.1),transparent)] animate-spin" style={{ animationDuration: '10s' }} />
      </div>

      {/* Loading skeleton overlay */}
      <LoadingSkeleton 
        className="absolute inset-0 opacity-30" 
        animation="pulse"
      />
      
      {showIcon && (
        <div className="relative z-10 flex flex-col items-center space-y-4">
          <div className="relative">
            {/* 3D Box Icon */}
            <Box className={cn('h-12 w-12', styles.icon)} />
            
            {/* Rotating loader */}
            <RotateCcw className={cn(
              'absolute -top-2 -right-2 h-6 w-6 animate-spin',
              styles.icon
            )} />
            
            {/* Pulse effect */}
            <div className={cn(
              'absolute inset-0 rounded-lg animate-ping opacity-20',
              'bg-blue-400'
            )} />
          </div>
          
          <div className="text-center">
            <p className={cn('text-sm font-medium', styles.text)}>
              {message}
            </p>
            <div className="flex items-center justify-center mt-2 space-x-1">
              <div className={cn('h-1 w-1 rounded-full bg-blue-400 animate-pulse')} style={{ animationDelay: '0ms' }} />
              <div className={cn('h-1 w-1 rounded-full bg-blue-400 animate-pulse')} style={{ animationDelay: '150ms' }} />
              <div className={cn('h-1 w-1 rounded-full bg-blue-400 animate-pulse')} style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
      
      <span className="sr-only">{message}</span>
    </div>
  );
};

export default Model3DLoading;
