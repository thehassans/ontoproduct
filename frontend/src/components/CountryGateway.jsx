import React, { useEffect, useMemo, useRef, useState } from 'react'
import { COUNTRY_LIST } from '../utils/constants'
import { loadCountryRegistry } from '../util/countryRegistry'

const GATEWAY_SEEN_KEY = 'country_gateway_seen'

const PANEL_PREFIXES = ['/user', '/manager', '/admin', '/dropshipper', '/shop-vendor', '/seo', '/inbox', '/customer', '/login', '/signup', '/register', '/agent', '/confirmer', '/commissioner', '/investor', '/partner']

// Featured countries shown prominently (Gulf + popular markets)
const FEATURED_CODES = ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'IN', 'PK', 'GB', 'US']

function shouldShowGateway() {
  try {
    const hostname = window.location.hostname.toLowerCase()
    if (hostname !== 'buysial.com' && hostname !== 'localhost' && hostname !== '127.0.0.1') return false
    const path = window.location.pathname
    if (PANEL_PREFIXES.some(p => path === p || path.startsWith(p + '/'))) return false
    // Don't show if already locked to a country-specific domain
    if (localStorage.getItem('country_domain_locked_code')) return false
    // Only skip if already seen THIS SESSION (not across sessions)
    if (sessionStorage.getItem(GATEWAY_SEEN_KEY)) return false
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

  const featured = useMemo(
    () => FEATURED_CODES.map(code => countries.find(c => c.code === code)).filter(Boolean),
    [countries]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const all = q
      ? countries.filter((c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          (c.aliases || []).some((a) => a.toLowerCase().includes(q))
        )
      : countries.filter(c => !FEATURED_CODES.includes(c.code))
    return all
  }, [countries, search])

  function dismiss() {
    setVisible(false)
    try { sessionStorage.setItem(GATEWAY_SEEN_KEY, '1') } catch {}
    setTimeout(() => setMounted(false), 450)
  }

  function handleSelect(code) {
    setSelected(code)
  }

  function handleContinue() {
    if (!selected || redirecting) return
    const country = countries.find((c) => c.code === selected)
    if (!country) return
    const domain = String(country.domain || '').trim().toLowerCase()
    try { sessionStorage.setItem(GATEWAY_SEEN_KEY, '1') } catch {}
    try { localStorage.setItem('selected_country', selected) } catch {}
    if (domain) {
      setRedirecting(true)
      setTimeout(() => { window.location.href = `https://${domain}` }, 500)
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
        @keyframes gw-backdrop-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes gw-card-in {
          from { opacity: 0; transform: translateY(40px) scale(0.96) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
        @keyframes gw-blob1 {
          0%,100% { transform: translate(0,0) scale(1) }
          50% { transform: translate(40px,-30px) scale(1.08) }
        }
        @keyframes gw-blob2 {
          0%,100% { transform: translate(0,0) scale(1) }
          50% { transform: translate(-30px,40px) scale(1.05) }
        }
        .gw-card-in { animation: gw-card-in 0.5s cubic-bezier(0.22,1,0.36,1) both }
        .gw-country-btn {
          border: 2px solid transparent;
          background: rgba(255,255,255,0.06);
          border-radius: 18px;
          padding: 16px 12px 14px;
          cursor: pointer;
          text-align: left;
          display: grid;
          gap: 6px;
          transition: all 0.18s ease;
          outline: none;
          backdrop-filter: blur(6px);
        }
        .gw-country-btn:hover {
          background: rgba(255,255,255,0.12) !important;
          border-color: rgba(249,115,22,0.5) !important;
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.25);
        }
        .gw-country-btn.selected {
          background: linear-gradient(145deg, rgba(249,115,22,0.22), rgba(234,88,12,0.12)) !important;
          border-color: #f97316 !important;
          box-shadow: 0 0 0 3px rgba(249,115,22,0.18), 0 12px 32px rgba(249,115,22,0.2);
        }
        .gw-other-btn {
          border: 1.5px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          border-radius: 14px;
          padding: 11px 14px;
          cursor: pointer;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.15s ease;
          outline: none;
        }
        .gw-other-btn:hover {
          background: rgba(255,255,255,0.1) !important;
          border-color: rgba(249,115,22,0.4) !important;
          transform: translateX(3px);
        }
        .gw-other-btn.selected {
          background: rgba(249,115,22,0.15) !important;
          border-color: #f97316 !important;
        }
        .gw-cta:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 48px rgba(249,115,22,0.5) !important;
        }
        .gw-scroll::-webkit-scrollbar { width: 3px }
        .gw-scroll::-webkit-scrollbar-track { background: transparent }
        .gw-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 99px }
        .gw-search:focus { border-color: rgba(249,115,22,0.7) !important; background: rgba(255,255,255,0.1) !important; }
        @media (max-width: 600px) {
          .gw-featured-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .gw-others-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* ── Backdrop ── */}
      <div
        onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
          background: 'linear-gradient(135deg, rgba(2,6,23,0.92) 0%, rgba(15,23,42,0.88) 50%, rgba(9,9,11,0.92) 100%)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.4s ease',
          overflow: 'hidden',
        }}
      >
        {/* Ambient blobs */}
        <div style={{ position: 'absolute', top: '15%', left: '10%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)', animation: 'gw-blob1 8s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '8%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', animation: 'gw-blob2 10s ease-in-out infinite', pointerEvents: 'none' }} />

        {/* ── Card ── */}
        <div
          className="gw-card-in"
          style={{
            position: 'relative', zIndex: 1,
            width: '100%', maxWidth: 780,
            maxHeight: '94vh',
            background: 'linear-gradient(160deg, rgba(15,23,42,0.98) 0%, rgba(2,6,23,0.99) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 32,
            boxShadow: '0 80px 200px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* ── Top accent bar ── */}
          <div style={{ height: 3, background: 'linear-gradient(90deg, #f97316, #ea580c, #fb923c, #f97316)', backgroundSize: '200% 100%' }} />

          {/* ── Header ── */}
          <div style={{ padding: '28px 28px 20px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src="/BSBackgroundremoved.png" alt="BuySial" style={{ height: 28, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} onError={(e) => { e.target.style.display = 'none' }} />
              </div>
              <button
                onClick={dismiss}
                style={{
                  width: 32, height: 32, borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  display: 'grid', placeItems: 'center', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.5)', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Globe + Title */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 22 }}>
              <div style={{
                width: 60, height: 60, borderRadius: 18, flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.1))',
                border: '1px solid rgba(249,115,22,0.25)',
                display: 'grid', placeItems: 'center', fontSize: 28,
              }}>
                🌍
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
                  Where are you shopping from?
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 6, lineHeight: 1.6 }}>
                  Choose your country for local prices, currency, and fast delivery.
                </div>
              </div>
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}
                width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={searchRef}
                className="gw-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country…"
                autoFocus
                style={{
                  width: '100%', boxSizing: 'border-box',
                  height: 44, borderRadius: 13,
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  paddingLeft: 42, paddingRight: 16,
                  fontSize: 14, color: '#ffffff',
                  background: 'rgba(255,255,255,0.07)',
                  outline: 'none', transition: 'all 0.15s',
                  caretColor: '#f97316',
                }}
              />
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div className="gw-scroll" style={{ overflowY: 'auto', padding: '0 28px 8px', flex: 1 }}>

            {/* Featured Countries */}
            {!search.trim() && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                  🔥 Popular Regions
                </div>
                <div className="gw-featured-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
                  {featured.map((country) => {
                    const isSel = selected === country.code
                    return (
                      <button
                        key={country.code}
                        type="button"
                        className={`gw-country-btn${isSel ? ' selected' : ''}`}
                        onClick={() => handleSelect(country.code)}
                      >
                        <div style={{ fontSize: 28, lineHeight: 1 }}>{country.flag || '🌍'}</div>
                        <div style={{ fontWeight: 700, fontSize: 12, color: isSel ? '#fb923c' : 'rgba(255,255,255,0.9)', lineHeight: 1.3 }}>
                          {country.name}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          <span style={{ fontSize: 10, color: isSel ? '#fb923c' : 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                            {country.currency}
                          </span>
                          {country.domain && (
                            <span style={{ fontSize: 9, color: '#f97316', fontWeight: 700 }}>↗</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                  All Countries
                </div>
              </>
            )}

            {/* All / Search results */}
            {filtered.length === 0 && (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                No countries found for "{search}"
              </div>
            )}
            <div className="gw-others-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, paddingBottom: 8 }}>
              {filtered.map((country) => {
                const isSel = selected === country.code
                return (
                  <button
                    key={country.code}
                    type="button"
                    className={`gw-other-btn${isSel ? ' selected' : ''}`}
                    onClick={() => handleSelect(country.code)}
                  >
                    <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{country.flag || '🌍'}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: isSel ? '#fb923c' : 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {country.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                        {country.currency}{country.domain ? ' · ↗' : ''}
                      </div>
                    </div>
                    {isSel && (
                      <svg style={{ flexShrink: 0, color: '#f97316' }} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{
            padding: '16px 28px 24px', flexShrink: 0,
            borderTop: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
          }}>
            {/* Selected preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              {selectedCountry ? (
                <>
                  <span style={{ fontSize: 22 }}>{selectedCountry.flag}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#ffffff' }}>{selectedCountry.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                      {selectedCountry.currency}{selectedCountry.domain ? ` · ${selectedCountry.domain}` : ''}
                    </div>
                  </div>
                </>
              ) : (
                <button type="button" onClick={dismiss} style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Skip for now
                </button>
              )}
            </div>

            <button
              type="button"
              className="gw-cta"
              onClick={handleContinue}
              disabled={!selected || redirecting}
              style={{
                height: 50,
                paddingInline: 32,
                borderRadius: 16,
                border: 'none',
                background: selected
                  ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                  : 'rgba(255,255,255,0.08)',
                color: selected ? '#ffffff' : 'rgba(255,255,255,0.3)',
                fontWeight: 700,
                fontSize: 15,
                cursor: selected && !redirecting ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 10,
                transition: 'all 0.2s ease',
                boxShadow: selected ? '0 8px 32px rgba(249,115,22,0.35)' : 'none',
                outline: 'none', flexShrink: 0,
              }}
            >
              {redirecting ? (
                <>
                  <div style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'gw-spin 0.65s linear infinite', flexShrink: 0 }} />
                  Taking you there…
                </>
              ) : (
                <>
                  {selected ? 'Shop Now' : 'Choose Country'}
                  {selected && selectedCountry?.domain && (
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
