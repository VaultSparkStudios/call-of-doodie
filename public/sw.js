// ── Call of Doodie Service Worker ─────────────────────────────────────────────
// Strategy:
//  • Shell assets (HTML, icons, manifest) → cache-first, update in background
//  • /assets/ (hashed JS/CSS) → cache-first (immutable, hash guarantees freshness)
//  • Supabase / external API calls → network-only (never cache)
//  • Navigation → network-first with offline fallback to index.html

const CACHE_NAME = "cod-v5";
const BASE = new URL(self.registration.scope).pathname;
const SHELL_ASSETS = [
  BASE,
  `${BASE}index.html`,
  `${BASE}manifest.json`,
  `${BASE}icon.svg`,
  `${BASE}icon-192.png`,
  `${BASE}icon-512.png`,
  `${BASE}og-image.svg`,
];

// ── Install: pre-cache shell ──────────────────────────────────────────────────
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: purge old caches ────────────────────────────────────────────────
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", e => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET and external domains (Supabase, etc.)
  if (request.method !== "GET") return;
  if (!url.origin.includes(self.location.origin)) return;
  if (url.pathname.includes("supabase") || url.hostname.includes("supabase")) return;

  // Navigation → network-first, offline fallback
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
          return res;
        })
        .catch(() => caches.match(BASE + "index.html"))
    );
    return;
  }

  // Hashed /assets/ files → cache-first (immutable)
  if (url.pathname.startsWith(`${BASE}assets/`)) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res.ok) { const clone = res.clone(); caches.open(CACHE_NAME).then(c => c.put(request, clone)); }
          return res;
        });
      })
    );
    return;
  }

  // Shell assets → stale-while-revalidate
  if (url.pathname.startsWith(BASE)) {
    e.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(request).then(cached => {
          const networkFetch = fetch(request).then(res => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          });
          return cached || networkFetch;
        })
      )
    );
  }
});
