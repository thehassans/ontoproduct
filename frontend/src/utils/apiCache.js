/**
 * API Request Cache & Deduplication Utility
 * Prevents duplicate API calls and caches responses for faster loads
 */

// In-memory cache with TTL
const cache = new Map()
const pendingRequests = new Map()

// Default cache duration: 5 minutes
const DEFAULT_TTL = 5 * 60 * 1000

/**
 * Get cached data if valid
 */
export function getFromCache(key) {
  const cached = cache.get(key)
  if (!cached) return null
  
  if (Date.now() > cached.expiry) {
    cache.delete(key)
    return null
  }
  
  return cached.data
}

/**
 * Set data in cache with TTL
 */
export function setInCache(key, data, ttl = DEFAULT_TTL) {
  cache.set(key, {
    data,
    expiry: Date.now() + ttl,
    timestamp: Date.now()
  })
}

/**
 * Clear specific cache key or pattern
 */
export function clearCache(pattern) {
  if (!pattern) {
    cache.clear()
    return
  }
  
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key)
    }
  }
}

/**
 * Deduplicated fetch - prevents multiple identical requests
 * If a request is already in flight, returns the same promise
 */
export async function deduplicatedFetch(url, options = {}) {
  const cacheKey = `${options.method || 'GET'}:${url}:${JSON.stringify(options.body || '')}`
  
  // Check cache first (only for GET requests)
  if (!options.method || options.method === 'GET') {
    const cached = getFromCache(cacheKey)
    if (cached) {
      return cached
    }
  }
  
  // Check if request is already pending
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)
  }
  
  // Create new request
  const requestPromise = fetch(url, options)
    .then(async (response) => {
      const data = await response.json()
      
      // Cache successful GET responses
      if (response.ok && (!options.method || options.method === 'GET')) {
        setInCache(cacheKey, data, options.cacheTTL || DEFAULT_TTL)
      }
      
      return data
    })
    .finally(() => {
      pendingRequests.delete(cacheKey)
    })
  
  pendingRequests.set(cacheKey, requestPromise)
  return requestPromise
}

/**
 * Preload critical data for faster page loads
 */
export function preloadData(urls) {
  urls.forEach(url => {
    // Use low priority fetch to not block main content
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        deduplicatedFetch(url).catch(() => {})
      })
    } else {
      setTimeout(() => {
        deduplicatedFetch(url).catch(() => {})
      }, 100)
    }
  })
}

/**
 * Cache statistics for debugging
 */
export function getCacheStats() {
  const stats = {
    size: cache.size,
    pendingRequests: pendingRequests.size,
    entries: []
  }
  
  cache.forEach((value, key) => {
    stats.entries.push({
      key: key.substring(0, 50),
      age: Math.round((Date.now() - value.timestamp) / 1000) + 's',
      expires: Math.round((value.expiry - Date.now()) / 1000) + 's'
    })
  })
  
  return stats
}

// Expose for debugging in development
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  window.__apiCache = { cache, pendingRequests, getCacheStats, clearCache }
}

export default {
  getFromCache,
  setInCache,
  clearCache,
  deduplicatedFetch,
  preloadData,
  getCacheStats
}
