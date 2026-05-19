// Shein-inspired flat 5-tab bottom nav
import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { readWishlistIds } from '../../util/wishlist'
import { readCartItems } from '../../utils/cartStorage'

export default function MobileBottomNav({ onCartClick }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [cartCount, setCartCount] = useState(0)
  const [wishlistCount, setWishlistCount] = useState(0)
  
  // Get cart count from localStorage (with sessionStorage fallback for TikTok/FB in-app browser)
  useEffect(() => {
    const updateCartCount = () => {
      try {
        const cart = readCartItems()
        const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0)
        setCartCount(count)
      } catch { /* preserve existing count */ }
    }

    const updateWishlistCount = () => {
      try { setWishlistCount(readWishlistIds().length) } catch { setWishlistCount(0) }
    }
    
    updateCartCount()
    updateWishlistCount()
    window.addEventListener('cartUpdated', updateCartCount)
    window.addEventListener('wishlistUpdated', updateWishlistCount)
    window.addEventListener('storage', updateCartCount)
    window.addEventListener('storage', updateWishlistCount)
    
    return () => {
      window.removeEventListener('cartUpdated', updateCartCount)
      window.removeEventListener('wishlistUpdated', updateWishlistCount)
      window.removeEventListener('storage', updateCartCount)
      window.removeEventListener('storage', updateWishlistCount)
    }
  }, [])
  
  // Check if customer is logged in
  const isCustomerLoggedIn = () => {
    try {
      const token = localStorage.getItem('token')
      if (!token || token === 'null') return false
      const me = JSON.parse(localStorage.getItem('me') || 'null')
      return !!me && me.role === 'customer'
    } catch {
      return false
    }
  }
  
  const TABS = [
    {
      id: 'home', label: 'Home', path: '/',
      icon: (a) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? '#f97316' : 'none'} stroke={a ? '#f97316' : '#555'} strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
      ),
    },
    {
      id: 'categories', label: 'Categories', path: '/categories',
      icon: (a) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? '#f97316' : '#555'} strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      ),
    },
    {
      id: 'cart', label: 'Cart', path: '/cart',
      icon: (a) => (
        <svg width="26" height="26" viewBox="0 0 24 24" fill={a ? '#f97316' : 'none'} stroke={a ? '#f97316' : '#555'} strokeWidth="2">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
      ),
      isCenter: true,
    },
    {
      id: 'wishlist', label: 'Wishlist', path: '/customer/wishlist',
      icon: (a) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? '#f97316' : 'none'} stroke={a ? '#f97316' : '#555'} strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
        </svg>
      ),
    },
    {
      id: 'profile', label: 'Me', action: 'profile',
      icon: (a) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? '#f97316' : '#555'} strokeWidth="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
  ]

  const handleClick = (tab) => {
    if (tab.action === 'profile') {
      try {
        const token = localStorage.getItem('token')
        const me = JSON.parse(localStorage.getItem('me') || 'null')
        if (token && me?.role === 'customer') { navigate('/customer'); return }
      } catch {}
      navigate('/customer/login')
    } else if (tab.path) {
      navigate(tab.path)
    }
  }

  const isActive = (tab) => {
    if (tab.action === 'profile') return location.pathname.startsWith('/customer')
    if (tab.path === '/') return location.pathname === '/'
    return tab.path ? location.pathname.startsWith(tab.path) : false
  }

  const nav = (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 500,
      background: '#fff',
      borderTop: '1px solid #e8e8e8',
      boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      display: 'flex',
      alignItems: 'center',
    }}>
      {TABS.map(tab => {
        const active = isActive(tab)
        return (
          <button
            key={tab.id}
            onClick={() => handleClick(tab)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              height: tab.isCenter ? 60 : 56,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              padding: '8px 4px',
            }}
          >
            {tab.isCenter ? (
              <div style={{
                width: 50, height: 50,
                borderRadius: '50%',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
                marginBottom: 0,
                position: 'relative',
                border: active ? '2.5px solid #f97316' : '2.5px solid #e8e8e8',
                overflow: 'hidden',
              }}>
                <img src="/mobile-app-launcher.png" alt="BuySial" style={{ width: 46, height: 46, objectFit: 'cover', borderRadius: '50%' }} />
                {cartCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    background: '#ef4444', color: '#fff',
                    fontSize: 9, fontWeight: 700,
                    borderRadius: 99, minWidth: 16, height: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px', border: '1.5px solid #fff',
                  }}>{cartCount > 99 ? '99+' : cartCount}</span>
                )}
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                {tab.icon(active)}
                {tab.id === 'wishlist' && wishlistCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -6,
                    background: '#f97316', color: '#fff',
                    fontSize: 9, fontWeight: 700,
                    borderRadius: 99, minWidth: 14, height: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 2px',
                  }}>{wishlistCount > 99 ? '99+' : wishlistCount}</span>
                )}
              </div>
            )}
            {!tab.isCenter && (
              <span style={{
                fontSize: 10, fontWeight: 600, lineHeight: 1,
                color: active ? '#f97316' : '#888',
              }}>{tab.label}</span>
            )}
          </button>
        )
      })}
    </nav>
  )

  return (
    <>
      <div style={{ height: 60 }} className="md:hidden" />
      {typeof document !== 'undefined' && document.body
        ? createPortal(nav, document.body)
        : nav}
    </>
  )
}
