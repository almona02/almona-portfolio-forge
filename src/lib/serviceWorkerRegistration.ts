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
        // Suppress CacheStorage errors (common in development)
        if (err?.name === 'UnknownError' || err?.message?.includes('CacheStorage')) {
          console.warn('[SW] CacheStorage error (ignored):', err.message);
        } else {
          console.info('[SW] Cache clear error:', err);
        }
      }
    });
};

/**
 * Clear all caches and unregister service workers
 * Useful for fixing CacheStorage errors in development
 * Call from browser console: window.clearAllCaches()
 */
export const clearAllCaches = async () => {
  try {
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
      console.log(`[SW] Unregistered ${registrations.length} service worker(s)`);
    }

    // Clear all caches
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    console.log(`[SW] Cleared ${cacheKeys.length} cache(s)`);
    
    return { success: true, cachesCleared: cacheKeys.length };
  } catch (error) {
    // Suppress CacheStorage errors
    if (error?.name === 'UnknownError' || error?.message?.includes('CacheStorage')) {
      console.warn('[SW] CacheStorage error (ignored):', error.message);
      return { success: false, error: 'CacheStorage error (ignored)' };
    }
    console.error('[SW] Error clearing caches:', error);
    return { success: false, error: error.message };
  }
};

// Make clearAllCaches available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).clearAllCaches = clearAllCaches;
}
