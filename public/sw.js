self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    const registrations = await self.registration.unregister();
    if (registrations) {
      const clientsList = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      clientsList.forEach((client) => client.navigate(client.url));
    }
  })());
});

self.addEventListener('fetch', () => {
  // Legacy cleanup worker: no runtime caching.
});
