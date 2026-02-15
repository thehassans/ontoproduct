import React, { useEffect, useState } from 'react'
import { Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom'
import { API_BASE, apiGet } from '../api.js'

export default function ConfirmerLayout() {
  const [closed, setClosed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  )
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  )
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('theme') || 'dark'
    } catch {
      return 'dark'
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('theme', theme)
    } catch {}
    const root = document.documentElement
    if (theme === 'dark') root.setAttribute('data-theme', 'dark')
    else root.removeAttribute('data-theme')
  }, [theme])

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth <= 768)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const [me, setMe] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('me') || '{}')
    } catch {
      return {}
    }
  })

  const [stats, setStats] = useState({
    pendingConfirmation: 0,
    confirmedToday: 0,
    cancelledToday: 0,
  })

  useEffect(() => {
    let alive = true
    const loadStats = async () => {
      try {
        const data = await apiGet('/api/confirmer/stats')
        if (alive) setStats(data)
      } catch {}
    }
    loadStats()
    const interval = setInterval(loadStats, 30000)
    return () => {
      alive = false
      clearInterval(interval)
    }
  }, [])

  const handleLogout = () => {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('me')
    } catch {}
    navigate('/login')
  }

  const mobileTabs = [
    {
      to: '/confirmer',
      label: 'Dashboard',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      to: '/confirmer/orders',
      label: 'Orders',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      badge: stats.pendingConfirmation > 0 ? stats.pendingConfirmation : null,
    },
    {
      to: '/confirmer/profile',
      label: 'Profile',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ]

  // Desktop sidebar links
  const sidebarLinks = [
    { to: '/confirmer', label: 'Dashboard', icon: '🏠', end: true },
    { to: '/confirmer/orders', label: 'Orders', icon: '📋', badge: stats.pendingConfirmation },
    { to: '/confirmer/profile', label: 'Profile', icon: '👤' },
  ]

  return (
    <div className="confirmer-layout">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className={`confirmer-sidebar ${closed ? 'closed' : ''}`}>
          <div className="sidebar-header">
            <div className="logo-section">
              <div className="logo-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              {!closed && <span className="logo-text">Confirmer</span>}
            </div>
            <button className="toggle-btn" onClick={() => setClosed(!closed)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {closed ? (
                  <path d="M9 18l6-6-6-6" />
                ) : (
                  <path d="M15 18l-6-6 6-6" />
                )}
              </svg>
            </button>
          </div>

          <nav className="sidebar-nav">
            {sidebarLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{link.icon}</span>
                {!closed && (
                  <>
                    <span className="nav-label">{link.label}</span>
                    {link.badge > 0 && <span className="nav-badge">{link.badge}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="user-info">
              <div className="user-avatar">
                {me.firstName?.[0] || 'C'}
              </div>
              {!closed && (
                <div className="user-details">
                  <span className="user-name">{me.firstName} {me.lastName}</span>
                  <span className="user-role">Confirmer</span>
                </div>
              )}
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Logout">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="confirmer-main">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="mobile-bottom-nav">
          {mobileTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/confirmer'}
              className={({ isActive }) => `mobile-tab ${isActive ? 'active' : ''}`}
            >
              <div className="tab-icon">
                {tab.icon}
                {tab.badge && <span className="tab-badge">{tab.badge}</span>}
              </div>
              <span className="tab-label">{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      )}

      <style jsx>{`
        .confirmer-layout {
          display: flex;
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        }

        /* Sidebar Styles */
        .confirmer-sidebar {
          width: 260px;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(20px);
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          transition: width 0.3s ease;
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          z-index: 100;
        }

        .confirmer-sidebar.closed {
          width: 80px;
        }

        .sidebar-header {
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .logo-text {
          font-size: 20px;
          font-weight: 700;
          color: white;
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .toggle-btn {
          width: 32px;
          height: 32px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .toggle-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .sidebar-nav {
          flex: 1;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 12px;
          color: #94a3b8;
          text-decoration: none;
          font-size: 15px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .nav-link:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        .nav-link.active {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .nav-icon {
          font-size: 20px;
          min-width: 24px;
          text-align: center;
        }

        .nav-label {
          flex: 1;
        }

        .nav-badge {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 20px;
          min-width: 20px;
          text-align: center;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 16px;
        }

        .user-details {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          color: white;
          font-size: 14px;
          font-weight: 600;
        }

        .user-role {
          color: #10b981;
          font-size: 12px;
          font-weight: 500;
        }

        .logout-btn {
          width: 36px;
          height: 36px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          color: #ef4444;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        /* Main Content */
        .confirmer-main {
          flex: 1;
          margin-left: 260px;
          min-height: 100vh;
          transition: margin-left 0.3s ease;
        }

        .confirmer-sidebar.closed + .confirmer-main {
          margin-left: 80px;
        }

        /* Mobile Bottom Navigation */
        .mobile-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(15, 23, 42, 0.98);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: space-around;
          padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
          z-index: 1000;
        }

        .mobile-tab {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px 16px;
          color: #64748b;
          text-decoration: none;
          font-size: 11px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .mobile-tab.active {
          color: #10b981;
        }

        .tab-icon {
          position: relative;
        }

        .tab-badge {
          position: absolute;
          top: -6px;
          right: -10px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 16px;
          text-align: center;
        }

        .tab-label {
          font-size: 11px;
        }

        /* Mobile Adjustments */
        @media (max-width: 768px) {
          .confirmer-main {
            margin-left: 0;
            padding-bottom: 80px;
          }
        }
      `}</style>
    </div>
  )
}
