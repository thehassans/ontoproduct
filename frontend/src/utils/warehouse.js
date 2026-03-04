export function countryCodeToStockKey(code) {
  const c = String(code || '').trim().toUpperCase()
  if (c === 'SA') return 'KSA'
  if (c === 'AE') return 'UAE'
  if (c === 'OM') return 'Oman'
  if (c === 'BH') return 'Bahrain'
  if (c === 'IN') return 'India'
  if (c === 'KW') return 'Kuwait'
  if (c === 'QA') return 'Qatar'
  if (c === 'PK') return 'Pakistan'
  if (c === 'JO') return 'Jordan'
  if (c === 'US') return 'USA'
  if (c === 'GB' || c === 'UK') return 'UK'
  if (c === 'CA') return 'Canada'
  if (c === 'AU') return 'Australia'
  return c
}

export function getLocalStockByCountry(stockByCountry, countryCode) {
  const byC = stockByCountry && typeof stockByCountry === 'object' ? stockByCountry : {}
  const key = countryCodeToStockKey(countryCode)
  const raw = byC[key]
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

export function resolveWarehouse(productOrItem, countryCode, quantity = 1) {
  const qty = Math.max(1, Math.floor(Number(quantity || 1)))
  const localStock = getLocalStockByCountry(productOrItem?.stockByCountry, countryCode)

  let globalStock = null
  if (productOrItem && (productOrItem.stockQty != null || productOrItem.maxStock != null)) {
    const n = Number(productOrItem.stockQty ?? productOrItem.maxStock)
    globalStock = Number.isFinite(n) ? n : 0
  } else {
    globalStock = Number.POSITIVE_INFINITY
  }

  if (localStock >= qty && localStock > 0) {
    return { type: 'local', etaMinDays: 1, etaMaxDays: 2, localStock, globalStock }
  }
  if (globalStock >= qty && globalStock > 0) {
    return { type: 'global', etaMinDays: 10, etaMaxDays: 14, localStock, globalStock }
  }
  return { type: 'none', etaMinDays: null, etaMaxDays: null, localStock, globalStock }
}
