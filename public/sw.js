// Cache version — update this string on every deploy to bust old caches
const CACHE_VERSION = 'maji-safi-os-20260427-v1';

// Only truly static, versioned assets get cached
const PRECACHE = [
  '/maji-safi-logo.png',
  '/maji-safi-logo-white.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name !== CACHE_VERSION)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept non-GET, cross-origin, or Chrome-extension requests
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Never cache HTML pages — always go to network, fall back to offline page
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request).catch(() => caches.match('/login'))
    );
    return;
  }

  // Never cache API routes — always network only
  if (url.pathname.startsWith('/api/')) return;

  // Static assets (JS, CSS, fonts, images): cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network first, no caching
});
