import React, { useEffect, useState, useRef, useCallback } from 'react'
import { apiGet } from '../../api'

const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-script'

export default function LiveMap({ orders = [], driverLocation, onSelectOrder, minimal = false, activeOrderId = '', mapHeight = 400, mapCommand = null }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const routePolylinesRef = useRef([])
  const driverMarkerRef = useRef(null)
  const driverLocationRef = useRef(null)
  const hasCenteredOnDriverRef = useRef(false)
  const lastAutoViewportSignatureRef = useRef('')
  const lastHandledMapCommandRef = useRef('')
  const usesAdvancedMarkersRef = useRef(false)
  
  const [apiKey, setApiKey] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [routeInfo, setRouteInfo] = useState(null) // distance, duration
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    driverLocationRef.current = driverLocation || null
  }, [driverLocation])

  function getNumericPosition(value) {
    const lat = Number(value?.lat ?? value?.locationLat)
    const lng = Number(value?.lng ?? value?.locationLng)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng }
    }

    const coordinates = Array.isArray(value?.dropoffLocation?.coordinates)
      ? value.dropoffLocation.coordinates
      : Array.isArray(value?.coordinates)
      ? value.coordinates
      : []

    const fallbackLng = Number(coordinates?.[0])
    const fallbackLat = Number(coordinates?.[1])
    if (!Number.isFinite(fallbackLat) || !Number.isFinite(fallbackLng)) return null
    return { lat: fallbackLat, lng: fallbackLng }
  }

  function clearMapMarker(marker) {
    if (!marker) return
    try {
      if (typeof marker.setMap === 'function') marker.setMap(null)
      else marker.map = null
    } catch {}
  }

  function setMapMarkerPosition(marker, position) {
    if (!marker || !position) return
    try {
      if (typeof marker.setPosition === 'function') marker.setPosition(position)
      else marker.position = position
    } catch {}
  }

  function createMarkerContent({ background, text, size, shadow }) {
    const node = document.createElement('div')
    node.style.width = `${size}px`
    node.style.height = `${size}px`
    node.style.borderRadius = '999px'
    node.style.background = background
    node.style.border = '2px solid #ffffff'
    node.style.display = 'grid'
    node.style.placeItems = 'center'
    node.style.color = '#ffffff'
    node.style.fontWeight = '800'
    node.style.fontSize = size >= 32 ? '12px' : '11px'
    node.style.lineHeight = '1'
    node.style.boxShadow = shadow
    node.textContent = text
    return node
  }

  function createMapMarker({ position, title, color, labelText, zIndex = 1, driver = false }) {
    if (!mapInstanceRef.current || !window.google || !position) return null

    if (usesAdvancedMarkersRef.current && window.google.maps.marker?.AdvancedMarkerElement) {
      return new window.google.maps.marker.AdvancedMarkerElement({
        map: mapInstanceRef.current,
        position,
        title,
        zIndex,
        content: createMarkerContent({
          background: color,
          text: driver ? '•' : labelText,
          size: driver ? 24 : 34,
          shadow: driver ? '0 10px 24px rgba(37,99,235,0.28)' : '0 12px 26px rgba(15,23,42,0.18)',
        }),
      })
    }

    if (driver) {
      return new window.google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        title,
        zIndex,
      })
    }

    return new window.google.maps.Marker({
      position,
      map: mapInstanceRef.current,
      icon: {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 1.8,
        anchor: new window.google.maps.Point(12, 22),
      },
      title,
      label: {
        text: labelText,
        color: '#ffffff',
        fontSize: '12px',
        fontWeight: 'bold',
      },
      zIndex,
    })
  }

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

    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID)
    if (existingScript) {
      if (window.google && window.google.maps) {
        setMapLoaded(true)
      }
      const onReady = () => setMapLoaded(true)
      const onFailure = () => setError('Failed to load Google Maps. Check your API key.')
      existingScript.addEventListener('load', onReady)
      existingScript.addEventListener('error', onFailure)
      return () => {
        existingScript.removeEventListener('load', onReady)
        existingScript.removeEventListener('error', onFailure)
      }
    }

    if (window.google && window.google.maps) {
      setMapLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=geometry,marker&loading=async`
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
    if (!mapLoaded || !mapRef.current || !window.google || mapInstanceRef.current) return

    let cancelled = false

    async function initMap() {
      try {
        if (window.google.maps.importLibrary) {
          try {
            await Promise.all([
              window.google.maps.importLibrary('maps').catch(() => null),
              window.google.maps.importLibrary('marker').catch(() => null),
            ])
          } catch {}
        }

        if (cancelled) return

        usesAdvancedMarkersRef.current = Boolean(window.google.maps.marker?.AdvancedMarkerElement)
        const defaultCenter = driverLocation || { lat: 25.2048, lng: 55.2708 }

        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center: defaultCenter,
          zoom: minimal ? 11 : 10,
          minZoom: minimal ? 9 : 3,
          maxZoom: 20,
          ...(usesAdvancedMarkersRef.current ? { mapId: 'DEMO_MAP_ID' } : { styles: getMapStyles() }),
          ...(minimal
            ? {
                disableDefaultUI: true,
                zoomControl: false,
                fullscreenControl: false,
                streetViewControl: false,
                mapTypeControl: false,
                scaleControl: false,
                rotateControl: false,
                clickableIcons: false,
                keyboardShortcuts: false,
              }
            : {
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
                clickableIcons: true,
                keyboardShortcuts: true,
              }),
          gestureHandling: 'greedy',
        })
      } catch (err) {
        if (!cancelled) {
          setError('Failed to initialize Google Maps')
        }
      }
    }

    initMap()

    return () => {
      cancelled = true
    }
  }, [driverLocation, mapLoaded, minimal])

  // Add driver marker
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return

    const position = getNumericPosition(driverLocation)
    if (!position) return

    if (driverMarkerRef.current) {
      setMapMarkerPosition(driverMarkerRef.current, position)
    } else {
      driverMarkerRef.current = createMapMarker({
        position,
        title: 'Your Location',
        color: '#2563eb',
        labelText: '•',
        zIndex: 1000,
        driver: true,
      })
    }

    if (!hasCenteredOnDriverRef.current && orders.length === 0) {
      mapInstanceRef.current.setCenter(position)
      mapInstanceRef.current.setZoom(minimal ? 14 : 12)
      hasCenteredOnDriverRef.current = true
    }
  }, [driverLocation, mapLoaded, minimal, orders.length])

  const clampMapZoom = useCallback((minZoom, maxZoom) => {
    const map = mapInstanceRef.current
    if (!map) return
    const currentZoom = Number(map.getZoom())
    if (!Number.isFinite(currentZoom)) return
    if (currentZoom < minZoom) map.setZoom(minZoom)
    else if (currentZoom > maxZoom) map.setZoom(maxZoom)
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return
    const map = mapInstanceRef.current
    const minResponsiveZoom = minimal ? 9 : 3
    const listener = map.addListener('zoom_changed', () => {
      const currentZoom = Number(map.getZoom())
      if (!Number.isFinite(currentZoom)) return
      if (currentZoom < minResponsiveZoom) {
        map.setZoom(minResponsiveZoom)
      }
    })
    return () => {
      try { window.google.maps.event.removeListener(listener) } catch {}
    }
  }, [mapLoaded, minimal])

  const clearRenderedRoute = useCallback(() => {
    if (Array.isArray(routePolylinesRef.current) && routePolylinesRef.current.length) {
      routePolylinesRef.current.forEach((polyline) => {
        try {
          polyline.setMap(null)
        } catch {}
      })
    }
    routePolylinesRef.current = []
    setRouteInfo(null)
  }, [])

  const recenterOnDriver = useCallback(() => {
    const position = getNumericPosition(driverLocationRef.current)
    if (!mapInstanceRef.current || !position) return
    mapInstanceRef.current.panTo(position)
    mapInstanceRef.current.setZoom(minimal ? 15 : 13)
  }, [minimal])

  const recenterOnOrder = useCallback((order) => {
    if (!mapInstanceRef.current || !window.google || !order) return

    const orderPosition = getNumericPosition(order)
    if (!orderPosition) return

    const map = mapInstanceRef.current
    const origin = getNumericPosition(driverLocationRef.current)

    if (origin) {
      const bounds = new window.google.maps.LatLngBounds()
      bounds.extend(origin)
      bounds.extend(orderPosition)
      map.fitBounds(bounds, minimal ? 72 : 96)
      window.google.maps.event.addListenerOnce(map, 'idle', () => {
        clampMapZoom(minimal ? 11 : 6, minimal ? 17 : 16)
      })
      return
    }

    map.panTo(orderPosition)
    map.setZoom(minimal ? 15 : 13)
  }, [clampMapZoom, minimal])

  function formatDistance(distanceMeters) {
    const value = Number(distanceMeters || 0)
    if (!Number.isFinite(value) || value <= 0) return '—'
    if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)} km`
    return `${Math.round(value)} m`
  }

  function formatDuration(durationMillis) {
    const totalMinutes = Math.round(Number(durationMillis || 0) / 60000)
    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '—'
    if (totalMinutes < 60) return `${totalMinutes} min`
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`
  }

  const showRoute = useCallback(async (order) => {
    const origin = getNumericPosition(driverLocationRef.current)
    const destination = getNumericPosition(order)
    if (!mapInstanceRef.current || !origin || !destination || !window.google) {
      return
    }

    try {
      clearRenderedRoute()

      let routeDistance = 0
      let routeDuration = 0
      let rendered = false

      const routesLib = window.google.maps.importLibrary
        ? await window.google.maps.importLibrary('routes').catch(() => null)
        : null
      const RouteClass = routesLib?.Route || window.google.maps?.routes?.Route

      if (RouteClass?.computeRoutes) {
        const response = await RouteClass.computeRoutes({
          origin: {
            location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
          },
          destination: {
            location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
          },
          travelMode: 'DRIVE',
          computeAlternativeRoutes: false,
        })

        const route = response?.routes?.[0]
        if (route) {
          const encodedPolyline = route.polyline?.encodedPolyline
          if (encodedPolyline && window.google.maps.geometry?.encoding?.decodePath) {
            const path = window.google.maps.geometry.encoding.decodePath(encodedPolyline)
            const polyline = new window.google.maps.Polyline({
              map: mapInstanceRef.current,
              path,
              strokeColor: '#10b981',
              strokeWeight: minimal ? 6 : 5,
              strokeOpacity: 0.88,
              zIndex: 5,
            })
            routePolylinesRef.current = [polyline]
          }
          const leg = route.legs?.[0]
          routeDistance = Number(leg?.distanceMeters || 0)
          const legDuration = leg?.duration
          if (typeof legDuration === 'string') {
            routeDuration = (parseFloat(legDuration) || 0) * 1000
          } else {
            routeDuration = Number(legDuration?.seconds || 0) * 1000
          }
          rendered = true
        }
      }

      const bounds = new window.google.maps.LatLngBounds()
      bounds.extend(origin)
      bounds.extend(destination)
      mapInstanceRef.current.fitBounds(bounds, minimal ? 60 : 72)
      window.google.maps.event.addListenerOnce(mapInstanceRef.current, 'idle', () => {
        clampMapZoom(minimal ? 10 : 5, minimal ? 16 : 15)
      })

      if (rendered) {
        setRouteInfo({
          distance: formatDistance(routeDistance),
          duration: formatDuration(routeDuration),
          distanceValue: routeDistance,
          durationValue: routeDuration,
        })
      }
    } catch (err) {
      const message = String(err?.message || '')
      if (message.includes('ZERO_RESULTS') || message.includes('No route could be found')) {
        clearRenderedRoute()
        recenterOnOrder(order)
        return
      }
      console.error('Failed to get directions:', err)
      setRouteInfo(null)
    }
  }, [clampMapZoom, clearRenderedRoute, minimal, recenterOnOrder])

  // Add order markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return
    
    // Clear existing markers
    markersRef.current.forEach(clearMapMarker)
    markersRef.current = []
    
    orders.forEach((order, index) => {
      const position = getNumericPosition(order)
      if (!position) return

      const marker = createMapMarker({
        position,
        title: order.customerName || `Order #${index + 1}`,
        color: String(selectedOrder?._id || selectedOrder?.id || '') === String(order?._id || order?.id || '') ? '#10b981' : '#ef4444',
        labelText: String(index + 1),
        zIndex: String(selectedOrder?._id || selectedOrder?.id || '') === String(order?._id || order?.id || '') ? 25 : 10,
      })
      if (!marker) return

      const handleSelect = () => {
        clearRenderedRoute()
        setSelectedOrder(order)
        onSelectOrder?.(order)
      }

      if (usesAdvancedMarkersRef.current && typeof marker.addEventListener === 'function') {
        marker.addEventListener('gmp-click', handleSelect)
      } else if (typeof marker.addListener === 'function') {
        marker.addListener('click', handleSelect)
      }
      
      markersRef.current.push(marker)
    })
  }, [clearMapMarker, clearRenderedRoute, mapLoaded, onSelectOrder, orders, selectedOrder])

  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return
    if (String(activeOrderId || '').trim()) return

    const mappableOrders = orders
      .map((order) => ({ order, position: getNumericPosition(order) }))
      .filter((entry) => !!entry.position)
    const signature = [...mappableOrders]
      .sort((a, b) => String(a?.order?._id || a?.order?.id || '').localeCompare(String(b?.order?._id || b?.order?.id || '')))
      .map((entry) => `${String(entry?.order?._id || entry?.order?.id || '')}:${Number(entry.position.lat).toFixed(4)}:${Number(entry.position.lng).toFixed(4)}`)
      .join('|')

    if (!signature && !driverLocation) return
    if (signature === lastAutoViewportSignatureRef.current && mappableOrders.length > 0) return

    if (mappableOrders.length === 0 && driverLocation) {
      mapInstanceRef.current.setCenter(driverLocation)
      mapInstanceRef.current.setZoom(minimal ? 14 : 12)
      lastAutoViewportSignatureRef.current = '__driver_only__'
      hasCenteredOnDriverRef.current = true
      return
    }

    try {
      const bounds = new window.google.maps.LatLngBounds()
      const shouldIncludeDriver = !!driverLocation && mappableOrders.length <= 8
      if (shouldIncludeDriver) bounds.extend(driverLocation)
      mappableOrders.forEach((entry) => {
        bounds.extend(entry.position)
      })
      mapInstanceRef.current.fitBounds(bounds, minimal ? 28 : 50)
      window.google.maps.event.addListenerOnce(mapInstanceRef.current, 'idle', () => {
        clampMapZoom(minimal ? 9 : 5, minimal ? 16 : 15)
      })
      lastAutoViewportSignatureRef.current = signature
    } catch {}
  }, [activeOrderId, clampMapZoom, driverLocation, mapLoaded, minimal, orders])

  // Clear route
  const clearRoute = useCallback(() => {
    clearRenderedRoute()
    setSelectedOrder(null)
    lastAutoViewportSignatureRef.current = ''
  }, [clearRenderedRoute])

  useEffect(() => {
    const targetId = String(activeOrderId || '').trim()
    if (!targetId) {
      if (selectedOrder) setSelectedOrder(null)
      if (routeInfo) clearRenderedRoute()
      return
    }
    const next = orders.find((order) => String(order?._id || order?.id || '') === targetId)
    if (!next) {
      clearRoute()
      return
    }
    if (String(selectedOrder?._id || selectedOrder?.id || '') === targetId) return
    clearRenderedRoute()
    setSelectedOrder(next)
  }, [activeOrderId, clearRenderedRoute, clearRoute, orders, routeInfo, selectedOrder])

  useEffect(() => {
    if (!mapCommand || !mapInstanceRef.current || !window.google) return

    const requestId = String(mapCommand?.requestId || '').trim()
    if (requestId && requestId === lastHandledMapCommandRef.current) return

    const targetId = String(mapCommand?.orderId || '').trim()
    const targetOrder = targetId
      ? orders.find((order) => String(order?._id || order?.id || '') === targetId)
      : null

    if (requestId) {
      lastHandledMapCommandRef.current = requestId
    }

    if (mapCommand.type === 'recenter') {
      if (targetOrder) {
        recenterOnOrder(targetOrder)
      } else {
        recenterOnDriver()
      }
      return
    }

    if (mapCommand.type === 'show_route' && targetOrder) {
      setSelectedOrder(targetOrder)
      showRoute(targetOrder)
    }
  }, [mapCommand, orders, recenterOnDriver, recenterOnOrder, showRoute])

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
        height: mapHeight,
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
            height: mapHeight,
            background: '#1e293b'
          }} 
        />
        
        {/* CSS to hide Google branding */}
        <style>{`
          .gm-style img {
            max-width: none !important;
          }
        `}</style>
        
        {/* Buysial Logo Overlay */}
        {!minimal && (
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
        )}
        
        {/* Premium Center on Me Button */}
        <button
          onClick={() => {
            if (selectedOrder) {
              recenterOnOrder(selectedOrder)
            } else {
              recenterOnDriver()
            }
          }}
          style={{
            position: 'absolute',
            top: minimal ? 12 : undefined,
            bottom: minimal ? undefined : 12,
            right: 12,
            width: minimal ? 44 : 40,
            height: minimal ? 44 : 40,
            borderRadius: minimal ? 14 : 10,
            border: '1px solid rgba(59,130,246,0.3)',
            background: minimal ? 'rgba(255,255,255,0.92)' : 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(29,78,216,0.3))',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: '#2563eb',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            boxShadow: minimal ? '0 10px 24px rgba(15,23,42,0.18)' : '0 4px 12px rgba(59,130,246,0.3)'
          }}
          title={selectedOrder ? 'Recenter Map' : 'Center on Me'}
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
      {!minimal && routeInfo && selectedOrder && (
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
      {!minimal && (
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
      )}
    </div>
  )
}
