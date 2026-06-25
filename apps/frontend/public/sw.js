// Runa Service Worker
// Cache-first for static assets, network-first for API/dynamic routes.

const CACHE_NAME = "runa-v1";

const STATIC_ASSETS = [
  "/",
  "/site.webmanifest",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Skip API and Next.js internal routes — always network
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // Only cache successful same-origin responses
          if (response.ok && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback for navigation requests
          if (request.mode === "navigate") {
            return caches.match("/");
          }
        });
    }),
  );
});

// ── Push Notifications (future-proof) ────────────────────────────────────────
// Actual notification dispatch is handled by RrPwaManager in the page context
// via the existing encrypted WebSocket. This handler is kept for future
// server-sent push support. We intentionally do NOT show notifications here
// because all payloads are E2EE and must be decrypted in the page context.
self.addEventListener("push", () => {});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = event.notification.data?.url ?? "/polaris/dash";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(target));
        if (existing) return existing.focus();
        return self.clients.openWindow(target);
      }),
  );
});
