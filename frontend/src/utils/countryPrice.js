// Shared utility for resolving country-specific product prices
// Used across e-commerce pages, cart, checkout, and admin panels

// Maps 2-letter country codes to stockByCountry/priceByCountry keys
export const CODE_TO_STOCK_KEY = {
  AE: 'UAE', SA: 'KSA', OM: 'Oman', BH: 'Bahrain', IN: 'India',
  KW: 'Kuwait', QA: 'Qatar', PK: 'Pakistan', JO: 'Jordan',
  US: 'USA', GB: 'UK', CA: 'Canada', AU: 'Australia',
}

// Reverse mapping: stock key to 2-letter code
export const STOCK_KEY_TO_CODE = Object.fromEntries(
  Object.entries(CODE_TO_STOCK_KEY).map(([k, v]) => [v, k])
)

// Maps stock keys to their local currency
export const STOCK_KEY_TO_CURRENCY = {
  UAE: 'AED', KSA: 'SAR', Oman: 'OMR', Bahrain: 'BHD', India: 'INR',
  Kuwait: 'KWD', Qatar: 'QAR', Pakistan: 'PKR', Jordan: 'JOD',
  USA: 'USD', UK: 'GBP', Canada: 'CAD', Australia: 'AUD',
}

// All country stock keys
export const ALL_STOCK_COUNTRIES = Object.keys(STOCK_KEY_TO_CURRENCY)

/**
 * Get the effective price for a product in a specific country.
 * Checks priceByCountry first, then falls back to base price with optional conversion.
 *
 * @param {Object} product - Product object with price, salePrice, baseCurrency, priceByCountry
 * @param {string} countryCode - 2-letter country code (e.g., 'AE') or stock key (e.g., 'UAE')
 * @param {Function} [convertFn] - Optional currency conversion function: (amount, from, to) => number
 * @returns {{ price: number, salePrice: number, currency: string, isCountrySpecific: boolean }}
 */
export function getCountryPrice(product, countryCode, convertFn) {
  if (!product) return { price: 0, salePrice: 0, currency: 'SAR', isCountrySpecific: false }

  const stockKey = CODE_TO_STOCK_KEY[countryCode] || countryCode
  const currency = STOCK_KEY_TO_CURRENCY[stockKey] || 'SAR'

  // Check for explicit country price
  const pbc = product.priceByCountry
  const entry = pbc && pbc[stockKey]
  if (entry && Number(entry.price) > 0) {
    return {
      price: Number(entry.price),
      salePrice: Number(entry.salePrice || 0),
      currency,
      isCountrySpecific: true,
    }
  }

  // Fallback: convert base price
  const basePrice = Number(product.price || 0)
  const baseSale = Number(product.salePrice || 0)
  const baseCurrency = product.baseCurrency || 'SAR'

  if (convertFn && baseCurrency !== currency) {
    return {
      price: convertFn(basePrice, baseCurrency, currency),
      salePrice: baseSale > 0 ? convertFn(baseSale, baseCurrency, currency) : 0,
      currency,
      isCountrySpecific: false,
    }
  }

  return {
    price: basePrice,
    salePrice: baseSale,
    currency: baseCurrency,
    isCountrySpecific: false,
  }
}

/**
 * Get countries that have stock > 0 for a product.
 * @param {Object} product - Product with stockByCountry
 * @returns {string[]} Array of stock keys with stock > 0 (e.g., ['UAE', 'KSA'])
 */
export function getCountriesWithStock(product) {
  const sbc = product?.stockByCountry
  if (!sbc || typeof sbc !== 'object') return []
  return ALL_STOCK_COUNTRIES.filter(key => Number(sbc[key] || 0) > 0)
}
