// service-worker.js – минимальная рабочая версия
var CACHE_NAME = 'car-k3eeper-v3';
var urlsToCache = [
  '.',
  'index.html',
  'style.css',
  'manifest.json',
  'icon-192.png',
  'firebase-messaging-sw.js'
];

// Установка
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Активация – чистим старый кеш
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) { return name !== CACHE_NAME; })
                  .map(function(name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

// Обработка запросов
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});

// Импорт Firebase для push-уведомлений
importScripts('firebase-messaging-sw.js');