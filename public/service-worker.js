// Almona Egypt Service Worker v1
// Enhanced caching strategy for Egyptian workflow patterns
// Phase 1.6: Service Worker Optimization

const APP_VERSION = 'v1.0.0-egypt';
const CACHE_NAME = `almona-egypt-${APP_VERSION}`;

// Egypt-specific critical assets to cache immediately
// NOTE: We don't cache index.html to prevent white page issues
// NOTE: Only list assets that ACTUALLY exist in public/ — Vite bundles
//       CSS/JS/fonts into /assets/ at build time, so those are cached
//       dynamically by the fetch handler's EGYPT_DYNAMIC_PATTERNS instead.
const EGYPT_CRITICAL_ASSETS = [
  '/offline.html'
];

// Patterns to cache dynamically (Egypt workflow specific)
const EGYPT_DYNAMIC_PATTERNS = [
  /^\/api\/egypt\/profiles/,
  /^\/api\/egypt\/suppliers/,
  /^\/api\/optimization\/cutting/,
  /^\/static\/egypt-workflow\//,
  /\.(js|css|woff2|webp)$/
];

// Install - Precache critical Egypt assets
self.addEventListener('install', (event) => {
  console.log(`[Almona Egypt SW] Installing version ${APP_VERSION}`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Almona Egypt SW] Caching critical Egypt assets');
        // Cache critical assets, but don't fail if some are missing
        return Promise.allSettled(
          EGYPT_CRITICAL_ASSETS.map(asset => 
            cache.add(asset).catch(err => {
              console.warn(`[Almona Egypt SW] Failed to cache ${asset}:`, err);
              return null;
            })
          )
        );
      })
      .then(() => {
        console.log('[Almona Egypt SW] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Almona Egypt SW] Installation failed:', error);
      })
  );
});

// Activate - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Almona Egypt SW] Activating new version');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches that don't match current name
            if (cacheName !== CACHE_NAME && cacheName.startsWith('almona-egypt-')) {
              console.log(`[Almona Egypt SW] Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Almona Egypt SW] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch - Intelligent caching strategy for Egypt
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') return;
  
  // Skip analytics and monitoring
  if (url.pathname.includes('google-analytics') || 
      url.pathname.includes('gtag') ||
      url.pathname.includes('vercel-analytics') ||
      url.pathname.includes('googletagmanager')) {
    return;
  }
  
  // CRITICAL FIX: Never cache HTML in development or if it's the main document
  // This prevents white page issues from stale HTML
  if (request.headers.get('Accept')?.includes('text/html')) {
    // Always use network-first for HTML to prevent stale content
    event.respondWith(networkFirstWithCache(request));
    return;
  }
  
  // Egypt-specific strategy based on request type
  if (isEgyptCriticalAsset(url)) {
    // Critical Egypt assets: Cache First
    event.respondWith(cacheFirstWithUpdate(request));
  } else if (isEgyptDynamicAsset(url)) {
    // Egypt dynamic assets: Stale While Revalidate
    event.respondWith(staleWhileRevalidate(request));
  } else if (isEgyptAPIRequest(url)) {
    // Egypt API requests: Network First
    event.respondWith(networkFirstWithCache(request));
  } else {
    // Default: Network First
    event.respondWith(networkFirstWithCache(request));
  }
});

// Helper functions for Egypt workflow
function isEgyptCriticalAsset(url) {
  return EGYPT_CRITICAL_ASSETS.some(asset => 
    url.pathname === asset || 
    url.pathname.startsWith('/images/egypt') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname === '/offline.html'
  );
}

function isEgyptDynamicAsset(url) {
  return EGYPT_DYNAMIC_PATTERNS.some(pattern => pattern.test(url.pathname));
}

function isEgyptAPIRequest(url) {
  return url.pathname.startsWith('/api/egypt/') || 
         url.pathname.startsWith('/api/fabricator/') ||
         url.pathname.startsWith('/api/');
}

// Caching strategies
async function cacheFirstWithUpdate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Update cache in background for next visit
    fetchAndCache(request, cache).catch(() => {});
    return cachedResponse;
  }
  
  return fetchAndCache(request, cache);
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Always try to fetch fresh
  const fetchPromise = fetchAndCache(request, cache).catch(() => cachedResponse);
  
  // Return cached if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful responses (excluding large files)
    if (response.ok && response.status === 200) {
      const contentLength = response.headers.get('content-length');
      // Only cache if under 5MB
      if (!contentLength || parseInt(contentLength) < 5 * 1024 * 1024) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone()).catch(() => {});
      }
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If HTML request and offline, show offline page
    if (request.headers.get('Accept')?.includes('text/html')) {
      const offlineResponse = await cache.match('/offline.html');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    throw error;
  }
}

async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    
    // Only cache successful, same-origin responses
    if (response.ok && response.status === 200) {
      const contentLength = response.headers.get('content-length');
      // Only cache if under 5MB
      if (!contentLength || parseInt(contentLength) < 5 * 1024 * 1024) {
        await cache.put(request, response.clone());
      }
    }
    
    return response;
  } catch (error) {
    console.error('[Almona Egypt SW] Fetch failed:', error);
    throw error;
  }
}

// Background sync for Egypt workflow actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-egypt-optimization') {
    console.log('[Almona Egypt SW] Background sync for optimization');
    event.waitUntil(syncOptimizationJobs());
  }
});

async function syncOptimizationJobs() {
  // Implementation for background sync of optimization jobs
  console.log('[Almona Egypt SW] Syncing optimization jobs');
  // Placeholder for future implementation
}

