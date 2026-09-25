// @ts-check
/**
 * sw.js — Service Worker
 * ──────────────────────
 * Strategy: Cache-first for all static assets.
 * This is a fully offline app — no API calls, no network-first resources.
 *
 * Lifecycle:
 *   install  → pre-cache all app assets
 *   activate → delete old versioned caches
 *   fetch    → serve from cache, fall back to network (then cache the response)
 */

/** @type {ServiceWorkerGlobalScope} */
// @ts-ignore — ServiceWorkerGlobalScope is the correct type for `self` in a SW context
const sw = /** @type {any} */ (self);

const CACHE_VERSION = 'sudoku-v2';

const PRECACHE_ASSETS = [
  './index.html',
  './style.css',
  './dist/main.js',
  './manifest.json',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png'
];

// ─── Install: pre-cache all assets ──────────────────────────────────────────

sw.addEventListener('install', function (/** @type {ExtendableEvent} */ event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(function () {
      // Activate immediately without waiting for existing tabs to close
      return sw.skipWaiting();
    })
  );
});

// ─── Activate: clean up old caches ──────────────────────────────────────────

sw.addEventListener('activate', function (/** @type {ExtendableEvent} */ event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (name) { return name !== CACHE_VERSION; })
          .map(function (name) { return caches.delete(name); })
      );
    }).then(function () {
      // Take control of all open tabs immediately
      return sw.clients.claim();
    })
  );
});

// ─── Fetch: cache-first, network fallback ───────────────────────────────────

sw.addEventListener('fetch', function (/** @type {FetchEvent} */ event) {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function (cachedResponse) {
      if (cachedResponse) {
        return cachedResponse;
      }

      // Not in cache — fetch from network and cache for next time
      return fetch(event.request).then(function (networkResponse) {
        // Only cache successful same-origin responses
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          var responseToCache = networkResponse.clone();
          caches.open(CACHE_VERSION).then(function (cache) {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    }).catch(function () {
      // Both cache and network failed — return offline fallback for navigation
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
