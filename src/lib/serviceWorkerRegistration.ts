export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(() => {
          console.log('[SW] registration successful');
        })
        .catch((err) => {
          console.log('[SW] registration failed:', err);
        });
    });
  }
};

export const unregisterServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;
  // Attempt to unregister all registered service workers and clear caches
  navigator.serviceWorker.getRegistrations?.()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .catch((err) => console.info('[SW] getRegistrations error:', err))
    .finally(async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        console.info('[SW] All caches cleared');
      } catch (err) {
        console.info('[SW] Cache clear error:', err);
      }
    });
};
