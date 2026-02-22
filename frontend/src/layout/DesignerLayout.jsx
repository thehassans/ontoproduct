import React, { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom'
import { API_BASE, apiGet } from '../api.js'
import Sidebar from '../components/Sidebar.jsx'

export default function DesignerLayout(){
  const [closed, setClosed] = useState(()=> (typeof window!=='undefined' ? window.innerWidth <= 768 : false))
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(()=> (typeof window!=='undefined' ? window.innerWidth <= 768 : false))
  const [theme, setTheme] = useState(()=>{ try{ return localStorage.getItem('theme') || 'dark' }catch{ return 'dark' } })
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false)
  const settingsBtnRef = useRef(null)
  const settingsDropRef = useRef(null)

  useEffect(()=>{ try{ localStorage.setItem('theme', theme) }catch{}; document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark') },[theme])
  useEffect(()=>{ function onResize(){ setIsMobile(window.innerWidth <= 768) }; window.addEventListener('resize', onResize); return ()=> window.removeEventListener('resize', onResize) },[])

  const [me, setMe] = useState(() => { try{ return JSON.parse(localStorage.getItem('me') || '{}') }catch{ return {} } })
  useEffect(()=>{ (async()=>{ try{ const { user } = await apiGet('/api/users/me'); setMe(user||{}) }catch{} })() },[])

  useEffect(()=>{
    function handleClickOutside(e){
      if (showSettingsDropdown){
        const dropdown = settingsDropRef.current
        const button = settingsBtnRef.current
        if (dropdown && !dropdown.contains(e.target) && button && !button.contains(e.target)) setShowSettingsDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return ()=> document.removeEventListener('mousedown', handleClickOutside)
  }, [showSettingsDropdown])

  const perms = me?.designerPermissions || {}

  const links = [
    { to: '/designer', label: 'Dashboard' },
    ...(perms.canManageHomeHeadline !== false ? [{ to: '/designer/home-headline', label: 'Home Headline' }] : []),
    ...(perms.canManageProductHeadline !== false ? [{ to: '/designer/product-headline', label: 'Product Headline' }] : []),
    ...(perms.canManageHomeBanners !== false ? [{ to: '/designer/home-banners', label: 'Home Banners' }] : []),
    ...(perms.canManageHomeMiniBanners !== false ? [{ to: '/designer/home-mini-banners', label: 'Mini Banners' }] : []),
    ...(perms.canManageBrands !== false ? [{ to: '/designer/brands', label: 'Brands' }] : []),
    ...(perms.canManageExploreMore !== false ? [{ to: '/designer/explore-more', label: 'Explore More' }] : []),
  ]

  const mobileTabs = [
    { to: '/designer', label: 'Home', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    ...(perms.canManageHomeHeadline !== false ? [{ to: '/designer/home-headline', label: 'Headline', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg> }] : []),
    ...(perms.canManageHomeBanners !== false ? [{ to: '/designer/home-banners', label: 'Banners', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> }] : []),
    ...(perms.canManageBrands !== false ? [{ to: '/designer/brands', label: 'Brands', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> }] : []),
    ...(perms.canManageExploreMore !== false ? [{ to: '/designer/explore-more', label: 'Explore', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }] : []),
  ]

  function toggleTheme(){ const next = theme === 'light' ? 'dark' : 'light'; setTheme(next); localStorage.setItem('theme', next); document.documentElement.setAttribute('data-theme', next === 'light' ? 'light' : 'dark') }
  function doLogout(){ try{ localStorage.removeItem('token'); localStorage.removeItem('me'); localStorage.removeItem('navColors'); sessionStorage.removeItem('customDomainStore') }catch{}; try{ navigate('/login', { replace: true }) }catch{}; setTimeout(()=>{ try{ window.location.replace('/login') }catch{} }, 30) }

  const ACCENT = '#8b5cf6'
  const ACCENT_GRADIENT = 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #c084fc 100%)'

  return (
    <div>
      {!isMobile && <Sidebar closed={closed} links={links} onToggle={()=> setClosed(c=>!c)} />}
      <div className={`main ${!isMobile && closed ? 'full' : ''} ${isMobile ? 'full-mobile' : ''} ${isMobile ? 'with-mobile-tabs' : ''}`}>
        {isMobile && (
          <div className="mobile-header premium" style={{ position:'sticky', top:0, zIndex:1500, paddingTop:'calc(10px + env(safe-area-inset-top, 0px))', paddingRight:'14px', paddingBottom:'10px', paddingLeft:'14px', minHeight:'60px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <div style={{display:'flex', alignItems:'center', gap:10, minWidth:0}}>
              <button type="button" onClick={()=> navigate('/designer')} style={{background:'transparent', border:'none', padding:0, cursor:'pointer', display:'grid', placeItems:'center', width:36, height:36, borderRadius:12, flexShrink:0}}>
                <span style={{fontSize:22}}>🎨</span>
              </button>
              <div style={{display:'flex', alignItems:'center', gap:10, minWidth:0, height:36, padding:'0 12px', borderRadius:18, border:`1px solid rgba(139,92,246,0.25)`, background:'rgba(139,92,246,0.08)'}}>
                <span style={{fontWeight:850, fontSize:14, letterSpacing:'-0.01em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:170, background: ACCENT_GRADIENT, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'}}>{`${me.firstName||''} ${me.lastName||''}`.trim() || 'Designer'}</span>
              </div>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:0, flexShrink:0, borderRadius:14, border:'1px solid var(--border)', background:'rgba(148,163,184,0.06)', overflow:'visible'}}>
              <button type="button" onClick={toggleTheme} style={{width:40, height:40, padding:0, display:'grid', placeItems:'center', border:'none', background:'transparent', color:'var(--fg)', cursor:'pointer'}}>
                {theme === 'dark' ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>}
              </button>
              <div style={{ position:'relative', borderLeft:'1px solid var(--border)' }}>
                <button ref={settingsBtnRef} type="button" onClick={()=> setShowSettingsDropdown(p=>!p)} style={{width:40, height:40, padding:0, display:'grid', placeItems:'center', border:'none', background: showSettingsDropdown ? 'rgba(139,92,246,0.12)' : 'transparent', color:'var(--fg)', cursor:'pointer'}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </button>
                {showSettingsDropdown && (
                  <div ref={settingsDropRef} style={{ position:'absolute', top:'calc(100% + 8px)', right:0, width:260, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,0.4)', zIndex:3000, overflow:'hidden', backdropFilter:'blur(20px)' }}>
                    <div style={{ padding:14, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12, background:'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(168,85,247,0.05))' }}>
                      <div style={{ width:40, height:40, borderRadius:'50%', background: ACCENT_GRADIENT, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'#fff' }}>{((me.firstName||'')[0]||'D').toUpperCase()}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:800, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{`${me.firstName||''} ${me.lastName||''}`.trim() || 'Designer'}</div>
                        <div style={{ fontSize:12, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{me.email||''}</div>
                      </div>
                    </div>
                    <div style={{ padding:8 }}>
                      <button type="button" onClick={()=>{ setShowSettingsDropdown(false); doLogout() }} style={{ width:'100%', padding:'12px 14px', background:'transparent', border:'none', color:'#ef4444', textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center', gap:12, fontSize:14, fontWeight:600, borderRadius:10 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!isMobile && (
          <div className="topbar premium" style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'nowrap', minHeight:60, padding:'0 1rem', gap:12}}>
            <div style={{display:'flex', alignItems:'center', gap:12, flexShrink:0}}>
              <button type="button" onClick={()=> navigate('/designer')} style={{background:'transparent', border:'none', padding:0, cursor:'pointer', display:'grid', placeItems:'center', width:36, height:36, borderRadius:12, flexShrink:0}}>
                <span style={{fontSize:24}}>🎨</span>
              </button>
              <div style={{ display:'inline-flex', alignItems:'center', gap:12, padding:'8px 20px', borderRadius:12, background:'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(168,85,247,0.1))', border:'1px solid rgba(139,92,246,0.2)', backdropFilter:'blur(10px)' }}>
                <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:8, background: ACCENT_GRADIENT, fontSize:16, color:'#fff', fontWeight:700 }}>{((me.firstName||'')[0]||'D').toUpperCase()}</span>
                <div style={{display:'flex', flexDirection:'column', gap:2}}>
                  <span style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', background: ACCENT_GRADIENT, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Designer</span>
                  <span style={{ fontSize:15, fontWeight:700, letterSpacing:'-0.02em', background: ACCENT_GRADIENT, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{`${me.firstName||''} ${me.lastName||''}`.trim() || 'Designer'}</span>
                </div>
              </div>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:0, flexShrink:0, borderRadius:14, border:'1px solid var(--border)', background:'rgba(148,163,184,0.06)', overflow:'visible'}}>
              <button type="button" onClick={toggleTheme} style={{width:40, height:40, padding:0, display:'grid', placeItems:'center', border:'none', background:'transparent', color:'var(--fg)', cursor:'pointer'}}>
                {theme === 'dark' ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>}
              </button>
              <div style={{ position:'relative', borderLeft:'1px solid var(--border)' }}>
                <button ref={settingsBtnRef} type="button" onClick={()=> setShowSettingsDropdown(p=>!p)} style={{width:40, height:40, padding:0, display:'grid', placeItems:'center', border:'none', background: showSettingsDropdown ? 'rgba(139,92,246,0.12)' : 'transparent', color:'var(--fg)', cursor:'pointer'}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </button>
                {showSettingsDropdown && (
                  <div ref={settingsDropRef} style={{ position:'absolute', top:'calc(100% + 8px)', right:0, width:280, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,0.4)', zIndex:3000, overflow:'hidden', backdropFilter:'blur(20px)' }}>
                    <div style={{ padding:20, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:14, background:'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(168,85,247,0.05))' }}>
                      <div style={{ width:52, height:52, borderRadius:'50%', background: ACCENT_GRADIENT, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:600, color:'#fff' }}>{((me.firstName||'')[0]||'D').toUpperCase()}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:16, marginBottom:2 }}>{`${me.firstName||''} ${me.lastName||''}`.trim() || 'Designer'}</div>
                        <div style={{ fontSize:13, color:'var(--muted)' }}>{me.email||''}</div>
                      </div>
                    </div>
                    <div style={{ padding:8 }}>
                      <button type="button" onClick={()=>{ setShowSettingsDropdown(false); doLogout() }} style={{ width:'100%', padding:'14px 16px', background:'transparent', border:'none', color:'#ef4444', textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center', gap:14, fontSize:14, fontWeight:500, borderRadius:10, transition:'all 0.2s' }} onMouseEnter={e=>{ e.currentTarget.style.background='rgba(239,68,68,0.1)' }} onMouseLeave={e=>{ e.currentTarget.style.background='transparent' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className={`container`} style={{ maxWidth:1280, margin:'0 auto', paddingBottom: isMobile ? '90px' : '0', minHeight: isMobile ? 'calc(100vh - 146px)' : 'auto' }}>
          <Outlet />
        </div>
      </div>

      {isMobile && (
        <nav className="mobile-tabs" role="navigation" aria-label="Primary" style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:1600, display:'flex', overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
          {mobileTabs.map(tab => (
            <NavLink key={tab.to} to={tab.to} end={tab.to === '/designer'} className={({isActive})=>`tab ${isActive?'active':''}`}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'6px 6px', gap:4, textDecoration:'none', minWidth:0, whiteSpace:'nowrap', flex:'0 0 auto', width:78 }}>
              <span className="icon" style={{display:'flex', alignItems:'center', justifyContent:'center'}}>{tab.icon}</span>
              <span style={{fontSize:10, fontWeight:600, textAlign:'center', lineHeight:1.2}}>{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
