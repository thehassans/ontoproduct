import React, { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPatch } from '../../api.js'
import { useToast } from '../../ui/Toast.jsx'

function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase()
  let color = { borderColor: '#e5e7eb', color: '#374151' }
  if (s === 'delivered') color = { borderColor: '#10b981', color: '#065f46' }
  return (
    <span className="chip" style={{ background: 'transparent', ...color }}>
      {status || '-'}
    </span>
  )
}

export default function DeliveredOrders() {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState({})
  const [editingCommission, setEditingCommission] = useState({})

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        params.set('ship', 'delivered')
        params.set('limit', '500')
        const res = await apiGet(`/api/orders?${params.toString()}`)
        if (!alive) return
        setOrders(Array.isArray(res?.orders) ? res.orders : [])
        setError('')
      } catch (e) {
        if (!alive) return
        setError(e?.message || 'Failed to load delivered orders')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const filteredOrders = useMemo(() => {
    const term = String(query || '').trim().toLowerCase()
    if (!term) return orders
    return orders.filter((order) => {
      const invoice = String(order?.invoiceNumber || order?._id || '').toLowerCase()
      const customer = String(order?.customerName || '').toLowerCase()
      const phone = String(order?.customerPhone || '').toLowerCase()
      const city = String(order?.city || '').toLowerCase()
      const product = Array.isArray(order?.items) && order.items.length
        ? order.items.map((item) => String(item?.productId?.name || '')).join(' ').toLowerCase()
        : String(order?.productId?.name || '').toLowerCase()
      return invoice.includes(term) || customer.includes(term) || phone.includes(term) || city.includes(term) || product.includes(term)
    })
  }, [orders, query])

  const totals = useMemo(() => {
    return filteredOrders.reduce(
      (sum, order) => {
        sum.count += 1
        sum.total += Number(order?.total || 0) || 0
        sum.commission += Number(order?.agentCommissionPKR || 0) || 0
        if (order?.agentCommissionSetByAgent) sum.locked += 1
        return sum
      },
      { count: 0, total: 0, commission: 0, locked: 0 }
    )
  }, [filteredOrders])

  async function saveCommission(orderId) {
    const amount = Math.max(0, Number(editingCommission[orderId] ?? 0) || 0)
    const key = `save-${orderId}`
    setSaving((prev) => ({ ...prev, [key]: true }))
    try {
      const res = await apiPatch(`/api/orders/${orderId}/agent-commission`, {
        agentCommissionPKR: amount,
      })
      const updated = res?.order
      if (updated) {
        setOrders((prev) => prev.map((order) => (String(order._id) === String(orderId) ? updated : order)))
      }
      setEditingCommission((prev) => {
        const next = { ...prev }
        delete next[orderId]
        return next
      })
      toast.success('Agent commission saved')
    } catch (e) {
      toast.error(e?.message || 'Failed to save agent commission')
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }))
    }
  }

  return (
    <div className="section" style={{ display: 'grid', gap: 12 }}>
      <div className="page-header" style={{ display: 'grid', gap: 6 }}>
        <div className="page-title gradient heading-purple">Delivered</div>
        <div className="page-subtitle">Set your PKR commission once for each delivered order.</div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        <div className="card" style={{ padding: 14, display: 'grid', gap: 4 }}>
          <div className="helper">Delivered Orders</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{totals.count}</div>
        </div>
        <div className="card" style={{ padding: 14, display: 'grid', gap: 4 }}>
          <div className="helper">Order Value</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{totals.total.toFixed(2)}</div>
        </div>
        <div className="card" style={{ padding: 14, display: 'grid', gap: 4 }}>
          <div className="helper">Commission Set</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>PKR {totals.commission.toFixed(2)}</div>
        </div>
        <div className="card" style={{ padding: 14, display: 'grid', gap: 4 }}>
          <div className="helper">Locked Orders</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed' }}>{totals.locked}</div>
        </div>
      </div>

      <div className="card" style={{ display: 'grid', gap: 10 }}>
        <div className="card-header">
          <div className="card-title">Search</div>
        </div>
        <input
          className="input"
          placeholder="Search invoice, customer, phone, city, or product"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="card"><div className="section">Loading…</div></div>
      ) : error ? (
        <div className="card"><div className="section error">{error}</div></div>
      ) : filteredOrders.length === 0 ? (
        <div className="card"><div className="section">No delivered orders found</div></div>
      ) : (
        filteredOrders.map((order) => {
          const id = String(order?._id || order?.id)
          const currentValue = editingCommission[id] !== undefined ? editingCommission[id] : order?.agentCommissionPKR || 0
          const locked = !!order?.agentCommissionSetByAgent
          const saveKey = `save-${id}`
          const canSave = !locked && Number(currentValue) !== Number(order?.agentCommissionPKR || 0)
          const productName = Array.isArray(order?.items) && order.items.length
            ? order.items.map((item) => item?.productId?.name).filter(Boolean).join(', ')
            : order?.productId?.name || '-'
          const fullAddress = [order?.customerAddress, order?.customerArea, order?.city, order?.orderCountry]
            .filter(Boolean)
            .join(', ')

          return (
            <div key={id} className="card" style={{ display: 'grid', gap: 12 }}>
              <div className="card-header" style={{ alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div className="badge">{order?.orderCountry || '-'}</div>
                  <div className="chip" style={{ background: 'transparent' }}>{order?.city || '-'}</div>
                  <StatusBadge status={order?.shipmentStatus} />
                </div>
                <div style={{ fontWeight: 800 }}>
                  {order?.invoiceNumber ? `#${order.invoiceNumber}` : id.slice(-6).toUpperCase()}
                </div>
              </div>

              <div className="section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                  <div className="label">Customer</div>
                  <div style={{ fontWeight: 700 }}>{order?.customerName || '-'}</div>
                  <div className="helper">{`${order?.phoneCountryCode || ''} ${order?.customerPhone || ''}`.trim()}</div>
                  <div className="helper">{fullAddress || '-'}</div>
                </div>
                <div>
                  <div className="label">Product</div>
                  <div style={{ fontWeight: 700 }}>{productName}</div>
                  <div className="helper">Delivered: {order?.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : '-'}</div>
                  <div className="helper">Total: {Number(order?.total || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="label">Commission Status</div>
                  <div style={{ fontWeight: 700, color: locked ? '#065f46' : '#b45309' }}>
                    {locked ? 'Locked after your submission' : 'Editable by you'}
                  </div>
                  <div className="helper">
                    Owner can still update the order commission from the orders page.
                  </div>
                </div>
              </div>

              <div className="section" style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap', borderTop: '1px solid var(--border)' }}>
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>Agent Commission (PKR)</div>
                  <input
                    type="number"
                    className="input"
                    value={currentValue}
                    onChange={(e) => setEditingCommission((prev) => ({ ...prev, [id]: e.target.value }))}
                    min="0"
                    step="1"
                    disabled={locked || saving[saveKey]}
                    style={{ width: 220, fontSize: 16, fontWeight: 700 }}
                  />
                </div>
                <button
                  className="btn success"
                  onClick={() => saveCommission(id)}
                  disabled={!canSave || saving[saveKey]}
                >
                  {saving[saveKey] ? 'Saving...' : locked ? 'Locked' : 'Save Commission'}
                </button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
