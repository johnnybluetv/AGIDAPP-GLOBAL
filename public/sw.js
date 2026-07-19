const CACHE_NAME = "agid-cache-v1";
const DATA_CACHE_NAME = "agid-data-cache";
const ASSETS = [
  "/",
  "/index.html",
  "/logo.png",
  "/logo.svg",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Listen for metadata updates from the main application to cache tools, favorites, and articles locally
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CACHE_DATA") {
    const { key, data } = event.data;
    event.waitUntil(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        const url = `${self.location.origin}/api/offline-cache/${key}`;
        const response = new Response(JSON.stringify(data), {
          headers: { 
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=31536000"
          }
        });
        return cache.put(url, response);
      })
    );
  }
});

self.addEventListener("fetch", (event) => {
  // Only cache GET requests and ignore chrome-extension URLs or non-http requests
  if (event.request.method !== "GET" || !event.request.url.startsWith("http")) {
    return;
  }

  // Intercept offline mock API endpoints
  if (event.request.url.includes("/api/offline-cache/")) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return cache.match(event.request.url).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return an empty array response if not cached yet
          return new Response(JSON.stringify([]), {
            headers: { "Content-Type": "application/json" }
          });
        });
      })
    );
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return from cache, but update cache in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Ignore background errors */});
        
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(async () => {
        // Fallback to index.html for SPA navigation when offline
        if (event.request.mode === "navigate") {
          const cache = await caches.open(CACHE_NAME);
          return cache.match("/index.html");
        }
      });
    })
  );
});
