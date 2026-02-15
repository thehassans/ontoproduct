import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { readWishlistIds } from '../../util/wishlist'

export default function MobileBottomNav({ onCartClick }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [cartCount, setCartCount] = useState(0)
  const [wishlistCount, setWishlistCount] = useState(0)
  
  // Get cart count from localStorage
  useEffect(() => {
    const updateCartCount = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('shopping_cart') || '[]')
        const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0)
        setCartCount(count)
      } catch { setCartCount(0) }
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
    
    // Check periodically for mobile
    const interval = setInterval(() => {
      updateCartCount()
      updateWishlistCount()
    }, 1000)
    
    return () => {
      window.removeEventListener('cartUpdated', updateCartCount)
      window.removeEventListener('wishlistUpdated', updateWishlistCount)
      window.removeEventListener('storage', updateCartCount)
      window.removeEventListener('storage', updateWishlistCount)
      clearInterval(interval)
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
  
  const navItems = [
    { 
      id: 'home', 
      label: 'Home', 
      path: '/',
      icon: (active) => (
        <div className="relative w-8 h-8 flex items-center justify-center">
          {active && (
            <span className="absolute inset-0 rounded-full bg-orange-500/30 blur-md" />
          )}
          <div
            className={`relative w-8 h-8 rounded-full flex items-center justify-center bg-white ${
              active ? 'shadow-[0_0_18px_rgba(249,115,22,0.45)]' : 'opacity-90'
            }`}
          >
            <img src="/BuySial2.png" alt="BuySial" className="w-6 h-6 object-contain" />
          </div>
        </div>
      )
    },
    { 
      id: 'discover', 
      label: 'Discover', 
      path: '/catalog',
      icon: (active) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    },
    { 
      id: 'cart', 
      label: 'Cart', 
      path: '/cart',
      icon: (active) => (
        <div className="relative">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
      )
    },
    ...(isCustomerLoggedIn() ? [
      {
        id: 'wishlist',
        label: 'Wishlist',
        path: '/customer/wishlist',
        icon: (active) => (
          <div className="relative">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        )
      }
    ] : []),
    { 
      id: 'profile', 
      label: 'Profile', 
      action: 'profile',
      icon: (active) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ]

  const handleNavClick = (item) => {
    if (item.action === 'profile') {
      // Navigate to customer dashboard if logged in, otherwise to login
      if (isCustomerLoggedIn()) {
        navigate('/customer')
      } else {
        navigate('/customer/login')
      }
    } else if (item.id === 'cart') {
      navigate('/cart')
    } else if (item.path) {
      navigate(item.path)
    }
  }

  const isActive = (item) => {
    if (item.id === 'profile') return location.pathname.startsWith('/customer')
    if (item.path === '/') return location.pathname === '/'
    if (!item.path) return false
    return location.pathname.startsWith(item.path)
  }

  return (
    <>
      {/* Spacer to prevent content from being hidden behind fixed nav */}
      <div className="h-24 md:hidden" />
      
      {/* Bottom Navigation */}
      {(typeof document !== 'undefined' && document.body)
        ? createPortal(
            <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-bottom">
              <div className="px-3 pb-2">
                <div className="bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 rounded-2xl p-[2px] shadow-[0_-8px_30px_rgba(249,115,22,0.25)]">
                  <div className="bg-white/95 backdrop-blur rounded-[14px]">
                    <div className="flex items-center justify-around h-16">
                      {navItems.map((item) => {
                        const active = isActive(item)
                        const isHomeGlow = active && item.id === 'home'
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavClick(item)}
                            className="flex items-center justify-center flex-1 h-full"
                          >
                            <div
                              className={`flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 transition-all ${
                                active ? 'text-orange-600 bg-orange-50' : 'text-gray-600'
                              } ${isHomeGlow ? 'shadow-[0_0_20px_rgba(249,115,22,0.30)]' : ''}`}
                            >
                              <div className="relative">
                                {item.icon(active)}
                                {item.id === 'cart' && cartCount > 0 && (
                                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                                    {cartCount > 99 ? '99+' : cartCount}
                                  </span>
                                )}
                                {item.id === 'wishlist' && wishlistCount > 0 && (
                                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                                    {wishlistCount > 99 ? '99+' : wishlistCount}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-semibold leading-none">
                                {item.label}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </nav>,
            document.body
          )
        : (
            <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-bottom">
              <div className="px-3 pb-2">
                <div className="bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 rounded-2xl p-[2px] shadow-[0_-8px_30px_rgba(249,115,22,0.25)]">
                  <div className="bg-white/95 backdrop-blur rounded-[14px]">
                    <div className="flex items-center justify-around h-16">
                      {navItems.map((item) => {
                        const active = isActive(item)
                        const isHomeGlow = active && item.id === 'home'
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavClick(item)}
                            className="flex items-center justify-center flex-1 h-full"
                          >
                            <div
                              className={`flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 transition-all ${
                                active ? 'text-orange-600 bg-orange-50' : 'text-gray-600'
                              } ${isHomeGlow ? 'shadow-[0_0_20px_rgba(249,115,22,0.30)]' : ''}`}
                            >
                              <div className="relative">
                                {item.icon(active)}
                                {item.id === 'cart' && cartCount > 0 && (
                                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                                    {cartCount > 99 ? '99+' : cartCount}
                                  </span>
                                )}
                                {item.id === 'wishlist' && wishlistCount > 0 && (
                                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                                    {wishlistCount > 99 ? '99+' : wishlistCount}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-semibold leading-none">
                                {item.label}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </nav>
          )}

      <style jsx>{`
        .safe-area-bottom {
          padding-bottom: calc(env(safe-area-inset-bottom, 0) + 8px);
        }
      `}</style>
    </>
  )
}
