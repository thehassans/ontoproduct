import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'

export default function CommissionerLayout() {
  const navigate = useNavigate()
  const [closed, setClosed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  )
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  )

  useEffect(() => {
    function onResize() {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (mobile) setClosed(true)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('me')
    navigate('/login')
  }

  const links = [
    { to: '/commissioner/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/commissioner/earnings', label: 'Earnings', icon: 'amount' },
    { to: '/commissioner/profile', label: 'Profile', icon: 'manager' },
  ]

  return (
    <div>
      <Sidebar
        closed={closed}
        links={links}
        onToggle={() => setClosed((c) => !c)}
        onLogout={logout}
      />
      <div className={`main ${closed ? 'full' : ''}`}>
        <div
          className="topbar"
          style={{
            background: 'var(--sidebar-bg)',
            borderBottom: '1px solid var(--sidebar-border)'
          }}
        >
          <div className="flex items-center gap-3 min-h-12">
            <button
              className="btn secondary w-9 h-9 p-0 grid place-items-center"
              onClick={() => setClosed((c) => !c)}
              title={closed ? 'Open menu' : 'Close menu'}
            >
              ☰
            </button>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full font-bold tracking-tight bg-[var(--panel)] border border-[var(--border)]">
              <span>💼 Commissioner Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn danger" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
        <div className="container" style={{ padding: '20px' }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
