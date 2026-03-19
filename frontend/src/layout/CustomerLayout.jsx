import React, { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { API_BASE, apiGet } from '../api.js'
import NotificationListener from '../components/NotificationListener.jsx'

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
      padding-bottom: 24px;
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

  return (
    <>
      <NotificationListener />
      <style>{STYLES}</style>
      <div className="customer-layout">
        <header className="customer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src={branding.headerLogo ? `${API_BASE}${branding.headerLogo}` : `${import.meta.env.BASE_URL}BSBackgroundremoved.png`}
              alt="Logo"
              style={{ height: 36, width: 'auto' }}
            />
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
      </div>
    </>
  )
}
