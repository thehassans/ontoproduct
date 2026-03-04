import React, { useEffect, useState, useCallback } from 'react'
import { apiGet, apiPost } from '../../api'
import LiveMap from '../../components/driver/LiveMap'

export default function DriverLiveMapPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [driverLocation, setDriverLocation] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  
  // Status change state
  const [selectedStatus, setSelectedStatus] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)

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
      console.log('Loaded orders:', data.orders?.length || 0, data.orders)
      
      // Filter: must have location AND shipmentStatus not delivered/cancelled/returned
      const excludedShipmentStatuses = ['delivered', 'cancelled', 'returned']
      const ordersWithLocation = (data.orders || []).filter(o => {
        const hasLocation = o.locationLat && o.locationLng
        const notExcluded = !excludedShipmentStatuses.includes(o.shipmentStatus)
        console.log('Order', o._id?.slice(-5), 'hasLoc:', hasLocation, 'status:', o.status, 'shipment:', o.shipmentStatus, 'include:', hasLocation && notExcluded)
        return hasLocation && notExcluded
      })
      
      setOrders(ordersWithLocation)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load orders:', err)
    } finally {
      setLoading(false)
    }
  }, [])

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
      setSelectedStatus(selectedOrder.shipmentStatus || '')
      setStatusNote('')
    }
  }, [selectedOrder])

  // Save status change
  async function saveStatus() {
    if (!selectedOrder || !selectedStatus) return
    
    setSavingStatus(true)
    try {
      const id = selectedOrder._id || selectedOrder.id
      
      if (selectedStatus === 'delivered') {
        await apiPost(`/api/orders/${id}/deliver`, { note: statusNote || '' })
      } else if (selectedStatus === 'cancelled') {
        await apiPost(`/api/orders/${id}/cancel`, { reason: statusNote || '' })
      } else if (selectedStatus === 'returned') {
        await apiPost(`/api/orders/${id}/return`, { reason: statusNote || '' })
      } else {
        await apiPost(`/api/orders/${id}/shipment/update`, {
          shipmentStatus: selectedStatus,
          deliveryNotes: statusNote || ''
        })
      }
      
      // Refresh orders after save
      await loadOrders()
      setSelectedOrder(null)
      setSelectedStatus('')
      setStatusNote('')
    } catch (err) {
      alert(err?.message || 'Failed to update status')
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 20 }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <h1 style={{ 
            fontSize: 28, 
            fontWeight: 800, 
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            🗺️ Live Map
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 14 }}>
            Real-time view of all your delivery locations
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: autoRefresh ? 'rgba(16,185,129,0.1)' : 'var(--panel)',
              color: autoRefresh ? '#10b981' : 'var(--text)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            {autoRefresh ? '✓' : '○'} Auto Refresh
          </button>
          
          {/* Manual Refresh */}
          <button
            onClick={() => { loadOrders(); refreshLocation(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: 'white',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
            }}
          >
            🔄 Refresh Now
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap'
      }}>
        <div style={{
          padding: '12px 20px',
          background: 'var(--panel)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <div style={{ 
            width: 10, 
            height: 10, 
            borderRadius: '50%', 
            background: '#10b981',
            boxShadow: '0 0 8px rgba(16,185,129,0.5)'
          }} />
          <span style={{ fontWeight: 600 }}>{orders.length}</span>
          <span style={{ color: 'var(--muted)' }}>Active Orders</span>
        </div>
        
        {driverLocation && (
          <div style={{
            padding: '12px 20px',
            background: 'var(--panel)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <div style={{ 
              width: 10, 
              height: 10, 
              borderRadius: '50%', 
              background: '#3b82f6',
              boxShadow: '0 0 8px rgba(59,130,246,0.5)'
            }} />
            <span style={{ color: 'var(--muted)' }}>Location Active</span>
          </div>
        )}
        
        {lastUpdated && (
          <div style={{
            padding: '12px 20px',
            background: 'var(--panel)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            color: 'var(--muted)',
            fontSize: 13
          }}>
            Updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Full Size Map */}
      <div style={{ 
        flex: 1,
        minHeight: 'calc(100vh - 300px)',
        borderRadius: 16,
        overflow: 'hidden'
      }}>
        <LiveMap 
          orders={orders}
          driverLocation={driverLocation}
          onSelectOrder={(order) => setSelectedOrder(order)}
        />
      </div>

      {/* Ultra Premium Selected Order Panel */}
      {selectedOrder && (
        <div style={{
          padding: 16,
          background: 'linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 18
              }}>
                📦
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'white' }}>
                  {selectedOrder.invoiceNumber 
                    ? `#${selectedOrder.invoiceNumber}` 
                    : `#${(selectedOrder._id || '').slice(-5)}`}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                  {selectedOrder.customerName || 'Customer'}
                </div>
              </div>
            </div>
            
            {/* Premium Quick Actions */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => {
                  const phone = selectedOrder.customerPhone
                  if (phone) {
                    const cleanPhone = phone.replace(/[^\d+]/g, '')
                    window.open(`https://wa.me/${cleanPhone}`, '_blank')
                  }
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #25d366, #128c7e)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 4px 12px rgba(37,211,102,0.4)'
                }}
                title="WhatsApp"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>
              <button
                onClick={() => {
                  if (selectedOrder.customerPhone) {
                    window.location.href = `tel:${selectedOrder.customerPhone}`
                  }
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 4px 12px rgba(59,130,246,0.4)'
                }}
                title="Call"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                </svg>
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center'
                }}
                title="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Address - Truncated */}
          <div style={{ 
            fontSize: 11, 
            color: 'rgba(255,255,255,0.4)', 
            marginBottom: 14,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            📍 {selectedOrder.customerAddress || selectedOrder.city || 'No address'}
          </div>

          {/* Ultra Minimal Status Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.3)',
                color: 'white',
                fontSize: 12,
                fontWeight: 500,
                appearance: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">Status...</option>
              <option value="picked_up">📦 Picked</option>
              <option value="out_for_delivery">🚚 OFD</option>
              <option value="contacted">📞 Contacted</option>
              <option value="attempted">🔄 Attempted</option>
              <option value="no_response">📵 No Resp</option>
              <option value="delivered">✅ Delivered</option>
              <option value="cancelled">❌ Cancelled</option>
              <option value="returned">↩️ Returned</option>
            </select>
            
            <input
              type="text"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Note..."
              style={{
                flex: 1.5,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.3)',
                color: 'white',
                fontSize: 12
              }}
            />
            
            <button
              onClick={saveStatus}
              disabled={!selectedStatus || savingStatus}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: selectedStatus 
                  ? 'linear-gradient(135deg, #10b981, #059669)' 
                  : 'rgba(255,255,255,0.1)',
                color: selectedStatus ? 'white' : 'rgba(255,255,255,0.4)',
                fontWeight: 700,
                cursor: selectedStatus ? 'pointer' : 'not-allowed',
                fontSize: 11,
                opacity: savingStatus ? 0.7 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {savingStatus ? '...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* No Orders State */}
      {orders.length === 0 && (
        <div style={{
          padding: 40,
          textAlign: 'center',
          color: 'var(--muted)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📍</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>No orders with locations</div>
          <div style={{ fontSize: 14 }}>Your assigned orders will appear on the map when they have location data</div>
        </div>
      )}
    </div>
  )
}
