/*
 * Passphra.si service worker — makes the installed app open with no signal.
 *
 * Scope is the folder this file is served from (e.g. /Passphra.si/), so the
 * same file works wherever the site is hosted. It never sees names or keys:
 * those live in IndexedDB and never pass through fetch.
 *
 *   - The page itself: network first (so a new deploy is picked up), falling
 *     back to the last copy we saved when offline or the network stalls.
 *   - Hashed build files (/_next/static) and our icons: cache first — their
 *     URLs change whenever their content does.
 *   - The page posts the build files it already loaded (before this worker
 *     was in control) so the very first visit is enough to work offline.
 */
const CACHE = "passphrasi-v1";
// "/Passphra.si/" on GitHub Pages; "/" if served from a domain root.
const BASE = new URL(self.registration.scope).pathname;
const PAGE = BASE;
const SHELL = [
  PAGE,
  BASE + "manifest.webmanifest",
  BASE + "icon-192.png",
  BASE + "icon-512.png",
  BASE + "apple-touch-icon.png",
];
const NETWORK_TIMEOUT_MS = 3500;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith("passphrasi-") && k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

function isCacheableAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith(BASE + "_next/static/") || SHELL.includes(url.pathname)) &&
    url.pathname !== PAGE
  );
}

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "cache-urls" || !Array.isArray(data.urls)) return;
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        data.urls
          .filter((u) => typeof u === "string" && isCacheableAsset(new URL(u, self.location.origin)))
          .map((u) =>
            cache.match(u).then((hit) => (hit ? null : cache.add(u).catch(() => null)))
          )
      )
    )
  );
});

function networkFirstPage(request) {
  return caches.open(CACHE).then((cache) => {
    const fromNetwork = fetch(request).then((res) => {
      if (res.ok) cache.put(PAGE, res.clone());
      return res;
    });
    const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS));
    const fallback = () => cache.match(PAGE);
    return Promise.race([fromNetwork.catch(() => null), timeout]).then(
      (res) => res || fallback().then((hit) => hit || fromNetwork)
    );
  });
}

function cacheFirst(request) {
  return caches.open(CACHE).then((cache) =>
    cache.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        })
    )
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" && (url.pathname === PAGE || url.pathname + "/" === PAGE)) {
    event.respondWith(networkFirstPage(request));
    return;
  }
  // The explainer video streams with range requests, which the cache can't store.
  if (isCacheableAsset(url) && url.pathname !== BASE + "sw.js" && !url.pathname.endsWith(".mp4")) {
    event.respondWith(cacheFirst(request));
  }
});
