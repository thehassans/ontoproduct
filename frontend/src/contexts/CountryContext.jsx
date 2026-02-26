import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiGet, API_BASE } from '../api'

const COUNTRY_TO_CURRENCY = {
  'SA': 'SAR', 'AE': 'AED', 'OM': 'OMR', 'BH': 'BHD', 'KW': 'KWD', 'QA': 'QAR',
  'IN': 'INR', 'PK': 'PKR', 'JO': 'JOD', 'US': 'USD', 'GB': 'GBP', 'UK': 'GBP',
  'CA': 'CAD', 'AU': 'AUD', 'EU': 'EUR'
}

const COUNTRY_FLAGS = {
  'SA': '🇸🇦', 'AE': '🇦🇪', 'OM': '🇴🇲', 'BH': '🇧🇭', 'KW': '🇰🇼', 'QA': '🇶🇦',
  'IN': '🇮🇳', 'PK': '🇵🇰', 'JO': '🇯🇴', 'US': '🇺🇸', 'GB': '🇬🇧', 'UK': '🇬🇧',
  'CA': '🇨🇦', 'AU': '🇦🇺'
}

const CountryContext = createContext(null)

export function CountryProvider({ children }) {
  const [country, setCountryState] = useState(() => {
    try {
      // Check URL param first (?cc=AE or ?country=AE) — allows TikTok/FB campaign
      // links to force the correct country instantly with zero async delay.
      // This runs synchronously before any child component renders, so all
      // inline localStorage reads downstream also get the correct value.
      const SUPPORTED = ['SA','AE','OM','BH','KW','QA','IN','PK','JO','US','GB','CA','AU']
      const urlParams = new URLSearchParams(window.location.search)
      const ccParam = (urlParams.get('cc') || urlParams.get('country') || '').toUpperCase().trim()
      if (ccParam && SUPPORTED.includes(ccParam)) {
        localStorage.setItem('selected_country', ccParam)
        localStorage.removeItem('country_auto_defaulted')
        return ccParam
      }
      const saved = localStorage.getItem('selected_country')
      if (saved) return saved
      localStorage.setItem('selected_country', 'GB')
      localStorage.setItem('country_auto_defaulted', 'true')
      return 'GB'
    } catch {
      return 'GB'
    }
  })
  const [autoDetected, setAutoDetected] = useState(false)

  // If a URL param set the country, emit the event once on mount so all listeners update
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const ccParam = (urlParams.get('cc') || urlParams.get('country') || '').toUpperCase().trim()
      const SUPPORTED = ['SA','AE','OM','BH','KW','QA','IN','PK','JO','US','GB','CA','AU']
      if (ccParam && SUPPORTED.includes(ccParam)) {
        window.dispatchEvent(new CustomEvent('countryChanged', { detail: { code: ccParam } }))
      }
    } catch {}
  }, [])

  // Auto-detect country on first load
  useEffect(() => {
    const hasSelectedBefore = (() => {
      try { return localStorage.getItem('country_selected_manually') } catch { return null }
    })()
    if (hasSelectedBefore) return // Don't auto-detect if user manually selected

    // Skip auto-detect if country was set via URL param
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const ccParam = (urlParams.get('cc') || urlParams.get('country') || '').toUpperCase().trim()
      const SUPPORTED = ['SA','AE','OM','BH','KW','QA','IN','PK','JO','US','GB','CA','AU']
      if (ccParam && SUPPORTED.includes(ccParam)) return
    } catch {}

    const saved = (() => {
      try { return localStorage.getItem('selected_country') } catch { return null }
    })()
    const wasAutoDefaulted = (() => {
      try { return localStorage.getItem('country_auto_defaulted') === 'true' } catch { return false }
    })()
    if (wasAutoDefaulted && saved && saved !== 'GB') {
      try { localStorage.removeItem('country_auto_defaulted') } catch {}
      return
    }
    // If a real country was already set (auto-detected earlier or saved), do nothing.
    if (saved && !wasAutoDefaulted) return

    const detectCountry = async () => {
      try {
        // Use free IP geolocation API (with timeout)
        const controller = new AbortController()
        const t = setTimeout(() => {
          try { controller.abort() } catch {}
        }, 3500)
        const res = await fetch(`${API_BASE}/geocode/detect-country`, { signal: controller.signal })
        clearTimeout(t)
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        const detectedCode = data.country_code?.toUpperCase()
        
        // Map to supported countries
        const supportedCountries = ['SA', 'AE', 'OM', 'BH', 'KW', 'QA', 'IN', 'PK', 'JO', 'US', 'GB', 'CA', 'AU']
        if (detectedCode && supportedCountries.includes(detectedCode)) {
          setCountryState(detectedCode)
          localStorage.setItem('selected_country', detectedCode)
          localStorage.removeItem('country_auto_defaulted')
          setAutoDetected(true)
          // Emit event for components listening
          window.dispatchEvent(new CustomEvent('countryChanged', { detail: { code: detectedCode } }))
        } else if (detectedCode === 'UK') {
          setCountryState('GB')
          localStorage.setItem('selected_country', 'GB')
          localStorage.removeItem('country_auto_defaulted')
          setAutoDetected(true)
          window.dispatchEvent(new CustomEvent('countryChanged', { detail: { code: 'GB' } }))
        }
      } catch (err) {
        console.log('Country auto-detection failed, using default')
      }
    }
    
    detectCountry()
  }, [])

  // Set country and emit event
  const setCountry = useCallback((code) => {
    setCountryState(code)
    localStorage.setItem('selected_country', code)
    localStorage.setItem('country_selected_manually', 'true')
    try { localStorage.removeItem('country_auto_defaulted') } catch {}
    // Emit global event for all components
    window.dispatchEvent(new CustomEvent('countryChanged', { detail: { code } }))
  }, [])

  const currency = COUNTRY_TO_CURRENCY[country] || 'SAR'
  const flag = COUNTRY_FLAGS[country] || '🌍'

  return (
    <CountryContext.Provider value={{ 
      country, 
      setCountry, 
      currency, 
      flag,
      autoDetected,
      COUNTRY_TO_CURRENCY,
      COUNTRY_FLAGS
    }}>
      {children}
    </CountryContext.Provider>
  )
}

export function useCountry() {
  const context = useContext(CountryContext)
  if (!context) {
    // Fallback for components outside provider
    const fallbackCountry = (() => {
      try { return localStorage.getItem('selected_country') || 'GB' } catch { return 'GB' }
    })()
    return {
      country: fallbackCountry,
      setCountry: () => {},
      currency: COUNTRY_TO_CURRENCY[fallbackCountry] || 'SAR',
      flag: '🌍',
      autoDetected: false,
      COUNTRY_TO_CURRENCY,
      COUNTRY_FLAGS
    }
  }
  return context
}

// Hook to listen for country changes
export function useCountryChange(callback) {
  useEffect(() => {
    const handler = (e) => callback(e.detail?.code)
    window.addEventListener('countryChanged', handler)
    return () => window.removeEventListener('countryChanged', handler)
  }, [callback])
}

export default CountryContext
