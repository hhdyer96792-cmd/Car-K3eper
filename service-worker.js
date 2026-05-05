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

// При желании ниже можно добавить стандартную логику кэширования
// (сейчас её нет, файл просто хранит список, но можно использовать в future)
