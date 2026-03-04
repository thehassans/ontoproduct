import React, { useState, useEffect, useRef } from 'react'
import { COUNTRY_LIST } from '../../utils/constants'
import { apiGet } from '../../api'

export default function CountrySelector({ selectedCountry, onCountryChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [availableCountries, setAvailableCountries] = useState([])
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef(null)

  // Fetch countries that have products
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await apiGet('/api/products/public/available-countries')
        if (alive && res?.countries) {
          // Map country names to codes and filter COUNTRY_LIST
          const countryNameToCode = {
            'KSA': 'SA', 'UAE': 'AE', 'Oman': 'OM', 'Bahrain': 'BH',
            'Kuwait': 'KW', 'Qatar': 'QA', 'India': 'IN', 'Pakistan': 'PK', 'Jordan': 'JO',
            'USA': 'US', 'UK': 'GB', 'Canada': 'CA', 'Australia': 'AU'
          }
          const availableCodes = res.countries.map(name => countryNameToCode[name] || name)
          const filtered = COUNTRY_LIST.filter(c => availableCodes.includes(c.code) || availableCodes.includes(c.name))
          setAvailableCountries(filtered.length > 0 ? filtered : COUNTRY_LIST)
        } else if (alive) {
          setAvailableCountries(COUNTRY_LIST)
        }
      } catch {
        if (alive) setAvailableCountries(COUNTRY_LIST)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleCountrySelect = (country) => {
    // Save to localStorage first
    localStorage.setItem('selected_country', country.code)
    
    // Dispatch event for components to listen (for currency updates only)
    window.dispatchEvent(new CustomEvent('countryChanged', { detail: { code: country.code, country } }))
    
    onCountryChange(country)
    setIsOpen(false)
  }

  // Use available countries list (filtered by products) or fallback to full list
  const countryList = availableCountries.length > 0 ? availableCountries : COUNTRY_LIST
  const currentCountry = countryList.find(c => c.code === selectedCountry) || countryList.find(c => c.code === 'SA') || countryList[0]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        disabled={loading}
      >
        <span className="text-lg">{currentCountry?.flag || '🌍'}</span>
        <span className="font-medium text-gray-700">{currentCountry?.name || 'Select'}</span>
        <svg 
          className={`w-4 h-4 text-gray-500 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          <div className="py-1">
            {countryList.map((country) => (
              <button
                key={country.code}
                onClick={() => handleCountrySelect(country)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                  selectedCountry === country.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <span className="text-lg">{country.flag}</span>
                <div className="flex-1">
                  <div className="font-medium">{country.name}</div>
                  <div className="text-sm text-gray-500">{country.currency}</div>
                </div>
                {selectedCountry === country.code && (
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export { COUNTRY_LIST as countries }