import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../../api'

const SECTIONS = [
  { key: 'canManageHomeHeadline', label: 'Home Headline', desc: 'Configure the headline strip on the homepage', icon: '📰', to: '/designer/home-headline', color: '#6366f1' },
  { key: 'canManageProductHeadline', label: 'Product Headline', desc: 'Set the headline for product pages', icon: '🏷️', to: '/designer/product-headline', color: '#8b5cf6' },
  { key: 'canManageHomeBanners', label: 'Home Banners', desc: 'Manage hero banners on the homepage', icon: '🖼️', to: '/designer/home-banners', color: '#a855f7' },
  { key: 'canManageHomeMiniBanners', label: 'Mini Banners', desc: 'Small promotional banners', icon: '🏠', to: '/designer/home-mini-banners', color: '#c084fc' },
  { key: 'canManageBrands', label: 'Brands', desc: 'Manage brand logos and listings', icon: '✨', to: '/designer/brands', color: '#7c3aed' },
  { key: 'canManageExploreMore', label: 'Explore More', desc: 'Curate explore more sections', icon: '🔲', to: '/designer/explore-more', color: '#5b21b6' },
]

export default function DesignerDashboard() {
  const navigate = useNavigate()
  const [me, setMe] = useState(() => { try { return JSON.parse(localStorage.getItem('me') || '{}') } catch { return {} } })

  useEffect(() => { (async () => { try { const { user } = await apiGet('/api/users/me'); setMe(user || {}) } catch {} })() }, [])

  const perms = me?.designerPermissions || {}
  const allowed = SECTIONS.filter(s => perms[s.key] !== false)

  return (
    <div className="section">
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: '0 8px 32px rgba(139,92,246,0.3)' }}>🎨</div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #8b5cf6, #a855f7, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Welcome back, {me.firstName || 'Designer'}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: '4px 0 0' }}>Manage your store's visual content and branding</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {allowed.map(s => (
          <button
            key={s.key}
            onClick={() => navigate(s.to)}
            style={{
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24,
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 12px 40px ${s.color}22` }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle at top right, ${s.color}15, transparent 70%)` }} />
            <div style={{ fontSize: 32, marginBottom: 12 }}>{s.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>{s.desc}</div>
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: s.color }}>
              Manage <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
