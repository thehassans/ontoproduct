import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPost, mediaUrl } from '../../api'
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

function buildSearchText(order) {
  return [
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

function getProductImage(order) {
  const tryImages = (productId) => {
    if (!productId) return null
    if (Array.isArray(productId.images) && productId.images.length) return productId.images[0]
    if (productId.image) return productId.image
    return null
  }
  if (Array.isArray(order?.items) && order.items.length) {
    for (const item of order.items) {
      const img = tryImages(item?.productId)
      if (img) return img
    }
  }
  return tryImages(order?.productId)
}

function StockOrderCard({ order, submittingId, onSubmit }) {
  const orderId = getOrderId(order)
  const isSubmitting = submittingId === orderId
  const isSubmitted = Boolean(order?.returnSubmittedToCompany)
  const status = String(order?.shipmentStatus || '').toLowerCase()
  const statusStyle = status === 'cancelled'
    ? { background: 'rgba(239,68,68,0.12)', color: '#b91c1c', border: '1px solid rgba(239,68,68,0.18)' }
    : { background: 'rgba(245,158,11,0.12)', color: '#b45309', border: '1px solid rgba(245,158,11,0.18)' }
  const productImage = getProductImage(order)

  return (
    <div
      className="card"
      style={{
        padding: 14,
        display: 'grid',
        gap: 12,
        borderRadius: 22,
        border: '1px solid rgba(148, 163, 184, 0.18)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(148,163,184,0.04))',
        boxShadow: '0 14px 32px rgba(15,23,42,0.08)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr)', gap: 12, alignItems: 'start' }}>
        {productImage ? (
          <img
            src={mediaUrl(productImage)}
            alt="Product"
            style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <div style={{ width: 72, height: 72, borderRadius: 12, background: 'rgba(148,163,184,0.12)', flexShrink: 0, display: 'grid', placeItems: 'center', border: '1px solid var(--border)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
          </div>
        )}
        <div style={{ minWidth: 0, display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 15, whiteSpace: 'nowrap' }}>{getInvoiceLabel(order)}</div>
              <span className="badge" style={{ ...statusStyle, textTransform: 'capitalize' }}>{formatStatusLabel(status)}</span>
              {isSubmitted ? (
                <span className="badge" style={{ background: 'rgba(59,130,246,0.12)', color: '#1d4ed8', border: '1px solid rgba(59,130,246,0.18)' }}>Submitted</span>
              ) : null}
            </div>
            <div style={{ flexShrink: 0, padding: '6px 8px', borderRadius: 12, background: 'rgba(15,23,42,0.04)', border: '1px solid rgba(148,163,184,0.14)', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1 }}>Units</div>
              <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.1, marginTop: 2 }}>{getOrderQuantity(order)}</div>
            </div>
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.32, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflowWrap: 'anywhere' }}>{getProductLabel(order)}</div>
          <div className="helper" style={{ marginBottom: 1, overflowWrap: 'anywhere' }}>{order?.customerName || 'Customer'} • {order?.customerPhone || 'No phone'}</div>
          <div className="helper" style={{ overflowWrap: 'anywhere' }}>{order?.customerAddress || order?.customerLocation || 'No address'}</div>
          <div className="helper" style={{ marginTop: 1, overflowWrap: 'anywhere' }}>{order?.orderCountry || '—'}{order?.city ? ` • ${order.city}` : ''}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 4 }}>
        {order?.returnReason ? <div className="helper" style={{ overflowWrap: 'anywhere' }}><strong>Reason:</strong> {order.returnReason}</div> : null}
        <div className="helper" style={{ overflowWrap: 'anywhere' }}><strong>Updated:</strong> {formatDate(order?.updatedAt || order?.createdAt)}</div>
        {isSubmitted ? <div className="helper" style={{ overflowWrap: 'anywhere' }}><strong>Submitted:</strong> {formatDate(order?.returnSubmittedAt)}</div> : null}
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div className="helper" style={{ overflowWrap: 'anywhere' }}>
          {isSubmitted ? 'Waiting for company verification.' : 'Ready to submit to company.'}
        </div>
        {!isSubmitted ? (
          <button className="btn" type="button" onClick={() => onSubmit(order)} disabled={isSubmitting} style={{ width: '100%', minHeight: 42, fontWeight: 800, borderRadius: 14 }}>
            {isSubmitting ? 'Submitting...' : 'Submit to Company'}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default function DriverMyStock() {
  const nav = useNavigate()
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [submittingId, setSubmittingId] = useState('')
  const [submittingAll, setSubmittingAll] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet('/api/orders/driver/stock')
      setOrders(Array.isArray(res?.orders) ? res.orders : [])
    } catch (err) {
      setOrders([])
      toast.error(err?.message || 'Failed to load stock')
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

  const readyOrders = useMemo(() => filteredOrders.filter((order) => !order?.returnSubmittedToCompany), [filteredOrders])
  const submittedOrders = useMemo(() => filteredOrders.filter((order) => order?.returnSubmittedToCompany), [filteredOrders])

  const summary = useMemo(() => {
    const allReady = orders.filter((order) => !order?.returnSubmittedToCompany)
    const allSubmitted = orders.filter((order) => order?.returnSubmittedToCompany)
    return {
      totalOrders: orders.length,
      readyOrders: allReady.length,
      submittedOrders: allSubmitted.length,
      totalUnits: orders.reduce((sum, order) => sum + getOrderQuantity(order), 0),
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

  async function submitAll() {
    const orderIds = orders
      .filter((order) => !order?.returnSubmittedToCompany)
      .map((order) => getOrderId(order))
      .filter(Boolean)

    if (!orderIds.length) {
      toast.info('All stock orders are already submitted')
      return
    }

    setSubmittingAll(true)
    try {
      const res = await apiPost('/api/orders/returns/submit-bulk', { orderIds })
      const submittedCount = Number(res?.submittedCount || 0)
      const skippedCount = Number(res?.skippedCount || 0)
      if (skippedCount > 0) {
        toast.success(`${submittedCount} submitted and ${skippedCount} skipped`)
      } else {
        toast.success(`${submittedCount} orders submitted to company`)
      }
      await load()
    } catch (err) {
      toast.error(err?.message || 'Failed to submit all stock')
    } finally {
      setSubmittingAll(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minHeight: '100%' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 16px 10px',
        background: 'var(--panel)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
        <button
          type="button"
          onClick={() => nav('/driver/panel')}
          style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            border: '1px solid var(--border)', background: 'var(--panel)',
            display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>My Stock</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>Cancelled &amp; returned orders with you</div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            border: '1px solid var(--border)', background: 'var(--panel)',
            display: 'grid', placeItems: 'center', cursor: 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0115-6.7L21 8"/>
            <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 01-15 6.7L3 16"/>
          </svg>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 12px 24px' }}>

        {/* ── Stats Grid ──────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Stock Orders', value: summary.totalOrders, accent: '#2563eb', bg: 'rgba(37,99,235,0.08)', helper: 'Driver-held' },
            { label: 'Ready to Submit', value: summary.readyOrders, accent: '#f59e0b', bg: 'rgba(245,158,11,0.08)', helper: 'Awaiting send' },
            { label: 'Submitted', value: summary.submittedOrders, accent: '#0ea5e9', bg: 'rgba(14,165,233,0.08)', helper: 'Pending verify' },
            { label: 'Total Units', value: summary.totalUnits, accent: '#16a34a', bg: 'rgba(22,163,74,0.08)', helper: 'Item quantity' },
          ].map((s) => (
            <div key={s.label} style={{
              padding: '14px 12px',
              borderRadius: 16,
              background: s.bg,
              border: `1px solid ${s.accent}28`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: s.accent, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.04em', color: s.accent, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{s.helper}</div>
            </div>
          ))}
        </div>

        {/* ── Search + Submit All ──────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
            <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search invoice, customer, product…"
              style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 10, paddingBottom: 10, borderRadius: 14, boxSizing: 'border-box', fontSize: 13 }}
            />
          </div>
          <button
            type="button"
            onClick={submitAll}
            disabled={submittingAll || summary.readyOrders === 0}
            style={{
              flexShrink: 0,
              height: 42,
              padding: '0 16px',
              borderRadius: 14,
              border: 'none',
              background: summary.readyOrders === 0 ? 'var(--border)' : 'linear-gradient(135deg, #0f172a, #1e3a5f)',
              color: 'white',
              fontWeight: 800,
              fontSize: 12,
              cursor: submittingAll || summary.readyOrders === 0 ? 'not-allowed' : 'pointer',
              opacity: submittingAll ? 0.6 : 1,
              whiteSpace: 'nowrap',
              boxShadow: summary.readyOrders > 0 ? '0 8px 20px rgba(15,23,42,0.2)' : 'none',
            }}
          >
            {submittingAll ? 'Sending…' : 'Submit All'}
          </button>
        </div>

        {/* ── Ready to Submit ──────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>Ready to Submit</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Still with you, not yet sent to company</div>
            </div>
            <span style={{
              minWidth: 28, height: 28, borderRadius: 10,
              background: 'rgba(245,158,11,0.12)', color: '#b45309',
              fontSize: 13, fontWeight: 800,
              display: 'grid', placeItems: 'center', padding: '0 8px',
            }}>{readyOrders.length}</span>
          </div>

        {loading ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Loading stock…</div>
        ) : readyOrders.length === 0 ? (
          <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, background: 'var(--panel)', borderRadius: 16, border: '1px solid var(--border)' }}>No stock orders ready to submit.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {readyOrders.map((order) => (
              <StockOrderCard key={getOrderId(order)} order={order} submittingId={submittingId} onSubmit={submitOne} />
            ))}
          </div>
        )}
        </div>

        {/* ── Submitted to Company ─────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>Submitted to Company</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Waiting for company verification</div>
            </div>
            <span style={{
              minWidth: 28, height: 28, borderRadius: 10,
              background: 'rgba(14,165,233,0.12)', color: '#0369a1',
              fontSize: 13, fontWeight: 800,
              display: 'grid', placeItems: 'center', padding: '0 8px',
            }}>{submittedOrders.length}</span>
          </div>

        {loading ? (
          <div className="helper">Loading submitted stock...</div>
        ) : submittedOrders.length === 0 ? (
          <div className="helper">No submitted stock orders.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {submittedOrders.map((order) => (
              <StockOrderCard key={getOrderId(order)} order={order} submittingId={submittingId} onSubmit={submitOne} />
            ))}
          </div>
        )}
        </div>

      </div>
    </div>
  )
}
