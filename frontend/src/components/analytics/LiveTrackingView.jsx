import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { apiGet } from '../../api'
import { io } from 'socket.io-client'

const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-script-insights'

// Country coordinates for map centering
const COUNTRY_CENTERS = {
  'All': { lat: 24.5, lng: 54.5, zoom: 5 },
  'KSA': { lat: 24.7136, lng: 46.6753, zoom: 6 },
  'Saudi Arabia': { lat: 24.7136, lng: 46.6753, zoom: 6 },
  'UAE': { lat: 25.2048, lng: 55.2708, zoom: 7 },
  'United Arab Emirates': { lat: 25.2048, lng: 55.2708, zoom: 7 },
  'Oman': { lat: 21.4735, lng: 55.9754, zoom: 6 },
  'Bahrain': { lat: 26.0667, lng: 50.5577, zoom: 10 },
  'India': { lat: 20.5937, lng: 78.9629, zoom: 5 },
  'Kuwait': { lat: 29.3759, lng: 47.9774, zoom: 8 },
  'Qatar': { lat: 25.2854, lng: 51.531, zoom: 9 },
  'Pakistan': { lat: 30.3753, lng: 69.3451, zoom: 5 },
  'Jordan': { lat: 30.5852, lng: 36.2384, zoom: 7 },
  'UK': { lat: 51.5074, lng: -0.1278, zoom: 6 },
  'USA': { lat: 37.0902, lng: -95.7129, zoom: 4 },
  'Canada': { lat: 56.1304, lng: -106.3468, zoom: 4 },
  'Australia': { lat: -25.2744, lng: 133.7751, zoom: 4 },
}

// City coordinates for accurate order placement
const CITY_COORDS = {
  // Saudi Arabia
  'Riyadh': { lat: 24.7136, lng: 46.6753 },
  'Jeddah': { lat: 21.4858, lng: 39.1925 },
  'Mecca': { lat: 21.3891, lng: 39.8579 },
  'Medina': { lat: 24.5247, lng: 39.5692 },
  'Dammam': { lat: 26.4207, lng: 50.0888 },
  'Khobar': { lat: 26.2172, lng: 50.1971 },
  'Dhahran': { lat: 26.2361, lng: 50.0393 },
  'Tabuk': { lat: 28.3838, lng: 36.5550 },
  'Abha': { lat: 18.2164, lng: 42.5053 },
  'Khamis Mushait': { lat: 18.3066, lng: 42.7296 },
  // UAE
  'Dubai': { lat: 25.2048, lng: 55.2708 },
  'Abu Dhabi': { lat: 24.4539, lng: 54.3773 },
  'Sharjah': { lat: 25.3463, lng: 55.4209 },
  'Ajman': { lat: 25.4052, lng: 55.5136 },
  'Ras Al Khaimah': { lat: 25.7895, lng: 55.9432 },
  'Fujairah': { lat: 25.1288, lng: 56.3265 },
  // Oman
  'Muscat': { lat: 23.5880, lng: 58.3829 },
  'Salalah': { lat: 17.0151, lng: 54.0924 },
  'Sohar': { lat: 24.3461, lng: 56.7075 },
  // Bahrain
  'Manama': { lat: 26.2285, lng: 50.5860 },
  'Riffa': { lat: 26.1300, lng: 50.5550 },
  // Kuwait
  'Kuwait City': { lat: 29.3759, lng: 47.9774 },
  // Qatar
  'Doha': { lat: 25.2854, lng: 51.5310 },
  // India
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Delhi': { lat: 28.7041, lng: 77.1025 },
  'Bangalore': { lat: 12.9716, lng: 77.5946 },
  'Chennai': { lat: 13.0827, lng: 80.2707 },
  'Hyderabad': { lat: 17.3850, lng: 78.4867 },
  // Pakistan
  'Karachi': { lat: 24.8607, lng: 67.0011 },
  'Lahore': { lat: 31.5497, lng: 74.3436 },
  'Islamabad': { lat: 33.6844, lng: 73.0479 },
  // Jordan
  'Amman': { lat: 31.9454, lng: 35.9284 },
}

