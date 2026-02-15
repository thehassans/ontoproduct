import { apiGet, apiPost, apiDelete } from '../api.js'

const LS_KEY = 'wishlist'

export function readWishlistIds() {
  try {
    if (!isCustomerSession()) return []
    const v = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
    return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : []
  } catch {
    return []
  }
}

export function writeWishlistIds(ids) {
  if (!isCustomerSession()) return []
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

export async function syncWishlistFromServer() {
  try {
    if (!isCustomerSession()) return readWishlistIds()
    const r = await apiGet('/api/ecommerce/customer/wishlist')
    const ids = Array.isArray(r?.items) ? r.items.map((x) => String(x)) : []
    return writeWishlistIds(ids)
  } catch {
    return readWishlistIds()
  }
}

export async function toggleWishlist(productId) {
  const pid = String(productId || '')
  if (!pid) return readWishlistIds()

  if (!isCustomerSession()) return readWishlistIds()

  const current = readWishlistIds()
  const has = current.includes(pid)
  try {
    const r = has
      ? await apiDelete(`/api/ecommerce/customer/wishlist/${encodeURIComponent(pid)}`)
      : await apiPost('/api/ecommerce/customer/wishlist', { productId: pid })
    const ids = Array.isArray(r?.items) ? r.items.map((x) => String(x)) : []
    return writeWishlistIds(ids)
  } catch {
    return current
  }
}
