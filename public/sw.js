const CACHE = "cod-v1";
const BASE = "/call-of-doodie/";

// Cache shell assets on install
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([BASE, BASE + "index.html"]))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for navigation; cache-first for assets
self.addEventListener("fetch", e => {
  const { request } = e;
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request).catch(() => caches.match(BASE + "index.html"))
    );
    return;
  }
  if (request.url.includes(BASE)) {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()));
        return res;
      }))
    );
  }
});
