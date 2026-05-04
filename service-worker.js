// service-worker.js
const CACHE_NAME = 'car-k3eeper-v2'; // меняйте версию при каждом обновлении, чтобы старый кеш очищался

// Файлы, которые кешируем для офлайн-доступа
const urlsToCache = [
  '.',
  'index.html',
  'style.css',
  'manifest.json',
  'icon-192.png',
  'src/config/constants.js',
  'src/config/defaults.js',
  'src/utils/dom.js',
  'src/utils/dates.js',
  'src/utils/validate.js',
  'src/api/supabase.js',
  'src/api/storage.js',
  'src/state/store.js',
  'src/logic/planner.js',
  'src/logic/statistics.js',
  'src/logic/operations.js',
  'src/ui/components/modal.js',
  'src/ui/components/charts.js',
  'src/ui/pages/dashboard.js',
  'src/ui/pages/maintenance.js',
  'src/ui/pages/stats.js',
  'src/ui/pages/history.js',
  'src/ui/pages/fuel.js',
  'src/ui/pages/tires.js',
  'src/ui/pages/parts.js',
  'src/ui/pages/settings.js',
  'src/ui/pages/cars.js',
  'src/events.js',
  'src/main.js',
  'src/vendor/supabase.min.js',
  // библиотеки (только если они действительно нужны офлайн)
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/hammerjs@2.0.8/hammer.min.js',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js',
  'https://unpkg.com/lucide@latest',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js'
];

// Установка Service Worker: кешируем все статические файлы
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        urlsToCache.map(url => {
          return cache.add(url).catch(err => {
            console.warn('Failed to cache', url, err);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

// Активация: удаляем старые кеши
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Стратегия Stale-while-revalidate: сначала кеш, потом сеть
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => cachedResponse);
      return cachedResponse || fetchPromise;
    })
  );
});

// Импортируем firebase-messaging-sw.js для обработки push-уведомлений
importScripts('firebase-messaging-sw.js');