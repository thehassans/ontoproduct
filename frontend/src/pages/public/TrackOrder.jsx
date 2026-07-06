import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { io } from 'socket.io-client'

const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-track-order'

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#f59e0b', icon: '⏳' },
  assigned: { label: 'Driver Assigned', color: '#3b82f6', icon: '📋' },
  picked_up: { label: 'Picked Up', color: '#8b5cf6', icon: '📦' },
  out_for_delivery: { label: 'Out for Delivery', color: '#f97316', icon: '🚚' },
  in_transit: { label: 'In Transit', color: '#0ea5e9', icon: '🛵' },
  delivered: { label: 'Delivered', color: '#10b981', icon: '✅' },
  cancelled: { label: 'Cancelled', color: '#ef4444', icon: '❌' },
  returned: { label: 'Returned', color: '#64748b', icon: '↩️' },
}

const TIMELINE_ICONS = {
  ordered: '📝',
  assigned: '📋',
  picked_up: '📦',
  out_for_delivery: '🚚',
  delivered: '🎉',
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '—'
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem ? `${hrs} hr ${rem} min` : `${hrs} hr`
}

function formatDistance(meters) {
  if (!meters || meters <= 0) return '—'
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  return `${Math.round(meters)} m`
}

function isGoogleMapsReady() {
  const maps = window.google?.maps
  return Boolean(maps && (typeof maps.importLibrary === 'function' || typeof maps.Map === 'function'))
}

async function waitForGoogleMapsReady(timeoutMs = 10000) {
  if (isGoogleMapsReady()) return true
  const startedAt = Date.now()
  return await new Promise((resolve) => {
    const tick = () => {
      if (isGoogleMapsReady()) { resolve(true); return }
      if (Date.now() - startedAt >= timeoutMs) { resolve(false); return }
      window.setTimeout(tick, 60)
    }
    tick()
  })
}

