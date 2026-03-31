const CACHE_NAME = "training-picker-v5";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css?v=20260331-3",
  "./app.js?v=20260331-3",
  "./manifest.webmanifest?v=20260331-3",
  "./icons/icon.svg?v=20260331-3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const isPageRequest =
    event.request.mode === "navigate" || event.request.destination === "document";
  const sameOrigin = new URL(event.request.url).origin === self.location.origin;
  const isVersionedAsset =
    sameOrigin && ["script", "style", "manifest", "image"].includes(event.request.destination);

  if (isPageRequest || isVersionedAsset) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
            if (isPageRequest) {
              cache.put("./index.html", responseClone.clone());
            }
          });
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
