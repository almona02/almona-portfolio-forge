/** Wait at most three seconds for each recovery step; never block a reload forever. */
async function bounded<T>(operation: Promise<T>): Promise<T | undefined> {
  let cancelTimeout = () => {};
  try {
    return await Promise.race([
      operation,
      new Promise<undefined>(resolve => {
        const timer = setTimeout(resolve, 3000);
        cancelTimeout = () => clearTimeout(timer);
      }),
    ]);
  } finally {
    cancelTimeout();
  }
}

async function waitForWorker(worker: ServiceWorker, state: ServiceWorkerState) {
  if (worker.state === state || worker.state === 'redundant') return;
  let onState: (() => void) | undefined;
  try {
    await bounded(new Promise<void>(resolve => {
      onState = () => {
        if (worker.state === state || worker.state === 'redundant') resolve();
      };
      worker.addEventListener('statechange', onState);
      onState();
    }));
  } finally {
    if (onState) worker.removeEventListener('statechange', onState);
  }
}

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
    waiting.postMessage({ type: 'SKIP_WAITING' });
    await waitForWorker(waiting, 'activated');
  } catch {
    // An update failure must not disable the guarded reload.
  }
}
