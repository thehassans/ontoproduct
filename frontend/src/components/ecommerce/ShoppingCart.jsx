import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../ui/Toast'
import { apiPost, mediaUrl } from '../../api.js'
import { getCurrencyConfig, convert as fxConvert, formatMoney } from '../../util/currency'
import { trackRemoveFromCart, trackCheckoutStart } from '../../utils/analytics'
import { COUNTRY_LIST, COUNTRY_TO_CURRENCY } from '../../utils/constants'
import { resolveWarehouse } from '../../utils/warehouse'

export default function ShoppingCart({ isOpen, onClose }) {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('shopping_cart')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  const [cartLoaded, setCartLoaded] = useState(true) // Already loaded from initializer
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState(() => {
    let c = 'GB'
    try { c = localStorage.getItem('selected_country') || 'GB' } catch {}
    return { name:'', phone:'', country: c, city:'', cityOther:'', area:'', address:'', details:'' }
  })
  const [ccyCfg, setCcyCfg] = useState(null)
  const [location, setLocation] = useState({ lat: null, lng: null })
  const [paymentMethod, setPaymentMethod] = useState('cod') // cod, stripe, paypal
  const [agreedToTerms, setAgreedToTerms] = useState(true)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [mapCenter, setMapCenter] = useState({ lat: 24.7136, lng: 46.6753 }) // Default Riyadh

  const CITY_OPTIONS = {
    SA: ['Riyadh','Jeddah','Dammam','Khobar','Makkah','Madinah','Tabuk','Abha','Taif'],
    AE: ['Dubai','Abu Dhabi','Sharjah','Ajman','Ras Al Khaimah','Fujairah','Umm Al Quwain'],
    OM: ['Muscat','Seeb','Salalah','Sohar','Nizwa'],
    BH: ['Manama','Riffa','Muharraq','Isa Town','Hamad Town'],
    IN: ['Mumbai','Delhi','Bengaluru','Hyderabad','Chennai','Kolkata'],
    KW: ['Kuwait City','Al Ahmadi','Hawalli','Salmiya','Farwaniya'],
    QA: ['Doha','Al Rayyan','Al Khor','Mesaieed','Umm Salal'],
  }

  // Quick adjust: pick last added product or only item
  const lastAddedId = (() => { try { return localStorage.getItem('last_added_product') || '' } catch { return '' } })()
  const quickItem = cartItems.length === 1 ? cartItems[0] : (cartItems.find(i => i.id === lastAddedId) || cartItems[0])
  const selectedCountry = COUNTRY_LIST.find(c => c.code === form.country) || COUNTRY_LIST[0]

  // Load currency config for dynamic conversion
  useEffect(() => {
    let alive = true
    getCurrencyConfig().then(cfg => { if (alive) setCcyCfg(cfg) }).catch(()=>{})
    return () => { alive = false }
  }, [])

  const displayCurrency = COUNTRY_TO_CURRENCY[selectedCountry.code] || 'SAR'
  const convertPrice = (value, fromCurrency, toCurrency) => {
    const from = fromCurrency || 'SAR'
    const to = toCurrency || displayCurrency
    return fxConvert(value, from, to, ccyCfg)
  }
  const formatPrice = (value, currency) => formatMoney(Number(value||0), currency || displayCurrency)

  // Removed free shipping logic per request

  const getImageUrl = (p) => {
    const imagePath = p || ''
    if (!imagePath) return '/placeholder-product.svg'
    if (typeof imagePath !== 'string') return '/placeholder-product.svg'
    if (String(imagePath).startsWith('http')) return imagePath
    const u = String(imagePath).replace(/\\/g,'/').trim()
    if (!u) return '/placeholder-product.svg'
    if (u.startsWith('/') && !u.startsWith('/uploads/') && !u.startsWith('/api/uploads/')) return u
    return mediaUrl(u) || '/placeholder-product.svg'
  }

  const reloadCartFromStorage = () => {
    try{
      const savedCart = localStorage.getItem('shopping_cart')
      const parsed = savedCart ? JSON.parse(savedCart) : []
      const norm = normalizeCartItems(parsed, form.country)
      if (norm.changed) {
        try { localStorage.setItem('shopping_cart', JSON.stringify(norm.items)) } catch {}
      }
      setCartItems(norm.items)
    }catch(err){ console.error('Error loading cart from localStorage:', err) }
  }

  const normalizeCartItems = (items, countryCode) => {
    const arr = Array.isArray(items) ? items : []
    let changed = false
    const next = arr.map((it) => {
      const wh = resolveWarehouse(it, countryCode, it?.quantity)
      const should = {
        warehouseType: wh.type,
        etaMinDays: wh.etaMinDays,
        etaMaxDays: wh.etaMaxDays,
        warehouseCountry: countryCode,
      }
      if (
        it?.warehouseType === should.warehouseType &&
        it?.etaMinDays === should.etaMinDays &&
        it?.etaMaxDays === should.etaMaxDays &&
        it?.warehouseCountry === should.warehouseCountry
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

  // Load cart on mount and whenever we receive a cartUpdated event
  useEffect(() => {
    reloadCartFromStorage()
    const handler = () => reloadCartFromStorage()
    window.addEventListener('cartUpdated', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('cartUpdated', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  // When opening the cart, re-sync from storage and auto-fill customer data
  useEffect(() => {
    if (isOpen) {
      reloadCartFromStorage()
      // Auto-fill from logged-in customer data
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
    }
  }, [isOpen])

  // Default country from catalog selection if available
  useEffect(() => {
    try {
      const savedCountry = localStorage.getItem('selected_country')
      if (savedCountry && savedCountry !== form.country) {
        setForm(prev => ({ ...prev, country: savedCountry }))
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Persist chosen country and reset city to a sensible default for that country
  useEffect(() => {
    try { localStorage.setItem('selected_country', form.country) } catch {}
    const opts = CITY_OPTIONS[form.country] || []
    if (opts.length && !opts.includes(form.city)) {
      setForm(prev => ({ ...prev, city: opts[0] }))
    }
    if (!opts.length && form.city) {
      setForm(prev => ({ ...prev, city: '' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Save cart to localStorage and notify header whenever cartItems changes
  useEffect(() => {
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
    toast.success('Item removed from cart')
  }

  const clearCart = () => {
    setCartItems(() => {
      const next = []
      try { localStorage.setItem('shopping_cart', JSON.stringify(next)) } catch {}
      try { window.dispatchEvent(new CustomEvent('cartUpdated')) } catch {}
      return next
    })
    toast.success('Cart cleared')
  }

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => {
      const from = item.currency || 'SAR'
      const unit = convertPrice(item.price, from, displayCurrency)
      return total + (unit * item.quantity)
    }, 0)
  }

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0)
  }

  const handleCheckout = () => {
    submitOrder()
  }

  const onChange = (e)=>{
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function submitOrder(){
    if (cartItems.length === 0){ toast.error('Your cart is empty'); return }
    if (!form.name.trim()){ toast.error('Please enter your full name'); return }
    if (!form.phone.trim()){ toast.error('Please enter your phone number'); return }
    if (!(form.city && (form.city !== 'Other' || (form.city === 'Other' && String(form.cityOther||'').trim())))){
      toast.error('Please select your city');
      return
    }
    if (!String(form.area || '').trim()) { toast.error('Please enter your area'); return }
    if (!form.address.trim()){ toast.error('Please enter your full address'); return }
    if (!agreedToTerms){ toast.error('Please agree to the Terms & Conditions and Privacy Policy'); return }

    try{
      setIsLoading(true)
      // Track checkout start
      const cartValue = getTotalPrice()
      const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0)
      trackCheckoutStart(cartValue, itemCount)

      // Get customer ID from me localStorage (set during login)
      let customerId = null
      try {
        const meData = localStorage.getItem('me')
        const customerToken = localStorage.getItem('token')
        if (customerToken && meData) {
          const user = JSON.parse(meData)
          if (user._id) {
            customerId = user._id
          }
        }
      } catch {}

      const items = cartItems.map(it => ({
        productId: it.productId || it.id,
        quantity: Math.max(1, Number(it.quantity||1)),
        variants: it?.variants && typeof it.variants === 'object' ? it.variants : {},
        warehouseType: String(it?.warehouseType || ''),
        warehouseCountry: String(it?.warehouseCountry || ''),
        etaMinDays: it?.etaMinDays ?? null,
        etaMaxDays: it?.etaMaxDays ?? null,
      }))
      const body = {
        customerName: form.name.trim(),
        customerPhone: form.phone.trim(),
        phoneCountryCode: selectedCountry.dial,
        orderCountry: selectedCountry.name,
        city: (form.city === 'Other' ? String(form.cityOther||'').trim() : String(form.city||'').trim()),
        area: String(form.area||'').trim(),
        address: form.address.trim(),
        details: String(form.details||'').trim(),
        items: cartItems.map(it => ({
          productId: it.productId || it.id,
          name: it.name,
          image: it.image || it.imagePath,
          price: convertPrice(it.price, it.currency || 'SAR', displayCurrency),
          quantity: it.quantity,
          variants: it?.variants && typeof it.variants === 'object' ? it.variants : {},
        })),
        currency: displayCurrency,
        customerId, // Link order to customer account if logged in
        locationLat: location.lat,
        locationLng: location.lng,
        paymentMethod: paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
      }
      const result = await apiPost('/api/ecommerce/orders', body)
      
      // Build order info for success page
      const orderForSuccess = {
        ...(result?.order || {}),
        customerName: form.name.trim(),
        customerPhone: form.phone.trim(),
        orderCountry: selectedCountry.name,
        city: (form.city === 'Other' ? String(form.cityOther||'').trim() : String(form.city||'').trim()),
        area: String(form.area||'').trim(),
        address: form.address.trim(),
        currency: displayCurrency,
        paymentMethod: paymentMethod,
        items: cartItems.map(it => ({
          productId: it.productId || it.id,
          name: it.name,
          image: it.image || it.imagePath,
          price: convertPrice(it.price, it.currency || 'SAR', displayCurrency),
          quantity: it.quantity,
          variants: it?.variants && typeof it.variants === 'object' ? it.variants : {},
        })),
      }
      try { localStorage.setItem('last_order_success', JSON.stringify(orderForSuccess)) } catch {}
      
      setCartItems([])
      localStorage.setItem('shopping_cart', JSON.stringify([]))
      window.dispatchEvent(new CustomEvent('cartUpdated'))
      setLocation({ lat: null, lng: null })
      onClose && onClose()
      navigate('/order-success', { state: { order: orderForSuccess } })
    }catch(err){
      toast.error(err?.message || 'Failed to submit order')
    }finally{
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="cart-overlay" onClick={onClose}>
        <div 
          className="cart-panel"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header - Minimal Premium */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
          <h2 className="text-xl font-bold text-gray-900">
            Cart <span className="text-orange-500">({getTotalItems()})</span>
          </h2>
          <button 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={onClose}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="text-6xl mb-4">🛒</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-gray-600 mb-6">Add some products to get started!</p>
              <button 
                onClick={onClose}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <>
              {/* Cart Items - Minimal */}
              <div className="px-6 py-4 space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4 p-3 bg-white rounded-lg border border-gray-100 hover:border-orange-200 transition-colors">
                    <div className="w-16 h-16 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                      <img 
                        src={getImageUrl(item.image || item.imagePath)} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = '/placeholder-product.svg'
                        }}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">
                        {item.name}
                      </h4>
                      <p className="text-orange-500 font-semibold text-sm mb-3">
                        {formatPrice(convertPrice(item.price, item.currency || 'SAR', displayCurrency), displayCurrency)}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                          <button 
                            className="p-1.5 transition-colors hover:bg-gray-100"
                            onClick={() => {
                              if (item.quantity <= 1) {
                                removeFromCart(item.id)
                              } else {
                                updateQuantity(item.id, item.quantity - 1)
                              }
                            }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="px-3 py-1 text-sm font-medium min-w-[2.5rem] text-center bg-white">
                            {item.quantity}
                          </span>
                          <button 
                            className={`p-1.5 transition-colors ${Number(item.maxStock) > 0 && item.quantity >= Number(item.maxStock) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                            onClick={() => {
                              const max = Number(item.maxStock)
                              if (max > 0 && item.quantity >= max) return
                              updateQuantity(item.id, item.quantity + 1)
                            }}
                            disabled={Number(item.maxStock) > 0 && item.quantity >= Number(item.maxStock)}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                        </div>
                        
                        <button 
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          onClick={() => removeFromCart(item.id)}
                          title="Remove"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <div className="font-semibold text-gray-900 text-sm">
                        {formatPrice(convertPrice(item.price, item.currency || 'SAR', displayCurrency) * item.quantity, displayCurrency)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary - Minimal */}
              <div className="px-6 py-4 bg-gray-50 border-y border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total ({getTotalItems()} items)</span>
                  <span className="text-xl font-bold text-gray-900">{formatPrice(getTotalPrice(), displayCurrency)}</span>
                </div>
              </div>

              {/* Add More Items Button - Above Form */}
              <div className="px-6 pt-4 pb-2">
                <button 
                  className="w-full bg-white border-2 border-orange-500 text-orange-500 py-2.5 px-4 rounded-lg hover:bg-orange-50 transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2"
                  onClick={() => {
                    onClose()
                    navigate('/catalog')
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add More Items
                </button>
              </div>

              {/* Order Form - Minimal */}
              <div className="px-6 pb-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input name="name" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors" value={form.name} onChange={onChange} placeholder="Your full name" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone Number</label>
                  <div className="grid grid-cols-[auto_1fr] gap-2">
                    <select name="country" value={form.country} onChange={onChange} className="border border-gray-200 rounded-lg px-2 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors">
                      {COUNTRY_LIST.map(c => <option key={c.code} value={c.code}>{c.flag} {c.dial}</option>)}
                    </select>
                    <input name="phone" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors" value={form.phone} onChange={onChange} placeholder="5xxxxxxx" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Country</label>
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50" value={selectedCountry.name} readOnly />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">City</label>
                    <select name="city" value={form.city} onChange={onChange} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors">
                      <option value="">Select city</option>
                      {(CITY_OPTIONS[form.country] || []).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                {form.city === 'Other' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Other City</label>
                    <input name="cityOther" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors" value={form.cityOther} onChange={onChange} placeholder="Enter your city" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Area</label>
                  <input name="area" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors" value={form.area} onChange={onChange} placeholder="Area / district" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Address</label>
                  <input name="address" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors" value={form.address} onChange={onChange} placeholder="Street, building" />
                </div>
                {/* Pin Location Button */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Pin Location</label>
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${location.lat ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {location.lat ? `📍 Location Pinned` : 'Pin Your Location on Map'}
                  </button>
                  {location.lat && (
                    <p className="text-xs text-green-600 mt-1">Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Delivery Notes <span className="text-gray-400">(optional)</span></label>
                  <textarea name="details" rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors resize-none" value={form.details} onChange={onChange} placeholder="Any notes for delivery" />
                </div>

                {/* Payment Method Selection */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Payment Method</label>
                  <div className="space-y-2">
                    {/* COD */}
                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="w-4 h-4 text-orange-500" />
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" strokeWidth="2"/><path strokeWidth="2" d="M1 10h22"/></svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Cash on Delivery</p>
                          <p className="text-xs text-gray-500">Pay when you receive</p>
                        </div>
                      </div>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">DEFAULT</span>
                    </label>

                    {/* Card Payment */}
                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${paymentMethod === 'stripe' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="paymentMethod" value="stripe" checked={paymentMethod === 'stripe'} onChange={() => setPaymentMethod('stripe')} className="w-4 h-4 text-orange-500" />
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 24 24"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/></svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Credit/Debit Card</p>
                          <p className="text-xs text-gray-500">Visa, Mastercard, Amex</p>
                        </div>
                      </div>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">SECURE</span>
                    </label>

                    {/* PayPal */}
                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${paymentMethod === 'paypal' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="paymentMethod" value="paypal" checked={paymentMethod === 'paypal'} onChange={() => setPaymentMethod('paypal')} className="w-4 h-4 text-orange-500" />
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z"/></svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">PayPal</p>
                          <p className="text-xs text-gray-500">Pay with PayPal account</p>
                        </div>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">FAST</span>
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sticky bottom checkout bar - Minimal */}
        {cartItems.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-4 bg-white pb-20 md:pb-4">
            {/* Terms & Conditions Agreement */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none mb-3">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                style={{ width: 16, height: 16, marginTop: 2, accentColor: '#f97316', flexShrink: 0, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                I agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#f97316', fontWeight: 600, textDecoration: 'underline' }}>Terms &amp; Conditions</a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#f97316', fontWeight: 600, textDecoration: 'underline' }}>Privacy Policy</a>.
              </span>
            </label>
            <div className="flex gap-2">
              <button 
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3.5 px-4 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 font-semibold text-base shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleCheckout}
                disabled={isLoading || !agreedToTerms}
              >
                {isLoading ? 'Processing...' : '🛒 Place Order'}
              </button>
              <button 
                className="px-4 py-3.5 bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors text-sm font-medium rounded-lg"
                onClick={clearCart}
                title="Clear Cart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      <style jsx>{`
        .cart-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          z-index: 50;
          display: flex;
          justify-content: flex-end;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .cart-panel {
          width: 100%;
          max-width: 28rem;
          height: 100%;
          background: white;
          box-shadow: -20px 0 60px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }

        .cart-panel::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(180deg, #f97316 0%, #ea580c 100%);
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @media (min-width: 640px) {
          .cart-panel {
            max-width: 32rem;
          }
        }
      `}</style>

      {/* Map Picker Modal */}
      {showMapPicker && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setShowMapPicker(false)}>
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Pin Your Location</h3>
              <button onClick={() => setShowMapPicker(false)} className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Google Maps Embed */}
              <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                <iframe
                  title="Location Picker"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=${mapCenter.lat},${mapCenter.lng}&zoom=15`}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-red-500 text-3xl transform -translate-y-3">📍</div>
                </div>
              </div>
              
              {/* Manual Coordinate Input */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={mapCenter.lat}
                    onChange={(e) => setMapCenter(prev => ({ ...prev, lat: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="24.7136"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={mapCenter.lng}
                    onChange={(e) => setMapCenter(prev => ({ ...prev, lng: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="46.6753"
                  />
                </div>
              </div>

              {/* Use Current Location Button */}
              <button
                type="button"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        const { latitude, longitude } = position.coords
                        setMapCenter({ lat: latitude, lng: longitude })
                        toast.success('Location detected!')
                      },
                      (error) => {
                        toast.error('Could not get your location. Please enter manually.')
                      }
                    )
                  } else {
                    toast.error('Geolocation is not supported by your browser')
                  }
                }}
                className="w-full py-2.5 px-4 bg-blue-50 text-blue-600 rounded-lg font-medium text-sm hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Use My Current Location
              </button>

              {/* Confirm Button */}
              <button
                type="button"
                onClick={() => {
                  setLocation({ lat: mapCenter.lat, lng: mapCenter.lng })
                  setShowMapPicker(false)
                  toast.success('Location pinned successfully!')
                }}
                className="w-full py-3 px-4 bg-orange-500 text-white rounded-lg font-semibold text-sm hover:bg-orange-600 transition-colors"
              >
                Confirm This Location
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}