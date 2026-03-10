// Version synced with version.json and constants.ts
const VERSION = '17';
const CACHE_NAME = `santehschet-v${VERSION}`;
const STATIC_CACHE = `santehschet-static-v${VERSION}`;
const DYNAMIC_CACHE = `santehschet-dynamic-v${VERSION}`;

const STATIC_FILES = [
  './',
  './manifest.json',
  './version.json',
  './fonts/Arimo-Cyrillic.ttf',
  './icons/android/android-192x192.png',
  './icons/android/android-512x512.png',
];

// Send version message to clients
function notifyClients(message) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage(message);
    });
  });
}

self.addEventListener('install', (event) => {
  console.log('SW: Installing version', VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_FILES);
    })
  );
  // Notify clients about new version during install
  notifyClients({ type: 'SW_INSTALLING', version: VERSION });
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('SW: Activating version', VERSION);
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log('SW: Deleting old cache', key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();

  // Notify clients about activation
  notifyClients({ type: 'SW_ACTIVATED', version: VERSION });
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Always fetch version.json from network (no cache)
  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Cross-origin requests: cache-first
  if (url.origin !== location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request);
      })
    );
    return;
  }

  // Navigation requests: network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, cloned);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match('./');
          });
        })
    );
    return;
  }

  // Other requests: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Return cached, update in background
        fetch(request).then((response) => {
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, response);
          });
        }).catch(() => {});
        return cached;
      }

      return fetch(request).then((response) => {
        const cloned = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, cloned);
        });
        return response;
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    console.log('SW: skipWaiting requested');
    self.skipWaiting();
  }
});
