import React, { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { API_BASE, apiGet, apiPatch } from '../api.js'

const STYLES = `
  .customer-layout {
    min-height: 100vh;
    background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 50%, #ffffff 100%);
    color: #1a1a2e;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .customer-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: #ffffff;
    border-bottom: 1px solid #f0f0f0;
    padding: 0 24px;
    height: 68px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  }

  .customer-nav {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .customer-nav-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 12px;
    color: #64748b;
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .customer-nav-link:hover {
    color: #1a1a2e;
    background: #f8fafc;
  }

  .customer-nav-link.active {
    background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
    color: #ea580c;
    font-weight: 600;
  }

  .customer-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 24px;
    min-height: calc(100vh - 68px);
  }

  .customer-user-menu {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .customer-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #f97316, #ea580c);
    display: grid;
    place-items: center;
    font-weight: 700;
    color: white;
    font-size: 15px;
    box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
  }

  .customer-logout-btn {
    background: linear-gradient(135deg, #fef2f2, #fee2e2);
    color: #dc2626;
    border: 1px solid rgba(220, 38, 38, 0.15);
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.25s ease;
  }

  .customer-logout-btn:hover {
    background: linear-gradient(135deg, #fee2e2, #fecaca);
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.15);
    transform: translateY(-1px);
  }

  .customer-mobile-tabs {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 72px;
    background: #ffffff;
    border-top: 1px solid #f0f0f0;
    z-index: 100;
    justify-content: space-around;
    align-items: center;
    padding-bottom: calc(env(safe-area-inset-bottom) + 8px);
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.05);
  }

  .customer-mobile-tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    color: #94a3b8;
    text-decoration: none;
    font-size: 11px;
    font-weight: 500;
    flex: 1;
    height: 100%;
    justify-content: center;
    transition: all 0.2s;
  }

  .customer-mobile-tab.active {
    color: #f97316;
  }

  .customer-user-info {
    text-align: right;
  }

  .customer-user-name {
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
  }

  .customer-user-email {
    font-size: 12px;
    color: #94a3b8;
  }

  @media (max-width: 768px) {
    .customer-nav {
      display: none;
    }
    .customer-mobile-tabs {
      display: flex;
    }
    .customer-content {
      padding: 20px 16px;
      padding-bottom: 108px;
    }
    .customer-header {
      padding: 0 16px;
      height: 60px;
    }
    .customer-user-info {
      display: none;
    }
    .customer-user-menu {
      gap: 12px;
    }
  }

  /* Card styling for dashboard */
  .customer-layout .card,
  .customer-layout [class*="card"] {
    background: #ffffff;
    border: 1px solid #f0f0f0;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    border-radius: 16px;
  }
`

export default function CustomerLayout() {
  const navigate = useNavigate()
  const [me, setMe] = useState(() => {
    try { return JSON.parse(localStorage.getItem('me') || '{}') }
    catch { return {} }
  })
  const [branding, setBranding] = useState({ headerLogo: null })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const j = await apiGet('/api/settings/branding')
        if (!cancelled) setBranding({ headerLogo: j.headerLogo || null })
      } catch {}
      try {
        const r = await apiGet('/api/users/me')
        if (!cancelled) setMe(r?.user || {})
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  function doLogout() {
    try { 
      localStorage.removeItem('token')
      localStorage.removeItem('me') 
    } catch {}
    navigate('/customer/login', { replace: true })
  }

  const links = [
    { to: '/customer', label: 'Dashboard', icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )},
    { to: '/customer/wishlist', label: 'Wishlist', icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    )},
    { to: '/customer/wallet', label: 'Wallet', icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2m0-6h4v6h-4" />
      </svg>
    )},
    { to: '/customer/orders', label: 'My Orders', icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    )},
    { to: '/customer/coupons', label: 'Coupons', icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    )},
    { to: '/catalog', label: 'Shop', icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    )},
  ]

  return (
    <>
      <style>{STYLES}</style>
      <div className="customer-layout">
        <header className="customer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <img
              src={branding.headerLogo ? `${API_BASE}${branding.headerLogo}` : `${import.meta.env.BASE_URL}BuySial2.png`}
              alt="Logo"
              style={{ height: 36, width: 'auto' }}
            />
            <nav className="customer-nav">
              {links.map(l => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === '/customer'}
                  className={({ isActive }) => `customer-nav-link ${isActive ? 'active' : ''}`}
                >
                  {l.icon}
                  <span>{l.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="customer-user-menu">
            <div className="customer-user-info">
              <div className="customer-user-name">{me.firstName} {me.lastName}</div>
              <div className="customer-user-email">{me.email}</div>
            </div>
            <div className="customer-avatar">
              {me.firstName?.[0] || 'C'}
            </div>
            <button onClick={doLogout} className="customer-logout-btn">
              Logout
            </button>
          </div>
        </header>

        <main className="customer-content">
          <Outlet />
        </main>

        <nav className="customer-mobile-tabs">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/customer'}
              className={({ isActive }) => `customer-mobile-tab ${isActive ? 'active' : ''}`}
            >
              {React.cloneElement(l.icon, { width: 24, height: 24 })}
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  )
}
