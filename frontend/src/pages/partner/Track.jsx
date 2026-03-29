import React, { useEffect, useMemo, useRef, useState } from 'react'
import { apiGet } from '../../api'
import { heroStyle, pageWrapStyle, panelStyle, sectionTitle, secondaryButtonStyle } from './shared.jsx'

// Removed google maps logic

function getLatLng(entry) {
  const directLat = Number(entry?.lastLocation?.lat)
  const directLng = Number(entry?.lastLocation?.lng)
  if (Number.isFinite(directLat) && Number.isFinite(directLng)) return { lat: directLat, lng: directLng }
  const coords = entry?.lastKnownLocation?.coordinates
  if (Array.isArray(coords) && coords.length >= 2) {
    const lng = Number(coords[0])
    const lat = Number(coords[1])
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  }
  return null
}

function getOrderLatLng(order) {
  const lat = Number(order?.locationLat)
  const lng = Number(order?.locationLng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
  const coords = order?.driverTracking?.currentLocation?.coordinates
  if (Array.isArray(coords) && coords.length >= 2) {
    const lng2 = Number(coords[0])
    const lat2 = Number(coords[1])
    if (Number.isFinite(lat2) && Number.isFinite(lng2)) return { lat: lat2, lng: lng2 }
  }
  return null
}

export default function PartnerTrack() {
  const [apiKey, setApiKey] = useState('')
  const [drivers, setDrivers] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [mapError, setMapError] = useState('')
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])

  async function loadData() {
    setLoading(true)
    try {
      const [keyRes, driverRes, orderRes] = await Promise.all([
        apiGet('/api/settings/maps-key'),
        apiGet('/api/partners/me/tracking/drivers'),
        apiGet('/api/partners/me/tracking/orders'),
      ])
      setApiKey(keyRes?.apiKey || '')
      setDrivers(Array.isArray(driverRes?.users) ? driverRes.users : [])
      setOrders(Array.isArray(orderRes?.orders) ? orderRes.orders : [])
    } catch (err) {
      setMapError(err?.message || 'Failed to load tracking data')
      setDrivers([])
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const points = useMemo(() => {
    const driverPoints = drivers.map((driver) => ({ type: 'driver', data: driver, position: getLatLng(driver) })).filter((entry) => entry.position)
    const orderPoints = orders.map((order) => ({ type: 'order', data: order, position: getOrderLatLng(order) })).filter((entry) => entry.position)
    return [...driverPoints, ...orderPoints]
  }, [drivers, orders])

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!mapRef.current || !points.length) return
      try {
        if (!alive || !window.L) return
        const L = window.L

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = L.map(mapRef.current, {
            center: [points[0]?.position?.lat || 24.7136, points[0]?.position?.lng || 46.6753],
            zoom: 6,
          })
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(mapInstanceRef.current)
        }

        // Clear existing markers
        markersRef.current.forEach((m) => {
          try {
            mapInstanceRef.current.removeLayer(m)
          } catch {}
        })
        markersRef.current = []

        const bounds = L.latLngBounds()
        for (const point of points) {
          const latLng = [point.position.lat, point.position.lng]
          bounds.extend(latLng)
          
          const label =
            point.type === 'driver'
              ? `${point.data?.firstName || ''} ${point.data?.lastName || ''}`.trim() || 'Driver'
              : `#${point.data?.invoiceNumber || String(point.data?._id || '').slice(-6)}`

          const color = point.type === 'driver' ? '#2563eb' : '#ea580c'
          
          const marker = L.circleMarker(latLng, {
            radius: point.type === 'driver' ? 10 : 8,
            fillColor: color,
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
          })
            .bindPopup(`<b>${label}</b><br/><span style="text-transform:capitalize">${point.type}</span>`)
            .addTo(mapInstanceRef.current)

          markersRef.current.push(marker)
        }

        if (points.length === 1) {
          mapInstanceRef.current.setView([points[0].position.lat, points[0].position.lng], 11)
        } else if (points.length > 1) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] })
        }
      } catch (err) {
        if (alive) setMapError(err?.message || 'Maps failed to load')
      }
    })()
    return () => {
      alive = false
    }
  }, [points])

  return (
    <div style={pageWrapStyle()}>
      <div style={heroStyle()}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(226,232,240,0.78)' }}>Track</div>
          <div style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 950, letterSpacing: '-0.05em' }}>Live partner tracking</div>
          <div style={{ color: 'rgba(226,232,240,0.84)', maxWidth: 720, fontSize: 15 }}>Track your drivers and country orders on Google Maps in one focused view.</div>
        </div>
      </div>
      <section style={panelStyle()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {sectionTitle('Live map', 'Driver and order markers refresh from your partner-scoped tracking feeds.')}
          <button className="btn secondary" style={secondaryButtonStyle()} onClick={loadData}>Refresh</button>
        </div>
        {loading ? <div style={{ color: '#64748b', marginTop: 16 }}>Loading tracking…</div> : null}
        {mapError ? <div style={{ color: '#b91c1c', marginTop: 16 }}>{mapError}</div> : null}
        <div ref={mapRef} style={{ marginTop: 18, minHeight: 460, width: '100%', borderRadius: 22, overflow: 'hidden', background: '#e2e8f0' }} />
        <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
          {points.map((point, index) => (
            <div key={`${point.type}-${index}`} style={{ border: '1px solid rgba(148,163,184,0.16)', borderRadius: 18, padding: 14, display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>{point.type === 'driver' ? `${point.data?.firstName || ''} ${point.data?.lastName || ''}`.trim() || 'Driver' : `#${point.data?.invoiceNumber || String(point.data?._id || '').slice(-6)}`}</div>
              <div style={{ color: '#64748b', fontSize: 13 }}>{point.type === 'driver' ? point.data?.phone || '-' : [point.data?.customerName, point.data?.customerPhone, point.data?.orderCountry].filter(Boolean).join(' · ')}</div>
            </div>
          ))}
          {!points.length && !loading ? <div style={{ color: '#64748b' }}>No live coordinates are available yet for your drivers or country orders.</div> : null}
        </div>
      </section>
    </div>
  )
}
