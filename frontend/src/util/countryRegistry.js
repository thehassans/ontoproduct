import { apiGet, apiPost } from '../api'
import {
  COUNTRY_LIST,
  DEFAULT_COUNTRY_LIST,
  detectCountryMetadata,
  normalizeCountryList,
  replaceCountryList,
} from '../utils/constants'

let inflight = null
let ts = 0
const CACHE_TTL_MS = 5 * 60 * 1000

export function getCachedCountryRegistry() {
  return COUNTRY_LIST
}

export async function loadCountryRegistry(force = false) {
  if (!force && COUNTRY_LIST.length && Date.now() - ts < CACHE_TTL_MS) {
    return COUNTRY_LIST
  }
  if (!force && inflight) return inflight
  inflight = (async () => {
    try {
      const res = await apiGet('/api/settings/countries')
      const countries = normalizeCountryList(res?.countries || DEFAULT_COUNTRY_LIST)
      replaceCountryList(countries)
      ts = Date.now()
      return COUNTRY_LIST
    } catch {
      replaceCountryList(DEFAULT_COUNTRY_LIST)
      ts = Date.now()
      return COUNTRY_LIST
    } finally {
      inflight = null
    }
  })()
  return inflight
}

export async function saveCountryRegistry(countries = []) {
  const normalized = normalizeCountryList(countries)
  const res = await apiPost('/api/settings/countries', { countries: normalized })
  replaceCountryList(res?.countries || normalized)
  ts = Date.now()
  return COUNTRY_LIST
}

export function autoDetectCountryMeta(value) {
  return detectCountryMetadata(value) || detectCountryMetadata(value, DEFAULT_COUNTRY_LIST)
}
