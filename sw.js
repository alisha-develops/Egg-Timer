// sw.js — Egg Timer Service Worker
// MUST live at the root of your site, same folder as index.html

// Instead of relying on setTimeout (which Android kills),
// we use a periodic check via a stored end time.
// The SW wakes up on fetch/message events and checks if the egg is done.

let checkInterval = null;

function startChecking(endTime) {
  // Clear any existing interval
  if (checkInterval) clearInterval(checkInterval);

  checkInterval = setInterval(() => {
    if (Date.now() >= endTime) {
      clearInterval(checkInterval);
      checkInterval = null;
      fireNotification();
    }
  }, 5000); // check every 5 seconds while SW is alive
}

self.addEventListener('message', (event) => {
  const { type, endTime } = event.data || {};

  if (type === 'START_TIMER') {
    console.log('[SW] Timer started, end time:', new Date(endTime).toLocaleTimeString());

    // Store end time in SW scope so we can check it on any future wake
    self._eggEndTime = endTime;

    // Start an interval check (works while SW is alive in foreground)
    startChecking(endTime);
  }

  if (type === 'CANCEL_TIMER') {
    console.log('[SW] Timer cancelled');
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
    self._eggEndTime = null;
  }
});

// Every time the SW gets a fetch event (page loads, assets, etc.)
// it's a free opportunity to check if the timer is past due.
// This covers the case where Android killed the interval but the user
// returns to the tab — the notification fires the moment they come back.
self.addEventListener('fetch', (event) => {
  if (self._eggEndTime && Date.now() >= self._eggEndTime) {
    self._eggEndTime = null;
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
    fireNotification();
  }
  // Let the request go through normally — don't intercept it
  event.respondWith(fetch(event.request));
});

function fireNotification() {
  self.registration.showNotification('🥚 Your egg is ready!', {
    body: 'Time to take it off the heat!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [300, 100, 300, 100, 300],
    tag: 'egg-timer',
    requireInteraction: true,
    actions: [
      { action: 'dismiss', title: 'Got it! 👍' }
    ],
  });
}

// Tap notification → bring tab into focus
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

self.addEventListener('install', () => {
  console.log('[SW] Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(clients.claim());
});
