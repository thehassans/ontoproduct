import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'

export default function CommissionerLayout() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('me')
    navigate('/login')
  }

  const navItems = [
    { path: '/commissioner/dashboard', label: '📊 Dashboard', icon: '📊' },
    { path: '/commissioner/earnings', label: '💰 My Earnings', icon: '💰' },
    { path: '/commissioner/profile', label: '👤 Profile', icon: '👤' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 280,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '4px 0 20px rgba(0,0,0,0.1)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>💼 Commissioner</div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>Commission Portal</div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 12,
                textDecoration: 'none',
                color: 'white',
                fontSize: 15,
                fontWeight: isActive ? 600 : 500,
                background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                transition: 'all 0.2s',
              })}
              onMouseEnter={(e) => {
                if (!e.currentTarget.classList.contains('active')) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.classList.contains('active')) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span>{item.label.replace(/^\S+\s/, '')}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 12,
              color: 'white',
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          >
            <span style={{ fontSize: 20 }}>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
