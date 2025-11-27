import { useCallback } from 'react';

/**
 * Custom hook for View Transition API
 * Provides a fallback for browsers that don't support the API
 */
export const useViewTransition = () => {
  const startTransition = useCallback((callback: () => void) => {
    // Check if the browser supports the View Transition API
    if ('startViewTransition' in document) {
      // View Transition API is not yet in TypeScript lib.dom definitions
      // Use ts-expect-error so we'll notice if this becomes typed in the future
      // @ts-expect-error startViewTransition is a newer experimental API
      (document as any).startViewTransition(callback);
    } else {
      // Fallback for browsers without support
      callback();
    }
  }, []);

  const isSupported = useCallback(() => {
    return 'startViewTransition' in document;
  }, []);

  return {
    startTransition,
    isSupported: isSupported()
  };
};
