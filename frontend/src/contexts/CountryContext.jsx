import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiGet, API_BASE } from '../api'
import { COUNTRY_LIST, COUNTRY_TO_CURRENCY, COUNTRY_TO_FLAG } from '../utils/constants'
import { loadCountryRegistry } from '../util/countryRegistry'

const CountryContext = createContext(null)

function supportedCodes() {
  return (COUNTRY_LIST || []).map((country) => country.code)
}

export function CountryProvider({ children }) {
  const [country, setCountryState] = useState(() => {
    try {
      const lockedCode = String(localStorage.getItem('country_domain_locked_code') || '').toUpperCase().trim()
      if (lockedCode) {
        localStorage.setItem('selected_country', lockedCode)
        localStorage.removeItem('country_auto_defaulted')
        return lockedCode
      }
      // Check URL param first (?cc=AE or ?country=AE) — allows TikTok/FB campaign
      // links to force the correct country instantly with zero async delay.
      // This runs synchronously before any child component renders, so all
      // inline localStorage reads downstream also get the correct value.
      const SUPPORTED = supportedCodes()
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
  const [countriesVersion, setCountriesVersion] = useState(0)

  useEffect(() => {
    let alive = true
    loadCountryRegistry().then(() => {
      if (!alive) return
      setCountriesVersion((value) => value + 1)
    }).catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  // If a URL param set the country, emit the event once on mount so all listeners update
  useEffect(() => {
    try {
      const lockedCode = String(localStorage.getItem('country_domain_locked_code') || '').toUpperCase().trim()
      if (lockedCode) {
        setCountryState(lockedCode)
        window.dispatchEvent(new CustomEvent('countryChanged', { detail: { code: lockedCode } }))
        return
      }
      const urlParams = new URLSearchParams(window.location.search)
      const ccParam = (urlParams.get('cc') || urlParams.get('country') || '').toUpperCase().trim()
      const SUPPORTED = supportedCodes()
      if (ccParam && SUPPORTED.includes(ccParam)) {
        window.dispatchEvent(new CustomEvent('countryChanged', { detail: { code: ccParam } }))
      }
    } catch {}
  }, [countriesVersion])

  // Auto-detect country on first load
  useEffect(() => {
    const lockedCode = (() => {
      try { return String(localStorage.getItem('country_domain_locked_code') || '').toUpperCase().trim() } catch { return '' }
    })()
    if (lockedCode) {
      setCountryState(lockedCode)
      return
    }
    const hasSelectedBefore = (() => {
      try { return localStorage.getItem('country_selected_manually') } catch { return null }
    })()
    if (hasSelectedBefore) return // Don't auto-detect if user manually selected

    // Skip auto-detect if country was set via URL param
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const ccParam = (urlParams.get('cc') || urlParams.get('country') || '').toUpperCase().trim()
      const SUPPORTED = supportedCodes()
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
        const supportedCountries = supportedCodes()
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
  }, [countriesVersion])

  useEffect(() => {
    const handleCountryChanged = (event) => {
      const code = String(event?.detail?.code || '').toUpperCase().trim()
      if (!code) return
      setCountryState(code)
    }
    window.addEventListener('countryChanged', handleCountryChanged)
    return () => window.removeEventListener('countryChanged', handleCountryChanged)
  }, [])

  // Set country and emit event
  const setCountry = useCallback((code) => {
    const lockedCode = (() => {
      try { return String(localStorage.getItem('country_domain_locked_code') || '').toUpperCase().trim() } catch { return '' }
    })()
    if (lockedCode) {
      setCountryState(lockedCode)
      try { localStorage.setItem('selected_country', lockedCode) } catch {}
      window.dispatchEvent(new CustomEvent('countryChanged', { detail: { code: lockedCode } }))
      return
    }
    setCountryState(code)
    localStorage.setItem('selected_country', code)
    localStorage.setItem('country_selected_manually', 'true')
    try { localStorage.removeItem('country_auto_defaulted') } catch {}
    // Emit global event for all components
    window.dispatchEvent(new CustomEvent('countryChanged', { detail: { code } }))
  }, [])

  const currency = COUNTRY_TO_CURRENCY[country] || 'SAR'
  const flag = COUNTRY_TO_FLAG[country] || '🌍'

  return (
    <CountryContext.Provider value={{ 
      country, 
      setCountry, 
      currency, 
      flag,
      autoDetected,
      countries: COUNTRY_LIST,
      COUNTRY_TO_CURRENCY,
      COUNTRY_FLAGS: COUNTRY_TO_FLAG
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
      countries: COUNTRY_LIST,
      COUNTRY_TO_CURRENCY,
      COUNTRY_FLAGS: COUNTRY_TO_FLAG
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