// Helper to normalize country names for comparison
const normalizeCountry = (country) => {
  if (!country) return ''
  const c = country.toLowerCase().trim()
  if (c === 'ksa' || c === 'saudi arabia' || c === 'saudi' || c === 'sa') return 'KSA'
  if (c === 'uae' || c === 'united arab emirates' || c === 'emirates') return 'UAE'
  if (c === 'oman' || c === 'om') return 'Oman'
  if (c === 'bahrain' || c === 'bh') return 'Bahrain'
  if (c === 'kuwait' || c === 'kw') return 'Kuwait'
  if (c === 'qatar' || c === 'qa') return 'Qatar'
  if (c === 'india' || c === 'in') return 'India'
  if (c === 'pakistan' || c === 'pk') return 'Pakistan'
  if (c === 'jordan' || c === 'jo') return 'Jordan'
  if (c === 'uk' || c === 'united kingdom' || c === 'gb' || c === 'britain') return 'UK'
  if (c === 'usa' || c === 'united states' || c === 'us' || c === 'america') return 'USA'
  if (c === 'canada' || c === 'ca') return 'Canada'
  if (c === 'australia' || c === 'au') return 'Australia'
  return country
}

const normalizeStatus = (status) => {
  const s = String(status || 'pending')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')

  if (s === 'canceled') return 'cancelled'
  if (s === 'out_for_delivery' || s === 'outfordelivery' || s === 'out-for-delivery') return 'out_for_delivery'
  if (s === 'picked_up' || s === 'pickedup' || s === 'picked-up') return 'picked_up'
  return s
}

// Status colors for order markers
const STATUS_COLORS = {
  pending: '#f59e0b',
  assigned: '#3b82f6',
  picked_up: '#8b5cf6',
  out_for_delivery: '#f97316',
  delivered: '#10b981',
  cancelled: '#ef4444',
  returned: '#64748b',
}

// Premium styles
const premiumStyles = {
  sidebar: {
    background: 'linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.95) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRight: '1px solid rgba(255,255,255,0.08)',
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16,
  },
  input: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    color: 'white',
    transition: 'all 0.2s ease',
  },
  button: {
    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    boxShadow: '0 8px 32px rgba(249,115,22,0.35)',
    border: 'none',
    borderRadius: 14,
    color: 'white',
    fontWeight: 600,
    transition: 'all 0.3s ease',
  },
  statCard: (color) => ({
    background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
    border: `1px solid ${color}25`,
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  }),
  glowDot: (color) => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: color,
    boxShadow: `0 0 12px ${color}, 0 0 24px ${color}60`,
  }),
}

