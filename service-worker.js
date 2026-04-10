const CACHE = 'tourist-planner-v1';
const STATIC = [
  '/index.html',
  '/planner.html',
  '/add-stop.html',
  '/map.html',
  '/mobile.css',
  '/manifest.json',
  '/images/icon.svg',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/images/places/temple.jpg',
  '/images/places/palace.jpg',
  '/images/places/market.jpg',
  '/images/places/mall.jpg',
  '/images/places/street.jpg',
  '/images/places/culture.jpg',
  '/images/packs/pack-temple.jpg',
  '/images/packs/pack-food.jpg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API calls: network only (live data)
  if (url.pathname.startsWith('/api/')) return;

  // External CDN (Leaflet, Figma assets, OpenStreetMap tiles): network only
  if (url.origin !== self.location.origin) return;

  // Static assets: cache first, fall back to network
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }))
  );
});
