/**
 * Minimal service worker: caches the app shell (HTML/CSS/JS/icons) so the app still opens offline
 * on iOS/Android home screens, but never caches API calls — report data always comes fresh from
 * the network when available.
 */
const CACHE_NAME = "tma-app-shell-v1";
const SHELL_ASSETS = [
  "./index.html",
  "./app.css",
  "./app.js",
  "./manifest.webmanifest",
  "../assets/images/tma-logo.jpeg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Never cache API calls (any other origin, i.e. the configured TMA server) — those must always
  // hit the network so report data doesn't go stale.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
