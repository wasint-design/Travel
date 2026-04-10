const CACHE = 'tourist-planner-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const { request } = e;

  // Only handle GET requests from our own origin
  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin)) return;
  // Skip API routes (handled by api.js interceptor in the page)
  if (request.url.includes('/api/')) return;

  // Images: cache-first
  if (request.destination === 'image') {
    e.respondWith(
      caches.match(request).then(cached =>
        cached || fetch(request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
          return res;
        })
      )
    );
    return;
  }

  // HTML / CSS / JS / JSON: network-first, fall back to cache
  e.respondWith(
    fetch(request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(request, clone));
        return res;
      })
      .catch(() => caches.match(request))
  );
});
