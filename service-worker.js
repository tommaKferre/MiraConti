const CACHE_NAME = 'miraConti-cache-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
];

// Install - cache degli assets
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching assets');
        return cache.addAll(ASSETS).catch(err => {
          console.error('[SW] Cache failed for some assets:', err);
          // Non bloccare l'installazione se alcuni asset non sono disponibili
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate - pulisce vecchie cache
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - strategia: Cache First, fallback a Network
self.addEventListener('fetch', event => {
  // Ignora richieste non-GET e richieste a domini esterni (tranne CDN conosciuti)
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isCDN = url.hostname.includes('googleapis.com') || 
                 url.hostname.includes('gstatic.com') ||
                 url.hostname.includes('cdnjs.cloudflare.com');
  
  // Solo cache per richieste same-origin o CDN conosciuti
  if (!isSameOrigin && !isCDN) return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          // Restituisci dalla cache
          return cached;
        }
        
        // Fetch dalla rete
        return fetch(event.request).then(response => {
          // Se la risposta è valida, mettila in cache
          if (response && response.status === 200 && response.type !== 'opaque') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
      .catch(() => {
        // Fallback per errori di rete
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
  );
});