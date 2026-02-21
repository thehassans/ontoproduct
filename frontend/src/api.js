export const API_BASE = (() => {
  const raw = import.meta.env.VITE_API_BASE ?? ''
  let base = String(raw).trim()
  // Treat empty or '/' as same-origin root
  if (base === '' || base === '/') base = ''
  // If someone accidentally sets 'http:' or 'https:' (no host), fallback to same-origin
  if (/^https?:\/?$/.test(base)) base = ''
  // Localhost fallback or default path-prefix for production
  try {
    if (!base && typeof window !== 'undefined') {
      const host = String(window.location.hostname || '')
      const port = String(window.location.port || '')
      
      // Heuristic: If localhost but NOT running on standard Dev ports (5173, 3000)
      // and NOT providing its own API (port 4000), it's likely the Mobile App shell.
      // Capacitor usually serves on http://localhost (port 80/implicit)
      const isDevPort = port === '5173' || port === '3000' || port === '4000'
      const isLocalhost = /^localhost$|^127\.0\.0\.1$/.test(host)
      
      // Also check explicit Capacitor object
      const isCapacitor = typeof window.Capacitor !== 'undefined'

      if (isCapacitor || (isLocalhost && !isDevPort)) {
          base = 'https://buysial.com/api'
      } else {
          base = isLocalhost ? 'http://localhost:4000' : '/api'
      }
    }
  } catch {}
  // If provided as relative without leading slash (e.g., 'api'), fix it
  if (base && !/^https?:\/\//i.test(base) && !base.startsWith('/')) base = '/' + base
  // Remove trailing slash
  if (base.endsWith('/')) base = base.slice(0, -1)
  return base
})()

export const MEDIA_BASE_EXPLICIT = (() => {
  const raw = import.meta.env.VITE_MEDIA_BASE ?? ''
  const explicit = String(raw).trim()
  if (!explicit) return ''
  try {
    if (/^https?:\/\//i.test(explicit)) return explicit.replace(/\/$/, '')
    return explicit.startsWith('/') ? explicit.replace(/\/$/, '') : '/' + explicit.replace(/\/$/, '')
  } catch {
    return explicit
  }
})()

export const UPLOADS_BASE = (() => {
  const raw = import.meta.env.VITE_UPLOADS_BASE ?? ''
  const explicit = String(raw).trim()
  if (!explicit) return ''
  try {
    let v = explicit.replace(/\/$/, '')
    if (v.toLowerCase().endsWith('/uploads')) v = v.slice(0, -8)
    if (/^https?:\/\//i.test(v)) return v
    return v.startsWith('/') ? v : '/' + v
  } catch {
    return explicit
  }
})()

export const MEDIA_BASE = (() => {
  const raw = import.meta.env.VITE_MEDIA_BASE ?? ''
  const explicit = String(raw).trim()
  if (explicit) {
    try {
      if (/^https?:\/\//i.test(explicit)) return explicit.replace(/\/$/, '')
      return explicit.startsWith('/') ? explicit.replace(/\/$/, '') : '/' + explicit.replace(/\/$/, '')
    } catch {
      return explicit
    }
  }
  try {
    const base = String(API_BASE || '').trim()
    if (!base) return ''
    if (/^https?:\/\//i.test(base)) {
      const u = new URL(base)
      return u.origin
    }
    return ''
  } catch {
    return ''
  }
})()

export function mediaUrl(input) {
  const raw = String(input ?? '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  let u = raw.replace(/\\/g, '/').trim()
  if (!u) return ''

  // Uploads should be fetched through API_BASE when present (e.g. '/api/uploads/...')
  // because many deployments only proxy '/api' to Node.
  const apiBase = String(API_BASE || '').trim()
  const mediaBase = String(MEDIA_BASE || '').trim()
  const uploadsBase = String(UPLOADS_BASE || MEDIA_BASE_EXPLICIT || '').trim() || apiBase || mediaBase

  if (u.startsWith('/api/uploads/')) {
    if (UPLOADS_BASE || MEDIA_BASE_EXPLICIT) return `${uploadsBase}/uploads/${u.slice(13)}`
    if (!apiBase) return `${mediaBase}${u}`
    return `${apiBase}${u.slice(4)}`
  }
  if (u.startsWith('api/uploads/')) {
    if (UPLOADS_BASE || MEDIA_BASE_EXPLICIT) return `${uploadsBase}/uploads/${u.slice(12)}`
    if (!apiBase) return `${mediaBase}/${u}`
    return `${apiBase}/${u.slice(4)}`
  }

  if (u.startsWith('/uploads/')) return `${uploadsBase}/uploads/${u.slice(9)}`
  if (u.startsWith('uploads/')) return `${uploadsBase}/uploads/${u.slice(8)}`

  // Non-upload absolute paths (e.g. '/banners/banner1.jpg') should remain same-origin
  if (u.startsWith('/')) return `${MEDIA_BASE}${u}`

  if (!u.includes('/') && /^banner-/i.test(u)) return `${uploadsBase}/uploads/banners/${u}`
  return `${uploadsBase}/uploads/${u}`
}

function buildUrl(path) {
  let p = String(path || '')
  if (!p.startsWith('/')) p = '/' + p
  try {
    const base = String(API_BASE || '').trim()
    if (!base) return p
    // If base has '/api' as its pathname, avoid double '/api' in requests
    let basePath = base
    let origin = ''
    if (/^https?:\/\//i.test(base)) {
      const u = new URL(base)
      origin = u.origin
      basePath = u.pathname || ''
    }
    basePath = basePath.replace(/\/$/, '')
    if (basePath === '/api' && p.startsWith('/api/')) {
      p = p.slice(4) // remove leading '/api'
    }
    const prefix = basePath && basePath !== '/' ? basePath : ''
    return `${origin}${prefix}${p}` || p
  } catch {
    return p
  }
}

// Helpers for resilient POSTs (login/register):
function genIdempotencyKey() {
  try {
    const arr = new Uint8Array(16)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(arr)
    else for (let i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256)
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return String(Date.now()) + '-' + Math.random().toString(36).slice(2)
  }
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchWithPostResilience(
  url,
  init,
  { retries = 0, timeoutMs = 12000, retryHttpOn = [] } = {}
) {
  let attempt = 0
  let delay = 400
  while (true) {
    const controller = new AbortController()
    const timer = setTimeout(
      () => {
        try {
          controller.abort()
        } catch {}
      },
      Math.max(1000, timeoutMs)
    )
    try {
      const res = await fetch(url, { ...init, signal: controller.signal })
      clearTimeout(timer)
      if (attempt < retries && retryHttpOn && retryHttpOn.includes(res.status)) {
        await wait(delay)
        attempt++
        delay = Math.min(delay * 2, 2500)
        continue
      }
      return res
    } catch (err) {
      clearTimeout(timer)
      const msg = String((err && err.message) || '')
      const isNet =
        /network|abort|failed to fetch|TypeError|load failed|incomplete envelope|ECONN|EHOST|EPIPE|TLS|connection reset|timeout/i.test(
          msg
        )
      if (attempt < retries && isNet) {
        await wait(delay)
        attempt++
        delay = Math.min(delay * 2, 2500)
        continue
      }
      // Persist error and rethrow
      try {
        appendErrorLog({ url, message: msg, phase: 'post', attempt })
      } catch {}
      throw err
    }
  }
}

// Pluggable token getter for async auth (e.g., Shopify Session Tokens)
let tokenGetter = null

/**
 * Register a function to retrieve the auth token asynchronously
 * @param {Function} fn - Async function that returns the token string
 */
export function setTokenGetter(fn) {
  tokenGetter = fn
}

async function authHeader() {
  let token = null
  
  // Try pluggable getter first (for App Bridge)
  if (tokenGetter) {
    try {
      token = await tokenGetter()
    } catch (err) {
      console.warn('Failed to get token from registered getter:', err)
    }
  }
  
  // Fallback to local storage (standard login)
  if (!token) {
    token = localStorage.getItem('token')
  }
  
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Optional toast helpers (kept for compatibility, no-ops here)
function toastError(_message) {
  /* suppressed globally */
}
function toastInfo(_message) {
  /* suppressed globally */
}

// Lightweight persistent error log in localStorage
function appendErrorLog(entry) {
  try {
    const key = 'error_logs'
    const prev = JSON.parse(localStorage.getItem(key) || '[]')
    const now = Date.now()
    const item = { ts: now, ...entry }
    const next = [item, ...prev].slice(0, 200) // cap to last 200
    localStorage.setItem(key, JSON.stringify(next))
  } catch {}
}

async function handle(res) {
  if (res.ok) return res
  // Centralize auth failures: clear token and redirect to login
  // But ONLY for protected areas, not public e-commerce pages
  if (res.status === 401) {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('me')
    } catch {}
    // Determine which login page to redirect to
    const path = location.pathname || ''
    // Public e-commerce pages should NOT redirect on 401
    const isPublicEcommerce = path === '/' || 
                               path.startsWith('/catalog') || 
                               path.startsWith('/product') ||
                               path.startsWith('/categories') ||
                               path.startsWith('/about') ||
                               path.startsWith('/contact')
    // Only redirect for protected areas that require login
    const isProtectedCustomer = path.startsWith('/customer')
    const isProtectedAdmin = path.startsWith('/user') || 
                             path.startsWith('/admin') ||
                             path.startsWith('/manager') ||
                             path.startsWith('/driver') ||
                             path.startsWith('/investor')
    
    if (isProtectedCustomer && !path.includes('/login')) {
      location.href = '/customer/login'
    } else if (isProtectedAdmin && !path.includes('/login')) {
      location.href = '/login'
    }
    // For public pages, don't redirect - just let it fail silently
  }
  // Prefer JSON error bodies
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    let body = null
    try {
      body = await res.clone().json()
    } catch {}
    if (body) {
      const msg = body?.error || body?.message || `HTTP ${res.status}`
      const e = new Error(msg)
      try {
        e.status = res.status
      } catch {}
      try {
        const ra = res.headers.get('retry-after')
        if (ra) {
          let ms = 0
          if (/^\d+$/.test(ra.trim())) ms = parseInt(ra.trim(), 10) * 1000
          else {
            const when = Date.parse(ra)
            if (!Number.isNaN(when)) ms = Math.max(0, when - Date.now())
          }
          if (ms) e.retryAfterMs = ms
        }
      } catch {}
      // Persist error log (no toasts)
      try {
        appendErrorLog({ url: res.url || null, status: res.status, message: msg, body })
      } catch {}
      throw e
    }
  }
  // Fallback: text/HTML error pages (reverse proxies or unhandled middleware)
  const raw = await res.text()
  const looksHtml = ct.includes('text/html') || /^\s*<!DOCTYPE|^\s*<html/i.test(raw || '')
  const stripHtml = (s) =>
    String(s || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  let friendly = ''
  if (res.status === 413) friendly = 'Upload too large. Please try a smaller file.'
  else if (res.status === 502 || res.status === 504)
    friendly = 'Server temporarily unavailable. Please try again.'
  else if (res.status >= 500) friendly = 'Internal server error. Please try again.'
  const text = looksHtml
    ? friendly || `HTTP ${res.status}`
    : stripHtml(raw) || friendly || `HTTP ${res.status}`
  const e = new Error(text)
  try {
    e.status = res.status
  } catch {}
  try {
    const ra = res.headers.get('retry-after')
    if (ra) {
      let ms = 0
      if (/^\d+$/.test(ra.trim())) ms = parseInt(ra.trim(), 10) * 1000
      else {
        const when = Date.parse(ra)
        if (!Number.isNaN(when)) ms = Math.max(0, when - Date.now())
      }
      if (ms) e.retryAfterMs = ms
    }
  } catch {}
  // Persist error log (no toasts)
  try {
    appendErrorLog({ url: res.url || null, status: res.status, message: text, html: looksHtml })
  } catch {}
  throw e
}

// Simple in-memory cache for GET requests
const apiCache = new Map()
const CACHE_TTL = 30000 // 30 seconds cache

export async function apiGet(path, opt = {}) {
  const cacheKey = path
  const skipCache = opt.skipCache || false
  
  // Check cache first for faster response
  if (!skipCache && apiCache.has(cacheKey)) {
    const cached = apiCache.get(cacheKey)
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }
    apiCache.delete(cacheKey)
  }
  
  const headers = await authHeader()
  const res = await fetchWithRetry(
    buildUrl(path),
    { headers: { 'Content-Type': 'application/json', ...headers }, signal: opt.signal },
    { method: 'GET' }
  )
  await handle(res)
  const data = await res.json()
  
  // Cache the response
  if (!skipCache) {
    apiCache.set(cacheKey, { data, timestamp: Date.now() })
  }
  
  return data
}

// Clear cache (useful when data is updated)
export function clearApiCache(pathPrefix) {
  if (pathPrefix) {
    for (const key of apiCache.keys()) {
      if (key.startsWith(pathPrefix)) {
        apiCache.delete(key)
      }
    }
  } else {
    apiCache.clear()
  }
}

export async function apiPost(path, body) {
  const url = buildUrl(path)
  const isLogin =
    /\/auth\/login$/.test(path) || /\/api\/auth\/login$/.test(path) || path.includes('/auth/login')
  const isAI = path.includes('/generate-description') || path.includes('/images/ai')
  
  const authHeaders = await authHeader()
  const headers = { 'Content-Type': 'application/json', ...authHeaders }
  const init = {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    keepalive: true,
    cache: 'no-store',
  }
  // Retries: login (safe) up to 2 on network errors/502-504
  // Timeout: AI requests need longer (60s), others 12s
  const retries = isLogin ? 2 : 0
  const timeoutMs = isAI ? 60000 : 12000
  const res = await fetchWithPostResilience(url, init, {
    retries,
    timeoutMs,
    retryHttpOn: isLogin ? [502, 503, 504] : [],
  })
  await handle(res)
  return res.json()
}

export async function apiUpload(path, formData, maxRetries = 2) {
  const headers = await authHeader()
  let lastError = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 900000) // 15 min timeout for large files
      
      const res = await fetch(buildUrl(path), {
        method: 'POST',
        headers: { ...headers },
        body: formData,
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      // Retry on 502/504 errors
      if ((res.status === 502 || res.status === 504) && attempt < maxRetries) {
        console.log(`[apiUpload] Attempt ${attempt} got ${res.status}, retrying...`)
        await new Promise(r => setTimeout(r, 2000))
        continue
      }
      
      await handle(res)
      return res.json()
    } catch (err) {
      lastError = err
      if (err.name === 'AbortError') {
        lastError = new Error('Upload timed out. Please try with smaller files or check your connection.')
      }
      if (attempt < maxRetries) {
        console.log(`[apiUpload] Attempt ${attempt} failed, retrying...`)
        await new Promise(r => setTimeout(r, 2000))
      }
    }
  }
  
  throw lastError
}

/**
 * Upload with progress tracking
 * @param {string} path - API endpoint path
 * @param {FormData} formData - Form data to upload
 * @param {function} onProgress - Progress callback: ({ loaded, total, percent, speed, eta })
 * @returns {Promise<object>} - Response JSON
 */
export function apiUploadWithProgress(path, formData, onProgress) {
  return new Promise(async (resolve, reject) => {
    const headers = await authHeader()
    const url = buildUrl(path)
    
    const xhr = new XMLHttpRequest()
    let startTime = Date.now()
    let lastLoaded = 0
    let lastTime = startTime
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const now = Date.now()
        const timeDiff = (now - lastTime) / 1000 // seconds
        const loadedDiff = e.loaded - lastLoaded
        
        // Calculate speed (bytes per second)
        const speed = timeDiff > 0 ? loadedDiff / timeDiff : 0
        
        // Calculate ETA (seconds remaining)
        const remaining = e.total - e.loaded
        const eta = speed > 0 ? remaining / speed : 0
        
        lastLoaded = e.loaded
        lastTime = now
        
        onProgress({
          loaded: e.loaded,
          total: e.total,
          percent: Math.round((e.loaded / e.total) * 100),
          speed: speed,
          eta: eta,
        })
      }
    })
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText)
          resolve(data)
        } catch {
          resolve({ success: true })
        }
      } else {
        let errorMsg = `Upload failed: HTTP ${xhr.status}`
        try {
          const errorData = JSON.parse(xhr.responseText)
          errorMsg = errorData.message || errorData.error || errorMsg
        } catch {}
        reject(new Error(errorMsg))
      }
    })
    
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed. Please check your connection.'))
    })
    
    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'))
    })
    
    xhr.addEventListener('timeout', () => {
      reject(new Error('Upload timed out. Please try with smaller files.'))
    })
    
    xhr.open('POST', url)
    xhr.timeout = 900000 // 15 min timeout for large files
    
    // Set auth header
    if (headers.Authorization) {
      xhr.setRequestHeader('Authorization', headers.Authorization)
    }
    
    xhr.send(formData)
  })
}

