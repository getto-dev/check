// Service Worker for СантехСчет PWA
// Version synced with version.json and constants.ts
const VERSION = '20';
const CACHE_NAME = `santehschet-v${VERSION}`;

// Static files to pre-cache on install
const PRECACHE_FILES = [
  './',
  './manifest.json',
  './version.json',
  './offline.html',
  './fonts/Roboto-Regular.ttf',
  './icons/android/android-192x192.png',
  './icons/android/android-512x512.png',
  './icons/icon.svg',
  './favicon.ico',
];

// Precache manifest generated at build time (will be loaded dynamically)
let precacheManifest = [];

// Send message to all clients
function notifyClients(message) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage(message);
    });
  });
}

// Try to load the precache manifest (generated after build)
async function loadPrecacheManifest() {
  try {
    const response = await fetch('./precache-manifest.json');
    if (response.ok) {
      precacheManifest = await response.json();
      console.log('SW: Loaded precache manifest with', precacheManifest.length, 'files');
    }
  } catch (e) {
    console.log('SW: No precache manifest found, using default files');
  }
}

self.addEventListener('install', (event) => {
  console.log('SW: Installing version', VERSION);
  event.waitUntil(
    loadPrecacheManifest()
      .then(() => {
        // Combine static files with build-generated manifest
        const allFiles = [...new Set([...PRECACHE_FILES, ...precacheManifest])];
        console.log('SW: Pre-caching', allFiles.length, 'files');
        return caches.open(CACHE_NAME).then((cache) => {
          // Cache files one by one so one failure doesn't break everything
          return Promise.allSettled(
            allFiles.map((url) =>
              cache.add(url).catch((err) => {
                console.warn('SW: Failed to cache', url, err.message);
              })
            )
          );
        });
      })
      .then(() => {
        notifyClients({ type: 'SW_INSTALLING', version: VERSION });
        self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('SW: Activating version', VERSION);
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('SW: Deleting old cache', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      self.clients.claim();
      notifyClients({ type: 'SW_ACTIVATED', version: VERSION });
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Always try network for version.json (for update checks)
  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the latest version
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, cloned);
          });
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // For navigation requests (HTML pages): cache-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Return cached page, but update cache in background
          fetch(request).then((response) => {
            if (response && response.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response);
              });
            }
          }).catch(() => {});
          return cached;
        }

        // No cache - try network
        return fetch(request)
          .then((response) => {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, cloned);
            });
            return response;
          })
          .catch(() => {
            // Network failed and no cache - show offline page
            return caches.match('./offline.html');
          });
      })
    );
    return;
  }

  // For same-origin static assets: cache-first, then network
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Stale-while-revalidate: return cached, update in background
          fetch(request).then((response) => {
            if (response && response.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response);
              });
            }
          }).catch(() => {});
          return cached;
        }

        // Not in cache - fetch from network and cache
        return fetch(request).then((response) => {
          // Only cache successful responses
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, cloned);
            });
          }
          return response;
        }).catch(() => {
          // For image requests, return a simple placeholder
          if (request.destination === 'image') {
            return new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          }
          return new Response('', { status: 408, statusText: 'Offline' });
        });
      })
    );
    return;
  }

  // For cross-origin requests (Google Fonts, etc.): cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // Cache fonts and static resources from CDNs
        if (response.ok && (
          url.hostname.includes('fonts.googleapis.com') ||
          url.hostname.includes('fonts.gstatic.com')
        )) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, cloned);
          });
        }
        return response;
      }).catch(() => {
        return new Response('', { status: 408, statusText: 'Offline' });
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
