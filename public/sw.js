const CACHE = 'savevideo-v1';
const PRECACHE = ['/', '/src/main.tsx'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.open(CACHE).then((cache) =>
      fetch(e.request)
        .then((res) => {
          cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => cache.match(e.request))
    )
  );
});
