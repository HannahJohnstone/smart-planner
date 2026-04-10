// Hannah's Smart Planner — Service Worker
const CACHE_NAME = 'smart-planner-v1';

const PRECACHE_URLS = [
  '/smart-planner/',
  '/smart-planner/index.html'
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first, cache fallback ──────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Always go to network for external APIs and CDN scripts — never cache these
  if (
    url.hostname === 'api.anthropic.com' ||
    url.hostname.includes('supabase.co') ||
    url.hostname === 'cdn.jsdelivr.net' ||
    url.hostname === 'accounts.google.com' ||
    url.hostname === 'oauth2.googleapis.com'
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Network-first for everything else
  event.respondWith(
    fetch(request)
      .then(networkResponse => {
        if (networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then(cached => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('/smart-planner/index.html');
          }
        });
      })
  );
});
