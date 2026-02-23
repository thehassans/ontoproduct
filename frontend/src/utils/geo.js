// Simple geolocation helper to detect user country by IP (best-effort)
// Uses backend proxy to avoid CORS issues; falls back to browser locale and then to SA

import { API_BASE } from '../api'

export async function detectCountryCode() {
  // Supported site country codes
  const SUPPORTED = new Set(['SA','AE','OM','BH','IN','KW','QA','PK','JO','US','GB','CA','AU'])

  // 1) Try backend proxy (avoids CORS)
  try {
    const res = await fetch(`${API_BASE}/geocode/detect-country`)
    if (res.ok) {
      const data = await res.json()
      const code = String(data?.country_code || '').toUpperCase()
      if (SUPPORTED.has(code)) return code
    }
  } catch {}

  // 2) Try navigator.language/region
  try {
    const lang = (navigator.language || navigator.userLanguage || '').toUpperCase()
    if (lang.includes('-')) {
      const code = lang.split('-').pop()
      if (SUPPORTED.has(code)) return code
    }
  } catch {}

  // 3) Fallback
  return 'SA'
}
