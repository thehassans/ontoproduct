import React, { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'

export default function WebDesignerLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const iframeRef = useRef(null)
  const [reloadKey, setReloadKey] = useState(0)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('me')
    navigate('/login')
  }

  const navItems = [
    { path: '/designer/categories', label: 'Categories', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>, preview: '/home?preview_section=category_browser' },
    { path: '/designer/home-headline', label: 'Home Headline', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h10M4 18h14"/></svg>, preview: '/home?preview_section=home_headline' },
    { path: '/designer/home-header', label: 'Home Header', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="4" rx="1"/><path d="M3 10h18M3 14h10M3 18h14"/></svg>, preview: '/home' },
    { path: '/designer/product-headline', label: 'Product Headline', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h12"/></svg>, preview: '/catalog' },
    { path: '/designer/home-banners', label: 'Home Banners', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="14" rx="2" ry="2"/><path d="M3 14l4-4a3 3 0 014 0l3 3M14 13l2-2a3 3 0 014 0l1 1M8 20h8"/></svg>, preview: '/home?preview_section=home_banners' },
    { path: '/designer/home-mini-banners', label: 'Home Mini Banners', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 12h4M14 10h4v4h-4z"/></svg>, preview: '/home?preview_section=home_mini_banner' },
    { path: '/designer/video-products', label: 'Video Products', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>, preview: '/home' },
    { path: '/designer/brands', label: 'Brands', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>, preview: '/home?preview_section=brand_browser' },
    { path: '/designer/explore-more', label: 'Explore More', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>, preview: '/home?preview_section=explore_more' },
  ]

  // Determine current storefront URL based on active editor path
  const currentItem = navItems.find(item => location.pathname.startsWith(item.path))
  const previewPath = currentItem ? currentItem.preview : '/home'
  const storefrontUrl = `${window.location.origin}${previewPath}`

  const forceReload = () => {
    setReloadKey(prev => prev + 1)
  }

  // Trigger iframe update on storage changes (saved settings or designer drafts)
  useEffect(() => {
    const handleStorageUpdate = (e) => {
      // Reload iframe if settings are saved or custom elements are updated
      const keysToReload = [
        'customCategories',
        'websiteBanners',
        'pageContent_home',
        'pageContent_catalog',
        '__designer_categories_updated',
        '__designer_brands_updated',
        '__designer_explore_more_updated',
        '__designer_home_mini_banners_updated',
        '__designer_home_video_products_updated'
      ]
      if (keysToReload.includes(e.key)) {
        forceReload()
      }
    }
    window.addEventListener('storage', handleStorageUpdate)
    return () => window.removeEventListener('storage', handleStorageUpdate)
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Sidebar Navigation */}
      <aside style={{
        width: 240,
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        color: '#f8fafc',
        boxShadow: '4px 0 24px rgba(15, 23, 42, 0.08)'
      }}>
        {/* Designer Header */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 800,
            fontSize: 16
          }}>
            B
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>Buysial Designer</div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, marginTop: 1 }}>Storefront Editor</div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#fff' : '#94a3b8',
                background: isActive ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
                boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none',
                transition: 'all 0.2s ease',
              })}
            >
              <span style={{ display: 'flex', opacity: 0.9 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout Section */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              textAlign: 'left',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={e => e.currentTarget.style.color = '#fff'}
            onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Split Screen Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Editor Controls Pane (Left) */}
        <main style={{
          flex: 1.2,
          overflowY: 'auto',
          padding: '24px 32px 40px',
          background: '#f8fafc',
          borderRight: '1px solid #e2e8f0'
        }}>
          <Outlet />
        </main>

        {/* Interactive Device Preview Pane (Right) */}
        <section style={{
          flex: 0.8,
          background: '#f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          boxShadow: 'inset 4px 0 16px rgba(0,0,0,0.02)',
          userSelect: 'none',
          position: 'relative'
        }}>
          {/* Top Panel Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            maxWidth: 380,
            marginBottom: 16
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Live Storefront Preview
            </div>
            <button
              onClick={forceReload}
              title="Reload preview screen"
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                color: '#475569',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1' }}
              onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0' }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3m0 0l3 3m-3-3v12" />
              </svg>
              Reload
            </button>
          </div>

          {/* Device Mockup Frame */}
          <div style={{
            width: '100%',
            maxWidth: 380,
            aspectRatio: '9 / 18.5',
            background: '#000',
            borderRadius: 44,
            padding: 10,
            boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Phone Bezel Top: Camera Notch/Island */}
            <div style={{
              position: 'absolute',
              top: 18,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 110,
              height: 25,
              borderRadius: 15,
              background: '#000',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Camera Lens simulator */}
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#111', marginLeft: 'auto', marginRight: 16 }} />
            </div>

            {/* Custom Phone Status Bar (Premium aesthetics) */}
            <div style={{
              height: 38,
              background: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 24px',
              borderTopLeftRadius: 34,
              borderTopRightRadius: 34,
              zIndex: 90,
              position: 'relative',
              borderBottom: '1px solid #f1f5f9'
            }}>
              {/* Left side: simulated Time */}
              <div style={{ fontSize: 12, fontWeight: 700, color: '#000' }}>11:44</div>

              {/* Right side: signal indicators, wifi, battery */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Signal bars */}
                <svg width="15" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#000' }}>
                  <path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 20V4" strokeLinecap="round" />
                </svg>
                {/* Wifi icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#000' }}>
                  <path d="M12 20h.01M8.5 16.5a5 5 0 017 0M5 13a10 10 0 0114 0M1.5 9.5a15 15 0 0121 0" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {/* Battery icon */}
                <div style={{
                  width: 22,
                  height: 11,
                  border: '1.5px solid #000',
                  borderRadius: 3,
                  position: 'relative',
                  padding: 1,
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <div style={{ height: '100%', width: '90%', background: '#000', borderRadius: 1 }} />
                  <div style={{ width: 1.5, height: 4, background: '#000', position: 'absolute', right: -3, top: '50%', transform: 'translateY(-50%)', borderTopRightRadius: 1, borderBottomRightRadius: 1 }} />
                </div>
              </div>
            </div>

            {/* Iframe Store Container */}
            <div style={{
              flex: 1,
              background: '#fff',
              borderBottomLeftRadius: 34,
              borderBottomRightRadius: 34,
              overflow: 'hidden',
              position: 'relative'
            }}>
              <iframe
                key={reloadKey}
                ref={iframeRef}
                src={storefrontUrl}
                title="Storefront Live Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  background: '#fff'
                }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
