export const CART_STORAGE_KEY = 'shopping_cart'
export const CART_STORAGE_BACKUP_KEY = 'shopping_cart_bak'
export const LEGACY_CART_STORAGE_KEYS = ['checkout_cart', 'cart']

export function normalizeCartArray(items) {
  return Array.isArray(items) ? items.filter(Boolean) : []
}

export function readCartItems() {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY)
    if (saved != null) {
      const parsed = saved ? JSON.parse(saved) : []
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}

  try {
    const backup = sessionStorage.getItem(CART_STORAGE_BACKUP_KEY)
    if (backup != null) {
      const parsed = backup ? JSON.parse(backup) : []
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}

  for (const key of LEGACY_CART_STORAGE_KEYS) {
    try {
      const legacy = localStorage.getItem(key)
      if (legacy == null) continue
      const parsed = legacy ? JSON.parse(legacy) : []
      if (Array.isArray(parsed)) return parsed
    } catch {}
  }

  return []
}

export function areCartItemsEqual(a, b) {
  try {
    return JSON.stringify(normalizeCartArray(a)) === JSON.stringify(normalizeCartArray(b))
  } catch {
    return false
  }
}

export function writeCartItems(items, { dispatchEvent = true } = {}) {
  const next = normalizeCartArray(items)
  const payload = JSON.stringify(next)

  try { localStorage.setItem(CART_STORAGE_KEY, payload) } catch {}
  try { sessionStorage.setItem(CART_STORAGE_BACKUP_KEY, payload) } catch {}

  if (dispatchEvent) {
    try { window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items: next } })) } catch {}
  }

  return next
}

export function clearCartItems(options) {
  for (const key of LEGACY_CART_STORAGE_KEYS) {
    try { localStorage.removeItem(key) } catch {}
  }
  return writeCartItems([], options)
}
