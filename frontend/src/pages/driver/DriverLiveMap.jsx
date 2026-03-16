import React, { useEffect, useState, useCallback } from 'react'
import { apiGet, apiPost } from '../../api'
import LiveMap from '../../components/driver/LiveMap'
import { useToast } from '../../ui/Toast'

export default function DriverLiveMapPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [driverLocation, setDriverLocation] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [mapCommand, setMapCommand] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  
  // Status change state
  const [selectedStatus, setSelectedStatus] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [collectedAmount, setCollectedAmount] = useState('')
  const toast = useToast()

  // Get driver's current location
  const refreshLocation = useCallback(() => {
    if (!('geolocation' in navigator)) return
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setDriverLocation({ 
            lat: position.coords.latitude, 
            lng: position.coords.longitude 
          })
        },
        (error) => {
          console.log('Location access denied:', error)
        },
        { enableHighAccuracy: true }
      )
    } catch {}
  }, [])

  // Load orders
  const loadOrders = useCallback(async () => {
    try {
      const data = await apiGet('/api/orders/driver/assigned')
      
      const ordersWithLocation = (data.orders || []).filter(o => {
        const lat = Number(o?.locationLat)
        const lng = Number(o?.locationLng)
        const hasLocation = Number.isFinite(lat) && Number.isFinite(lng)
        return hasLocation && isPickedUpOrder(o)
      })
      
      setOrders(ordersWithLocation)
      setSelectedOrder((prev) => {
        const prevId = String(prev?._id || prev?.id || '').trim()
        if (!prevId) return prev
        const refreshed = ordersWithLocation.find((order) => String(order?._id || order?.id || '') === prevId)
        return refreshed || null
      })
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load orders:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const PHONE_CODE_TO_CCY = {
    '+966': 'SAR',
    '+971': 'AED',
    '+968': 'OMR',
    '+973': 'BHD',
    '+965': 'KWD',
    '+974': 'QAR',
    '+91': 'INR',
    '+44': 'GBP',
    '+1': 'USD',
    '+61': 'AUD',
    '+92': 'PKR',
  }

  function getOrderNumericTotal(order) {
    try {
      if (order?.total != null && !Number.isNaN(Number(order.total))) return Number(order.total)
      if (Array.isArray(order?.items) && order.items.length > 0) {
        return order.items.reduce((sum, item) => {
          const price = Number(item?.productId?.price || item?.price || 0)
          const qty = Math.max(1, Number(item?.quantity || 1))
          return sum + (price * qty)
        }, 0)
      }
      const qty = Math.max(1, Number(order?.quantity || 1))
      const price = Number(order?.productId?.price || order?.price || 0)
      return price * qty
    } catch {
      return 0
    }
  }

  function getDefaultCollectedAmount(order) {
    try {
      const cod = Number(order?.codAmount)
      if (!Number.isNaN(cod) && cod > 0) return cod
      return getOrderNumericTotal(order)
    } catch {
      return getOrderNumericTotal(order)
    }
  }

  function currencyFromPhoneCode(code) {
    try {
      const raw = String(code || '').trim()
      return PHONE_CODE_TO_CCY[raw] || (raw ? raw.replace(/\D/g, '') : 'SAR')
    } catch {
      return 'SAR'
    }
  }

  function formatOrderAmount(order) {
    try {
      const currency = currencyFromPhoneCode(order?.phoneCountryCode || '')
      const total = getDefaultCollectedAmount(order)
      return `${currency} ${Number(total || 0).toFixed(2)}`
    } catch {
      return 'SAR 0.00'
    }
  }

  function getOrderTitle(order) {
    try {
      if (Array.isArray(order?.items) && order.items.length > 0) {
        const named = order.items.find((item) => String(item?.productId?.name || item?.name || '').trim())
        if (named) return String(named?.productId?.name || named?.name || '').trim()
      }
      if (String(order?.productId?.name || '').trim()) return String(order.productId.name).trim()
      if (String(order?.details || '').trim()) return String(order.details).trim()
      return order?.customerName || 'Order'
    } catch {
      return 'Order'
    }
  }

  function getOrderCode(order) {
    const raw = String(order?.invoiceNumber || '').trim()
    if (raw) return `#${raw}`
    const fallback = String(order?._id || order?.id || '').trim()
    return fallback ? `#${fallback.slice(-5)}` : '#-----'
  }

  function getAddressLine(order) {
    return order?.customerAddress || order?.customerLocation || [order?.city, order?.orderCountry].filter(Boolean).join(', ') || 'No address'
  }

  function normalizeShipmentStatus(status) {
    const raw = String(status || '').trim().toLowerCase()
    if (!raw) return ''
    if (raw === 'open') return 'pending'
    if (raw === 'shipped') return 'in_transit'
    if (raw === 'attempted' || raw === 'contacted') return 'in_transit'
    if (raw === 'picked' || raw === 'pickedup') return 'picked_up'
    return raw
  }

  function getOrderStatusValue(order) {
    return normalizeShipmentStatus(order?.shipmentStatus || order?.status || '')
  }

  function isPickedUpOrder(order) {
    const shipmentStatus = getOrderStatusValue(order)
    const rawStatus = normalizeShipmentStatus(order?.status || '')
    return shipmentStatus === 'picked_up' || rawStatus === 'picked_up'
  }

  function getCustomerLabel(order) {
    const name = String(order?.customerName || '').trim()
    if (name) return name
    const invoice = String(order?.invoiceNumber || '').trim()
    if (invoice) return `Customer ${invoice}`
    const fallback = String(order?._id || order?.id || '').trim()
    return fallback ? `Customer ${fallback.slice(-5)}` : 'Customer'
  }

  function formatStatusLabel(status) {
    const raw = String(status || '').trim().toLowerCase()
    if (!raw) return 'Pending'
    return raw.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
  }

  function openWhatsApp(phone) {
    if (!phone) return
    const cleanPhone = String(phone).replace(/[^\d+]/g, '')
    window.open(`https://wa.me/${cleanPhone}`, '_blank', 'noopener,noreferrer')
  }

  function callPhone(phone) {
    if (!phone) return
    window.location.href = `tel:${phone}`
  }

  function queueMapCommand(type, order = null) {
    const orderId = String(order?._id || order?.id || '').trim()
    setMapCommand({
      type,
      orderId,
      requestId: `${type}:${orderId || 'driver'}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
    })
  }

  function openExternalDirections(order) {
    const lat = Number(order?.locationLat)
    const lng = Number(order?.locationLng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.warn('This order does not have a valid customer pin')
      return
    }

    const originLat = Number(driverLocation?.lat)
    const originLng = Number(driverLocation?.lng)
    const hasOrigin = Number.isFinite(originLat) && Number.isFinite(originLng)

    const params = new URLSearchParams({
      api: '1',
      destination: `${lat},${lng}`,
      travelmode: 'driving',
      dir_action: 'navigate',
    })

    if (hasOrigin) {
      params.set('origin', `${originLat},${originLng}`)
    }

    window.open(`https://www.google.com/maps/dir/?${params.toString()}`, '_blank', 'noopener,noreferrer')
  }

  // Initial load
  useEffect(() => {
    refreshLocation()
    loadOrders()
  }, [refreshLocation, loadOrders])

  // Auto refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      loadOrders()
      refreshLocation()
    }, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, loadOrders, refreshLocation])

  // Watch location continuously
  useEffect(() => {
    if (!('geolocation' in navigator)) return
    
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setDriverLocation({ 
          lat: position.coords.latitude, 
          lng: position.coords.longitude 
        })
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
    
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // When order is selected, set its current status
  useEffect(() => {
    if (selectedOrder) {
      setSelectedStatus(getOrderStatusValue(selectedOrder))
      setStatusNote('')
      setCollectedAmount(String(getDefaultCollectedAmount(selectedOrder) || ''))
    } else {
      setSelectedStatus('')
      setStatusNote('')
      setCollectedAmount('')
    }
  }, [selectedOrder])

  // Save status change
  async function saveStatus() {
    if (!selectedOrder || !selectedStatus) return
    
    setSavingStatus(true)
    try {
      const id = selectedOrder._id || selectedOrder.id
      
      if (selectedStatus === 'delivered') {
        const parsedAmount = Number(collectedAmount)
        const amount = Number.isFinite(parsedAmount) ? Math.max(0, parsedAmount) : Math.max(0, Number(getDefaultCollectedAmount(selectedOrder) || 0))
        await apiPost(`/api/orders/${id}/deliver`, { note: statusNote || '', collectedAmount: amount })
      } else if (selectedStatus === 'cancelled') {
        await apiPost(`/api/orders/${id}/cancel`, { reason: statusNote || '' })
      } else {
        await apiPost(`/api/orders/${id}/shipment/update`, {
          shipmentStatus: selectedStatus,
          deliveryNotes: statusNote || ''
        })
      }
      
      // Refresh orders after save
      await loadOrders()
      if (selectedStatus === 'delivered') toast.success('Order marked delivered')
      else if (selectedStatus === 'cancelled') toast.warn('Order cancelled')
      else toast.info(`Order marked ${formatStatusLabel(selectedStatus)}`)
      setSelectedOrder(null)
      setSelectedStatus('')
      setStatusNote('')
      setCollectedAmount('')
    } catch (err) {
      toast.error(err?.message || 'Failed to update status')
    } finally {
      setSavingStatus(false)
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'grid', 
        placeItems: 'center', 
        height: 'calc(100vh - 150px)',
        gap: 16
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          display: 'grid',
          placeItems: 'center',
          animation: 'pulse 1.5s infinite'
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <div style={{ color: 'var(--muted)', fontWeight: 500 }}>Loading live map...</div>
      </div>
    )
  }

  const quickActions = [
    { value: 'delivered', label: 'Delivered', bg: '#dcfce7', color: '#166534' },
    { value: 'no_response', label: 'No Response', bg: '#fef3c7', color: '#92400e' },
    { value: 'cancelled', label: 'Cancelled', bg: '#fee2e2', color: '#b91c1c' },
  ]
  const activeOrderId = String(selectedOrder?._id || selectedOrder?.id || '')
  const selectedOrderStatus = getOrderStatusValue(selectedOrder)
  const isQuickActionSelected = quickActions.some((action) => action.value === selectedStatus)
  const mapViewportHeight = 'clamp(420px, calc(100vh - 300px), 72vh)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 16 }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap'
      }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.04em', color: '#0f172a' }}>
            Driver Live Map
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
            Tap any picked-up stop to open actions and directions
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              padding: '10px 14px',
              borderRadius: 999,
              border: '1px solid rgba(148,163,184,0.35)',
              background: autoRefresh ? '#ecfdf5' : '#ffffff',
              color: autoRefresh ? '#047857' : '#334155',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(15,23,42,0.06)'
            }}
          >
            {autoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}
          </button>
          <button
            onClick={() => { loadOrders(); refreshLocation(); }}
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              border: 'none',
              background: '#0f172a',
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 14px 30px rgba(15,23,42,0.18)'
            }}
          >
            ↻
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap'
      }}>
        <div style={{
          padding: '10px 14px',
          background: '#ffffff',
          borderRadius: 999,
          border: '1px solid rgba(148,163,184,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 12px 32px rgba(15,23,42,0.06)'
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px rgba(16,185,129,0.4)'
          }} />
          <span style={{ fontWeight: 700, color: '#0f172a' }}>{orders.length}</span>
          <span style={{ color: '#64748b', fontSize: 13 }}>Picked Up Orders</span>
        </div>
        
        {driverLocation && (
          <div style={{
            padding: '10px 14px',
            background: '#ffffff',
            borderRadius: 999,
            border: '1px solid rgba(148,163,184,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 12px 32px rgba(15,23,42,0.06)'
          }}>
          <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#3b82f6',
              boxShadow: '0 0 8px rgba(59,130,246,0.4)'
            }} />
            <span style={{ color: '#64748b', fontSize: 13 }}>Location Active</span>
          </div>
        )}
        
        {lastUpdated && (
          <div style={{
            padding: '10px 14px',
            background: '#ffffff',
            borderRadius: 999,
            border: '1px solid rgba(148,163,184,0.2)',
            color: '#64748b',
            fontSize: 13,
            boxShadow: '0 12px 32px rgba(15,23,42,0.06)'
          }}>
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {orders.length > 0 && (
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {orders.map((order) => {
            const orderId = String(order?._id || order?.id || '')
            const active = activeOrderId && activeOrderId === orderId
            return (
              <button
                key={orderId}
                onClick={() => setSelectedOrder(order)}
                style={{
                  minWidth: 200,
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: 18,
                  border: active ? '1px solid rgba(37,99,235,0.24)' : '1px solid rgba(148,163,184,0.16)',
                  background: active ? 'linear-gradient(135deg, #eff6ff, #ffffff)' : '#ffffff',
                  boxShadow: active ? '0 18px 32px rgba(37,99,235,0.14)' : '0 12px 30px rgba(15,23,42,0.06)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: active ? '#1d4ed8' : '#475569' }}>{getOrderCode(order)}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{formatOrderAmount(order)}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {getOrderTitle(order)}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {order.customerName || 'Customer'} · {formatStatusLabel(getOrderStatusValue(order))}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Full Size Map */}
      <div style={{ 
        flex: 1,
        minHeight: mapViewportHeight,
        borderRadius: 28,
        overflow: 'hidden',
        position: 'relative',
        background: '#ffffff',
        boxShadow: '0 24px 60px rgba(15,23,42,0.12)'
      }}>
        <LiveMap 
          orders={orders}
          driverLocation={driverLocation}
          onSelectOrder={(order) => setSelectedOrder(order)}
          minimal={true}
          activeOrderId={activeOrderId}
          mapHeight={mapViewportHeight}
          mapCommand={mapCommand}
        />

        {selectedOrder && (
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(430px, calc(100% - 24px))',
            bottom: 12,
            padding: 14,
            borderRadius: 22,
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 18px 48px rgba(15,23,42,0.16)',
            border: '1px solid rgba(255,255,255,0.72)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ padding: '5px 9px', borderRadius: 999, background: '#eff6ff', color: '#1d4ed8', fontSize: 10, fontWeight: 800, letterSpacing: '0.02em' }}>
                    {getOrderCode(selectedOrder)}
                  </span>
                  <span style={{ padding: '5px 9px', borderRadius: 999, background: '#f8fafc', color: '#475569', fontSize: 10, fontWeight: 700 }}>
                    {formatStatusLabel(selectedOrderStatus)}
                  </span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {getOrderTitle(selectedOrder)}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {getCustomerLabel(selectedOrder)}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {getAddressLine(selectedOrder)}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    border: '1px solid rgba(148,163,184,0.18)',
                    background: 'rgba(248,250,252,0.92)',
                    color: '#64748b',
                    fontSize: 16,
                    lineHeight: 1,
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
                  {formatOrderAmount(selectedOrder)}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 8 }}>
              <button
                onClick={() => queueMapCommand('recenter', selectedOrder)}
                style={{
                  height: 42,
                  borderRadius: 14,
                  border: '1px solid rgba(148,163,184,0.18)',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v4" />
                  <path d="M12 18v4" />
                  <path d="M2 12h4" />
                  <path d="M18 12h4" />
                </svg>
                Recenter
              </button>
              <button
                onClick={() => queueMapCommand('show_route', selectedOrder)}
                style={{
                  height: 42,
                  borderRadius: 14,
                  border: 'none',
                  background: '#0f172a',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                  <path d="M5 12h10" />
                </svg>
                Get Direction
              </button>
              <button
                onClick={() => openExternalDirections(selectedOrder)}
                style={{
                  height: 42,
                  borderRadius: 14,
                  border: '1px solid rgba(37,99,235,0.16)',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 3h7v7" />
                  <path d="M10 14L21 3" />
                  <path d="M21 14v7h-7" />
                  <path d="M3 10L14 21" />
                </svg>
                Open Maps
              </button>
              <button
                onClick={() => openWhatsApp(selectedOrder.customerPhone)}
                style={{
                  height: 42,
                  borderRadius: 15,
                  border: 'none',
                  background: '#25d366',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  boxShadow: '0 10px 22px rgba(37,211,102,0.22)'
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </button>
              <button
                onClick={() => callPhone(selectedOrder.customerPhone)}
                style={{
                  height: 42,
                  borderRadius: 15,
                  border: '1px solid rgba(37,99,235,0.16)',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                </svg>
                Call
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginBottom: isQuickActionSelected ? 10 : 0, marginTop: 2 }}>
              {quickActions.map((action) => {
                const active = selectedStatus === action.value
                return (
                  <button
                    key={action.value}
                    onClick={() => setSelectedStatus(action.value)}
                    style={{
                      height: 40,
                      borderRadius: 13,
                      border: active ? '1px solid transparent' : '1px solid rgba(148,163,184,0.22)',
                      background: active ? action.bg : '#ffffff',
                      color: active ? action.color : '#334155',
                      fontWeight: 800,
                      fontSize: 11,
                      cursor: 'pointer'
                    }}
                  >
                    {action.label}
                  </button>
                )
              })}
            </div>

            {isQuickActionSelected && (
              <>
                {selectedStatus === 'delivered' && (
                  <div style={{ marginTop: 10, marginBottom: 8 }}>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={collectedAmount}
                      onChange={(e) => setCollectedAmount(e.target.value)}
                      placeholder="Collected amount"
                      style={{
                        width: '100%',
                        height: 42,
                        padding: '0 13px',
                        borderRadius: 13,
                        border: '1px solid rgba(148,163,184,0.18)',
                        fontSize: 13,
                        boxSizing: 'border-box',
                        background: 'rgba(248,250,252,0.84)'
                      }}
                    />
                  </div>
                )}

                <div style={{ marginBottom: 8 }}>
                  <input
                    type="text"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder={selectedStatus === 'cancelled' ? 'Cancellation reason' : selectedStatus === 'no_response' ? 'Why no response?' : 'Delivery note'}
                    style={{
                      width: '100%',
                      height: 42,
                      padding: '0 13px',
                      borderRadius: 13,
                      border: '1px solid rgba(148,163,184,0.18)',
                      fontSize: 13,
                      boxSizing: 'border-box',
                      background: 'rgba(248,250,252,0.84)'
                    }}
                  />
                </div>

                <button
                  onClick={saveStatus}
                  disabled={!isQuickActionSelected || savingStatus}
                  style={{
                    width: '100%',
                    height: 44,
                    borderRadius: 15,
                    border: 'none',
                    background: '#0f172a',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: savingStatus ? 'wait' : 'pointer',
                    opacity: savingStatus ? 0.72 : 1
                  }}
                >
                  {savingStatus ? 'Saving...' : `Mark ${formatStatusLabel(selectedStatus)}`}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* No Orders State */}
      {orders.length === 0 && (
        <div style={{
          padding: 32,
          textAlign: 'center',
          color: '#64748b',
          background: '#ffffff',
          borderRadius: 24,
          border: '1px solid rgba(148,163,184,0.16)',
          boxShadow: '0 18px 50px rgba(15,23,42,0.06)'
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
          <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>No picked-up orders on the map</div>
          <div style={{ fontSize: 14 }}>Orders with a picked up status and valid customer pins will appear here automatically.</div>
        </div>
      )}
    </div>
  )
}
