// Service Worker for 4-Day Workout & Mobility System PWA (v5)
const CACHE_NAME = 'workout-app-v5';

const STATIC_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon-64.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Install: precache essential static shell and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE).catch((err) => {
        console.warn('Precache partial warning:', err);
      });
    })
  );
});

// Activate: delete ALL legacy caches and take control of all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('Purging legacy cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-First for HTML/Navigation, Cache-First for static assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === 'navigate' || 
                       event.request.destination === 'document' ||
                       url.pathname === '/' ||
                       url.pathname === '/index.html';

  // 1. Navigation requests: Network-First to guarantee latest HTML and fresh asset hashes
  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseCopy);
              cache.put('/index.html', responseCopy.clone());
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Network failed (offline in gym): fall back to cached index.html
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;
          return new Response('Offline: Workout System assets available once loaded online.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        })
    );
    return;
  }

  // 2. Static assets (JS, CSS, icons, images): Cache-First with Network fallback and dynamic caching
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseCopy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseCopy);
        });
        return networkResponse;
      }).catch(async () => {
        return new Response('Asset unavailable offline', { status: 404 });
      });
    })
  );
});

// Allow clients to trigger skipWaiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
