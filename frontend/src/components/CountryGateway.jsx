import React, { useEffect, useMemo, useRef, useState } from 'react'
import { COUNTRY_LIST } from '../utils/constants'
import { loadCountryRegistry } from '../util/countryRegistry'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight, Check } from 'lucide-react'

const GATEWAY_SEEN_KEY = 'country_gateway_seen'

const PANEL_PREFIXES = ['/user', '/manager', '/admin', '/dropshipper', '/shop-vendor', '/seo', '/designer', '/inbox', '/customer', '/login', '/signup', '/register', '/agent', '/confirmer', '/commissioner', '/investor', '/partner', '/driver']

const FEATURED_CODES = ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'IN', 'PK', 'GB', 'US']

function shouldShowGateway() {
  try {
    const hostname = window.location.hostname.toLowerCase()
    if (hostname !== 'buysial.com' && hostname !== 'localhost' && hostname !== '127.0.0.1') return false
    const path = window.location.pathname
    if (PANEL_PREFIXES.some(p => path === p || path.startsWith(p + '/'))) return false
    if (localStorage.getItem('country_domain_locked_code')) return false
    if (sessionStorage.getItem(GATEWAY_SEEN_KEY)) return false
    return true
  } catch {
    return false
  }
}

function flagUrl(code, size = 80) {
  return `https://flagcdn.com/w${size}/${String(code || '').toLowerCase()}.png`
}

/* ─── Scoped card component ─── */
function CountryCard({ country, isSelected, isHovered, onSelect, onHover, onLeave }) {
  return (
    <div
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        borderRadius: 16,
        border: isSelected ? '2px solid #18181b' : '1px solid rgba(0,0,0,0.08)',
        background: isSelected ? 'rgba(24,24,27,0.04)' : '#ffffff',
        boxShadow: isSelected
          ? '0 0 0 3px rgba(24,24,27,0.08), 0 10px 30px rgba(0,0,0,0.08)'
          : isHovered
          ? '0 20px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)'
          : '0 1px 3px rgba(0,0,0,0.04)',
        transform: isHovered && !isSelected ? 'scale(1.04)' : 'scale(1)',
        transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        padding: '28px 16px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Check mark */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            style={{
              position: 'absolute', top: 10, right: 10,
              background: '#18181b', borderRadius: 999,
              width: 24, height: 24,
              display: 'grid', placeItems: 'center',
            }}
          >
            <Check size={14} color="#fff" strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flag */}
      <motion.div
        animate={{
          scale: isHovered ? 1.15 : 1,
          rotate: isHovered ? [0, -5, 5, 0] : 0,
        }}
        transition={{ duration: 0.3 }}
      >
        <img
          src={flagUrl(country.code, 80)}
          alt={country.name}
          style={{
            width: 52, height: 38,
            objectFit: 'cover',
            borderRadius: 5,
            boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
          onError={(e) => {
            e.target.style.display = 'none'
            e.target.nextSibling && (e.target.nextSibling.style.display = 'block')
          }}
        />
        {/* Fallback emoji */}
        <span style={{ display: 'none', fontSize: 36, lineHeight: 1 }}>{country.flag || '🌍'}</span>
      </motion.div>

      {/* Name + currency */}
      <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
        <div style={{ fontWeight: 600, fontSize: 16, color: '#18181b', letterSpacing: '-0.01em' }}>
          {country.name}
        </div>
        <div style={{ fontSize: 13, color: '#71717a', fontWeight: 500, marginTop: 2 }}>
          {country.currency}
        </div>
      </div>

      {/* Arrow hint */}
      <motion.div
        animate={{ x: isHovered ? 2 : 0, y: isHovered ? -2 : 0 }}
        transition={{ duration: 0.2 }}
        style={{ position: 'absolute', bottom: 10, right: 10, color: 'rgba(0,0,0,0.15)' }}
      >
        <ArrowUpRight size={14} />
      </motion.div>

      {/* Hover gradient */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(24,24,27,0.03) 0%, transparent 100%)',
        opacity: isHovered ? 1 : 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: 'none',
      }} />
    </div>
  )
}

