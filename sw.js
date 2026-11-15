// Service worker: maakt de app installeerbaar en offline bruikbaar.
// - App-schil (html, css, js, vendor): in productie cache-first; tools/build-dist.mjs vult VERSION en SHELL in.
// - Lesinhoud (content/*.json): eerst uit de cache, op de achtergrond ververst (stale-while-revalidate).
// - Lettertypen van Google Fonts: runtimecache.
// Lokaal (VERSION 'dev') gaat alles eerst naar het netwerk, zodat wijzigingen meteen zichtbaar zijn;
// de cache is dan alleen terugval als de server uit staat.

const VERSION = 'dev';
const SHELL = ['./', 'index.html'];
const SHELL_CACHE = 'darb-shell-' + VERSION;
const CONTENT_CACHE = 'darb-content';
const FONT_CACHE = 'darb-fonts';

self.addEventListener('install', (e) => {
  // cache: 'reload' slaat de HTTP-cache over (GitHub Pages cachet 10 minuten), anders kan een
  // nieuwe versie deels oude bestanden bevatten.
  e.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))));
  if (VERSION === 'dev') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('darb-shell-') && k !== SHELL_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// De pagina vraagt om de nieuwe versie te activeren (knop "Herladen").
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(staleWhileRevalidate(req, FONT_CACHE));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (url.pathname.includes('/content/')) {
    e.respondWith(VERSION === 'dev' ? networkFirst(req, CONTENT_CACHE) : staleWhileRevalidate(req, CONTENT_CACHE));
    return;
  }
  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, SHELL_CACHE, 'index.html'));
    return;
  }
  e.respondWith(VERSION === 'dev' ? networkFirst(req, SHELL_CACHE) : cacheFirst(req, SHELL_CACHE));
});

async function cacheFirst(req, name) {
  const hit = await caches.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(name)).put(req, res.clone());
  return res;
}

async function networkFirst(req, name, fallback) {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(name)).put(req, res.clone());
    return res;
  } catch (err) {
    const hit = (await caches.match(req, { ignoreSearch: true })) || (fallback && (await caches.match(fallback)));
    if (hit) return hit;
    throw err;
  }
}

async function staleWhileRevalidate(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req, { ignoreSearch: true });
  const update = fetch(req).then((res) => {
    if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return hit || (await update) || Response.error();
}
