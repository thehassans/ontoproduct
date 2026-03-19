import React, { useEffect, useMemo, useState } from 'react'
import { API_BASE, apiGet } from '../../api.js'
import { PageShell, MetricGrid, MetricCard, Panel, StatusBadge, EmptyState, LoadingState, formatMoney, formatDate, SecondaryButton } from '../../components/shop/ShopUI.jsx'

const icons = {
  orders: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
  cash: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M16 8h-5a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H8" /><path d="M12 6v12" /></svg>,
  delivered: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>,
  pickup: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h18" /><path d="M7 7V5a5 5 0 0 1 10 0v2" /><rect x="4" y="7" width="16" height="13" rx="2" /></svg>,
  location: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
}

function phaseTone(phase) {
  const p = String(phase || '').toLowerCase()
  if (['delivered'].includes(p)) return 'emerald'
  if (['cancelled', 'returned'].includes(p)) return 'rose'
  if (['picked_up', 'to_dropoff'].includes(p)) return 'sky'
  if (['assigned_to_shop', 'driver_assigned', 'to_pickup', 'at_pickup'].includes(p)) return 'orange'
  return 'neutral'
}

export default function ShopVendorDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const result = await apiGet('/api/shops/me/dashboard', { skipCache: true })
      setData(result || null)
    } catch (err) {
      setError(err?.message || 'Failed to load shop dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const shop = data?.shop || {}
  const stats = data?.stats || {}
  const recentOrders = Array.isArray(data?.recentOrders) ? data.recentOrders : []
  const pickupCoords = Array.isArray(shop?.pickupLocation?.coordinates) ? shop.pickupLocation.coordinates : []
  const mapLink = useMemo(() => {
    if (pickupCoords.length === 2) return `https://www.google.com/maps?q=${pickupCoords[1]},${pickupCoords[0]}`
    return ''
  }, [pickupCoords])

  if (loading) return <LoadingState label="Loading shop dashboard" />

  if (error) {
    return (
      <PageShell eyebrow="Shop workspace" title="Dashboard unavailable" subtitle={error} actions={<SecondaryButton onClick={load}>Retry</SecondaryButton>}>
        <EmptyState title="We could not load your shop workspace" description={error} action={<SecondaryButton onClick={load}>Try again</SecondaryButton>} />
      </PageShell>
    )
  }

  return (
    <PageShell
      eyebrow="Shop workspace"
      title={shop?.name || 'Shop dashboard'}
      subtitle={shop?.ownerName ? `Owner: ${shop.ownerName} • Phone: ${shop.phone || '-'}` : 'Monitor order readiness, assigned catalog, and expected payout in one place.'}
      actions={mapLink ? <SecondaryButton onClick={() => window.open(mapLink, '_blank', 'noopener,noreferrer')}>Open pickup map</SecondaryButton> : null}
    >
      <MetricGrid>
        <MetricCard tone="orange" icon={icons.orders} label="Total orders" value={Number(stats.totalOrders || 0).toLocaleString()} hint="Orders currently assigned to your shop" />
        <MetricCard tone="emerald" icon={icons.cash} label="Delivered revenue" value={formatMoney(stats.deliveredRevenue || 0, 'AED')} hint="Completed payout value" />
        <MetricCard tone="sky" icon={icons.delivered} label="Delivered orders" value={Number(stats.deliveredOrders || 0).toLocaleString()} hint="Successfully closed deliveries" />
        <MetricCard tone="violet" icon={icons.pickup} label="Ready for pickup" value={Number(stats.readyForPickup || 0).toLocaleString()} hint="Orders currently in pickup flow" />
      </MetricGrid>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(320px, 0.95fr)', gap: 18 }}>
        <Panel title="Recent assigned orders" subtitle="Live operational visibility across pickup and delivery phases" tone="orange">
          {recentOrders.length ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {recentOrders.map((order) => (
                <div
                  key={order._id}
                  style={{
                    borderRadius: 20,
                    border: '1px solid rgba(226,232,240,0.95)',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))',
                    padding: 16,
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>#{order.invoiceNumber || String(order._id).slice(-6)}</div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>{formatDate(order.createdAt)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <StatusBadge tone={phaseTone(order.logisticsPhase)}>{order.logisticsPhase || 'pending'}</StatusBadge>
                      <StatusBadge tone={phaseTone(order.shipmentStatus)}>{order.shipmentStatus || 'pending'}</StatusBadge>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, color: '#64748b' }}>Expected payout</div>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{formatMoney(order.payoutAmount || 0, 'AED')}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No assigned orders yet" description="As soon as orders are assigned to this shop, they will appear here with realtime status visibility." />
          )}
        </Panel>

        <div style={{ display: 'grid', gap: 18 }}>
          <Panel title="Shop profile" subtitle="Pickup-ready details for operations and drivers" tone="sky">
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8' }}>Primary contact</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{shop?.ownerName || '-'}</div>
                <div style={{ color: '#64748b', fontSize: 14 }}>{shop?.phone || '-'}</div>
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8' }}>Pickup address</div>
                <div style={{ color: '#0f172a', fontWeight: 700 }}>{shop?.pickupLocation?.address || shop?.address || '-'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748b', fontSize: 13 }}>
                <span style={{ width: 36, height: 36, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'rgba(14,165,233,0.1)', color: '#0369a1' }}>{icons.location}</span>
                <span>{pickupCoords.length === 2 ? `${pickupCoords[1].toFixed(5)}, ${pickupCoords[0].toFixed(5)}` : 'Coordinates unavailable'}</span>
              </div>
            </div>
          </Panel>

          <Panel title="Revenue mix" subtitle="Fast snapshot of shop performance" tone="emerald">
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: 14 }}>Total projected payout</span>
                <strong style={{ color: '#0f172a', fontSize: 18 }}>{formatMoney(stats.totalRevenue || 0, 'AED')}</strong>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: 'rgba(226,232,240,0.8)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, stats.totalRevenue ? ((Number(stats.deliveredRevenue || 0) / Math.max(1, Number(stats.totalRevenue || 0))) * 100) : 0)}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #10b981, #34d399)',
                    borderRadius: 999,
                  }}
                />
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b' }}><span>Delivered value</span><span>{formatMoney(stats.deliveredRevenue || 0, 'AED')}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b' }}><span>Active pipeline</span><span>{Number(stats.activeOrders || 0).toLocaleString()} orders</span></div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </PageShell>
  )
}
