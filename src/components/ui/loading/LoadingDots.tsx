import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'secondary' | 'accent';
  className?: string;
}

const sizeClasses = {
  sm: 'h-1 w-1',
  md: 'h-2 w-2',
  lg: 'h-3 w-3'
};

const variantClasses = {
  default: 'bg-gray-600',
  primary: 'bg-blue-600',
  secondary: 'bg-gray-400',
  accent: 'bg-purple-600'
};

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  size = 'md',
  variant = 'default',
  className
}) => {
  return (
    <div className={cn('flex space-x-1', className)} role="status" aria-label="Loading">
      <div
        className={cn(
          'rounded-full animate-pulse',
          sizeClasses[size],
          variantClasses[variant]
        )}
        style={{ animationDelay: '0ms' }}
      />
      <div
        className={cn(
          'rounded-full animate-pulse',
          sizeClasses[size],
          variantClasses[variant]
        )}
        style={{ animationDelay: '150ms' }}
      />
      <div
        className={cn(
          'rounded-full animate-pulse',
          sizeClasses[size],
          variantClasses[variant]
        )}
        style={{ animationDelay: '300ms' }}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingDots;
