// Scripts de Firebase Compat para Service Workers
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDvv52ue8-1EqI92Uae6DHuyQG3BD9xvcw",
  authDomain: "graderz5-usuarios.firebaseapp.com",
  projectId: "graderz5-usuarios",
  storageBucket: "graderz5-usuarios.firebasestorage.app",
  messagingSenderId: "496402623162",
  appId: "1:496402623162:web:5f31f4d6c4ae7a9e757083"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Notificación recibida en background:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'Graderz5';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'Tienes una nueva respuesta en Graderz5',
    icon: '/earth-dark.jpg',
    badge: '/earth-dark.jpg',
    sound: '/sounds/notisonido.mp3',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const clickAction = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});
