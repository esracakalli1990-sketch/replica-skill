/* Caches the app shell so saved routes and stop lists open without a connection. */
const CACHE = 'motonav-v2';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'lib/optimize.js', 'lib/routing.js', 'lib/geo.js', 'manifest.webmanifest', 'icon.svg', 'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // maps, search and routing always go to the network
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
