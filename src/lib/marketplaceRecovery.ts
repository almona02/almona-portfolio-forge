import { bounded, waitForWorker, canActivateWorker } from './serviceWorkerLifecycle';

/**
 * A plain refresh can replay the same stale shell under an old worker.
 * Only after a marketplace module has failed (before its form can mount),
 * let the existing bounded recovery activate an available replacement first.
 * Routine updates elsewhere still require the operator's save/reload choice.
 */
export async function prepareMarketplaceReload(): Promise<void> {
  if (!/^\/(?:used-machines|usedmachines)(?:\/|$)/.test(window.location.pathname)) return;
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await bounded(navigator.serviceWorker.getRegistration());
    if (!registration) return;
    await bounded(registration.update());
    if (registration.installing) await waitForWorker(registration.installing, 'installed');
    const waiting = registration.waiting;
    if (!waiting) return;
    if (!(await canActivateWorker(waiting))) return;
    waiting.postMessage({ type: 'SKIP_WAITING' });
    await waitForWorker(waiting, 'activated');
  } catch {
    // An update failure must not disable the guarded reload.
  }
}
