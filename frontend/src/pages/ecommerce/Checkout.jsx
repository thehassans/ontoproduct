import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '../../ui/Toast'
import { trackPageView, trackCheckoutComplete } from '../../utils/analytics'
import Header from '../../components/layout/Header'
import { COUNTRY_LIST } from '../../utils/constants'
import { apiGet, apiPost } from '../../api'
import { COUNTRY_TO_CURRENCY } from '../../utils/constants'

// Moyasar Form Script URL
const MOYASAR_SCRIPT_URL = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.js'
const MOYASAR_CSS_URL = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.css'

export default function Checkout() {
  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: Customer Info, 2: Payment, 3: Confirmation
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  // Customer Information
  const [customerInfo, setCustomerInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'UAE',
    postalCode: '',
    location: { lat: null, lng: null }
  })
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [mapCenter, setMapCenter] = useState({ lat: 25.2048, lng: 55.2708 }) // Default Dubai
  const [loadingAddress, setLoadingAddress] = useState(false)
  const [ukPostcodeResults, setUkPostcodeResults] = useState([])
  const [ukPostcodeLoading, setUkPostcodeLoading] = useState(false)
  const [ukPostcodeError, setUkPostcodeError] = useState('')
  const ukPostcodeAbortRef = useRef(null)
  const ukPostcodeTimerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  // Reverse geocode coordinates to address
  async function reverseGeocode(lat, lng) {
    try {
      setLoadingAddress(true)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await response.json()
      if (data && data.display_name) {
        const addr = data.address || {}
        return {
          address: data.display_name,
          city: addr.city || addr.town || addr.village || addr.county || '',
          country: addr.country || ''
        }
      }
    } catch (err) {
      console.error('Reverse geocode error:', err)
    } finally {
      setLoadingAddress(false)
    }
    return null
  }

  const normalizeUkPostcode = (input) => {
    const raw = String(input || '').toUpperCase().replace(/\s+/g, ' ').trim()
    if (!raw) return ''
    return raw
  }

  const isValidUkPostcode = (postcode) => {
    const pc = normalizeUkPostcode(postcode)
    if (!pc) return false
    const re = /^(GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/i
    return re.test(pc)
  }

  const isUkCountry = (countryValue) => {
    const c = String(countryValue || '').trim().toUpperCase()
    if (!c) return false
    return c === 'UK' || c === 'GB' || c === 'UNITED KINGDOM'
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
    const postcode = normalizeUkPostcode(addr.postcode || customerInfo.postalCode)
    const addressLine = buildAddressLine(addr, r?.display_name)

    setCustomerInfo(prev => ({
      ...prev,
      address: addressLine || prev.address,
      city: city || prev.city,
      postalCode: postcode || prev.postalCode,
      location: { lat, lng }
    }))

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setMapCenter({ lat, lng })
    }
    setUkPostcodeResults([])
    setUkPostcodeError('')
  }

  useEffect(() => {
    const isUk = isUkCountry(customerInfo.country)
    if (!isUk) {
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

    const pc = normalizeUkPostcode(customerInfo.postalCode)
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

        const geo = await reverseGeocode(lat, lng)
        setCustomerInfo(prev => ({
          ...prev,
          postalCode: normalizeUkPostcode(result?.postcode || pc) || prev.postalCode,
          address: String(geo?.address || prev.address || '').trim(),
          city: String(geo?.city || prev.city || '').trim(),
          location: { lat, lng }
        }))
        setMapCenter({ lat, lng })
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
  }, [customerInfo.country, customerInfo.postalCode])

  // Payment Information
  const [paymentInfo, setPaymentInfo] = useState({
    method: 'card', // card, cash_on_delivery, paypal
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  })

  // PayPal state
  const [paypalLoading, setPaypalLoading] = useState(false)
  const [paypalSdkLoading, setPaypalSdkLoading] = useState(false)
  const [paymentConfig, setPaymentConfig] = useState(null)
  const paypalContainerRef = useRef(null)
  const paypalButtonsRendered = useRef(false)
  const paypalSdkRef = useRef({ clientId: null, currency: null })

  // Moyasar (Mada/Apple Pay) state
  const [moyasarConfig, setMoyasarConfig] = useState(null)
  const [moyasarLoading, setMoyasarLoading] = useState(false)
  const moyasarFormRef = useRef(null)
  const moyasarInitialized = useRef(false)

  // Terms agreement
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Coupon state
  const [couponCode, setCouponCode] = useState('')
  const [couponApplied, setCouponApplied] = useState(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponLoading, setCouponLoading] = useState(false)

  // Wallet state
  const [walletSummary, setWalletSummary] = useState({ byCurrency: {} })
  const [walletApply, setWalletApply] = useState(0)

  // Load Moyasar config on mount
  useEffect(() => {
    async function loadMoyasarConfig() {
      try {
        const res = await apiGet('/api/moyasar/config')
        if (res?.publishableKey) {
          setMoyasarConfig(res)
        }
      } catch (err) {
        console.log('Moyasar config not available:', err)
      }
    }
    loadMoyasarConfig()
  }, [])

  // Load payment config (Stripe/PayPal public config)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const cfg = await apiGet('/api/ecommerce/payments/config')
        if (alive) setPaymentConfig(cfg || null)
      } catch {
        if (alive) setPaymentConfig(null)
      }
    })()
    return () => { alive = false }
  }, [])

  // Load wallet summary (for partial wallet payment)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await apiGet('/api/ecommerce/customer/wallet/summary')
        if (alive && r?.byCurrency) setWalletSummary({ byCurrency: r.byCurrency })
      } catch {}
    })()
    return () => { alive = false }
  }, [])

  // Initialize Moyasar payment form when Mada or Apple Pay is selected
  useEffect(() => {
    if (step !== 2) return
    if (paymentInfo.method !== 'mada' && paymentInfo.method !== 'applepay') return
    if (!moyasarConfig?.publishableKey) return
    if (moyasarInitialized.current) return

    const initMoyasar = async () => {
      // Load Moyasar CSS
      if (!document.querySelector(`link[href="${MOYASAR_CSS_URL}"]`)) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = MOYASAR_CSS_URL
        document.head.appendChild(link)
      }

      // Load Moyasar script
      if (!window.Moyasar) {
        const script = document.createElement('script')
        script.src = MOYASAR_SCRIPT_URL
        script.async = true
        await new Promise((resolve, reject) => {
          script.onload = resolve
          script.onerror = reject
          document.head.appendChild(script)
        })
      }

      // Wait for DOM element
      await new Promise(resolve => setTimeout(resolve, 100))

      if (!moyasarFormRef.current || !window.Moyasar) return

      const totalAmount = getTotalPrice()
      const remainingToPay = getRemainingToPay()
      if (remainingToPay <= 0) {
        setMoyasarLoading(false)
        return
      }
      const callbackUrl = `${window.location.origin}/api/moyasar/callback`

      try {
        window.Moyasar.init({
          element: moyasarFormRef.current,
          amount: Math.round(remainingToPay * 100), // Convert to halalas
          currency: 'SAR',
          description: `Order - ${getTotalItems()} items`,
          publishable_api_key: moyasarConfig.publishableKey,
          callback_url: callbackUrl,
          methods: paymentInfo.method === 'mada' ? ['creditcard'] : ['applepay'],
          credit_card: paymentInfo.method === 'mada' ? {
            save_card: false
          } : undefined,
          apple_pay: paymentInfo.method === 'applepay' ? {
            country: 'SA',
            label: 'BuySial Store',
            validate_merchant_url: '/api/moyasar/applepay/session'
          } : undefined,
          on_completed: async (payment) => {
            console.log('Moyasar payment completed:', payment)
            await handleMoyasarPaymentComplete(payment)
          },
          on_failure: (error) => {
            console.error('Moyasar payment failed:', error)
            toast.error(error?.message || 'Payment failed. Please try again.')
            setMoyasarLoading(false)
          }
        })
        moyasarInitialized.current = true
      } catch (err) {
        console.error('Moyasar init error:', err)
      }
    }

    initMoyasar()

    return () => {
      moyasarInitialized.current = false
    }
  }, [step, paymentInfo.method, moyasarConfig])

  // Handle Moyasar payment completion
  const handleMoyasarPaymentComplete = async (payment) => {
    setMoyasarLoading(true)
    try {
      // Verify payment on backend
      const verifyRes = await apiGet(`/api/moyasar/verify/${payment.id}`)
      
      if (verifyRes.status !== 'paid') {
        throw new Error(verifyRes.source?.message || 'Payment not confirmed')
      }

      // Create order with payment info
      const orderData = {
        address: customerInfo.address,
        city: customerInfo.city,
        area: '',
        postalCode: customerInfo.postalCode,
        orderCountry: customerInfo.country,
        phone: customerInfo.phone,
        details: '',
        items: cartItems.map(item => ({
          productId: item.productId || item.id,
          quantity: item.quantity,
          variants: item?.variants && typeof item.variants === 'object' ? item.variants : {}
        })),
        currency: getOrderCurrency(),
        paymentMethod: paymentInfo.method,
        paymentStatus: 'paid',
        paymentId: payment.id,
        walletApply: getWalletApply(),
      }

      const customerToken = localStorage.getItem('token')
      const response = await fetch('/api/ecommerce/customer/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify(orderData)
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to place order')
      }

      const cartValue = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
      const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0)
      trackCheckoutComplete(result.orderId || result._id, cartValue, itemCount, paymentInfo.method)

      localStorage.removeItem('shopping_cart')
      localStorage.removeItem('checkout_cart')
      localStorage.removeItem('cart')
      setCartItems([])

      window.dispatchEvent(new CustomEvent('cartUpdated'))
      window.dispatchEvent(new StorageEvent('storage', { key: 'shopping_cart', newValue: null }))

      setStep(3)
      toast.success('Payment successful! Order placed.')
    } catch (error) {
      console.error('Order creation error:', error)
      toast.error(error.message || 'Failed to complete order. Please contact support.')
    } finally {
      setMoyasarLoading(false)
    }
  }

  // Check if customer is logged in and load their info
  useEffect(() => {
    const customerToken = localStorage.getItem('token')
    if (!customerToken) {
      toast.error('Please login to continue checkout')
      localStorage.setItem('checkout_redirect', '/checkout')
      navigate('/customer/login', { replace: true })
      return
    }
    setIsAuthenticated(true)
    
    // Load customer profile and pre-fill info
    loadCustomerProfile()
  }, [navigate, toast])

  async function loadCustomerProfile() {
    try {
      const res = await apiGet('/api/ecommerce/customer/profile')
      const customer = res?.customer
      if (customer) {
        setCustomerInfo(prev => ({
          ...prev,
          firstName: customer.firstName || prev.firstName,
          lastName: customer.lastName || prev.lastName,
          email: customer.email || prev.email,
          phone: customer.phone || prev.phone,
          address: customer.address || prev.address,
          city: customer.city || prev.city,
          country: customer.country || prev.country,
          postalCode: customer.postalCode || prev.postalCode,
          location: customer.location || prev.location
        }))
        // Set map center if customer has saved location
        if (customer.location?.lat && customer.location?.lng) {
          setMapCenter({ lat: customer.location.lat, lng: customer.location.lng })
        }
      }
    } catch (err) {
      console.log('Could not load customer profile:', err)
    }
  }

  // Load cart items on component mount
  useEffect(() => {
    const savedCart = localStorage.getItem('checkout_cart')
    if (savedCart) {
      try {
        const items = JSON.parse(savedCart)
        setCartItems(items)
      } catch (error) {
        console.error('Error loading checkout cart:', error)
        toast.error('Error loading cart items')
        navigate('/products')
      }
    } else {
      toast.error('No items in cart')
      navigate('/products')
    }
    
    // Track page view
    trackPageView('/checkout', 'Checkout')
  }, [navigate, toast])

  const getSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const getTotalPrice = () => {
    return Math.max(0, getSubtotal() - couponDiscount)
  }

  const getOrderCurrency = () => {
    return COUNTRY_TO_CURRENCY[customerInfo.country] || 'SAR'
  }

  const getWalletBalance = () => {
    const ccy = getOrderCurrency()
    return Number(walletSummary?.byCurrency?.[ccy] || 0)
  }

  const getWalletApply = () => {
    const total = getTotalPrice()
    const bal = getWalletBalance()
    return Math.max(0, Math.min(Number(walletApply || 0), bal, total))
  }

  const getRemainingToPay = () => {
    return Math.max(0, getTotalPrice() - getWalletApply())
  }

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0)
  }

  const getPayPalCurrency = () => {
    const c = String(getOrderCurrency() || 'USD').toUpperCase()
    const supported = [
      'USD','EUR','GBP','CAD','AUD','JPY','CNY','CHF','HKD','SGD','SEK','DKK','PLN','NOK','HUF','CZK','ILS','MXN','BRL','MYR','PHP','TWD','THB','INR','NZD'
    ]
    return supported.includes(c) ? c : 'USD'
  }

  const ensurePayPalSdk = async () => {
    const clientId = paymentConfig?.paypal?.clientId
    if (!paymentConfig?.paypal?.enabled || !clientId) return false
    const currency = getPayPalCurrency()
    if (window.paypal && paypalSdkRef.current.clientId === clientId && paypalSdkRef.current.currency === currency) {
      return true
    }
    try {
      setPaypalSdkLoading(true)
      // Remove previous sdk script if present
      const prev = document.querySelector('script[data-paypal-sdk="1"]')
      if (prev) {
        try { prev.remove() } catch {}
      }
      // Reset global
      try { delete window.paypal } catch {}

      const script = document.createElement('script')
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=capture`
      script.async = true
      script.setAttribute('data-paypal-sdk', '1')
      await new Promise((resolve, reject) => {
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })
      paypalSdkRef.current = { clientId, currency }
      return !!window.paypal
    } catch {
      return false
    } finally {
      setPaypalSdkLoading(false)
    }
  }

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

  const handleCustomerInfoChange = (field, value) => {
    setCustomerInfo(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handlePaymentInfoChange = (field, value) => {
    setPaymentInfo(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateCustomerInfo = () => {
    const required = ['firstName', 'lastName', 'email', 'phone', 'address', 'city']
    for (const field of required) {
      if (!customerInfo[field].trim()) {
        toast.error(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`)
        return false
      }
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customerInfo.email)) {
      toast.error('Please enter a valid email address')
      return false
    }

    return true
  }

  const validatePaymentInfo = () => {
    if (paymentInfo.method === 'cash_on_delivery' || paymentInfo.method === 'paypal') {
      return true
    }

    const required = ['cardNumber', 'expiryDate', 'cvv', 'cardholderName']
    for (const field of required) {
      if (!paymentInfo[field].trim()) {
        toast.error(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`)
        return false
      }
    }

    // Basic card number validation (remove spaces and check length)
    const cardNumber = paymentInfo.cardNumber.replace(/\s/g, '')
    if (cardNumber.length < 13 || cardNumber.length > 19) {
      toast.error('Please enter a valid card number')
      return false
    }

    return true
  }

  const handleNextStep = () => {
    if (step === 1) {
      if (validateCustomerInfo()) {
        setStep(2)
      }
    } else if (step === 2) {
      if (!agreedToTerms) {
        toast.error('Please agree to the Terms & Conditions and Privacy Policy')
        return
      }
      if (getRemainingToPay() <= 0) {
        handlePlaceOrder()
        return
      }
      // For PayPal, the payment is handled by PayPal buttons
      if (paymentInfo.method === 'paypal') {
        toast.info('Please complete payment using the PayPal button below')
        return
      }
      if (validatePaymentInfo()) {
        handlePlaceOrder()
      }
    }
  }

  // Render PayPal buttons when PayPal is selected
  useEffect(() => {
    // Reset PayPal container when totals change to keep amount correct
    if (paymentInfo.method === 'paypal' && paypalContainerRef.current) {
      try {
        paypalContainerRef.current.innerHTML = ''
      } catch {}
      paypalButtonsRendered.current = false
    }

    if (step === 2 && paymentInfo.method === 'paypal' && paypalContainerRef.current && !paypalButtonsRendered.current) {
      if (getRemainingToPay() <= 0) return
      ;(async () => {
        const ok = await ensurePayPalSdk()
        if (!ok) return
        if (!paypalContainerRef.current) return
        if (paypalButtonsRendered.current) return
      paypalButtonsRendered.current = true
      
      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'paypal'
        },
        createOrder: (data, actions) => {
          const remaining = getRemainingToPay()
          return fetch('/api/ecommerce/payments/paypal/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: remaining,
              currency: getOrderCurrency()
            })
          })
            .then((r) => r.json())
            .then((j) => {
              if (!j?.success || !j?.orderId) throw new Error(j?.message || 'Failed to create PayPal order')
              return j.orderId
            })
        },
        onApprove: async (data, actions) => {
          setPaypalLoading(true)
          try {
            const paypalOrderId = data?.orderID
            if (!paypalOrderId) throw new Error('PayPal order missing')

            const captureRes = await apiPost('/api/ecommerce/payments/paypal/capture', {
              paypalOrderId
            })

            if (!captureRes?.success) throw new Error('Payment capture failed')

            // Place order with PayPal transaction ID
            await handlePlaceOrderWithPayPal(paypalOrderId)
          } catch (error) {
            console.error('PayPal capture error:', error)
            toast.error('Payment failed. Please try again.')
          } finally {
            setPaypalLoading(false)
          }
        },
        onError: (err) => {
          console.error('PayPal error:', err)
          toast.error('PayPal payment failed. Please try again or use another payment method.')
        },
        onCancel: () => {
          toast.info('Payment cancelled')
        }
      }).render(paypalContainerRef.current)
      })()
    }
    
    // Reset PayPal buttons flag when switching away from PayPal
    if (paymentInfo.method !== 'paypal') {
      paypalButtonsRendered.current = false
    }
  }, [step, paymentInfo.method, walletApply, couponDiscount, cartItems.length])

  // Handle order placement with PayPal
  const handlePlaceOrderWithPayPal = async (paypalTransactionId) => {
    setLoading(true)
    
    try {
      const orderData = {
        address: customerInfo.address,
        city: customerInfo.city,
        area: '',
        postalCode: customerInfo.postalCode,
        orderCountry: customerInfo.country,
        phone: customerInfo.phone,
        details: '',
        items: cartItems.map(item => ({
          productId: item.productId || item.id,
          quantity: item.quantity,
          variants: item?.variants && typeof item.variants === 'object' ? item.variants : {}
        })),
        currency: getOrderCurrency(),
        paymentMethod: 'paypal',
        paymentStatus: 'paid',
        paymentId: paypalTransactionId,
        walletApply: getWalletApply(),
      }

      const customerToken = localStorage.getItem('token')
      
      const response = await fetch('/api/ecommerce/customer/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify(orderData)
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to place order')
      }
      
      const cartValue = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
      const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0)
      
      trackCheckoutComplete(result.orderId || result._id, cartValue, itemCount, 'paypal')
      
      localStorage.removeItem('shopping_cart')
      localStorage.removeItem('checkout_cart')
      localStorage.removeItem('cart')
      
      setCartItems([])
      
      window.dispatchEvent(new CustomEvent('cartUpdated'))
      window.dispatchEvent(new StorageEvent('storage', { key: 'shopping_cart', newValue: null }))
      
      setStep(3)
      toast.success('Payment successful! Order placed.')
    } catch (error) {
      console.error('Error placing order:', error)
      toast.error(error.message || 'Failed to place order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePlaceOrder = async () => {
    setLoading(true)
    
    try {
      const remainingToPay = getRemainingToPay()
      const walletOnly = remainingToPay <= 0

      // Build order data with location
      const orderData = {
        address: customerInfo.address,
        city: customerInfo.city,
        area: '',
        postalCode: customerInfo.postalCode,
        orderCountry: customerInfo.country,
        phone: customerInfo.phone,
        details: '',
        items: cartItems.map(item => ({
          productId: item.productId || item.id,
          quantity: item.quantity,
          variants: item?.variants && typeof item.variants === 'object' ? item.variants : {}
        })),
        currency: getOrderCurrency(),
        paymentMethod: walletOnly ? 'wallet' : paymentInfo.method,
        paymentStatus: walletOnly ? 'paid' : (paymentInfo.method === 'cash_on_delivery' ? 'pending' : 'pending'),
        paymentId: walletOnly ? null : null,
        walletApply: getWalletApply(),
      }

      // Get customer token for authenticated order
      const customerToken = localStorage.getItem('token')
      
      // Make API call to create order
      const response = await fetch('/api/ecommerce/customer/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify(orderData)
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to place order')
      }
      
      // Calculate totals for tracking
      const cartValue = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
      const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0)
      
      // Track checkout completion
      trackCheckoutComplete(result.orderId || result._id, cartValue, itemCount, paymentInfo.method)
      
      // Clear ALL cart data after successful order
      localStorage.removeItem('shopping_cart')
      localStorage.removeItem('checkout_cart')
      localStorage.removeItem('cart')
      
      // Clear cart items state
      setCartItems([])
      
      // Dispatch cart update event to notify all components
      window.dispatchEvent(new CustomEvent('cartUpdated'))
      window.dispatchEvent(new StorageEvent('storage', { key: 'shopping_cart', newValue: null }))
      
      setStep(3)
      toast.success('Order placed successfully!')
    } catch (error) {
      console.error('Error placing order:', error)
      toast.error(error.message || 'Failed to place order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatCardNumber = (value) => {
    // Remove all non-digits
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    // Add spaces every 4 digits
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  // Block rendering if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (step === 3) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Confirmed!</h1>
            <p className="text-gray-600 mb-8">
              Thank you for your order. We'll send you a confirmation email shortly.
            </p>
            
            <div className="space-y-4">
              <button
                onClick={() => navigate('/products')}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-md font-medium hover:bg-blue-700 transition-colors"
              >
                Continue Shopping
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-md font-medium hover:bg-gray-50 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />
      
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            <button 
              onClick={() => navigate('/')}
              className="text-gray-500 hover:text-blue-600 transition-colors"
            >
              Home
            </button>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <button 
              onClick={() => navigate('/products')}
              className="text-gray-500 hover:text-blue-600 transition-colors"
            >
              Products
            </button>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-900 font-medium">Checkout</span>
          </nav>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Steps */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    step >= 1 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' 
                      : 'bg-gray-200'
                  }`}>
                    {step > 1 ? (
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-sm sm:text-base font-semibold">1</span>
                    )}
                  </div>
                  <div className="ml-2 sm:ml-3">
                    <span className="text-xs sm:text-sm font-medium block">Customer</span>
                    <span className="text-xs text-gray-500 hidden sm:block">Information</span>
                  </div>
                </div>
                
                <div className={`flex-1 h-1 mx-2 sm:mx-4 rounded-full transition-all duration-300 ${
                  step >= 2 ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gray-200'
                }`}></div>
                
                <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    step >= 2 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' 
                      : 'bg-gray-200'
                  }`}>
                    {step > 2 ? (
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-sm sm:text-base font-semibold">2</span>
                    )}
                  </div>
                  <div className="ml-2 sm:ml-3">
                    <span className="text-xs sm:text-sm font-medium block">Payment</span>
                    <span className="text-xs text-gray-500 hidden sm:block">Method</span>
                  </div>
                </div>
              </div>
            </div>
            {step === 1 && (
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 lg:p-8">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Customer Information</h2>
                    <p className="text-sm text-gray-600">Please provide your shipping details</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={customerInfo.firstName}
                      onChange={(e) => handleCustomerInfoChange('firstName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                      placeholder="Enter your first name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={customerInfo.lastName}
                      onChange={(e) => handleCustomerInfoChange('lastName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                      placeholder="Enter your last name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => handleCustomerInfoChange('email', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={customerInfo.phone}
                      onChange={(e) => handleCustomerInfoChange('phone', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                      placeholder="+971 50 123 4567"
                      required
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Street Address *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customerInfo.address}
                        onChange={(e) => handleCustomerInfoChange('address', e.target.value)}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                        placeholder="Enter your full address"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowMapPicker(true)}
                        className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="hidden sm:inline">Pin Location</span>
                      </button>
                    </div>
                    {customerInfo.location.lat && customerInfo.location.lng && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Location pinned: {customerInfo.location.lat.toFixed(6)}, {customerInfo.location.lng.toFixed(6)}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={customerInfo.city}
                      onChange={(e) => handleCustomerInfoChange('city', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                      placeholder="Enter your city"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Country *
                    </label>
                    <select
                      value={customerInfo.country}
                      onChange={(e) => handleCustomerInfoChange('country', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400 bg-white"
                    >
                      {COUNTRY_LIST.map((country) => (
                        <option key={country.code} value={country.name}>
                          {country.flag} {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={customerInfo.postalCode}
                      onChange={(e) => handleCustomerInfoChange('postalCode', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                      placeholder="Enter postal code (optional)"
                    />
                    {isUkCountry(customerInfo.country) && (
                      <div className="mt-2">
                        {ukPostcodeLoading && (
                          <div className="text-xs text-gray-500">Detecting address...</div>
                        )}
                        {!ukPostcodeLoading && !!ukPostcodeError && (
                          <div className="text-xs text-amber-700">{ukPostcodeError}</div>
                        )}
                        {!ukPostcodeLoading && ukPostcodeResults.length > 0 && (
                          <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm max-h-56 overflow-y-auto">
                            {ukPostcodeResults.map((r, idx) => (
                              <button
                                key={r?.place_id || idx}
                                type="button"
                                onClick={() => applyUkPostcodeResult(r)}
                                className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                              >
                                <div className="text-sm text-gray-900">{buildAddressLine(r?.address, r?.display_name)}</div>
                                <div className="text-xs text-gray-500">{String(r?.address?.city || r?.address?.town || r?.address?.village || r?.address?.county || '')}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 lg:p-8">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-green-700 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Payment Information</h2>
                    <p className="text-sm text-gray-600">Choose your preferred payment method</p>
                  </div>
                </div>
                
                {/* Payment Method Selection */}
                <div className="mb-8">
                  <label className="block text-sm font-semibold text-gray-700 mb-4">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      paymentInfo.method === 'card' 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={paymentInfo.method === 'card'}
                        onChange={(e) => handlePaymentInfoChange('method', e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex items-center w-full justify-between gap-4">
                        <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                          paymentInfo.method === 'card' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                          {paymentInfo.method === 'card' && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          <span className="font-medium text-gray-900">Credit/Debit Card</span>
                        </div>
                        <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                          <img
                            alt="Visa"
                            src="https://commons.wikimedia.org/wiki/Special:FilePath/Visa_Inc._logo.svg"
                            className="h-4 w-auto"
                            loading="lazy"
                            decoding="async"
                          />
                          <img
                            alt="Mastercard"
                            src="https://commons.wikimedia.org/wiki/Special:FilePath/Mastercard-logo.svg"
                            className="h-4 w-auto"
                            loading="lazy"
                            decoding="async"
                          />
                          <img
                            alt="Stripe"
                            src="https://commons.wikimedia.org/wiki/Special:FilePath/Stripe_Logo,_revised_2016.svg"
                            className="h-4 w-auto"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      </div>
                    </label>
                    
                    <label className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      paymentInfo.method === 'cash_on_delivery' 
                        ? 'border-green-500 bg-green-50 shadow-md' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash_on_delivery"
                        checked={paymentInfo.method === 'cash_on_delivery'}
                        onChange={(e) => handlePaymentInfoChange('method', e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                          paymentInfo.method === 'cash_on_delivery' ? 'border-green-500 bg-green-500' : 'border-gray-300'
                        }`}>
                          {paymentInfo.method === 'cash_on_delivery' && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="font-medium text-gray-900">Cash on Delivery</span>
                        </div>
                      </div>
                    </label>

                    {/* PayPal Option */}
                    <label className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      paymentInfo.method === 'paypal' 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="paypal"
                        checked={paymentInfo.method === 'paypal'}
                        onChange={(e) => handlePaymentInfoChange('method', e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex items-center">
                        <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                          paymentInfo.method === 'paypal' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                          {paymentInfo.method === 'paypal' && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex items-center">
                          <img
                            alt="PayPal"
                            src="https://commons.wikimedia.org/wiki/Special:FilePath/PayPal_logo.svg"
                            className="h-5 w-auto mr-2"
                            loading="lazy"
                            decoding="async"
                          />
                          <span className="font-medium text-gray-900">PayPal</span>
                        </div>
                      </div>
                    </label>

                    {/* Mada Option - Saudi Debit Cards */}
                    {moyasarConfig?.publishableKey && getOrderCurrency() === 'SAR' && (
                      <label className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        paymentInfo.method === 'mada' 
                          ? 'border-green-500 bg-green-50 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="mada"
                          checked={paymentInfo.method === 'mada'}
                          onChange={(e) => {
                            moyasarInitialized.current = false
                            handlePaymentInfoChange('method', e.target.value)
                          }}
                          className="sr-only"
                        />
                        <div className="flex items-center">
                          <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                            paymentInfo.method === 'mada' ? 'border-green-500 bg-green-500' : 'border-gray-300'
                          }`}>
                            {paymentInfo.method === 'mada' && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          <div className="flex items-center">
                            <img
                              alt="mada"
                              src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Mada_Logo.svg/1280px-Mada_Logo.svg.png"
                              className="h-5 w-auto mr-2"
                              loading="lazy"
                              decoding="async"
                            />
                            <div>
                              <span className="font-medium text-gray-900">Mada</span>
                              <span className="text-xs text-gray-500 block">Saudi Debit Cards</span>
                            </div>
                          </div>
                        </div>
                      </label>
                    )}

                    {/* Apple Pay Option */}
                    {moyasarConfig?.publishableKey && getOrderCurrency() === 'SAR' && (
                      <label className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        paymentInfo.method === 'applepay' 
                          ? 'border-gray-800 bg-gray-50 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="applepay"
                          checked={paymentInfo.method === 'applepay'}
                          onChange={(e) => {
                            moyasarInitialized.current = false
                            handlePaymentInfoChange('method', e.target.value)
                          }}
                          className="sr-only"
                        />
                        <div className="flex items-center">
                          <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                            paymentInfo.method === 'applepay' ? 'border-gray-800 bg-gray-800' : 'border-gray-300'
                          }`}>
                            {paymentInfo.method === 'applepay' && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          <div className="flex items-center">
                            <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                            </svg>
                            <div>
                              <span className="font-medium text-gray-900">Apple Pay</span>
                              <span className="text-xs text-gray-500 block">Fast & Secure</span>
                            </div>
                          </div>
                        </div>
                      </label>
                    )}
                  </div>
                </div>

                {/* Wallet (partial payment) */}
                <div className="mb-8">
                  <div
                    className="rounded-xl"
                    style={{
                      padding: 14,
                      border: '1px solid rgba(249,115,22,0.25)',
                      background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 55%, #ffffff 100%)'
                    }}
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 12,
                            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                            display: 'grid',
                            placeItems: 'center',
                            color: '#fff',
                            fontWeight: 900,
                          }}
                        >
                          ₿
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-gray-900">Wallet</div>
                          <div className="text-xs font-semibold text-gray-500">Use wallet balance (partial payment)</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-gray-500">Available</div>
                        <div className="text-sm font-black text-gray-900">
                          {getWalletBalance().toFixed(2)} {getOrderCurrency()}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2 items-center flex-wrap">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={walletApply}
                        onChange={(e) => setWalletApply(e.target.value)}
                        onBlur={() => setWalletApply(getWalletApply())}
                        className="w-full sm:flex-1 px-4 py-3 rounded-xl focus:outline-none transition-all duration-200 bg-white"
                        placeholder="0.00"
                        style={{
                          border: '1px solid rgba(249,115,22,0.22)',
                          fontWeight: 800,
                          color: '#0f172a'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setWalletApply(Math.min(getWalletBalance(), getTotalPrice()))}
                        className="px-4 py-3 rounded-xl text-white font-extrabold"
                        style={{
                          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                          boxShadow: '0 12px 20px rgba(249,115,22,0.22)'
                        }}
                      >
                        Max
                      </button>
                      <button
                        type="button"
                        onClick={() => setWalletApply(0)}
                        className="px-4 py-3 rounded-xl font-extrabold"
                        style={{
                          background: 'rgba(255,255,255,0.85)',
                          border: '1px solid rgba(249,115,22,0.25)',
                          color: '#ea580c'
                        }}
                      >
                        Clear
                      </button>
                    </div>

                    <div className="mt-4 grid gap-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-gray-500">Applying</div>
                        <div className="text-xs font-black text-gray-900">
                          {getWalletApply().toFixed(2)} {getOrderCurrency()}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-gray-500">Remaining to pay</div>
                        <div className="text-xs font-black text-gray-900">
                          {(getTotalPrice() - getWalletApply()).toFixed(2)} {getOrderCurrency()}
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-500 font-semibold">
                        Max usable: {Math.min(getWalletBalance(), getTotalPrice()).toFixed(2)} {getOrderCurrency()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Details (only show if card payment selected) */}
                {paymentInfo.method === 'card' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Cardholder Name *
                        </label>
                        <input
                          type="text"
                          value={paymentInfo.cardholderName}
                          onChange={(e) => handlePaymentInfoChange('cardholderName', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                          placeholder="Enter name as shown on card"
                          required
                        />
                      </div>
                      
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Card Number *
                        </label>
                        <input
                          type="text"
                          value={paymentInfo.cardNumber}
                          onChange={(e) => handlePaymentInfoChange('cardNumber', formatCardNumber(e.target.value))}
                          placeholder="1234 5678 9012 3456"
                          maxLength="19"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Expiry Date *
                        </label>
                        <input
                          type="text"
                          value={paymentInfo.expiryDate}
                          onChange={(e) => handlePaymentInfoChange('expiryDate', e.target.value)}
                          placeholder="MM/YY"
                          maxLength="5"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          CVV *
                        </label>
                        <input
                          type="text"
                          value={paymentInfo.cvv}
                          onChange={(e) => handlePaymentInfoChange('cvv', e.target.value)}
                          placeholder="123"
                          maxLength="4"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                          required
                        />
                      </div>
                    </div>
                    
                    {/* Security Notice */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <div>
                          <h4 className="text-sm font-semibold text-blue-900 mb-1">Secure Payment</h4>
                          <p className="text-sm text-blue-800">Your payment information is encrypted and secure. We never store your card details.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {paymentInfo.method === 'cash_on_delivery' && (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                          Cash on Delivery Selected
                        </h3>
                        <div className="text-sm text-yellow-700 space-y-2">
                          <p>• You will pay in cash when your order is delivered to your address</p>
                          <p>• Please have the exact amount ready for the delivery person</p>
                          <p>• Additional delivery charges may apply for cash payments</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* PayPal Payment Section */}
                {paymentInfo.method === 'paypal' && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                      <div className="flex items-start mb-4">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-semibold text-blue-800 mb-2">
                            Pay with PayPal
                          </h3>
                          <div className="text-sm text-blue-700 space-y-1">
                            <p>• Secure payment through PayPal</p>
                            <p>• Use your PayPal balance or linked cards</p>
                            <p>• Buyer protection included</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* PayPal Button Container */}
                      <div className="mt-6">
                        {paypalLoading && (
                          <div className="flex items-center justify-center py-4">
                            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="ml-3 text-blue-700 font-medium">Processing payment...</span>
                          </div>
                        )}
                        <div ref={paypalContainerRef} id="paypal-button-container" className={paypalLoading ? 'opacity-50 pointer-events-none' : ''}></div>
                        {!window.paypal && (
                          <div className="text-center py-4 text-yellow-600">
                            <p className="text-sm">PayPal is loading... If it doesn't appear, please refresh the page.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Mada Payment Section */}
                {paymentInfo.method === 'mada' && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                      <div className="flex items-start mb-4">
                        <div className="flex-shrink-0">
                          <svg className="w-8 h-8" viewBox="0 0 40 24" fill="none">
                            <rect width="40" height="24" rx="4" fill="#1D4F91"/>
                            <path d="M8 12h6M17 8v8M20 12h6M29 8l3 4-3 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-semibold text-green-800 mb-2">
                            Pay with Mada
                          </h3>
                          <div className="text-sm text-green-700 space-y-1">
                            <p>• Secure payment via Saudi Mada network</p>
                            <p>• Supports all Saudi bank debit cards</p>
                            <p>• 3D Secure authentication for safety</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Moyasar Mada Form Container */}
                      <div className="mt-6">
                        {moyasarLoading && (
                          <div className="flex items-center justify-center py-4">
                            <svg className="animate-spin h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="ml-3 text-green-700 font-medium">Processing payment...</span>
                          </div>
                        )}
                        <div 
                          ref={moyasarFormRef} 
                          id="moyasar-form" 
                          className={`moyasar-form ${moyasarLoading ? 'opacity-50 pointer-events-none' : ''}`}
                        ></div>
                      </div>

                      {/* Amount Display */}
                      <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Amount to pay:</span>
                          <span className="text-lg font-bold text-green-700">{getTotalPrice().toFixed(2)} SAR</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Apple Pay Payment Section */}
                {paymentInfo.method === 'applepay' && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-gray-50 to-slate-100 border border-gray-300 rounded-xl p-6">
                      <div className="flex items-start mb-4">
                        <div className="flex-shrink-0">
                          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            Pay with Apple Pay
                          </h3>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>• Fast checkout with Face ID or Touch ID</p>
                            <p>• Your card details are never shared</p>
                            <p>• Works on Safari (iPhone, iPad, Mac)</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Moyasar Apple Pay Form Container */}
                      <div className="mt-6">
                        {moyasarLoading && (
                          <div className="flex items-center justify-center py-4">
                            <svg className="animate-spin h-8 w-8 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="ml-3 text-gray-700 font-medium">Processing payment...</span>
                          </div>
                        )}
                        <div 
                          ref={moyasarFormRef} 
                          id="moyasar-applepay-form" 
                          className={`moyasar-form ${moyasarLoading ? 'opacity-50 pointer-events-none' : ''}`}
                        ></div>
                        
                        {/* Apple Pay browser check */}
                        {typeof window !== 'undefined' && !window.ApplePaySession && (
                          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-start">
                              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <div>
                                <p className="text-sm font-medium text-yellow-800">Apple Pay not available</p>
                                <p className="text-xs text-yellow-700 mt-1">Apple Pay requires Safari on an Apple device. Please use Mada or another payment method.</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Amount Display */}
                      <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Amount to pay:</span>
                          <span className="text-lg font-bold text-gray-800">{getTotalPrice().toFixed(2)} SAR</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Terms & Conditions Agreement - Show on Payment step */}
            {step === 2 && (
              <div className="mb-4 mt-2">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="w-[18px] h-[18px] mt-0.5 accent-blue-600 flex-shrink-0 cursor-pointer"
                  />
                  <span className="text-xs text-gray-500 leading-relaxed">
                    By placing this order, I agree to the{' '}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold underline hover:text-blue-700">Terms &amp; Conditions</a>
                    {' '}and{' '}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold underline hover:text-blue-700">Privacy Policy</a>.
                    {' '}I understand that my personal data will be processed in accordance with the Privacy Policy.
                  </span>
                </label>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
              <button
                onClick={() => step > 1 ? setStep(step - 1) : navigate('/products')}
                className="w-full sm:w-auto px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {step > 1 ? 'Back' : 'Back to Products'}
              </button>
              
              <button
                onClick={handleNextStep}
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    {step === 2 ? 'Place Order' : 'Continue'}
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 sticky top-8">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Order Summary</h3>
              </div>
              
              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              
              {/* Coupon Code */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Have a Coupon?</label>
                {couponApplied ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎉</span>
                      <div>
                        <div className="font-semibold text-green-700 text-sm">{couponApplied.code}</div>
                        <div className="text-xs text-green-600">
                          {couponApplied.discountType === 'percentage' ? `${couponApplied.discountValue}% off` : `$${couponApplied.discountValue} off`}
                        </div>
                      </div>
                    </div>
                    <button onClick={removeCoupon} className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-medium hover:bg-red-200">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={applyCoupon}
                      disabled={couponLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal ({getTotalItems()} items)</span>
                  <span>${getSubtotal().toFixed(2)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Coupon Discount</span>
                    <span className="font-medium">-${couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span className="text-green-600 font-medium">Free</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax</span>
                  <span>$0.00</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-blue-600">${getTotalPrice().toFixed(2)}</span>
                </div>
              </div>
              
              {/* Trust Badges */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Secure Payment
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-blue-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    Free Shipping
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-purple-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Easy Returns
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-orange-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Fast Delivery
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Location Picker Modal */}
        {showMapPicker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">📍 Pin Your Delivery Location</h3>
                <button
                  onClick={() => setShowMapPicker(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-4">Click on the map to pin your exact delivery location. This helps our drivers find you easily.</p>
                
                {/* Interactive Map using Leaflet via CDN */}
                <div className="relative w-full h-80 bg-gray-100 rounded-lg overflow-hidden border">
                  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                  <div 
                    id="location-map" 
                    className="w-full h-full"
                    ref={(el) => {
                      if (el && !mapRef.current) {
                        // Load Leaflet dynamically
                        const script = document.createElement('script')
                        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
                        script.onload = () => {
                          const L = window.L
                          if (!L) return
                          
                          // Initialize map
                          const map = L.map(el).setView([mapCenter.lat, mapCenter.lng], 15)
                          mapRef.current = map
                          
                          // Add tile layer (OpenStreetMap)
                          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            attribution: '© OpenStreetMap'
                          }).addTo(map)
                          
                          // Add draggable marker
                          const marker = L.marker([mapCenter.lat, mapCenter.lng], { draggable: true }).addTo(map)
                          markerRef.current = marker
                          
                          // Update coordinates on marker drag
                          marker.on('dragend', function(e) {
                            const pos = marker.getLatLng()
                            setMapCenter({ lat: pos.lat, lng: pos.lng })
                          })
                          
                          // Click on map to move marker
                          map.on('click', function(e) {
                            marker.setLatLng(e.latlng)
                            setMapCenter({ lat: e.latlng.lat, lng: e.latlng.lng })
                          })
                        }
                        document.head.appendChild(script)
                      } else if (mapRef.current && markerRef.current) {
                        // Update existing map/marker position
                        mapRef.current.setView([mapCenter.lat, mapCenter.lng], mapRef.current.getZoom())
                        markerRef.current.setLatLng([mapCenter.lat, mapCenter.lng])
                      }
                    }}
                  />
                </div>
                
                {/* Coordinates display */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Selected Location:</span>
                    <span className="text-sm text-gray-600">{mapCenter.lat.toFixed(6)}, {mapCenter.lng.toFixed(6)}</span>
                  </div>
                  {loadingAddress && (
                    <div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Getting address...
                    </div>
                  )}
                </div>

                {/* Use Current Location Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          const lat = position.coords.latitude
                          const lng = position.coords.longitude
                          setMapCenter({ lat, lng })
                          if (mapRef.current && markerRef.current) {
                            mapRef.current.setView([lat, lng], 15)
                            markerRef.current.setLatLng([lat, lng])
                          }
                          toast.success('Location detected!')
                        },
                        (error) => {
                          toast.error('Could not get your location. Please drag the pin on the map.')
                        },
                        { enableHighAccuracy: true }
                      )
                    } else {
                      toast.error('Geolocation is not supported by your browser')
                    }
                  }}
                  className="mt-4 w-full py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  📍 Use My Current Location
                </button>
              </div>
              <div className="p-4 border-t flex gap-3">
                <button
                  onClick={() => {
                    setShowMapPicker(false)
                    // Cleanup map
                    if (mapRef.current) {
                      mapRef.current.remove()
                      mapRef.current = null
                      markerRef.current = null
                    }
                  }}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    // Get address from coordinates
                    const result = await reverseGeocode(mapCenter.lat, mapCenter.lng)
                    
                    setCustomerInfo(prev => ({
                      ...prev,
                      location: { lat: mapCenter.lat, lng: mapCenter.lng },
                      address: result?.address || prev.address,
                      city: result?.city || prev.city
                    }))
                    
                    setShowMapPicker(false)
                    // Cleanup map
                    if (mapRef.current) {
                      mapRef.current.remove()
                      mapRef.current = null
                      markerRef.current = null
                    }
                    toast.success('Location pinned and address updated!')
                  }}
                  disabled={loadingAddress}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {loadingAddress ? 'Getting Address...' : '✓ Confirm Location'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}