import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'

export default function SEOManagerLayout() {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('me')
    navigate('/login')
  }

  const navItems = [
    { path: '/seo', label: 'Dashboard', short: 'D', exact: true },
    { path: '/seo/meta-tags', label: 'Meta Tags', short: 'M' },
    { path: '/seo/pixels', label: 'Tracking Pixels', short: 'P' },
    { path: '/seo/analytics', label: 'Analytics', short: 'A' },
    { path: '/seo/countries', label: 'Country SEO', short: 'C' },
    { path: '/seo/products', label: 'Product SEO', short: 'PR' },
    { path: '/seo/schema', label: 'Schema', short: 'S' },
    { path: '/seo/advanced', label: 'Advanced', short: 'AD' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 64 : 240,
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        boxShadow: '0 12px 30px rgba(15,23,42,0.06)',
        transition: 'width 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? 16 : 20,
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>🎯</span>
              <span style={{ color: '#0f172a', fontWeight: 800, fontSize: 16, letterSpacing: 0.2 }}>SEO Panel</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 8,
              cursor: 'pointer',
              color: '#0f172a',
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 8px' }}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed ? '12px' : '12px 16px',
                marginBottom: 4,
                borderRadius: 8,
                textDecoration: 'none',
                color: isActive ? '#9a3412' : '#475569',
                background: isActive ? '#fff7ed' : 'transparent',
                border: isActive ? '1px solid #fed7aa' : '1px solid transparent',
                transition: 'all 0.2s',
                justifyContent: collapsed ? 'center' : 'flex-start',
              })}
            >
              {collapsed ? (
                <span style={{
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: 0.8,
                  color: 'currentColor',
                  width: 24,
                  textAlign: 'center'
                }}>{item.short}</span>
              ) : null}
              {!collapsed && <span style={{ fontWeight: 650 }}>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: 16, borderTop: '1px solid #e2e8f0' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: collapsed ? '12px' : '12px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#fff1f2',
              color: '#be123c',
              border: '1px solid #fecdd3',
              cursor: 'pointer',
              justifyContent: collapsed ? 'center' : 'flex-start',
              fontWeight: 650,
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
