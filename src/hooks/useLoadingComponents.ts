import React from 'react';
import { useComponentLoading } from '@/context/LoadingContext';
import { LoadingSpinner, LoadingDots, LoadingPulse, LoadingSkeleton } from '@/components/ui/loading';

export const useLoadingComponents = (componentName: string) => {
  const { isLoading, setLoading, clearLoading } = useComponentLoading(componentName);

  const LoadingComponent = {
    Spinner: (props?: any) => isLoading ? React.createElement(LoadingSpinner, props) : null,
    Dots: (props?: any) => isLoading ? React.createElement(LoadingDots, props) : null,
    Pulse: (props?: any) => isLoading ? React.createElement(LoadingPulse, props) : null,
    Skeleton: (props?: any) => isLoading ? React.createElement(LoadingSkeleton, props) : null,
  };

  return {
    isLoading,
    setLoading,
    clearLoading,
    LoadingComponent
  };
};

export default useLoadingComponents;
