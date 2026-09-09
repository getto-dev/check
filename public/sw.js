const VERSION = '24.1.0';
const CACHE = `smeta-${VERSION}`;
const OFFLINE = './offline.html';
const STATIC_ASSETS = [OFFLINE, './', './fonts/roboto-all-400-normal.woff'];

function notifyClients(message) {
  return self.clients.matchAll().then((clients) => {
    clients.forEach((client) => client.postMessage(message));
  });
}

async function loadPrecacheManifest() {
  try {
    const response = await fetch('./precache-manifest.json', { cache: 'no-store' });
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const manifest = await loadPrecacheManifest();
    const assets = [...new Set([...STATIC_ASSETS, ...manifest.map((url) => url.startsWith('/') ? url : url)])];
    const cache = await caches.open(CACHE);
    await Promise.allSettled(assets.map((asset) => cache.add(asset)));
    await notifyClients({ type: 'SW_INSTALLING', version: VERSION });
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => notifyClients({ type: 'SW_ACTIVATED', version: VERSION })),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (requestUrl.pathname.endsWith('/version.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          if (response.ok) void caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) void caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match(OFFLINE))),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response.ok) void caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
        return response;
      });
      return cached || network;
    }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') void self.skipWaiting();
});
