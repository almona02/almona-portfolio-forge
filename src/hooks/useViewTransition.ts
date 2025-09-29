import { useCallback } from 'react';

/**
 * Custom hook for View Transition API
 * Provides a fallback for browsers that don't support the API
 */
export const useViewTransition = () => {
  const startTransition = useCallback((callback: () => void) => {
    // Check if the browser supports the View Transition API
    if ('startViewTransition' in document) {
      // @ts-ignore - View Transition API is not yet in TypeScript definitions
      document.startViewTransition(callback);
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
