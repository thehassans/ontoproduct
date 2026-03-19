import React, { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { API_BASE, apiGet } from '../../api.js'
import { PageShell, Panel, StatusBadge, EmptyState, LoadingState, TextInput, SelectInput, SecondaryButton, formatDate, formatMoney } from '../../components/shop/ShopUI.jsx'

function toneFor(value) {
  const v = String(value || '').toLowerCase()
  if (['delivered'].includes(v)) return 'emerald'
  if (['cancelled', 'returned', 'failed'].includes(v)) return 'rose'
  if (['picked_up', 'out_for_delivery', 'to_dropoff', 'in_transit'].includes(v)) return 'sky'
  if (['assigned_to_shop', 'driver_assigned', 'to_pickup', 'at_pickup', 'pending', 'assigned'].includes(v)) return 'orange'
  return 'neutral'
}

function compactDriverLocation(location) {
  if (!location || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) return '-'
  return `${Number(location.lat).toFixed(5)}, ${Number(location.lng).toFixed(5)}`
}

export default function ShopVendorOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState(null)
  const [liveTracking, setLiveTracking] = useState({})

  async function load() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      if (status) params.set('status', status)
      const result = await apiGet(`/api/shops/me/orders${params.toString() ? `?${params.toString()}` : ''}`, { skipCache: true })
      setOrders(Array.isArray(result?.orders) ? result.orders : [])
    } catch (err) {
      setError(err?.message || 'Failed to load shop orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [status])

  useEffect(() => {
    const h = setTimeout(() => {
      load()
    }, query ? 250 : 0)
    return () => clearTimeout(h)
  }, [query])

  useEffect(() => {
    let socket
    try {
      const token = localStorage.getItem('token') || ''
      socket = io(API_BASE || undefined, {
        path: '/socket.io',
        transports: ['polling'],
        upgrade: false,
        withCredentials: true,
        auth: { token },
      })
      socket.on('shop.orders.changed', async (evt) => {
        const orderId = String(evt?.orderId || '')
        if (!orderId) {
          load()
          return
        }
        try {
          const result = await apiGet('/api/shops/me/orders', { skipCache: true })
          const next = Array.isArray(result?.orders) ? result.orders : []
          setOrders(next)
          setSelected((prev) => next.find((item) => String(item._id) === String(prev?._id || '')) || prev)
        } catch {
          load()
        }
      })
      socket.on('shop.driver.location', (evt) => {
        const orderId = String(evt?.orderId || '')
        if (!orderId) return
        setLiveTracking((prev) => ({ ...prev, [orderId]: evt }))
      })
    } catch {}
    return () => {
      try { socket?.disconnect() } catch {}
    }
  }, [])

  const statusOptions = useMemo(() => {
    const values = new Set([''])
    for (const item of orders) {
      if (item?.shipmentStatus) values.add(String(item.shipmentStatus))
    }
    return Array.from(values)
  }, [orders])

  if (loading) return <LoadingState label="Loading shop orders" />

  return (
    <PageShell
      eyebrow="Shop operations"
      title="Orders"
      subtitle="Track shop-assigned orders, pickup progress, driver movement, and expected payout in real time."
      actions={<SecondaryButton onClick={load}>Refresh</SecondaryButton>}
    >
      <Panel
        title="Order flow"
        subtitle="Search by invoice, customer name, phone, address, or city"
        tone="orange"
        action={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 220 }}><TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search shop orders" /></div>
            <div style={{ minWidth: 180 }}>
              <SelectInput value={status} onChange={(e) => setStatus(e.target.value)}>
                {statusOptions.map((item) => (
                  <option key={item || 'all'} value={item}>{item || 'All statuses'}</option>
                ))}
              </SelectInput>
            </div>
          </div>
        }
      >
        {error ? <EmptyState title="Orders unavailable" description={error} action={<SecondaryButton onClick={load}>Retry</SecondaryButton>} /> : null}
        {!error && !orders.length ? <EmptyState title="No shop orders yet" description="Assigned orders will appear here as soon as the owner routes them to your shop." /> : null}
        {!error && orders.length ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {orders.map((order) => {
              const live = liveTracking[String(order._id)]
              return (
                <button
                  key={order._id}
                  type="button"
                  onClick={() => setSelected(order)}
                  style={{
                    textAlign: 'left',
                    borderRadius: 22,
                    border: '1px solid rgba(226,232,240,0.95)',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.99), rgba(248,250,252,0.98))',
                    padding: 16,
                    display: 'grid',
                    gap: 14,
                    cursor: 'pointer',
                    boxShadow: '0 14px 30px rgba(15, 23, 42, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.03em', color: '#0f172a' }}>#{order.invoiceNumber || String(order._id).slice(-6)}</div>
                      <div style={{ color: '#64748b', fontSize: 13 }}>{order.customerName || '-'} • {order.customerPhone || '-'}</div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>{formatDate(order.updatedAt || order.createdAt)}</div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
                      <StatusBadge tone={toneFor(order.logisticsPhase)}>{order.logisticsPhase || 'awaiting update'}</StatusBadge>
                      <StatusBadge tone={toneFor(order.shipmentStatus)}>{order.shipmentStatus || 'pending'}</StatusBadge>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Delivery</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{order.orderCountry || '-'} • {order.city || '-'}</div>
                      <div style={{ fontSize: 13, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.customerAddress || '-'}</div>
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Driver</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{order.deliveryBoy ? `${order.deliveryBoy.firstName || ''} ${order.deliveryBoy.lastName || ''}`.trim() || order.deliveryBoy.email || 'Assigned' : 'Not assigned'}</div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>{live?.location ? `Live: ${compactDriverLocation(live.location)}` : order.deliveryBoy?.phone || 'Awaiting driver'}</div>
                    </div>
                    <div style={{ display: 'grid', gap: 4, justifyItems: 'end' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Shop payout</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{formatMoney(order.payoutAmount || 0, 'AED')}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{Array.isArray(order.lineItems) ? `${order.lineItems.length} payout lines` : 'Single line payout'}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : null}
      </Panel>

      {selected ? (
        <Panel title={`Order #${selected.invoiceNumber || String(selected._id).slice(-6)}`} subtitle="Detailed shop view" tone="sky" action={<SecondaryButton onClick={() => setSelected(null)}>Close</SecondaryButton>}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(280px, 0.85fr)', gap: 18 }}>
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ borderRadius: 18, border: '1px solid rgba(226,232,240,0.95)', padding: 16, background: 'rgba(248,250,252,0.72)' }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 10 }}>Customer</div>
                <div style={{ display: 'grid', gap: 8, color: '#0f172a' }}>
                  <div><strong>{selected.customerName || '-'}</strong> • {selected.customerPhone || '-'}</div>
                  <div>{selected.orderCountry || '-'} • {selected.city || '-'} • {selected.customerArea || '-'}</div>
                  <div style={{ color: '#64748b' }}>{selected.customerAddress || '-'}</div>
                </div>
              </div>
              <div style={{ borderRadius: 18, border: '1px solid rgba(226,232,240,0.95)', padding: 16, background: 'rgba(248,250,252,0.72)' }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 10 }}>Payout lines</div>
                {Array.isArray(selected.lineItems) && selected.lineItems.length ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {selected.lineItems.map((line, idx) => (
                      <div key={`${line.productId || idx}-${idx}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'center', borderRadius: 16, padding: '12px 14px', background: '#fff', border: '1px solid rgba(226,232,240,0.95)' }}>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{line.productName || 'Product'}</div>
                          <div style={{ fontSize: 13, color: '#64748b' }}>Qty {line.quantity || 1} • Unit {formatMoney(line.unitPrice || 0, 'AED')}</div>
                        </div>
                        <div style={{ fontWeight: 900, color: '#0f172a' }}>{formatMoney(line.lineTotal || 0, 'AED')}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#64748b' }}>No payout line breakdown available.</div>
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ borderRadius: 18, border: '1px solid rgba(226,232,240,0.95)', padding: 16, background: 'rgba(248,250,252,0.72)', display: 'grid', gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Operational status</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <StatusBadge tone={toneFor(selected.logisticsPhase)}>{selected.logisticsPhase || 'pending'}</StatusBadge>
                  <StatusBadge tone={toneFor(selected.shipmentStatus)}>{selected.shipmentStatus || 'pending'}</StatusBadge>
                </div>
                <div style={{ color: '#64748b', fontSize: 13 }}>Created {formatDate(selected.createdAt)}</div>
                <div style={{ color: '#64748b', fontSize: 13 }}>Delivered {formatDate(selected.deliveredAt)}</div>
              </div>
              <div style={{ borderRadius: 18, border: '1px solid rgba(226,232,240,0.95)', padding: 16, background: 'rgba(248,250,252,0.72)', display: 'grid', gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Driver live tracking</div>
                {liveTracking[String(selected._id)]?.location ? (
                  <>
                    <div style={{ color: '#0f172a', fontWeight: 800 }}>{compactDriverLocation(liveTracking[String(selected._id)]?.location)}</div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>Route stage: {liveTracking[String(selected._id)]?.routeStage || 'idle'} • Destination: {liveTracking[String(selected._id)]?.destinationKind || 'none'}</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <SecondaryButton onClick={() => window.open(`https://www.google.com/maps?q=${liveTracking[String(selected._id)].location.lat},${liveTracking[String(selected._id)].location.lng}`, '_blank', 'noopener,noreferrer')}>Open live map</SecondaryButton>
                      {liveTracking[String(selected._id)]?.polyline ? <StatusBadge tone="sky">Polyline ready</StatusBadge> : null}
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#64748b' }}>Driver live pings will appear here when the assigned driver is en route.</div>
                )}
              </div>
            </div>
          </div>
        </Panel>
      ) : null}
    </PageShell>
  )
}
