const CACHE_VERSION = "v2.0.0";
const STATIC_CACHE = `almona-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `almona-dynamic-${CACHE_VERSION}`;
const MODELS_CACHE = `almona-models-${CACHE_VERSION}`;
const API_CACHE = `almona-api-${CACHE_VERSION}`;

// Assets to cache immediately on install
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/favicon.ico",
  "/logo.png",
  "/placeholder.svg",
  "/robots.txt",
  "/manifest.json",
];

// Model files for 3D/AR features
const MODEL_ASSETS = [
  "/models/fault-model.json",
  "/models/group1-shard1of1.bin",
  "/models/AR-Code-Object-Capture-app-1752786892 (1).glb",
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: "cache-first",
  NETWORK_FIRST: "network-first",
  STALE_WHILE_REVALIDATE: "stale-while-revalidate",
  NETWORK_ONLY: "network-only",
  CACHE_ONLY: "cache-only",
};

// Route patterns and their strategies
const ROUTE_STRATEGIES = [
  {
    pattern: /\/models\//,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cache: MODELS_CACHE,
  },
  {
    pattern: /\/api\//,
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    cache: API_CACHE,
  },
  {
    pattern: /\.(js|css|woff2?|png|jpg|jpeg|svg|ico)$/,
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    cache: STATIC_CACHE,
  },
  {
    pattern: /\//,
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    cache: DYNAMIC_CACHE,
  },
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");

  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log("[SW] Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      }),
      // Cache model files
      caches.open(MODELS_CACHE).then((cache) => {
        console.log("[SW] Caching model assets");
        return cache.addAll(
          MODEL_ASSETS.filter((asset) => {
            // Only cache if file exists
            return fetch(asset, { method: "HEAD" })
              .then(() => true)
              .catch(() => false);
          })
        );
      }),
    ]).then(() => {
      console.log("[SW] Installation complete");
      // Force activation of new service worker
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        const validCaches = [
          STATIC_CACHE,
          DYNAMIC_CACHE,
          MODELS_CACHE,
          API_CACHE,
        ];

        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!validCaches.includes(cacheName)) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("[SW] Activation complete");
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with appropriate strategies
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith("http")) {
    return;
  }

  // Find matching strategy
  const matchedRoute = ROUTE_STRATEGIES.find((route) =>
    route.pattern.test(event.request.url)
  );

  if (!matchedRoute) {
    return;
  }

  event.respondWith(
    handleRequest(event.request, matchedRoute.strategy, matchedRoute.cache)
  );
});

// Handle requests based on strategy
async function handleRequest(request, strategy, cacheName) {
  const cache = await caches.open(cacheName);

  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request, cache);

    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request, cache);

    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request, cache);

    case CACHE_STRATEGIES.NETWORK_ONLY:
      return fetch(request);

    case CACHE_STRATEGIES.CACHE_ONLY:
      return cache.match(request);

    default:
      return networkFirst(request, cache);
  }
}

// Cache-first strategy
async function cacheFirst(request, cache) {
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log("[SW] Network failed for cache-first:", request.url);
    return new Response("Offline content not available", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

// Network-first strategy
async function networkFirst(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log("[SW] Network failed, trying cache:", request.url);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (request.mode === "navigate") {
      const offlinePage = await cache.match("/");
      if (offlinePage) {
        return offlinePage;
      }
    }

    return new Response("Offline", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request, cache) {
  const cachedResponse = await cache.match(request);

  // Fetch in background to update cache
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {
      // Network failed, but we might have cached version
      return cachedResponse;
    });

  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }

  // Otherwise wait for network
  return fetchPromise;
}

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync:", event.tag);

  if (event.tag === "quote-submission") {
    event.waitUntil(syncQuoteSubmissions());
  }

  if (event.tag === "contact-form") {
    event.waitUntil(syncContactForms());
  }
});

// Sync offline quote submissions
async function syncQuoteSubmissions() {
  try {
    const cache = await caches.open("offline-data");
    const requests = await cache.keys();

    for (const request of requests) {
      if (request.url.includes("/api/quotes")) {
        const response = await cache.match(request);
        const data = await response.json();

        // Attempt to submit
        try {
          await fetch("/api/quotes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });

          // Remove from cache after successful submission
          await cache.delete(request);
          console.log("[SW] Quote submission synced");
        } catch (error) {
          console.log("[SW] Quote sync failed, will retry later");
        }
      }
    }
  } catch (error) {
    console.error("[SW] Sync error:", error);
  }
}

// Sync offline contact forms
async function syncContactForms() {
  try {
    const cache = await caches.open("offline-data");
    const requests = await cache.keys();

    for (const request of requests) {
      if (request.url.includes("/api/contact")) {
        const response = await cache.match(request);
        const data = await response.json();

        try {
          await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });

          await cache.delete(request);
          console.log("[SW] Contact form synced");
        } catch (error) {
          console.log("[SW] Contact sync failed, will retry later");
        }
      }
    }
  } catch (error) {
    console.error("[SW] Contact sync error:", error);
  }
}

// Push notifications
self.addEventListener("push", (event) => {
  console.log("[SW] Push received");

  const options = {
    body: event.data ? event.data.text() : "New notification from ALMONA",
    icon: "/logo.png",
    badge: "/logo.png",
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "View Details",
        icon: "/icons/checkmark.png",
      },
      {
        action: "close",
        title: "Close",
        icon: "/icons/xmark.png",
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification("ALMONA Industrial Solutions", options)
  );
});

// Notification click handling
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked");

  event.notification.close();

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/"));
  }
});

// Error handling
self.addEventListener("error", (event) => {
  console.error("[SW] Error:", event.error);
});

self.addEventListener("unhandledrejection", (event) => {
  console.error("[SW] Unhandled promise rejection:", event.reason);
});

// Periodic background sync (if supported)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "content-sync") {
    event.waitUntil(syncContent());
  }
});

async function syncContent() {
  try {
    // Sync product data, prices, etc.
    const response = await fetch("/api/sync");
    if (response.ok) {
      const data = await response.json();
      const cache = await caches.open(API_CACHE);
      await cache.put(
        "/api/products",
        new Response(JSON.stringify(data.products))
      );
      console.log("[SW] Content synced in background");
    }
  } catch (error) {
    console.log("[SW] Background content sync failed");
  }
}
