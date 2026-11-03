// =============================================
//  Service Worker — Network-Only (No Caching)
// =============================================

const SW_VERSION = '1.0.0';

// ---------- Install ----------
// Skip waiting to activate immediately
self.addEventListener('install', (event) => {
  console.log(`[SW ${SW_VERSION}] Installed — no caching enabled`);
  self.skipWaiting();
});

// ---------- Activate ----------
// Clean up any old caches from previous versions
self.addEventListener('activate', (event) => {
  console.log(`[SW ${SW_VERSION}] Activated — clearing all caches`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log(`[SW] Deleting cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// ---------- Fetch ----------
// Network-only strategy: always fetch from the network, never cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      // If the request is for a page and the network is unavailable,
      // return a simple offline fallback
      if (event.request.mode === 'navigate') {
        return new Response(
          `<!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Offline — Yorùbá Medicinal</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                background: #0f1a3c;
                color: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                text-align: center;
                padding: 24px;
              }
              .offline-container { max-width: 400px; }
              .offline-icon {
                font-size: 4rem;
                margin-bottom: 24px;
                opacity: 0.6;
              }
              h1 {
                font-size: 1.5rem;
                font-weight: 700;
                margin-bottom: 12px;
              }
              p {
                font-size: 0.95rem;
                color: rgba(160, 174, 212, 0.85);
                line-height: 1.6;
                margin-bottom: 24px;
              }
              button {
                background: #c4953a;
                color: #fff;
                border: none;
                padding: 12px 32px;
                border-radius: 9999px;
                font-size: 0.9rem;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s;
              }
              button:hover { background: #d4a84e; }
            </style>
          </head>
          <body>
            <div class="offline-container">
              <div class="offline-icon">📡</div>
              <h1>You're Offline</h1>
              <p>The Yorùbá Medicinal Dictionary requires an internet connection. Please check your network and try again.</p>
              <button onclick="location.reload()">Try Again</button>
            </div>
          </body>
          </html>`,
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/html' }
          }
        );
      }
      // For non-navigation requests, just let them fail
      return new Response('', { status: 408, statusText: 'Offline' });
    })
  );
});
