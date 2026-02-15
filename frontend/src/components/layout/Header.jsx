import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { COUNTRY_LIST } from '../../utils/constants'
import { useCountry } from '../../contexts/CountryContext'
import { readWishlistIds, syncWishlistFromServer } from '../../util/wishlist'

const countries = [
  { code: 'AE', name: 'UAE', flag: '🇦🇪', currency: 'AED' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', currency: 'OMR' },
  { code: 'SA', name: 'KSA', flag: '🇸🇦', currency: 'SAR' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', currency: 'BHD' },
  { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', currency: 'KWD' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', currency: 'QAR' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', currency: 'PKR' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', currency: 'EGP' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴', currency: 'JOD' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧', currency: 'LBP' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶', currency: 'IQD' },
  { code: 'YE', name: 'Yemen', flag: '🇾🇪', currency: 'YER' },
  { code: 'US', name: 'USA', flag: '🇺🇸', currency: 'USD' },
  { code: 'GB', name: 'UK', flag: '🇬🇧', currency: 'GBP' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'AUD' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR' },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', currency: 'TRY' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', currency: 'MYR' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', currency: 'SGD' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', currency: 'IDR' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', currency: 'PHP' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', currency: 'BDT' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', currency: 'LKR' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', currency: 'NPR' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'ZAR' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', currency: 'MAD' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳', currency: 'TND' },
  { code: 'CN', name: 'China', flag: '🇨🇳', currency: 'CNY' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', currency: 'JPY' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', currency: 'KRW' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', currency: 'THB' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', currency: 'VND' },
]

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

export default function Header({ onCartClick, editMode = false, editState = {}, onExitEdit = null }) {
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

  return (
    <header className="ecommerce-header">
      <div className="header-container">
        <div className="header-left">
          <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <Link to="/" className="logo">
            <img src="/BuySial2.png" alt="BuySial" className="logo-img" />
          </Link>
        </div>

        <div className="header-center">
          <nav className="main-nav">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/catalog" className="nav-link">Products</Link>
            <Link to="/categories" className="nav-link">Categories</Link>
            <Link to="/about" className="nav-link">About</Link>
            <Link to="/contact" className="nav-link">Contact</Link>
          </nav>
        </div>

        <div className="header-right">
          <div className="header-actions">
            {/* Edit Mode Controls */}
            {editMode ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '20px', marginRight: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
                  <span style={{ color: 'white', fontSize: '13px', fontWeight: 600 }}>Edit Mode</span>
                  {editState.elementCount > 0 && (
                    <span style={{ background: 'rgba(255,255,255,0.25)', color: 'white', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>{editState.elementCount}</span>
                  )}
                </div>
                <button 
                  onClick={() => editState.handleSave && editState.handleSave()} 
                  disabled={!editState.canSave || editState.saving}
                  style={{
                    padding: '8px 16px',
                    background: editState.canSave && !editState.saving ? '#10b981' : '#d1d5db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: editState.canSave && !editState.saving ? 'pointer' : 'not-allowed',
                    marginRight: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  {editState.saving ? 'Saving...' : 'Save'}
                </button>
                <button 
                  onClick={onExitEdit}
                  style={{
                    padding: '8px 16px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginRight: '8px'
                  }}
                >
                  Exit
                </button>
              </>
            ) : (
              <>
                {/* Country Flag Selector */}
                <div className="country-selector" ref={countryRef}>
                  <button 
                    className="country-btn"
                    onClick={() => setIsCountryOpen(!isCountryOpen)}
                  >
                    <span className="country-flag">{currentCountry.flag}</span>
                    <span className="country-name">{currentCountry.name}</span>
                    <svg className={`country-arrow ${isCountryOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {isCountryOpen && (
                    <div className="country-dropdown">
                      {COUNTRY_LIST.map((country) => (
                        <button
                          key={country.code}
                          className={`country-option ${selectedCountry === country.code ? 'active' : ''}`}
                          onClick={() => handleCountryChange(country)}
                        >
                          <span className="country-flag">{country.flag}</span>
                          <span className="country-name">{country.name}</span>
                          {selectedCountry === country.code && (
                            <svg className="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Wishlist button (customers only) */}
                {customer && (
                  <Link to="/customer/wishlist" className="wishlist-btn flex" aria-label="Wishlist" title="Wishlist">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {wishlistCount > 0 && <span className="wishlist-count">{wishlistCount > 99 ? '99+' : wishlistCount}</span>}
                  </Link>
                )}

                {/* Cart button - visible on both mobile and desktop */}
                <Link to="/cart" className="cart-btn flex">
                  {cartImage && cartCount > 0 ? (
                    <div className="cart-preview-img">
                      <img src={cartImage.startsWith('http') ? cartImage : `${window.location.origin}${cartImage.startsWith('/') ? '' : '/'}${cartImage}`} alt="" onError={(e) => { e.target.style.display = 'none' }} />
                    </div>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 22C9.55228 22 10 21.5523 10 21C10 20.4477 9.55228 20 9 20C8.44772 20 8 20.4477 8 21C8 21.5523 8.44772 22 9 22Z"></path>
                      <path d="M20 22C20.5523 22 21 21.5523 21 21C21 20.4477 20.5523 20 20 20C19.4477 20 19 20.4477 19 21C19 21.5523 19.4477 22 20 22Z"></path>
                      <path d="M1 1H5L7.68 14.39C7.77144 14.8504 8.02191 15.264 8.38755 15.5583C8.75318 15.8526 9.2107 16.009 9.68 16H19.4C19.8693 16.009 20.3268 15.8526 20.6925 15.5583C21.0581 15.264 21.3086 14.8504 21.4 14.39L23 6H6"></path>
                    </svg>
                  )}
                  {cartCount > 0 && (
                    <span className="cart-count">{cartCount}</span>
                  )}
                </Link>

                <div className="auth-buttons">
                  {customer ? (
                    <>
                      <Link to="/customer" className="dashboard-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                          <polyline points="9,22 9,12 15,12 15,22"></polyline>
                        </svg>
                        Dashboard
                      </Link>
                      <div className="user-menu">
                        <span className="user-name">{customer.firstName || 'Customer'}</span>
                      </div>
                      <button className="logout-btn" onClick={handleLogout}>Logout</button>
                    </>
                  ) : (
                    <>
                      <Link to="/customer/login" className="login-btn">Login</Link>
                      <Link to="/register" className="register-btn">Sign Up</Link>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {isSearchOpen && (
        <div className="mobile-search">
          <div className="search-container">
            <input 
              type="text" 
              placeholder="Search products..." 
              className="search-input"
              autoFocus
            />
            <button className="search-close-btn" onClick={toggleSearch}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu-overlay" onClick={toggleMobileMenu}></div>
          <div className="mobile-menu-content">
            <div className="mobile-menu-header">
              <img src="/BuySial2.png" alt="BuySial" className="mobile-logo" />
              <button className="mobile-menu-close" onClick={toggleMobileMenu}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <nav className="mobile-nav">
              <Link to="/" className="mobile-nav-link" onClick={toggleMobileMenu}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9,22 9,12 15,12 15,22"></polyline>
                </svg>
                Home
              </Link>
              <Link to="/catalog" className="mobile-nav-link" onClick={toggleMobileMenu}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
                Products
              </Link>
              <Link to="/categories" className="mobile-nav-link" onClick={toggleMobileMenu}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                Categories
              </Link>
              <Link to="/about" className="mobile-nav-link" onClick={toggleMobileMenu}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                About
              </Link>
              <Link to="/contact" className="mobile-nav-link" onClick={toggleMobileMenu}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                Contact
              </Link>
            </nav>
            <div className="mobile-auth">
              {customer ? (
                <>
                  <Link to="/customer" className="mobile-dashboard-btn" onClick={toggleMobileMenu}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                      <polyline points="9,22 9,12 15,12 15,22"></polyline>
                    </svg>
                    Dashboard
                  </Link>
                  <div className="mobile-user-info">
                    <span>Hi, {customer.firstName || 'Customer'}</span>
                  </div>
                  <button className="mobile-logout-btn" onClick={() => { toggleMobileMenu(); handleLogout(); }}>Logout</button>
                </>
              ) : (
                <>
                  <Link to="/customer/login" className="mobile-login-btn" onClick={toggleMobileMenu}>Login</Link>
                  <Link to="/register" className="mobile-register-btn" onClick={toggleMobileMenu}>Sign Up</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .ecommerce-header {
          background: white;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }

        .header-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 70px;
        }

        .header-left {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          border-radius: 6px;
          color: #6b7280;
          transition: all 0.2s;
        }

        .mobile-menu-btn:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .logo {
          display: flex;
          align-items: center;
          text-decoration: none;
        }

        .logo-img {
          height: 64px;
          width: auto;
        }

        .header-center {
          flex: 1;
          display: flex;
          justify-content: center;
        }

        .main-nav {
          display: flex;
          gap: 32px;
        }

        .nav-link {
          text-decoration: none;
          color: #374151;
          font-weight: 500;
          font-size: 15px;
          transition: color 0.2s;
          position: relative;
        }

        .nav-link:hover {
          color: #007bff;
        }

        .nav-link:hover::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 0;
          right: 0;
          height: 2px;
          background: #007bff;
          border-radius: 1px;
        }

        .header-right {
          flex-shrink: 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* Country Selector */
        .country-selector {
          position: relative;
        }

        .country-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
        }

        .country-btn:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
        }

        .country-flag {
          font-size: 18px;
          line-height: 1;
        }

        .country-name {
          font-weight: 500;
          color: #374151;
        }

        .country-arrow {
          color: #6b7280;
          transition: transform 0.2s;
        }

        .country-arrow.open {
          transform: rotate(180deg);
        }

        .country-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 180px;
          max-height: 400px;
          overflow-y: auto;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.12);
          padding: 8px;
          min-width: 280px;
          z-index: 100;
        }

        .country-option {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 14px;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
        }

        .country-option:hover {
          background: #f9fafb;
        }

        .country-option.active {
          background: #f0f9ff;
        }

        .country-option .country-name {
          flex: 1;
        }

        .country-option .check-icon {
          color: #3b82f6;
        }

        .search-btn,
        .cart-btn,
        .wishlist-btn {
          background: none;
          border: none;
          padding: 10px;
          cursor: pointer;
          border-radius: 8px;
          color: #6b7280;
          transition: all 0.2s;
          position: relative;
        }

        .search-btn:hover,
        .wishlist-btn:hover,
        .cart-btn:hover {
          background: #f3f4f6;
          color: #374151;
          transform: translateY(-1px);
        }

        .wishlist-count {
          position: absolute;
          top: 2px;
          right: 2px;
          background: #ea580c;
          color: white;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: bounce 0.3s ease;
        }

        .cart-count {
          position: absolute;
          top: 2px;
          right: 2px;
          background: #dc2626;
          color: white;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: bounce 0.3s ease;
        }

        .cart-preview-img {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          overflow: hidden;
          border: 2px solid #f97316;
        }

        .cart-preview-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        @keyframes bounce {
          0%, 20%, 60%, 100% { transform: translateY(0); }
          40% { transform: translateY(-3px); }
          80% { transform: translateY(-1px); }
        }

        .auth-buttons {
          display: flex;
          gap: 12px;
          margin-left: 8px;
          align-items: center;
        }

        .dashboard-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 500;
          font-size: 14px;
          color: #374151;
          border: 1px solid #d1d5db;
          background: white;
          transition: all 0.2s;
        }

        .dashboard-btn:hover {
          background: #f9fafb;
          border-color: #9ca3af;
          transform: translateY(-1px);
        }

        .user-menu {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .user-name {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          padding: 0 8px;
        }

        .logout-btn {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background: #fee2e2;
          border-color: #fca5a5;
        }

        .login-btn,
        .register-btn {
          text-decoration: none;
          padding: 10px 18px;
          border-radius: 8px;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s;
        }

        .login-btn {
          color: #374151;
          border: 1px solid #d1d5db;
          background: white;
        }

        .login-btn:hover {
          background: #f9fafb;
          border-color: #9ca3af;
          transform: translateY(-1px);
        }

        .register-btn {
          background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
          color: white;
          border: 1px solid #007bff;
        }

        .register-btn:hover {
          background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
          border-color: #0056b3;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
        }

        /* Mobile Search */
        .mobile-search {
          background: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 16px 20px;
        }

        .search-container {
          display: flex;
          align-items: center;
          gap: 12px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .search-input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 16px;
          outline: none;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .search-close-btn {
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          border-radius: 6px;
          color: #6b7280;
          transition: all 0.2s;
        }

        .search-close-btn:hover {
          background: #f3f4f6;
          color: #374151;
        }

        /* Mobile Menu */
        .mobile-menu {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
        }

        .mobile-menu-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
        }

        .mobile-menu-content {
          position: absolute;
          top: 0;
          left: 0;
          width: 280px;
          height: 100%;
          background: white;
          box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }

        .mobile-menu-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .mobile-logo {
          height: 52px;
          width: auto;
        }

        .mobile-menu-close {
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          border-radius: 6px;
          color: #6b7280;
          transition: all 0.2s;
        }

        .mobile-menu-close:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .mobile-nav {
          flex: 1;
          padding: 20px 0;
        }

        .mobile-nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          text-decoration: none;
          color: #374151;
          font-weight: 500;
          transition: all 0.2s;
        }

        .mobile-nav-link:hover {
          background: #f8fafc;
          color: #007bff;
        }

        .mobile-auth {
          padding: 20px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .mobile-login-btn,
        .mobile-register-btn {
          text-decoration: none;
          padding: 12px 16px;
          border-radius: 8px;
          font-weight: 500;
          text-align: center;
          transition: all 0.2s;
        }

        .mobile-login-btn {
          color: #374151;
          border: 1px solid #d1d5db;
          background: white;
        }

        .mobile-login-btn:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .mobile-register-btn {
          background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
          color: white;
          border: 1px solid #007bff;
        }

        .mobile-register-btn:hover {
          background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
          border-color: #0056b3;
        }

        .mobile-dashboard-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          padding: 12px 16px;
          border-radius: 8px;
          font-weight: 500;
          background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
          color: white;
          border: 1px solid #007bff;
          transition: all 0.2s;
        }

        .mobile-dashboard-btn:hover {
          background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
        }

        .mobile-user-info {
          text-align: center;
          font-size: 14px;
          color: #374151;
          padding: 8px 0;
          font-weight: 500;
        }

        .mobile-logout-btn {
          width: 100%;
          padding: 12px 16px;
          border-radius: 8px;
          font-weight: 500;
          text-align: center;
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mobile-logout-btn:hover {
          background: #fee2e2;
          border-color: #fca5a5;
        }

        @media (max-width: 768px) {
          .header-container {
            padding: 0 16px;
            height: 60px;
          }

          .logo-img {
            height: 34px;
          }

          .mobile-logo {
            height: 28px;
          }

          .mobile-menu-btn {
            display: block;
          }

          .header-center {
            display: none;
          }

          .auth-buttons {
            display: none;
          }

          .header-actions {
            gap: 8px;
          }

          .search-btn,
          .cart-btn {
            padding: 8px;
          }
        }

        @media (max-width: 480px) {
          .header-container {
            padding: 0 12px;
          }

          .mobile-menu-content {
            width: 100vw;
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Edit Website Dropdown */
        .nav-dropdown {
          position: relative;
          display: inline-block;
        }

        .dropdown-trigger {
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          color: inherit;
          font-size: inherit;
          font-weight: inherit;
          font-family: inherit;
          padding: 0;
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 12px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          padding: 8px;
          min-width: 280px;
          z-index: 1000;
          animation: dropdownSlide 0.2s ease;
        }

        @keyframes dropdownSlide {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          text-decoration: none;
          color: #374151;
          transition: all 0.2s;
          cursor: pointer;
        }

        .dropdown-item:hover {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.08));
        }

        .dropdown-icon {
          font-size: 20px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .dropdown-title {
          font-weight: 600;
          font-size: 14px;
          color: #111827;
          margin-bottom: 2px;
        }

        .dropdown-desc {
          font-size: 11px;
          color: #6b7280;
        }

        .dropdown-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 8px 4px;
        }

        @media (max-width: 768px) {
          .nav-dropdown {
            display: none;
          }
        }
      `}</style>
    </header>
  )
}