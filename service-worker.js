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

// Автоматическое определение базовой папки исходя из URL сервис-воркера
const basePath = self.location.pathname.replace(/\/service-worker\.js$/, '');
// Например, для /Car-K3eper/service-worker.js basePath станет '/Car-K3eper'

const CACHE_NAME = 'car-k3eeper-static-v1';

const localFiles = [
    basePath + '/index.html',
    basePath + '/style.css',
    basePath + '/manifest.json',
    basePath + '/icon-192.png',
    basePath + '/icon-512.png',
    basePath + '/src/config/constants.js',
    basePath + '/src/utils/dom.js',
    basePath + '/src/events.js',
    basePath + '/src/main.js'
];

self.addEventListener('install', event => {
    console.log('[SW] Установка, базовый путь: ' + basePath);
    self.skipWaiting();
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
});