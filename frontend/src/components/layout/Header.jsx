import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { COUNTRY_LIST } from '../../utils/constants'
import { useCountry } from '../../contexts/CountryContext'
import { readWishlistIds, syncWishlistFromServer } from '../../util/wishlist'
import { apiGet, API_BASE } from '../../api.js'

const getCartItemCount = () => {
  try {
    const savedCart = localStorage.getItem('shopping_cart')

    if (!savedCart) return 0
    
    const cartItems = JSON.parse(savedCart)
    return cartItems.reduce((total, item) => total + item.quantity, 0)
  } catch (error) {
    console.error('Error loading cart count:', error)
    return 0
  }
}

const getCartPreviewImage = () => {
  try {
    const savedCart = localStorage.getItem('shopping_cart')
    if (!savedCart) return null
    const cartItems = JSON.parse(savedCart)
    if (cartItems.length === 0) return null
    const lastItem = cartItems[cartItems.length - 1]
    return lastItem.image || lastItem.imagePath || null
  } catch {
    return null
  }
}

// Check if customer is logged in
const getCustomer = () => {
  try {
    const token = localStorage.getItem('token')
    const me = localStorage.getItem('me')
    if (!token || !me) return null
    
    const user = JSON.parse(me)
    if (user.role === 'customer') return user
    return null
  } catch {
    return null
  }
}

