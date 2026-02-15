import React, { useEffect, useMemo, useRef, useState } from 'react'
import { apiGet, apiPost, apiPatch, API_BASE, apiGetBlob } from '../../api'
import { getCurrencyConfig, convert } from '../../util/currency'
import { useLocation, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import OrderStatusTrack from '../../ui/OrderStatusTrack.jsx'
import { useToast } from '../../ui/Toast.jsx'

export default function ManagerOrders(){
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const [me, setMe] = useState(()=>{ try{ return JSON.parse(localStorage.getItem('me')||'{}') }catch{ return {} } })
  
  // Month/Year filtering - default to current month
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  const IconCalendar = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
  const IconSearch = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
  const IconFilter = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="22 3 2 3 10 12 10 19 14 21 14 12 22 3" />
    </svg>
  )
  const IconPin = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 10c0 6-9 13-9 13S3 16 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
  const IconBox = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  )
  const IconTruck = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="1" y="3" width="15" height="13" />
      <path d="M16 8h4l3 3v5h-7z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
  const IconUser = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
  const IconAlert = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
  const IconLock = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
  const IconPrinter = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v-5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  )
  const IconDownload = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
  
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [drivers, setDrivers] = useState([])
  const [driversByCountry, setDriversByCountry] = useState({}) // Cache drivers by country
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const loadingMoreRef = useRef(false)
  const endRef = useRef(null)
  const exportingRef = useRef(false)
  const urlSyncRef = useRef({ raf: 0, last: '' })
  const [assigning, setAssigning] = useState('')
  const [q, setQ] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [ship, setShip] = useState('')
  const [onlyUnassigned, setOnlyUnassigned] = useState(false)
  const [onlyAssigned, setOnlyAssigned] = useState(false)
  const [driverFilter, setDriverFilter] = useState('')
  const [curCfg, setCurCfg] = useState(null)
  const [pendingReturns, setPendingReturns] = useState([])
  const [verifying, setVerifying] = useState(null)
  const [summary, setSummary] = useState(null)

  // Responsive viewport tracking
  const [vw, setVw] = useState(()=> (typeof window !== 'undefined' ? window.innerWidth : 1024))
  useEffect(()=>{
    const onResize = ()=>{ try{ setVw(window.innerWidth || 1024) }catch{} }
    try{ window.addEventListener('resize', onResize) }catch{}
    return ()=>{ try{ window.removeEventListener('resize', onResize) }catch{} }
  }, [])
  const isMobileView = vw <= 480
  const isTabletView = vw > 480 && vw <= 768

  // Preserve scroll helper - enhanced for mobile
  const preserveScroll = async (fn)=>{
    const y = (typeof window !== 'undefined' && typeof document !== 'undefined')
      ? (window.scrollY || (document.scrollingElement && document.scrollingElement.scrollTop) || (document.documentElement && document.documentElement.scrollTop) || (document.body && document.body.scrollTop) || 0)
      : 0
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
    
    try{ return await fn() }
    finally {
      // Multiple attempts to restore scroll position, especially important on mobile
      const restoreScroll = () => {
        try{ window.scrollTo(0, y) }catch{}
        try{ if (document && document.scrollingElement) document.scrollingElement.scrollTop = y }catch{}
        try{ if (document && document.documentElement) document.documentElement.scrollTop = y }catch{}
        try{ if (document && document.body) document.body.scrollTop = y }catch{}
      }
      
      // Immediate restore
      restoreScroll()
      
      // After next frame
      try{
        requestAnimationFrame(()=>{
          restoreScroll()
          // Additional delay for mobile browsers
          if (isMobile) {
            setTimeout(restoreScroll, 10)
            setTimeout(restoreScroll, 50)
            setTimeout(restoreScroll, 100)
          } else {
            setTimeout(restoreScroll, 0)
          }
        })
      }catch{ restoreScroll() }
    }
  }

  async function fetchMe(){ try{ const { user } = await apiGet('/api/users/me'); setMe(user||{}) }catch{} }
  const buildQuery = useMemo(()=>{
    const params = new URLSearchParams()
    const startDate = new Date(selectedYear, selectedMonth - 1, 1)
    const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999)
    params.set('from', startDate.toISOString())
    params.set('to', endDate.toISOString())
    if (q.trim()) params.set('q', q.trim())
    if (country.trim()) params.set('country', country.trim())
    if (city.trim()) params.set('city', city.trim())
    if (ship.trim()) params.set('ship', ship.trim())
    if (onlyUnassigned) params.set('onlyUnassigned','true')
    else if (onlyAssigned) params.set('onlyAssigned','true')
    if (driverFilter.trim()) params.set('driver', driverFilter.trim())
    return params
  }, [q, country, city, ship, onlyUnassigned, driverFilter, selectedMonth, selectedYear])

  function countryToCurrency(c){
    const raw = String(c||'').trim().toLowerCase()
    if (!raw) return ''
    if (raw==='ksa' || raw==='saudi arabia' || raw==='saudi' || raw==='sa') return 'SAR'
    if (raw==='uae' || raw==='united arab emirates' || raw==='ae') return 'AED'
    if (raw==='oman' || raw==='om') return 'OMR'
    if (raw==='bahrain' || raw==='bh') return 'BHD'
    if (raw==='india' || raw==='in') return 'INR'
    if (raw==='kuwait' || raw==='kw' || raw==='kwt') return 'KWD'
    if (raw==='qatar' || raw==='qa') return 'QAR'
    return ''
  }
  function formatCurrency(n, cur){
    const v = Number(n||0)
    const s = v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return `${cur} ${s}`
  }

  async function loadSummary(){
    try{
      const params = new URLSearchParams(buildQuery.toString())
      if (String(ship||'').trim().toLowerCase() === 'delivered') params.set('includeWeb','true')
      const r = await apiGet(`/api/orders/summary?${params.toString()}`)
      setSummary(r||null)
    }catch{ setSummary(null) }
  }
  async function loadOrders(reset=false){
    if (loadingMoreRef.current) return
    loadingMoreRef.current = true
    try{
      if (reset){ setLoading(true); setOrders([]); setPage(1); setHasMore(true) }
      const nextPage = reset ? 1 : (page + 1)
      const params = new URLSearchParams(buildQuery.toString())
      params.set('page', String(nextPage))
      params.set('limit', '20')
      const res = await apiGet(`/api/orders?${params.toString()}`)
      const list = Array.isArray(res?.orders) ? res.orders : []
      setOrders(prev => reset ? list : [...prev, ...list])
      setHasMore(!!res?.hasMore)
      setPage(nextPage)
      setError('')
    }catch(e){ setError(e?.message||'Failed to load orders'); setHasMore(false) }
    finally{ setLoading(false); loadingMoreRef.current = false }
  }

  // Load pending returns for verification
  async function loadPendingReturns(){
    try{
      const res = await apiGet('/api/orders?ship=cancelled,returned&limit=200')
      const allOrders = res?.orders || []
      // Filter only submitted returns that need verification
      const submitted = allOrders.filter(o => 
        o.returnSubmittedToCompany && 
        !o.returnVerified &&
        ['cancelled', 'returned'].includes(String(o.shipmentStatus || '').toLowerCase())
      )
      setPendingReturns(submitted)
    }catch(e){
      console.error('Failed to load pending returns:', e)
    }
  }

  async function verifyReturn(orderId){
    setVerifying(orderId)
    try{
      // Save current scroll position
      const scrollY = window.scrollY
      
      const response = await apiPost(`/api/orders/${orderId}/return/verify`, {})
      toast.success(response?.message || 'Order verified successfully and stock refilled')
      
      // Update states locally to preserve scroll position
      setPendingReturns(prev => prev.filter(o => String(o._id) !== String(orderId)))
      setOrders(prev => prev.map(o => 
        String(o._id) === String(orderId)
          ? { ...o, returnVerified: true, returnVerifiedAt: new Date().toISOString() }
          : o
      ))
      
      // Restore scroll position after state update
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY)
      })
    }catch(e){
      toast.error(e?.message || 'Failed to verify order')
    }finally{
      setVerifying(null)
    }
  }

  // Fetch drivers by country (with caching)
  async function fetchDriversByCountry(country){
    if (!country) return []
    
    // Check cache first
    if (driversByCountry[country]) {
      return driversByCountry[country]
    }
    
    try{
      const r = await apiGet(`/api/users/drivers?country=${encodeURIComponent(country)}`)
      const drivers = Array.isArray(r?.users)? r.users : []
      setDriversByCountry(prev => ({ ...prev, [country]: drivers }))
      return drivers
    }catch{
      return []
    }
  }

  // Load drivers for visible orders when orders change
  useEffect(()=>{
    const countries = [...new Set(orders.map(o => o.orderCountry).filter(Boolean))]
    countries.forEach(country => fetchDriversByCountry(country))
  }, [orders])

  useEffect(()=>{ fetchMe(); loadOrders(true); loadPendingReturns() },[])
  useEffect(()=>{ let alive=true; getCurrencyConfig().then(c=>{ if(alive) setCurCfg(c) }).catch(()=>{}); return ()=>{ alive=false } },[])
  // Load driver list for selected filter country
  useEffect(()=>{ if (country) fetchDriversByCountry(country) }, [country])
  // Apply URL params to filters
  useEffect(()=>{
    try{
      const p = new URLSearchParams(location.search || '')
      const c = p.get('country') || ''
      const ci = p.get('city') || ''
      const s = (p.get('ship')||'').toLowerCase()
      const un = String(p.get('onlyUnassigned')||'').toLowerCase() === 'true'
      const oa = String(p.get('onlyAssigned')||'').toLowerCase() === 'true'
      const qParam = p.get('q') || ''
      const dr = p.get('driver') || ''
      if (q !== qParam) setQ(qParam)
      if (country !== c) setCountry(c)
      if (city !== ci) setCity(ci)
      if (ship !== s) setShip(s)
      if (onlyUnassigned !== un) setOnlyUnassigned(un)
      if (onlyAssigned !== oa) setOnlyAssigned(oa)
      if (driverFilter !== dr) setDriverFilter(dr)
    }catch{}
  }, [location.search])
  useEffect(()=>{
    // Default country: if exactly one assigned, set it; if multiple, show all
    const arr = Array.isArray(me?.assignedCountries) && me.assignedCountries.length ? me.assignedCountries : (me?.assignedCountry ? [me.assignedCountry] : [])
    if (arr.length === 1) setCountry(arr[0])
  }, [me])

  // live updates and driver commission changes
  useEffect(()=>{
    let socket
    try{
      const token = localStorage.getItem('token')||''
      socket = io(API_BASE || undefined, { path:'/socket.io', transports:['polling'], upgrade:false, auth:{ token }, withCredentials:true })
      socket.on('orders.changed', async (evt)=>{
        try{
          const id = evt?.orderId
          if (!id) return
          const r = await apiGet(`/api/orders/view/${id}`)
          const ord = r?.order
          if (ord){
            await preserveScroll(async ()=>{
              setOrders(prev => {
                const idx = prev.findIndex(o => String(o._id) === String(id))
                if (idx === -1) return prev
                const copy = [...prev]; copy[idx] = ord; return copy
              })
            })
          }
        }catch{}
      })
      // Clear driver cache when driver is updated so new commission is fetched
      socket.on('driver.updated', (evt)=>{
        try{
          setDriversByCountry({}) // Clear cache to force refresh
        }catch{}
      })
    }catch{}
    return ()=>{ 
      try{ socket && socket.off('orders.changed') }catch{}
      try{ socket && socket.off('driver.updated') }catch{}
      try{ socket && socket.disconnect() }catch{} 
    }
  },[])
  // reload when filters change
  useEffect(()=>{ loadOrders(true); loadSummary() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [buildQuery])

  // Keep URL in sync with current filters for shareable deep links
  useEffect(()=>{
    try{
      const managed = ['q','country','city','onlyUnassigned','onlyAssigned','ship','driver']
      const canonical = (init)=>{
        const s = new URLSearchParams(init)
        const entries = managed
          .map(k => [k, s.get(k)])
          .filter(([k,v]) => v != null && String(v).trim() !== '')
        entries.sort((a,b)=> a[0].localeCompare(b[0]))
        return entries.map(([k,v])=> `${k}=${encodeURIComponent(String(v).trim())}`).join('&')
      }
      const nextQS = canonical(buildQuery.toString())
      const currQS = canonical(location.search||'')
      if (nextQS === currQS || urlSyncRef.current.last === nextQS){
        return
      }
      if (urlSyncRef.current.raf){
        cancelAnimationFrame(urlSyncRef.current.raf)
        urlSyncRef.current.raf = 0
      }
      urlSyncRef.current.raf = requestAnimationFrame(()=>{
        const path = location.pathname || '/manager/orders'
        navigate(`${path}${nextQS ? `?${nextQS}` : ''}`, { replace: true })
        urlSyncRef.current.last = nextQS
        urlSyncRef.current.raf = 0
      })
    }catch{}
    return ()=>{ if (urlSyncRef.current.raf){ cancelAnimationFrame(urlSyncRef.current.raf); urlSyncRef.current.raf = 0 } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildQuery, location.pathname, location.search])

  // Infinite scroll observer
  useEffect(()=>{
    const el = endRef.current
    if (!el) return
    const obs = new IntersectionObserver((entries)=>{
      const [e] = entries
      if (e.isIntersecting && hasMore && !loadingMoreRef.current){ loadOrders(false) }
    }, { rootMargin: '200px' })
    obs.observe(el)
    return ()=>{ try{ obs.disconnect() }catch{} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endRef.current, hasMore, page, buildQuery])

  const cities = useMemo(()=>{
    const set = new Set()
    for (const o of orders){ if (o?.city) set.add(o.city) }
    return Array.from(set)
  }, [orders])

  const countries = useMemo(()=>{
    const assigned = Array.isArray(me?.assignedCountries) && me.assignedCountries.length ? me.assignedCountries : (me?.assignedCountry ? [me.assignedCountry] : [])
    if (assigned.length) return Array.from(new Set(assigned))
    return ['UAE','Oman','KSA','Bahrain','India','Kuwait','Qatar']
  }, [me])

  async function exportCsv(){
    if (exportingRef.current) return
    exportingRef.current = true
    try{
      const params = new URLSearchParams(buildQuery.toString())
      params.set('max','10000')
      const blob = await apiGetBlob(`/api/orders/export?${params.toString()}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const ts = new Date().toISOString().slice(0,10)
      a.href = url
      a.download = `orders-${ts}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }catch(e){ alert(e?.message || 'Failed to export') }
    finally{ exportingRef.current = false }
  }

  async function assignDriver(orderId, driverId){
    setAssigning(orderId)
    try{
      await preserveScroll(async ()=>{
        const r = await apiPost(`/api/orders/${orderId}/assign-driver`, { driverId })
        const updated = r?.order
        if (updated){
          setOrders(prev => prev.map(o => String(o._id) === String(updated._id) ? updated : o))
        } else {
          await loadOrders(false)
        }
        setError('')
      })
    }catch(err){
      alert(err?.message||'Failed to assign')
    }finally{
      setAssigning('')
    }
  }

  // Save handler like user Orders page
  const [editingDriver, setEditingDriver] = useState({})
  const [editingStatus, setEditingStatus] = useState({})
  const [editingCommission, setEditingCommission] = useState({})
  const [updating, setUpdating] = useState({})
  
  // Helper to preserve scroll on dropdown changes
  const handleDriverChange = (orderId, value) => {
    const y = window.scrollY
    setEditingDriver(prev => ({...prev, [orderId]: value}))
    requestAnimationFrame(() => {
      window.scrollTo(0, y)
      setTimeout(() => window.scrollTo(0, y), 0)
    })
  }
  
  const handleStatusChange = (orderId, value) => {
    const y = window.scrollY
    setEditingStatus(prev => ({...prev, [orderId]: value}))
    requestAnimationFrame(() => {
      window.scrollTo(0, y)
      setTimeout(() => window.scrollTo(0, y), 0)
    })
  }
  
  const handleCommissionChange = (orderId, value) => {
    const y = window.scrollY
    setEditingCommission(prev => ({...prev, [orderId]: value}))
    requestAnimationFrame(() => {
      window.scrollTo(0, y)
      setTimeout(() => window.scrollTo(0, y), 0)
    })
  }
  async function saveOrder(orderId){
    const key = `save-${orderId}`
    setUpdating(prev => ({ ...prev, [key]: true }))
    try{
      await preserveScroll(async ()=>{
        const driverEdited = Object.prototype.hasOwnProperty.call(editingDriver, orderId)
        const statusEdited = Object.prototype.hasOwnProperty.call(editingStatus, orderId)
        const commissionEdited = Object.prototype.hasOwnProperty.call(editingCommission, orderId)

        // Always use PATCH to support commission updates
        const payload = {}
        if (driverEdited) payload.deliveryBoy = editingDriver[orderId] || null
        if (statusEdited) payload.shipmentStatus = editingStatus[orderId]
        if (commissionEdited) payload.driverCommission = Number(editingCommission[orderId]) || 0
        
        const r = await apiPatch(`/api/orders/${orderId}`, payload)
        const updated = r?.order
        if (updated){
          setOrders(prev => prev.map(o => String(o._id) === String(orderId) ? updated : o))
        } else {
          await loadOrders(false)
        }
      })
      // clear local edits
      setEditingDriver(prev=>{ const n={...prev}; delete n[orderId]; return n })
      setEditingStatus(prev=>{ const n={...prev}; delete n[orderId]; return n })
      setEditingCommission(prev=>{ const n={...prev}; delete n[orderId]; return n })
    }catch(err){ alert(err?.message || 'Failed to save') }
    finally{ setUpdating(prev => ({ ...prev, [key]: false })) }
  }

  function statusBadge(st){
    const s = String(st||'').toLowerCase()
    const map = { pending:'#f59e0b', assigned:'#6366f1', picked_up:'#3b82f6', in_transit:'#3b82f6', out_for_delivery:'#3b82f6', delivered:'#10b981', no_response:'#ef4444', cancelled:'#ef4444', returned:'#e11d48' }
    const color = map[s] || 'var(--muted)'
    return <span className="chip" style={{border:`1px solid ${color}`, color, background:'transparent'}}>{s.replace('_',' ')||'-'}</span>
  }

  function Card({ o }){
    const id = String(o?._id||'')
    const driverId = String(o?.deliveryBoy?._id || o?.deliveryBoy || '')
    // Get drivers from the same country as the order
    const countryDrivers = driversByCountry[o.orderCountry] || []
    // Get current driver and their commission
    const currentDriverId = editingDriver[id] !== undefined ? editingDriver[id] : driverId
    const selectedDriver = countryDrivers.find(d => String(d._id) === String(currentDriverId))
    const driverCommissionRate = selectedDriver?.driverProfile?.commissionPerOrder || 0
    const fullAddress = [o.customerAddress, o.customerArea, o.city, o.orderCountry, o.customerLocation].filter(Boolean).filter((v,i,a)=> a.indexOf(v)===i).join(', ')
    const driverName = o?.deliveryBoy ? `${o.deliveryBoy.firstName||''} ${o.deliveryBoy.lastName||''}`.trim() : ''
    function orderCountryCurrency(c){
      const raw = String(c||'').trim().toLowerCase()
      if (!raw) return 'SAR'
      if (raw==='ksa' || raw==='saudi arabia' || raw==='saudi' || raw.includes('saudi')) return 'SAR'
      if (raw==='uae' || raw==='united arab emirates' || raw==='ae' || raw.includes('united arab emirates')) return 'AED'
      if (raw==='oman' || raw==='om' || raw.includes('sultanate of oman')) return 'OMR'
      if (raw==='bahrain' || raw==='bh') return 'BHD'
      if (raw==='india' || raw==='in') return 'INR'
      if (raw==='kuwait' || raw==='kw' || raw==='kwt') return 'KWD'
      if (raw==='qatar' || raw==='qa') return 'QAR'
      return 'SAR'
    }
    function phoneCodeCurrency(code){
      const m = { '+966':'SAR', '+971':'AED', '+968':'OMR', '+973':'BHD', '+965':'KWD', '+974':'QAR', '+91':'INR' }
      return m[String(code||'').trim()] || null
    }
    function formatCurrency(n, cur){
      const v = Number(n||0)
      const s = v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      return `${cur} ${s}`
    }
    function countryToCurrency(c){
      const raw = String(c||'').trim().toLowerCase()
      if (!raw) return ''
      if (raw==='ksa' || raw==='saudi arabia' || raw==='saudi' || raw==='sa') return 'SAR'
      if (raw==='uae' || raw==='united arab emirates' || raw==='ae') return 'AED'
      if (raw==='oman' || raw==='om') return 'OMR'
      if (raw==='bahrain' || raw==='bh') return 'BHD'
      if (raw==='india' || raw==='in') return 'INR'
      if (raw==='kuwait' || raw==='kw' || raw==='kwt') return 'KWD'
      if (raw==='qatar' || raw==='qa') return 'QAR'
      return ''
    }
    const targetCode = orderCountryCurrency(o.orderCountry)
    const localCode = phoneCodeCurrency(o.phoneCountryCode) || targetCode
    let qty = 1
    if (o.items && Array.isArray(o.items) && o.items.length > 0){
      qty = o.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
    } else if (o.quantity != null){
      qty = Math.max(1, Number(o.quantity||1))
    }
    let itemsSubtotalConv = 0
    if (o.items && Array.isArray(o.items) && o.items.length > 0){
      for (const it of o.items){
        const q = Math.max(1, Number(it?.quantity||1))
        const unitRaw = (it?.productId?.price != null) ? Number(it.productId.price) : 0
        const fromCode = (it?.productId?.baseCurrency ? String(it.productId.baseCurrency).toUpperCase() : targetCode)
        const unitConv = convert(unitRaw, fromCode, targetCode, curCfg)
        itemsSubtotalConv += unitConv * q
      }
    } else {
      const unitRaw = (o?.productId?.price != null) ? Number(o.productId.price) : 0
      const fromCode = (o?.productId?.baseCurrency ? String(o.productId.baseCurrency).toUpperCase() : targetCode)
      const unitConv = convert(unitRaw, fromCode, targetCode, curCfg)
      itemsSubtotalConv = unitConv * qty
    }
    const shipLocal = Number(o.shippingFee||0) || 0
    const discountLocal = Number(o.discount||0) || 0
    const shipConvRaw = convert(shipLocal, localCode, targetCode, curCfg)
    const discountConvRaw = convert(discountLocal, localCode, targetCode, curCfg)
    // Ensure converted values are valid numbers (avoid NaN/Infinity)
    const shipConv = Number.isFinite(shipConvRaw) ? shipConvRaw : shipLocal
    const discountConv = Number.isFinite(discountConvRaw) ? discountConvRaw : discountLocal
    // Use saved order total if available, otherwise calculate from items
    const savedTotal = o.total != null ? Number(o.total) : null
    const savedTotalConv = savedTotal != null ? convert(savedTotal, localCode, targetCode, curCfg) : null
    const calculatedTotal = Math.max(0, itemsSubtotalConv + shipConv - discountConv)
    const totalConv = (savedTotalConv != null && Number.isFinite(savedTotalConv)) ? savedTotalConv : calculatedTotal
    
    // Check return submission status
    const status = String(o.shipmentStatus || '').toLowerCase()
    const isCancelledOrReturned = ['cancelled', 'returned'].includes(status)
    const isDelivered = status === 'delivered'
    const isReturnSubmitted = o.returnSubmittedToCompany && !o.returnVerified
    const isReturnVerified = o.returnVerified
    // Manager can edit driver until order is delivered
    const canEditDriver = !isDelivered
    
    return (
      <div className="card" style={{display:'grid', gap:12, border: isReturnSubmitted ? '2px solid #f59e0b' : undefined, background: isReturnSubmitted ? 'rgba(251, 146, 60, 0.05)' : undefined}}>
        <div className="card-header" style={{alignItems:'center', flexWrap:'wrap', gap:10}}>
          <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', flex:1}}>
            <div className="badge" style={{fontSize:14}}>{o.orderCountry || '-'}</div>
            <div className="chip" style={{background:'transparent', fontSize:14}}>{o.city || '-'}</div>
            <div>{statusBadge(o.shipmentStatus || o.status)}</div>
            {isReturnSubmitted && (
              <span className="badge" style={{background:'#fef3c7', color:'#92400e', border:'1px solid #fbbf24', fontWeight:700, animation:'pulse 2s infinite', fontSize:13}}>
                <span style={{display:'inline-flex', alignItems:'center', gap:6}}><IconAlert style={{width:14, height:14}} />Awaiting Verification</span>
              </span>
            )}
            {isReturnVerified && (
              <span className="badge" style={{background:'#d1fae5', color:'#065f46', border:'1px solid #10b981', fontWeight:700, fontSize:13}}>
                Return Verified
              </span>
            )}
            {isDelivered && (
              <span className="badge" style={{background:'#d1fae5', color:'#065f46', border:'1px solid #10b981', fontWeight:600, fontSize:12}}>
                <span style={{display:'inline-flex', alignItems:'center', gap:6}}><IconLock style={{width:14, height:14}} />Status Locked</span>
              </span>
            )}
            {!canEditDriver && driverId && (
              <span className="badge" style={{background:'#e0e7ff', color:'#3730a3', border:'1px solid #6366f1', fontWeight:600, fontSize:12}}>
                <span style={{display:'inline-flex', alignItems:'center', gap:6}}><IconLock style={{width:14, height:14}} />Driver Locked (Delivered)</span>
              </span>
            )}
            {driverName && (
              <div className="chip" style={{background:'var(--panel)', border:'1px solid var(--border)', fontSize:13}} title={driverName}>
                <span style={{display:'inline-flex', alignItems:'center', gap:6}}><IconTruck style={{width:14, height:14}} /><strong>{driverName}</strong></span>
              </div>
            )}
          </div>
          <div style={{display:'flex', alignItems: isMobileView ? 'stretch' : 'center', gap:8, flexWrap:'wrap', flexDirection: isMobileView ? 'column' : 'row', width: isMobileView ? '100%' : undefined}}>
            {o.invoiceNumber ? <div style={{fontWeight:800, fontSize:16}}>#{o.invoiceNumber}</div> : null}
            <button 
              className="btn secondary" 
              onClick={()=> window.open(`/label/${id}`, '_blank', 'noopener,noreferrer')}
              style={{whiteSpace:'nowrap', padding:'8px 16px', width: isMobileView ? '100%' : 'auto'}}
            >
              <span style={{display:'inline-flex', alignItems:'center', gap:8}}><IconPrinter style={{width:16, height:16}} />Print Label</span>
            </button>
          </div>
        </div>
        <div className="section" style={{padding:'10px 12px 0', borderTop:'1px solid var(--border)'}}>
          <OrderStatusTrack order={o} />
        </div>
        <div className="section" style={{display:'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${isMobileView ? 'min(100%, 280px)' : '250px'}, 1fr))`, gap:16}}>
          <div style={{display:'grid', gap:6}}>
            <div className="label" style={{display:'flex', alignItems:'center', gap:6}}>
              <span style={{display:'inline-flex'}}><IconUser style={{width:14, height:14}} /></span> Customer
            </div>
            <div style={{fontWeight:700, fontSize:15}}>{o.customerName || '-'}</div>
            <div className="helper">{`${o.phoneCountryCode||''} ${o.customerPhone||''}`.trim()}</div>
            <div className="helper" title={fullAddress} style={{wordBreak:'break-word', lineHeight:1.4}}>
              {fullAddress || '-'}
            </div>
          </div>
          <div style={{display:'grid', gap:6}}>
            <div className="label" style={{display:'flex', alignItems:'center', gap:6}}>
              <span style={{display:'inline-flex'}}><IconBox style={{width:14, height:14}} /></span> Product
            </div>
            <div style={{fontWeight:700, fontSize:15}}>
              {(() => {
                // Try items array first (multi-product support)
                if (o.items && Array.isArray(o.items) && o.items.length > 0) {
                  const productNames = o.items.map(item => {
                    if (item?.productId?.name) {
                      return `${item.productId.name} (${item.quantity || 1})`
                    }
                    return null
                  }).filter(Boolean)
                  if (productNames.length > 0) {
                    return productNames.join(', ')
                  }
                }
                // Try single productId
                if (o.productId?.name) return o.productId.name
                // Fallback: show ID if product data is missing
                const pid = o.productId?._id || o.productId
                if (pid) return `Product ID: ${String(pid).slice(-8)}`
                if (o.items && o.items.length > 0 && o.items[0]?.productId) {
                  const itemPid = o.items[0].productId._id || o.items[0].productId
                  if (itemPid) return `Product ID: ${String(itemPid).slice(-8)}`
                }
                return '-'
              })()}
            </div>
            <div className="helper">Qty: {qty}</div>
            <div className="helper" style={{fontSize:15, fontWeight:600, color:'var(--primary)'}}>
              Total: {targetCode} {totalConv.toFixed(2)}
            </div>
          </div>
          <div style={{display:'grid', gap:8, alignContent:'start'}}>
            <div className="label" style={{display:'flex', alignItems:'center', gap:6}}>
              <span style={{display:'inline-flex'}}><IconTruck style={{width:14, height:14}} /></span> Assign Driver & Status
            </div>
            <select 
              className="input" 
              value={editingDriver[id] !== undefined ? editingDriver[id] : driverId} 
              onChange={(e)=> handleDriverChange(id, e.target.value)} 
              disabled={updating[`save-${id}`] || !canEditDriver}
              style={{fontSize:14, opacity: !canEditDriver ? 0.6 : 1, cursor: !canEditDriver ? 'not-allowed' : 'pointer'}}
              title={!canEditDriver ? 'Driver locked. Order is already delivered.' : ''}
            >
              <option value="">-- Select Driver --</option>
              {countryDrivers.map(d => (
                <option key={String(d._id)} value={String(d._id)}>{`${d.firstName||''} ${d.lastName||''}${d.city? ' • '+d.city:''}`}</option>
              ))}
              {countryDrivers.length === 0 && <option disabled>No drivers in {o.orderCountry}</option>}
            </select>
            <select 
              className="input" 
              value={editingStatus[id] || (o.shipmentStatus || 'pending')} 
              onChange={(e)=> handleStatusChange(id, e.target.value)} 
              disabled={updating[`save-${id}`] || isDelivered}
              style={{fontSize:14, opacity: isDelivered ? 0.6 : 1, cursor: isDelivered ? 'not-allowed' : 'pointer'}}
              title={isDelivered ? 'Delivered orders cannot be modified. Contact owner.' : ''}
            >
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="picked_up">Picked Up</option>
              <option value="in_transit">In Transit</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="no_response">No Response</option>
              <option value="returned">Returned</option>
              <option value="cancelled">Cancelled</option>
              <option value="return_verified">Return Verified</option>
            </select>
          </div>
        </div>
        
        {/* Driver Commission - Bottom Left */}
        <div style={{padding:'16px 0', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:16}}>
          <div style={{flex:1}}>
            <label style={{fontSize:12, fontWeight:600, color:'var(--muted)', marginBottom:6, display:'block', textTransform:'uppercase', letterSpacing:'0.5px'}}>Driver Commission</label>
            <input 
              type="number" 
              className="input" 
              value={editingCommission[id] !== undefined ? editingCommission[id] : (o.driverCommission || driverCommissionRate)} 
              onChange={(e)=> handleCommissionChange(id, e.target.value)} 
              placeholder="0.00" 
              min="0" 
              step="0.01"
              disabled={updating[`save-${id}`] || !canEditDriver}
              style={{fontSize:16, fontWeight:600, maxWidth:180, opacity: !canEditDriver ? 0.6 : 1, cursor: !canEditDriver ? 'not-allowed' : 'pointer'}}
              title={!canEditDriver ? 'Commission locked. Order is already delivered.' : ''}
            />
            <div className="helper" style={{fontSize:11, marginTop:4}}>{orderCountryCurrency(o.orderCountry)}</div>
          </div>
          {(editingDriver[id] !== undefined || editingStatus[id] !== undefined || editingCommission[id] !== undefined) && (
            <button 
              className="btn success" 
              onClick={()=> saveOrder(id)} 
              disabled={updating[`save-${id}`]}
              style={{padding:'8px 16px', fontSize:14, height:'fit-content'}}
            >
              Save Changes
            </button>
          )}
        </div>
        
        {/* Return Verification Action */}
        {isReturnSubmitted && (
          <div className="section" style={{padding:16, background:'#fef3c7', border:'1px solid #fbbf24', borderRadius:8, display:'grid', gap:12}}>
            <div>
              <div style={{fontWeight:700, color:'#92400e', marginBottom:6, fontSize:15}}>
                Driver has submitted this {status} order for verification
              </div>
              <div className="helper" style={{color:'#92400e'}}>
                Submitted: {o.returnSubmittedAt ? new Date(o.returnSubmittedAt).toLocaleString() : '-'}
              </div>
              {o.returnReason && (
                <div className="helper" style={{color:'#92400e', marginTop:4}}>
                  Reason: {o.returnReason}
                </div>
              )}
            </div>
            <button 
              className="btn success"
              onClick={() => verifyReturn(o._id)}
              disabled={verifying === String(o._id)}
              style={{width:'100%', padding:'12px 20px', fontSize:15, fontWeight:600}}
            >
              {verifying === String(o._id) ? 'Verifying...' : 'Accept & Verify'}
            </button>
          </div>
        )}
        
        <div className="section" style={{display:'flex', gap:12, alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', paddingTop:12, borderTop:'1px solid var(--border-light)'}}>
          <div className="helper" style={{display:'flex', alignItems:'center', gap:6}}>
            <span style={{display:'inline-flex'}}><IconUser style={{width:14, height:14}} /></span> Created by: <strong>{(o.createdBy?.firstName||'') + ' ' + (o.createdBy?.lastName||'')}</strong>
          </div>
          <div className="helper" style={{display:'flex', alignItems:'center', gap:6}}>
            <span style={{display:'inline-flex'}}><IconCalendar style={{width:14, height:14}} /></span> {o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="section">
      <div className="page-header" style={(isMobileView || isTabletView) ? { flexDirection: 'column', alignItems: 'stretch', gap: 10 } : undefined}>
        <div>
          <div className="page-title gradient heading-purple">Orders</div>
          <div className="page-subtitle">Assign drivers and print labels</div>
        </div>
      </div>
      
      {/* Month/Year Filter */}
      <div className="card" style={{padding:16, borderRadius:18, border:'1px solid var(--border)', background:'rgba(148, 163, 184, 0.06)'}}>
        <div className="section" style={{display:'flex', alignItems: (isMobileView || isTabletView) ? 'stretch' : 'center', gap:12, flexWrap:'wrap', flexDirection: (isMobileView || isTabletView) ? 'column' : undefined}}>
          <div style={{fontWeight:800, fontSize:13, letterSpacing:'0.02em', display:'inline-flex', alignItems:'center', gap:8, color:'var(--muted)'}}>
            <IconCalendar style={{width:16, height:16}} />
            Period
          </div>
          <select 
            className="input" 
            value={selectedMonth} 
            onChange={(e)=> setSelectedMonth(Number(e.target.value))}
            style={{fontSize:14, maxWidth: (isMobileView || isTabletView) ? undefined : 140, width: (isMobileView || isTabletView) ? '100%' : undefined}}
          >
            {monthNames.map((name, idx) => (
              <option key={idx} value={idx + 1}>{name}</option>
            ))}
          </select>
          <select 
            className="input" 
            value={selectedYear} 
            onChange={(e)=> setSelectedYear(Number(e.target.value))}
            style={{fontSize:14, maxWidth: (isMobileView || isTabletView) ? undefined : 100, width: (isMobileView || isTabletView) ? '100%' : undefined}}
          >
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <div className="chip" style={{background:'rgba(37, 99, 235, 0.10)', border:'1px solid rgba(37, 99, 235, 0.25)', color:'var(--fg)', fontWeight:800, fontSize:13, width: (isMobileView || isTabletView) ? '100%' : undefined, textAlign: 'center'}}>
            {monthNames[selectedMonth - 1]} {selectedYear}
          </div>
        </div>
      </div>
      
      <div className="card" style={{display:'grid', gap:10, borderRadius:18, border:'1px solid var(--border)'}}>
        <div className="card-header">
          <div className="card-title" style={{fontSize:14, letterSpacing:'0.02em', textTransform:'uppercase', color:'var(--muted)'}}>Summary</div>
        </div>
        <div className="section" style={{display:'grid', gridTemplateColumns: (isMobileView || isTabletView) ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap:10}}>
          <div className="mini-card" style={{border:'1px solid var(--border)', borderRadius:14, padding:12, background:'rgba(148, 163, 184, 0.06)'}}>
            <div className="helper">Total Orders</div>
            <div style={{fontWeight:900, fontSize:18}}>{summary?.totalOrders ?? '-'}</div>
          </div>
          <div className="mini-card" style={{border:'1px solid var(--border)', borderRadius:14, padding:12, background:'rgba(148, 163, 184, 0.06)'}}>
            <div className="helper">Total Qty</div>
            <div style={{fontWeight:900, fontSize:18}}>{summary?.totalQty ?? '-'}</div>
          </div>
          <div className="mini-card" style={{border:'1px solid var(--border)', borderRadius:14, padding:12, background:'rgba(148, 163, 184, 0.06)'}}>
            <div className="helper">Delivered (Orders)</div>
            <div style={{fontWeight:900, fontSize:18}}>{summary?.deliveredOrders ?? '-'}</div>
          </div>
          <div className="mini-card" style={{border:'1px solid var(--border)', borderRadius:14, padding:12, background:'rgba(148, 163, 184, 0.06)'}}>
            <div className="helper">Delivered (Qty)</div>
            <div style={{fontWeight:900, fontSize:18}}>{summary?.deliveredQty ?? '-'}</div>
          </div>
          {(()=>{
            const c = String(country||'').trim()
            const cur = c ? countryToCurrency(c) : ''
            const map = summary?.amountByCurrency || {}
            if (cur && map[cur] != null){
              return (
                <div className="mini-card" style={{border:'1px solid var(--border)', borderRadius:14, padding:12, background:'rgba(148, 163, 184, 0.06)'}}>
                  <div className="helper">Amount ({cur})</div>
                  <div style={{fontWeight:900, fontSize:18}}>{formatCurrency(map[cur]||0, cur)}</div>
                </div>
              )
            }
            const order = ['AED','OMR','SAR','BHD','INR','KWD','QAR']
            return order.filter(k => Number((summary?.amountByCurrency||{})[k]||0) > 0).slice(0,7).map(k => (
              <div key={k} className="mini-card" style={{border:'1px solid var(--border)', borderRadius:14, padding:12, background:'rgba(148, 163, 184, 0.06)'}}>
                <div className="helper">Amount ({k})</div>
                <div style={{fontWeight:900, fontSize:18}}>{formatCurrency((summary?.amountByCurrency||{})[k]||0, k)}</div>
              </div>
            ))
          })()}
        </div>
      </div>
      <div className="card" style={{display:'grid', gap:12, borderRadius:18, border:'1px solid var(--border)'}}>
        <div className="card-header">
          <div className="card-title" style={{display:'flex', alignItems:'center', gap:10}}>
            <span style={{width:28, height:28, borderRadius:12, display:'inline-flex', alignItems:'center', justifyContent:'center', background:'rgba(37, 99, 235, 0.10)', border:'1px solid rgba(37, 99, 235, 0.18)'}}>
              <IconFilter style={{width:14, height:14}} />
            </span>
            Filters
          </div>
        </div>
        <div className="section" style={{display:'grid', gap:10}}>
          {/* Search Bar - Full Width */}
          <input 
            className="input" 
            placeholder="Search by invoice, product, driver, city, phone number, details..." 
            value={q} 
            onChange={e=> setQ(e.target.value)}
            style={{fontSize:15, padding:'12px 16px'}}
          />
          
          {/* Location & Status Filters */}
          <div style={{display:'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${isMobileView ? 140 : 180}px, 1fr))`, gap:8}}>
            <select className="input" value={country} onChange={e=> { setCountry(e.target.value); setDriverFilter('') }}>
              <option value=''>All Countries</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="input" value={city} onChange={e=> setCity(e.target.value)}>
              <option value=''>All Cities</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="input" value={ship} onChange={e=> setShip(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="picked_up">Picked Up</option>
              <option value="in_transit">In Transit</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="no_response">No Response</option>
              <option value="returned">Returned</option>
              <option value="cancelled">Cancelled</option>
              <option value="return_verified">Return Verified</option>
            </select>
          </div>
          
          {/* Quick Filters - Checkboxes */}
          <div style={{display:'flex', gap:12, flexWrap:'wrap', padding:'8px 0'}}>
            <label className="input" style={{display:'flex', gap:8, alignItems:'center', padding:'8px 12px', minWidth:'auto', cursor:'pointer'}}>
              <input type="checkbox" checked={onlyUnassigned} onChange={e=>{ const v=e.target.checked; setOnlyUnassigned(v); if (v) setOnlyAssigned(false) }} />
              <span style={{whiteSpace:'nowrap'}}>Unassigned only</span>
            </label>
            <label className="input" style={{display:'flex', gap:8, alignItems:'center', padding:'8px 12px', minWidth:'auto', cursor:'pointer'}}>
              <input type="checkbox" checked={onlyAssigned} onChange={e=>{ const v=e.target.checked; setOnlyAssigned(v); if (v) setOnlyUnassigned(false) }} />
              <span style={{whiteSpace:'nowrap'}}>Assigned only</span>
            </label>
          </div>
          
          {/* Advanced Filters */}
          <div style={{display:'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${isMobileView ? 160 : 200}px, 1fr))`, gap:8}}>
            <select className="input" value={driverFilter} onChange={e=> setDriverFilter(e.target.value)} disabled={!country}>
              <option value=''>{country? `All Drivers in ${country}` : 'Select Country to filter Drivers'}</option>
              {(driversByCountry[country] || []).map(d => (
                <option key={String(d._id)} value={String(d._id)}>{`${d.firstName||''} ${d.lastName||''}${d.city? ' • '+d.city:''}`}</option>
              ))}
            </select>
            <button className="btn secondary" onClick={exportCsv} style={{whiteSpace:'nowrap', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8}}>
              <IconDownload style={{width:16, height:16}} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Pending Returns Verification Section */}
      {pendingReturns.length > 0 && (
        <div className="card" style={{border:'2px solid #ef4444', background:'rgba(239, 68, 68, 0.05)', marginTop:12}}>
          <div className="card-header">
            <div className="card-title" style={{color:'#ef4444'}}>
              Cancelled/Returned Orders to Verify ({pendingReturns.length})
            </div>
          </div>
          <div style={{display:'grid', gap:10}}>
            {pendingReturns.map(order => {
              const isVerifying = verifying === String(order._id)
              const status = String(order.shipmentStatus || '').toLowerCase()
              const driverName = order.deliveryBoy 
                ? `${order.deliveryBoy.firstName || ''} ${order.deliveryBoy.lastName || ''}`.trim() || '-'
                : '-'
              
              return (
                <div key={order._id} className="panel" style={{display:'grid', gap:12, padding:16, border:'1px solid #fca5a5', borderRadius:8, background:'var(--panel)'}}>
                  {/* Header with Invoice and Status */}
                  <div style={{display:'flex', flexWrap:'wrap', alignItems:'center', gap:8}}>
                    <div style={{fontWeight:800, fontSize:16}}>
                      #{order.invoiceNumber || String(order._id).slice(-6)}
                    </div>
                    <span className="badge" style={{background:'#fee2e2', color:'#991b1b', textTransform:'capitalize'}}>
                      {status}
                    </span>
                    {order.orderCountry && <span className="badge">{order.orderCountry}</span>}
                    {order.city && <span className="chip">{order.city}</span>}
                  </div>
                  
                  {/* Order Details */}
                  <div style={{display:'grid', gap:6, fontSize:14}}>
                    <div className="helper">
                      <strong>Customer:</strong> {order.customerName || '-'} • {order.customerPhone || '-'}
                    </div>
                    <div className="helper" style={{wordBreak:'break-word'}}>
                      <strong>Address:</strong> {order.customerAddress || order.customerLocation || '-'}
                    </div>
                    {order.returnReason && (
                      <div className="helper">
                        <strong>Reason:</strong> {order.returnReason}
                      </div>
                    )}
                    <div className="helper">
                      <strong>Driver:</strong> {driverName}
                    </div>
                    <div className="helper" style={{color:'#f59e0b'}}>
                      <strong>Submitted:</strong> {order.returnSubmittedAt ? new Date(order.returnSubmittedAt).toLocaleString() : '-'}
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <button 
                    className="btn success"
                    onClick={() => verifyReturn(order._id)}
                    disabled={isVerifying}
                    style={{width:'100%', padding:'12px 20px', fontSize:15, fontWeight:600}}
                  >
                    {isVerifying ? 'Verifying...' : 'Accept & Verify'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{display:'grid', gap:12, marginTop:12}}>
        {loading ? (
          <div className="card"><div className="section">Loading…</div></div>
        ) : error ? (
          <div className="card"><div className="section error">{error}</div></div>
        ) : orders.length === 0 ? (
          <div className="card"><div className="section">No orders found</div></div>
        ) : (
          orders.map(o => <Card key={String(o._id)} o={o} />)
        )}
        {/* Infinite Scroll Sentinel */}
        <div ref={endRef} />
      </div>
    </div>
  )
}
