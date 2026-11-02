/**
 * Lazy3DWrapper - Suspense wrapper for lazy-loaded 3D components
 * 
 * Provides a consistent loading experience for heavy 3D components
 * that are loaded on-demand to reduce initial bundle size.
 */

import React, { Suspense } from 'react';

interface Lazy3DWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const Lazy3DWrapper: React.FC<Lazy3DWrapperProps> = ({ 
  children, 
  fallback = <div className="h-64 w-full bg-muted animate-pulse rounded-lg flex items-center justify-center">
    <div className="text-muted-foreground">Loading 3D viewer...</div>
  </div>
}) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

/**
 * Usage in your components:
 * 
 * import { lazyThree } from '@/lib/optimized-imports';
 * import { Lazy3DWrapper } from '@/components/Lazy3DWrapper';
 * 
 * // Then wrap heavy 3D components:
 * <Lazy3DWrapper>
 *   <YourHeavy3DComponent />
 * </Lazy3DWrapper>
 */

