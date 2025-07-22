// RUDEBOY PWA Service Worker
// Version 1.0.0 - Advanced Caching & Performance

const CACHE_NAME = 'rudeboy-v1.0.0';
const RUNTIME_CACHE = 'rudeboy-runtime-v1.0.0';

// Critical resources to cache immediately
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/shop.html',
  '/contact.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
  'https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff2'
];

// Resources to cache on demand
const RUNTIME_ASSETS = [
  '/collections.html',
  '/checkout.html',
  '/project.html'
];

// Network timeout for fetch requests
const NETWORK_TIMEOUT = 3000;

// Install event - cache core assets
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching core assets');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Core assets cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Failed to cache core assets:', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Cache cleanup completed');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except fonts)
  if (url.origin !== location.origin && !url.hostname.includes('fonts.g')) {
    return;
  }

  event.respondWith(handleRequest(request));
});

// Main request handler with smart caching strategies
async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Strategy 1: Cache First (for core assets)
    if (isCoreAsset(request.url)) {
      return await cacheFirst(request);
    }
    
    // Strategy 2: Network First (for HTML pages)
    if (isHTMLPage(request.url)) {
      return await networkFirst(request);
    }
    
    // Strategy 3: Stale While Revalidate (for images and other assets)
    if (isAsset(request.url)) {
      return await staleWhileRevalidate(request);
    }
    
    // Strategy 4: Network Only (for API calls and external resources)
    return await networkOnly(request);
    
  } catch (error) {
    console.error('[SW] Request failed:', error);
    return await handleOfflineRequest(request);
  }
}

// Cache First Strategy - for critical assets
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  
  const response = await fetchWithTimeout(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

// Network First Strategy - for dynamic content
async function networkFirst(request) {
  try {
    const response = await fetchWithTimeout(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Stale While Revalidate Strategy - for images and assets
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  
  const fetchPromise = fetchWithTimeout(request)
    .then(response => {
      if (response.ok) {
        const cache = caches.open(RUNTIME_CACHE);
        cache.then(c => c.put(request, response.clone()));
      }
      return response;
    })
    .catch(error => {
      console.warn('[SW] Network fetch failed:', error);
      return cached;
    });
  
  return cached || fetchPromise;
}

// Network Only Strategy - for external resources
async function networkOnly(request) {
  return await fetchWithTimeout(request);
}

// Fetch with timeout to prevent hanging
function fetchWithTimeout(request, timeout = NETWORK_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Network request timeout'));
    }, timeout);
    
    fetch(request)
      .then(response => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

// Handle offline requests with fallbacks
async function handleOfflineRequest(request) {
  const url = new URL(request.url);
  
  // Return cached version if available
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  
  // Fallback for HTML pages
  if (isHTMLPage(request.url)) {
    const fallback = await caches.match('/');
    if (fallback) {
      return fallback;
    }
  }
  
  // Return offline page or generic response
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'Content not available offline'
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}

// Utility functions for request classification
function isCoreAsset(url) {
  return CORE_ASSETS.some(asset => url.includes(asset)) ||
         url.includes('fonts.g');
}

function isHTMLPage(url) {
  return url.endsWith('.html') || 
         url.endsWith('/') ||
         (!url.includes('.') && !url.includes('api'));
}

function isAsset(url) {
  return /\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf)$/i.test(url);
}

// Background sync for failed requests (when available)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  console.log('[SW] Performing background sync');
  // Implement background sync logic here
  // e.g., retry failed form submissions, sync offline data
}

// Push notification handler (when implemented)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      vibrate: [100, 50, 100],
      data: data.data,
      actions: [
        {
          action: 'open',
          title: 'Open App',
          icon: '/icon-open.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icon-close.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Performance monitoring
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    getCacheSize().then(size => {
      event.ports[0].postMessage({ cacheSize: size });
    });
  }
});

// Get cache size for performance monitoring
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const size = (await response.blob()).size;
        totalSize += size;
      }
    }
  }
  
  return totalSize;
}

// Cleanup old caches periodically
setInterval(async () => {
  const cacheNames = await caches.keys();
  const cachePromises = cacheNames.map(async (cacheName) => {
    if (cacheName.includes('rudeboy') && cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
      console.log('[SW] Cleaning up old cache:', cacheName);
      return caches.delete(cacheName);
    }
  });
  
  await Promise.all(cachePromises);
}, 24 * 60 * 60 * 1000); // Daily cleanup

console.log('[SW] Service worker loaded successfully');