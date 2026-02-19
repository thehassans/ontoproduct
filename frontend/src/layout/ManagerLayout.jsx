import React, { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom'
import { API_BASE, apiGet } from '../api.js'
import Sidebar from '../components/Sidebar.jsx'

export default function ManagerLayout(){
  const [closed, setClosed] = useState(()=> (typeof window!=='undefined' ? window.innerWidth <= 768 : false))
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(()=> (typeof window!=='undefined' ? window.innerWidth <= 768 : false))
  const [theme, setTheme] = useState(()=>{
    try{ return localStorage.getItem('theme') || 'dark' }catch{ return 'dark' }
  })
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false)
  const settingsBtnRef = useRef(null)
  const settingsDropRef = useRef(null)
  
  useEffect(()=>{
    try{ localStorage.setItem('theme', theme) }catch{}
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark')
  },[theme])
  useEffect(()=>{
    function onResize(){ setIsMobile(window.innerWidth <= 768) }
    window.addEventListener('resize', onResize)
    return ()=> window.removeEventListener('resize', onResize)
  },[])

  const [me, setMe] = useState(() => {
    try{ return JSON.parse(localStorage.getItem('me') || '{}') }catch{ return {} }
  })
  useEffect(()=>{ (async()=>{ try{ const { user } = await apiGet('/api/users/me'); setMe(user||{}) }catch{} })() },[])
  
  // Close dropdown when clicking outside
  useEffect(()=>{
    function handleClickOutside(e){
      if (showSettingsDropdown){
        const dropdown = settingsDropRef.current
        const button = settingsBtnRef.current
        if (dropdown && !dropdown.contains(e.target) && button && !button.contains(e.target)){
          setShowSettingsDropdown(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return ()=> document.removeEventListener('mousedown', handleClickOutside)
  }, [showSettingsDropdown])

  // Check permissions
  const canManageBanners = !!(me?.managerPermissions?.canManageBanners)
  const canManageProducts = !!(me?.managerPermissions?.canManageProducts)
  const canCreateDrivers = !!(me?.managerPermissions?.canCreateDrivers)
  const canManageCategories = !!(me?.managerPermissions?.canManageCategories)
  const canManageHomeHeadline = !!(me?.managerPermissions?.canManageHomeHeadline)
  const canManageProductHeadline = !!(me?.managerPermissions?.canManageProductHeadline)
  const canManageHomeBanners = !!(me?.managerPermissions?.canManageHomeBanners)
  const canManageHomeMiniBanners = !!(me?.managerPermissions?.canManageHomeMiniBanners)
  const canManageCoupons = !!(me?.managerPermissions?.canManageCoupons)
  const canManageCashback = !!(me?.managerPermissions?.canManageCashback)

  // Desktop sidebar links (full access; manager panel)
  const links = [
    { to: '/manager', label: 'Dashboard' },
    { to: '/manager/orders', label: 'Orders' },
    { to: '/manager/my-stock', label: 'My Stock' },
    ...(canCreateDrivers ? [{ to: '/manager/drivers/create', label: 'Create Driver' }] : []),
    { to: '/manager/transactions/drivers', label: 'Driver Finances' },
    { to: '/manager/driver-amounts', label: 'Driver Commission' },
    ...(canManageProducts ? [{ to: '/manager/products', label: 'Products' }] : []),
    ...(canManageProducts ? [{ to: '/manager/products/create', label: 'Create Product' }] : []),
    ...(canManageBanners ? [{ to: '/manager/banners', label: 'Banners' }] : []),
    ...(canManageCategories ? [{ to: '/manager/categories', label: 'Categories' }] : []),
    ...(canManageHomeHeadline ? [{ to: '/manager/home-headline', label: 'Home Headline' }] : []),
    ...(canManageProductHeadline ? [{ to: '/manager/product-headline', label: 'Product Headline' }] : []),
    ...(canManageHomeBanners ? [{ to: '/manager/home-banners', label: 'Home Banners' }] : []),
    ...(canManageHomeMiniBanners ? [{ to: '/manager/home-mini-banners', label: 'Home Mini Banners' }] : []),
    ...(canManageCoupons ? [{ to: '/manager/coupons', label: 'Coupons' }] : []),
    ...(canManageCashback ? [{ to: '/manager/cashback', label: 'Cashback Offers' }] : []),
    { to: '/manager/me', label: 'Manager Me' },
  ]
  // Mobile tabs - ALL desktop sidebar links
  const mobileTabs = [
    { to: '/manager', label: 'Dashboard', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { to: '/manager/orders', label: 'Orders', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
    { to: '/manager/my-stock', label: 'My Stock', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> },
    ...(canCreateDrivers ? [{ to: '/manager/drivers/create', label: 'Driver', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg> }] : []),
    { to: '/manager/transactions/drivers', label: 'Driver Fin.', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
    { to: '/manager/driver-amounts', label: 'Commission', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="12" y1="2" x2="12" y2="6"/></svg> },
    ...(canManageProducts ? [{ to: '/manager/products', label: 'Products', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg> }] : []),
    { to: '/manager/me', label: 'Me', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  ]

  const tabsVisible = isMobile
  const hideSidebar = isMobile

  function toggleTheme(){
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next === 'light' ? 'light' : 'dark')
  }
  
  function doLogout(){
    try{
      localStorage.removeItem('token')
      localStorage.removeItem('me')
      localStorage.removeItem('navColors')
      sessionStorage.removeItem('customDomainStore')
    }catch{}
    try{ navigate('/login', { replace: true }) }catch{}
    setTimeout(()=>{ try{ window.location.replace('/login') }catch{} }, 30)
  }

  return (
    <div>
      {/* Desktop: left sidebar like user layout */}
      {!isMobile && (
        <Sidebar closed={closed} links={links} onToggle={()=> setClosed(c=>!c)} />
      )}
      <div className={`main ${!isMobile && closed ? 'full' : ''} ${hideSidebar ? 'full-mobile' : ''} ${tabsVisible ? 'with-mobile-tabs' : ''}`}>
        {/* Mobile Header - Simple and Clean */}
        {isMobile && (
          <div className="mobile-header premium" style={{
            position:'sticky', 
            top:0, 
            zIndex:1500, 
            paddingTop:'calc(10px + env(safe-area-inset-top, 0px))',
            paddingRight:'14px',
            paddingBottom:'10px',
            paddingLeft:'14px',
            minHeight:'60px',
            display:'flex',
            alignItems:'center',
            justifyContent:'space-between',
            gap:12
          }}>
            <div style={{display:'flex', alignItems:'center', gap:10, minWidth:0}}>
              {(()=>{
                const fallback = `${import.meta.env.BASE_URL}BuySial2.png`
                const src = me.headerLogo ? `${API_BASE}${me.headerLogo}` : fallback
                return (
                  <button
                    type="button"
                    onClick={()=> navigate('/manager')}
                    title="Dashboard"
                    aria-label="Dashboard"
                    style={{background:'transparent', border:'none', padding:0, cursor:'pointer', display:'grid', placeItems:'center', width:36, height:36, borderRadius:12, flexShrink:0}}
                  >
                    <img src={src} alt="BuySial" style={{height:24, width:'auto', objectFit:'contain', display:'block'}} />
                  </button>
                )
              })()}
              <div style={{display:'flex', alignItems:'center', gap:10, minWidth:0, height:36, padding:'0 12px', borderRadius:18, border:'1px solid var(--border)', background:'rgba(148, 163, 184, 0.08)'}}>
                <span aria-hidden style={{display:'inline-flex', alignItems:'center', justifyContent:'center', width:26, height:26, borderRadius:10, background:'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(168, 85, 247, 0.12))', border:'1px solid rgba(139, 92, 246, 0.22)', flexShrink:0}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--fg)'}}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <span style={{fontWeight:850, fontSize:14, letterSpacing:'-0.01em', lineHeight:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:170}}>{`${me.firstName||''} ${me.lastName||''}`.trim() || 'Manager'}</span>
              </div>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:0, flexShrink:0, borderRadius:14, border:'1px solid var(--border)', background:'rgba(148, 163, 184, 0.06)', boxShadow:'0 10px 30px rgba(0,0,0,0.10)', overflow:'visible'}}>
              <button
                type="button"
                onClick={toggleTheme}
                title={theme==='light' ? 'Switch to dark mode' : 'Switch to light mode'}
                aria-label={theme==='light' ? 'Dark mode' : 'Light mode'}
                style={{
                  width:'40px',
                  height:'40px',
                  padding:0,
                  display:'grid',
                  placeItems:'center',
                  border:'none',
                  background:'transparent',
                  color:'var(--fg)',
                  cursor:'pointer',
                  boxSizing:'border-box',
                  appearance:'none',
                  WebkitAppearance:'none',
                  outline:'none',
                  WebkitTapHighlightColor:'transparent',
                  lineHeight:0
                }}
              >
                {theme === 'dark' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.9}}>
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.9}}>
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                )}
              </button>
              <div style={{ position: 'relative', borderLeft:'1px solid var(--border)' }}>
                <button
                  ref={settingsBtnRef}
                  type="button"
                  title="Settings"
                  aria-label="Settings"
                  onClick={(e)=> { e.preventDefault(); e.stopPropagation(); setShowSettingsDropdown(prev => !prev) }}
                  style={{width:'40px', height:'40px', padding:0, display:'grid', placeItems:'center', border:'none', background: showSettingsDropdown ? 'rgba(99, 102, 241, 0.12)' : 'transparent', color:'var(--fg)', cursor:'pointer', boxSizing:'border-box', appearance:'none', WebkitAppearance:'none', outline:'none', WebkitTapHighlightColor:'transparent', lineHeight:0}}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'block', transform:'translateY(0.5px)', opacity:0.95}}>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6 1.65 1.65 0 0 0 10.51 3.1V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.25.5.39 1.05.39 1.62s-.14 1.12-.39 1.62z" />
                  </svg>
                </button>
                {showSettingsDropdown && (
                  <div
                    ref={settingsDropRef}
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      width: '260px',
                      background: 'var(--panel)',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
                      zIndex: 3000,
                      overflow: 'hidden',
                      backdropFilter: 'blur(20px)'
                    }}
                  >
                    <div style={{ padding: '14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05))' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#fff', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
                        {((me.firstName||'')[0]||(me.lastName||'')[0]||'M').toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {`${me.firstName||''} ${me.lastName||''}`.trim() || 'Manager'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {me.email || ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '8px' }}>
                      <button
                        type="button"
                        onClick={(e)=> {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowSettingsDropdown(false)
                          doLogout()
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          fontSize: '14px',
                          fontWeight: 600,
                          borderRadius: '10px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e)=> { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.transform = 'translateX(4px)' }}
                        onMouseLeave={(e)=> { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateX(0)' }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                          <polyline points="16 17 21 12 16 7"/>
                          <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Desktop Topbar */}
        {!isMobile && (
          <div className="topbar premium" style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'nowrap', minHeight:'60px', padding:'0 1rem', gap:12}}>
            <div className="flex items-center gap-3" style={{flexShrink:0, minWidth:0}}>
              {(()=>{
                const fallback = `${import.meta.env.BASE_URL}BuySial2.png`
                const src = me.headerLogo ? `${API_BASE}${me.headerLogo}` : fallback
                return (
                  <button
                    type="button"
                    onClick={()=> navigate('/manager')}
                    title="Dashboard"
                    aria-label="Dashboard"
                    style={{background:'transparent', border:'none', padding:0, cursor:'pointer', display:'grid', placeItems:'center', width:36, height:36, borderRadius:12, flexShrink:0}}
                  >
                    <img src={src} alt="BuySial" style={{height:24, width:'auto', objectFit:'contain', display:'block'}} />
                  </button>
                )
              })()}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 20px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                <span aria-hidden style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                  flexShrink: 0,
                  fontSize: '18px'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <div style={{display: 'flex', flexDirection: 'column', gap: '2px'}}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>Manager</span>
                  <span style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>{`${me.firstName||''} ${me.lastName||''}`.trim() || 'Manager'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2" style={{flexShrink:0, gap:0, borderRadius:14, border:'1px solid var(--border)', background:'rgba(148, 163, 184, 0.06)', boxShadow:'0 10px 30px rgba(0,0,0,0.10)', overflow:'visible'}}>
              <button
                type="button"
                onClick={toggleTheme}
                title={theme==='light' ? 'Switch to dark mode' : 'Switch to light mode'}
                aria-label={theme==='light' ? 'Dark mode' : 'Light mode'}
                style={{width:'40px', height:'40px', padding:0, display:'grid', placeItems:'center', border:'none', background:'transparent', color:'var(--fg)', cursor:'pointer', boxSizing:'border-box', appearance:'none', WebkitAppearance:'none', outline:'none', WebkitTapHighlightColor:'transparent', lineHeight:0}}
              >
                {theme === 'dark' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.9}}>
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.9}}>
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                )}
              </button>
              {/* Settings dropdown */}
              <div style={{ position: 'relative', borderLeft:'1px solid var(--border)' }}>
                <button 
                  ref={settingsBtnRef}
                  type="button"
                  title="Settings" 
                  aria-label="Settings" 
                  onClick={(e)=> { e.preventDefault(); e.stopPropagation(); setShowSettingsDropdown(prev => !prev) }}
                  style={{width:'40px', height:'40px', padding:0, display:'grid', placeItems:'center', border:'none', background: showSettingsDropdown ? 'rgba(99, 102, 241, 0.12)' : 'transparent', color:'var(--fg)', cursor:'pointer', boxSizing:'border-box', appearance:'none', WebkitAppearance:'none', outline:'none', WebkitTapHighlightColor:'transparent', lineHeight:0}}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'block', transform:'translateY(0.5px)', opacity:0.95}}>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6 1.65 1.65 0 0 0 10.51 3.1V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.25.5.39 1.05.39 1.62s-.14 1.12-.39 1.62z" />
                  </svg>
                </button>
                {showSettingsDropdown && (
                  <div 
                    ref={settingsDropRef}
                    style={{
                      position:'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      width: '280px',
                      background: 'var(--panel)',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
                      zIndex: 3000,
                      overflow: 'hidden',
                      backdropFilter: 'blur(20px)'
                    }}
                  >
                    {/* User info header */}
                    <div style={{
                      padding: '20px',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05))'
                    }}>
                      <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        fontWeight: 600,
                        color: '#fff',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                      }}>
                        {((me.firstName||'')[0]||(me.lastName||'')[0]||'M').toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '2px' }}>
                          {`${me.firstName||''} ${me.lastName||''}`.trim() || 'Manager'}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                          {me.email || ''}
                        </div>
                      </div>
                    </div>
                    
                    {/* Menu items */}
                    <div style={{ padding: '8px' }}>
                      <button
                        type="button"
                        onClick={(e)=> {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowSettingsDropdown(false)
                          doLogout()
                        }}
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          fontSize: '14px',
                          fontWeight: 500,
                          borderRadius: '10px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e)=> {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                          e.currentTarget.style.transform = 'translateX(4px)'
                        }}
                        onMouseLeave={(e)=> {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.transform = 'translateX(0)'
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                          <polyline points="16 17 21 12 16 7"/>
                          <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div className={`container ${isMobile ? '' : ''}`} style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: isMobile ? '90px' : '0', minHeight: isMobile ? 'calc(100vh - 146px)' : 'auto' }}>
          <Outlet />
        </div>
      </div>
      {/* Mobile Bottom Navigation - Horizontally Scrollable */}
      {tabsVisible && (
        <nav 
          className="mobile-tabs" 
          data-tabs={String(mobileTabs.length)}
          role="navigation" 
          aria-label="Primary"
          style={{
            position:'fixed',
            bottom:0,
            left:0,
            right:0,
            zIndex:1600,
            pointerEvents:'auto',
            visibility:'visible',
            opacity:1,
            display:'flex',
            overflowX:'auto',
            WebkitOverflowScrolling:'touch'
          }}
        >
          {mobileTabs.map(tab => (
            <NavLink 
              key={tab.to} 
              to={tab.to} 
              end={tab.to === '/manager'} 
              className={({isActive})=>`tab ${isActive?'active':''}`}
              style={{
                display:'flex',
                flexDirection:'column',
                alignItems:'center',
                justifyContent:'center',
                padding:'6px 6px',
                gap:4,
                textDecoration:'none',
                transition:'all 0.2s ease',
                minWidth:0,
                whiteSpace:'nowrap',
                flex:'0 0 auto',
                width:78
              }}
            >
              <span className="icon" style={{display:'flex', alignItems:'center', justifyContent:'center'}}>{tab.icon}</span>
              <span style={{fontSize:10, fontWeight:600, textAlign:'center', lineHeight:1.2}}>{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
