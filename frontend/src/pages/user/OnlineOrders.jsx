import React, { useEffect, useMemo, useRef, useState } from 'react'
import { apiGet, apiPatch, apiPost, apiGetBlob, apiDelete } from '../../api'
import { useToast } from '../../ui/Toast.jsx'

function StatusBadge({ status }){
  const s = String(status||'').toLowerCase()
  let color = { borderColor:'#e5e7eb', color:'#374151' }
  if (s==='delivered') color = { borderColor:'#10b981', color:'#065f46' }
  else if (['in_transit','assigned','picked_up'].includes(s)) color = { borderColor:'#3b82f6', color:'#1d4ed8' }
  else if (['returned','cancelled'].includes(s)) color = { borderColor:'#ef4444', color:'#991b1b' }
  else if (s==='pending') color = { borderColor:'#f59e0b', color:'#b45309' }
  return <span className="chip" style={{ background:'transparent', ...color }}>{status||'-'}</span>
}

export default function OnlineOrders(){
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [status, setStatus] = useState('') // new|processing|done|cancelled
  const [ship, setShip] = useState('') // pending|assigned|picked_up|in_transit|delivered|returned|cancelled
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [onlyUnassigned, setOnlyUnassigned] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const loadingMoreRef = useRef(false)
  const endRef = useRef(null)
  const exportingRef = useRef(false)

  // Driver assignment state (similar to Orders)
  const [driversByCountry, setDriversByCountry] = useState({})
  const [editingDriver, setEditingDriver] = useState({})
  const [editingShipment, setEditingShipment] = useState({})
  const [editingCommission, setEditingCommission] = useState({})
  const [updating, setUpdating] = useState({})

  // Options
  const [countryOptions, setCountryOptions] = useState([])
  const [cityOptions, setCityOptions] = useState([])

  const buildQuery = useMemo(()=>{
    const sp = new URLSearchParams()
    if (q.trim()) sp.set('q', q.trim())
    if (status.trim()) sp.set('status', status.trim())
    if (ship.trim()) sp.set('ship', ship.trim())
    if (country.trim()) sp.set('country', country.trim())
    if (city.trim()) sp.set('city', city.trim())
    if (onlyUnassigned) sp.set('onlyUnassigned', 'true')
    if (start) sp.set('start', start)
    if (end) sp.set('end', end)
    return sp
  }, [q, status, ship, country, city, onlyUnassigned, start, end])

  async function load(reset=false){
    if (loadingMoreRef.current) return
    loadingMoreRef.current = true
    try{
      if (reset){ setLoading(true); setRows([]); setPage(1); setHasMore(true) }
      const nextPage = reset ? 1 : (page + 1)
      const params = new URLSearchParams(buildQuery.toString())
      params.set('page', String(nextPage))
      params.set('limit', '20')
      const res = await apiGet(`/api/ecommerce/orders?${params.toString()}`)
      const list = Array.isArray(res?.orders) ? res.orders : []
      setRows(prev => reset ? list : [...prev, ...list])
      setHasMore(!!res?.hasMore)
      setPage(nextPage)
      setError('')
    }catch(e){ setError(e?.message||'Failed to load online orders'); setHasMore(false) }
    finally{ setLoading(false); loadingMoreRef.current = false }
  }

  useEffect(()=>{ load(true) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [buildQuery])
  useEffect(()=>{ load(true) }, [])

  async function exportCsv(){
    if (exportingRef.current) return
    exportingRef.current = true
    try{
      const params = new URLSearchParams(buildQuery.toString())
      params.set('max','10000') // cap server-side
      const blob = await apiGetBlob(`/api/ecommerce/orders/export?${params.toString()}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const ts = new Date().toISOString().slice(0,10)
      a.href = url
      a.download = `web-orders-${ts}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }catch(e){ setError(e?.message || 'Failed to export') }
    finally{ exportingRef.current = false }
  }

  // Load options for filters
  async function loadOptions(selectedCountry=''){
    try{
      const qs = selectedCountry ? `?country=${encodeURIComponent(selectedCountry)}` : ''
      const r = await apiGet(`/api/ecommerce/orders/options${qs}`)
      setCountryOptions(Array.isArray(r?.countries)? r.countries: [])
      setCityOptions(Array.isArray(r?.cities)? r.cities: [])
    }catch{ setCountryOptions([]); setCityOptions([]) }
  }
  useEffect(()=>{ loadOptions('') },[])
  useEffect(()=>{ loadOptions(country||'') }, [country])
  useEffect(()=>{ if (city && !cityOptions.includes(city)) setCity('') }, [cityOptions])

  // Infinite scroll
  useEffect(()=>{
    const el = endRef.current
    if (!el) return
    const obs = new IntersectionObserver((entries)=>{
      const [e] = entries
      if (e.isIntersecting && hasMore && !loadingMoreRef.current){ load(false) }
    }, { rootMargin: '200px' })
    obs.observe(el)
    return ()=>{ try{ obs.disconnect() }catch{} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endRef.current, hasMore, page, buildQuery])

  async function updateStatus(id, next){
    try{
      await apiPatch(`/api/ecommerce/orders/${id}`, { status: next })
      setRows(prev => prev.map(r => r._id === id ? { ...r, status: next } : r))
      toast.success('Status updated')
    }catch(e){ toast.error(e?.message || 'Failed to update status') }
  }

  // Fetch drivers by country (cached)
  async function fetchDriversByCountry(country){
    if (!country) return []
    if (driversByCountry[country]) return driversByCountry[country]
    try{
      const r = await apiGet(`/api/users/drivers?country=${encodeURIComponent(country)}`)
      const drivers = Array.isArray(r?.users)? r.users: []
      setDriversByCountry(prev => ({ ...prev, [country]: drivers }))
      return drivers
    }catch{ return [] }
  }

  // Preload drivers for visible orders by country
  useEffect(()=>{
    const countries = [...new Set(rows.map(r => r.orderCountry).filter(Boolean))]
    countries.forEach(c => { fetchDriversByCountry(c) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  // Client-side product name filtering
  const productFiltered = useMemo(()=>{
    const pq = productQuery.trim().toLowerCase()
    if (!pq) return rows
    return rows.filter(r => {
      const names = Array.isArray(r.items) ? r.items.map(it => String(it?.name||'').toLowerCase()).filter(Boolean) : []
      return names.some(n => n.includes(pq))
    })
  }, [rows, productQuery])

  function shortId(id){ return String(id||'').slice(-5).toUpperCase() }

  async function saveRow(id){
    const key = `save-${id}`
    setUpdating(prev => ({ ...prev, [key]: true }))
    try{
      const row = rows.find(r => r._id === id)
      if (!row) return
      const currentDriver = String(row?.deliveryBoy?._id || row?.deliveryBoy || '')
      const nextDriver = editingDriver[id]
      const currentShip = String(row?.shipmentStatus || 'pending')
      const nextShip = editingShipment[id]
      const nextCommission = editingCommission[id]

      // Assign driver if changed and provided
      if (nextDriver !== undefined && String(nextDriver) !== currentDriver && String(nextDriver||'').trim()){
        await apiPost(`/api/ecommerce/orders/${id}/assign-driver`, { driverId: String(nextDriver) })
      }
      // Update shipment and/or commission if changed
      const updates = {}
      if (nextShip && String(nextShip) !== currentShip) updates.shipmentStatus = String(nextShip)
      if (nextCommission !== undefined) updates.driverCommission = Number(nextCommission) || 0
      if (Object.keys(updates).length > 0) {
        await apiPatch(`/api/ecommerce/orders/${id}`, updates)
      }
      await load(true)
      // Clear editing state for this row
      setEditingDriver(prev=>{ const n={...prev}; delete n[id]; return n })
      setEditingShipment(prev=>{ const n={...prev}; delete n[id]; return n })
      setEditingCommission(prev=>{ const n={...prev}; delete n[id]; return n })
      toast.success('Order updated')
    }catch(e){ toast.error(e?.message || 'Failed to save') }
    finally{ setUpdating(prev => ({ ...prev, [key]: false })) }
  }

  async function handleDeleteOrder(order) {
    const orderId = order._id || order.id
    const orderNum = order.invoiceNumber || String(orderId).slice(-6)
    if (!window.confirm(`Are you sure you want to delete order #${orderNum}? This action cannot be undone.`)) {
      return
    }
    try {
      await apiDelete(`/api/orders/${orderId}`)
      toast.success(`Order #${orderNum} deleted successfully`)
      setRows(prev => prev.filter(o => (o._id || o.id) !== orderId))
    } catch (e) {
      toast.error(e?.message || 'Failed to delete order')
    }
  }

  return (
    <div className="section" style={{display:'grid', gap:12}}>
      <div className="page-header">
        <div>
          <div className="page-title gradient heading-pink">Online Orders</div>
          <div className="page-subtitle">Website orders submitted by customers</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{display:'grid', gap:10}}>
        <div className="card-header"><div className="card-title">Filters</div></div>
        <div className="section" style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:8}}>
          <input className="input" placeholder="Search invoice, name, phone, address, details" value={q} onChange={e=> setQ(e.target.value)} />
          <input className="input" placeholder="Search product" value={productQuery} onChange={e=> setProductQuery(e.target.value)} />
          <select className="input" value={country} onChange={e=> setCountry(e.target.value)}>
            <option value=''>All Countries</option>
            {countryOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input" value={city} onChange={e=> setCity(e.target.value)}>
            <option value=''>All Cities</option>
            {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input" value={ship} onChange={e=> setShip(e.target.value)}>
            <option value="">All Shipment</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="picked_up">Picked Up</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="returned">Returned</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <label className="input" style={{display:'flex', alignItems:'center', gap:8}}>
            <input type="checkbox" checked={onlyUnassigned} onChange={e=> setOnlyUnassigned(e.target.checked)} /> Unassigned only
          </label>
          <button className="btn secondary" onClick={()=> load(true)} disabled={loading}>{loading? 'Refreshing…' : 'Refresh'}</button>
          <button className="btn" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      {/* Cards list */}
      <div style={{display:'grid', gap:12}}>
        {loading && rows.length===0 ? (
          <div className="card"><div className="section">Loading…</div></div>
        ) : error ? (
          <div className="card"><div className="section error">{error}</div></div>
        ) : productFiltered.length === 0 ? (
          <div className="card"><div className="section">No online orders found.</div></div>
        ) : (
          productFiltered.map((r) => {
            const id = String(r._id||r.id)
            const ordNo = '#' + shortId(id)
            const products = Array.isArray(r.items) ? r.items.map(it => `${it.name||''} (${it.quantity||1})`).join(', ') : '-'
            const qty = Array.isArray(r.items) ? r.items.reduce((s, it)=> s + (Number(it.quantity||1)), 0) : 1
            const price = Number(r.total||0)
            const countryDrivers = driversByCountry[r.orderCountry] || []
            const currDriver = editingDriver[id] !== undefined ? editingDriver[id] : (r?.deliveryBoy?._id || r?.deliveryBoy || '')
            const currShip = editingShipment[id] || r?.shipmentStatus || 'pending'
            const selectedDriver = countryDrivers.find(d => String(d._id) === String(currDriver))
            const defaultCommission = selectedDriver?.driverProfile?.commissionPerOrder || 0
            const currCommission = editingCommission[id] !== undefined ? editingCommission[id] : (r.driverCommission || defaultCommission)
            const addressFull = [r.address, r.area, r.city, r.orderCountry].filter(Boolean).join(', ')
            const saveKey = `save-${id}`
            const hasChanges = editingDriver[id] !== undefined || editingShipment[id] !== undefined || editingCommission[id] !== undefined
            return (
              <div key={id} className="card" style={{display:'grid', gap:10}}>
                <div className="card-header" style={{alignItems:'center'}}>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <div className="badge">{r.orderCountry || '-'}</div>
                    <div className="chip" style={{background:'transparent'}}>{r.city || '-'}</div>
                    <StatusBadge status={r.shipmentStatus || r.status} />
                  </div>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <div style={{fontWeight:800}}>{ordNo}</div>
                    <button
                      className="btn"
                      onClick={() => handleDeleteOrder(r)}
                      style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', fontSize: 12 }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
                <div className="section" style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:10}}>
                  <div>
                    <div className="label">Customer</div>
                    <div style={{fontWeight:700}}>{r.customerName || '-'}</div>
                    <div className="helper">{`${r.phoneCountryCode||''} ${r.customerPhone||''}`.trim()}</div>
                    <div className="helper" title={addressFull} style={{overflow:'hidden', textOverflow:'ellipsis'}}>{addressFull || '-'}</div>
                  </div>
                  <div>
                    <div className="label">Product</div>
                    <div style={{fontWeight:700}}>{products || '-'}</div>
                    <div className="helper">Qty: {qty}</div>
                    <div className="helper">Total: {price.toFixed(2)} {r.currency||'SAR'}</div>
                    {r.paymentStatus && (
                      <div className="helper" style={{marginTop: 4}}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          background: r.paymentStatus === 'paid' ? '#dcfce7' : '#fef3c7',
                          color: r.paymentStatus === 'paid' ? '#166534' : '#92400e'
                        }}>
                          {r.paymentStatus === 'paid' ? '✓ Paid' : 'Unpaid'}
                          {r.paymentStatus === 'paid' && r.paymentMethod && ` via ${r.paymentMethod.toUpperCase()}`}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="label">Assign Driver</div>
                    <div style={{display:'grid', gap:8}}>
                      <select className="input" value={currDriver} onChange={e=> setEditingDriver(prev => ({...prev, [id]: e.target.value}))} disabled={!!updating[saveKey]}>
                        <option value="">-- Select Driver --</option>
                        {countryDrivers.map(d => (
                          <option key={String(d._id)} value={String(d._id)}>{`${d.firstName||''} ${d.lastName||''}${d.city? ' • '+d.city:''}`}</option>
                        ))}
                        {countryDrivers.length === 0 && <option disabled>No drivers</option>}
                      </select>
                      <div style={{display:'flex', gap:8, alignItems:'center'}}>
                        <select className="input" style={{flex:1}} value={currShip} onChange={e=> setEditingShipment(prev => ({...prev, [id]: e.target.value}))} disabled={!!updating[saveKey]}>
                          <option value="pending">Pending</option>
                          <option value="assigned">Assigned</option>
                          <option value="picked_up">Picked Up</option>
                          <option value="in_transit">In Transit</option>
                          <option value="delivered">Delivered</option>
                          <option value="returned">Returned</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <div style={{display:'flex', alignItems:'center', gap:4}}>
                          <span style={{fontSize:11, opacity:0.7}}>💰</span>
                          <input
                            type="number"
                            className="input"
                            placeholder="Commission"
                            value={currCommission}
                            onChange={e => setEditingCommission(prev => ({...prev, [id]: e.target.value}))}
                            disabled={!!updating[saveKey]}
                            style={{width:70, padding:'6px 8px', fontSize:12}}
                          />
                        </div>
                        {hasChanges && (
                          <button className="btn success" onClick={()=> saveRow(id)} disabled={!!updating[saveKey]}>💾 Save</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="section" style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8}}>
                  <div className="helper">Created by: Website</div>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <button 
                      className="btn secondary" 
                      onClick={() => window.open(`/label/${id}`, '_blank')}
                      style={{padding:'4px 10px', fontSize:11}}
                    >
                      🖨️ Print Label
                    </button>
                    <div className="helper">Created: {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={endRef} />
    </div>
  )
}