export default function CountryGateway() {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [countries, setCountries] = useState([...COUNTRY_LIST])
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [redirecting, setRedirecting] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [confirming, setConfirming] = useState(false)

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

  const allCountries = useMemo(
    () => countries.filter(c => FEATURED_CODES.includes(c.code)),
    [countries]
  )

  // Countries not in featured (for "all" section)
  const otherCountries = useMemo(
    () => countries.filter(c => !FEATURED_CODES.includes(c.code)),
    [countries]
  )

  function dismiss() {
    setVisible(false)
    try { sessionStorage.setItem(GATEWAY_SEEN_KEY, '1') } catch {}
    setTimeout(() => setMounted(false), 450)
  }

  // Clicking a country card immediately confirms the selection — no extra
  // scroll or "Continue" click needed. The grid collapses away and either
  // redirects to the country domain or dismisses the gateway right away.
  function handleSelect(code) {
    if (confirming || redirecting) return
    const country = countries.find((c) => c.code === code)
    if (!country) return
    setSelected(code)
    setConfirming(true)

    const domain = String(country.domain || '').trim().toLowerCase()
    try { sessionStorage.setItem(GATEWAY_SEEN_KEY, '1') } catch {}
    try { localStorage.setItem('selected_country', code) } catch {}

    if (domain) {
      setTimeout(() => {
        setRedirecting(true)
        setTimeout(() => { window.location.href = `https://${domain}` }, 550)
      }, 420)
      return
    }

    window.dispatchEvent(new CustomEvent('countryChanged', { detail: { code } }))
    setTimeout(() => dismiss(), 650)
  }

  const selectedCountry = countries.find((c) => c.code === selected)

  if (!mounted) return null

  return (
    <>
      <style>{`
        @keyframes cg-spin { to { transform: rotate(360deg) } }
        .cg-body::-webkit-scrollbar { width: 4px }
        .cg-body::-webkit-scrollbar-track { background: transparent }
        .cg-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 99px }
        .cg-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
        @media (max-width: 900px) { .cg-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 560px) { .cg-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } }
      `}</style>

      {/* Full-screen overlay */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'linear-gradient(160deg, #fafafa 0%, #f5f5f5 50%, #fafaf5 100%)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.4s ease',
          overflowY: confirming ? 'hidden' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: confirming ? 'center' : 'flex-start',
        }}
        className="cg-body"
      >
        {/* Skip / close button (top right) */}
        {!confirming && (
          <button
            onClick={dismiss}
            style={{
              position: 'fixed', top: 20, right: 24, zIndex: 10001,
              fontSize: 13, color: '#a1a1aa', background: 'none', border: 'none',
              cursor: 'pointer', fontWeight: 500,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#18181b' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#a1a1aa' }}
          >
            Skip for now ×
          </button>
        )}

        <AnimatePresence mode="wait">
          {!confirming ? (
            <motion.div
              key="grid"
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35 }}
              style={{ width: '100%', maxWidth: 1080, padding: '44px 24px 56px' }}
            >
              {/* ── Header: Logo + Title ── */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                style={{ textAlign: 'center', marginBottom: 40 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 }}>
                  <img
                    src="/BSBackgroundremoved.png"
                    alt="BuySial"
                    style={{ height: 68, objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </div>
                <p style={{ fontSize: 16, color: '#71717a', fontWeight: 400 }}>
                  Tap your region to continue instantly
                </p>
              </motion.div>

              {/* ── Country cards grid ── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="cg-grid"
              >
                {allCountries.map((country, index) => (
                  <motion.div
                    key={country.code}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, delay: index * 0.04 }}
                  >
                    <CountryCard
                      country={country}
                      isSelected={selected === country.code}
                      isHovered={hovered === country.code}
                      onSelect={() => handleSelect(country.code)}
                      onHover={() => setHovered(country.code)}
                      onLeave={() => setHovered(null)}
                    />
                  </motion.div>
                ))}
              </motion.div>

              {/* ── More countries toggle (kept compact, no forced scroll) ── */}
              {otherCountries.length > 0 && (
                <div style={{ marginTop: 24, textAlign: 'center' }}>
                  <button
                    onClick={() => setShowMore(v => !v)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 600, color: '#71717a',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {showMore ? 'Hide other countries' : `More countries (${otherCountries.length})`}
                    <motion.span animate={{ rotate: showMore ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ display: 'inline-flex' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                    </motion.span>
                  </button>

                  <AnimatePresence>
                    {showMore && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ overflow: 'hidden', marginTop: 18 }}
                      >
                        <div className="cg-grid">
                          {otherCountries.map((country, index) => (
                            <motion.div
                              key={country.code}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3, delay: index * 0.03 }}
                            >
                              <CountryCard
                                country={country}
                                isSelected={selected === country.code}
                                isHovered={hovered === country.code}
                                onSelect={() => handleSelect(country.code)}
                                onHover={() => setHovered(country.code)}
                                onLeave={() => setHovered(null)}
                              />
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          ) : (
            /* ── Centered confirmation (no scroll, immediate feedback) ── */
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, padding: 24 }}
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4, type: 'spring', stiffness: 200 }}
                style={{ position: 'relative' }}
              >
                <img
                  src={flagUrl(selectedCountry?.code, 160)}
                  alt={selectedCountry?.name}
                  style={{ width: 128, height: 92, objectFit: 'cover', borderRadius: 14, boxShadow: '0 20px 50px rgba(0,0,0,0.18)', border: '1px solid rgba(0,0,0,0.06)' }}
                  onError={(e) => { e.target.style.display = 'none' }}
                />
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.35, duration: 0.3 }}
                  style={{
                    position: 'absolute', bottom: -10, right: -10,
                    background: '#18181b', borderRadius: 999,
                    width: 34, height: 34, display: 'grid', placeItems: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                  }}
                >
                  <Check size={18} color="#fff" strokeWidth={3} />
                </motion.div>
              </motion.div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 22, color: '#18181b', letterSpacing: '-0.02em' }}>
                  {selectedCountry?.name}
                </div>
                <div style={{ fontSize: 14, color: '#71717a', marginTop: 4 }}>{selectedCountry?.currency}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#71717a', fontSize: 14, fontWeight: 500 }}>
                <div style={{ width: 15, height: 15, border: '2px solid rgba(24,24,27,0.15)', borderTopColor: '#18181b', borderRadius: '50%', animation: 'cg-spin 0.7s linear infinite' }} />
                {redirecting ? 'Taking you there…' : 'Setting up your experience…'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
