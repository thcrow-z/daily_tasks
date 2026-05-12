/* Daily Tasks - Service Worker
 * Network-first HTML, cache-first static shell. Bump CACHE_VERSION when shipping changes. */

const CACHE_VERSION = 'daily-tasks-v7';
const APP_SHELL = [
  './',
  './index.html',
  './daily-tasks.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const wantsHtml = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (wantsHtml) {
    event.respondWith(
      fetch(req).then(res => {
        if (res.ok && new URL(req.url).origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() =>
        caches.match(req).then(cached =>
          cached || caches.match('./daily-tasks.html').then(fallback => fallback || caches.match('./index.html'))
        )
      )
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        // Only cache successful same-origin responses
        if (res.ok && new URL(req.url).origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() =>
        caches.match('./daily-tasks.html').then(fallback => fallback || caches.match('./index.html'))
      );
    })
  );
});
