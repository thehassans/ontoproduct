import React, { useEffect, useState, useRef, useCallback } from 'react'
import { apiGet } from '../../api'

const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-script'

export default function LiveMap({ orders = [], driverLocation, onSelectOrder }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const directionsRendererRef = useRef(null)
  const driverMarkerRef = useRef(null)
  
  const [apiKey, setApiKey] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [routeInfo, setRouteInfo] = useState(null) // distance, duration
  const [mapLoaded, setMapLoaded] = useState(false)

  // Load Google Maps API key from backend
  useEffect(() => {
    async function loadApiKey() {
      try {
        const res = await apiGet('/api/settings/maps-key')
        if (res?.apiKey) {
          setApiKey(res.apiKey)
        } else {
          setError('Google Maps API key not configured. Please add it in User Panel → API Setup.')
        }
      } catch (err) {
        setError('Failed to load Maps API key: ' + (err.message || 'Unknown error'))
      } finally {
        setLoading(false)
      }
    }
    loadApiKey()
  }, [])

  // Load Google Maps script
  useEffect(() => {
    if (!apiKey) return
    
    // Check if script already exists
    if (document.getElementById(GOOGLE_MAPS_SCRIPT_ID)) {
      if (window.google && window.google.maps) {
        setMapLoaded(true)
      }
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`
    script.async = true
    script.defer = true
    script.onload = () => setMapLoaded(true)
    script.onerror = () => setError('Failed to load Google Maps. Check your API key.')
    document.head.appendChild(script)
    
    return () => {
      // Don't remove script on unmount - it can be reused
    }
  }, [apiKey])

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.google) return
    
    const defaultCenter = driverLocation || { lat: 25.2048, lng: 55.2708 } // Dubai default
    
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 10,
      minZoom: 3,
      maxZoom: 20,
      styles: getMapStyles(),
      // Enable all standard Google Maps controls
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: window.google.maps.ControlPosition.TOP_LEFT,
        mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain']
      },
      fullscreenControl: true,
      fullscreenControlOptions: {
        position: window.google.maps.ControlPosition.TOP_RIGHT
      },
      streetViewControl: true,
      streetViewControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_BOTTOM
      },
      zoomControl: true,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_CENTER
      },
      scaleControl: true,
      rotateControl: true,
      gestureHandling: 'greedy',
      clickableIcons: true,
      keyboardShortcuts: true
    })
    
    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      map: mapInstanceRef.current,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#10b981',
        strokeWeight: 5,
        strokeOpacity: 0.8
      }
    })
    
  }, [mapLoaded, driverLocation])

  // Add driver marker
  useEffect(() => {
    if (!mapInstanceRef.current || !driverLocation || !window.google) return
    
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setPosition(driverLocation)
    } else {
      driverMarkerRef.current = new window.google.maps.Marker({
        position: driverLocation,
        map: mapInstanceRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        title: 'Your Location',
        zIndex: 1000
      })
    }
    
    // Center map on driver
    mapInstanceRef.current.panTo(driverLocation)
  }, [driverLocation, mapLoaded])

  // Add order markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return
    
    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
    
    const bounds = new window.google.maps.LatLngBounds()
    if (driverLocation) {
      bounds.extend(driverLocation)
    }
    
    orders.forEach((order, index) => {
      if (!order.locationLat || !order.locationLng) return
      
      const position = { lat: order.locationLat, lng: order.locationLng }
      bounds.extend(position)
      
      const marker = new window.google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        icon: {
          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
          fillColor: selectedOrder?._id === order._id ? '#10b981' : '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 1.8,
          anchor: new window.google.maps.Point(12, 22),
        },
        title: order.customerName || `Order #${index + 1}`,
        label: {
          text: String(index + 1),
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: 'bold'
        }
      })
      
      marker.addListener('click', () => {
        setSelectedOrder(order)
        onSelectOrder?.(order)
        showRoute(order)
      })
      
      markersRef.current.push(marker)
    })
    
    // Fit bounds if we have markers
    if (orders.length > 0 || driverLocation) {
      try {
        mapInstanceRef.current.fitBounds(bounds, { padding: 50 })
        // Prevent too much zoom in
        const listener = mapInstanceRef.current.addListener('idle', () => {
          if (mapInstanceRef.current.getZoom() > 15) {
            mapInstanceRef.current.setZoom(15)
          }
          window.google.maps.event.removeListener(listener)
        })
      } catch {}
    }
  }, [orders, driverLocation, mapLoaded, selectedOrder])

  // Show route to selected order
  const showRoute = useCallback(async (order) => {
    if (!mapInstanceRef.current || !driverLocation || !order.locationLat || !order.locationLng || !window.google) {
      return
    }
    
    const directionsService = new window.google.maps.DirectionsService()
    
    try {
      const result = await directionsService.route({
        origin: driverLocation,
        destination: { lat: order.locationLat, lng: order.locationLng },
        travelMode: window.google.maps.TravelMode.DRIVING,
      })
      
      directionsRendererRef.current.setDirections(result)
      
      // Extract route info
      const leg = result.routes[0]?.legs[0]
      if (leg) {
        setRouteInfo({
          distance: leg.distance?.text || 'Unknown',
          duration: leg.duration?.text || 'Unknown',
          distanceValue: leg.distance?.value || 0,
          durationValue: leg.duration?.value || 0
        })
      }
    } catch (err) {
      console.error('Failed to get directions:', err)
      setRouteInfo(null)
    }
  }, [driverLocation])

  // Clear route
  const clearRoute = useCallback(() => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ routes: [] })
    }
    setSelectedOrder(null)
    setRouteInfo(null)
  }, [])

  // Map styles (dark mode friendly)
  function getMapStyles() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    if (!isDark) return []
    
    return [
      { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
      { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c4a6e' }] },
      { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1e3a3a' }] },
    ]
  }

  if (loading) {
    return (
      <div style={{
        height: 400,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--panel)',
        borderRadius: 16,
        border: '1px solid var(--border)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ color: 'var(--muted)' }}>Loading map...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        padding: 24,
        background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(220,38,38,0.05))',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 16,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🗺️</div>
        <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: 8 }}>Map Not Available</div>
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>{error}</div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--panel)',
      borderRadius: 16,
      border: '1px solid var(--border)',
      overflow: 'hidden'
    }}>
      {/* Map Container with hidden Google branding */}
      <div style={{ position: 'relative' }}>
        <div 
          ref={mapRef} 
          style={{ 
            width: '100%', 
            height: 400,
            background: '#1e293b'
          }} 
        />
        
        {/* CSS to hide Google branding */}
        <style>{`
          .gm-style-cc, .gmnoprint, .gm-style a[href*="google"], 
          .gm-style a[href*="terms"], .gm-style img[alt*="Google"],
          .gm-style-cc + div { display: none !important; }
          .gm-style > div:last-child { display: none !important; }
        `}</style>
        
        {/* Buysial Logo Overlay */}
        <div style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: 8,
          padding: '4px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <img 
            src="/buysiallogo.png" 
            alt="Buysial" 
            style={{ 
              height: 16, 
              opacity: 0.8,
              filter: 'brightness(1.2)'
            }} 
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <span style={{ 
            fontSize: 10, 
            color: 'rgba(255,255,255,0.6)',
            fontWeight: 500,
            letterSpacing: '0.5px'
          }}>
            Buysial
          </span>
        </div>
        
        {/* Premium Center on Me Button */}
        <button
          onClick={() => {
            if (mapInstanceRef.current && driverLocation) {
              mapInstanceRef.current.panTo(driverLocation)
              mapInstanceRef.current.setZoom(15)
            }
          }}
          style={{
            position: 'absolute',
            bottom: 8,
            right: 50,
            width: 40,
            height: 40,
            borderRadius: 10,
            border: '1px solid rgba(59,130,246,0.3)',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(29,78,216,0.3))',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: '#3b82f6',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
          }}
          title="Center on Me"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4" />
            <path d="M12 18v4" />
            <path d="M2 12h4" />
            <path d="M18 12h4" />
          </svg>
        </button>
      </div>
      
      {/* Ultra Premium Route Info Panel */}
      {routeInfo && selectedOrder && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}>
          {/* Stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981', letterSpacing: '-0.5px' }}>{routeInfo.distance}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Distance</div>
            </div>
            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6', letterSpacing: '-0.5px' }}>{routeInfo.duration}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ETA</div>
            </div>
            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{selectedOrder.customerName || 'Customer'}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{selectedOrder.city || 'Location'}</div>
            </div>
          </div>
          
          {/* Premium Action Icons */}
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
              onClick={clearRoute}
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
              title="Clear"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Minimal Legend */}
      <div style={{
        padding: '8px 16px',
        background: 'rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 6px rgba(59,130,246,0.6)' }} />
          <span>You</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
          <span>Deliveries</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
          <span>Active</span>
        </div>
        <span style={{ marginLeft: 'auto', opacity: 0.6, fontSize: 10 }}>
          {orders.length} • Tap to route
        </span>
      </div>
    </div>
  )
}
