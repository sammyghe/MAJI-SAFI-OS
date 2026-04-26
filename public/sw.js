// Self-uninstalling service worker — clears all caches and removes itself
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      await self.registration.unregister();
      clients.forEach((c) => c.navigate(c.url));
    })()
  );
});
