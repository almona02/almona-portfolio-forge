import React, { Suspense } from 'react';
import { PageLoading } from './loading/PageLoading';

interface PageLoadingWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  message?: string;
  variant?: 'default' | 'minimal' | 'fullscreen';
}

export const PageLoadingWrapper: React.FC<PageLoadingWrapperProps> = ({
  children,
  fallback,
  message = 'Loading page...',
  variant = 'default'
}) => {
  const defaultFallback = <PageLoading message={message} variant={variant} />;

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};

export default PageLoadingWrapper;
