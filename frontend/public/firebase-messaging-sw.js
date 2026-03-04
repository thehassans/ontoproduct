/* eslint-disable no-undef */
// Firebase Messaging Service Worker for BuySial Push Notifications
// Handles background push notifications when the app tab is not in focus.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

let firebaseInitialized = false;

// Receive Firebase config from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    if (!firebaseInitialized) {
      try {
        firebase.initializeApp(event.data.config);
        const messaging = firebase.messaging();

        // Handle background messages
        messaging.onBackgroundMessage((payload) => {
          console.log('[SW] Background message:', payload);
          const title = payload.notification?.title || payload.data?.title || 'BuySial';
          const options = {
            body: payload.notification?.body || payload.data?.body || '',
            icon: '/BuySial2.png',
            badge: '/BuySial2.png',
            tag: payload.data?.notificationId || 'buysial-push-' + Date.now(),
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200],
            data: {
              url: payload.fcmOptions?.link || payload.data?.link || '/',
              notificationId: payload.data?.notificationId || '',
              type: payload.data?.type || '',
            },
          };
          return self.registration.showNotification(title, options);
        });

        firebaseInitialized = true;
        console.log('[SW] Firebase initialized');
      } catch (err) {
        console.error('[SW] Firebase init error:', err);
      }
    }
  }
});

// Fallback: handle raw push events (works even if Firebase SDK not initialized)
self.addEventListener('push', (event) => {
  if (firebaseInitialized) return; // Let Firebase SDK handle it

  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { return; }

  const title = data.notification?.title || data.data?.title || 'BuySial';
  const body = data.notification?.body || data.data?.body || '';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/BuySial2.png',
      badge: '/BuySial2.png',
      tag: 'buysial-push-' + Date.now(),
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      data: { url: data.fcmOptions?.link || data.data?.link || '/' },
    })
  );
});

// Handle notification click — focus existing window or open new one
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (urlToOpen !== '/') client.navigate(urlToOpen);
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
