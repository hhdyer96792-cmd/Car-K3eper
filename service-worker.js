const CACHE_NAME = 'car-k3eeper-v3';

const urlsToCache = [
  '/Car-K3eper/',
  '/Car-K3eper/index.html',
  '/Car-K3eper/style.css',
  '/Car-K3eper/manifest.json',
  '/Car-K3eper/icon-192.png',
  '/Car-K3eper/src/config/constants.js',
  '/Car-K3eper/src/config/defaults.js',
  '/Car-K3eper/src/utils/dom.js',
  '/Car-K3eper/src/utils/dates.js',
  '/Car-K3eper/src/utils/validate.js',
  '/Car-K3eper/src/api/supabase.js',
  '/Car-K3eper/src/api/storage.js',
  '/Car-K3eper/src/state/store.js',
  '/Car-K3eper/src/logic/planner.js',
  '/Car-K3eper/src/logic/statistics.js',
  '/Car-K3eper/src/logic/operations.js',
  '/Car-K3eper/src/ui/components/modal.js',
  '/Car-K3eper/src/ui/components/charts.js',
  '/Car-K3eper/src/ui/pages/dashboard.js',
  '/Car-K3eper/src/ui/pages/maintenance.js',
  '/Car-K3eper/src/ui/pages/stats.js',
  '/Car-K3eper/src/ui/pages/history.js',
  '/Car-K3eper/src/ui/pages/fuel.js',
  '/Car-K3eper/src/ui/pages/tires.js',
  '/Car-K3eper/src/ui/pages/parts.js',
  '/Car-K3eper/src/ui/pages/settings.js',
  '/Car-K3eper/src/ui/pages/cars.js',
  '/Car-K3eper/src/ui/pages/importCsv.js',
  '/Car-K3eper/src/events.js',
  '/Car-K3eper/src/main.js',
  '/Car-K3eper/src/vendor/supabase.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/hammerjs@2.0.8/hammer.min.js',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js',
  'https://unpkg.com/lucide@latest',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        urlsToCache.map(url => {
          return cache.add(url).catch(err => console.warn('Failed to cache', url, err));
        })
      );
    })
  );
  self.skipWaiting();
});

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

importScripts('firebase-messaging-sw.js');
