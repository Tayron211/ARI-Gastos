/**
 * ARI-GASTOS - SERVICE WORKER
 * Progressive Web App Offline & Asset Caching Engine
 */

const CACHE_NAME = 'ari-control-v2.4.0';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './prestamos.html',
  './gastos.html',
  './conversor.html',
  './reportes.html',
  './manifest.json',
  './css/main.css',
  './css/components.css',
  './js/utils.js',
  './js/storage.js',
  './js/expenses.js',
  './js/loans.js',
  './js/converter.js',
  './js/reports.js',
  './js/app.js',
  './js/pwa.js',
  './js/notifications.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png',
  './icons/favicon.svg',
  './icons/icon.ico',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap'
];

// 1. Install Event: Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use addAll with individual error resilience
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(new Request(url, { mode: url.startsWith('http') && !url.includes(self.location.hostname) ? 'cors' : 'same-origin' }))
            .catch((err) => console.warn('[PWA-SW] Cache skip for:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up outdated asset caches (NEVER delete user data vault cache!)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== 'ari-user-data-vault-v1') {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Stale-While-Revalidate for local assets, Network-First for APIs
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests
  if (request.method !== 'GET') return;

  // Ignore browser extensions or devtools schemes
  if (!url.protocol.startsWith('http')) return;

  // Strategy A: Live exchange rate APIs or dynamic endpoints -> Network first, fallback to cache
  if (url.hostname.includes('er-api') || url.hostname.includes('exchangerate') || url.hostname.includes('currency-api') || url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Strategy B: App Shell & Local Assets -> Network-First (immediate updates on code edits), Cache fallback when offline
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return null;
        });
      })
  );
});

// 4. Push & Mobile/Desktop Notification Handlers
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Ari-Control',
    body: 'Tienes cobros o pagos programados para hoy.',
    url: './index.html?tab=loans'
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch (e) {
      payload.body = event.data.text() || payload.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: payload.url }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = (event.notification.data && typeof event.notification.data.url === 'string') ? event.notification.data.url : './index.html?tab=loans';
  const targetUrl = rawUrl.startsWith('./') || rawUrl.startsWith('/') ? rawUrl : './index.html?tab=loans';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
