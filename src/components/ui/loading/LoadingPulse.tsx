import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingPulseProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'secondary' | 'accent';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
};

const variantClasses = {
  default: 'bg-gray-600',
  primary: 'bg-blue-600',
  secondary: 'bg-gray-400',
  accent: 'bg-amber-600'
};

export const LoadingPulse: React.FC<LoadingPulseProps> = ({
  size = 'md',
  variant = 'default',
  className
}) => {
  return (
    <div
      className={cn(
        'rounded-full animate-pulse',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingPulse;
