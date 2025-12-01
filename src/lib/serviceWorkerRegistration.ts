export const registerServiceWorker = () => {
  // Only register if VitePWA is not handling it (check if registration already exists)
  if ('serviceWorker' in navigator) {
    // Check if service worker is already registered by VitePWA
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      if (registrations.length === 0) {
        // No service worker registered, register manually
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/service-worker.js')
            .then(() => {
              console.log('[SW] Manual registration successful');
            })
            .catch((err) => {
              console.log('[SW] Manual registration failed:', err);
            });
        });
      } else {
        console.log('[SW] Service worker already registered (likely by VitePWA)');
      }
    }).catch((err) => {
      console.warn('[SW] Error checking registrations:', err);
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
