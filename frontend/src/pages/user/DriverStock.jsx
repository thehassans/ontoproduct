import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost } from '../../api'
import { useToast } from '../../ui/Toast.jsx'

function getOrderId(order) {
  return String(order?._id || order?.id || '')
}

function getInvoiceLabel(order) {
  const invoice = String(order?.invoiceNumber || '').trim()
  if (invoice) return `#${invoice}`
  const id = getOrderId(order)
  return id ? `#${id.slice(-6)}` : '#—'
}

function getProductLabel(order) {
  if (Array.isArray(order?.items) && order.items.length > 0) {
    const labels = order.items
      .map((item) => {
        const name = item?.productId?.name || ''
        if (!name) return ''
        const qty = Math.max(1, Number(item?.quantity || 1))
        return `${name} × ${qty}`
      })
      .filter(Boolean)
    if (labels.length) return labels.join(', ')
  }
  if (order?.productId?.name) return order.productId.name
  return order?.details || 'Product'
}

function getOrderQuantity(order) {
  if (Array.isArray(order?.items) && order.items.length > 0) {
    return order.items.reduce((sum, item) => sum + Math.max(1, Number(item?.quantity || 1)), 0)
  }
  return Math.max(1, Number(order?.quantity || 1))
}

function formatDate(value) {
  try {
    return value ? new Date(value).toLocaleString() : '—'
  } catch {
    return '—'
  }
}

function formatStatusLabel(value) {
  const text = String(value || '').trim().toLowerCase()
  if (!text) return 'Unknown'
  return text.replace(/_/g, ' ')
}

function getDriverLabel(order) {
  const first = String(order?.deliveryBoy?.firstName || '').trim()
  const last = String(order?.deliveryBoy?.lastName || '').trim()
  const fullName = [first, last].filter(Boolean).join(' ').trim()
  return fullName || 'Driver'
}

