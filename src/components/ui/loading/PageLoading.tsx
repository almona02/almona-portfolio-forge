import React from 'react';
import { cn } from '@/lib/utils';
import { LoadingSkeleton } from './LoadingSkeleton';
import { Loader2, Globe, ArrowRight } from 'lucide-react';

interface PageLoadingProps {
  className?: string;
  message?: string;
  showProgress?: boolean;
  progress?: number;
  variant?: 'default' | 'minimal' | 'fullscreen';
}

const variantStyles = {
  default: {
    container: 'bg-white dark:bg-gray-900',
    icon: 'text-blue-600 dark:text-blue-400',
    text: 'text-gray-700 dark:text-gray-300'
  },
  minimal: {
    container: 'bg-transparent',
    icon: 'text-gray-500 dark:text-gray-400',
    text: 'text-gray-600 dark:text-gray-300'
  },
  fullscreen: {
    container: 'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800',
    icon: 'text-blue-600 dark:text-blue-400',
    text: 'text-gray-700 dark:text-gray-300'
  }
};

export const PageLoading: React.FC<PageLoadingProps> = ({
  className,
  message = 'Loading page...',
  showProgress = false,
  progress = 0,
  variant = 'default'
}) => {
  const styles = variantStyles[variant];

  if (variant === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className={cn(
          'flex flex-col items-center space-y-6 p-8 rounded-2xl shadow-2xl',
          styles.container,
          className
        )}>
          <div className="relative">
            <Globe className={cn('h-16 w-16 animate-pulse', styles.icon)} />
            <Loader2 className={cn(
              'absolute -top-2 -right-2 h-8 w-8 animate-spin',
              styles.icon
            )} />
          </div>
          
          <div className="text-center">
            <h3 className={cn('text-lg font-semibold mb-2', styles.text)}>
              {message}
            </h3>
            
            {showProgress && (
              <div className="w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
            )}
            
            <div className="flex items-center justify-center space-x-1">
              <div className={cn('h-1 w-1 rounded-full bg-blue-500 animate-pulse')} style={{ animationDelay: '0ms' }} />
              <div className={cn('h-1 w-1 rounded-full bg-blue-500 animate-pulse')} style={{ animationDelay: '150ms' }} />
              <div className={cn('h-1 w-1 rounded-full bg-blue-500 animate-pulse')} style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center space-y-4 p-8',
        styles.container,
        className
      )}
      role="status"
      aria-label={message}
    >
      <div className="relative">
        <Globe className={cn('h-8 w-8 animate-pulse', styles.icon)} />
        <ArrowRight className={cn(
          'absolute -top-1 -right-1 h-4 w-4 animate-bounce',
          styles.icon
        )} />
      </div>
      
      <div className="text-center">
        <p className={cn('text-sm font-medium', styles.text)}>
          {message}
        </p>
        
        {showProgress && (
          <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-2">
            <div 
              className="bg-blue-600 h-1 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>
      
      <span className="sr-only">{message}</span>
    </div>
  );
};

export default PageLoading;
