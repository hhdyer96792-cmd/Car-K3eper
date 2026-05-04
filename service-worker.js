const CACHE_NAME = 'car-k3eeper-v5';

// Все локальные файлы с префиксом /Car-K3eeper/
const localFiles = [
  '/Car-K3eeper/',
  '/Car-K3eeper/index.html',
  '/Car-K3eeper/style.css',
  '/Car-K3eeper/manifest.json',
  '/Car-K3eeper/icon-192.png',
  '/Car-K3eeper/icon-512.png',
  '/Car-K3eeper/firebase-messaging-sw.js',
  '/Car-K3eeper/src/config/constants.js',
  '/Car-K3eeper/src/config/defaults.js',
  '/Car-K3eeper/src/utils/dom.js',
  '/Car-K3eeper/src/utils/dates.js',
  '/Car-K3eeper/src/utils/validate.js',
  '/Car-K3eeper/src/api/supabase.js',
  '/Car-K3eeper/src/api/storage.js',
  '/Car-K3eeper/src/state/store.js',
  '/Car-K3eeper/src/logic/planner.js',
  '/Car-K3eeper/src/logic/statistics.js',
  '/Car-K3eeper/src/logic/operations.js',
  '/Car-K3eeper/src/ui/components/modal.js',
  '/Car-K3eeper/src/ui/components/charts.js',
  '/Car-K3eeper/src/ui/pages/dashboard.js',
  '/Car-K3eeper/src/ui/pages/maintenance.js',
  '/Car-K3eeper/src/ui/pages/stats.js',
  '/Car-K3eeper/src/ui/pages/history.js',
  '/Car-K3eeper/src/ui/pages/fuel.js',
  '/Car-K3eeper/src/ui/pages/tires.js',
  '/Car-K3eeper/src/ui/pages/parts.js',
  '/Car-K3eeper/src/ui/pages/settings.js',
  '/Car-K3eeper/src/ui/pages/cars.js',
  '/Car-K3eeper/src/ui/pages/importCsv.js',
  '/Car-K3eeper/src/events.js',
  '/Car-K3eeper/src/main.js',
  '/Car-K3eeper/src/vendor/supabase.min.js',
];

// Внешние CDN, необходимые для работы офлайн
const externalFiles = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/hammerjs@2.0.8/hammer.min.js',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js',
  'https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js'
];

const urlsToCache = [...localFiles, ...externalFiles];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        urlsToCache.map(url => cache.add(url))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Не обрабатываем POST-запросы к Supabase и другие API
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Возвращаем кеш, но в фоне обновляем его, если есть сеть
        if (navigator.onLine) {
          fetch(event.request).then(response => {
            if (response.status === 200) {
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
            }
          }).catch(() => {});
        }
        return cachedResponse;
      }

      return fetch(event.request).then(response => {
        if (response.status === 200) {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        }
        return response;
      }).catch(() => {
        // Если нет сети и кеша – показываем офлайн-страницу
        return new Response('Офлайн. Приложение будет доступно, когда появится интернет.', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      });
    })
  );
});

// Импорт для Firebase Push
importScripts('firebase-messaging-sw.js');