export default function PublicTrackOrder() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [trackData, setTrackData] = useState(null)
  const [apiKey, setApiKey] = useState(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [driverArriving, setDriverArriving] = useState(false)

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const driverMarkerRef = useRef(null)
  const destMarkerRef = useRef(null)
  const polylineRef = useRef(null)
  const socketRef = useRef(null)
  const refreshTimerRef = useRef(null)

  // Load Google Maps API key
  useEffect(() => {
    async function loadKey() {
      try {
        const res = await fetch('/api/settings/maps-key')
        const data = await res.json()
        if (data?.apiKey) setApiKey(data.apiKey)
      } catch (err) {
        console.error('Failed to load maps key:', err)
      }
    }
    loadKey()
  }, [])

  // Load Google Maps script
  useEffect(() => {
    if (!apiKey) return
    let active = true

    async function readyUp() {
      if (typeof window.google?.maps?.importLibrary === 'function') {
        try {
          await window.google.maps.importLibrary('maps')
          await window.google.maps.importLibrary('marker').catch(() => null)
        } catch {}
      }
      const ready = await waitForGoogleMapsReady()
      if (!active) return
      if (ready) { setMapLoaded(true); setError('') }
      else { setMapLoaded(false); setError('Failed to load Google Maps') }
    }

    const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID)
      || document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')

    if (existing) {
      if (isGoogleMapsReady() || window.google?.maps) { readyUp() }
      else {
        existing.addEventListener('load', readyUp)
        existing.addEventListener('error', () => setError('Failed to load Google Maps'))
        return () => {
          existing.removeEventListener('load', readyUp)
          existing.removeEventListener('error', readyUp)
        }
      }
      return () => { active = false }
    }

    if (isGoogleMapsReady() || window.google?.maps) { readyUp(); return () => { active = false } }

    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=geometry,marker&loading=async`
    script.async = true
    script.defer = true
    script.onload = () => readyUp()
    script.onerror = () => setError('Failed to load Google Maps')
    document.head.appendChild(script)
    return () => { active = false }
  }, [apiKey])

  // Fetch tracking data
  const fetchTracking = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/public/track/${id}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Failed to load tracking data')
        setTrackData(null)
      } else {
        setTrackData(data)
        setError('')
      }
    } catch (err) {
      setError(err?.message || 'Failed to load tracking data')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchTracking()
    // Auto-refresh every 30 seconds
    refreshTimerRef.current = setInterval(fetchTracking, 30000)
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    }
  }, [fetchTracking])

  // Socket connection for real-time updates
  useEffect(() => {
    if (!id) return
    try {
      socketRef.current = io(undefined, {
        path: '/socket.io',
        transports: ['polling'],
        upgrade: false,
        withCredentials: true,
      })

      socketRef.current.on('connect', () => {
        socketRef.current.emit('track:join', id)
      })

      socketRef.current.on('driver.location.updated', (payload) => {
        if (payload?.orderId !== id) return
        setTrackData(prev => {
          if (!prev) return prev
          return {
            ...prev,
            driverLocation: payload.location,
            polyline: payload.polyline || prev.polyline,
            logisticsPhase: payload.logisticsPhase || prev.order?.logisticsPhase,
          }
        })
      })

      socketRef.current.on('driver.arriving', (payload) => {
        if (payload?.orderId !== id) return
        setDriverArriving(true)
      })

      socketRef.current.on('orders.changed', () => {
        fetchTracking()
      })
    } catch (err) {
      console.error('Socket error:', err)
    }

    return () => {
      try {
        socketRef.current?.emit('track:leave', id)
        socketRef.current?.disconnect()
      } catch {}
    }
  }, [id, fetchTracking])

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return
    let cancelled = false

    async function initMap() {
      try {
        const ready = await waitForGoogleMapsReady(8000)
        if (!ready || cancelled) return

        const center = trackData?.driverLocation || trackData?.destination || { lat: 25.2048, lng: 55.2708 }
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: Number(center.lat), lng: Number(center.lng) },
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          gestureHandling: 'greedy',
        })
      } catch (err) {
        if (!cancelled) setError('Failed to initialize map')
      }
    }

    initMap()
    return () => { cancelled = true }
  }, [mapLoaded])

  // Update markers when trackData changes
  useEffect(() => {
    if (!mapInstanceRef.current || !trackData) return
    const map = mapInstanceRef.current

    // Driver marker
    if (trackData.driverLocation) {
      const pos = { lat: Number(trackData.driverLocation.lat), lng: Number(trackData.driverLocation.lng) }
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setPosition(pos)
      } else {
        const carPath = 'M23.5 7c.276 0 .5.224.5.5v.511c0 .793-.926.989-1.616.989l-1.086-2h2.202zm-1.441 3.506c.639 1.186.946 2.252.946 3.666 0 1.37-.397 2.533-1.005 3.981v1.847c0 .552-.448 1-1 1h-1.5c-.552 0-1-.448-1-1v-1h-13v1c0 .552-.448 1-1 1h-1.5c-.552 0-1-.448-1-1v-1.847c-.608-1.448-1.005-2.611-1.005-3.981 0-1.414.307-2.48.946-3.666.829-1.537 1.851-3.453 2.93-5.252.828-1.382 1.262-1.707 2.278-1.889 1.532-.275 2.918-.365 4.851-.365s3.319.09 4.851.365c1.016.182 1.45.507 2.278 1.889 1.079 1.799 2.101 3.715 2.93 5.252z'
        driverMarkerRef.current = new window.google.maps.Marker({
          position: pos,
          map,
          title: trackData.driver?.name || 'Driver',
          icon: {
            path: carPath,
            scale: 1.3,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 1.5,
            anchor: new window.google.maps.Point(12, 12),
            rotation: trackData.driverLocation.heading || 0,
          },
          zIndex: 1000,
        })
      }
    }

    // Destination marker
    if (trackData.destination) {
      const pos = { lat: Number(trackData.destination.lat), lng: Number(trackData.destination.lng) }
      if (destMarkerRef.current) {
        destMarkerRef.current.setPosition(pos)
      } else {
        destMarkerRef.current = new window.google.maps.Marker({
          position: pos,
          map,
          title: 'Delivery Address',
          icon: {
            url: `data:image/svg+xml,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
                <path d="M16 0C8 0 2 6 2 14c0 10 14 26 14 26s14-16 14-26c0-8-6-14-14-14z" fill="#f97316"/>
                <circle cx="16" cy="14" r="8" fill="white"/>
                <path d="M16 8l-4 3v6l4 3 4-3v-6z" fill="#f97316"/>
              </svg>
            `)}`,
            scaledSize: new window.google.maps.Size(32, 40),
            anchor: new window.google.maps.Point(16, 40),
          },
          zIndex: 500,
        })
      }
    }

    // Route polyline
    if (trackData.polyline && window.google.maps.geometry?.encoding?.decodePath) {
      if (polylineRef.current) polylineRef.current.setMap(null)
      const path = window.google.maps.geometry.encoding.decodePath(trackData.polyline)
      polylineRef.current = new window.google.maps.Polyline({
        map,
        path,
        strokeColor: '#10b981',
        strokeWeight: 5,
        strokeOpacity: 0.85,
        zIndex: 5,
      })
    }

    // Fit bounds to show both markers
    if (trackData.driverLocation && trackData.destination) {
      const bounds = new window.google.maps.LatLngBounds()
      bounds.extend({ lat: Number(trackData.driverLocation.lat), lng: Number(trackData.driverLocation.lng) })
      bounds.extend({ lat: Number(trackData.destination.lat), lng: Number(trackData.destination.lng) })
      map.fitBounds(bounds, 80)
    } else if (trackData.driverLocation) {
      map.setCenter({ lat: Number(trackData.driverLocation.lat), lng: Number(trackData.driverLocation.lng) })
      map.setZoom(14)
    } else if (trackData.destination) {
      map.setCenter({ lat: Number(trackData.destination.lat), lng: Number(trackData.destination.lng) })
      map.setZoom(14)
    }
  }, [trackData])

  // ─── Render ───

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a' }}>
        <div style={{ width: 48, height: 48, border: '4px solid rgba(249,115,22,0.2)', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ color: '#94a3b8', marginTop: 16, fontSize: 16 }}>Loading tracking...</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (error && !trackData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', padding: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
        <div style={{ color: '#ef4444', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Tracking Unavailable</div>
        <div style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center' }}>{error}</div>
        <Link to="/" style={{ color: '#f97316', textDecoration: 'none', marginTop: 20, fontSize: 14 }}>← Back to Home</Link>
      </div>
    )
  }

  const order = trackData?.order
  const statusConfig = STATUS_CONFIG[order?.shipmentStatus] || STATUS_CONFIG.pending
  const eta = trackData?.eta
  const timeline = trackData?.timeline || []

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/buysiallogo.png" alt="BuySial" style={{ height: 28, filter: 'brightness(1.2)' }} onError={(e) => { e.target.style.display = 'none' }} />
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>
                Order #{order?.invoiceNumber || String(order?._id || '').slice(-6)}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                {order?.customerName} · {order?.city || ''}, {order?.orderCountry || ''}
              </div>
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 999,
            background: `${statusConfig.color}20`,
            border: `1px solid ${statusConfig.color}40`,
          }}>
            <span style={{ fontSize: 16 }}>{statusConfig.icon}</span>
            <span style={{ color: statusConfig.color, fontWeight: 600, fontSize: 13 }}>{statusConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative', minHeight: 300 }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: 300, background: '#1e293b' }} />
        {!mapLoaded && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#1e293b',
          }}>
            <div style={{ color: '#94a3b8', fontSize: 14 }}>Loading map...</div>
          </div>
        )}

        {/* ETA overlay */}
        {mapLoaded && eta && (
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 16, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 20,
            border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>{formatDistance(eta.distance?.value)}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Distance</div>
            </div>
            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#3b82f6' }}>{formatDuration(eta.duration?.value)}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ETA</div>
            </div>
          </div>
        )}

        {/* Driver arriving banner */}
        {driverArriving && (
          <div style={{
            position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: 14, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 8px 24px rgba(16,185,129,0.4)', animation: 'pulse 1.5s ease infinite',
          }}>
            <span style={{ fontSize: 20 }}>🚚</span>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>Driver is arriving soon!</span>
            <style>{`@keyframes pulse{0%,100%{transform:translateX(-50%) scale(1)}50%{transform:translateX(-50%) scale(1.03)}}`}</style>
          </div>
        )}
      </div>

      {/* Timeline & Details */}
      <div style={{
        padding: '20px',
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        maxWidth: 800, margin: '0 auto', width: '100%',
      }}>
        {/* Driver info */}
        {trackData?.driver && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14,
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', marginBottom: 16,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>🚗</div>
            <div>
              <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{trackData.driver.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: trackData.driver.isOnline ? '#10b981' : '#64748b',
                  boxShadow: trackData.driver.isOnline ? '0 0 8px #10b981' : 'none',
                }} />
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                  {trackData.driver.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            Order Timeline
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {timeline.map((item, idx) => {
              const isLast = idx === timeline.length - 1
              const icon = TIMELINE_ICONS[item.status] || '📍'
              const isActive = order?.shipmentStatus === item.status ||
                (item.status === 'delivered' && order?.shipmentStatus === 'delivered')
              return (
                <div key={idx} style={{ display: 'flex', gap: 14, position: 'relative' }}>
                  {/* Line */}
                  {!isLast && (
                    <div style={{
                      position: 'absolute', left: 17, top: 36, bottom: -8, width: 2,
                      background: 'rgba(255,255,255,0.1)',
                    }} />
                  )}
                  {/* Icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: isActive ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'rgba(255,255,255,0.05)',
                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    boxShadow: isActive ? '0 4px 12px rgba(249,115,22,0.3)' : 'none',
                  }}>
                    {icon}
                  </div>
                  {/* Content */}
                  <div style={{ paddingBottom: isLast ? 0 : 16 }}>
                    <div style={{
                      color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
                      fontWeight: isActive ? 600 : 400, fontSize: 14,
                    }}>{item.label}</div>
                    {item.timestamp && (
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 }}>
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {timeline.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No timeline data available</div>
            )}
          </div>
        </div>

        {/* Order details */}
        <div style={{
          padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
            Delivery Details
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {order?.customerAddress && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Address</span>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'right' }}>{order.customerAddress}</span>
              </div>
            )}
            {order?.total != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Total</span>
                <span style={{ color: '#10b981', fontSize: 13, fontWeight: 700 }}>{order.currency || 'AED'} {Number(order.total).toFixed(2)}</span>
              </div>
            )}
            {order?.createdAt && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Order Date</span>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
