import React, { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { API_BASE, apiGet } from '../api.js'
import './InvestorLayout.css'

export default function InvestorLayout() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('investor-theme') || 'dark')
  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  )
  const navigate = useNavigate()
  const location = useLocation()

  const refreshUser = async () => {
    try {
      const data = await apiGet('/users/me')
      const u = data?.user || data
      if (u && u.role === 'investor') {
        setUser(u)
      }
    } catch {}
  }

  // Apply theme effect
  useEffect(() => {
    localStorage.setItem('investor-theme', theme)
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark')
  }, [theme])

  // Resize listener
  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth <= 768) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    let alive = true
    apiGet('/users/me')
      .then((data) => {
        if (!alive) return
        const u = data?.user || data
        if (u && u.role === 'investor') {
          setUser(u)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('me')
    window.location.href = '/login'
  }

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }

  const navLinks = [
    { 
      to: '/investor', 
      label: 'Dashboard', 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="10" width="7" height="11"/><rect x="3" y="13" width="7" height="8"/></svg>
    },
    { 
      to: '/investor/transactions', 
      label: 'Transactions', 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
    },
    { 
      to: '/investor/profile', 
      label: 'Profile', 
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    },
  ]

  if (loading) return <div className="il-container">Loading...</div>

  return (
    <div className="il-container" data-theme={theme}>
      {/* Mobile Header */}
      {isMobile && (
        <div className="il-mobile-header">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <img 
              src={`${import.meta.env.BASE_URL}BuySial2.png`} 
              alt="BuySial" 
              style={{height:32, width:'auto', objectFit:'contain'}} 
            />
            <div style={{display:'flex', alignItems:'center', gap:6}}>
              <span style={{fontWeight:700, fontSize:14}}>Investor</span>
            </div>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <button 
              className="il-theme-btn-mobile" 
              onClick={toggleTheme}
              title="Toggle theme"
            >
              {theme === 'light' ? '🌙' : '🌞'}
            </button>
            <button 
              className="il-logout-btn-mobile" 
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Desktop Topbar */}
      {!isMobile && (
        <div className="il-topbar">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <img 
              src={`${import.meta.env.BASE_URL}BuySial2.png`} 
              alt="BuySial" 
              style={{height:40, width:'auto', objectFit:'contain', marginRight: 8}} 
            />
            <div className="il-user-badge">

              <div style={{display:'flex', flexDirection:'column', gap:2}}>
                <span className="il-badge-role">Investor</span>
                <span className="il-badge-name">{`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Investor'}</span>
              </div>
            </div>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            {/* Premium Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              className="il-theme-toggle-switch"
            >
              <div className="il-toggle-track">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme === 'light' ? '#0f172a' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{transition: 'all 0.3s ease', opacity: theme === 'light' ? 0.3 : 0.5}}>
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme === 'dark' ? '#f1f5f9' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{transition: 'all 0.3s ease', opacity: theme === 'dark' ? 0.3 : 0.5}}>
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              </div>
              <div className="il-toggle-thumb">
                {theme === 'dark' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                )}
              </div>
            </button>
            <button className="il-logout-btn-desktop" onClick={handleLogout}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="il-main">
        <Outlet context={{ user, theme, refreshUser }} />
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      {isMobile && (
        <nav className="il-bottom-nav">
          {navLinks.map(link => (
            <NavLink 
              key={link.to} 
              to={link.to} 
              end={link.to === '/investor'}
              className={({ isActive }) => `il-bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="il-nav-icon">{link.icon}</span>
              <span className="il-nav-label">{link.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
