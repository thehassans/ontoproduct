import React, { useEffect, useMemo, useRef, useState } from 'react'
import { COUNTRY_LIST } from '../utils/constants'
import { loadCountryRegistry } from '../util/countryRegistry'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight, Check, Search, X } from 'lucide-react'
import { Card } from './ui/Card'

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

// Helper: get flag image URL from country code
function flagUrl(code, size = 48) {
  return `https://flagcdn.com/w${size}/${String(code || '').toLowerCase()}.png`
}

export default function CountryGateway() {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [countries, setCountries] = useState([...COUNTRY_LIST])
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
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
        .cg-scroll::-webkit-scrollbar { width: 4px }
        .cg-scroll::-webkit-scrollbar-track { background: transparent }
        .cg-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 99px }
        @keyframes cg-spin { to { transform: rotate(360deg) } }
        @media (max-width: 600px) {
          .cg-featured-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .cg-others-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* ── Backdrop ── */}
      <div
        onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
          background: 'linear-gradient(135deg, rgba(2,6,23,0.94) 0%, rgba(15,23,42,0.90) 50%, rgba(9,9,11,0.94) 100%)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.4s ease',
          overflow: 'hidden',
        }}
      >
        {/* ── Main container ── */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.96 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'relative', zIndex: 1,
            width: '100%', maxWidth: 820,
            maxHeight: '94vh',
            background: 'linear-gradient(160deg, rgba(15,23,42,0.98) 0%, rgba(2,6,23,0.99) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 28,
            boxShadow: '0 80px 200px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* ── Top accent bar ── */}
          <div style={{ height: 3, background: 'linear-gradient(90deg, #f97316, #ea580c, #fb923c, #f97316)', backgroundSize: '200% 100%' }} />

          {/* ── Header ── */}
          <div style={{ padding: '28px 28px 20px', flexShrink: 0 }}>
            {/* Logo + Close */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <img
                src="/BSBackgroundremoved.png"
                alt="BuySial"
                style={{ height: 32, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <button
                onClick={dismiss}
                style={{
                  width: 34, height: 34, borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  display: 'grid', placeItems: 'center', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.5)', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>

            {/* Globe + Title */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 22 }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.1))',
                border: '1px solid rgba(249,115,22,0.25)',
                display: 'grid', placeItems: 'center', fontSize: 26,
              }}>
                🌍
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
                  Where are you shopping from?
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 6, lineHeight: 1.6 }}>
                  Choose your country for local prices, currency, and fast delivery.
                </div>
              </div>
            </motion.div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  color: 'rgba(255,255,255,0.3)', pointerEvents: 'none',
                }}
              />
              <input
                ref={searchRef}
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
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(249,115,22,0.7)'
                  e.target.style.background = 'rgba(255,255,255,0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)'
                  e.target.style.background = 'rgba(255,255,255,0.07)'
                }}
              />
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div className="cg-scroll" style={{ overflowY: 'auto', padding: '0 28px 8px', flex: 1 }}>

            {/* Featured Countries (card grid) */}
            {!search.trim() && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  🔥 Popular Regions
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="cg-featured-grid"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}
                >
                  {featured.map((country, index) => {
                    const isSel = selected === country.code
                    const isHov = hovered === country.code
                    return (
                      <motion.div
                        key={country.code}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.35, delay: index * 0.04 }}
                      >
                        <div
                          onClick={() => handleSelect(country.code)}
                          onMouseEnter={() => setHovered(country.code)}
                          onMouseLeave={() => setHovered(null)}
                          style={{
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            borderRadius: 18,
                            border: isSel
                              ? '2px solid #f97316'
                              : '2px solid transparent',
                            background: isSel
                              ? 'linear-gradient(145deg, rgba(249,115,22,0.22), rgba(234,88,12,0.12))'
                              : 'rgba(255,255,255,0.06)',
                            boxShadow: isSel
                              ? '0 0 0 3px rgba(249,115,22,0.18), 0 12px 32px rgba(249,115,22,0.2)'
                              : isHov
                              ? '0 12px 32px rgba(0,0,0,0.25)'
                              : 'none',
                            transform: isHov && !isSel ? 'translateY(-3px)' : 'none',
                            transition: 'all 0.2s ease',
                            padding: '18px 14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 8,
                            backdropFilter: 'blur(6px)',
                          }}
                        >
                          {/* Check mark */}
                          <AnimatePresence>
                            {isSel && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                style={{
                                  position: 'absolute', top: 8, right: 8,
                                  background: '#f97316', borderRadius: 999,
                                  width: 22, height: 22,
                                  display: 'grid', placeItems: 'center',
                                }}
                              >
                                <Check size={13} color="#fff" strokeWidth={3} />
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Flag image */}
                          <motion.div
                            animate={{
                              scale: isHov ? 1.15 : 1,
                              rotate: isHov ? [0, -4, 4, 0] : 0,
                            }}
                            transition={{ duration: 0.3 }}
                          >
                            <img
                              src={flagUrl(country.code, 80)}
                              alt={country.name}
                              style={{
                                width: 44, height: 32,
                                objectFit: 'cover',
                                borderRadius: 4,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                                border: '1px solid rgba(255,255,255,0.15)',
                              }}
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                          </motion.div>

                          {/* Name + currency */}
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: isSel ? '#fb923c' : 'rgba(255,255,255,0.9)', lineHeight: 1.3 }}>
                              {country.name}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 4, marginTop: 3 }}>
                              <span style={{ fontSize: 10, color: isSel ? '#fb923c' : 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                                {country.currency}
                              </span>
                              {country.domain && (
                                <span style={{ fontSize: 9, color: '#f97316', fontWeight: 700 }}>↗</span>
                              )}
                            </div>
                          </div>

                          {/* Arrow hint */}
                          <motion.div
                            animate={{ x: isHov ? 2 : 0, y: isHov ? -2 : 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ position: 'absolute', bottom: 6, right: 6, color: 'rgba(255,255,255,0.15)' }}
                          >
                            <ArrowUpRight size={12} />
                          </motion.div>

                          {/* Hover gradient overlay */}
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(135deg, rgba(249,115,22,0.06) 0%, transparent 100%)',
                            opacity: isHov ? 1 : 0,
                            transition: 'opacity 0.2s ease',
                            pointerEvents: 'none',
                          }} />
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>

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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="cg-others-grid"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, paddingBottom: 8 }}
            >
              {filtered.map((country, index) => {
                const isSel = selected === country.code
                const isHov = hovered === country.code
                return (
                  <motion.div
                    key={country.code}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.4) }}
                  >
                    <div
                      onClick={() => handleSelect(country.code)}
                      onMouseEnter={() => setHovered(country.code)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        border: isSel
                          ? '1.5px solid #f97316'
                          : '1.5px solid rgba(255,255,255,0.1)',
                        background: isSel
                          ? 'rgba(249,115,22,0.15)'
                          : isHov
                          ? 'rgba(255,255,255,0.1)'
                          : 'rgba(255,255,255,0.05)',
                        borderRadius: 14,
                        padding: '11px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        transition: 'all 0.15s ease',
                        transform: isHov ? 'translateX(3px)' : 'none',
                      }}
                    >
                      <img
                        src={flagUrl(country.code, 40)}
                        alt={country.name}
                        style={{
                          width: 28, height: 20,
                          objectFit: 'cover',
                          borderRadius: 3,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          flexShrink: 0,
                        }}
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: isSel ? '#fb923c' : 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {country.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                          {country.currency}{country.domain ? ' · ↗' : ''}
                        </div>
                      </div>
                      {isSel && (
                        <Check size={14} color="#f97316" strokeWidth={3} style={{ flexShrink: 0 }} />
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
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
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedCountry.code}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                  >
                    <img
                      src={flagUrl(selectedCountry.code, 48)}
                      alt={selectedCountry.name}
                      style={{ width: 30, height: 22, objectFit: 'cover', borderRadius: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.12)' }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#ffffff' }}>{selectedCountry.name}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                        {selectedCountry.currency}{selectedCountry.domain ? ` · ${selectedCountry.domain}` : ''}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              ) : (
                <button type="button" onClick={dismiss} style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Skip for now
                </button>
              )}
            </div>

            <button
              type="button"
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
              onMouseEnter={e => {
                if (selected && !redirecting) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 16px 48px rgba(249,115,22,0.5)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = selected ? '0 8px 32px rgba(249,115,22,0.35)' : 'none'
              }}
            >
              {redirecting ? (
                <>
                  <div style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'cg-spin 0.65s linear infinite', flexShrink: 0 }} />
                  Taking you there…
                </>
              ) : (
                <>
                  {selected ? 'Shop Now' : 'Choose Country'}
                  {selected && selectedCountry?.domain && (
                    <ArrowUpRight size={16} />
                  )}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  )
}
