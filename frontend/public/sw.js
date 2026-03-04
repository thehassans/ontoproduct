// High-Performance Service Worker for BuySial Commerce
// Optimized for speed, caching, and offline support
const CACHE_NAME = 'buysial-v9'
const API_CACHE_NAME = 'buysial-api-v1'
const IMAGE_CACHE_NAME = 'buysial-images-v1'

// Critical resources to pre-cache
const SHELL = [
  '/manifest.webmanifest',
  '/placeholder-product.svg',
]

// API endpoints to cache (with short TTL)
const CACHEABLE_API = [
  '/api/products/public',
  '/api/settings/website/banners',
  '/api/products/public/categories-usage',
]

// Cache TTL in milliseconds
const API_CACHE_TTL = 2 * 60 * 1000 // 2 minutes for API
const IMAGE_CACHE_MAX = 200 // Max images to cache

self.addEventListener('install', (e) => {
  console.log('[SW] Installing service worker v9')
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  console.log('[SW] Activating service worker v9')
  e.waitUntil(
    caches.keys().then((keys) => {
      // Delete all old caches
      return Promise.all(keys.map((k) => {
        if (k !== CACHE_NAME) {
          console.log('[SW] Deleting old cache:', k)
          return caches.delete(k)
        }
      }))
    }).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  
  // Never cache API calls, Socket.IO, or uploads
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io') || url.pathname.startsWith('/uploads/')) {
    return
  }
  
  if (e.request.method === 'GET' && url.origin === self.location.origin) {
    const isHTML = e.request.destination === 'document' || url.pathname === '/' || url.pathname.endsWith('.html')
    const isAsset = /\.(js|css|woff2?|ttf|eot)$/i.test(url.pathname)
    
    // Network-first for HTML (always get fresh app shell)
    if (isHTML) {
      e.respondWith((async () => {
        try {
          const res = await fetch(e.request, { 
            cache: 'no-cache',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          })
          if (res.ok) {
            // Cache the successful HTML response
            const cache = await caches.open(CACHE_NAME)
            cache.put(e.request, res.clone()).catch(() => {})
          }
          return res
        } catch (err) {
          console.warn('[SW] Network failed for HTML, using cache fallback:', err.message)
          const cached = await caches.match(e.request)
          if (cached) {
            console.log('[SW] Serving HTML from cache')
            return cached
          }
          console.error('[SW] No cached HTML available')
          return new Response('Offline - Please check your connection', { 
            status: 503, 
            headers: { 'Content-Type': 'text/html' } 
          })
        }
      })())
      return
    }
    
    // Cache-first for assets (JS, CSS, fonts)
    if (isAsset) {
      e.respondWith((async () => {
        const cached = await caches.match(e.request)
        if (cached) return cached
        try {
          const res = await fetch(e.request)
          if (res.ok) {
            const cache = await caches.open(CACHE_NAME)
            cache.put(e.request, res.clone()).catch(() => {})
          }
          return res
        } catch {
          return new Response('', { status: 404 })
        }
      })())
      return
    }
    
    // Images: cache-first with placeholder fallback
    const isImage = e.request.destination === 'image' || /\.(png|jpe?g|gif|svg|webp)$/i.test(url.pathname)
    if (isImage) {
      e.respondWith((async () => {
        const cached = await caches.match(e.request)
        if (cached) return cached
        try {
          const res = await fetch(e.request)
          if (res.ok) {
            const cache = await caches.open(CACHE_NAME)
            cache.put(e.request, res.clone()).catch(() => {})
          }
          return res
        } catch {
          const ph = await caches.match('/placeholder-product.svg')
          if (ph) return ph
          const tiny = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'
          return new Response(tiny, { headers: { 'Content-Type': 'image/svg+xml' } })
        }
      })())
    }
  }
})
