import { lazy, ComponentType } from 'react';

/**
 * Enhanced React.lazy with retry logic for network failures
 * Prevents "ChunkLoadError" crashes when chunks fail to load
 * 
 * @param componentImport - Function that returns a promise importing the component
 * @param componentName - Name of component for debugging and session storage key
 * @returns React lazy component with retry logic
 */
export function lazyRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  componentName: string = 'Unknown'
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const pageHasBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem(`page-refreshed-${componentName}`) || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem(`page-refreshed-${componentName}`, 'false');
      return component;
    } catch (error) {
      if (!pageHasBeenForceRefreshed) {
        // Likely a chunk load error due to version mismatch or network issue
        console.warn(`Chunk load failed for ${componentName}, refreshing page...`);
        window.sessionStorage.setItem(`page-refreshed-${componentName}`, 'true');
        window.location.reload();
        // Return a promise that never resolves - page will refresh
        return new Promise(() => {});
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
export function preloadChunk(importFn: () => Promise<any>): void {
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

