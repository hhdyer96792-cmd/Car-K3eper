// ===== Firebase Cloud Messaging: инициализация и обработка фоновых сообщений =====
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

// Когда PWA в фоне, при notification-сообщении браузер сам покажет уведомление.
// Мы только логируем для диагностики.
messaging.onBackgroundMessage(function(payload) {
    console.log('[SW] Получено фоновое сообщение:', payload);
});
// =====================================================================

// ===== Кэширование статических ресурсов (Stale-While-Revalidate) =====
const CACHE_NAME = 'car-k3eeper-static-v1';

const localFiles = [
    '/Car-K3eeper/',
    '/Car-K3eeper/index.html',
    '/Car-K3eeper/style.css',
    '/Car-K3eeper/manifest.json',
    '/Car-K3eeper/icon-192.png',
    '/Car-K3eeper/icon-512.png',
    '/Car-K3eeper/src/config/constants.js',
    '/Car-K3eeper/src/utils/dom.js',
    '/Car-K3eeper/src/events.js',
    '/Car-K3eeper/src/main.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            console.log('[SW] Кэширую статические ресурсы');
            // Кэшируем каждый файл отдельно, чтобы одна ошибка не остановила всё
            for (const file of localFiles) {
                try {
                    await cache.add(file);
                } catch (err) {
                    console.warn(`[SW] Не удалось закэшировать: ${file}`, err);
                }
            }
            console.log('[SW] Кэширование завершено');
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
    if (localFiles.includes(requestURL.pathname)) {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) {
                    // Обновляем кэш в фоне
                    fetch(event.request).then(networkResponse => {
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
                    }).catch(() => {});
                    return cachedResponse;
                }
                return fetch(event.request).then(networkResponse => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
    }
    // Остальные запросы пропускаем без кэширования
});
