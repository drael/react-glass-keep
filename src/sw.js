import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL, matchPrecache } from 'workbox-precaching';
import { registerRoute, NavigationRoute, setCatchHandler } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { skipWaiting, clientsClaim } from 'workbox-core';

skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(
  new NavigationRoute(
    createHandlerBoundToURL('/index.html'),
    { allowlist: [/^\/$/, /^\/index\.html$/] }
  )
);

setCatchHandler(async ({ event }) => {
  try {
    const cached = await matchPrecache('/index.html');
    if (cached) return cached;
    return new Response('Offline', { status: 503 });
  } catch {
    return new Response('Offline', { status: 503 });
  }
});

registerRoute(
  /^https?:\/\/.*\/api\/notes.*$/,
  new NetworkFirst({
    cacheName: 'notes-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 86400 })
    ]
  })
);

registerRoute(
  /^https?:\/\/.*\/api\/.*$/,
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 3600 })
    ]
  })
);
