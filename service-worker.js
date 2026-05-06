// ===== Firebase Cloud Messaging =====
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyCKz1GKDdqxtK6NyLQAZ84QqUUCaqTQDWQ",
    authDomain: "car-k3eeper.firebaseapp.com",
    projectId: "car-k3eeper",
    storageBucket: "car-k3eeper.firebasestorage.app",
    messagingSenderId: "826833638199",
    appId: "1:826833638199:web:647fedbe3eae5b605240b2"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
    console.log('[SW] Получено фоновое сообщение:', payload);
});
// =====================================================================

const basePath = self.location.pathname.replace(/\/service-worker\.js$/, '');
const CACHE_NAME = 'car-k3eeper-static-v2';

// Все локальные файлы приложения
const localFiles = [
    basePath + '/index.html',
    basePath + '/style.css',
    basePath + '/manifest.json',
    basePath + '/icon-192.png',
    basePath + '/icon-512.png',
    basePath + '/src/config/constants.js',
    basePath + '/src/config/defaults.js',
    basePath + '/src/utils/dom.js',
    basePath + '/src/utils/dates.js',
    basePath + '/src/utils/validate.js',
    basePath + '/src/api/supabase.js',
    basePath + '/src/api/storage.js',
    basePath + '/src/state/store.js',
    basePath + '/src/logic/planner.js',
    basePath + '/src/logic/statistics.js',
    basePath + '/src/logic/operations.js',
    basePath + '/src/ui/components/modal.js',
    basePath + '/src/ui/components/charts.js',
    basePath + '/src/ui/pages/dashboard.js',
    basePath + '/src/ui/pages/maintenance.js',
    basePath + '/src/ui/pages/stats.js',
    basePath + '/src/ui/pages/history.js',
    basePath + '/src/ui/pages/fuel.js',
    basePath + '/src/ui/pages/tires.js',
    basePath + '/src/ui/pages/parts.js',
    basePath + '/src/ui/pages/importCsv.js',
    basePath + '/src/ui/pages/settings.js',
    basePath + '/src/ui/pages/cars.js',
    basePath + '/src/utils/realtime.js',
    basePath + '/src/events.js',
    basePath + '/src/main.js',
    basePath + '/src/vendor/supabase.min.js'
];

// Важные CDN-ресурсы, которые нужно кешировать
const cdnFiles = [
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

self.addEventListener('install', event => {
    console.log('[SW] Установка, базовый путь: ' + basePath);
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return Promise.all([
                cache.addAll(localFiles),
                ...cdnFiles.map(url => cache.add(url).catch(err => console.warn('Не удалось закешировать CDN:', url, err)))
            ]);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const requestURL = new URL(event.request.url);
    // Сначала проверяем локальные файлы
    if (localFiles.includes(requestURL.pathname)) {
        event.respondWith(
            caches.match(event.request).then(cached => cached || fetch(event.request).then(networkResponse => {
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            }))
        );
        return;
    }
    // CDN-файлы: стратегия cache-first
    if (cdnFiles.includes(requestURL.href)) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) {
                    // В фоне обновляем кэш
                    fetch(event.request).then(networkResponse => {
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
                    }).catch(() => {});
                    return cached;
                }
                return fetch(event.request).then(networkResponse => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }
    // Для остальных запросов – стандартное поведение
});
