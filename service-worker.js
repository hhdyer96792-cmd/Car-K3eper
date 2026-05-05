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

// Этот обработчик срабатывает, когда PWA находится в фоне или закрыто
messaging.onBackgroundMessage(function(payload) {
    console.log('[SW] Получено фоновое сообщение:', payload);
    
    // Заголовок и тело берём из поля notification (если оно есть)
    const notificationTitle = payload.notification?.title || 'Напоминание о ТО';
    const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/Car-K3eeper/icon-192.png'  // Абсолютный путь от корня сайта (важно для GitHub Pages)
    };
    
    self.registration.showNotification(notificationTitle, notificationOptions);
});
// =====================================================================

// ===== Кэширование статических ресурсов (ваш текущий список) =====
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

// ===== Кэширование статических ресурсов (Cache-First + Update) =====
const CACHE_NAME = 'car-k3eeper-static-v1';   // меняйте при каждом обновлении списка файлов!

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Кэширую статические ресурсы');
      return cache.addAll(localFiles);
    }).then(() => self.skipWaiting())   // сразу активировать новый воркер
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())   // перехватывать запросы без перезагрузки
  );
});

self.addEventListener('fetch', event => {
  const requestURL = new URL(event.request.url);
  // Кэшируем только локальные файлы из списка
  if (localFiles.includes(requestURL.pathname)) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          // Обновляем кэш в фоне (Stale-While-Revalidate)
          fetch(event.request).then(networkResponse => {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
          });
          return cachedResponse;
        }
        // Если в кэше нет – идём в сеть
        return fetch(event.request).then(networkResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  }
  // Все остальные запросы (API, Supabase, Firebase) пропускаем без кэширования
});
