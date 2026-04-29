/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/11.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.7.1/firebase-messaging-compat.js');

const isLocalhost = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

const firebaseConfig = isLocalhost
  ? {
      apiKey: 'AIzaSyDniB2F0Uq0nQBZ7LPI_1ptNa29TEQhViu',
      authDomain: 'diagramas-bd72d.firebaseapp.com',
      projectId: 'diagramas-bd72d',
      storageBucket: 'diagramas-bd72d.firebasestorage.app',
      messagingSenderId: '133009356981',
      appId: '1:133009356981:web:1b4c761686d2437c03e6fc',
    }
  : {
      apiKey: 'AIzaSyDniB2F0Uq0nQBZ7LPI_1ptNa29TEQhViu',
      authDomain: 'diagramas-bd72d.firebaseapp.com',
      projectId: 'diagramas-bd72d',
      storageBucket: 'diagramas-bd72d.firebasestorage.app',
      messagingSenderId: '133009356981',
      appId: '1:133009356981:web:1b4c761686d2437c03e6fc',
    };

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || payload?.data?.title || 'Nueva notificacion';
  const body = payload?.notification?.body || payload?.data?.body || 'Tienes una actualizacion.';
  const icon = payload?.notification?.icon || '/assets/icons/icon-192x192.png';

  self.registration.showNotification(title, {
    body,
    icon,
    data: payload?.data || {},
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/notificaciones';
  event.waitUntil(clients.openWindow(targetUrl));
});
