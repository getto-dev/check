const VERSION = '24.0.0';
const CACHE = `santehschet-${VERSION}`;
const OFFLINE = './offline.html';
self.addEventListener('install', (event) => { event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([OFFLINE, './']))); });
self.addEventListener('activate', (event) => { event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (event) => { if (event.request.method !== 'GET') return; event.respondWith(fetch(event.request).then((response) => { if (response.ok && new URL(event.request.url).origin === self.location.origin) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone())); return response; }).catch(() => caches.match(event.request).then((cached) => cached || caches.match(OFFLINE)))); });
self.addEventListener('message', (event) => { if (event.data === 'skipWaiting') self.skipWaiting(); });