/**
 * Format bytes to human readable string
 * @param {number} bytes 
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format seconds to human readable time
 * @param {number} seconds 
 * @returns {string}
 */
export function formatETA(seconds) {
  if (!seconds || seconds < 0) return '--'
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

export async function apiGetBlob(path) {
  const headers = await authHeader()
  const res = await fetchWithRetry(
    buildUrl(path),
    { headers: { ...headers } },
    { method: 'GET' }
  )
  await handle(res)
  return res.blob()
}

export async function apiPatch(path, body, maxRetries = 3) {
  const headers = await authHeader()
  let lastError = null
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 90000)
      const res = await fetch(buildUrl(path), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if ((res.status === 502 || res.status === 504) && attempt < maxRetries) {
        console.log(`[apiPatch] Attempt ${attempt} got ${res.status}, retrying...`)
        await new Promise(r => setTimeout(r, 2000 * attempt))
        continue
      }
      await handle(res)
      return res.json()
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.')
      }
      lastError = err
      if (attempt < maxRetries) {
        console.log(`[apiPatch] Attempt ${attempt} failed, retrying...`)
        await new Promise(r => setTimeout(r, 2000 * attempt))
      }
    }
  }
  throw lastError
}

export async function apiPut(path, body) {
  const headers = await authHeader()
  const res = await fetch(buildUrl(path), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  await handle(res)
  return res.json()
}

export async function apiDelete(path) {
  const headers = await authHeader()
  const res = await fetch(buildUrl(path), { method: 'DELETE', headers: { ...headers } })
  await handle(res)
  return res.json()
}

export async function apiUploadPatch(path, formData, maxRetries = 3) {
  const headers = await authHeader()
  let lastError = null
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000)
      const res = await fetch(buildUrl(path), {
        method: 'PATCH',
        headers: { ...headers },
        body: formData,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if ((res.status === 502 || res.status === 504) && attempt < maxRetries) {
        console.log(`[apiUploadPatch] Attempt ${attempt} got ${res.status}, retrying...`)
        await new Promise(r => setTimeout(r, 2000 * attempt))
        continue
      }
      await handle(res)
      return res.json()
    } catch (err) {
      lastError = err
      if (err.name === 'AbortError') lastError = new Error('Upload timed out. Please try again.')
      if (attempt < maxRetries) {
        console.log(`[apiUploadPatch] Attempt ${attempt} failed, retrying...`)
        await new Promise(r => setTimeout(r, 2000 * attempt))
      }
    }
  }
  throw lastError
}

