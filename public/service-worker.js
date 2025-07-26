const CACHE_NAME = 'machine-health-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/models/fault-model.json',
  '/models/group1-shard1of1.bin',
  '/index.html',
  '/src/main.tsx',
  '/assets/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  // Cache-first strategy for model files
  if (event.request.url.includes('/models/')) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => cachedResponse || fetch(event.request))
    );
    return;
  }

  // Network-first strategy for other assets
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
