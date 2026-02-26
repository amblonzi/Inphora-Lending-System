/* eslint-disable no-restricted-globals */

// Dynamic Service Worker for Multi-Client PWA
// Detects brand from hostname and caches accordingly

const getBrand = () => {
  const host = self.location.hostname.toLowerCase();
  if (host.includes('amari')) return 'amari';
  if (host.includes('il.')) return 'il';
  return 'tytahj'; // Correct spelling and better default
};

const brand = getBrand();
const VERSION = 'v2.3'; // Forced refresh for local env
const CACHE_NAME = `inphora-${brand}-${VERSION}`;

const urlsToCache = [
  '/',
  '/index.html',
  `/manifest-${brand}.json`,
  `/${brand}-icon.png`,
  `/${brand}-favicon.png`,
];

// Install event - cache brand-specific resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log(`[${brand}] Caching PWA resources`);
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches
          if (cacheName !== CACHE_NAME) {
            console.log(`[SW:${brand}] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - Robust strategy implementation
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname === '/index.html';

  // Bypass cache for API requests
  if (url.pathname.startsWith('/api')) {
    return;
  }

  // Network First for Navigation and Manifest
  if (isNavigation || url.pathname.includes('manifest')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If successful, update cache and return
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache First for other assets (images, fonts, scripts, styles)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        // Dynamic caching for non-pre-cached assets
        return fetch(event.request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            return networkResponse;
          })
          .catch((err) => {
            console.warn(`[SW:${brand}] Fetch failed for: ${url.pathname}`, err);
            // Return a null or error response instead of throwing
            return new Response(null, { status: 404, statusText: 'Not Found' });
          });
      })
  );
});
