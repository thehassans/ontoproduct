import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../../components/layout/Header'
import { apiGet } from '../../api'
import ShoppingCart from '../../components/ecommerce/ShoppingCart'
import { detectCountryCode } from '../../utils/geo'
import PremiumHeroBanner from '../../components/ecommerce/PremiumHeroBanner'
import MobileBottomNav from '../../components/ecommerce/MobileBottomNav'
import PremiumFooter from '../../components/layout/PremiumFooter'
import CategoryBrowser from '../../components/ecommerce/CategoryBrowser'
import HomeMiniBanner from '../../components/ecommerce/HomeMiniBanner'
import BrandBrowser from '../../components/ecommerce/BrandBrowser'
import ExploreMoreBlock from '../../components/ecommerce/ExploreMoreBlock'
import PromoBlock from '../../components/ecommerce/PromoBlock'

export default function Home(){
  const navigate = useNavigate()
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileCountryOpen, setMobileCountryOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef(null)
  const [categoryNames, setCategoryNames] = useState(['products', 'deals', 'trending'])
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [placeholderAnim, setPlaceholderAnim] = useState(false)
  const [cartCount, setCartCount] = useState(() => { try { const c = JSON.parse(localStorage.getItem('shopping_cart') || '[]'); return c.reduce((s, i) => s + (i.quantity || 1), 0) } catch { return 0 } })
  const [catNav, setCatNav] = useState({ enabled: false, categories: [] })
  const [activeCat, setActiveCat] = useState('All')
  const [annBar, setAnnBar] = useState(null)
  const [navScrolled, setNavScrolled] = useState(false)
  const [homeHeadline, setHomeHeadline] = useState({
    enabled: true,
    badge: 'Premium Shopping',
    title: 'Discover premium products, delivered fast',
    subtitle: 'Curated collections, trusted quality, and seamless shopping across the Gulf.',
    chips: [],
    speed: 18,
    bg1: '#111827',
    bg2: '#1f2937',
    textColor: '#ffffff'
  })
  const COUNTRY_LIST_LOCAL = [
    { code: 'GB', name: 'UK', flag: '🇬🇧' }, { code: 'US', name: 'USA', flag: '🇺🇸' },
    { code: 'AE', name: 'UAE', flag: '🇦🇪' }, { code: 'SA', name: 'KSA', flag: '🇸🇦' },
    { code: 'OM', name: 'Oman', flag: '🇴🇲' }, { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
    { code: 'IN', name: 'India', flag: '🇮🇳' }, { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
    { code: 'KW', name: 'Kuwait', flag: '🇰🇼' }, { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' }, { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  ]
  const [selectedCountry, setSelectedCountry] = useState(() => {
    try { return localStorage.getItem('selected_country') || 'GB' } catch { return 'GB' }
  })
  const currentFlag = COUNTRY_LIST_LOCAL.find(c => c.code === selectedCountry)?.flag || '🇬🇧'
  const currentCountryName = COUNTRY_LIST_LOCAL.find(c => c.code === selectedCountry)?.name || 'UK'
  // Persist selected country
  useEffect(()=>{
    try { localStorage.setItem('selected_country', selectedCountry) } catch {}
  },[selectedCountry])

  // Listen for country changes from Header
  useEffect(() => {
    const handleCountryChange = (e) => {
      if (e.detail?.code) {
        setSelectedCountry(e.detail.code)
      }
    }
    window.addEventListener('countryChanged', handleCountryChange)
    return () => window.removeEventListener('countryChanged', handleCountryChange)
  }, [])

  // On first visit, auto-detect country if none saved
  useEffect(() => {
    (async () => {
      try {
        const saved = localStorage.getItem('selected_country')
        if (!saved) {
          const code = await detectCountryCode()
          setSelectedCountry(code)
          try { localStorage.setItem('selected_country', code) } catch {}
        }
      } catch {}
    })()
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await apiGet('/api/settings/website/content?page=home')
        const elements = Array.isArray(res?.content?.elements) ? res.content.elements : []
        const getText = (id, fallback = '') => {
          const el = elements.find((e) => e?.id === id)
          return typeof el?.text === 'string' ? el.text : fallback
        }

        const enabledRaw = getText('homeHeadline_enabled', 'true')
        const enabled = String(enabledRaw).toLowerCase() !== 'false'
        const badge = getText('homeHeadline_badge', homeHeadline.badge)
        const title = getText('homeHeadline_title', homeHeadline.title)
        const subtitle = getText('homeHeadline_subtitle', homeHeadline.subtitle)
        const chip1 = getText('homeHeadline_chip1', homeHeadline.chips?.[0] || '')
        const chip2 = getText('homeHeadline_chip2', homeHeadline.chips?.[1] || '')
        const chip3 = getText('homeHeadline_chip3', homeHeadline.chips?.[2] || '')
        const chip4 = getText('homeHeadline_chip4', homeHeadline.chips?.[3] || '')
        const speedRaw = getText('homeHeadline_speed', String(homeHeadline.speed ?? 18))
        const bg1 = getText('homeHeadline_bg1', homeHeadline.bg1)
        const bg2 = getText('homeHeadline_bg2', homeHeadline.bg2)
        const textColor = getText('homeHeadline_textColor', homeHeadline.textColor || '#ffffff')

        const hasTickerConfig = elements.some((e) =>
          e?.id === 'homeHeadline_speed' ||
          e?.id === 'homeHeadline_bg1' ||
          e?.id === 'homeHeadline_bg2' ||
          e?.id === 'homeHeadline_textColor'
        )

        const legacyDefaultSet = new Set(['Trending', 'Categories', 'Super Deals', 'Discover'])
        const rawChips = [chip1, chip2, chip3, chip4].filter(Boolean)
        const chips = hasTickerConfig
          ? rawChips
          : rawChips.filter((c) => !legacyDefaultSet.has(String(c).trim()))

        const speedNum = Number(speedRaw)
        const speed = Number.isFinite(speedNum) && speedNum > 0 ? speedNum : (homeHeadline.speed ?? 18)

        // Parse category nav settings
        const catNavEnabled = getText('catNav_enabled', 'true') !== 'false'
        const catNavRaw = getText('catNav_categories', '')
        const catNavList = catNavRaw ? catNavRaw.split(',').map(s => s.trim()).filter(Boolean) : []

        if (alive) {
          setHomeHeadline({
            enabled,
            badge,
            title,
            subtitle,
            chips,
            speed,
            bg1,
            bg2,
            textColor
          })
          setCatNav({ enabled: catNavEnabled, categories: catNavList })

          // Parse announcement bar
          const annEnabled = getText('annBar_enabled', 'true') !== 'false'
          if (annEnabled) {
            setAnnBar({
              text: getText('annBar_text', ''),
              bg: getText('annBar_bg', '#111827'),
              color: getText('annBar_color', '#ffffff'),
            })
          }
        }
      } catch (_err) {
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // Fetch category names for cycling search placeholder
  useEffect(() => {
    (async () => {
      try {
        const countryName = COUNTRY_LIST_LOCAL.find(c => c.code === selectedCountry)?.name || selectedCountry
        const res = await apiGet(`/api/categories/public?country=${encodeURIComponent(countryName)}`)
        const cats = Array.isArray(res?.categories) ? res.categories : []
        if (cats.length) setCategoryNames(cats.map(c => c.name))
      } catch {}
    })()
  }, [selectedCountry])

  // Cycle through category names for placeholder with slide-up
  useEffect(() => {
    if (categoryNames.length <= 1) return
    const timer = setInterval(() => {
      setPlaceholderAnim(true)
      setTimeout(() => {
        setPlaceholderIdx(prev => (prev + 1) % categoryNames.length)
        setPlaceholderAnim(false)
      }, 300)
    }, 2500)
    return () => clearInterval(timer)
  }, [categoryNames])

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Track cart count updates
  useEffect(() => {
    const update = () => { try { const c = JSON.parse(localStorage.getItem('shopping_cart') || '[]'); setCartCount(c.reduce((s, i) => s + (i.quantity || 1), 0)) } catch { setCartCount(0) } }
    window.addEventListener('cartUpdated', update); window.addEventListener('storage', update)
    return () => { window.removeEventListener('cartUpdated', update); window.removeEventListener('storage', update) }
  }, [])

  const handleMobileCountryChange = (code) => {
    setSelectedCountry(code)
    setMobileCountryOpen(false)
    try { localStorage.setItem('selected_country', code) } catch {}
    window.dispatchEvent(new CustomEvent('countryChanged', { detail: { code } }))
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f4f4' }}>
      {/* Announcement bar — mobile only (desktop gets it from Header.jsx) */}
      {annBar?.text && (
        <div className="lg:hidden" style={{
          background: annBar.bg || '#111827',
          color: annBar.color || '#fff',
          textAlign: 'center',
          padding: '8px 16px',
          fontSize: 12,
          fontWeight: 500,
          lineHeight: 1.4,
          letterSpacing: '0.01em',
        }}>
          {annBar.text}
        </div>
      )}
      {/* Desktop Header only (hidden on tablet & mobile) */}
      <div className="hidden lg:block">
        <Header onCartClick={() => setIsCartOpen(true)} />
      </div>

      {/* ── Category Nav Bar ── transparent overlay on hero, glassmorphism when scrolled */}
      {catNav.enabled && catNav.categories.length > 0 && (
        <div
          className="sticky top-0 z-40"
          style={{
            background: navScrolled ? 'rgba(8,8,18,0.72)' : 'transparent',
            backdropFilter: navScrolled ? 'blur(18px)' : 'none',
            WebkitBackdropFilter: navScrolled ? 'blur(18px)' : 'none',
            transition: 'background 0.3s, backdrop-filter 0.3s',
          }}
        >
          {/* BuySial logo — appears when scrolled */}
          {navScrolled && (
            <div style={{ padding: '8px 14px 0', display: 'flex', alignItems: 'center' }}>
              <img src="/BuySial2.png" alt="BuySial" style={{ height: 20, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.92 }} />
            </div>
          )}
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {['All', ...catNav.categories].map((cat, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveCat(cat)
                    if (cat === 'All') { navigate('/catalog') }
                    else { navigate(`/catalog?category=${encodeURIComponent(cat)}`) }
                  }}
                  className="flex-shrink-0 px-4 py-3 text-sm font-semibold whitespace-nowrap"
                  style={{
                    color: activeCat === cat ? '#ffffff' : 'rgba(255,255,255,0.72)',
                    borderBottom: activeCat === cat ? '2px solid #ffffff' : '2px solid transparent',
                    textShadow: navScrolled ? 'none' : '0 1px 4px rgba(0,0,0,0.45)',
                    transition: 'color 0.2s, border-color 0.2s',
                  }}
                >
                  {cat}
                </button>
              ))}
              <div className="ml-auto flex-shrink-0 pl-2 pr-3">
                <button
                  onClick={() => navigate('/categories')}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                  title="All categories"
                >
                  <svg className="w-5 h-5" style={{ color: '#fff' }} fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <h1 className="sr-only">BuySial Commerce</h1>

      {/* Hero Banner — pulled up 44px behind the transparent nav */}
      <div className="relative lg:hidden" style={{ marginTop: catNav.enabled && catNav.categories.length > 0 ? '-44px' : 0 }}>
        <PremiumHeroBanner />
        {/* Floating hamburger + search + cart on banner */}
        <div className="absolute left-3 right-3 z-30 flex items-center justify-between pointer-events-none" style={{ top: catNav.enabled && catNav.categories.length > 0 ? '56px' : '12px' }}>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="pointer-events-auto w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-sm flex items-center justify-center active:scale-95 transition-transform"
          >
            <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></svg>
          </button>
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => { setMobileSearchOpen(prev => !prev); setTimeout(() => searchInputRef.current?.focus(), 100) }}
              className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-sm flex items-center justify-center active:scale-95 transition-transform"
            >
              <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            </button>
            <button
              onClick={() => navigate('/cart')}
              className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-sm flex items-center justify-center active:scale-95 transition-transform relative"
            >
              <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">{cartCount > 99 ? '99+' : cartCount}</span>}
            </button>
          </div>
        </div>
        {/* Search bar — slides in from top when search icon clicked */}
        <div className={`absolute bottom-3 left-3 right-3 z-30 transition-all duration-300 ${mobileSearchOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <form onSubmit={e => { e.preventDefault(); if (searchQuery.trim()) { navigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`); setSearchQuery(''); setMobileSearchOpen(false) } }} className="flex items-center gap-2.5 bg-black/30 backdrop-blur-xl rounded-full px-4 py-2.5 shadow-lg border border-white/20">
            <svg className="w-4 h-4 text-white/70 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <div className="flex-1 relative h-5">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-full bg-transparent border-none outline-none text-sm text-white focus:ring-0"
                style={{WebkitAppearance:'none'}}
              />
              {!searchQuery && (
                <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden">
                  <span className="text-sm text-white/60">Search </span>
                  <span className="text-sm text-white/60 ml-1 inline-block transition-all duration-300 ease-out" style={{transform: placeholderAnim ? 'translateY(-120%)' : 'translateY(0)', opacity: placeholderAnim ? 0 : 1}}>{categoryNames[placeholderIdx] || 'products'}...</span>
                </div>
              )}
            </div>
            <button type="button" onClick={() => setMobileSearchOpen(false)} className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </form>
        </div>
      </div>
      {/* Desktop banner */}
      <div className="hidden lg:block relative">
        <PremiumHeroBanner />
      </div>

      {/* Mobile slide-out menu — OnBuy-style sections */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[9999] lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-0 left-0 bottom-0 w-[80vw] max-w-[320px] bg-white shadow-2xl flex flex-col animate-[slideIn_0.25s_cubic-bezier(0.16,1,0.3,1)] overflow-y-auto z-10">
            {/* Shop header section */}
            <div className="bg-gray-900 text-white px-5 pt-7 pb-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[17px] font-bold tracking-wide">Shop</span>
                <button onClick={() => setMobileMenuOpen(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
              </div>
              {[
                { to: '/catalog?sort=newest', label: 'NEW ARRIVALS' },
                { to: '/catalog?sort=popular', label: 'BEST SELLERS' },
                { to: '/catalog', label: 'ALL PRODUCTS' },
              ].map(item => (
                <Link key={item.to} to={item.to} onClick={() => setMobileMenuOpen(false)} className="block py-2 text-[13px] font-semibold text-white/90 tracking-wider hover:text-white transition-colors">
                  {item.label}
                </Link>
              ))}
            </div>

            {/* See all categories */}
            <div className="px-5 pt-5 pb-2">
              <Link to="/categories" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between py-2 text-[15px] font-bold text-blue-600 hover:text-blue-700 transition-colors">
                <span>See all categories</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
              </Link>
            </div>

            {/* Dynamic category list */}
            <nav className="px-5 pb-3">
              {categoryNames.slice(0, 8).map((cat) => (
                <Link
                  key={cat}
                  to={`/catalog?category=${encodeURIComponent(cat)}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 text-[15px] text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <span>{cat}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                </Link>
              ))}
            </nav>

            {/* Divider */}
            <div className="h-px bg-gray-200 mx-5 my-1" />

            {/* Account & Help section */}
            <div className="px-5 pt-3 pb-5">
              <h3 className="text-[15px] font-bold text-gray-900 mb-2">Account & Help</h3>
              {[
                { to: '/customer', label: 'Your Account' },
                { to: '/customer/orders', label: 'Your Orders' },
                { to: '/about', label: 'About Us' },
                { to: '/contact', label: 'Help & Contact' },
              ].map(item => (
                <Link key={item.to} to={item.to} onClick={() => setMobileMenuOpen(false)} className="block py-2.5 text-[14px] text-gray-600 hover:text-gray-900 transition-colors">
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Country at bottom */}
            <div className="mt-auto px-5 pb-6 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                <span>{currentFlag} {currentCountryName}</span>
              </div>
            </div>
          </div>
          <style>{`@keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>
        </div>
      )}

      {/* Home headline ticker — above deliver-to */}
      {homeHeadline?.enabled ? (
        <section className="max-w-7xl mx-auto px-1 sm:px-2 lg:px-4">
          <div
            className="relative overflow-hidden rounded-2xl shadow-xl border border-white"
            style={{
              background: `linear-gradient(90deg, ${homeHeadline?.bg1 || '#0b5ed7'}, ${homeHeadline?.bg2 || '#f97316'})`,
            }}
          >
            <div className="homeHeadlineMarqueeViewport">
              <div
                className="homeHeadlineMarqueeTrack"
                style={{
                  animationDuration: `${Math.max(5, Math.min(300, Number(homeHeadline?.speed) || 18))}s`,
                }}
              >
                <div className="homeHeadlineMarqueeGroup" style={{ color: homeHeadline?.textColor || '#ffffff' }}>
                  {[homeHeadline?.badge, homeHeadline?.title, homeHeadline?.subtitle, ...(homeHeadline?.chips || [])]
                    .map((t) => (typeof t === 'string' ? t.trim() : ''))
                    .filter(Boolean)
                    .map((t, idx) => (
                      <span key={`a-${idx}`} className="homeHeadlineMarqueeItem">{t}</span>
                    ))}
                </div>
                <div className="homeHeadlineMarqueeGroup" aria-hidden="true" style={{ color: homeHeadline?.textColor || '#ffffff' }}>
                  {[homeHeadline?.badge, homeHeadline?.title, homeHeadline?.subtitle, ...(homeHeadline?.chips || [])]
                    .map((t) => (typeof t === 'string' ? t.trim() : ''))
                    .filter(Boolean)
                    .map((t, idx) => (
                      <span key={`b-${idx}`} className="homeHeadlineMarqueeItem">{t}</span>
                    ))}
                </div>
              </div>
            </div>
            <style jsx>{`
              .homeHeadlineMarqueeViewport {
                overflow: hidden;
                white-space: nowrap;
                padding: 10px 14px;
              }
              .homeHeadlineMarqueeTrack {
                display: inline-flex;
                gap: 0;
                will-change: transform;
                animation-name: homeHeadlineMarquee;
                animation-timing-function: linear;
                animation-iteration-count: infinite;
              }
              .homeHeadlineMarqueeGroup {
                display: inline-flex;
                align-items: center;
                gap: 18px;
                padding-right: 18px;
                font-weight: 700;
                font-size: 13px;
                letter-spacing: 0.2px;
              }
              .homeHeadlineMarqueeItem {
                display: inline-flex;
                align-items: center;
                gap: 10px;
              }
              .homeHeadlineMarqueeItem::after {
                content: "|";
                opacity: 0.75;
                margin-left: 18px;
              }
              .homeHeadlineMarqueeGroup .homeHeadlineMarqueeItem:last-child::after {
                content: "";
                margin-left: 0;
              }
              @keyframes homeHeadlineMarquee {
                0% {
                  transform: translateX(0);
                }
                100% {
                  transform: translateX(-50%);
                }
              }
            `}</style>
          </div>
        </section>
      ) : null}

      {/* Deliver to — below headline, ultra premium minimalist */}
      <div className="lg:hidden relative">
        <div className="bg-white/95 backdrop-blur-sm px-4 py-2.5 flex items-center gap-2 border-b border-gray-100/80">
          <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
          <button onClick={() => setMobileCountryOpen(!mobileCountryOpen)} className="flex items-center gap-1.5 text-[13px] text-gray-600">
            <span className="font-medium">Deliver to</span>
            <span className="font-bold text-gray-900">{currentFlag} {currentCountryName}</span>
            <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${mobileCountryOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
          </button>
        </div>
        {mobileCountryOpen && (
          <div className="absolute left-2 right-2 top-full -mt-1 max-h-64 overflow-y-auto bg-white rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.15)] border border-gray-100 py-1 z-50">
            {COUNTRY_LIST_LOCAL.map(c => (
              <button key={c.code} onClick={() => handleMobileCountryChange(c.code)} className={`w-full px-4 py-2.5 flex items-center gap-2.5 text-left text-sm transition-colors ${selectedCountry === c.code ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                <span>{c.flag}</span><span>{c.name}</span>
                {selectedCountry === c.code && <svg className="w-3.5 h-3.5 ml-auto text-orange-500" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Home Mini Banner — promotional block before categories */}
      <HomeMiniBanner selectedCountry={selectedCountry} />

      {/* Category Browser — horizontal pills + horizontal product scroll */}
      <CategoryBrowser selectedCountry={selectedCountry} />

      {/* Brand Browser — horizontal brand logos */}
      <BrandBrowser />

      {/* Explore More — promotional blocks */}
      <ExploreMoreBlock />

      {/* Promo Block — cashback/shop/delivery */}
      <PromoBlock />

      <PremiumFooter />

      {/* Shopping Cart Sidebar */}
      <ShoppingCart 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onCartClick={() => setIsCartOpen(true)} />
    </div>
  )
}
