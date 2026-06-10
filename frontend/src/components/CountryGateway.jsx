import React, { useEffect, useMemo, useRef, useState } from 'react'
import { COUNTRY_LIST } from '../utils/constants'
import { loadCountryRegistry } from '../util/countryRegistry'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight, Check } from 'lucide-react'

const GATEWAY_SEEN_KEY = 'country_gateway_seen'

const PANEL_PREFIXES = ['/user', '/manager', '/admin', '/dropshipper', '/shop-vendor', '/seo', '/inbox', '/customer', '/login', '/signup', '/register', '/agent', '/confirmer', '/commissioner', '/investor', '/partner']

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
        @keyframes cg-spin { to { transform: rotate(360deg) } }
        .cg-body::-webkit-scrollbar { width: 4px }
        .cg-body::-webkit-scrollbar-track { background: transparent }
        .cg-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 99px }
        .cg-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
        @media (max-width: 900px) { .cg-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 560px) { .cg-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; } }
      `}</style>

      {/* Full-screen overlay */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'linear-gradient(160deg, #fafafa 0%, #f5f5f5 50%, #fafaf5 100%)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.4s ease',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
        className="cg-body"
      >
        {/* Skip / close button (top right) */}
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

        <div style={{ width: '100%', maxWidth: 1100, padding: '48px 24px 80px' }}>

          {/* ── Header: Logo + Title ── */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', marginBottom: 48 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
              <img
                src="/BSBackgroundremoved.png"
                alt="BuySial"
                style={{ height: 76, objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none' }}
              />
            </div>
            <p style={{ fontSize: 17, color: '#71717a', fontWeight: 400 }}>
              Select your region to continue
            </p>
          </motion.div>

          {/* ── Country cards grid ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="cg-grid"
          >
            {allCountries.map((country, index) => (
              <motion.div
                key={country.code}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
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

          {/* ── Other countries (if any) ── */}
          {otherCountries.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              style={{ marginTop: 32 }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                More Countries
              </div>
              <div className="cg-grid">
                {otherCountries.map((country, index) => (
                  <motion.div
                    key={country.code}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.6 + index * 0.05 }}
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

          {/* ── Selected Region + Continue ── */}
          <AnimatePresence>
            {selectedCountry && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                style={{ marginTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}
              >
                {/* Selected region card */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 14,
                  padding: '16px 28px',
                  borderRadius: 16,
                  background: 'rgba(24,24,27,0.04)',
                  border: '1px solid rgba(24,24,27,0.08)',
                }}>
                  <img
                    src={flagUrl(selectedCountry.code, 48)}
                    alt={selectedCountry.name}
                    style={{ width: 36, height: 26, objectFit: 'cover', borderRadius: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.06)' }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                  <div>
                    <div style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 500 }}>Selected Region</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 17, color: '#18181b' }}>{selectedCountry.name}</span>
                      <span style={{ fontSize: 13, color: '#71717a' }}>{selectedCountry.currency}</span>
                    </div>
                  </div>
                </div>

                {/* Continue button */}
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={redirecting}
                  style={{
                    height: 52,
                    paddingInline: 40,
                    borderRadius: 14,
                    border: 'none',
                    background: '#18181b',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: redirecting ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 20px rgba(24,24,27,0.25)',
                    letterSpacing: '-0.01em',
                  }}
                  onMouseEnter={e => {
                    if (!redirecting) {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 30px rgba(24,24,27,0.35)'
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(24,24,27,0.25)'
                  }}
                >
                  {redirecting ? (
                    <>
                      <div style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'cg-spin 0.65s linear infinite', flexShrink: 0 }} />
                      Taking you there…
                    </>
                  ) : (
                    <>
                      Continue to {selectedCountry.name}
                      {selectedCountry.domain && <ArrowUpRight size={16} />}
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  )
}
