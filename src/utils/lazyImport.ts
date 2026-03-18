import { ComponentType, lazy } from 'react';

/**
 * Enhanced React.lazy with retry logic for network failures
 * Prevents "ChunkLoadError" crashes when chunks fail to load
 * 
 * @param componentImport - Function that returns a promise importing the component
 * @param componentName - Name of component for debugging and session storage key
 * @returns React lazy component with retry logic
 */
export function lazyRetry<T extends ComponentType<unknown>>(
  componentImport: () => Promise<{ default: T }>,
  componentName: string = 'Unknown'
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const pageHasBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem(`page-refreshed-${componentName}`) || 'false'
    ) as boolean;

    try {
      const component = await componentImport() as { default: T };
      window.sessionStorage.setItem(`page-refreshed-${componentName}`, 'false');
      return component;
    } catch (error) {
      // Only reload if this is a persistent error (not first load)
      // Check if we've already tried loading this component before
      const hasTriedBefore = window.sessionStorage.getItem(`chunk-load-attempt-${componentName}`);
      
      if (!pageHasBeenForceRefreshed && !hasTriedBefore) {
        // First attempt failed - mark that we tried and wait a bit before retrying
        window.sessionStorage.setItem(`chunk-load-attempt-${componentName}`, 'true');
        console.warn(`Chunk load failed for ${componentName}, will retry once...`);
        
        // Retry once after a short delay (network might be slow)
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const component = await componentImport();
          window.sessionStorage.setItem(`page-refreshed-${componentName}`, 'false');
          window.sessionStorage.removeItem(`chunk-load-attempt-${componentName}`);
          return component;
        } catch (retryError) {
          // Retry also failed - only now reload if it's a version mismatch
          const errorMsg = String(retryError).toLowerCase();
          if (errorMsg.includes('404') || errorMsg.includes('not found')) {
            // Chunk file doesn't exist - likely version mismatch, reload page
            console.warn(`Chunk ${componentName} not found (version mismatch?), refreshing page...`);
            window.sessionStorage.setItem(`page-refreshed-${componentName}`, 'true');
            window.location.reload();
            return new Promise(() => {}); // Never resolves - page will refresh
          }
          // Network error or other issue - throw to show error boundary
          throw retryError;
        }
      } else if (!pageHasBeenForceRefreshed && hasTriedBefore) {
        // Already tried once, this is a persistent error
        // Only reload if it's a 404 (version mismatch), otherwise show error
        const errorMsg = String(error).toLowerCase();
        if (errorMsg.includes('404') || errorMsg.includes('not found')) {
          console.warn(`Chunk ${componentName} not found (version mismatch?), refreshing page...`);
          window.sessionStorage.setItem(`page-refreshed-${componentName}`, 'true');
          window.location.reload();
          return new Promise(() => {}); // Never resolves - page will refresh
        }
        // Network error - throw to show error boundary instead of reloading
        throw error;
      }
      throw error;
    }
  });
}

/**
 * Preload a chunk in the background during idle time
 * Useful for preloading likely next routes on hover or after initial load
 * 
 * @param importFn - Function that imports the chunk
 */
export function preloadChunk(importFn: () => Promise<unknown>): void {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      importFn().catch(() => {
        // Silent fail - will load when needed
      });
    }, { timeout: 2000 });
  } else {
    setTimeout(() => {
      importFn().catch(() => {});
    }, 2000);
  }
}

