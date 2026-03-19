import React, { useEffect, useMemo, useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'

function MobileTab({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      end={to === '/shop'}
      style={({ isActive }) => ({
        flex: 1,
        minWidth: 0,
        textDecoration: 'none',
        display: 'grid',
        justifyItems: 'center',
        gap: 5,
        padding: '8px 4px',
        color: isActive ? '#f97316' : '#64748b',
        fontSize: 11,
        fontWeight: 800,
      })}
    >
      {icon}
      <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
    </NavLink>
  )
}

export default function ShopVendorLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 900 : false))
  const [closed, setClosed] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 900 : false))
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('theme') || 'light'
    } catch {
      return 'light'
    }
  })
  const me = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('me') || '{}')
    } catch {
      return {}
    }
  }, [location.pathname])

  useEffect(() => {
    function onResize() {
      const mobile = window.innerWidth <= 900
      setIsMobile(mobile)
      if (mobile) setClosed(true)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('theme', theme)
    } catch {}
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light')
  }, [theme])

  const links = [
    {
      to: '/shop',
      label: 'Dashboard',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="10" width="7" height="11" />
          <rect x="3" y="13" width="7" height="8" />
        </svg>
      ),
    },
    {
      to: '/shop/orders',
      label: 'Orders',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      to: '/shop/products',
      label: 'Products',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
    },
    {
      to: '/shop/payments',
      label: 'Payments',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
          <circle cx="17" cy="14" r="1.5" />
        </svg>
      ),
    },
  ]

  function logout() {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('me')
    } catch {}
    try {
      navigate('/login', { replace: true })
    } catch {}
    setTimeout(() => {
      try {
        window.location.replace('/login')
      } catch {}
    }, 20)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f8fafc 0%, #fff7ed 100%)' }}>
      {!isMobile ? <Sidebar links={links} closed={closed} onToggle={() => setClosed((c) => !c)} /> : null}
      <div
        className={`main ${!isMobile && closed ? 'full' : ''} ${isMobile ? 'full-mobile' : ''}`}
        style={{ minHeight: '100vh', paddingBottom: isMobile ? 86 : 24 }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            padding: isMobile ? '14px 14px 10px' : '18px 24px 0',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div
            style={{
              borderRadius: 24,
              border: '1px solid rgba(226,232,240,0.95)',
              background: 'rgba(255,255,255,0.88)',
              boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
              padding: isMobile ? '12px 14px' : '14px 18px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <button
                type="button"
                onClick={() => navigate('/shop')}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 16,
                  border: '1px solid rgba(249,115,22,0.18)',
                  background: 'linear-gradient(135deg, rgba(249,115,22,0.14), rgba(251,191,36,0.12))',
                  color: '#c2410c',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9.5 12 4l9 5.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
                  <path d="M9 22v-7h6v7" />
                </svg>
              </button>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8' }}>Shop vendor</div>
                <div style={{ fontSize: isMobile ? 17 : 20, fontWeight: 900, letterSpacing: '-0.04em', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? 220 : 420 }}>
                  {me?.name || me?.ownerName || 'Shop Dashboard'}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? 220 : 420 }}>
                  {me?.ownerName ? `Managed by ${me.ownerName}` : 'Hyper-local shop operations'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  border: '1px solid rgba(203,213,225,0.9)',
                  background: 'rgba(255,255,255,0.9)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#475569',
                  cursor: 'pointer',
                }}
                aria-label="Toggle theme"
                title="Toggle theme"
              >
                {theme === 'dark' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v2" /><path d="M12 21v2" /><path d="M4.22 4.22l1.42 1.42" /><path d="M18.36 18.36l1.42 1.42" /><path d="M1 12h2" /><path d="M21 12h2" /><path d="M4.22 19.78l1.42-1.42" /><path d="M18.36 5.64l1.42-1.42" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3c0 5 4 9 9 9.79z" /></svg>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/shop/orders')}
                style={{
                  border: 'none',
                  borderRadius: 14,
                  padding: '11px 14px',
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 14px 28px rgba(249, 115, 22, 0.28)',
                }}
              >
                Open orders
              </button>
              <button
                type="button"
                onClick={logout}
                style={{
                  borderRadius: 14,
                  padding: '11px 14px',
                  border: '1px solid rgba(203,213,225,0.9)',
                  background: 'rgba(255,255,255,0.92)',
                  color: '#0f172a',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
        <div style={{ padding: isMobile ? '8px 14px 0' : '18px 24px 0' }}>
          <Outlet />
        </div>
      </div>
      {isMobile ? (
        <div
          style={{
            position: 'fixed',
            left: 10,
            right: 10,
            bottom: 10,
            zIndex: 40,
            borderRadius: 24,
            border: '1px solid rgba(226,232,240,0.95)',
            background: 'rgba(255,255,255,0.94)',
            boxShadow: '0 18px 40px rgba(15,23,42,0.14)',
            display: 'flex',
            padding: '6px 4px calc(6px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <MobileTab to="/shop" label="Home" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9.5 12 4l9 5.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M9 22v-7h6v7" /></svg>} />
          <MobileTab to="/shop/orders" label="Orders" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>} />
          <MobileTab to="/shop/products" label="Products" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>} />
          <MobileTab to="/shop/payments" label="Payments" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>} />
        </div>
      ) : null}
    </div>
  )
}
