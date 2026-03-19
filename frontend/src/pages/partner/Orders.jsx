import React, { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPatch, apiPost } from '../../api'
import { formatMoney, heroStyle, inputStyle, pageWrapStyle, panelStyle, primaryButtonStyle, secondaryButtonStyle, sectionTitle, statCardStyle, textAreaStyle } from './shared.jsx'

const shipmentOptions = ['pending', 'assigned', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled', 'returned']

export default function PartnerOrders() {
  const [orders, setOrders] = useState([])
  const [drivers, setDrivers] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ q: '', ship: '', driver: '' })
  const [notes, setNotes] = useState({})
  const [busyId, setBusyId] = useState('')

  async function loadAll() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.q.trim()) params.set('q', filters.q.trim())
      if (filters.ship) params.set('ship', filters.ship)
      if (filters.driver) params.set('driver', filters.driver)
      params.set('limit', '200')
      const query = params.toString()
      const [ordersRes, driversRes, summaryRes] = await Promise.all([
        apiGet(`/api/partners/me/orders${query ? `?${query}` : ''}`),
        apiGet('/api/partners/me/drivers'),
        apiGet(`/api/partners/me/orders/summary${query ? `?${query}` : ''}`),
      ])
      setOrders(Array.isArray(ordersRes?.orders) ? ordersRes.orders : [])
      setDrivers(Array.isArray(driversRes?.users) ? driversRes.users : [])
      setSummary(summaryRes?.summary || null)
    } catch {
      setOrders([])
      setDrivers([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [filters.q, filters.ship, filters.driver])

  const driversByCountry = useMemo(() => {
    const map = {}
    for (const driver of drivers) {
      const key = String(driver?.country || '')
      if (!map[key]) map[key] = []
      map[key].push(driver)
    }
    return map
  }, [drivers])

  async function assignDriver(orderId, driverId) {
    setBusyId(orderId)
    try {
      const res = await apiPost(`/api/partners/me/orders/${orderId}/assign-driver`, { driverId, note: notes[orderId] || '' })
      setOrders((prev) => prev.map((row) => String(row._id) === String(orderId) ? res?.order || row : row))
      await loadAll()
    } finally {
      setBusyId('')
    }
  }

  async function updateStatus(orderId, shipmentStatus) {
    setBusyId(orderId)
    try {
      const res = await apiPatch(`/api/partners/me/orders/${orderId}`, { shipmentStatus })
      setOrders((prev) => prev.map((row) => String(row._id) === String(orderId) ? res?.order || row : row))
      await loadAll()
    } finally {
      setBusyId('')
    }
  }

  const currency = 'SAR'

  return (
    <div style={pageWrapStyle()}>
      <div style={heroStyle()}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(226,232,240,0.78)' }}>Orders</div>
          <div style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 950, letterSpacing: '-0.05em' }}>Country order control</div>
          <div style={{ color: 'rgba(226,232,240,0.84)', maxWidth: 760, fontSize: 15 }}>
            View every order for your partnership country, assign your own drivers, and print labels instantly.
          </div>
        </div>
      </div>

      <section style={panelStyle()}>
        {sectionTitle('Filtered totals', 'Your live order totals update as you search, filter, and assign.')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 18 }}>
          <div style={statCardStyle('#0f172a')}><div style={{ fontSize: 13, color: '#475569', fontWeight: 700 }}>Total Orders</div><div style={{ fontSize: 28, fontWeight: 950, color: '#0f172a', marginTop: 10 }}>{Number(summary?.totalOrders || 0)}</div></div>
          <div style={statCardStyle('#2563eb')}><div style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 700 }}>Total Amount</div><div style={{ fontSize: 24, fontWeight: 950, color: '#1d4ed8', marginTop: 10 }}>{formatMoney(summary?.totalAmount, currency)}</div></div>
          <div style={statCardStyle('#059669')}><div style={{ fontSize: 13, color: '#065f46', fontWeight: 700 }}>Delivered Amount</div><div style={{ fontSize: 24, fontWeight: 950, color: '#065f46', marginTop: 10 }}>{formatMoney(summary?.deliveredAmount, currency)}</div></div>
          <div style={statCardStyle('#dc2626')}><div style={{ fontSize: 13, color: '#991b1b', fontWeight: 700 }}>Cancelled Orders</div><div style={{ fontSize: 28, fontWeight: 950, color: '#991b1b', marginTop: 10 }}>{Number(summary?.cancelledOrders || 0)}</div></div>
        </div>
      </section>

      <section style={panelStyle()}>
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <input className="input" style={inputStyle()} value={filters.q} onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))} placeholder="Search invoice, phone, customer" />
          <select className="input" style={inputStyle()} value={filters.ship} onChange={(e) => setFilters((prev) => ({ ...prev, ship: e.target.value }))}>
            <option value="">All statuses</option>
            {shipmentOptions.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
          </select>
          <select className="input" style={inputStyle()} value={filters.driver} onChange={(e) => setFilters((prev) => ({ ...prev, driver: e.target.value }))}>
            <option value="">All drivers</option>
            {drivers.map((driver) => (
              <option key={driver._id} value={driver._id}>{`${driver.firstName || ''} ${driver.lastName || ''}`.trim() || driver.phone}</option>
            ))}
          </select>
          <button className="btn secondary" style={secondaryButtonStyle()} onClick={() => setFilters({ q: '', ship: '', driver: '' })}>Reset</button>
        </div>
      </section>

      <section style={{ ...panelStyle(), display: 'grid', gap: 16 }}>
        {loading ? <div style={{ color: '#64748b' }}>Loading orders…</div> : null}
        {!loading && !orders.length ? <div style={{ color: '#64748b' }}>No orders matched your filters.</div> : null}
        {orders.map((order) => {
          const orderId = String(order?._id || '')
          const orderDrivers = driversByCountry[String(order?.orderCountry || '')] || drivers
          return (
            <article key={orderId} style={{ border: '1px solid rgba(148,163,184,0.16)', borderRadius: 22, padding: 18, display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'grid', gap: 5 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>#{order?.invoiceNumber || orderId.slice(-6)}</div>
                  <div style={{ color: '#475569', fontSize: 14 }}>{order?.customerName || 'Customer'} · {order?.customerPhone || '-'} · {order?.orderCountry || '-'}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn secondary" style={secondaryButtonStyle()} onClick={() => window.open(`/label/${orderId}`, '_blank', 'noopener,noreferrer')}>Print Label</button>
                  <div style={{ borderRadius: 999, padding: '8px 12px', background: 'rgba(15,23,42,0.06)', color: '#0f172a', fontSize: 12, fontWeight: 800 }}>{String(order?.shipmentStatus || 'pending').replaceAll('_', ' ')}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>Address</div>
                  <div style={{ marginTop: 8, color: '#0f172a', fontWeight: 700 }}>{[order?.customerAddress, order?.customerArea, order?.city].filter(Boolean).join(', ') || '-'}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>Amount</div>
                  <div style={{ marginTop: 8, color: '#0f172a', fontWeight: 900 }}>{formatMoney(order?.total, currency)}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>Assigned Driver</div>
                  <div style={{ marginTop: 8, color: '#0f172a', fontWeight: 700 }}>{order?.deliveryBoy ? `${order.deliveryBoy.firstName || ''} ${order.deliveryBoy.lastName || ''}`.trim() : 'Unassigned'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
                <select className="input" style={inputStyle()} defaultValue={order?.deliveryBoy?._id || ''} onChange={(e) => e.target.value ? assignDriver(orderId, e.target.value) : null} disabled={busyId === orderId}>
                  <option value="">Assign driver</option>
                  {orderDrivers.map((driver) => (
                    <option key={driver._id} value={driver._id}>{`${driver.firstName || ''} ${driver.lastName || ''}`.trim() || driver.phone}</option>
                  ))}
                </select>
                <select className="input" style={inputStyle()} value={order?.shipmentStatus || 'pending'} onChange={(e) => updateStatus(orderId, e.target.value)} disabled={busyId === orderId}>
                  {shipmentOptions.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
                </select>
              </div>
              <textarea className="input" style={textAreaStyle()} value={notes[orderId] || ''} onChange={(e) => setNotes((prev) => ({ ...prev, [orderId]: e.target.value }))} placeholder="Optional internal note for the assignment flow" />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn" style={primaryButtonStyle()} disabled={busyId === orderId}>{busyId === orderId ? 'Updating…' : 'Synced'}</button>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
