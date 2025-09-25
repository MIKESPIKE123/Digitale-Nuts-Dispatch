const CACHE = 'dnuts-v2';
const ASSETS = [
  '/',
  '/opmeetapp_BOAB_2025_V23.html',
  '/app/db.js', '/app/ids.js', '/app/photos.js', '/app/sync.js', '/app/status.js', '/app/oslo_export.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then((r) => r || fetch(e.request))
    );
  } else {
    e.respondWith(
  fetch(e.request).catch(() => caches.match('/opmeetapp_BOAB_2025_V23.html'))
    );
  }
});

self.addEventListener('sync', (e) => {
  if (e.tag === 'dnuts-sync') e.waitUntil(notifyClientsToSync());
});

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const c of clients) c.postMessage({ type: 'syncNow' });
}