const isNativeMobileApp = () => {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

export default function Header({ onCartClick, editMode = false, editState = {}, onExitEdit = null }) {
  const [annBar, setAnnBar] = useState(null) // { text, bg, color }
  const [cartCount, setCartCount] = useState(0)
  const [cartImage, setCartImage] = useState(null)
  const [wishlistCount, setWishlistCount] = useState(() => {
    try {
      return readWishlistIds().length
    } catch {
      return 0
    }
  })
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [customer, setCustomer] = useState(() => getCustomer())
  const [isCountryOpen, setIsCountryOpen] = useState(false)
  const { country: selectedCountry, setCountry: setSelectedCountry } = useCountry()
  const countryRef = useRef(null)
  const brandLogoSrc = isNativeMobileApp() ? '/mobile-app-launcher.png?v=2' : '/BuySial2.png?v=2'
  const navigate = useNavigate()
  const [logoUrl, setLogoUrl] = useState(null)
  const [catNavItems, setCatNavItems] = useState([])
  const [catNavEnabled, setCatNavEnabled] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const lockedCountryCode = (() => {
    try { return String(localStorage.getItem('country_domain_locked_code') || '').toUpperCase().trim() } catch { return '' }
  })()
  const isCountryLocked = !!lockedCountryCode

  useEffect(() => {
    // Load announcement bar from API
    let alive = true
    apiGet('/api/settings/website/content?page=home').then(res => {
      if (!alive) return
      const els = Array.isArray(res?.content?.elements) ? res.content.elements : []
      const get = (id, fb) => { const e = els.find(x => x?.id === id); return typeof e?.text === 'string' ? e.text : fb }
      const enabled = get('annBar_enabled', 'true') !== 'false'
      if (enabled) {
        setAnnBar({
          text: get('annBar_text', ''),
          bg: get('annBar_bg', '#111827'),
          color: get('annBar_color', '#ffffff'),
        })
      } else {
        setAnnBar(null)
      }
      const catEnabled = get('catNav_enabled', 'true') !== 'false'
      setCatNavEnabled(catEnabled)
      const catStr = get('catNav_categories', '')
      if (catStr) setCatNavItems(catStr.split(',').map(s => s.trim()).filter(Boolean))
    }).catch(() => {})

    apiGet('/api/settings/branding').then(res => {
      if (!alive) return
      if (res?.headerLogo) {
        const url = res.headerLogo.startsWith('http') ? res.headerLogo : `${API_BASE || ''}${res.headerLogo}`
        setLogoUrl(url + '?v=2')
      }
    }).catch(() => {})

    return () => { alive = false }
  }, [])

  useEffect(() => {
    // Initial cart count load
    setCartCount(getCartItemCount())
    setCartImage(getCartPreviewImage())
    try {
      setWishlistCount(readWishlistIds().length)
    } catch {}

    // Best-effort: hydrate local wishlist from server (only if logged in as customer)
    try {
      syncWishlistFromServer().catch(() => {})
    } catch {}

    // Listen for cart updates
    const handleCartUpdate = () => {
      setCartCount(getCartItemCount())
      setCartImage(getCartPreviewImage())
    }

    const handleWishlistUpdate = () => {
      try {
        setWishlistCount(readWishlistIds().length)
      } catch {
        setWishlistCount(0)
      }
    }

    // Listen for auth changes
    const handleStorageChange = () => {
      setCartCount(getCartItemCount())
      setCustomer(getCustomer())
    }

    // Close country dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (countryRef.current && !countryRef.current.contains(event.target)) {
        setIsCountryOpen(false)
      }
    }

    window.addEventListener('cartUpdated', handleCartUpdate)
    window.addEventListener('wishlistUpdated', handleWishlistUpdate)
    window.addEventListener('storage', handleStorageChange)
    document.addEventListener('mousedown', handleClickOutside)
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate)
      window.removeEventListener('wishlistUpdated', handleWishlistUpdate)
      window.removeEventListener('storage', handleStorageChange)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleCountryChange = (country) => {
    if (isCountryLocked) return
    setSelectedCountry(country.code)
    setIsCountryOpen(false)
    try { localStorage.setItem('selected_country', country.code) } catch {}
    window.dispatchEvent(new CustomEvent('countryChanged', { detail: country }))
  }

  const currentCountry = COUNTRY_LIST.find(c => c.code === selectedCountry) || COUNTRY_LIST.find(c => c.code === 'SA') || COUNTRY_LIST[0]

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen)
  }

  const handleLogout = () => {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('me')
    } catch {}
    setCustomer(null)
    window.location.href = '/customer/login'
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  const displayLogo = logoUrl || brandLogoSrc

  return (
    <>
    {annBar?.text && (
      <div style={{
        background: annBar.bg || '#111827',
        color: annBar.color || '#fff',
        textAlign: 'center',
        padding: '7px 16px',
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.01em',
        lineHeight: 1.4,
        position: 'relative',
        zIndex: 1001,
      }}>
        {annBar.text}
      </div>
    )}
    <header className="sh-header">
      {/* ── Main Row ── */}
      <div className="sh-main-row">
        {/* Hamburger – mobile only */}
        <button className="sh-ham" onClick={toggleMobileMenu} aria-label="Menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        {/* Logo */}
        <Link to="/" className="sh-logo-link">
          <img src={displayLogo} alt="BuySial" className="sh-logo-img" />
        </Link>

        {/* Search bar – desktop */}
        <form className="sh-search-form" onSubmit={handleSearch}>
          <svg className="sh-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            className="sh-search-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search for styles, brands, and more"
          />
          <button type="submit" className="sh-search-submit">Search</button>
        </form>

        {/* Right icons cluster */}
        <div className="sh-right-icons">
          {/* Edit mode controls */}
          {editMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display:'flex',alignItems:'center',gap:8,padding:'0 12px',background:'linear-gradient(135deg,#667eea,#764ba2)',borderRadius:20,height:34 }}>
                <div style={{ width:6,height:6,borderRadius:'50%',background:'#10b981',animation:'sh-pulse 2s infinite' }}/>
                <span style={{ color:'#fff',fontSize:13,fontWeight:600 }}>Edit Mode</span>
                {editState.elementCount > 0 && <span style={{ background:'rgba(255,255,255,0.25)',color:'#fff',fontSize:11,padding:'2px 8px',borderRadius:10,fontWeight:600 }}>{editState.elementCount}</span>}
              </div>
              <button onClick={() => editState.handleSave && editState.handleSave()} disabled={!editState.canSave||editState.saving} style={{ padding:'7px 16px',background:editState.canSave&&!editState.saving?'#10b981':'#d1d5db',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:editState.canSave&&!editState.saving?'pointer':'not-allowed' }}>
                {editState.saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={onExitEdit} style={{ padding:'7px 16px',background:'#ef4444',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer' }}>Exit</button>
            </div>
          )}

          {!editMode && (
            <>
              {/* Country Selector */}
              <div className="sh-country-wrap" ref={countryRef}>
                <button className="sh-icon-btn" onClick={() => { if (!isCountryLocked) setIsCountryOpen(v => !v) }} title={isCountryLocked ? 'Locked to this country domain' : 'Choose country'}>
                  <span className="sh-icon-emoji">{currentCountry.flag}</span>
                  <span className="sh-icon-lbl">{currentCountry.code}</span>
                  {!isCountryLocked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{marginTop:1}}><path d="M6 9l6 6 6-6"/></svg>}
                </button>
                {isCountryOpen && !isCountryLocked && (
                  <div className="sh-country-drop">
                    {COUNTRY_LIST.map(c => (
                      <button key={c.code} className={`sh-country-opt ${selectedCountry===c.code?'sh-co-active':''}`} onClick={() => handleCountryChange(c)}>
                        <span>{c.flag}</span>
                        <span style={{flex:1,textAlign:'left'}}>{c.name}</span>
                        {selectedCountry===c.code && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Wishlist – available for all users (guest + logged-in) */}
              <Link to={customer ? "/customer/wishlist" : "/wishlist"} className="sh-icon-btn" title="Wishlist">
                <div style={{position:'relative'}}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                  {wishlistCount > 0 && <span className="sh-badge">{wishlistCount > 99 ? '99+' : wishlistCount}</span>}
                </div>
                <span className="sh-icon-lbl">Wishlist</span>
              </Link>

              {/* Cart */}
              <Link to="/cart" className="sh-icon-btn" title="Cart">
                <div style={{position:'relative'}}>
                  {cartImage && cartCount > 0
                    ? <div className="sh-cart-thumb"><img src={cartImage.startsWith('http') ? cartImage : `${window.location.origin}${cartImage.startsWith('/')?'':'/'}${cartImage}`} alt="" onError={e=>e.target.style.display='none'}/></div>
                    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                  }
                  {cartCount > 0 && <span className="sh-badge sh-badge-cart">{cartCount > 99 ? '99+' : cartCount}</span>}
                </div>
                <span className="sh-icon-lbl">Cart</span>
              </Link>

              {/* Account */}
              {customer ? (
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <Link to="/customer" className="sh-icon-btn" title={customer.firstName||'My Account'}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <span className="sh-icon-lbl">{customer.firstName||'Me'}</span>
                  </Link>
                  <button className="sh-logout-btn" onClick={handleLogout}>Logout</button>
                </div>
              ) : (
                <div className="sh-auth-row">
                  <Link to="/customer/login" className="sh-login-btn">Login</Link>
                  <Link to="/register" className="sh-signup-btn">Sign Up</Link>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mobile search + cart (right side on mobile) */}
        <div className="sh-mobile-right">
          <button className="sh-mobile-icon-btn" onClick={toggleSearch} aria-label="Search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </button>
          <Link to="/cart" className="sh-mobile-icon-btn" style={{position:'relative'}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            {cartCount > 0 && <span className="sh-badge sh-badge-cart">{cartCount > 99 ? '99+' : cartCount}</span>}
          </Link>
        </div>
      </div>

      {/* ── Category Nav ── */}
      {catNavEnabled && catNavItems.length > 0 && (
        <nav className="sh-catnav">
          <div className="sh-catnav-inner">
            <Link to="/catalog" className="sh-cat-tab">All</Link>
            {catNavItems.map(cat => (
              <Link key={cat} to={`/catalog?category=${encodeURIComponent(cat)}`} className="sh-cat-tab">{cat}</Link>
            ))}
          </div>
        </nav>
      )}

      {/* ── Search Overlay ── */}
      {isSearchOpen && (
        <div className="sh-overlay" onClick={toggleSearch}>
          <div className="sh-overlay-modal" onClick={e => e.stopPropagation()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{flexShrink:0}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              autoFocus
              placeholder="Search products, brands, categories…"
              className="sh-overlay-input"
              onKeyDown={e => { if (e.key==='Enter' && e.target.value.trim()) { navigate(`/catalog?search=${encodeURIComponent(e.target.value.trim())}`); toggleSearch() } }}
            />
            <button className="sh-overlay-close" onClick={toggleSearch}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile Drawer ── */}
      {isMobileMenuOpen && (
        <div className="sh-drawer">
          <div className="sh-drawer-overlay" onClick={toggleMobileMenu}/>
          <div className="sh-drawer-panel">
            <div className="sh-drawer-head">
              <img src={displayLogo} alt="BuySial" style={{height:36,objectFit:'contain'}}/>
              <button className="sh-drawer-close" onClick={toggleMobileMenu}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            {customer && (
              <div className="sh-drawer-user">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>Hi, <strong>{customer.firstName||'Customer'}</strong></span>
              </div>
            )}
            <nav className="sh-drawer-nav">
              {[['/', 'Home'],['catalog','Products'],['/categories','Categories'],['/about','About'],['/contact','Contact']].map(([to, label]) => (
                <Link key={to} to={to} className="sh-drawer-link" onClick={toggleMobileMenu}>{label}</Link>
              ))}
              {catNavItems.map(cat => (
                <Link key={cat} to={`/catalog?category=${encodeURIComponent(cat)}`} className="sh-drawer-link sh-drawer-cat" onClick={toggleMobileMenu}>{cat}</Link>
              ))}
            </nav>
            <div className="sh-drawer-foot">
              {customer ? (
                <>
                  <Link to="/customer" className="sh-drawer-btn sh-drawer-btn-primary" onClick={toggleMobileMenu}>My Account</Link>
                  <button className="sh-drawer-btn sh-drawer-btn-danger" onClick={() => { toggleMobileMenu(); handleLogout() }}>Logout</button>
                </>
              ) : (
                <>
                  <Link to="/customer/login" className="sh-drawer-btn sh-drawer-btn-outline" onClick={toggleMobileMenu}>Login</Link>
                  <Link to="/register" className="sh-drawer-btn sh-drawer-btn-primary" onClick={toggleMobileMenu}>Sign Up</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* ── Ultra Premium Header ── */
        .sh-header {
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid rgba(229,231,235,0.6);
          box-shadow: 0 1px 3px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.03);
          position: sticky;
          top: 0;
          z-index: 200;
          padding-top: env(safe-area-inset-top, 0px);
        }
        .sh-main-row {
          max-width: 1280px;
          margin: 0 auto;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .sh-ham {
          display: none;
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          color: #1e293b;
          border-radius: 10px;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .sh-ham:hover { background: rgba(249,115,22,0.08); color: #f97316; }
        .sh-logo-link { display: flex; align-items: center; flex-shrink: 0; text-decoration: none; transition: opacity 0.2s; }
        .sh-logo-link:hover { opacity: 0.85; }
        .sh-logo-img { height: 48px; width: auto; max-width: 200px; object-fit: contain; transition: transform 0.3s cubic-bezier(0.16,1,0.3,1); }
        .sh-logo-link:hover .sh-logo-img { transform: scale(1.03); }

        /* Search bar */
        .sh-search-form {
          flex: 1;
          display: flex;
          align-items: center;
          border: 1.5px solid rgba(226,232,240,0.8);
          border-radius: 999px;
          height: 48px;
          overflow: hidden;
          background: linear-gradient(135deg, rgba(248,250,252,0.8) 0%, rgba(241,245,249,0.6) 100%);
          max-width: 640px;
          min-width: 0;
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
          box-shadow: 0 1px 3px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.6);
        }
        .sh-search-form:focus-within {
          border-color: #f97316;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(249,115,22,0.08), 0 8px 28px rgba(249,115,22,0.12), inset 0 1px 0 rgba(255,255,255,0.8);
          transform: translateY(-1px);
        }
        .sh-search-icon { margin: 0 14px; color: #94a3b8; flex-shrink: 0; transition: color 0.2s; }
        .sh-search-form:focus-within .sh-search-icon { color: #f97316; }
        .sh-search-input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 14px;
          color: #1e293b;
          min-width: 0;
          font-family: 'Outfit','Inter',-apple-system,sans-serif;
          font-weight: 500;
          letter-spacing: 0.01em;
        }
        .sh-search-input::placeholder { color: #94a3b8; font-weight: 400; }
        .sh-search-submit {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          color: #fff;
          border: none;
          padding: 0 24px;
          height: 100%;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          border-radius: 0 999px 999px 0;
          letter-spacing: 0.03em;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .sh-search-submit:hover {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          box-shadow: 0 4px 20px rgba(249,115,22,0.35);
        }

        /* Right icons */
        .sh-right-icons {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }
        .sh-icon-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 7px 11px;
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: none;
          color: #1e293b;
          border-radius: 10px;
          transition: all 0.2s ease;
          position: relative;
          min-width: 52px;
        }
        .sh-icon-btn:hover {
          background: rgba(249,115,22,0.06);
          color: #f97316;
          transform: translateY(-1px);
        }
        .sh-icon-emoji { font-size: 18px; line-height: 1; }
        .sh-icon-lbl { font-size: 11px; color: #64748b; white-space: nowrap; font-weight: 500; transition: color 0.2s; }
        .sh-icon-btn:hover .sh-icon-lbl { color: #f97316; }
        .sh-badge {
          position: absolute;
          top: 2px;
          right: 6px;
          background: linear-gradient(135deg, #f97316, #ea580c);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          border-radius: 99px;
          min-width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 3px;
          box-shadow: 0 2px 8px rgba(249,115,22,0.35);
        }
        .sh-badge-cart { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 2px 8px rgba(239,68,68,0.35); }
        .sh-cart-thumb { width: 22px; height: 22px; border-radius: 6px; overflow: hidden; border: 1.5px solid #f97316; box-shadow: 0 2px 8px rgba(249,115,22,0.2); }
        .sh-cart-thumb img { width: 100%; height: 100%; object-fit: cover; }

        /* Country dropdown */
        .sh-country-wrap { position: relative; }
        .sh-country-drop {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(226,232,240,0.8);
          border-radius: 14px;
          box-shadow: 0 12px 40px rgba(15,23,42,0.12), 0 4px 12px rgba(15,23,42,0.06);
          min-width: 220px;
          max-height: 360px;
          overflow-y: auto;
          padding: 8px;
          z-index: 300;
          animation: shDropIn 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes shDropIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .sh-country-opt {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          background: none;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          color: #334155;
          transition: all 0.15s ease;
        }
        .sh-country-opt:hover { background: rgba(249,115,22,0.06); color: #f97316; }
        .sh-co-active { background: rgba(249,115,22,0.08); color: #ea580c; font-weight: 600; }

        /* Auth buttons */
        .sh-auth-row { display: flex; align-items: center; gap: 8px; }
        .sh-login-btn {
          text-decoration: none;
          padding: 9px 18px;
          border: 1.5px solid rgba(30,41,59,0.15);
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          background: rgba(255,255,255,0.5);
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .sh-login-btn:hover { border-color: #1e293b; background: #1e293b; color: #fff; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(15,23,42,0.15); }
        .sh-signup-btn {
          text-decoration: none;
          padding: 9px 18px;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          transition: all 0.2s ease;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(249,115,22,0.25);
        }
        .sh-signup-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(249,115,22,0.35); }
        .sh-logout-btn {
          font-size: 12px;
          color: #dc2626;
          background: none;
          border: 1px solid rgba(254,202,202,0.6);
          border-radius: 8px;
          padding: 5px 10px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.15s ease;
        }
        .sh-logout-btn:hover { background: rgba(254,242,242,0.8); border-color: #fecaca; }

        /* Mobile right icons (search + cart only) */
        .sh-mobile-right { display: none; align-items: center; gap: 4px; margin-left: auto; flex-shrink: 0; }
        .sh-mobile-icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: none;
          border: none;
          cursor: pointer;
          color: #1e293b;
          border-radius: 10px;
          position: relative;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .sh-mobile-icon-btn:hover { background: rgba(249,115,22,0.06); color: #f97316; }

        /* Category nav */
        .sh-catnav {
          background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
          position: relative;
        }
        .sh-catnav::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(249,115,22,0.4), transparent);
        }
        .sh-catnav-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 16px;
          display: flex;
          align-items: center;
          overflow-x: auto;
          gap: 0;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .sh-catnav-inner::-webkit-scrollbar { display: none; }
        .sh-cat-tab {
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.7);
          padding: 11px 16px;
          white-space: nowrap;
          border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
          letter-spacing: 0.01em;
          position: relative;
        }
        .sh-cat-tab:hover { color: #fff; border-bottom-color: #f97316; }

        /* Search overlay */
        .sh-overlay {
          position: fixed;
          inset: 0;
          z-index: 999;
          background: rgba(15,23,42,0.5);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          justify-content: center;
          padding-top: 80px;
          animation: shFadeIn 0.2s ease;
        }
        @keyframes shFadeIn { from{opacity:0} to{opacity:1} }
        .sh-overlay-modal {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 90%;
          max-width: 580px;
          height: 58px;
          padding: 0 20px;
          background: rgba(255,255,255,0.98);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.8);
          border-radius: 16px;
          box-shadow: 0 24px 80px rgba(15,23,42,0.3), 0 8px 24px rgba(15,23,42,0.1);
          animation: shSlideDown 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes shSlideDown { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
        .sh-overlay-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 16px;
          color: #1e293b;
          background: transparent;
          font-family: 'Outfit','Inter',-apple-system,sans-serif;
          font-weight: 500;
        }
        .sh-overlay-input::placeholder { color: #94a3b8; }
        .sh-overlay-close {
          background: rgba(243,244,246,0.8);
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }
        .sh-overlay-close:hover { background: #e5e7eb; color: #1e293b; }

        /* Mobile drawer */
        .sh-drawer { position: fixed; inset: 0; z-index: 1000; }
        .sh-drawer-overlay { position: absolute; inset: 0; background: rgba(15,23,42,0.5); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
        .sh-drawer-panel {
          position: absolute;
          top: 0; left: 0;
          width: 320px;
          height: 100%;
          background: rgba(255,255,255,0.98);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          display: flex;
          flex-direction: column;
          animation: shDrawerIn 0.3s cubic-bezier(0.16,1,0.3,1);
          z-index: 1;
          overflow-y: auto;
          box-shadow: 0 0 60px rgba(15,23,42,0.2);
        }
        @keyframes shDrawerIn { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        .sh-drawer-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 22px;
          border-bottom: 1px solid rgba(226,232,240,0.6);
        }
        .sh-drawer-close {
          background: none;
          border: none;
          padding: 6px;
          cursor: pointer;
          color: #64748b;
          border-radius: 8px;
          transition: all 0.15s ease;
        }
        .sh-drawer-close:hover { background: rgba(249,115,22,0.06); color: #f97316; }
        .sh-drawer-user {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 22px;
          font-size: 14px;
          color: #334155;
          border-bottom: 1px solid rgba(226,232,240,0.4);
          background: linear-gradient(135deg, rgba(249,115,22,0.04), rgba(249,115,22,0.01));
        }
        .sh-drawer-nav { flex: 1; padding: 8px 0; }
        .sh-drawer-link {
          display: block;
          padding: 14px 22px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          border-bottom: 1px solid rgba(241,245,249,0.5);
          transition: all 0.15s ease;
        }
        .sh-drawer-link:hover { background: rgba(249,115,22,0.04); color: #f97316; padding-left: 26px; }
        .sh-drawer-cat { font-weight: 500; color: #64748b; font-size: 13px; }
        .sh-drawer-cat:hover { color: #f97316; }
        .sh-drawer-foot { padding: 18px 22px; display: flex; flex-direction: column; gap: 10px; border-top: 1px solid rgba(226,232,240,0.6); }
        .sh-drawer-btn { display: block; text-align: center; padding: 13px; border-radius: 10px; font-weight: 600; font-size: 14px; text-decoration: none; border: none; cursor: pointer; transition: all 0.2s ease; }
        .sh-drawer-btn-primary { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #fff; box-shadow: 0 4px 14px rgba(249,115,22,0.25); }
        .sh-drawer-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(249,115,22,0.35); }
        .sh-drawer-btn-outline { border: 1.5px solid rgba(30,41,59,0.12); color: #1e293b; background: transparent; }
        .sh-drawer-btn-outline:hover { background: rgba(30,41,59,0.04); border-color: #1e293b; }
        .sh-drawer-btn-danger { background: rgba(254,242,242,0.6); color: #dc2626; border: 1px solid rgba(254,202,202,0.5); }
        .sh-drawer-btn-danger:hover { background: rgba(254,226,226,0.8); }

        @keyframes sh-pulse { 0%,100%{opacity:1} 50%{opacity:.5} }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .sh-right-icons { display: none; }
          .sh-ham { display: flex; }
          .sh-mobile-right { display: flex; }
          .sh-logo-img { height: 36px; }
          .sh-main-row { padding: 10px 14px; gap: 10px; }
          .sh-search-form { height: 42px; }
          .sh-search-submit { display: none; }
          .sh-search-input { font-size: 13px; }
        }
        @media (max-width: 640px) {
          .sh-ham { display: none; }
          .sh-logo-link { display: none; }
          .sh-search-form { max-width: none; border-radius: 12px; height: 44px; }
          .sh-search-submit { display: flex; border-radius: 0 12px 12px 0; padding: 0 18px; font-size: 12px; background: linear-gradient(135deg, #f97316, #ea580c); }
        }
        @media (max-width: 480px) {
          .sh-logo-img { height: 32px; max-width: 130px; }
          .sh-drawer-panel { width: 100vw; }
          .sh-main-row { gap: 8px; }
        }
      `}</style>
    </header>
    </>
  )
}