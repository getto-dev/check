/// <reference lib="webworker" />

const CACHE_NAME = 'check-v1';
const STATIC_CACHE = 'santech-static-v1';
const DYNAMIC_CACHE = 'santech-dynamic-v1';

// Определяем basePath
const isProd = typeof self !== 'undefined' && self.location && self.location.pathname.includes('/check');
const basePath = isProd ? '/check' : '';

// Файлы для кэширования
const STATIC_FILES = [
  `${basePath}/`,
  `${basePath}/manifest.json`,
  `${basePath}/icons/android/android-192x192.png`,
  `${basePath}/icons/android/android-512x512.png`,
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_FILES);
    })
  );
  self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Стратегия кэширования: Network First с fallback на кэш
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Пропускаем не-GET запросы
  if (request.method !== 'GET') return;

  // Пропускаем внешние ресурсы
  if (url.origin !== location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request);
      })
    );
    return;
  }

  // Для навигации - Network First
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
            return cached || caches.match(`${basePath}/`);
          });
        })
    );
    return;
  }

  // Для статических ресурсов - Cache First
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Обновляем кэш в фоне
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

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
