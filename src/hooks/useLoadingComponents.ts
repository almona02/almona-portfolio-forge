import { useComponentLoading } from '@/context/LoadingContext';
import { LoadingSpinner, LoadingDots, LoadingPulse, LoadingSkeleton } from '@/components/ui/loading';

export const useLoadingComponents = (componentName: string) => {
  const { isLoading, setLoading, clearLoading } = useComponentLoading(componentName);

  const LoadingComponent = {
    Spinner: (props?: any) => isLoading ? <LoadingSpinner {...props} /> : null,
    Dots: (props?: any) => isLoading ? <LoadingDots {...props} /> : null,
    Pulse: (props?: any) => isLoading ? <LoadingPulse {...props} /> : null,
    Skeleton: (props?: any) => isLoading ? <LoadingSkeleton {...props} /> : null,
  };

  return {
    isLoading,
    setLoading,
    clearLoading,
    LoadingComponent
  };
};

export default useLoadingComponents;
