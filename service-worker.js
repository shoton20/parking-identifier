/**
 * Service Worker for ParkingPal Lite
 * Handles offline functionality and caching
 */

const CACHE_NAME = 'parkingpal-v1';
const STATIC_CACHE = 'parkingpal-static-v1';
const MAP_CACHE = 'parkingpal-maps-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
    '/parking-identifier/',
    '/parking-identifier/index.html',
    '/parking-identifier/styles/main.css',
    '/parking-identifier/scripts/app.js',
    '/parking-identifier/scripts/services/location.js',
    '/parking-identifier/scripts/services/photo.js',
    '/parking-identifier/scripts/services/storage.js',
    '/parking-identifier/scripts/services/map.js',
    '/parking-identifier/scripts/services/timer.js',
    '/parking-identifier/scripts/services/notification.js',
    '/parking-identifier/scripts/services/navigation.js',
    '/parking-identifier/scripts/managers/session.js',
    '/parking-identifier/scripts/managers/offline.js',
    '/parking-identifier/scripts/managers/pwa-install.js',
    '/parking-identifier/manifest.json',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[Service Worker] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[Service Worker] Static assets cached');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[Service Worker] Failed to cache static assets:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== STATIC_CACHE && name !== MAP_CACHE)
                        .map(name => {
                            console.log('[Service Worker] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[Service Worker] Activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Map tiles - cache first, then network
    if (url.hostname.includes('tile.openstreetmap.org')) {
        event.respondWith(
            caches.open(MAP_CACHE)
                .then(cache => cache.match(request))
                .then(response => {
                    if (response) {
                        return response;
                    }
                    
                    return fetch(request).then(networkResponse => {
                        // Cache the tile for offline use
                        if (networkResponse && networkResponse.status === 200) {
                            caches.open(MAP_CACHE).then(cache => {
                                cache.put(request, networkResponse.clone());
                            });
                        }
                        return networkResponse;
                    });
                })
                .catch(() => {
                    // Return placeholder or error tile
                    return new Response('Tile unavailable offline', { 
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                })
        );
        return;
    }
    
    // Static assets - cache first, fallback to network
    event.respondWith(
        caches.match(request)
            .then(response => {
                if (response) {
                    return response;
                }
                
                return fetch(request).then(networkResponse => {
                    // Cache new assets
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(STATIC_CACHE).then(cache => {
                            cache.put(request, networkResponse.clone());
                        });
                    }
                    return networkResponse;
                });
            })
            .catch(() => {
                // Return offline page if available
                if (request.mode === 'navigate') {
                    return caches.match('/parking-identifier/offline.html').then(response => {
                        return response || new Response('Offline', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
                }
            })
    );
});

// Message event - handle messages from app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
