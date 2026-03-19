import React, { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { API_BASE, apiGet, apiPost } from '../../api.js'
import { PageShell, Panel, EmptyState, LoadingState, TextInput, TextArea, Label, PrimaryButton, SecondaryButton, SelectInput, StatusBadge, formatDate } from '../../components/shop/ShopUI.jsx'
import { useToast } from '../../ui/Toast.jsx'

function toneFor(value) {
  const v = String(value || '').toLowerCase()
  if (['delivered'].includes(v)) return 'emerald'
  if (['cancelled', 'returned'].includes(v)) return 'rose'
  if (['picked_up', 'to_dropoff', 'out_for_delivery', 'in_transit'].includes(v)) return 'sky'
  if (['assigned_to_shop', 'driver_assigned', 'to_pickup', 'at_pickup', 'pending', 'assigned'].includes(v)) return 'orange'
  return 'neutral'
}

export default function ShopLogistics() {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [shipFilter, setShipFilter] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [candidateShops, setCandidateShops] = useState({})
  const [candidateLoading, setCandidateLoading] = useState({})
  const [assigning, setAssigning] = useState({})
  const [barcodeValue, setBarcodeValue] = useState({})
  const [verifying, setVerifying] = useState({})
  const [liveTracking, setLiveTracking] = useState({})
  const [dropoffPayload, setDropoffPayload] = useState({ customerAddress: '', googleMapsUrl: '', locationLat: '', locationLng: '' })
  const [dropoffResult, setDropoffResult] = useState(null)
  const [resolvingDropoff, setResolvingDropoff] = useState(false)

  async function loadOrders() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('limit', '40')
      params.set('includeWeb', 'true')
      if (query.trim()) params.set('q', query.trim())
      if (shipFilter) params.set('ship', shipFilter)
      const result = await apiGet(`/api/orders?${params.toString()}`, { skipCache: true })
      const list = Array.isArray(result?.orders) ? result.orders : []
      setOrders(list)
      if (!selectedOrderId && list[0]?._id) setSelectedOrderId(String(list[0]._id))
      if (selectedOrderId && !list.some((order) => String(order._id) === String(selectedOrderId))) {
        setSelectedOrderId(list[0]?._id ? String(list[0]._id) : '')
      }
    } catch (err) {
      setError(err?.message || 'Failed to load logistics orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      loadOrders()
    }, query ? 250 : 0)
    return () => clearTimeout(handle)
  }, [query, shipFilter])

  useEffect(() => {
    loadOrders()
  }, [])

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
      socket.on('orders.changed', () => {
        loadOrders()
      })
      socket.on('driver.location.updated', (evt) => {
        const orderId = String(evt?.orderId || '')
        if (!orderId) return
        setLiveTracking((prev) => ({ ...prev, [orderId]: evt }))
      })
    } catch {}
    return () => {
      try { socket?.disconnect() } catch {}
    }
  }, [])

  const selectedOrder = useMemo(
    () => orders.find((order) => String(order._id) === String(selectedOrderId)) || null,
    [orders, selectedOrderId]
  )

  useEffect(() => {
    const orderId = String(selectedOrder?._id || '')
    if (!orderId) return
    if (Array.isArray(candidateShops[orderId])) return
    loadCandidateShops(orderId)
  }, [selectedOrder?._id])

  async function loadCandidateShops(orderId) {
    setCandidateLoading((prev) => ({ ...prev, [orderId]: true }))
    try {
      const result = await apiGet(`/api/orders/${orderId}/candidate-shops`, { skipCache: true })
      setCandidateShops((prev) => ({ ...prev, [orderId]: Array.isArray(result?.shops) ? result.shops : [] }))
    } catch (err) {
      toast.error(err?.message || 'Failed to load candidate shops')
    } finally {
      setCandidateLoading((prev) => ({ ...prev, [orderId]: false }))
    }
  }

  async function assignShop(orderId, shopId) {
    setAssigning((prev) => ({ ...prev, [orderId]: shopId }))
    try {
      const result = await apiPost(`/api/orders/${orderId}/assign-shop`, { shopId })
      const updated = result?.order
      if (updated) {
        setOrders((prev) => prev.map((order) => (String(order._id) === String(updated._id) ? { ...order, ...updated } : order)))
        setSelectedOrderId(String(updated._id))
      }
      toast.success('Shop assigned successfully')
      await loadCandidateShops(orderId)
      await loadOrders()
    } catch (err) {
      toast.error(err?.message || 'Failed to assign shop')
    } finally {
      setAssigning((prev) => ({ ...prev, [orderId]: '' }))
    }
  }

  async function verifyPickup(orderId, method) {
    setVerifying((prev) => ({ ...prev, [orderId]: method }))
    try {
      const payload = method === 'barcode'
        ? { method: 'barcode', scannedCode: barcodeValue[orderId] || '' }
        : { method: 'manual' }
      const result = await apiPost(`/api/orders/${orderId}/pickup-verify`, payload)
      const updated = result?.order
      if (updated) {
        setOrders((prev) => prev.map((order) => (String(order._id) === String(updated._id) ? { ...order, ...updated } : order)))
      }
      toast.success('Pickup verification updated')
      await loadOrders()
    } catch (err) {
      toast.error(err?.message || 'Failed to verify pickup')
    } finally {
      setVerifying((prev) => ({ ...prev, [orderId]: '' }))
    }
  }

  async function resolveDropoff() {
    setResolvingDropoff(true)
    try {
      const payload = {
        customerAddress: dropoffPayload.customerAddress,
        googleMapsUrl: dropoffPayload.googleMapsUrl,
        locationLat: dropoffPayload.locationLat ? Number(dropoffPayload.locationLat) : undefined,
        locationLng: dropoffPayload.locationLng ? Number(dropoffPayload.locationLng) : undefined,
      }
      const result = await apiPost('/api/orders/resolve-dropoff', payload)
      setDropoffResult(result?.dropoff || null)
      toast.success('Dropoff resolved')
    } catch (err) {
      toast.error(err?.message || 'Failed to resolve dropoff')
    } finally {
      setResolvingDropoff(false)
    }
  }

  const shipOptions = ['', 'pending', 'assigned', 'picked_up', 'out_for_delivery', 'in_transit', 'delivered', 'cancelled', 'returned']

  if (loading) return <LoadingState label="Loading logistics console" />

  return (
    <PageShell
      eyebrow="Hyper-local logistics"
      title="Shop logistics"
      subtitle="Control shop assignment, pickup verification, and live delivery readiness from a dedicated owner console."
      actions={<SecondaryButton onClick={loadOrders}>Refresh</SecondaryButton>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 0.92fr) minmax(0, 1.08fr)', gap: 18 }}>
        <Panel
          title="Active logistics orders"
          subtitle="Filter open orders and inspect routing readiness"
          tone="orange"
          action={
            <div style={{ display: 'grid', gap: 10, minWidth: 240 }}>
              <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoice, customer, city" />
              <SelectInput value={shipFilter} onChange={(e) => setShipFilter(e.target.value)}>
                {shipOptions.map((option) => <option key={option || 'all'} value={option}>{option || 'All shipment states'}</option>)}
              </SelectInput>
            </div>
          }
        >
          {error ? <EmptyState title="Logistics unavailable" description={error} action={<SecondaryButton onClick={loadOrders}>Retry</SecondaryButton>} /> : null}
          {!error && !orders.length ? <EmptyState title="No logistics orders found" description="Orders will appear here once they enter the owner order stream." /> : null}
          {!error && orders.length ? (
            <div style={{ display: 'grid', gap: 12, maxHeight: 720, overflowY: 'auto', paddingRight: 4 }}>
              {orders.map((order) => (
                <button
                  key={order._id}
                  type="button"
                  onClick={() => setSelectedOrderId(String(order._id))}
                  style={{
                    textAlign: 'left',
                    borderRadius: 20,
                    border: String(order._id) === String(selectedOrderId) ? '1px solid rgba(249,115,22,0.45)' : '1px solid rgba(226,232,240,0.95)',
                    background: String(order._id) === String(selectedOrderId) ? 'linear-gradient(135deg, rgba(255,247,237,0.98), rgba(255,255,255,0.98))' : 'rgba(255,255,255,0.98)',
                    padding: 16,
                    display: 'grid',
                    gap: 10,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <div style={{ fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>#{order.invoiceNumber || String(order._id).slice(-6)}</div>
                    <StatusBadge tone={toneFor(order.logisticsPhase)}>{order.logisticsPhase || 'pending'}</StatusBadge>
                  </div>
                  <div style={{ color: '#64748b', fontSize: 13 }}>{order.customerName || '-'} • {order.orderCountry || '-'} • {order.city || '-'}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{order.assignedShopName ? `Assigned to ${order.assignedShopName}` : 'Awaiting shop assignment'}</div>
                </button>
              ))}
            </div>
          ) : null}
        </Panel>

        <div style={{ display: 'grid', gap: 18 }}>
          <Panel title="Dropoff resolver" subtitle="Preview how a Google Maps link or coordinates resolve before using them operationally" tone="sky">
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <Label>Customer address</Label>
                <TextArea value={dropoffPayload.customerAddress} onChange={(e) => setDropoffPayload((prev) => ({ ...prev, customerAddress: e.target.value }))} placeholder="Paste the delivery address" />
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <Label>Google Maps url</Label>
                <TextInput value={dropoffPayload.googleMapsUrl} onChange={(e) => setDropoffPayload((prev) => ({ ...prev, googleMapsUrl: e.target.value }))} placeholder="Paste Google Maps or WhatsApp location URL" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  <Label>Latitude</Label>
                  <TextInput value={dropoffPayload.locationLat} onChange={(e) => setDropoffPayload((prev) => ({ ...prev, locationLat: e.target.value }))} placeholder="25.2048" />
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <Label>Longitude</Label>
                  <TextInput value={dropoffPayload.locationLng} onChange={(e) => setDropoffPayload((prev) => ({ ...prev, locationLng: e.target.value }))} placeholder="55.2708" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <PrimaryButton type="button" onClick={resolveDropoff} disabled={resolvingDropoff}>{resolvingDropoff ? 'Resolving…' : 'Resolve dropoff'}</PrimaryButton>
                {dropoffResult ? <SecondaryButton type="button" onClick={() => setDropoffResult(null)}>Clear</SecondaryButton> : null}
              </div>
              {dropoffResult ? (
                <div style={{ borderRadius: 18, border: '1px solid rgba(14,165,233,0.18)', background: 'rgba(14,165,233,0.08)', padding: 16, display: 'grid', gap: 6 }}>
                  <div style={{ fontWeight: 900, color: '#0f172a' }}>{dropoffResult.formattedAddress || '-'}</div>
                  <div style={{ color: '#64748b', fontSize: 13 }}>{dropoffResult.city || '-'} • {dropoffResult.area || '-'} • {dropoffResult.country || '-'}</div>
                  <div style={{ color: '#64748b', fontSize: 13 }}>{Number(dropoffResult.lat || 0).toFixed(5)}, {Number(dropoffResult.lng || 0).toFixed(5)}</div>
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel title={selectedOrder ? `Order #${selectedOrder.invoiceNumber || String(selectedOrder._id).slice(-6)}` : 'Order logistics detail'} subtitle={selectedOrder ? 'Shop routing, barcode verification, and live driver state' : 'Select an order from the left to manage logistics'} tone="violet">
            {!selectedOrder ? <EmptyState title="Choose an order" description="Select an order to load candidate shops, assign it, and manage pickup verification." /> : (
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <div style={{ borderRadius: 18, border: '1px solid rgba(226,232,240,0.95)', padding: 14, background: 'rgba(248,250,252,0.72)' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Customer</div>
                    <div style={{ fontWeight: 900, color: '#0f172a' }}>{selectedOrder.customerName || '-'}</div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>{selectedOrder.customerPhone || '-'}</div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>{selectedOrder.customerAddress || '-'}</div>
                  </div>
                  <div style={{ borderRadius: 18, border: '1px solid rgba(226,232,240,0.95)', padding: 14, background: 'rgba(248,250,252,0.72)' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>State</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <StatusBadge tone={toneFor(selectedOrder.logisticsPhase)}>{selectedOrder.logisticsPhase || 'pending'}</StatusBadge>
                      <StatusBadge tone={toneFor(selectedOrder.shipmentStatus)}>{selectedOrder.shipmentStatus || 'pending'}</StatusBadge>
                    </div>
                    <div style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>Updated {formatDate(selectedOrder.updatedAt || selectedOrder.createdAt)}</div>
                  </div>
                  <div style={{ borderRadius: 18, border: '1px solid rgba(226,232,240,0.95)', padding: 14, background: 'rgba(248,250,252,0.72)' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Pickup verification</div>
                    <div style={{ color: '#0f172a', fontWeight: 900 }}>{selectedOrder.pickupVerification?.method || 'none'}</div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>{selectedOrder.pickupVerification?.verifiedAt ? `Verified ${formatDate(selectedOrder.pickupVerification.verifiedAt)}` : 'Awaiting verification'}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>Candidate shops</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <SecondaryButton type="button" onClick={() => loadCandidateShops(selectedOrder._id)} disabled={candidateLoading[selectedOrder._id]}>{candidateLoading[selectedOrder._id] ? 'Loading…' : 'Load candidates'}</SecondaryButton>
                    </div>
                  </div>
                  {Array.isArray(candidateShops[selectedOrder._id]) && candidateShops[selectedOrder._id].length ? (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {candidateShops[selectedOrder._id].map((shop) => (
                        <div key={shop._id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'center', borderRadius: 18, border: '1px solid rgba(226,232,240,0.95)', background: '#fff', padding: 14 }}>
                          <div style={{ display: 'grid', gap: 5 }}>
                            <div style={{ fontWeight: 900, color: '#0f172a' }}>{shop.name}</div>
                            <div style={{ color: '#64748b', fontSize: 13 }}>{shop.ownerName || '-'} • {shop.phone || '-'}</div>
                            <div style={{ color: '#64748b', fontSize: 13 }}>{shop.pickupLocation?.address || shop.address || '-'}</div>
                            <div style={{ color: '#64748b', fontSize: 12 }}>{Number(shop.matchedProductCount || 0)} matched products</div>
                          </div>
                          <PrimaryButton type="button" onClick={() => assignShop(selectedOrder._id, shop._id)} disabled={assigning[selectedOrder._id] === shop._id}>{assigning[selectedOrder._id] === shop._id ? 'Assigning…' : 'Assign shop'}</PrimaryButton>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="No candidate shops loaded" description="Use the button above to fetch best-fit shops for this order based on assigned products." />
                  )}
                </div>

                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>Pickup verification</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 10, alignItems: 'end' }}>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <Label>Barcode value</Label>
                      <TextInput value={barcodeValue[selectedOrder._id] || ''} onChange={(e) => setBarcodeValue((prev) => ({ ...prev, [selectedOrder._id]: e.target.value }))} placeholder={selectedOrder.barcode?.value || 'Scan or paste barcode'} />
                    </div>
                    <PrimaryButton type="button" onClick={() => verifyPickup(selectedOrder._id, 'barcode')} disabled={verifying[selectedOrder._id] === 'barcode'}>{verifying[selectedOrder._id] === 'barcode' ? 'Verifying…' : 'Verify barcode'}</PrimaryButton>
                    <SecondaryButton type="button" onClick={() => verifyPickup(selectedOrder._id, 'manual')} disabled={verifying[selectedOrder._id] === 'manual'}>{verifying[selectedOrder._id] === 'manual' ? 'Verifying…' : 'Manual verify'}</SecondaryButton>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>Live driver state</div>
                  {liveTracking[selectedOrder._id]?.location ? (
                    <div style={{ borderRadius: 18, border: '1px solid rgba(14,165,233,0.18)', background: 'rgba(14,165,233,0.08)', padding: 16, display: 'grid', gap: 6 }}>
                      <div style={{ fontWeight: 900, color: '#0f172a' }}>{Number(liveTracking[selectedOrder._id].location.lat).toFixed(5)}, {Number(liveTracking[selectedOrder._id].location.lng).toFixed(5)}</div>
                      <div style={{ color: '#64748b', fontSize: 13 }}>Route stage: {liveTracking[selectedOrder._id].routeStage || 'idle'} • Destination: {liveTracking[selectedOrder._id].destinationKind || 'none'}</div>
                      <div style={{ color: '#64748b', fontSize: 13 }}>Updated {formatDate(liveTracking[selectedOrder._id].location.updatedAt)}</div>
                    </div>
                  ) : (
                    <div style={{ color: '#64748b', fontSize: 14 }}>Live driver pings will appear here once a driver posts location updates for this order.</div>
                  )}
                </div>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </PageShell>
  )
}
