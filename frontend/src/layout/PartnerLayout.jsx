import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { PANEL_SIDEBAR_LINKS } from '../pages/partner/shared.jsx'

export default function PartnerLayout() {
  const me = (() => {
    try {
      return JSON.parse(localStorage.getItem('me') || '{}')
    } catch {
      return {}
    }
  })()

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)' }}>
      <div style={{ maxWidth: 1540, margin: '0 auto', padding: '20px clamp(14px, 2vw, 24px) 28px' }}>
        <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(240px, 280px) minmax(0, 1fr)' }}>
          <aside
            style={{
              alignSelf: 'start',
              position: 'sticky',
              top: 18,
              borderRadius: 28,
              border: '1px solid rgba(148,163,184,0.16)',
              background: 'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96))',
              color: '#f8fafc',
              padding: 18,
              boxShadow: '0 24px 70px rgba(15,23,42,0.18)',
            }}
          >
            <div style={{ display: 'grid', gap: 8, paddingBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(226,232,240,0.72)' }}>Partner panel</div>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em' }}>
                {`${me?.firstName || ''} ${me?.lastName || ''}`.trim() || 'Partner'}
              </div>
              <div style={{ color: 'rgba(226,232,240,0.78)', fontSize: 14 }}>
                {me?.assignedCountry || me?.country || 'Country locked partner workspace'}
              </div>
            </div>
            <nav style={{ display: 'grid', gap: 8, paddingTop: 18 }}>
              {PANEL_SIDEBAR_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/partner'}
                  style={({ isActive }) => ({
                    textDecoration: 'none',
                    padding: '13px 14px',
                    borderRadius: 16,
                    color: isActive ? '#0f172a' : '#f8fafc',
                    background: isActive ? 'linear-gradient(135deg, #ffffff, #e2e8f0)' : 'rgba(255,255,255,0.04)',
                    fontWeight: 800,
                    letterSpacing: '-0.01em',
                    border: isActive ? '1px solid rgba(255,255,255,0.78)' : '1px solid rgba(255,255,255,0.04)',
                    transition: 'all 160ms ease',
                  })}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </aside>
          <main style={{ minWidth: 0 }}>
            <Outlet />
          </main>
        </div>
      </div>
      <style>{`
        @media (max-width: 980px) {
          .partner-grid-shell { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