function buildSearchText(order) {
  return [
    getDriverLabel(order),
    order?.deliveryBoy?.phone,
    order?.invoiceNumber,
    order?.customerName,
    order?.customerPhone,
    order?.customerAddress,
    order?.customerLocation,
    order?.city,
    order?.orderCountry,
    order?.returnReason,
    getProductLabel(order),
    formatStatusLabel(order?.shipmentStatus),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function SummaryCard({ label, value, accent, helper }) {
  return (
    <div
      className="card"
      style={{
        padding: 14,
        borderRadius: 18,
        border: '1px solid rgba(148, 163, 184, 0.18)',
        background: `linear-gradient(135deg, ${accent}18, rgba(255,255,255,0.02))`,
        boxShadow: '0 14px 30px rgba(15, 23, 42, 0.06)',
      }}
    >
      <div style={{ fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, marginTop: 6, letterSpacing: '-0.03em' }}>{value}</div>
      <div className="helper" style={{ marginTop: 6 }}>{helper}</div>
    </div>
  )
}

function DriverStockOrderCard({ order, submittingId, verifyingId, onSubmit, onVerify }) {
  const orderId = getOrderId(order)
  const isSubmitting = submittingId === orderId
  const isVerifying = verifyingId === orderId
  const isSubmitted = Boolean(order?.returnSubmittedToCompany)
  const status = String(order?.shipmentStatus || '').toLowerCase()
  const statusStyle = status === 'cancelled'
    ? { background: 'rgba(239,68,68,0.12)', color: '#b91c1c', border: '1px solid rgba(239,68,68,0.18)' }
    : { background: 'rgba(245,158,11,0.12)', color: '#b45309', border: '1px solid rgba(245,158,11,0.18)' }

  return (
    <div
      className="card"
      style={{
        padding: 16,
        display: 'grid',
        gap: 12,
        borderRadius: 18,
        border: '1px solid rgba(148, 163, 184, 0.18)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(148,163,184,0.04))',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>{getInvoiceLabel(order)}</div>
            <span className="badge" style={{ ...statusStyle, textTransform: 'capitalize' }}>{formatStatusLabel(status)}</span>
            {isSubmitted ? (
              <span className="badge" style={{ background: 'rgba(59,130,246,0.12)', color: '#1d4ed8', border: '1px solid rgba(59,130,246,0.18)' }}>
                Submitted
              </span>
            ) : (
              <span className="badge" style={{ background: 'rgba(15,23,42,0.08)', color: 'var(--text)', border: '1px solid rgba(148,163,184,0.16)' }}>
                With Driver
              </span>
            )}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.3 }}>{getProductLabel(order)}</div>
          <div className="helper">{order?.customerName || 'Customer'} • {order?.customerPhone || 'No phone'}</div>
          <div className="helper">{order?.customerAddress || order?.customerLocation || 'No address'}</div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 150, display: 'grid', gap: 6 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Units</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>{getOrderQuantity(order)}</div>
          <div className="helper">{order?.orderCountry || '—'}{order?.city ? ` • ${order.city}` : ''}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 4 }}>
        {order?.returnReason ? <div className="helper"><strong>Reason:</strong> {order.returnReason}</div> : null}
        <div className="helper"><strong>Driver:</strong> {getDriverLabel(order)}{order?.deliveryBoy?.phone ? ` • ${order.deliveryBoy.phone}` : ''}</div>
        <div className="helper"><strong>Updated:</strong> {formatDate(order?.updatedAt || order?.createdAt)}</div>
        {isSubmitted ? <div className="helper"><strong>Submitted:</strong> {formatDate(order?.returnSubmittedAt)}</div> : null}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div className="helper">
          {isSubmitted ? 'Ready for company verification.' : 'Owner can submit this stock order on behalf of the driver.'}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!isSubmitted ? (
            <button className="btn" type="button" onClick={() => onSubmit(order)} disabled={isSubmitting} style={{ fontWeight: 700 }}>
              {isSubmitting ? 'Submitting...' : 'Submit to Company'}
            </button>
          ) : (
            <button className="btn success" type="button" onClick={() => onVerify(order)} disabled={isVerifying} style={{ fontWeight: 700 }}>
              {isVerifying ? 'Verifying...' : 'Accept & Verify'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function UserDriverStock() {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [submittingId, setSubmittingId] = useState('')
  const [verifyingId, setVerifyingId] = useState('')
  const [submittingDriverId, setSubmittingDriverId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet('/api/orders/driver-stock')
      setOrders(Array.isArray(res?.orders) ? res.orders : [])
    } catch (err) {
      setOrders([])
      toast.error(err?.message || 'Failed to load driver stock')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const filteredOrders = useMemo(() => {
    const query = String(q || '').trim().toLowerCase()
    if (!query) return orders
    return orders.filter((order) => buildSearchText(order).includes(query))
  }, [orders, q])

  const groups = useMemo(() => {
    const map = new Map()
    for (const order of filteredOrders) {
      const driverId = String(order?.deliveryBoy?._id || 'unassigned')
      if (!map.has(driverId)) {
        map.set(driverId, {
          driverId,
          driverName: getDriverLabel(order),
          phone: order?.deliveryBoy?.phone || '',
          orders: [],
        })
      }
      map.get(driverId).orders.push(order)
    }

    return Array.from(map.values())
      .map((group) => {
        const readyOrders = group.orders.filter((order) => !order?.returnSubmittedToCompany)
        const submittedOrders = group.orders.filter((order) => order?.returnSubmittedToCompany)
        return {
          ...group,
          readyOrders,
          submittedOrders,
          totalUnits: group.orders.reduce((sum, order) => sum + getOrderQuantity(order), 0),
        }
      })
      .sort((a, b) => a.driverName.localeCompare(b.driverName))
  }, [filteredOrders])

  const summary = useMemo(() => {
    const driverIds = new Set(orders.map((order) => String(order?.deliveryBoy?._id || '')).filter(Boolean))
    return {
      totalOrders: orders.length,
      readyOrders: orders.filter((order) => !order?.returnSubmittedToCompany).length,
      submittedOrders: orders.filter((order) => order?.returnSubmittedToCompany).length,
      totalDrivers: driverIds.size,
    }
  }, [orders])

  async function submitOne(order) {
    const orderId = getOrderId(order)
    if (!orderId) return
    setSubmittingId(orderId)
    try {
      await apiPost(`/api/orders/${orderId}/return/submit`, {})
      toast.success(`${getInvoiceLabel(order)} submitted to company`)
      await load()
    } catch (err) {
      toast.error(err?.message || 'Failed to submit order')
    } finally {
      setSubmittingId('')
    }
  }

  async function verifyOne(order) {
    const orderId = getOrderId(order)
    if (!orderId) return
    setVerifyingId(orderId)
    try {
      await apiPost(`/api/orders/${orderId}/return/verify`, {})
      toast.success(`${getInvoiceLabel(order)} verified and returned to company stock`)
      await load()
    } catch (err) {
      toast.error(err?.message || 'Failed to verify order')
    } finally {
      setVerifyingId('')
    }
  }

  async function submitDriverOrders(group) {
    const orderIds = group.readyOrders.map((order) => getOrderId(order)).filter(Boolean)
    if (!orderIds.length) {
      toast.info('This driver has no ready stock orders')
      return
    }

    setSubmittingDriverId(group.driverId)
    try {
      const res = await apiPost('/api/orders/returns/submit-bulk', { orderIds })
      const submittedCount = Number(res?.submittedCount || 0)
      const skippedCount = Number(res?.skippedCount || 0)
      if (skippedCount > 0) {
        toast.success(`${group.driverName}: ${submittedCount} submitted, ${skippedCount} skipped`)
      } else {
        toast.success(`${group.driverName}: ${submittedCount} orders submitted`)
      }
      await load()
    } catch (err) {
      toast.error(err?.message || 'Failed to submit driver stock')
    } finally {
      setSubmittingDriverId('')
    }
  }

  return (
    <div className="section" style={{ display: 'grid', gap: 14 }}>
      <div className="page-header" style={{ alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="page-title gradient heading-blue">Driver Stock</div>
          <div className="page-subtitle">Cancelled and returned stock currently sitting with drivers.</div>
        </div>
        <button className="btn secondary" type="button" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="card" style={{ padding: 16, display: 'grid', gap: 14, borderRadius: 20, border: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
          <SummaryCard label="Stock Orders" value={summary.totalOrders} accent="#2563eb" helper="Across all drivers" />
          <SummaryCard label="Ready to Submit" value={summary.readyOrders} accent="#f59e0b" helper="Not yet sent to company" />
          <SummaryCard label="Awaiting Verification" value={summary.submittedOrders} accent="#0ea5e9" helper="Already submitted" />
          <SummaryCard label="Drivers" value={summary.totalDrivers} accent="#16a34a" helper="Drivers currently holding stock" />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search driver, invoice, customer, product, city or reason"
            style={{ flex: 1, minWidth: 240, padding: '12px 14px', borderRadius: 14 }}
          />
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 16, borderRadius: 20, border: '1px solid var(--border)' }}>
          <div className="helper">Loading driver stock...</div>
        </div>
      ) : groups.length === 0 ? (
        <div className="card" style={{ padding: 16, borderRadius: 20, border: '1px solid var(--border)' }}>
          <div className="helper">No driver stock orders found.</div>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.driverId} className="card" style={{ padding: 16, display: 'grid', gap: 14, borderRadius: 20, border: '1px solid var(--border)' }}>
            <div className="card-header" style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'grid', gap: 4 }}>
                <div className="card-title">{group.driverName}</div>
                <div className="card-subtitle">
                  {group.phone || 'No phone'} • {group.orders.length} orders • {group.totalUnits} units
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="chip">Ready {group.readyOrders.length}</span>
                <span className="chip">Submitted {group.submittedOrders.length}</span>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => submitDriverOrders(group)}
                  disabled={submittingDriverId === group.driverId || group.readyOrders.length === 0}
                  style={{ fontWeight: 700 }}
                >
                  {submittingDriverId === group.driverId ? 'Submitting...' : 'Submit All Ready'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {group.orders.map((order) => (
                <DriverStockOrderCard
                  key={getOrderId(order)}
                  order={order}
                  submittingId={submittingId}
                  verifyingId={verifyingId}
                  onSubmit={submitOne}
                  onVerify={verifyOne}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
