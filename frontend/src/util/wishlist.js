import { apiGet, apiPost, apiDelete } from '../api.js'

const LS_KEY = 'wishlist'

// Wishlist works fully offline/without sign-in via localStorage.
// When a customer session exists, it additionally syncs to the server.
export function readWishlistIds() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
    return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : []
  } catch {
    return []
  }
}

export function writeWishlistIds(ids) {
  const out = Array.isArray(ids) ? ids.map((x) => String(x)).filter(Boolean) : []
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(out))
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: { items: out } }))
  } catch {}
  return out
}

export function isCustomerSession() {
  try {
    const token = localStorage.getItem('token')
    if (!token) return false
    const me = JSON.parse(localStorage.getItem('me') || 'null')
    return !!me && me.role === 'customer'
  } catch {
    return false
  }
}

// Merges local (guest) wishlist with server wishlist when the user is logged in.
// If not logged in, this is a no-op that just returns the local list.
export async function syncWishlistFromServer() {
  try {
    if (!isCustomerSession()) return readWishlistIds()
    const local = readWishlistIds()
    const r = await apiGet('/api/ecommerce/customer/wishlist')
    const serverIds = Array.isArray(r?.items) ? r.items.map((x) => String(x)) : []

    // Merge: push any local-only (guest) items up to the server, then use the union.
    const merged = Array.from(new Set([...serverIds, ...local]))
    const localOnly = local.filter((id) => !serverIds.includes(id))
    if (localOnly.length) {
      try {
        await Promise.all(
          localOnly.map((pid) => apiPost('/api/ecommerce/customer/wishlist', { productId: pid }))
        )
      } catch {}
    }
    return writeWishlistIds(merged)
  } catch {
    return readWishlistIds()
  }
}

// Toggles a product in the wishlist. Always works locally (guest-friendly).
// When logged in as a customer, also syncs the change to the server in the background.
export async function toggleWishlist(productId) {
  const pid = String(productId || '')
  if (!pid) return readWishlistIds()

  const current = readWishlistIds()
  const has = current.includes(pid)
  const next = has ? current.filter((x) => x !== pid) : [...current, pid]
  const written = writeWishlistIds(next)

  if (isCustomerSession()) {
    try {
      const r = has
        ? await apiDelete(`/api/ecommerce/customer/wishlist/${encodeURIComponent(pid)}`)
        : await apiPost('/api/ecommerce/customer/wishlist', { productId: pid })
      const ids = Array.isArray(r?.items) ? r.items.map((x) => String(x)) : null
      if (ids) return writeWishlistIds(ids)
    } catch {}
  }

  return written
}
