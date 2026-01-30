/**
 * Service Worker for OpenWork Web
 *
 * Provides:
 * - Offline support with cache-first strategy
 * - Auto-updates for new versions
 * - Background sync for pending operations
 * - Asset caching and optimization
 */

/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = "v1.0.0";
const CACHE_NAME = `openwork-${CACHE_VERSION}`;

// Assets to cache on install
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/favicon.ico",
];

// Cache strategies
const CACHE_FIRST = ["/assets/", "/icons/"];
const NETWORK_FIRST = ["/api/"];

/**
 * Install event - cache static assets
 */
self.addEventListener("install", (event: ExtendableEvent) => {
  console.log(`[SW] Installing version ${CACHE_VERSION}`);

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(STATIC_ASSETS);
        console.log("[SW] Static assets cached");

        // Skip waiting to activate immediately
        await self.skipWaiting();
      } catch (error) {
        console.error("[SW] Installation failed:", error);
      }
    })(),
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener("activate", (event: ExtendableEvent) => {
  console.log(`[SW] Activating version ${CACHE_VERSION}`);

  event.waitUntil(
    (async () => {
      try {
        // Delete old caches
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name.startsWith("openwork-"))
            .map((name) => {
              console.log(`[SW] Deleting old cache: ${name}`);
              return caches.delete(name);
            }),
        );

        // Take control of all clients immediately
        await self.clients.claim();
        console.log("[SW] Activated and claimed clients");
      } catch (error) {
        console.error("[SW] Activation failed:", error);
      }
    })(),
  );
});

/**
 * Fetch event - handle network requests with caching
 */
self.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Determine strategy based on URL
  if (shouldCacheFirst(url.pathname)) {
    event.respondWith(cacheFirst(request));
  } else if (shouldNetworkFirst(url.pathname)) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});

/**
 * Check if URL should use cache-first strategy
 */
function shouldCacheFirst(pathname: string): boolean {
  return CACHE_FIRST.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Check if URL should use network-first strategy
 */
function shouldNetworkFirst(pathname: string): boolean {
  return NETWORK_FIRST.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Cache-first strategy
 * Try cache first, fallback to network
 */
async function cacheFirst(request: Request): Promise<Response> {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error("[SW] Cache-first fetch failed:", error);
    return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
  }
}

/**
 * Network-first strategy
 * Try network first, fallback to cache
 */
async function networkFirst(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    console.error("[SW] Network-first fetch failed:", error);
    return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
  }
}

/**
 * Message event - handle commands from clients
 */
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  const { data } = event;

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (data.type === "GET_VERSION") {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }

  if (data.type === "CLEAR_CACHE") {
    event.waitUntil(
      (async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
        event.ports[0].postMessage({ success: true });
      })(),
    );
  }
});

/**
 * Background sync event - handle offline operations
 */
self.addEventListener("sync", (event: any) => {
  if (event.tag === "sync-sessions") {
    event.waitUntil(syncSessions());
  }
});

/**
 * Sync pending session data
 */
async function syncSessions(): Promise<void> {
  try {
    // TODO: Implement session sync logic
    console.log("[SW] Syncing sessions");
  } catch (error) {
    console.error("[SW] Session sync failed:", error);
  }
}

/**
 * Push event - handle push notifications (future)
 */
self.addEventListener("push", (event: PushEvent) => {
  const data = event.data?.json() ?? {};

  const options: NotificationOptions = {
    body: data.body || "New notification from OpenWork",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    data: data.data,
  };

  event.waitUntil(self.registration.showNotification(data.title || "OpenWork", options));
});

/**
 * Notification click event
 */
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url === self.location.origin && "focus" in client) {
          return (client as WindowClient).focus();
        }
      }

      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow("/");
      }
    }),
  );
});

export {};
