import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { COUNTRY_LIST } from '../../utils/constants'
import { useCountry } from '../../contexts/CountryContext'
import { readWishlistIds, syncWishlistFromServer } from '../../util/wishlist'
import { apiGet } from '../../api.js'

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
  const brandLogoSrc = isNativeMobileApp() ? '/mobile-app-launcher.png' : '/BSBackgroundremoved.png'
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
      const lu = get('logo_url', '')
      if (lu) setLogoUrl(lu)
      const catEnabled = get('catNav_enabled', 'true') !== 'false'
      setCatNavEnabled(catEnabled)
      const catStr = get('catNav_categories', '')
      if (catStr) setCatNavItems(catStr.split(',').map(s => s.trim()).filter(Boolean))
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

              {/* Wishlist – logged-in customers */}
              {customer && (
                <Link to="/customer/wishlist" className="sh-icon-btn" title="Wishlist">
                  <div style={{position:'relative'}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                    {wishlistCount > 0 && <span className="sh-badge">{wishlistCount > 99 ? '99+' : wishlistCount}</span>}
                  </div>
                  <span className="sh-icon-lbl">Wishlist</span>
                </Link>
              )}

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
        /* ── Shein-inspired Header ── */
        .sh-header {
          background: #fff;
          border-bottom: 1px solid #e8e8e8;
          position: sticky;
          top: 0;
          z-index: 200;
          padding-top: env(safe-area-inset-top, 0px);
        }
        .sh-main-row {
          max-width: 1280px;
          margin: 0 auto;
          padding: 10px 24px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .sh-ham {
          display: none;
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          color: #333;
          border-radius: 6px;
          flex-shrink: 0;
        }
        .sh-ham:hover { background: #f5f5f5; }
        .sh-logo-link { display: flex; align-items: center; flex-shrink: 0; text-decoration: none; }
        .sh-logo-img { height: 52px; width: auto; max-width: 200px; object-fit: contain; }

        /* Search bar */
        .sh-search-form {
          flex: 1;
          display: flex;
          align-items: center;
          border: 2px solid #222;
          border-radius: 4px;
          height: 44px;
          overflow: hidden;
          max-width: 640px;
          min-width: 0;
        }
        .sh-search-icon { margin: 0 10px; color: #888; flex-shrink: 0; }
        .sh-search-input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 14px;
          color: #222;
          min-width: 0;
        }
        .sh-search-input::placeholder { color: #aaa; }
        .sh-search-submit {
          background: #222;
          color: #fff;
          border: none;
          padding: 0 20px;
          height: 100%;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          letter-spacing: 0.02em;
        }
        .sh-search-submit:hover { background: #000; }

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
          padding: 6px 10px;
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: none;
          color: #222;
          border-radius: 4px;
          transition: background 0.15s;
          position: relative;
          min-width: 52px;
        }
        .sh-icon-btn:hover { background: #f5f5f5; }
        .sh-icon-emoji { font-size: 18px; line-height: 1; }
        .sh-icon-lbl { font-size: 11px; color: #555; white-space: nowrap; font-weight: 500; }
        .sh-badge {
          position: absolute;
          top: 0;
          right: 4px;
          background: #f97316;
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
        }
        .sh-badge-cart { background: #ef4444; }
        .sh-cart-thumb { width: 22px; height: 22px; border-radius: 4px; overflow: hidden; border: 1.5px solid #f97316; }
        .sh-cart-thumb img { width: 100%; height: 100%; object-fit: cover; }

        /* Country dropdown */
        .sh-country-wrap { position: relative; }
        .sh-country-drop {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          background: #fff;
          border: 1px solid #e8e8e8;
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          min-width: 220px;
          max-height: 360px;
          overflow-y: auto;
          padding: 6px;
          z-index: 300;
        }
        .sh-country-opt {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 9px 12px;
          background: none;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          color: #333;
          transition: background 0.12s;
        }
        .sh-country-opt:hover { background: #f5f5f5; }
        .sh-co-active { background: #fff7ed; }

        /* Auth buttons */
        .sh-auth-row { display: flex; align-items: center; gap: 8px; }
        .sh-login-btn {
          text-decoration: none;
          padding: 8px 16px;
          border: 1.5px solid #222;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          color: #222;
          background: #fff;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .sh-login-btn:hover { background: #f5f5f5; }
        .sh-signup-btn {
          text-decoration: none;
          padding: 8px 16px;
          border: 1.5px solid #222;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          background: #222;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .sh-signup-btn:hover { background: #000; }
        .sh-logout-btn {
          font-size: 12px;
          color: #dc2626;
          background: none;
          border: 1px solid #fecaca;
          border-radius: 4px;
          padding: 5px 10px;
          cursor: pointer;
          font-weight: 600;
        }
        .sh-logout-btn:hover { background: #fef2f2; }

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
          color: #222;
          border-radius: 6px;
          position: relative;
          text-decoration: none;
        }
        .sh-mobile-icon-btn:hover { background: #f5f5f5; }

        /* Category nav */
        .sh-catnav {
          border-top: 1px solid #f0f0f0;
          background: #fff;
        }
        .sh-catnav-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px;
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
          font-weight: 600;
          color: #444;
          padding: 10px 16px;
          white-space: nowrap;
          border-bottom: 2px solid transparent;
          transition: color 0.15s, border-color 0.15s;
          letter-spacing: 0.01em;
        }
        .sh-cat-tab:hover { color: #f97316; border-bottom-color: #f97316; }

        /* Search overlay */
        .sh-overlay {
          position: fixed;
          inset: 0;
          z-index: 999;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(6px);
          display: flex;
          justify-content: center;
          padding-top: 80px;
          animation: shFadeIn 0.18s ease;
        }
        @keyframes shFadeIn { from{opacity:0} to{opacity:1} }
        .sh-overlay-modal {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 90%;
          max-width: 580px;
          height: 52px;
          padding: 0 18px;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.18);
          animation: shSlideDown 0.22s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes shSlideDown { from{opacity:0;transform:translateY(-16px)} to{opacity:1;transform:translateY(0)} }
        .sh-overlay-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 16px;
          color: #222;
          background: transparent;
        }
        .sh-overlay-input::placeholder { color: #aaa; }
        .sh-overlay-close {
          background: #f3f4f6;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #555;
          flex-shrink: 0;
        }
        .sh-overlay-close:hover { background: #e5e7eb; }

        /* Mobile drawer */
        .sh-drawer { position: fixed; inset: 0; z-index: 1000; }
        .sh-drawer-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(3px); }
        .sh-drawer-panel {
          position: absolute;
          top: 0; left: 0;
          width: 300px;
          height: 100%;
          background: #fff;
          display: flex;
          flex-direction: column;
          animation: shDrawerIn 0.25s cubic-bezier(0.16,1,0.3,1);
          z-index: 1;
          overflow-y: auto;
        }
        @keyframes shDrawerIn { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        .sh-drawer-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #f0f0f0;
        }
        .sh-drawer-close {
          background: none;
          border: none;
          padding: 6px;
          cursor: pointer;
          color: #555;
          border-radius: 6px;
        }
        .sh-drawer-close:hover { background: #f5f5f5; }
        .sh-drawer-user {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          font-size: 14px;
          color: #444;
          border-bottom: 1px solid #f0f0f0;
          background: #fffbf7;
        }
        .sh-drawer-nav { flex: 1; padding: 8px 0; }
        .sh-drawer-link {
          display: block;
          padding: 13px 20px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          color: #222;
          border-bottom: 1px solid #f8f8f8;
          transition: background 0.12s;
        }
        .sh-drawer-link:hover { background: #f9f9f9; color: #f97316; }
        .sh-drawer-cat { font-weight: 500; color: #555; font-size: 13px; }
        .sh-drawer-foot { padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; border-top: 1px solid #f0f0f0; }
        .sh-drawer-btn { display: block; text-align: center; padding: 12px; border-radius: 6px; font-weight: 600; font-size: 14px; text-decoration: none; border: none; cursor: pointer; }
        .sh-drawer-btn-primary { background: #222; color: #fff; }
        .sh-drawer-btn-primary:hover { background: #000; }
        .sh-drawer-btn-outline { border: 1.5px solid #222; color: #222; background: #fff; }
        .sh-drawer-btn-outline:hover { background: #f5f5f5; }
        .sh-drawer-btn-danger { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .sh-drawer-btn-danger:hover { background: #fee2e2; }

        @keyframes sh-pulse { 0%,100%{opacity:1} 50%{opacity:.5} }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .sh-search-form { display: none; }
          .sh-right-icons { display: none; }
          .sh-ham { display: flex; }
          .sh-mobile-right { display: flex; }
          .sh-logo-img { height: 38px; }
          .sh-main-row { padding: 8px 14px; gap: 10px; }
        }
        @media (max-width: 480px) {
          .sh-logo-img { height: 34px; max-width: 140px; }
          .sh-drawer-panel { width: 100vw; }
        }
      `}</style>
    </header>
    </>
  )
}