import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useToast } from '../../ui/Toast'
import { apiPost, apiGet, API_BASE } from '../../api.js'
import { getCurrencyConfig, convert as fxConvert, formatMoney } from '../../util/currency'
import FormattedPrice from '../../components/ui/FormattedPrice'
import { trackRemoveFromCart, trackCheckoutStart } from '../../utils/analytics'
import Header from '../../components/layout/Header'
import MobileBottomNav from '../../components/ecommerce/MobileBottomNav'
import { COUNTRY_LIST, COUNTRY_TO_CURRENCY } from '../../utils/constants'
import { resolveWarehouse } from '../../utils/warehouse'

export default function CartPage() {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('shopping_cart')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [cartLoaded, setCartLoaded] = useState(false)
  const [cartKey, setCartKey] = useState(0) // Force re-render key
  const [annBar, setAnnBar] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()
  const routeLocation = useLocation()

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await apiGet('/api/settings/website/content?page=home')
        if (!alive) return
        const elements = Array.isArray(res?.content?.elements) ? res.content.elements : []
        const getText = (id, fb = '') => { const el = elements.find(e => e?.id === id); return typeof el?.text === 'string' ? el.text : fb }
        if (getText('annBar_enabled', 'true') !== 'false' && getText('annBar_text', '')) {
          setAnnBar({ text: getText('annBar_text', ''), bg: getText('annBar_bg', '#111827'), color: getText('annBar_color', '#ffffff') })
        }
      } catch {}
    })()
    return () => { alive = false }
  }, [])
  const [form, setForm] = useState(() => {
    let c = 'GB'
    try { c = localStorage.getItem('selected_country') || 'GB' } catch {}
    return { name:'', phone:'', country: c, city:'', cityOther:'', area:'', address:'', details:'' }
  })
  const [ccyCfg, setCcyCfg] = useState(null)
  const [location, setLocation] = useState({ lat: null, lng: null })
  const [ukPostcodeResults, setUkPostcodeResults] = useState([])
  const [ukPostcodeLoading, setUkPostcodeLoading] = useState(false)
  const [ukPostcodeError, setUkPostcodeError] = useState('')
  const ukPostcodeAbortRef = useRef(null)
  const ukPostcodeTimerRef = useRef(null)
  const [paymentMethod, setPaymentMethod] = useState('cod') // cod, stripe, paypal, applepay, googlepay
  const [paymentConfig, setPaymentConfig] = useState({ stripe: { enabled: false }, paypal: { enabled: false }, cod: { enabled: true }, applepay: { enabled: false }, googlepay: { enabled: false } })
  
  // Apple Pay supported countries
  const APPLE_PAY_COUNTRIES = ['SA', 'AE', 'OM', 'BH', 'KW', 'QA', 'GB', 'CA', 'AU']
  const isApplePayAvailable = APPLE_PAY_COUNTRIES.includes(form.country) && paymentConfig.applepay?.enabled
  
  // Google Pay supported countries
  const GOOGLE_PAY_COUNTRIES = ['SA', 'AE', 'OM', 'BH', 'KW', 'QA', 'GB', 'CA', 'AU']
  const isGooglePayAvailable = GOOGLE_PAY_COUNTRIES.includes(form.country) && paymentConfig.googlepay?.enabled
  
  // Payment processing state
  const [showStripeModal, setShowStripeModal] = useState(false)
  const [stripeClientSecret, setStripeClientSecret] = useState(null)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [pendingOrderData, setPendingOrderData] = useState(null)
  
  // Card input state
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardError, setCardError] = useState('')
  const [cardType, setCardType] = useState(null) // visa, mastercard, amex, discover, diners, jcb, unionpay
  
  // Map picker state
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [mapsApiKey, setMapsApiKey] = useState('')
  const [mapLoaded, setMapLoaded] = useState(false)
  
  // Stripe Elements state
  const [stripeInstance, setStripeInstance] = useState(null)
  const [stripeElements, setStripeElements] = useState(null)
  const [cardElement, setCardElement] = useState(null)
  const [stripeReady, setStripeReady] = useState(false)
  
  // Detect card type from number
  const detectCardType = (number) => {
    const cleaned = number.replace(/\s/g, '')
    if (/^4/.test(cleaned)) return 'visa'
    if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return 'mastercard'
    if (/^3[47]/.test(cleaned)) return 'amex'
    if (/^6(?:011|5)/.test(cleaned)) return 'discover'
    if (/^3(?:0[0-5]|[68])/.test(cleaned)) return 'diners'
    if (/^35/.test(cleaned)) return 'jcb'
    if (/^62/.test(cleaned)) return 'unionpay'
    return null
  }
  
  // Card brand icons - inline SVG for reliability
  const CardIcon = ({ type, active }) => {
    const opacity = active ? 1 : 0.3
    switch(type) {
      case 'visa':
        return (
          <svg width="40" height="26" viewBox="0 0 780 500" style={{ opacity }}>
            <rect width="780" height="500" rx="40" fill="#1434CB"/>
            <path d="M293.2 348.73l33.36-195.76h53.36L346.54 348.73H293.2zm246.11-191.54c-10.57-3.97-27.14-8.22-47.82-8.22-52.73 0-89.86 26.55-90.18 64.6-.3 28.13 26.51 43.82 46.75 53.19 20.77 9.6 27.75 15.72 27.65 24.28-.13 13.12-16.59 19.12-31.92 19.12-21.36 0-32.7-2.97-50.23-10.27l-6.88-3.11-7.49 43.82c12.46 5.47 35.51 10.2 59.44 10.45 56.09 0 92.5-26.25 92.92-66.88.2-22.27-14.02-39.22-44.8-53.19-18.65-9.06-30.07-15.1-29.95-24.27 0-8.14 9.67-16.84 30.56-16.84 17.45-.27 30.09 3.53 39.94 7.5l4.78 2.26 7.23-42.44zm137.31-4.22h-41.23c-12.77 0-22.33 3.49-27.94 16.23l-79.24 179.4h56.03l11.17-29.35 68.39.08 6.48 29.27h49.47l-43.13-195.63zm-65.38 126.4c5.88-15.03 21.06-53.95 21.06-53.95-.3.52 4.34-11.27 7.01-18.58l3.58 16.79 12.23 56.01-43.88-.27v-.01zM196.1 152.97l-52.24 133.5-5.57-27.13c-9.73-31.27-40.03-65.16-73.9-82.12l47.77 171.2 56.46-.06 84-195.39h-56.52z" fill="#fff"/>
            <path d="M146.92 152.97H60.88l-.68 4.07c66.94 16.2 111.23 55.36 129.62 102.41l-18.71-89.96c-3.23-12.4-12.6-16.1-24.19-16.52z" fill="#F9A533"/>
          </svg>
        )
      case 'mastercard':
        return (
          <svg width="40" height="26" viewBox="0 0 780 500" style={{ opacity }}>
            <rect width="780" height="500" rx="40" fill="#16366F"/>
            <circle cx="300" cy="250" r="150" fill="#D9222A"/>
            <circle cx="480" cy="250" r="150" fill="#EE9F2D"/>
            <path d="M390 130.7c-39.13 32.6-64.25 81.2-64.25 135.3s25.12 102.7 64.25 135.3c39.12-32.6 64.24-81.2 64.24-135.3s-25.12-102.7-64.24-135.3z" fill="#EB611F"/>
          </svg>
        )
      case 'amex':
        return (
          <svg width="40" height="26" viewBox="0 0 40 26" style={{ opacity }}>
            <rect width="40" height="26" rx="4" fill="#016FD0"/>
            <text x="20" y="17" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold" fontFamily="Arial, sans-serif">AMEX</text>
          </svg>
        )
      case 'discover':
        return (
          <svg width="40" height="26" viewBox="0 0 780 500" style={{ opacity }}>
            <rect width="780" height="500" rx="40" fill="#fff" stroke="#ddd"/>
            <ellipse cx="390" cy="250" rx="180" ry="140" fill="#F76F1B"/>
            <path d="M155.32 220v82.4h-19.6l-33.2-50.8v50.8H82.92V220h19.6l33.2 51.2V220h19.6zm25.87 0h55.07v18.4h-33.07v14.8h32.27v17.6h-32.27v13.2h33.07v18.4h-55.07V220zm89.27 18.4h-21.73V220h65.47v18.4h-21.73v64h-22v-64zm48.27-18.4h23.2l19.73 51.6 19.87-51.6h22.67L367.33 300h-20.4l-28.2-80zm156.8 64l15.87-44.13L506.93 284h19.73l-25.53-64h-19.87l-25.33 64h18.8zm123.2-64h22v82.4h-22v-82.4z" fill="#231F20"/>
          </svg>
        )
      case 'diners':
        return (
          <svg width="40" height="26" viewBox="0 0 780 500" style={{ opacity }}>
            <rect width="780" height="500" rx="40" fill="#fff" stroke="#ddd"/>
            <circle cx="350" cy="250" r="160" fill="#0079BE"/>
            <circle cx="350" cy="250" r="140" fill="#fff"/>
            <path d="M280 250c0-35 20-66 50-83v166c-30-17-50-48-50-83zm140 83V167c30 17 50 48 50 83s-20 66-50 83z" fill="#0079BE"/>
          </svg>
        )
      case 'jcb':
        return (
          <svg width="40" height="26" viewBox="0 0 780 500" style={{ opacity }}>
            <rect width="780" height="500" rx="40" fill="#fff" stroke="#ddd"/>
            <rect x="100" y="100" width="150" height="300" rx="20" fill="#0E4C96"/>
            <rect x="280" y="100" width="150" height="300" rx="20" fill="#E41F27"/>
            <rect x="460" y="100" width="150" height="300" rx="20" fill="#007940"/>
            <text x="175" y="280" textAnchor="middle" fill="#fff" fontSize="80" fontWeight="bold">J</text>
            <text x="355" y="280" textAnchor="middle" fill="#fff" fontSize="80" fontWeight="bold">C</text>
            <text x="535" y="280" textAnchor="middle" fill="#fff" fontSize="80" fontWeight="bold">B</text>
          </svg>
        )
      case 'unionpay':
        return (
          <svg width="40" height="26" viewBox="0 0 780 500" style={{ opacity }}>
            <rect width="780" height="500" rx="40" fill="#fff" stroke="#ddd"/>
            <path d="M150 80h150c15 0 25 10 22 25l-45 290c-3 15-18 25-33 25H94c-15 0-25-10-22-25l45-290c3-15 18-25 33-25z" fill="#E21836"/>
            <path d="M280 80h150c15 0 25 10 22 25l-45 290c-3 15-18 25-33 25H224c-15 0-25-10-22-25l45-290c3-15 18-25 33-25z" fill="#00447C"/>
            <path d="M410 80h150c15 0 25 10 22 25l-45 290c-3 15-18 25-33 25H354c-15 0-25-10-22-25l45-290c3-15 18-25 33-25z" fill="#007B84"/>
            <path d="M540 80h150c15 0 25 10 22 25l-45 290c-3 15-18 25-33 25H484c-15 0-25-10-22-25l45-290c3-15 18-25 33-25z" fill="#00447C"/>
          </svg>
        )
      default:
        return null
    }
  }
  
  // Coupon state
  const [agreedToTerms, setAgreedToTerms] = useState(true)
  const [couponCode, setCouponCode] = useState('')
  const [couponApplied, setCouponApplied] = useState(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponLoading, setCouponLoading] = useState(false)

  const [walletSummary, setWalletSummary] = useState({ byCurrency: {} })
  const [walletApply, setWalletApply] = useState(0)

  const CITY_OPTIONS = {
    SA: ['Riyadh','Jeddah','Dammam','Khobar','Makkah','Madinah','Tabuk','Abha','Taif'],
    AE: ['Dubai','Abu Dhabi','Sharjah','Ajman','Ras Al Khaimah','Fujairah','Umm Al Quwain'],
    OM: ['Muscat','Seeb','Salalah','Sohar','Nizwa'],
    BH: ['Manama','Riffa','Muharraq','Isa Town','Hamad Town'],
    IN: ['Mumbai','Delhi','Bengaluru','Hyderabad','Chennai','Kolkata'],
    KW: ['Kuwait City','Al Ahmadi','Hawalli','Salmiya','Farwaniya'],
    QA: ['Doha','Al Rayyan','Al Khor','Mesaieed','Umm Salal'],
    GB: ['London','Manchester','Birmingham','Leeds','Glasgow','Liverpool','Bristol','Sheffield','Edinburgh','Cardiff'],
    UK: ['London','Manchester','Birmingham','Leeds','Glasgow','Liverpool','Bristol','Sheffield','Edinburgh','Cardiff'],
  }

  const selectedCountry = COUNTRY_LIST.find(c => c.code === form.country) || COUNTRY_LIST[0]

  const normalizeUkPostcode = (input) => {
    const raw = String(input || '').toUpperCase().replace(/\s+/g, ' ').trim()
    if (!raw) return ''
    return raw
  }

  const isUkCountry = (countryCode) => {
    const c = String(countryCode || '').trim().toUpperCase()
    return c === 'GB' || c === 'UK'
  }

  const isValidUkPostcode = (postcode) => {
    const pc = normalizeUkPostcode(postcode)
    if (!pc) return false
    const re = /^(GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/i
    return re.test(pc)
  }

  const buildAddressLine = (addr, displayName) => {
    const house = addr?.house_number ? String(addr.house_number).trim() : ''
    const road = addr?.road ? String(addr.road).trim() : ''
    const neighbourhood = addr?.neighbourhood ? String(addr.neighbourhood).trim() : ''
    const suburb = addr?.suburb ? String(addr.suburb).trim() : ''
    const parts = []
    const first = [house, road].filter(Boolean).join(' ').trim()
    if (first) parts.push(first)
    if (neighbourhood) parts.push(neighbourhood)
    if (suburb) parts.push(suburb)
    const line = parts.join(', ').trim()
    if (line) return line
    return String(displayName || '').trim()
  }

  const applyUkPostcodeResult = (r) => {
    const addr = r?.address || {}
    const lat = r?.lat != null ? Number(r.lat) : null
    const lng = r?.lon != null ? Number(r.lon) : null
    const city = addr.city || addr.town || addr.village || addr.county || ''
    const postcode = normalizeUkPostcode(addr.postcode || form.area)
    const addressLine = buildAddressLine(addr, r?.display_name)

    setForm(f => ({
      ...f,
      area: postcode || f.area,
      address: addressLine || f.address,
      city: city && (CITY_OPTIONS[f.country] || []).includes(city) ? city : (city ? 'Other' : f.city),
      cityOther: city && !(CITY_OPTIONS[f.country] || []).includes(city) ? city : f.cityOther
    }))

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setLocation({ lat, lng })
    }

    setUkPostcodeResults([])
    setUkPostcodeError('')
  }

  async function reverseGeocodeOsm(lat, lng, signal) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&zoom=18&addressdetails=1`
    const resp = await fetch(url, { headers: { 'Accept-Language': 'en' }, signal })
    const data = await resp.json().catch(() => null)
    if (!data) return null
    const addr = data.address || {}
    return {
      address: data.display_name || '',
      city: addr.city || addr.town || addr.village || addr.county || ''
    }
  }

  useEffect(() => {
    if (!isUkCountry(form.country)) {
      setUkPostcodeResults([])
      setUkPostcodeError('')
      setUkPostcodeLoading(false)
      if (ukPostcodeTimerRef.current) {
        clearTimeout(ukPostcodeTimerRef.current)
        ukPostcodeTimerRef.current = null
      }
      if (ukPostcodeAbortRef.current) {
        try { ukPostcodeAbortRef.current.abort() } catch {}
        ukPostcodeAbortRef.current = null
      }
      return
    }

    const pc = normalizeUkPostcode(form.area)
    if (!pc || pc.length < 5) {
      setUkPostcodeResults([])
      setUkPostcodeError('')
      setUkPostcodeLoading(false)
      return
    }
    if (!isValidUkPostcode(pc)) {
      setUkPostcodeResults([])
      setUkPostcodeError('')
      setUkPostcodeLoading(false)
      return
    }

    if (ukPostcodeTimerRef.current) {
      clearTimeout(ukPostcodeTimerRef.current)
      ukPostcodeTimerRef.current = null
    }
    ukPostcodeTimerRef.current = setTimeout(async () => {
      if (ukPostcodeAbortRef.current) {
        try { ukPostcodeAbortRef.current.abort() } catch {}
        ukPostcodeAbortRef.current = null
      }
      const controller = new AbortController()
      ukPostcodeAbortRef.current = controller
      setUkPostcodeLoading(true)
      setUkPostcodeError('')
      try {
        const lookupUrl = `https://api.postcodes.io/postcodes/${encodeURIComponent(pc.replace(/\s+/g, ''))}`
        const resp = await fetch(lookupUrl, { signal: controller.signal })
        const j = await resp.json().catch(() => ({}))
        const result = j?.result
        const lat = Number(result?.latitude)
        const lng = Number(result?.longitude)
        if (!resp.ok || !Number.isFinite(lat) || !Number.isFinite(lng)) {
          setUkPostcodeResults([])
          setUkPostcodeError('Invalid postcode')
          return
        }

        const geo = await reverseGeocodeOsm(lat, lng, controller.signal)
        setForm(f => ({
          ...f,
          area: normalizeUkPostcode(result?.postcode || pc) || f.area,
          address: String(geo?.address || f.address || '').trim(),
          city: String(geo?.city || f.city || '').trim() ? (String(geo?.city || '').trim() && (CITY_OPTIONS[f.country] || []).includes(String(geo?.city || '').trim()) ? String(geo?.city || '').trim() : 'Other') : f.city,
          cityOther: String(geo?.city || '').trim() && !(CITY_OPTIONS[f.country] || []).includes(String(geo?.city || '').trim()) ? String(geo?.city || '').trim() : f.cityOther,
        }))
        setLocation({ lat, lng })
        setUkPostcodeResults([])
        setUkPostcodeError('')
      } catch (err) {
        if (err?.name !== 'AbortError') {
          setUkPostcodeResults([])
          setUkPostcodeError('Could not auto-detect address. Please enter manually.')
        }
      } finally {
        setUkPostcodeLoading(false)
        ukPostcodeAbortRef.current = null
      }
    }, 650)

    return () => {
      if (ukPostcodeTimerRef.current) {
        clearTimeout(ukPostcodeTimerRef.current)
        ukPostcodeTimerRef.current = null
      }
      if (ukPostcodeAbortRef.current) {
        try { ukPostcodeAbortRef.current.abort() } catch {}
        ukPostcodeAbortRef.current = null
      }
    }
  }, [form.country, form.area])
  
  useEffect(() => {
    let alive = true
    getCurrencyConfig().then(cfg => { if (alive) setCcyCfg(cfg) }).catch(()=>{})
    // Load payment config and initialize Stripe
    Promise.all([
      apiGet('/api/ecommerce/payments/config').catch(() => ({})),
      apiGet('/api/settings/payment-methods').catch(() => ({ methods: {} }))
    ]).then(([cfg, methodSettings]) => {
      if (!alive) return
      // Merge payment method enabled/disabled settings
      const methods = methodSettings?.methods || {}
      const mergedConfig = {
        ...cfg,
        cod: { ...cfg.cod, enabled: methods.cod?.enabled ?? cfg.cod?.enabled ?? true },
        stripe: { ...cfg.stripe, enabled: methods.stripe?.enabled ?? cfg.stripe?.enabled ?? false },
        paypal: { ...cfg.paypal, enabled: methods.paypal?.enabled ?? cfg.paypal?.enabled ?? false },
        applepay: { ...cfg.applepay, enabled: methods.applepay?.enabled ?? cfg.applepay?.enabled ?? false },
        googlepay: { ...cfg.googlepay, enabled: methods.googlepay?.enabled ?? cfg.googlepay?.enabled ?? false }
      }
      setPaymentConfig(mergedConfig)
      // Load Stripe.js if enabled
      if (mergedConfig.stripe?.enabled && cfg.stripe?.publishableKey) {
        loadStripeJs(cfg.stripe.publishableKey)
      }
    })
    // Load maps API key
    apiGet('/api/settings/maps-key').then(data => { if (alive && data?.mapsKey) setMapsApiKey(data.mapsKey) }).catch(()=>{})
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        if (!isUkCountry(form.country)) {
          if (alive) {
            setWalletSummary({ byCurrency: {} })
            setWalletApply(0)
          }
          return
        }
        const r = await apiGet('/api/ecommerce/customer/wallet/summary')
        if (alive && r?.byCurrency) setWalletSummary({ byCurrency: r.byCurrency })
      } catch {}
    })()
    return () => { alive = false }
  }, [form.country])
  
  // Load Google Maps script
  useEffect(() => {
    if (!mapsApiKey || mapLoaded) return
    if (window.google?.maps) { setMapLoaded(true); return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&libraries=places`
    script.async = true
    script.onload = () => setMapLoaded(true)
    document.head.appendChild(script)
  }, [mapsApiKey, mapLoaded])
  
  // Handle map location selection
  const handleMapSelect = async (lat, lng) => {
    setLocation({ lat, lng })
    // Reverse geocode to get address
    if (window.google?.maps) {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const addr = results[0]
          let city = '', area = '', street = ''
          for (const comp of addr.address_components) {
            if (comp.types.includes('locality')) city = comp.long_name
            if (comp.types.includes('sublocality') || comp.types.includes('sublocality_level_1')) area = comp.long_name
            if (comp.types.includes('route')) street = comp.long_name
            if (comp.types.includes('administrative_area_level_1') && !city) city = comp.long_name
          }
          setForm(f => ({
            ...f,
            area: area || f.area,
            address: addr.formatted_address || f.address,
            city: city && (CITY_OPTIONS[f.country] || []).includes(city) ? city : (city ? 'Other' : f.city),
            cityOther: city && !(CITY_OPTIONS[f.country] || []).includes(city) ? city : f.cityOther
          }))
        }
      })
    }
    setShowMapPicker(false)
  }
  
  // Load Stripe.js and initialize Elements
  const loadStripeJs = (publishableKey) => {
    if (window.Stripe) {
      initializeStripe(publishableKey)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://js.stripe.com/v3/'
    script.async = true
    script.onload = () => initializeStripe(publishableKey)
    document.head.appendChild(script)
  }
  
  const initializeStripe = (publishableKey) => {
    if (!window.Stripe || stripeInstance) return
    const stripe = window.Stripe(publishableKey)
    setStripeInstance(stripe)
    const elements = stripe.elements()
    setStripeElements(elements)
  }
  
  // Mount Stripe Card Element when payment method is stripe
  useEffect(() => {
    if (paymentMethod !== 'stripe' || !stripeElements) return
    if (cardElement) return // Already mounted
    
    let mounted = true
    let timeoutId = null
    
    // Wait for the container to be in DOM
    const mountCard = () => {
      if (!mounted) return
      const container = document.getElementById('stripe-card-element-mount')
      if (!container) {
        timeoutId = setTimeout(mountCard, 100)
        return
      }
      try {
        const card = stripeElements.create('card', {
          style: {
            base: {
              fontSize: '16px',
              color: '#1e293b',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              '::placeholder': { color: '#94a3b8' }
            },
            invalid: { color: '#ef4444' }
          }
        })
        card.mount('#stripe-card-element-mount')
        card.on('ready', () => { if (mounted) setStripeReady(true) })
        card.on('change', (event) => {
          if (!mounted) return
          if (event.error) setCardError(event.error.message)
          else setCardError('')
        })
        if (mounted) setCardElement(card)
      } catch (err) {
        console.error('Stripe mount error:', err)
      }
    }
    mountCard()
    
    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [paymentMethod, stripeElements, cardElement])
  
  // Cleanup card element when unmounting or switching payment method
  useEffect(() => {
    return () => {
      if (cardElement) {
        try {
          cardElement.unmount()
        } catch (e) {
          // Ignore unmount errors
        }
      }
    }
  }, [])
  
  // Countries where COD is NOT available (online payment only)
  const NO_COD_COUNTRIES = ['GB', 'UK']
  const isCodAvailable = !NO_COD_COUNTRIES.includes(selectedCountry.code)
  const displayCurrency = COUNTRY_TO_CURRENCY[selectedCountry.code] || 'SAR'
  
  // Auto-switch to stripe if COD not available and currently selected
  useEffect(() => {
    if (!isCodAvailable && paymentMethod === 'cod') {
      setPaymentMethod('stripe')
    }
  }, [isCodAvailable, paymentMethod])
  const convertPrice = (value, fromCurrency, toCurrency) => fxConvert(value, fromCurrency || 'SAR', toCurrency || displayCurrency, ccyCfg)
  const formatPrice = (value, currency) => formatMoney(Number(value||0), currency || displayCurrency)
  const renderPrice = (value, currency, size) => <FormattedPrice amount={Number(value||0)} currency={currency || displayCurrency} size={size || 14} />

  const normalizeCartItems = (items, countryCode) => {
    const arr = Array.isArray(items) ? items : []
    let changed = false
    const next = arr.map((it) => {
      const rawId = (() => {
        try { return String(it?.id ?? '').trim() } catch { return '' }
      })()
      const derivedProductId = (() => {
        try {
          const pid = String(it?.productId ?? '').trim()
          if (pid) return pid.includes('::') ? pid.split('::')[0] : pid
          if (!rawId) return ''
          return rawId.includes('::') ? rawId.split('::')[0] : rawId
        } catch {
          return ''
        }
      })()
      const safeVariants = (it?.variants && typeof it.variants === 'object' && !Array.isArray(it.variants)) ? it.variants : {}

      const wh = resolveWarehouse(it, countryCode, it?.quantity)
      const should = {
        warehouseType: wh.type,
        etaMinDays: wh.etaMinDays,
        etaMaxDays: wh.etaMaxDays,
        warehouseCountry: countryCode,
        ...(derivedProductId ? { productId: derivedProductId } : {}),
        variants: safeVariants,
      }
      if (
        it?.warehouseType === should.warehouseType &&
        it?.etaMinDays === should.etaMinDays &&
        it?.etaMaxDays === should.etaMaxDays &&
        it?.warehouseCountry === should.warehouseCountry &&
        (derivedProductId ? String(it?.productId || '') === derivedProductId : true) &&
        it?.variants === safeVariants
      ) {
        return it
      }
      changed = true
      return { ...it, ...should }
    })
    return { items: next, changed }
  }

  const getOrderEta = () => {
    if (!Array.isArray(cartItems) || cartItems.length === 0) return null
    let hasGlobal = false
    let hasLocal = false
    for (const it of cartItems) {
      if (it?.warehouseType === 'global') hasGlobal = true
      else if (it?.warehouseType === 'local') hasLocal = true
    }
    if (hasGlobal) return { type: 'global', etaMinDays: 10, etaMaxDays: 14 }
    if (hasLocal) return { type: 'local', etaMinDays: 1, etaMaxDays: 2 }
    return null
  }

  const getImageUrl = (p) => {
    const imagePath = p || ''
    if (!imagePath) return '/placeholder-product.svg'
    if (String(imagePath).startsWith('http')) return imagePath
    let pathPart = String(imagePath).replace(/\\/g,'/')
    if (!pathPart.startsWith('/')) pathPart = '/' + pathPart
    try {
      const base = String(API_BASE||'').trim()
      if (!base) return pathPart
      if (/^https?:\/\//i.test(base)){
        const u = new URL(base)
        const prefix = u.pathname && u.pathname !== '/' ? u.pathname.replace(/\/$/, '') : ''
        return `${u.origin}${prefix}${pathPart}`
      }
      const prefix = base.replace(/\/$/, '')
      return `${prefix}${pathPart}`
    } catch {
      return pathPart
    }
  }

  const reloadCartFromStorage = () => {
    try {
      const savedCart = localStorage.getItem('shopping_cart')
      const parsed = savedCart ? JSON.parse(savedCart) : []
      const norm = normalizeCartItems(parsed, form.country)
      if (norm.changed) {
        try { localStorage.setItem('shopping_cart', JSON.stringify(norm.items)) } catch {}
      }
      setCartItems(norm.items)
    } catch(err) { console.error('Error loading cart:', err) }
  }

  // Load cart immediately on mount and whenever route changes
  useEffect(() => {
    const loadCart = () => {
      try {
        const savedCart = localStorage.getItem('shopping_cart')
        const parsed = savedCart ? JSON.parse(savedCart) : []
        const norm = normalizeCartItems(parsed, form.country)
        if (norm.changed) {
          try { localStorage.setItem('shopping_cart', JSON.stringify(norm.items)) } catch {}
        }
        setCartItems(norm.items)
        setCartKey(k => k + 1)
        setCartLoaded(true)
      } catch { 
        setCartItems([]) 
        setCartLoaded(true)
      }
    }
    loadCart()
  }, [routeLocation.pathname, routeLocation.key])

  // Auto-fill customer info when logged in
  useEffect(() => {
    const token = localStorage.getItem('token')
    const me = (() => { try { return JSON.parse(localStorage.getItem('me') || '{}') } catch { return {} } })()
    
    if (token && me?.role === 'customer') {
      // Pre-fill form with customer info
      setForm(prev => ({
        ...prev,
        name: prev.name || `${me.firstName || ''} ${me.lastName || ''}`.trim(),
        phone: prev.phone || me.phone || ''
      }))
    }
  }, [])

  // Handle PayPal return
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const paypalToken = urlParams.get('token')
    const paypalPayerId = urlParams.get('PayerID')
    
    if (paypalToken && paypalPayerId) {
      handlePayPalReturn(paypalToken, paypalPayerId)
    }
  }, [])

  async function handlePayPalReturn(token, payerId) {
    try {
      setIsLoading(true)
      const paypalOrderId = localStorage.getItem('paypal_order_id')
      const pendingOrder = localStorage.getItem('pending_order')
      
      if (!paypalOrderId || !pendingOrder) {
        toast.error('Payment session expired. Please try again.')
        return
      }

      // Capture the PayPal payment
      const captureRes = await apiPost('/api/ecommerce/payments/paypal/capture', {
        paypalOrderId
      })

      if (captureRes.success) {
        // Place the order with paid status
        const orderData = JSON.parse(pendingOrder)
        orderData.paymentStatus = 'paid'
        orderData.paymentMethod = 'paypal'
        orderData.paymentId = paypalOrderId

        // Check if customer is logged in - use customer endpoint to link order
        const token = localStorage.getItem('token')
        const me = (() => { try { return JSON.parse(localStorage.getItem('me') || '{}') } catch { return {} } })()
        const isCustomerLoggedIn = token && me?.role === 'customer'
        
        if (isCustomerLoggedIn) {
          await apiPost('/api/ecommerce/customer/orders', orderData)
        } else {
          await apiPost('/api/ecommerce/orders', orderData)
        }
        
        // Clear pending data
        localStorage.removeItem('pending_order')
        localStorage.removeItem('paypal_order_id')
        
        // Clear cart
        setCartItems([])
        localStorage.setItem('shopping_cart', JSON.stringify([]))
        window.dispatchEvent(new CustomEvent('cartUpdated'))
        
        toast.success('Payment successful! Order placed.')
        navigate(isCustomerLoggedIn ? '/customer/orders' : '/catalog')
      } else {
        toast.error('Payment capture failed. Please contact support.')
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to complete PayPal payment')
    } finally {
      setIsLoading(false)
      // Clean URL
      window.history.replaceState({}, '', '/cart')
    }
  }

  // Listen for cart updates from other components
  useEffect(() => {
    const loadCart = () => {
      try {
        const savedCart = localStorage.getItem('shopping_cart')
        const parsed = savedCart ? JSON.parse(savedCart) : []
        const norm = normalizeCartItems(parsed, form.country)
        if (norm.changed) {
          try { localStorage.setItem('shopping_cart', JSON.stringify(norm.items)) } catch {}
        }
        setCartItems(norm.items)
      } catch { setCartItems([]) }
    }
    
    const handler = () => setTimeout(loadCart, 10)
    window.addEventListener('cartUpdated', handler)
    window.addEventListener('storage', handler)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') loadCart()
    })
    window.addEventListener('focus', loadCart)
    
    return () => {
      window.removeEventListener('cartUpdated', handler)
      window.removeEventListener('storage', handler)
      window.removeEventListener('focus', loadCart)
    }
  }, [])

  useEffect(() => {
    try {
      const meData = localStorage.getItem('me')
      if (meData) {
        const customer = JSON.parse(meData)
        setForm(prev => ({
          ...prev,
          name: prev.name || customer.name || customer.fullName || '',
          phone: prev.phone || customer.phone || customer.phoneNumber || ''
        }))
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const savedCountry = localStorage.getItem('selected_country')
      if (savedCountry && savedCountry !== form.country) {
        setForm(prev => ({ ...prev, country: savedCountry }))
      }
    } catch {}
  }, [])

  useEffect(() => {
    const handleCountryChange = (e) => {
      try {
        const code = String(e?.detail?.code || '').trim()
        if (code && code !== form.country) {
          setForm(prev => ({ ...prev, country: code }))
        }
      } catch {}
    }
    window.addEventListener('countryChanged', handleCountryChange)
    return () => window.removeEventListener('countryChanged', handleCountryChange)
  }, [form.country])

  useEffect(() => {
    try { localStorage.setItem('selected_country', form.country) } catch {}
    const opts = CITY_OPTIONS[form.country] || []
    if (opts.length && !opts.includes(form.city)) {
      setForm(prev => ({ ...prev, city: opts[0] }))
    }
    if (!opts.length && form.city) {
      setForm(prev => ({ ...prev, city: '' }))
    }
  }, [form.country])

  useEffect(() => {
    setCartItems((prev) => {
      const norm = normalizeCartItems(prev, form.country)
      if (!norm.changed) return prev
      try { localStorage.setItem('shopping_cart', JSON.stringify(norm.items)) } catch {}
      try { window.dispatchEvent(new CustomEvent('cartUpdated')) } catch {}
      return norm.items
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.country])

  useEffect(() => {
    // Only save to localStorage after cart has been loaded to prevent overwriting
    if (cartLoaded) {
      localStorage.setItem('shopping_cart', JSON.stringify(cartItems))
      try { window.dispatchEvent(new CustomEvent('cartUpdated')) } catch {}
    }
  }, [cartItems, cartLoaded])

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }
    setCartItems(prevItems => {
      const next = prevItems.map(item => {
        if (item.id !== productId) return item
        const wh = resolveWarehouse(item, form.country, newQuantity)
        return {
          ...item,
          quantity: newQuantity,
          warehouseType: wh.type,
          etaMinDays: wh.etaMinDays,
          etaMaxDays: wh.etaMaxDays,
          warehouseCountry: form.country,
        }
      })
      try { localStorage.setItem('shopping_cart', JSON.stringify(next)) } catch {}
      try { window.dispatchEvent(new CustomEvent('cartUpdated')) } catch {}
      return next
    })
  }

  const removeFromCart = (productId) => {
    try {
      const removedItem = cartItems.find(item => item.id === productId)
      if (removedItem) {
        try { trackRemoveFromCart(removedItem.id, removedItem.name, removedItem.quantity) } catch {}
      }
    } catch {}
    setCartItems(prevItems => {
      const next = prevItems.filter(item => item.id !== productId)
      try { localStorage.setItem('shopping_cart', JSON.stringify(next)) } catch {}
      try { window.dispatchEvent(new CustomEvent('cartUpdated')) } catch {}
      return next
    })
    toast.success('Removed')
  }

  const getSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const from = item.currency || 'SAR'
      const unit = convertPrice(item.price, from, displayCurrency)
      return total + (unit * item.quantity)
    }, 0)
  }

  const getTotalPrice = () => {
    return Math.max(0, getSubtotal() - couponDiscount)
  }

  const getWalletBalance = () => {
    if (!isUkCountry(form.country)) return 0
    try {
      const token = localStorage.getItem('token')
      if (!token) return 0
    } catch { return 0 }
    return Number(walletSummary?.byCurrency?.[displayCurrency] || 0)
  }

  const getWalletApply = () => {
    if (!isUkCountry(form.country)) return 0
    const total = getTotalPrice()
    const bal = getWalletBalance()
    return Math.max(0, Math.min(Number(walletApply || 0), bal, total))
  }

  const getRemainingToPay = () => {
    return Math.max(0, getTotalPrice() - getWalletApply())
  }

  useEffect(() => {
    try {
      const next = getWalletApply()
      const cur = Number(walletApply || 0)
      if (Math.abs(cur - next) > 0.00001) setWalletApply(next)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayCurrency, couponDiscount, cartItems.length, walletSummary])

  async function applyCoupon() {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code')
      return
    }
    setCouponLoading(true)
    try {
      const res = await apiPost('/api/coupons/validate', {
        code: couponCode.trim(),
        orderTotal: getSubtotal()
      })
      if (res.valid) {
        setCouponApplied(res.coupon)
        setCouponDiscount(res.discount)
        toast.success(res.message || 'Coupon applied!')
      } else {
        toast.error(res.message || 'Invalid coupon')
      }
    } catch (err) {
      toast.error(err?.message || 'Invalid coupon code')
    } finally {
      setCouponLoading(false)
    }
  }

  function removeCoupon() {
    setCouponApplied(null)
    setCouponDiscount(0)
    setCouponCode('')
    toast.info('Coupon removed')
  }

  const getTotalItems = () => cartItems.reduce((total, item) => total + item.quantity, 0)

  const onChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function validateForm() {
    if (cartItems.length === 0) { toast.error('Your cart is empty'); return false }
    if (!form.name.trim()) { toast.error('Please enter your full name'); return false }
    if (!form.phone.trim()) { toast.error('Please enter your phone number'); return false }
    if (!(form.city && (form.city !== 'Other' || (form.city === 'Other' && String(form.cityOther||'').trim())))) {
      toast.error('Please select your city')
      return false
    }
    if (!String(form.area || '').trim()) { toast.error('Please enter your area'); return false }
    if (!form.address.trim()) { toast.error('Please enter your full address'); return false }
    if (!agreedToTerms) { toast.error('Please agree to the Terms & Conditions and Privacy Policy'); return false }
    return true
  }

  function buildOrderData() {
    let customerId = null
    try {
      const meData = localStorage.getItem('me')
      const customerToken = localStorage.getItem('token')
      if (customerToken && meData) {
        const user = JSON.parse(meData)
        if (user._id) customerId = user._id
      }
    } catch {}

    const items = cartItems.map(it => {
      const qty = Math.max(1, Number(it.quantity||1))
      const wh = resolveWarehouse(it, form.country, qty)
      const pid = (() => {
        try {
          const raw = String(it?.productId || it?.id || '').trim()
          if (!raw) return ''
          return raw.includes('::') ? raw.split('::')[0] : raw
        } catch {
          return ''
        }
      })()
      return {
        productId: pid,
        quantity: qty,
        variants: it?.variants && typeof it.variants === 'object' ? it.variants : {},
        warehouseType: wh.type,
        etaMinDays: wh.etaMinDays,
        etaMaxDays: wh.etaMaxDays,
        warehouseCountry: form.country,
      }
    })
    return {
      customerName: form.name.trim(),
      customerPhone: form.phone.trim(),
      phone: form.phone.trim(),
      phoneCountryCode: selectedCountry.dial,
      orderCountry: selectedCountry.name,
      city: (form.city === 'Other' ? String(form.cityOther||'').trim() : String(form.city||'').trim()),
      area: String(form.area||'').trim(),
      address: form.address.trim(),
      details: String(form.details||'').trim(),
      items,
      currency: displayCurrency,
      customerId,
      locationLat: location.lat,
      locationLng: location.lng,
      paymentMethod: paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
      couponCode: couponApplied?.code || null,
      couponDiscount: couponDiscount || 0,
      walletApply: getWalletApply(),
    }
  }

  async function submitOrder() {
    if (!validateForm()) return
    
    // Validate Stripe payment
    if (paymentMethod === 'stripe') {
      setCardError('')
      if (!stripeInstance || !cardElement) {
        setCardError('Stripe is not loaded. Please refresh the page.')
        return
      }
      if (!cardName.trim()) {
        setCardError('Please enter cardholder name')
        return
      }
    }

    try {
      setIsLoading(true)
      const cartValue = getTotalPrice()
      const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0)
      trackCheckoutStart(cartValue, itemCount)

      const orderData = buildOrderData()

      const remaining = getRemainingToPay()
      if ((paymentMethod === 'stripe' || paymentMethod === 'paypal') && remaining <= 0) {
        const walletOnly = { ...orderData, paymentMethod: 'wallet', paymentStatus: 'paid', paymentId: null }
        await placeOrder(walletOnly)
        return
      }

      // Handle different payment methods
      if (paymentMethod === 'stripe') {
        await handleStripePayment(orderData)
      } else if (paymentMethod === 'paypal') {
        await handlePayPalPayment(orderData)
      } else {
        // Cash on Delivery - place order directly
        await placeOrder(orderData)
      }
    } catch(err) {
      toast.error(err?.message || 'Failed to submit order')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleStripePayment(orderData) {
    try {
      if (!stripeInstance || !cardElement) {
        throw new Error('Stripe is not initialized. Please refresh the page.')
      }
      
      const total = getRemainingToPay()
      
      // Create payment method using Stripe Elements (secure - no raw card data sent to our server)
      const { error: pmError, paymentMethod: pm } = await stripeInstance.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: { name: cardName || form.name }
      })
      
      if (pmError) {
        throw new Error(pmError.message)
      }
      
      // Send only the payment method ID to our backend (PCI compliant)
      const res = await apiPost('/api/ecommerce/payments/stripe/process-payment', {
        amount: total,
        currency: displayCurrency.toLowerCase(),
        paymentMethodId: pm.id
      })
      
      if (res.success) {
        // Payment successful - place order
        const paidOrderData = { ...orderData, paymentStatus: 'paid', paymentId: res.paymentIntentId }
        await placeOrder(paidOrderData)
      } else if (res.requiresAction) {
        // 3D Secure authentication required
        const { error: confirmError, paymentIntent } = await stripeInstance.confirmCardPayment(res.clientSecret)
        if (confirmError) {
          throw new Error(confirmError.message)
        }
        if (paymentIntent.status === 'succeeded') {
          const paidOrderData = { ...orderData, paymentStatus: 'paid', paymentId: paymentIntent.id }
          await placeOrder(paidOrderData)
        } else {
          throw new Error('Payment authentication failed')
        }
      } else {
        throw new Error(res.message || 'Payment failed')
      }
    } catch (err) {
      setCardError(err?.message || 'Payment failed. Please check your card details.')
      throw err
    }
  }

  async function handlePayPalPayment(orderData) {
    try {
      const total = getRemainingToPay()
      // Create PayPal order
      const res = await apiPost('/api/ecommerce/payments/paypal/create-order', {
        amount: total,
        currency: displayCurrency
      })
      
      if (res.approvalUrl) {
        // Store order data for when user returns from PayPal
        localStorage.setItem('pending_order', JSON.stringify(orderData))
        localStorage.setItem('paypal_order_id', res.orderId)
        // Redirect to PayPal
        window.location.href = res.approvalUrl
      } else {
        throw new Error('Failed to create PayPal order')
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to initialize PayPal payment')
      throw err
    }
  }

  async function placeOrder(orderData) {
    // If coupon was applied, increment usage count
    if (couponApplied?.code) {
      try {
        await apiPost('/api/coupons/apply', { code: couponApplied.code })
      } catch {}
    }
    
    // Check if customer is logged in - use customer endpoint to link order
    const token = localStorage.getItem('token')
    const me = (() => { try { return JSON.parse(localStorage.getItem('me') || '{}') } catch { return {} } })()
    const isCustomerLoggedIn = token && me?.role === 'customer'
    
    let result
    if (isCustomerLoggedIn) {
      result = await apiPost('/api/ecommerce/customer/orders', orderData)
    } else {
      result = await apiPost('/api/ecommerce/orders', orderData)
    }
    
    // Build order info for success page (merge cart items with order response)
    const orderForSuccess = {
      ...(result?.order || {}),
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      orderCountry: orderData.orderCountry,
      city: orderData.city,
      area: orderData.area,
      address: orderData.address,
      currency: orderData.currency || displayCurrency,
      paymentMethod: orderData.paymentMethod,
      items: cartItems.map(it => ({
        productId: (() => {
          try {
            const raw = String(it?.productId || it?.id || '').trim()
            if (!raw) return ''
            return raw.includes('::') ? raw.split('::')[0] : raw
          } catch {
            return ''
          }
        })(),
        name: it.name,
        image: it.image || it.imagePath,
        price: convertPrice(it.price, it.currency || 'SAR', displayCurrency),
        quantity: it.quantity,
        variants: it?.variants && typeof it.variants === 'object' ? it.variants : {},
      })),
    }
    
    // Save as fallback in case navigate state is lost
    try { localStorage.setItem('last_order_success', JSON.stringify(orderForSuccess)) } catch {}
    
    setCartItems([])
    localStorage.setItem('shopping_cart', JSON.stringify([]))
    window.dispatchEvent(new CustomEvent('cartUpdated'))
    navigate('/order-success', { state: { order: orderForSuccess } })
  }

  async function handleStripeSuccess(paymentIntentId) {
    try {
      setProcessingPayment(true)
      // Confirm payment on backend
      await apiPost('/api/ecommerce/payments/stripe/confirm', {
        paymentIntentId
      })
      
      // Place the order with paid status
      const orderData = { ...pendingOrderData, paymentStatus: 'paid', paymentId: paymentIntentId }
      await placeOrder(orderData)
      setShowStripeModal(false)
    } catch (err) {
      toast.error(err?.message || 'Payment confirmed but order failed. Please contact support.')
    } finally {
      setProcessingPayment(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Desktop Header */}
      <div className="hidden lg:block">
        <Header />
      </div>
      {/* Announcement bar */}
      {annBar?.text && (
        <div className="lg:hidden" style={{ background: annBar.bg || '#111827', color: annBar.color || '#fff', textAlign: 'center', padding: '8px 16px', fontSize: 12, fontWeight: 500, letterSpacing: '0.01em' }}>
          {annBar.text}
        </div>
      )}
      {/* Mobile: ultra minimal header */}
      <div className="lg:hidden" style={{ background: '#fff', borderBottom: '1px solid #f1f5f9', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: '50%', background: '#f8fafc', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>Cart</h1>
        </div>
        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{getTotalItems()} items</span>
      </div>
      
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 12px', paddingBottom: 100 }}>
        <div className="hidden lg:block" style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>Shopping Cart</h1>
          <p style={{ color: '#64748b', marginTop: 2, fontSize: 14 }}>{getTotalItems()} items</p>
        </div>

        {cartItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 16 }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🛒</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Your cart is empty</h2>
            <p style={{ color: '#64748b', marginBottom: 20, fontSize: 14 }}>Add some products to get started!</p>
            <Link to="/catalog" style={{ display: 'inline-block', padding: '12px 28px', background: '#f97316', color: 'white', borderRadius: 10, fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>
              Browse Products
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Cart Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cartItems.map((item) => (
                <div key={item.id} style={{ padding: 12, background: 'white', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 70, height: 70, flexShrink: 0, borderRadius: 8, overflow: 'hidden', background: '#f1f5f9' }}>
                      <img 
                        src={getImageUrl(item.image || item.imagePath)} 
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.src = '/placeholder-product.svg' }}
                      />
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.3' }}>{item.name}</h3>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#f97316', margin: 0 }}>
                        {renderPrice(convertPrice(item.price, item.currency || 'SAR', displayCurrency), displayCurrency, 13)}
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: 8 }}>
                      <button 
                        onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeFromCart(item.id)}
                        style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, fontWeight: 600, color: '#64748b' }}
                      >−</button>
                      <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 600, fontSize: 14 }}>{item.quantity}</span>
                      <button 
                        onClick={() => {
                          const max = Number(item.maxStock)
                          if (max > 0 && item.quantity >= max) return
                          updateQuantity(item.id, item.quantity + 1)
                        }}
                        style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, fontWeight: 600, color: '#64748b' }}
                      >+</button>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                        {renderPrice(convertPrice(item.price, item.currency || 'SAR', displayCurrency) * item.quantity, displayCurrency, 13)}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      style={{ padding: '6px 10px', border: 'none', background: '#fef2f2', color: '#dc2626', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Checkout Form */}
            <div style={{ background: 'white', borderRadius: 12, padding: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#0f172a' }}>Delivery Details</h2>
              
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Full Name *</label>
                  <input name="name" value={form.name} onChange={onChange} placeholder="Your full name" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Phone Number *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8 }}>
                    <select name="country" value={form.country} onChange={onChange} style={{ padding: '10px 6px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13 }}>
                      {COUNTRY_LIST.map(c => <option key={c.code} value={c.code}>{c.flag} {c.dial}</option>)}
                    </select>
                    <input name="phone" value={form.phone} onChange={onChange} placeholder="Phone number" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>City *</label>
                  <select name="city" value={form.city} onChange={onChange} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}>
                    {(CITY_OPTIONS[form.country] || []).map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="Other">Other</option>
                  </select>
                  {form.city === 'Other' && (
                    <input name="cityOther" value={form.cityOther} onChange={onChange} placeholder="Enter city name" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, marginTop: 8, boxSizing: 'border-box' }} />
                  )}
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>{isUkCountry(form.country) ? 'Postal Code *' : 'Area *'}</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input name="area" value={form.area} onChange={onChange} placeholder={isUkCountry(form.country) ? 'Enter postal code (e.g. SW1A 1AA)' : 'Area/District'} style={{ flex: 1, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                    <button
                      type="button"
                      onClick={() => setShowMapPicker(true)}
                      style={{
                        padding: '10px 14px',
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        border: 'none',
                        borderRadius: 8,
                        color: 'white',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      Pin Location
                    </button>
                  </div>
                  {isUkCountry(form.country) && (
                    <div style={{ marginTop: 8 }}>
                      {ukPostcodeLoading && (
                        <div style={{ fontSize: 11, color: '#64748b' }}>Detecting address...</div>
                      )}
                      {!ukPostcodeLoading && !!ukPostcodeError && (
                        <div style={{ fontSize: 11, color: '#b45309' }}>{ukPostcodeError}</div>
                      )}
                      {!ukPostcodeLoading && ukPostcodeResults.length > 0 && (
                        <div style={{ marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: 'white', maxHeight: 220, overflowY: 'auto' }}>
                          {ukPostcodeResults.map((r, idx) => (
                            <button
                              key={r?.place_id || idx}
                              type="button"
                              onClick={() => applyUkPostcodeResult(r)}
                              style={{ width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', borderBottom: idx === ukPostcodeResults.length - 1 ? 'none' : '1px solid #f1f5f9', background: 'white', cursor: 'pointer' }}
                            >
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{buildAddressLine(r?.address, r?.display_name)}</div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{String(r?.address?.city || r?.address?.town || r?.address?.village || r?.address?.county || '')}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {location.lat && location.lng && (
                    <div style={{ marginTop: 6, fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                        <polyline points="22,4 12,14.01 9,11.01"/>
                      </svg>
                      Location pinned ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
                    </div>
                  )}
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Full Address *</label>
                  <textarea name="address" value={form.address} onChange={onChange} placeholder="Street, building, apartment..." rows={2} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, resize: 'none', boxSizing: 'border-box' }} />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Notes (optional)</label>
                  <textarea name="details" value={form.details} onChange={onChange} placeholder="Delivery instructions..." rows={2} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, resize: 'none', boxSizing: 'border-box' }} />
                </div>

                {/* Payment Method Selection */}
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>Payment Method</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Cash on Delivery - Hidden for UK */}
                    {isCodAvailable && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: paymentMethod === 'cod' ? '#fff7ed' : '#f8fafc', border: paymentMethod === 'cod' ? '2px solid #f97316' : '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer' }}>
                        <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} style={{ width: 16, height: 16, accentColor: '#f97316' }} />
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><path d="M1 10h22" /></svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>Cash on Delivery</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>Pay when you receive</div>
                        </div>
                      </label>
                    )}

                    {/* Stripe Card */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: paymentMethod === 'stripe' ? '#fff7ed' : '#f8fafc', border: paymentMethod === 'stripe' ? '2px solid #f97316' : '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer' }}>
                      <input type="radio" name="payment" value="stripe" checked={paymentMethod === 'stripe'} onChange={() => setPaymentMethod('stripe')} style={{ width: 16, height: 16, accentColor: '#f97316' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <CardIcon type="visa" active={true} />
                        <CardIcon type="mastercard" active={true} />
                        <CardIcon type="amex" active={true} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>Credit/Debit Card</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Visa, Mastercard, Amex</div>
                      </div>
                    </label>
                    
                    {/* Stripe Card Element - Show when Stripe selected */}
                    {paymentMethod === 'stripe' && (
                      <div style={{ marginLeft: 26, padding: '16px', background: '#fafafa', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Cardholder Name</label>
                          <input
                            type="text"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            placeholder="John Doe"
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: 'white' }}
                          />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Card Details</label>
                          <div 
                            id="stripe-card-element-mount" 
                            style={{ 
                              padding: '12px', 
                              border: '1px solid #e2e8f0', 
                              borderRadius: 8, 
                              background: 'white',
                              minHeight: 44
                            }}
                          >
                            {!stripeReady && (
                              <div style={{ color: '#94a3b8', fontSize: 14 }}>Loading secure card input...</div>
                            )}
                          </div>
                        </div>
                        {cardError && (
                          <div style={{ marginTop: 12, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626', fontSize: 12 }}>
                            {cardError}
                          </div>
                        )}
                        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontSize: 11 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                          Secured by Stripe - Your card details are encrypted
                        </div>
                      </div>
                    )}

                    {/* PayPal */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: paymentMethod === 'paypal' ? '#fff7ed' : '#f8fafc', border: paymentMethod === 'paypal' ? '2px solid #f97316' : '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer' }}>
                      <input type="radio" name="payment" value="paypal" checked={paymentMethod === 'paypal'} onChange={() => setPaymentMethod('paypal')} style={{ width: 16, height: 16, accentColor: '#f97316' }} />
                      <svg width="80" height="22" viewBox="0 0 80 22" style={{ flexShrink: 0 }}>
                        <rect width="80" height="22" rx="4" fill="#f5f5f5"/>
                        <text x="10" y="15" fill="#253B80" fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif">Pay</text>
                        <text x="35" y="15" fill="#179BD7" fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif">Pal</text>
                      </svg>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>PayPal</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Pay with PayPal account</div>
                      </div>
                    </label>

                    {/* PayPal Info Box - Shows when PayPal is selected */}
                    {paymentMethod === 'paypal' && (
                      <div style={{ marginTop: 12, padding: 16, background: 'linear-gradient(135deg, #0070ba 0%, #003087 100%)', borderRadius: 12, color: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
                          </svg>
                          <span style={{ fontWeight: 700, fontSize: 16 }}>Pay with PayPal</span>
                        </div>
                        <p style={{ fontSize: 13, opacity: 0.9, marginBottom: 12, lineHeight: 1.5 }}>
                          Click "Place Order" below to securely complete your payment through PayPal. You'll be redirected to PayPal to authorize the payment.
                        </p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 20, fontSize: 11 }}>✓ Secure checkout</span>
                          <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 20, fontSize: 11 }}>✓ Buyer protection</span>
                          <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 20, fontSize: 11 }}>✓ Easy refunds</span>
                        </div>
                      </div>
                    )}

                    {/* Apple Pay - Only shown for supported countries */}
                    {isApplePayAvailable && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: paymentMethod === 'applepay' ? '#fff7ed' : '#f8fafc', border: paymentMethod === 'applepay' ? '2px solid #f97316' : '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer' }}>
                        <input type="radio" name="payment" value="applepay" checked={paymentMethod === 'applepay'} onChange={() => setPaymentMethod('applepay')} style={{ width: 16, height: 16, accentColor: '#f97316' }} />
                        <svg width="50" height="22" viewBox="0 0 165 40" style={{ flexShrink: 0 }}>
                          <path fill="#000" d="M150.7 0H14.3C6.4 0 0 6.4 0 14.3v11.4C0 33.6 6.4 40 14.3 40h136.4c7.9 0 14.3-6.4 14.3-14.3V14.3C165 6.4 158.6 0 150.7 0z"/>
                          <path fill="#fff" d="M43.6 13.2c1.1-1.4 1.9-3.2 1.7-5.1-1.6.1-3.6 1.1-4.8 2.5-1 1.2-1.9 3.1-1.7 4.9 1.8.2 3.7-1 4.8-2.3zm1.6 2.6c-2.7-.2-4.9 1.5-6.2 1.5-1.3 0-3.2-1.4-5.3-1.4-2.7 0-5.2 1.6-6.6 4-2.8 4.9-.7 12.2 2 16.2 1.4 2 2.9 4.1 5 4.1 2-.1 2.8-1.3 5.2-1.3 2.4 0 3.1 1.3 5.2 1.2 2.2 0 3.5-2 4.8-4 1.5-2.3 2.1-4.5 2.2-4.6-.1 0-4.1-1.6-4.2-6.3-.1-3.9 3.2-5.8 3.4-5.9-1.9-2.8-4.8-3.1-5.8-3.2-.3-.1-.5-.2-.7-.3zm22.3-4.7v28.6h4.4v-9.8h6.1c5.6 0 9.5-3.8 9.5-9.4 0-5.6-3.9-9.4-9.4-9.4h-10.6zm4.4 3.7h5.1c3.8 0 6 2 6 5.7s-2.2 5.7-6 5.7h-5.1v-11.4zm24.1 25.2c2.8 0 5.3-1.4 6.5-3.6h.1v3.4h4.1V23.9c0-4.1-3.3-6.8-8.3-6.8-4.7 0-8.1 2.7-8.2 6.5h4c.3-1.8 2-2.9 4-2.9 2.6 0 4.1 1.2 4.1 3.5v1.5l-5.3.3c-5 .3-7.6 2.3-7.6 5.9 0 3.6 2.7 6 6.6 6zm1.2-3.4c-2.3 0-3.7-1.1-3.7-2.8 0-1.8 1.4-2.8 4-3l4.7-.3v1.6c0 2.6-2.2 4.5-5 4.5zm15.9 10.7c4.3 0 6.3-1.6 8.1-6.6l7.7-21.6h-4.5l-5.2 16.5h-.1l-5.2-16.5h-4.6l7.5 20.6-.4 1.3c-.7 2.2-1.8 3-3.8 3-.4 0-1.1 0-1.4-.1v3.4c.3.1 1.5.1 1.9 0z"/>
                        </svg>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>Apple Pay</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>Fast & secure checkout</div>
                        </div>
                      </label>
                    )}

                    {/* Google Pay - Only shown for supported countries */}
                    {isGooglePayAvailable && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: paymentMethod === 'googlepay' ? '#fff7ed' : '#f8fafc', border: paymentMethod === 'googlepay' ? '2px solid #f97316' : '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer' }}>
                        <input type="radio" name="payment" value="googlepay" checked={paymentMethod === 'googlepay'} onChange={() => setPaymentMethod('googlepay')} style={{ width: 16, height: 16, accentColor: '#f97316' }} />
                        <svg width="50" height="22" viewBox="0 0 150 60" style={{ flexShrink: 0 }}>
                          <rect width="150" height="60" rx="8" fill="#fff" stroke="#dadce0"/>
                          <path d="M54.5 30.6v9h-2.9V19.3h7.7c1.9 0 3.5.6 4.8 1.9 1.4 1.3 2 2.8 2 4.6s-.7 3.4-2 4.6c-1.3 1.3-2.9 1.9-4.8 1.9h-4.8v.3zm0-8.5v5.7h4.9c1.1 0 2.1-.4 2.8-1.1.8-.7 1.2-1.6 1.2-2.7 0-1.1-.4-2-1.1-2.7-.8-.8-1.7-1.2-2.8-1.2h-4.9z" fill="#3c4043"/>
                          <path d="M74.7 26.1c2.1 0 3.8.6 5 1.7 1.2 1.2 1.8 2.8 1.8 4.8v9.7h-2.7v-2.2h-.1c-1.2 1.8-2.8 2.7-4.8 2.7-1.7 0-3.2-.5-4.3-1.5-1.1-1-1.7-2.3-1.7-3.8 0-1.6.6-2.9 1.8-3.8 1.2-1 2.8-1.4 4.8-1.4 1.7 0 3.1.3 4.2 1v-.7c0-1.1-.4-2-1.2-2.8-.8-.7-1.8-1.1-2.9-1.1-1.7 0-3 .7-3.9 2.1l-2.5-1.6c1.4-2 3.5-3 6.2-3zm-3.7 11.5c0 .8.3 1.5 1 2 .6.5 1.4.8 2.2.8 1.2 0 2.3-.5 3.2-1.4.9-.9 1.4-2 1.4-3.2-1-.8-2.3-1.2-4-1.2-1.2 0-2.2.3-3 .9-.5.6-.8 1.3-.8 2.1z" fill="#3c4043"/>
                          <path d="M96.2 26.6l-9.5 21.8h-2.9l3.5-7.6-6.2-14.2h3.1l4.5 10.8h.1l4.4-10.8h3z" fill="#3c4043"/>
                          <path d="M35.8 31.4c0-.9-.1-1.8-.2-2.6H23v5h7.2c-.3 1.7-1.3 3.1-2.7 4.1v3.4h4.4c2.6-2.4 4-5.9 4-9.8z" fill="#4285f4"/>
                          <path d="M23 44.9c3.6 0 6.7-1.2 8.9-3.2l-4.4-3.4c-1.2.8-2.7 1.3-4.5 1.3-3.5 0-6.4-2.4-7.5-5.5h-4.5v3.5c2.2 4.4 6.8 7.4 12 7.4z" fill="#34a853"/>
                          <path d="M15.5 34c-.3-.8-.4-1.7-.4-2.6s.2-1.8.4-2.6v-3.5h-4.5c-1 1.9-1.5 4-1.5 6.1s.6 4.2 1.5 6.1l4.5-3.5z" fill="#fbbc04"/>
                          <path d="M23 23.4c2 0 3.7.7 5.1 2l3.8-3.8c-2.3-2.2-5.3-3.5-8.9-3.5-5.2 0-9.8 3-12 7.4l4.5 3.5c1.1-3.2 4-5.5 7.5-5.5z" fill="#ea4335"/>
                        </svg>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>Google Pay</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>Fast & secure checkout</div>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Coupon Code */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>Have a Coupon?</label>
                {couponApplied ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>🎉</span>
                      <div>
                        <div style={{ fontWeight: 600, color: '#059669', fontSize: 13 }}>{couponApplied.code}</div>
                        <div style={{ fontSize: 11, color: '#10b981' }}>
                          {couponApplied.discountType === 'percentage' ? `${couponApplied.discountValue}% off` : `${formatPrice(couponApplied.discountValue, displayCurrency)} off`}
                        </div>
                      </div>
                    </div>
                    <button onClick={removeCoupon} style={{ padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      style={{ flex: 1, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, textTransform: 'uppercase' }}
                    />
                    <button
                      onClick={applyCoupon}
                      disabled={couponLoading}
                      style={{ padding: '10px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: couponLoading ? 'wait' : 'pointer', opacity: couponLoading ? 0.7 : 1 }}
                    >
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                )}
              </div>

              {(() => {
                let token = ''
                let me = {}
                try { token = localStorage.getItem('token') || '' } catch {}
                try { me = JSON.parse(localStorage.getItem('me') || '{}') } catch { me = {} }
                const canUseWallet = isUkCountry(form.country) && !!token && me?.role === 'customer'
                if (!canUseWallet) return null
                return (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                    <div
                      style={{
                        padding: 14,
                        borderRadius: 14,
                        border: '1px solid rgba(249,115,22,0.25)',
                        background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 55%, #ffffff 100%)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 12, background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 900 }}>
                            ₿
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>Wallet</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Use your wallet balance (partial payment)</div>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gap: 2, textAlign: 'right' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b' }}>Available</div>
                          <div style={{ fontSize: 13, fontWeight: 950, color: '#0f172a' }}>{formatPrice(getWalletBalance(), displayCurrency)}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={walletApply}
                          onChange={(e) => setWalletApply(e.target.value)}
                          onBlur={() => setWalletApply(getWalletApply())}
                          placeholder="0.00"
                          style={{ flex: 1, minWidth: 160, padding: '11px 12px', border: '1px solid rgba(249,115,22,0.22)', borderRadius: 12, fontSize: 14, fontWeight: 800, color: '#0f172a', background: 'rgba(255,255,255,0.9)' }}
                        />
                        <button
                          type="button"
                          onClick={() => setWalletApply(Math.min(getWalletBalance(), getTotalPrice()))}
                          style={{ padding: '11px 12px', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white', border: 'none', borderRadius: 12, fontSize: 12, fontWeight: 900, cursor: 'pointer', boxShadow: '0 12px 20px rgba(249,115,22,0.22)' }}
                        >
                          Max
                        </button>
                        <button
                          type="button"
                          onClick={() => setWalletApply(0)}
                          style={{ padding: '11px 12px', background: 'rgba(255,255,255,0.85)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 12, fontSize: 12, fontWeight: 900, cursor: 'pointer' }}
                        >
                          Clear
                        </button>
                      </div>

                      <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 800 }}>Applying</div>
                          <div style={{ fontSize: 12, color: '#0f172a', fontWeight: 900 }}>{formatPrice(getWalletApply(), displayCurrency)}</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 800 }}>Remaining to pay</div>
                          <div style={{ fontSize: 12, color: '#0f172a', fontWeight: 900 }}>{formatPrice(getRemainingToPay(), displayCurrency)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Total & Checkout */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, color: '#64748b' }}>Subtotal ({getTotalItems()} items)</span>
                  <span style={{ fontSize: 16, color: '#64748b' }}>{renderPrice(getSubtotal(), displayCurrency)}</span>
                </div>

                {couponDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, color: '#10b981' }}>Coupon Discount</span>
                    <span style={{ fontSize: 16, color: '#10b981', fontWeight: 600 }}>-{renderPrice(couponDiscount, displayCurrency)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingTop: 8, borderTop: couponDiscount > 0 ? '1px dashed #e2e8f0' : 'none' }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Total</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{renderPrice(getTotalPrice(), displayCurrency, 16)}</span>
                </div>

                {getWalletApply() > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, color: '#ea580c', fontWeight: 800 }}>Wallet Applied</span>
                    <span style={{ fontSize: 16, color: '#ea580c', fontWeight: 900 }}>-{renderPrice(getWalletApply(), displayCurrency)}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingTop: 8, borderTop: '1px dashed #e2e8f0' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Amount to pay</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{renderPrice(getRemainingToPay(), displayCurrency, 15)}</span>
                </div>
                
                {/* Terms & Conditions Agreement */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      style={{ width: 18, height: 18, marginTop: 2, accentColor: '#f97316', flexShrink: 0, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                      By placing this order, I agree to the{' '}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#f97316', fontWeight: 600, textDecoration: 'underline' }}>Terms &amp; Conditions</a>
                      {' '}and{' '}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#f97316', fontWeight: 600, textDecoration: 'underline' }}>Privacy Policy</a>.
                      {' '}I understand that my personal data will be processed in accordance with the Privacy Policy.
                    </span>
                  </label>
                </div>

                <button 
                  onClick={submitOrder}
                  disabled={isLoading || !agreedToTerms}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: (isLoading || !agreedToTerms) ? '#94a3b8' : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: (isLoading || !agreedToTerms) ? 'not-allowed' : 'pointer',
                    boxShadow: (isLoading || !agreedToTerms) ? 'none' : '0 4px 14px rgba(249, 115, 22, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isLoading ? 'Placing Order...' : 'Place Order'}
                </button>

                <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 10, lineHeight: 1.5 }}>
                  Your personal data is used to process your order, support your experience, and for purposes described in our{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', textDecoration: 'underline' }}>Privacy Policy</a>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Stripe Payment Modal */}
      {showStripeModal && stripeClientSecret && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 450, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>💳 Complete Payment</h3>
              <button onClick={() => { setShowStripeModal(false); setStripeClientSecret(null) }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 4 }}>×</button>
            </div>
            
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#64748b' }}>Amount to pay</span>
                <span style={{ fontWeight: 700, fontSize: 18 }}>{formatPrice(getRemainingToPay(), displayCurrency)}</span>
              </div>
            </div>

            {/* Stripe Card Element Container */}
            <div id="stripe-card-element" style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Card Number</label>
                <input 
                  type="text" 
                  id="stripe-card-number"
                  placeholder="4242 4242 4242 4242" 
                  maxLength={19}
                  style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\s/g, '').replace(/\D/g, '')
                    v = v.match(/.{1,4}/g)?.join(' ') || v
                    e.target.value = v
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Expiry</label>
                  <input 
                    type="text" 
                    id="stripe-card-expiry"
                    placeholder="MM/YY" 
                    maxLength={5}
                    style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, '')
                      if (v.length >= 2) v = v.slice(0,2) + '/' + v.slice(2,4)
                      e.target.value = v
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>CVC</label>
                  <input 
                    type="text" 
                    id="stripe-card-cvc"
                    placeholder="123" 
                    maxLength={4}
                    style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={async () => {
                const cardNumber = document.getElementById('stripe-card-number')?.value?.replace(/\s/g, '')
                const expiry = document.getElementById('stripe-card-expiry')?.value
                const cvc = document.getElementById('stripe-card-cvc')?.value
                
                if (!cardNumber || cardNumber.length < 13) {
                  toast.error('Please enter a valid card number')
                  return
                }
                if (!expiry || expiry.length < 5) {
                  toast.error('Please enter card expiry date')
                  return
                }
                if (!cvc || cvc.length < 3) {
                  toast.error('Please enter CVC')
                  return
                }

                setProcessingPayment(true)
                try {
                  // For demo/sandbox, we'll confirm the payment intent directly
                  // In production, you'd use Stripe.js Elements
                  const res = await apiPost('/api/ecommerce/payments/stripe/confirm', {
                    paymentIntentId: stripeClientSecret.split('_secret_')[0]
                  })
                  
                  if (res.success) {
                    await handleStripeSuccess(stripeClientSecret.split('_secret_')[0])
                  } else {
                    toast.error('Payment failed. Please try again.')
                  }
                } catch (err) {
                  toast.error(err?.message || 'Payment failed')
                } finally {
                  setProcessingPayment(false)
                }
              }}
              disabled={processingPayment}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: processingPayment ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: processingPayment ? 'wait' : 'pointer'
              }}
            >
              {processingPayment ? 'Processing...' : `Pay ${formatPrice(getRemainingToPay(), displayCurrency)}`}
            </button>
            
            <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 12 }}>
              🔒 Secured by Stripe. Your card details are encrypted.
            </p>
          </div>
        </div>
      )}
      
      {/* Google Maps Location Picker Modal */}
      {showMapPicker && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            width: '100%',
            maxWidth: 600,
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Pin Your Location</h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>Click on the map to select your delivery location</p>
              </div>
              <button
                onClick={() => setShowMapPicker(false)}
                style={{
                  width: 32, height: 32,
                  border: 'none',
                  background: '#f1f5f9',
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div style={{ height: 400, position: 'relative' }}>
              {mapLoaded && window.google?.maps ? (
                <MapPicker 
                  onSelect={handleMapSelect} 
                  initialLat={location.lat || 24.7136} 
                  initialLng={location.lng || 46.6753}
                />
              ) : (
                <div style={{ 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: '#f8fafc',
                  color: '#64748b'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <p style={{ margin: 0, fontSize: 14 }}>Loading map...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Map Picker Component
function MapPicker({ onSelect, initialLat, initialLng }) {
  const mapRef = React.useRef(null)
  const markerRef = React.useRef(null)
  const [selectedPos, setSelectedPos] = React.useState({ lat: initialLat, lng: initialLng })
  
  React.useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return
    
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: initialLat, lng: initialLng },
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    })
    
    markerRef.current = new window.google.maps.Marker({
      position: { lat: initialLat, lng: initialLng },
      map,
      draggable: true,
      animation: window.google.maps.Animation.DROP
    })
    
    map.addListener('click', (e) => {
      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      markerRef.current.setPosition(pos)
      setSelectedPos(pos)
    })
    
    markerRef.current.addListener('dragend', () => {
      const pos = markerRef.current.getPosition()
      setSelectedPos({ lat: pos.lat(), lng: pos.lng() })
    })
    
    // Try to get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = { lat: position.coords.latitude, lng: position.coords.longitude }
          map.setCenter(pos)
          markerRef.current.setPosition(pos)
          setSelectedPos(pos)
        },
        () => {}
      )
    }
  }, [initialLat, initialLng])
  
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div ref={mapRef} style={{ flex: 1 }} />
      <div style={{ padding: 12, borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <button
          onClick={() => onSelect(selectedPos.lat, selectedPos.lng)}
          style={{
            width: '100%',
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
            <polyline points="22,4 12,14.01 9,11.01"/>
          </svg>
          Confirm Location
        </button>
      </div>
    </div>
  )
}