const LiveTrackingView = () => {
  const [loading, setLoading] = useState(true)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [apiKey, setApiKey] = useState(null)
  const [drivers, setDrivers] = useState([])
  const [orders, setOrders] = useState([])
  const [selectedCountry, setSelectedCountry] = useState('All')
  const [selectedDriver, setSelectedDriver] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [showDrivers, setShowDrivers] = useState(true)
  const [showOrders, setShowOrders] = useState(true)
  const [includeApprox, setIncludeApprox] = useState(false)
  const [stats, setStats] = useState({ drivers: 0, orders: 0, delivered: 0, inTransit: 0 })
  
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const socketRef = useRef(null)

  // Load Google Maps API key
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const res = await apiGet('/api/settings/maps-key')
        if (res?.apiKey) {
          setApiKey(res.apiKey)
        }
      } catch (err) {
        console.error('Failed to load Maps API key:', err)
      }
    }
    loadApiKey()
  }, [])

  // Load Google Maps script
  useEffect(() => {
    if (!apiKey) return
    if (document.getElementById(GOOGLE_MAPS_SCRIPT_ID)) {
      if (window.google?.maps) setMapLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`
    script.async = true
    script.defer = true
    script.onload = () => setMapLoaded(true)
    script.onerror = () => console.error('Failed to load Google Maps')
    document.head.appendChild(script)
  }, [apiKey])

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return

    const center = COUNTRY_CENTERS[selectedCountry] || COUNTRY_CENTERS['All']
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: center.lat, lng: center.lng },
      zoom: center.zoom,
      styles: getMapStyles(),
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    })
  }, [mapLoaded])

  // Update map center when country changes
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const center = COUNTRY_CENTERS[selectedCountry] || COUNTRY_CENTERS['All']
    mapInstanceRef.current.panTo({ lat: center.lat, lng: center.lng })
    mapInstanceRef.current.setZoom(center.zoom)
  }, [selectedCountry])

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load drivers - backend returns { users: [...] }
      const driversRes = await apiGet('/api/users/drivers')
      const driversList = Array.isArray(driversRes) ? driversRes : driversRes?.users || driversRes?.drivers || []
      setDrivers(driversList)

      // Load ALL orders first for accurate stats, then filter for display
      const ordersRes = await apiGet('/api/orders?limit=2000')
      const allOrders = Array.isArray(ordersRes) ? ordersRes : ordersRes?.orders || []
      setOrders(allOrders)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredDrivers = useMemo(() => {
    const filterCountry = normalizeCountry(selectedCountry)
    return drivers.filter((d) => {
      if (selectedCountry !== 'All') {
        const driverCountry = normalizeCountry(d.country)
        if (driverCountry !== filterCountry) return false
      }
      if (selectedDriver !== 'All' && String(d._id) !== String(selectedDriver)) return false
      return true
    })
  }, [drivers, selectedCountry, selectedDriver])

  const driversByCountry = useMemo(() => {
    const filterCountry = normalizeCountry(selectedCountry)
    return drivers.filter((d) => {
      if (selectedCountry === 'All') return true
      return normalizeCountry(d.country) === filterCountry
    })
  }, [drivers, selectedCountry])

  const filteredOrders = useMemo(() => {
    const filterCountry = normalizeCountry(selectedCountry)
    const filterStatus = String(selectedStatus || '').toLowerCase()
    const filterDriver = String(selectedDriver || '')

    return orders.filter((o) => {
      if (selectedCountry !== 'All') {
        const orderCountryNorm = normalizeCountry(o.country || o.orderCountry)
        if (orderCountryNorm !== filterCountry) return false
      }

      const orderStatus = normalizeStatus(o.shipmentStatus || o.status || 'pending')
      if (selectedStatus !== 'All' && orderStatus !== filterStatus) return false

      if (selectedDriver !== 'All') {
        const driverId = String(o.deliveryBoy?._id || o.deliveryBoy || o.driver?._id || o.driver || '')
        if (driverId !== filterDriver) return false
      }

      return true
    })
  }, [orders, selectedCountry, selectedStatus, selectedDriver])

  useEffect(() => {
    const activeStatuses = new Set(['assigned', 'picked_up', 'out_for_delivery'])
    const driversWithActiveOrders = new Set(
      filteredOrders
        .filter((o) => activeStatuses.has(normalizeStatus(o.shipmentStatus || o.status || '')) && (o.deliveryBoy || o.driver))
        .map((o) => String(o.deliveryBoy?._id || o.deliveryBoy || o.driver?._id || o.driver))
    )

    const delivered = filteredOrders.filter((o) => normalizeStatus(o.shipmentStatus || o.status || '') === 'delivered').length
    const inTransit = filteredOrders.filter((o) => activeStatuses.has(normalizeStatus(o.shipmentStatus || o.status || ''))).length

    setStats({
      drivers: driversWithActiveOrders.size || filteredDrivers.length,
      orders: filteredOrders.length,
      delivered,
      inTransit,
    })
  }, [filteredDrivers, filteredOrders])

  // Update markers on map
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return

    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    // Add driver markers with car icon
    if (showDrivers) {
      filteredDrivers.forEach(driver => {
        // Get driver position - use lastLocation if available, otherwise use city or country center
        let driverLat = Number(driver.lastLocation?.lat)
        let driverLng = Number(driver.lastLocation?.lng)
        if (!Number.isFinite(driverLat)) driverLat = null
        if (!Number.isFinite(driverLng)) driverLng = null
        
        if (!driverLat || !driverLng) {
          if (!includeApprox) return
          // Try city coordinates first
          const cityCoords = CITY_COORDS[driver.city]
          if (cityCoords) {
            driverLat = cityCoords.lat
            driverLng = cityCoords.lng
          } else {
            // Fall back to country center
            const driverCountry = normalizeCountry(driver.country)
            const countryCenter = COUNTRY_CENTERS[driverCountry] || COUNTRY_CENTERS['All']
            driverLat = countryCenter.lat
            driverLng = countryCenter.lng
          }
        }
        
        if (!driverLat || !driverLng) return
        
        // Car SVG path for premium look
        const carPath = 'M23.5 7c.276 0 .5.224.5.5v.511c0 .793-.926.989-1.616.989l-1.086-2h2.202zm-1.441 3.506c.639 1.186.946 2.252.946 3.666 0 1.37-.397 2.533-1.005 3.981v1.847c0 .552-.448 1-1 1h-1.5c-.552 0-1-.448-1-1v-1h-13v1c0 .552-.448 1-1 1h-1.5c-.552 0-1-.448-1-1v-1.847c-.608-1.448-1.005-2.611-1.005-3.981 0-1.414.307-2.48.946-3.666.829-1.537 1.851-3.453 2.93-5.252.828-1.382 1.262-1.707 2.278-1.889 1.532-.275 2.918-.365 4.851-.365s3.319.09 4.851.365c1.016.182 1.45.507 2.278 1.889 1.079 1.799 2.101 3.715 2.93 5.252zm-16.059 2.994c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5.672 1.5 1.5 1.5 1.5-.672 1.5-1.5zm10 1c0-.276-.224-.5-.5-.5h-7c-.276 0-.5.224-.5.5s.224.5.5.5h7c.276 0 .5-.224.5-.5zm2.941-5.527s-.74-1.826-1.631-3.142c-.202-.298-.515-.502-.869-.566-1.511-.272-2.835-.359-4.441-.359s-2.93.087-4.441.359c-.354.063-.667.267-.869.566-.891 1.315-1.631 3.142-1.631 3.142 1.64.313 4.309.527 6.941.527s5.301-.214 6.941-.527zm2.059 4.527c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5.672 1.5 1.5 1.5 1.5-.672 1.5-1.5zm-18.298-6.5h-2.202c-.276 0-.5.224-.5.5v.511c0 .793.926.989 1.616.989l1.086-2z'
        
        const marker = new window.google.maps.Marker({
          position: { lat: driverLat, lng: driverLng },
          map: mapInstanceRef.current,
          title: driver.name || driver.firstName || 'Driver',
          icon: {
            path: carPath,
            scale: 1.2,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 1.5,
            anchor: new window.google.maps.Point(12, 12),
            rotation: driver.lastLocation?.heading || 0,
          },
          zIndex: 1000,
        })

        const driverName = driver.firstName ? `${driver.firstName} ${driver.lastName || ''}`.trim() : driver.name || 'Driver'
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 16px; min-width: 200px; font-family: system-ui, sans-serif;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <div style="width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); display: flex; align-items: center; justify-content: center;">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M23.5 7c.276 0 .5.224.5.5v.511c0 .793-.926.989-1.616.989l-1.086-2h2.202zm-1.441 3.506c.639 1.186.946 2.252.946 3.666 0 1.37-.397 2.533-1.005 3.981v1.847c0 .552-.448 1-1 1h-1.5c-.552 0-1-.448-1-1v-1h-13v1c0 .552-.448 1-1 1h-1.5c-.552 0-1-.448-1-1v-1.847c-.608-1.448-1.005-2.611-1.005-3.981 0-1.414.307-2.48.946-3.666.829-1.537 1.851-3.453 2.93-5.252.828-1.382 1.262-1.707 2.278-1.889 1.532-.275 2.918-.365 4.851-.365s3.319.09 4.851.365c1.016.182 1.45.507 2.278 1.889 1.079 1.799 2.101 3.715 2.93 5.252z"/></svg>
                </div>
                <div>
                  <h3 style="font-weight: 700; margin: 0; color: #0f172a; font-size: 15px;">${driverName}</h3>
                  <p style="color: #64748b; font-size: 12px; margin: 2px 0 0;">🚗 Active Driver</p>
                </div>
              </div>
              <div style="background: #f8fafc; border-radius: 10px; padding: 10px 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <span style="color: #64748b; font-size: 12px;">📱 Phone</span>
                  <span style="color: #0f172a; font-size: 12px; font-weight: 600;">${driver.phone || 'N/A'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <span style="color: #64748b; font-size: 12px;">🌍 Country</span>
                  <span style="color: #0f172a; font-size: 12px; font-weight: 600;">${driver.country || 'N/A'}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #64748b; font-size: 12px;">📦 Active Orders</span>
                  <span style="color: #3b82f6; font-size: 12px; font-weight: 700;">${driver.activeOrders || 0}</span>
                </div>
              </div>
            </div>
          `
        })

        marker.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current, marker)
        })

        markersRef.current.push(marker)
      })
    }

    // Add order markers with package icon
    if (showOrders) {
      filteredOrders.forEach((order, index) => {
        // Get coordinates - use exact location, then city, then country center
        let lat = Number(order.locationLat)
        let lng = Number(order.locationLng)
        if (!Number.isFinite(lat)) lat = null
        if (!Number.isFinite(lng)) lng = null
        
        // If no exact coords, try city coordinates first
        if (!lat || !lng) {
          if (!includeApprox) return
          const cityCoords = CITY_COORDS[order.city]
          if (cityCoords) {
            lat = cityCoords.lat
            lng = cityCoords.lng
          } else {
            // Fall back to country center with smaller offset (stay on land)
            const orderCountry = normalizeCountry(order.country || order.orderCountry)
            const countryCenter = COUNTRY_CENTERS[orderCountry] || COUNTRY_CENTERS['All']
            lat = countryCenter.lat
            lng = countryCenter.lng
          }
        }
        
        if (!lat || !lng) return
        
        const orderStatus = normalizeStatus(order.shipmentStatus || order.status || 'pending')
        const color = STATUS_COLORS[orderStatus] || '#64748b'
        // Package/box icon path
        const packagePath = 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
        
        const marker = new window.google.maps.Marker({
          position: { lat, lng },
          map: mapInstanceRef.current,
          title: order.orderId || order.invoiceNumber || 'Order',
          icon: {
            url: `data:image/svg+xml,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
                <defs>
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
                  </filter>
                </defs>
                <path d="M16 0C8 0 2 6 2 14c0 10 14 26 14 26s14-16 14-26c0-8-6-14-14-14z" fill="${color}" filter="url(#shadow)"/>
                <circle cx="16" cy="14" r="8" fill="white"/>
                <path d="M12 11l4-2 4 2v6l-4 2-4-2z" fill="${color}" stroke="${color}" stroke-width="1"/>
              </svg>
            `)}`,
            scaledSize: new window.google.maps.Size(32, 40),
            anchor: new window.google.maps.Point(16, 40),
          },
          zIndex: 500,
        })

        const statusEmoji = {
          pending: '⏳',
          assigned: '📋',
          picked_up: '📦',
          out_for_delivery: '🚚',
          delivered: '✅',
          cancelled: '❌',
          returned: '↩️'
        }[orderStatus] || '📍'

        const orderCountry = order.country || order.orderCountry || ''
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 16px; min-width: 220px; font-family: system-ui, sans-serif;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <div style="width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, ${color}, ${color}cc); display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 20px;">${statusEmoji}</span>
                </div>
                <div>
                  <h3 style="font-weight: 700; margin: 0; color: #0f172a; font-size: 15px;">Order #${order.orderId || order.invoiceNumber || order._id?.slice(-6)}</h3>
                  <p style="color: ${color}; font-size: 12px; margin: 2px 0 0; font-weight: 600; text-transform: capitalize;">${orderStatus?.replace('_', ' ')}</p>
                </div>
              </div>
              <div style="background: #f8fafc; border-radius: 10px; padding: 10px 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <span style="color: #64748b; font-size: 12px;">👤 Customer</span>
                  <span style="color: #0f172a; font-size: 12px; font-weight: 600;">${order.customerName || 'N/A'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <span style="color: #64748b; font-size: 12px;">📍 Location</span>
                  <span style="color: #0f172a; font-size: 12px; font-weight: 600;">${order.city || ''}, ${orderCountry}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #64748b; font-size: 12px;">💰 Total</span>
                  <span style="color: #10b981; font-size: 12px; font-weight: 700;">${order.currency || 'SAR'} ${order.total?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
          `
        })

        marker.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current, marker)
        })

        markersRef.current.push(marker)
      })
    }
  }, [filteredDrivers, filteredOrders, showDrivers, showOrders, mapLoaded, includeApprox])

  // WebSocket for real-time updates
  useEffect(() => {
    try {
      const token = localStorage.getItem('token') || ''
      socketRef.current = io(undefined, {
        path: '/socket.io',
        transports: ['polling'],
        upgrade: false,
        auth: { token },
        withCredentials: true,
      })

      socketRef.current.on('driver.location.updated', () => loadData())
      socketRef.current.on('orders.changed', () => loadData())
    } catch (err) {
      console.error('WebSocket error:', err)
    }

    return () => {
      try { socketRef.current?.disconnect() } catch {}
    }
  }, [loadData])

  // Map styles (light mode)
  const getMapStyles = () => [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e0e0e0' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e4f5' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  ]

  return (
    <div style={{ 
      display: 'flex', 
      height: 'calc(100vh - 120px)',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderRadius: 24,
      overflow: 'hidden',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
    }}>
      {/* Ultra Premium Sidebar */}
      <div style={{
        width: 320,
        flexShrink: 0,
        overflowY: 'auto',
        padding: 20,
        display: 'none',
        flexDirection: 'column',
        gap: 20,
        ...premiumStyles.sidebar,
      }}>
        {/* Header */}
        <div style={{ marginBottom: 4 }}>
          <h2 style={{ 
            fontSize: 22, 
            fontWeight: 800, 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 4,
          }}>
            <span style={{ fontSize: 28 }}>🗺️</span>
            Live Tracking
          </h2>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            Real-time fleet monitoring
          </p>
        </div>

        {/* Premium Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Drivers */}
          <div style={{
            padding: 16,
            ...premiumStyles.statCard('#3b82f6'),
          }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 60, height: 60, borderRadius: '50%', background: 'rgba(59,130,246,0.1)' }} />
            <div style={premiumStyles.glowDot('#3b82f6')} />
            <p style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6', marginTop: 8 }}>{stats.drivers}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Active Drivers</p>
          </div>
          
          {/* Delivered */}
          <div style={{
            padding: 16,
            ...premiumStyles.statCard('#10b981'),
          }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 60, height: 60, borderRadius: '50%', background: 'rgba(16,185,129,0.1)' }} />
            <div style={premiumStyles.glowDot('#10b981')} />
            <p style={{ fontSize: 28, fontWeight: 800, color: '#10b981', marginTop: 8 }}>{stats.delivered}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Delivered</p>
          </div>
          
          {/* In Transit */}
          <div style={{
            padding: 16,
            ...premiumStyles.statCard('#f97316'),
          }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 60, height: 60, borderRadius: '50%', background: 'rgba(249,115,22,0.1)' }} />
            <div style={premiumStyles.glowDot('#f97316')} />
            <p style={{ fontSize: 28, fontWeight: 800, color: '#f97316', marginTop: 8 }}>{stats.inTransit}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>In Transit</p>
          </div>
          
          {/* Total Orders */}
          <div style={{
            padding: 16,
            ...premiumStyles.statCard('#8b5cf6'),
          }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 60, height: 60, borderRadius: '50%', background: 'rgba(139,92,246,0.1)' }} />
            <div style={premiumStyles.glowDot('#8b5cf6')} />
            <p style={{ fontSize: 28, fontWeight: 800, color: '#8b5cf6', marginTop: 8 }}>{stats.orders}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Total Orders</p>
          </div>
        </div>

        {/* Filters Section */}
        <div style={{ ...premiumStyles.card, padding: 16 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8, 
            marginBottom: 16,
            color: 'white',
            fontWeight: 600,
            fontSize: 13,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
            </svg>
            Filters
          </div>

          {/* Country */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500, display: 'block', marginBottom: 6 }}>
              Country
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 13,
                ...premiumStyles.input,
                cursor: 'pointer',
              }}
            >
              <option value="All">All Countries</option>
              {Object.keys(COUNTRY_CENTERS).filter(c => c !== 'All').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Driver */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500, display: 'block', marginBottom: 6 }}>
              Driver
            </label>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 13,
                ...premiumStyles.input,
                cursor: 'pointer',
              }}
            >
              <option value="All">All Drivers</option>
              {drivers.map(d => (
                <option key={d._id} value={d._id}>
                  {d.firstName ? `${d.firstName} ${d.lastName || ''}`.trim() : d.phone || 'Driver'}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500, display: 'block', marginBottom: 6 }}>
              Order Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 13,
                ...premiumStyles.input,
                cursor: 'pointer',
              }}
            >
              <option value="All">All Statuses</option>
              <option value="pending">⏳ Pending</option>
              <option value="assigned">📋 Assigned</option>
              <option value="picked_up">📦 Picked Up</option>
              <option value="out_for_delivery">🚚 Out for Delivery</option>
              <option value="delivered">✅ Delivered</option>
              <option value="cancelled">❌ Cancelled</option>
              <option value="returned">↩️ Returned</option>
            </select>
          </div>
        </div>

        {/* Map Layers */}
        <div style={{ ...premiumStyles.card, padding: 16 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginBottom: 12 }}>
            Map Layers
          </div>
          
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10, 
            cursor: 'pointer',
            padding: '8px 0',
          }}>
            <input
              type="checkbox"
              checked={showDrivers}
              onChange={(e) => setShowDrivers(e.target.checked)}
              style={{ accentColor: '#3b82f6', width: 16, height: 16 }}
            />
            <div style={premiumStyles.glowDot('#3b82f6')} />
            <span style={{ color: 'white', fontSize: 13, fontWeight: 500 }}>Show Drivers</span>
          </label>
          
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10, 
            cursor: 'pointer',
            padding: '8px 0',
          }}>
            <input
              type="checkbox"
              checked={showOrders}
              onChange={(e) => setShowOrders(e.target.checked)}
              style={{ accentColor: '#f97316', width: 16, height: 16 }}
            />
            <div style={premiumStyles.glowDot('#f97316')} />
            <span style={{ color: 'white', fontSize: 13, fontWeight: 500 }}>Show Orders</span>
          </label>
        </div>

        {/* Refresh Button */}
        <button
          onClick={loadData}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            fontSize: 14,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            ...premiumStyles.button,
          }}
        >
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5"
            style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
          >
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>

        {/* Status Legend */}
        <div style={{ ...premiumStyles.card, padding: 16 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginBottom: 12 }}>
            Status Legend
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  background: color,
                  boxShadow: `0 0 8px ${color}60`,
                }} />
                <span style={{ 
                  fontSize: 11, 
                  color: 'rgba(255,255,255,0.7)', 
                  textTransform: 'capitalize',
                }}>
                  {status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        {!mapLoaded && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 16px',
                animation: 'pulse 1.5s infinite',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Loading map...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        <div style={{
          position: 'absolute',
          top: 20,
          left: 20,
          width: 340,
          maxWidth: 'calc(100% - 40px)',
          padding: 14,
          borderRadius: 16,
          background: 'rgba(15,23,42,0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 13, letterSpacing: 0.2 }}>
              Live Tracking
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              style={{
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)',
                color: 'white',
                borderRadius: 12,
                padding: '8px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
              >
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{loading ? 'Refreshing' : 'Refresh'}</span>
            </button>
          </div>

          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 13,
                ...premiumStyles.input,
                cursor: 'pointer',
              }}
            >
              <option value="All">All Countries</option>
              {Object.keys(COUNTRY_CENTERS)
                .filter((c) => c !== 'All')
                .map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>

            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 13,
                ...premiumStyles.input,
                cursor: 'pointer',
              }}
            >
              <option value="All">All Drivers</option>
              {driversByCountry.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.firstName ? `${d.firstName} ${d.lastName || ''}`.trim() : d.phone || 'Driver'}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 13,
                ...premiumStyles.input,
                cursor: 'pointer',
              }}
            >
              <option value="All">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="picked_up">Picked Up</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="returned">Returned</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showDrivers}
                onChange={(e) => setShowDrivers(e.target.checked)}
                style={{ accentColor: '#3b82f6', width: 16, height: 16 }}
              />
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600 }}>Drivers</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showOrders}
                onChange={(e) => setShowOrders(e.target.checked)}
                style={{ accentColor: '#f97316', width: 16, height: 16 }}
              />
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600 }}>Orders</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeApprox}
                onChange={(e) => setIncludeApprox(e.target.checked)}
                style={{ accentColor: '#8b5cf6', width: 16, height: 16 }}
              />
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600 }}>Approx</span>
            </label>
          </div>
        </div>
        
        {/* Premium Map Overlay Stats */}
        <div style={{
          position: 'absolute',
          top: 20,
          right: 20,
          display: 'flex',
          gap: 12,
        }}>
          <div style={{
            padding: '12px 18px',
            borderRadius: 14,
            background: 'rgba(15,23,42,0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          }}>
            <div style={premiumStyles.glowDot('#3b82f6')} />
            <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{stats.drivers} Drivers</span>
          </div>
          <div style={{
            padding: '12px 18px',
            borderRadius: 14,
            background: 'rgba(15,23,42,0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          }}>
            <div style={premiumStyles.glowDot('#f97316')} />
            <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{stats.orders} Orders</span>
          </div>
        </div>

        {/* Live Indicator */}
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          padding: '10px 16px',
          borderRadius: 12,
          background: 'rgba(15,23,42,0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#10b981',
            animation: 'pulse 2s infinite',
            boxShadow: '0 0 12px #10b981',
          }} />
          <span style={{ color: 'white', fontSize: 12, fontWeight: 500 }}>Live</span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default LiveTrackingView