// Internal: retry helper primarily for idempotent GET requests
let __getCooldownUntil = 0
const __routeCooldown = new Map() // key -> until timestamp
async function fetchWithRetry(url, init, opts) {
  const method = (opts && opts.method) || (init && init.method) || 'GET'
  const retryable = method.toUpperCase() === 'GET'
  const urlStr = String(url || '')
  const isMsgs = urlStr.includes('/api/wa/messages')
  const isChats = urlStr.includes('/api/wa/chats')
  const maxRetries = retryable ? (isMsgs || isChats ? 0 : 3) : 0
  let attempt = 0
  let delay = 400
  while (true) {
    // honor global cooldown after recent 429s
    if (retryable && __getCooldownUntil) {
      const now = Date.now()
      if (now < __getCooldownUntil) {
        await new Promise((r) => setTimeout(r, __getCooldownUntil - now))
      }
    }
    // Honor per-route cooldown (per jid) for WA endpoints
    if (retryable && (isMsgs || isChats)) {
      try {
        const u = new URL(
          urlStr,
          typeof location !== 'undefined' ? location.origin : 'https://example.com'
        )
        const jid = u.searchParams.get('jid') || ''
        const key = (isMsgs ? 'msgs:' : 'chats:') + jid
        const until = __routeCooldown.get(key) || 0
        if (until && Date.now() < until) {
          await new Promise((r) => setTimeout(r, until - Date.now()))
        }
      } catch {}
    }
    const res = await fetch(url, init)
    // If 429 on WA endpoints, set per-route cooldown even if we won't retry
    if (retryable && (isMsgs || isChats) && res.status === 429) {
      let waitMs = delay
      try {
        const ra = res.headers.get('retry-after')
        if (ra) {
          if (/^\d+$/.test(ra.trim())) waitMs = Math.max(waitMs, parseInt(ra.trim(), 10) * 1000)
          else {
            const when = Date.parse(ra)
            if (!Number.isNaN(when)) waitMs = Math.max(waitMs, when - Date.now())
          }
        }
      } catch {}
      const jitter = Math.floor(Math.random() * 350)
      __getCooldownUntil = Date.now() + Math.min(Math.max(1500, waitMs) + jitter, 8000)
      try {
        const u = new URL(
          urlStr,
          typeof location !== 'undefined' ? location.origin : 'https://example.com'
        )
        const jid = u.searchParams.get('jid') || ''
        const key = (isMsgs ? 'msgs:' : 'chats:') + jid
        __routeCooldown.set(key, Date.now() + Math.max(2000, waitMs) + jitter)
      } catch {}
    }
    // Retry on 429/502/503/504 for GETs
    if (
      retryable &&
      (res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504) &&
      attempt < maxRetries
    ) {
      // honor Retry-After header if present
      let waitMs = delay
      try {
        const ra = res.headers.get('retry-after')
        if (ra) {
          if (/^\d+$/.test(ra.trim())) {
            waitMs = Math.max(waitMs, parseInt(ra.trim(), 10) * 1000)
          } else {
            const when = Date.parse(ra)
            if (!Number.isNaN(when)) waitMs = Math.max(waitMs, when - Date.now())
          }
        }
      } catch {}
      // set a global cooldown so other GETs back off too (jitter to avoid sync)
      const jitter = Math.floor(Math.random() * 350)
      __getCooldownUntil = Date.now() + Math.min(Math.max(1500, waitMs) + jitter, 8000)
      // set per-route cooldown for WA endpoints so subsequent loads queue instead of burst
      if (isMsgs || isChats) {
        try {
          const u = new URL(
            urlStr,
            typeof location !== 'undefined' ? location.origin : 'https://example.com'
          )
          const jid = u.searchParams.get('jid') || ''
          const key = (isMsgs ? 'msgs:' : 'chats:') + jid
          __routeCooldown.set(key, Date.now() + Math.max(2000, waitMs) + jitter)
        } catch {}
      }
      await new Promise((r) => setTimeout(r, Math.max(200, waitMs)))
      attempt++
      delay = Math.min(delay * 2, 3000)
      continue
    }
    return res
  }
}
