let timerTimeout = null;

// Listen for messages from the main page
self.addEventListener('message', (event) => {
  const { type, endTime } = event.data;

  if (type === 'START_TIMER') {
    if (timerTimeout) clearTimeout(timerTimeout);

    const delay = endTime - Date.now();

    if (delay <= 0) {
      fireNotification();
      return;
    }

    timerTimeout = setTimeout(() => {
      fireNotification();
      timerTimeout = null;
    }, delay);

    console.log(`[SW] Timer set. Notification in ${Math.round(delay / 1000)}s`);
  }

  if (type === 'CANCEL_TIMER') {
    if (timerTimeout) {
      clearTimeout(timerTimeout);
      timerTimeout = null;
      console.log('[SW] Timer cancelled.');
    }
  }
});

function fireNotification() {
  self.registration.showNotification('🥚 Your egg is ready!', {
    body: 'Time to take it off the heat!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'egg-timer',
    requireInteraction: true,
    actions: [
      { action: 'dismiss', title: 'Got it! 👍' }
    ],
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});