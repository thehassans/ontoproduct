import React, { useEffect, useMemo, useRef, useState } from 'react'
import { COUNTRY_LIST } from '../utils/constants'
import { loadCountryRegistry } from '../util/countryRegistry'

const GATEWAY_SEEN_KEY = 'country_gateway_seen'

function shouldShowGateway() {
  try {
    const hostname = window.location.hostname.toLowerCase()
    if (hostname !== 'buysial.com' && hostname !== 'localhost' && hostname !== '127.0.0.1') return false
    if (localStorage.getItem('country_domain_locked_code')) return false
    if (sessionStorage.getItem(GATEWAY_SEEN_KEY)) return false
    if (localStorage.getItem('country_selected_manually')) return false
    return true
  } catch {
    return false
  }
}

export default function CountryGateway() {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [countries, setCountries] = useState([...COUNTRY_LIST])
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [redirecting, setRedirecting] = useState(false)
  const searchRef = useRef(null)

  useEffect(() => {
    if (!shouldShowGateway()) return
    let alive = true
    loadCountryRegistry().then((list) => {
      if (!alive) return
      if (list?.length) setCountries([...list])
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (alive) setVisible(true)
      }))
    }).catch(() => {
      if (!alive) return
      setMounted(true)
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (alive) setVisible(true)
      }))
    })
    return () => { alive = false }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return countries
    return countries.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.aliases || []).some((a) => a.toLowerCase().includes(q))
    )
  }, [countries, search])

  function dismiss() {
    setVisible(false)
    try { sessionStorage.setItem(GATEWAY_SEEN_KEY, '1') } catch {}
    setTimeout(() => setMounted(false), 400)
  }

  function handleContinue() {
    if (!selected || redirecting) return
    const country = countries.find((c) => c.code === selected)
    if (!country) return
    const domain = String(country.domain || '').trim().toLowerCase()
    try { sessionStorage.setItem(GATEWAY_SEEN_KEY, '1') } catch {}
    try {
      localStorage.setItem('selected_country', selected)
      localStorage.setItem('country_selected_manually', 'true')
    } catch {}
    if (domain) {
      setRedirecting(true)
      window.location.href = `https://${domain}`
      return
    }
    window.dispatchEvent(new CustomEvent('countryChanged', { detail: { code: selected } }))
    dismiss()
  }

  const selectedCountry = countries.find((c) => c.code === selected)

  if (!mounted) return null

  return (
    <>
      <style>{`
        @keyframes gw-spin { to { transform: rotate(360deg) } }
        @keyframes gw-fade-up {
          from { opacity: 0; transform: translateY(28px) scale(0.97) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
        .gw-card { animation: gw-fade-up 0.38s cubic-bezier(0.34,1.42,0.64,1) both }
        .gw-country:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important }
        .gw-continue:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 12px 32px rgba(249,115,22,0.35) !important }
        .gw-scroll::-webkit-scrollbar { width: 4px }
        .gw-scroll::-webkit-scrollbar-track { background: transparent }
        .gw-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px }
      `}</style>

      <div
        onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          display: 'grid',
          placeItems: 'center',
          padding: 16,
          background: 'rgba(2,6,23,0.75)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      >
        <div
          className="gw-card"
          style={{
            background: 'linear-gradient(160deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: 28,
            boxShadow: '0 48px 120px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.1)',
            width: '100%',
            maxWidth: 700,
            maxHeight: '92vh',
            display: 'grid',
            gridTemplateRows: 'auto auto minmax(0,1fr) auto',
            overflow: 'hidden',
          }}
        >
          {/* ── Header ── */}
          <div style={{ padding: '28px 28px 0', display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <img
                src="/BSBackgroundremoved.png"
                alt="BuySial"
                style={{ height: 30, objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <button
                onClick={dismiss}
                style={{
                  width: 34, height: 34, borderRadius: 999,
                  border: '1px solid #e5e7eb', background: '#f9fafb',
                  display: 'grid', placeItems: 'center', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div>
              <div style={{ fontSize: 27, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
                Welcome to BuySial
              </div>
              <div style={{ fontSize: 15, color: '#64748b', marginTop: 8, lineHeight: 1.6 }}>
                Select your region to see local products, prices, and delivery options.
              </div>
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <svg
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}
                width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country or region..."
                autoFocus
                style={{
                  width: '100%', boxSizing: 'border-box',
                  height: 46, borderRadius: 14,
                  border: '1.5px solid #e2e8f0',
                  paddingLeft: 44, paddingRight: 16,
                  fontSize: 14, color: '#0f172a',
                  background: '#f8fafc', outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#f97316' }}
                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0' }}
              />
            </div>
          </div>

          {/* ── Country Grid ── */}
          <div
            className="gw-scroll"
            style={{ overflowY: 'auto', padding: '16px 20px' }}
          >
            {filtered.length === 0 && (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                No countries match your search.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 10 }}>
              {filtered.map((country) => {
                const isSelected = selected === country.code
                return (
                  <button
                    key={country.code}
                    type="button"
                    className="gw-country"
                    onClick={() => setSelected(country.code)}
                    style={{
                      border: isSelected ? '2px solid #f97316' : '1.5px solid #e5e7eb',
                      borderRadius: 18,
                      padding: '14px 12px 12px',
                      background: isSelected
                        ? 'linear-gradient(145deg,#fff7ed,#fff)'
                        : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'grid',
                      gap: 6,
                      boxShadow: isSelected
                        ? '0 8px 24px rgba(249,115,22,0.15)'
                        : '0 1px 3px rgba(0,0,0,0.04)',
                      transition: 'all 0.15s ease',
                      outline: 'none',
                    }}
                  >
                    <div style={{ fontSize: 30, lineHeight: 1 }}>{country.flag || '🌍'}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', lineHeight: 1.3 }}>
                      {country.name}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
                      <span style={{
                        fontSize: 11, color: '#64748b',
                        background: '#f1f5f9', borderRadius: 6,
                        padding: '2px 7px', fontWeight: 600,
                      }}>
                        {country.currency}
                      </span>
                      {country.domain && (
                        <span style={{
                          fontSize: 10, color: '#f97316',
                          background: '#fff7ed', borderRadius: 6,
                          padding: '2px 6px', fontWeight: 600,
                          border: '1px solid #fed7aa',
                        }}>
                          ↗ {country.domain}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{
            padding: '16px 28px 26px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            <button
              type="button"
              onClick={dismiss}
              style={{
                fontSize: 13, color: '#94a3b8',
                background: 'none', border: 'none',
                cursor: 'pointer', padding: '4px 0',
              }}
            >
              Skip for now
            </button>

            <button
              type="button"
              className="gw-continue"
              onClick={handleContinue}
              disabled={!selected || redirecting}
              style={{
                height: 46,
                paddingInline: 28,
                borderRadius: 14,
                border: 'none',
                background: selected
                  ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                  : '#e5e7eb',
                color: selected ? '#ffffff' : '#9ca3af',
                fontWeight: 700,
                fontSize: 14,
                cursor: selected && !redirecting ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'all 0.15s ease',
                boxShadow: selected ? '0 8px 24px rgba(249,115,22,0.25)' : 'none',
                outline: 'none',
              }}
            >
              {redirecting ? (
                <>
                  <div style={{
                    width: 16, height: 16,
                    border: '2.5px solid rgba(255,255,255,0.35)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'gw-spin 0.65s linear infinite',
                    flexShrink: 0,
                  }} />
                  Redirecting to {selectedCountry?.domain}…
                </>
              ) : (
                <>
                  {selected
                    ? `Continue${selectedCountry?.domain ? '' : ''}`
                    : 'Select a country'}
                  {selected && selectedCountry?.domain && (
                    <span style={{
                      fontSize: 12, opacity: 0.85, fontWeight: 500,
                      background: 'rgba(0,0,0,0.15)',
                      padding: '2px 8px', borderRadius: 6,
                    }}>
                      → {selectedCountry.domain}
                    </span>
                  )}
                  {selected && !selectedCountry?.domain && (
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
