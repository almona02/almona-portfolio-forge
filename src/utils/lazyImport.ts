import { prepareMarketplaceReload } from '../lib/marketplaceRecovery';
import { ComponentType, lazy } from 'react';

/** Browser messages hide HTTP status codes for failed module downloads. */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|loading (?:css )?chunk .+ failed|chunkloaderror|unable to preload css/i.test(message);
}

/**
 * Retry transient downloads, then recover a stale deployment once per tab.
 * Storage is optional: blocked storage must never stop a page from loading.
 * Keep the reload marker after success so later route failures cannot loop.
 */
export async function loadLazyModule<T>(
  componentImport: () => Promise<T>,
  componentName: string,
): Promise<T> {
  try {
    return await componentImport();
  } catch (error) {
    if (!isChunkLoadError(error)) throw error;
  }

  await new Promise(resolve => setTimeout(resolve, 1000));
  try {
    return await componentImport();
  } catch (error) {
    if (!isChunkLoadError(error) || navigator.onLine === false) throw error;

    // Read/write can throw in restricted browsers. Without a durable guard,
    // show the fallback rather than risking a reload loop.
    let canReload = false;
    try {
      const key = `page-refreshed-${componentName}`;
      if (window.sessionStorage.getItem(key) !== 'true') {
        window.sessionStorage.setItem(key, 'true');
        canReload = window.sessionStorage.getItem(key) === 'true';
      }
    } catch {
      // The import itself does not require browser storage.
    }
    if (!canReload) throw error;

    await prepareMarketplaceReload();
    window.location.reload();
    return new Promise<T>(() => {});
  }
}

export function lazyRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  componentName: string = 'Unknown',
): React.LazyExoticComponent<T> {
  return lazy(() => loadLazyModule(componentImport, componentName));
}

/** Preload a likely next route during idle time; failures remain non-critical. */
export function preloadChunk(importFn: () => Promise<unknown>): void {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      importFn().catch(() => {});
    }, { timeout: 2000 });
  } else {
    setTimeout(() => {
      importFn().catch(() => {});
    }, 2000);
  }
}
