import ErrorBoundary from '@/components/ErrorBoundary';
import React, { memo } from 'react';

// Performance-optimized error boundary HOC
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) => {
  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WithErrorBoundary.displayName = `WithErrorBoundary(${Component.displayName || Component.name})`;
  
  // Return memoized HOC to prevent re-creation on parent re-renders
  return memo(WithErrorBoundary);
};
