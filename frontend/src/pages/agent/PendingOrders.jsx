import React, { useEffect, useMemo, useState } from 'react'
import { apiGet } from '../../api.js'

function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase()
  let color = { borderColor: '#e5e7eb', color: '#374151' }
  if (['assigned', 'picked_up', 'in_transit', 'out_for_delivery'].includes(s)) color = { borderColor: '#3b82f6', color: '#1d4ed8' }
  else if (['returned', 'cancelled', 'no_response'].includes(s)) color = { borderColor: '#ef4444', color: '#991b1b' }
  else if (s === 'pending') color = { borderColor: '#f59e0b', color: '#b45309' }
  return <span className="chip" style={{ background: 'transparent', ...color }}>{status || '-'}</span>
}

function formatPhone(phoneCountryCode, customerPhone) {
  const cc = String(phoneCountryCode || '').trim()
  const rawPhone = String(customerPhone || '').trim()
  if (!cc) return rawPhone
  if (!rawPhone) return cc
  const ccDigits = cc.replace(/\D/g, '')
  const phoneDigits = rawPhone.replace(/\D/g, '')
  if (ccDigits && phoneDigits && (phoneDigits === ccDigits || phoneDigits.startsWith(ccDigits))) {
    return rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`
  }
  return `${cc} ${rawPhone}`.trim()
}

function formatAddress(order) {
  const parts = [order?.customerAddress, order?.customerArea, order?.city, order?.orderCountry]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
  const seen = []
  for (const part of parts) {
    const normalizedPart = part.toLowerCase()
    if (seen.some((existing) => existing === normalizedPart || existing.includes(normalizedPart) || normalizedPart.includes(existing))) continue
    seen.push(normalizedPart)
  }
  return parts.filter((part) => {
    const normalizedPart = part.toLowerCase()
    const firstIndex = seen.findIndex((existing) => existing === normalizedPart || existing.includes(normalizedPart) || normalizedPart.includes(existing))
    if (firstIndex === -1) return false
    seen[firstIndex] = `__used__${firstIndex}`
    return true
  }).join(', ')
}

export default function PendingOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  async function loadOrders() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('ship', 'open')
      params.set('activeHistory', 'true')
      params.set('limit', '500')
      const res = await apiGet(`/api/orders?${params.toString()}`)
      setOrders(Array.isArray(res?.orders) ? res.orders : [])
      setError('')
    } catch (e) {
      setError(e?.message || 'Failed to load pending orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadOrders() }, [])
  useEffect(() => {
    const id = setInterval(() => { loadOrders() }, 20000)
    return () => clearInterval(id)
  }, [])

  const filteredOrders = useMemo(() => {
    const term = String(query || '').trim().toLowerCase()
    if (!term) return orders
    return orders.filter((order) => {
      const invoice = String(order?.invoiceNumber || order?._id || '').toLowerCase()
      const customer = String(order?.customerName || '').toLowerCase()
      const phone = String(order?.customerPhone || '').toLowerCase()
      const city = String(order?.city || '').toLowerCase()
      const product = String(order?.productName || '').toLowerCase()
      return invoice.includes(term) || customer.includes(term) || phone.includes(term) || city.includes(term) || product.includes(term)
    })
  }, [orders, query])

  return (
    <div className="section" style={{ display: 'grid', gap: 12 }}>
      <div className="page-header" style={{ display: 'grid', gap: 6 }}>
        <div className="page-title gradient heading-purple">Pending</div>
        <div className="page-subtitle">All open orders stay here until they move into delivered or another final status.</div>
      </div>

      <div className="card" style={{ display: 'grid', gap: 10 }}>
        <div className="card-header">
          <div className="card-title">Search</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="input" placeholder="Search invoice, customer, phone, city, or product" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="btn secondary" onClick={loadOrders} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
        </div>
      </div>

      {loading ? (
        <div className="card"><div className="section">Loading…</div></div>
      ) : error ? (
        <div className="card"><div className="section error">{error}</div></div>
      ) : filteredOrders.length === 0 ? (
        <div className="card"><div className="section">No pending orders found</div></div>
      ) : (
        filteredOrders.map((order) => {
          const id = String(order?._id || order?.id)
          const fullAddress = formatAddress(order)
          const phoneDisplay = formatPhone(order?.phoneCountryCode, order?.customerPhone)
          return (
            <div key={id} className="card" style={{ display: 'grid', gap: 12 }}>
              <div className="card-header" style={{ alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div className="badge">{order?.orderCountry || '-'}</div>
                  <div className="chip" style={{ background: 'transparent' }}>{order?.city || '-'}</div>
                  <StatusBadge status={order?.shipmentStatus || 'pending'} />
                </div>
                <div style={{ fontWeight: 800 }}>{order?.invoiceNumber ? `#${order.invoiceNumber}` : id.slice(-6).toUpperCase()}</div>
              </div>

              <div className="section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                  <div className="label">Customer</div>
                  <div style={{ fontWeight: 700 }}>{order?.customerName || '-'}</div>
                  <div className="helper">{phoneDisplay || '-'}</div>
                  <div className="helper">{fullAddress || '-'}</div>
                </div>
                <div>
                  <div className="label">Product</div>
                  <div style={{ fontWeight: 700 }}>{order?.productName || '-'}</div>
                  <div className="helper">Qty: {Math.max(1, Number(order?.productQuantity || order?.quantity || 1))}</div>
                  <div className="helper">Total: {Number(order?.total || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="label">Driver</div>
                  <div style={{ fontWeight: 700 }}>{order?.deliveryBoy ? `${order.deliveryBoy.firstName || ''} ${order.deliveryBoy.lastName || ''}`.trim() : 'Unassigned'}</div>
                  <div className="helper">Created: {order?.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}</div>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
