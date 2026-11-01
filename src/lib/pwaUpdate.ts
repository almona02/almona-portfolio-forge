import { canActivateWorker, waitForWorker } from './serviceWorkerLifecycle';
import { toast } from 'sonner';

const UPDATE_TOAST_ID = 'app-update';

/** Prompt the operator once; activate only after they choose reload. */
export function showAppUpdate(updateApp: () => Promise<void>) {
  toast.info('An app update is ready', {
    id: UPDATE_TOAST_ID,
    description: 'Save your current work before reloading. Close other Almona tabs before applying the update.',
    duration: Infinity,
    action: {
      label: 'Reload after saving',
      onClick: () => {
        void updateApp().catch(() => {
          toast.error('Save your work and close other Almona tabs, then try updating again.');
        });
      },
    },
  });
}

/**
 * Keep looking for a waiting service worker and surface the reload prompt.
 * Without this, Workbox can leave an old precache active until manual cache clear.
 */
export function watchServiceWorkerUpdates(
  registration: ServiceWorkerRegistration | undefined,
  requestReload: () => void,
): () => void {
  if (!registration) return () => undefined;

  const promptIfWaiting = () => {
    if (registration.waiting) requestReload();
  };

  promptIfWaiting();
  registration.addEventListener('updatefound', () => {
    const installing = registration.installing;
    if (!installing) return;
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed' && navigator.serviceWorker.controller) {
        requestReload();
      }
    });
  });

  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      void registration.update().catch(() => undefined);
      promptIfWaiting();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  const intervalId = window.setInterval(() => {
    void registration.update().catch(() => undefined);
    promptIfWaiting();
  }, 5 * 60 * 1000);

  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.clearInterval(intervalId);
  };
}

/** Only the initiating tab reloads; never subscribe all tabs to controllerchange. */
export async function activateAppUpdate(registration: ServiceWorkerRegistration): Promise<void> {
  const worker = registration.waiting;
  if (worker) {
    if (!(await canActivateWorker(worker))) throw new Error('Close other Almona tabs before updating.');
    worker.postMessage({ type: 'SKIP_WAITING' });
    await waitForWorker(worker, 'activated');
    if (worker.state !== 'activated') throw new Error('The update did not activate.');
  }
  window.location.reload();
}

export async function registerAppServiceWorker(): Promise<() => void> {
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
  return watchServiceWorkerUpdates(registration, () => showAppUpdate(() => activateAppUpdate(registration)));
}