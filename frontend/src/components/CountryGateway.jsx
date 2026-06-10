import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Globe2 } from 'lucide-react'
import { cn } from '../utils/cn'
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
    if (localStorage.getItem('country_domain_locked_code')) return false
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
      setTimeout(() => setVisible(true), 100)
    }).catch(() => {
      if (!alive) return
      setMounted(true)
      setTimeout(() => setVisible(true), 100)
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
    setTimeout(() => setMounted(false), 400)
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

  if (!mounted) return null

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6" style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-3xl overflow-hidden rounded-[24px] border border-slate-800 bg-[#0b1120] shadow-2xl flex flex-col"
            style={{ maxHeight: '90vh' }}
          >
            {/* Top orange gradient line */}
            <div className="h-1 w-full bg-gradient-to-r from-orange-600 via-orange-400 to-orange-600" />
            
            {/* Header */}
            <div className="p-6 pb-4 sm:p-8 sm:pb-5 shrink-0 relative">
              {/* Logo text - small buysial top left corner */}
              <div className="absolute top-4 left-6 flex items-center gap-1.5 opacity-60">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">b</div>
                <span className="text-[11px] font-bold tracking-wide text-white">buysial</span>
              </div>

              <button onClick={dismiss} className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                <X size={16} />
              </button>
              
              <div className="mt-6 flex items-start gap-4">
                <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.15)]">
                  <Globe2 size={26} />
                </div>
                <div>
                  <h2 className="text-[22px] font-bold tracking-tight text-white sm:text-2xl">Where are you shopping from?</h2>
                  <p className="mt-1 text-sm text-slate-400">Choose your country for local prices, currency, and fast delivery.</p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mt-6 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search country..."
                  className="w-full rounded-[14px] border border-slate-700/80 bg-slate-900/50 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all"
                />
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-4 space-y-6 gw-scroll">
              <style>{`
                .gw-scroll::-webkit-scrollbar { width: 4px; }
                .gw-scroll::-webkit-scrollbar-track { background: transparent; }
                .gw-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
                .gw-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
              `}</style>
              
              {!search.trim() && (
                <div>
                  <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span>🔥 POPULAR REGIONS</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {featured.map((country) => (
                      <CountryCard key={country.code} country={country} isSelected={selected === country.code} onClick={() => handleSelect(country.code)} />
                    ))}
                  </div>
                </div>
              )}

              <div>
                {!search.trim() && (
                  <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    ALL COUNTRIES
                  </div>
                )}
                {filtered.length === 0 && (
                  <div className="py-8 text-center text-sm text-slate-500">
                    No countries found matching "{search}"
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((country) => (
                    <CountryCard key={country.code} country={country} isSelected={selected === country.code} onClick={() => handleSelect(country.code)} />
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-slate-800/80 bg-[#0b1120] p-6 flex items-center justify-between">
              <button onClick={dismiss} className="text-sm font-medium text-slate-500 hover:text-white transition-colors">
                Skip for now
              </button>
              <button
                onClick={handleContinue}
                disabled={!selected || redirecting}
                className={cn(
                  "flex items-center gap-2 rounded-[14px] px-6 py-2.5 text-sm font-semibold transition-all",
                  selected && !redirecting
                    ? "bg-slate-800 text-white hover:bg-slate-700 shadow-md"
                    : "bg-slate-800/40 text-slate-500 cursor-not-allowed"
                )}
              >
                {redirecting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-[2.5px] border-slate-400 border-t-white" />
                    Redirecting...
                  </>
                ) : (
                  'Choose Country'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function CountryCard({ country, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start gap-2.5 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5",
        isSelected
          ? "border-orange-500/50 bg-orange-500/10 shadow-[0_4px_20px_rgba(249,115,22,0.1)]"
          : "border-slate-800/80 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800/60"
      )}
    >
      <img
        src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
        alt={country.name}
        className="h-[20px] w-auto rounded-[3px] object-cover shadow-sm"
      />
      <div className="w-full">
        <div className={cn("truncate text-[13px] font-bold mt-1", isSelected ? "text-white" : "text-slate-100")}>
          {country.name}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <div className="text-[11px] font-semibold text-slate-500">
            {country.currency}
          </div>
          {country.domain && (
            <div className="flex h-4 w-4 items-center justify-center rounded-[4px] bg-blue-500 text-white shadow-sm">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
