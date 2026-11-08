import { reportMarketplaceEvent } from '../lib/marketplace/monitoring';
import { prepareMarketplaceReload } from '../lib/marketplaceRecovery';
import { lazy } from 'react';
import type { Component, ReactNode } from 'react';

import { claimModuleReload, isChunkLoadError } from './moduleRecovery';
export { isChunkLoadError } from './moduleRecovery';

/**
 * Retry transient downloads, then recover a stale deployment once per tab.
 * Storage is optional: blocked storage must never stop a page from loading.
 * Keep the reload marker after success so later route failures cannot loop.
 */
export async function loadLazyModule<T>(
  componentImport: () => Promise<T>,
  _componentName: string,
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
    if (!claimModuleReload()) throw error;

    reportMarketplaceEvent('recovery_attempt', 'download');
    await prepareMarketplaceReload();
    window.location.reload();
    return new Promise<T>(() => {});
  }
}

/**
 * Structural constraint for lazily loaded components.
 * Accepts any function or class component: `never` props keep the constraint
 * satisfied for every props shape without resorting to `any`.
 */
type LazyRetryableComponent =
  | ((props: never) => ReactNode)
  | (new (props: never) => Component);

/**
 * Lazily load a component with retry and stale-deployment recovery.
 *
 * Returns the component type `T` directly instead of `LazyExoticComponent<T>`:
 * the runtime value is still a real `React.lazy` component (Suspense-ready),
 * but typing it as `T` keeps every props shape usable without `any`.
 */
export function lazyRetry<T extends LazyRetryableComponent>(
  componentImport: () => Promise<{ default: T }>,
  componentName: string = 'Unknown',
): T {
  // `React.lazy` requires `ComponentType<any>`; bridge the structural constraint
  // across without widening the public signature to `any`. Runtime behavior is
  // unchanged: the assertions below are type-level only.
  const loader = componentImport as () => Promise<{ default: T & ((props: Record<string, unknown>) => ReactNode) }>;
  return lazy(() => loadLazyModule(loader, componentName)) as unknown as T;
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
