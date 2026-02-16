import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { apiGet, apiPost, mediaUrl } from '../../api'
import { detectCountryCode } from '../../utils/geo'
import { useToast } from '../../ui/Toast'
import Header from '../../components/layout/Header'

import ShoppingCart from '../../components/ecommerce/ShoppingCart'
import { trackPageView, trackProductView, trackAddToCart } from '../../utils/analytics'
import { getCurrencyConfig, convert as fxConvert, formatMoney } from '../../util/currency'
import { resolveWarehouse } from '../../utils/warehouse'
import { readWishlistIds, toggleWishlist } from '../../util/wishlist'

const ProductDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedVariants, setSelectedVariants] = useState({})
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('description')
  const [reviews, setReviews] = useState([])
  const [relatedProducts, setRelatedProducts] = useState([])
  const [newReview, setNewReview] = useState({ rating: 5, comment: '', name: '' })
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [ccyCfg, setCcyCfg] = useState(null)
  const [wishlisted, setWishlisted] = useState(false)
  const [wishBusy, setWishBusy] = useState(false)
  const mobileGalleryRef = useRef(null)

  const [selectedCountry, setSelectedCountry] = useState(() => {
    try { return localStorage.getItem('selected_country') || 'GB' } catch { return 'GB' }
  })

  useEffect(() => {
    let alive = true
    getCurrencyConfig().then((cfg) => {
      if (alive) setCcyCfg(cfg)
    }).catch(() => {})
    return () => { alive = false }
  }, [])

  const COUNTRY_TO_CURRENCY = {
    AE: 'AED',
    OM: 'OMR',
    SA: 'SAR',
    BH: 'BHD',
    IN: 'INR',
    KW: 'KWD',
    QA: 'QAR',
    PK: 'PKR',
    JO: 'JOD',
    US: 'USD',
    GB: 'GBP',
    CA: 'CAD',
    AU: 'AUD',
  }

  const getDisplayCurrency = () => COUNTRY_TO_CURRENCY[selectedCountry] || 'SAR'
  const convertPrice = (value, fromCurrency, toCurrency) => fxConvert(value, fromCurrency || 'SAR', toCurrency || getDisplayCurrency(), ccyCfg)
  const formatPrice = (price, currency) => formatMoney(Number(price || 0), currency || getDisplayCurrency())

  const normalizeVariants = (rawVariants) => {
    const out = {}
    const v = rawVariants && typeof rawVariants === 'object' && !Array.isArray(rawVariants) ? rawVariants : {}
    for (const [k, opts] of Object.entries(v)) {
      if (!Array.isArray(opts)) continue
      const norm = opts
        .map((opt) => {
          if (opt == null) return null
          if (typeof opt === 'string') return { value: opt, stockQty: 0 }
          if (typeof opt !== 'object') return null
          const value = String(opt.value ?? opt.name ?? opt.label ?? '').trim()
          if (!value) return null
          const stockQtyRaw = Number(opt.stockQty ?? opt.stock ?? 0)
          const stockQty = Number.isFinite(stockQtyRaw) ? Math.max(0, Math.floor(stockQtyRaw)) : 0
          const image = typeof opt.image === 'string' && opt.image.trim() ? opt.image.trim() : ''
          let swatch = ''
          try {
            if (typeof opt.swatch === 'string' && opt.swatch.trim()) {
              const raw = opt.swatch.trim()
              if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(raw)) swatch = raw
            }
          } catch {}
          return { value, stockQty, ...(image ? { image } : {}), ...(swatch ? { swatch } : {}) }
        })
        .filter(Boolean)
      if (norm.length) out[k] = norm
    }
    return out
  }

  const buildVariantSignature = (selected) => {
    try {
      const s = selected && typeof selected === 'object' ? selected : {}
      const keys = Object.keys(s).sort()
      const parts = []
      for (const k of keys) {
        const v = String(s[k] ?? '').trim()
        if (!v) continue
        parts.push(`${k}=${encodeURIComponent(v)}`)
      }
      return parts.join(';')
    } catch {
      return ''
    }
  }

  const [isCustomer, setIsCustomer] = useState(() => {
    try {
      const token = localStorage.getItem('token')
      if (!token || token === 'null') return false
      const me = JSON.parse(localStorage.getItem('me') || 'null')
      return !!me && me.role === 'customer'
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (product) {
      // Set page meta title
      const pageTitle = product.metaTitle || product.seoTitle || product.name || 'Product'
      document.title = pageTitle

      // Set meta description
      const metaDesc = product.metaDescription || product.seoDescription || product.description?.slice(0, 160) || ''
      if (metaDesc) {
        let metaTag = document.querySelector('meta[name="description"]')
        if (!metaTag) {
          metaTag = document.createElement('meta')
          metaTag.setAttribute('name', 'description')
          document.head.appendChild(metaTag)
        }
        metaTag.setAttribute('content', metaDesc)
      }

      trackPageView(`/product/${id}`, `Product: ${product.name}`)
      trackProductView(product._id, product.name, product.category, product.price)

      if (product.variants && typeof product.variants === 'object') {
        const normalized = normalizeVariants(product.variants)
        const initialVariants = {}
        Object.keys(normalized).forEach((variantType) => {
          const list = normalized[variantType]
          if (Array.isArray(list) && list.length > 0) {
            const firstInStock = list.find((o) => Number(o?.stockQty) > 0)
            initialVariants[variantType] = String((firstInStock || list[0])?.value || '')
          }
        })
        setSelectedVariants(initialVariants)
      }

      // Load related products
      if (product.category) {
        loadRelatedProducts(product.category)
      }
    }
  }, [product, id])

  const loadRelatedProducts = async (category) => {
    try {
      const response = await apiGet(
        `/api/products/public?category=${encodeURIComponent(category)}&limit=10&country=${encodeURIComponent(selectedCountry)}`
      )
      if (response?.products) {
        // Show all related products - no country filtering
        const related = response.products
          .filter(p => p._id !== product._id)
          .slice(0, 5)
        setRelatedProducts(related)
      }
    } catch (error) {
      console.error('Error loading related products:', error)
    }
  }

  const loadProduct = async () => {
    try {
      setLoading(true)
      const response = await apiGet(`/api/products/public/${id}`)
      if (response?.product) {
        const enhancedProduct = {
          ...response.product,
          images: response.product.images || [response.product.imagePath || '/placeholder-product.svg']
        }
        setProduct(enhancedProduct)
      } else {
        toast.error('Product not found')
        navigate('/catalog')
      }
    } catch (error) {
      console.error('Error loading product:', error)
      toast.error('Failed to load product')
      navigate('/catalog')
    } finally {
      setLoading(false)
    }
  }

  const loadReviews = async () => {
    try {
      const response = await apiGet(`/api/reviews/product/${id}`)
      if (response?.reviews) {
        const formattedReviews = response.reviews.map(r => ({
          id: r._id,
          name: r.customerName,
          rating: r.rating,
          comment: r.comment,
          date: new Date(r.createdAt).toLocaleDateString(),
          verified: r.isVerifiedPurchase
        }))
        setReviews(formattedReviews)
      }
    } catch (error) {
      console.error('Error loading reviews:', error)
    }
  }

  useEffect(() => {
    if (!id) return
    setSelectedImage(0)
    setQuantity(1)
    loadProduct()
    loadReviews()
  }, [id])

  const handleAddToCart = (e) => {
    if (!product) return

    try {
      const savedCart = localStorage.getItem('shopping_cart')
      let cartItems = []

      if (savedCart) {
        cartItems = JSON.parse(savedCart)
      }

      const normalizedVariants = normalizeVariants(product.variants)
      let variantMax = Number.POSITIVE_INFINITY
      for (const [k, opts] of Object.entries(normalizedVariants)) {
        const selectedVal = String(selectedVariants?.[k] || '').trim()
        if (!selectedVal) continue
        const hit = Array.isArray(opts) ? opts.find((o) => String(o?.value) === selectedVal) : null
        if (hit && Number.isFinite(Number(hit.stockQty))) {
          variantMax = Math.min(variantMax, Math.max(0, Number(hit.stockQty)))
        }
      }
      const fallbackMax = Number(product?.stockQty || 0)
      const max = variantMax !== Number.POSITIVE_INFINITY ? variantMax : fallbackMax
      if (Number.isFinite(Number(max)) && Number(max) <= 0) {
        toast.error('Selected option is out of stock')
        return
      }
      const basePriceVal = Number(product?.price) || 0
      const salePriceVal = Number(product?.salePrice) || 0
      const hasSale = salePriceVal > 0 && salePriceVal < basePriceVal
      const unitPrice = hasSale ? salePriceVal : basePriceVal
      const addQty = Math.max(1, Math.floor(Number(quantity) || 1))
      const wh = resolveWarehouse(product, selectedCountry, addQty)

      const variantSignature = buildVariantSignature(selectedVariants)
      const cartItemId = variantSignature ? `${product._id}::${variantSignature}` : String(product._id)
      const existingItemIndex = cartItems.findIndex(item => String(item.id) === String(cartItemId))

      const cartItem = {
        id: cartItemId,
        productId: product._id,
        name: product.name,
        price: unitPrice,
        currency: product.baseCurrency || 'SAR',
        image: (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : (product.imagePath || '')),
        quantity: addQty,
        maxStock: max,
        variants: selectedVariants,
        stockByCountry: product.stockByCountry || {},
        warehouseType: wh.type,
        etaMinDays: wh.etaMinDays,
        etaMaxDays: wh.etaMaxDays,
        warehouseCountry: selectedCountry
      }

      if (existingItemIndex >= 0) {
        const current = Number(cartItems[existingItemIndex].quantity || 0)
        const candidate = current + addQty
        if (max > 0 && candidate > max) {
          cartItems[existingItemIndex].quantity = max
        } else {
          cartItems[existingItemIndex].quantity = candidate
        }
        cartItems[existingItemIndex].variants = selectedVariants
        cartItems[existingItemIndex].productId = product._id
        cartItems[existingItemIndex].maxStock = max
        const wh2 = resolveWarehouse(product, selectedCountry, cartItems[existingItemIndex].quantity)
        cartItems[existingItemIndex].stockByCountry = product.stockByCountry || cartItems[existingItemIndex].stockByCountry || {}
        cartItems[existingItemIndex].warehouseType = wh2.type
        cartItems[existingItemIndex].etaMinDays = wh2.etaMinDays
        cartItems[existingItemIndex].etaMaxDays = wh2.etaMaxDays
        cartItems[existingItemIndex].warehouseCountry = selectedCountry

      } else {
        cartItems.push(cartItem)
      }

      localStorage.setItem('shopping_cart', JSON.stringify(cartItems))
      try { localStorage.setItem('last_added_product', String(product._id)) } catch {}

      trackAddToCart(product._id, product.name, addQty, unitPrice)

      window.dispatchEvent(new CustomEvent('cartUpdated'))

      toast.success(`Added ${addQty} ${product.name} to cart`)
    } catch (error) {
      console.error('Error adding to cart:', error)
      toast.error('Failed to add item to cart')
    }
  }

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    toast.info('Reviews can only be submitted after receiving your order. Check your order history to leave a review!')
    setShowReviewForm(false)
  }

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
    return (sum / reviews.length).toFixed(1)
  }

  const handleBuyNow = () => {
    handleAddToCart()
    // Small delay to ensure localStorage is written before navigation
    setTimeout(() => {
      navigate('/cart')
    }, 100)
  }

  useEffect(() => {
    const update = () => {
      try {
        setWishlisted(readWishlistIds().includes(String(id || '')))
      } catch {
        setWishlisted(false)
      }
    }
    update()
    try { window.addEventListener('wishlistUpdated', update) } catch {}
    try { window.addEventListener('storage', update) } catch {}
    return () => {
      try { window.removeEventListener('wishlistUpdated', update) } catch {}
      try { window.removeEventListener('storage', update) } catch {}
    }
  }, [id])

  const onToggleWishlist = async () => {
    if (!id || wishBusy) return
    setWishBusy(true)
    try {
      const ids = await toggleWishlist(id)
      const next = Array.isArray(ids) ? ids.includes(String(id)) : !wishlisted
      setWishlisted(next)
      if (next) toast.success('Added to wishlist')
      else toast.info('Removed from wishlist')
    } catch {
    } finally {
      setWishBusy(false)
    }
  }

  if (loading && !product) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#f4f4f4' }}>
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="bg-gray-100 rounded-xl h-[500px]"></div>
              <div className="space-y-6">
                <div className="h-8 bg-gray-100 rounded w-3/4"></div>
                <div className="h-6 bg-gray-100 rounded w-1/4"></div>
                <div className="h-24 bg-gray-100 rounded w-full"></div>
                <div className="h-12 bg-gray-100 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#f4f4f4' }}>
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Product not found</h1>
          <p className="mt-2 text-gray-500">The product you're looking for doesn't exist.</p>
          <Link to="/catalog" className="mt-4 inline-block text-orange-600 hover:underline">Return to Catalog</Link>
        </div>
      </div>
    )
  }

  const resolveImageUrl = (u) => {
    if (!u) return '/placeholder-product.svg'
    if (typeof u !== 'string') return '/placeholder-product.svg'
    if (u.startsWith('http')) return u
    if (u.startsWith('/') && !u.startsWith('/uploads/') && !u.startsWith('/api/uploads/')) return u
    return mediaUrl(u) || '/placeholder-product.svg'
  }

  const sanitizeWhatsAppNumber = (n) => {
    const raw = String(n || '')
    return raw.replace(/[^0-9]/g, '')
  }

  const toAbsoluteUrl = (u) => {
    const s = String(u || '')
    if (!s) return ''
    if (s.startsWith('http://') || s.startsWith('https://')) return s
    if (!s.startsWith('/')) return s
    try {
      return `${window.location.origin}${s}`
    } catch {
      return s
    }
  }

  const orderedMedia = (() => {
    const seq = Array.isArray(product?.mediaSequence) ? product.mediaSequence : []
    const cleaned = seq
      .filter((m) => m && typeof m === 'object' && typeof m.url === 'string' && String(m.url).trim())
      .map((m) => ({
        type: String(m.type || 'image'),
        url: String(m.url || '').trim(),
        position: Number.isFinite(Number(m.position)) ? Number(m.position) : 0,
      }))
      .sort((a, b) => (a.position - b.position))
    if (cleaned.length) return cleaned
    const imgs = Array.isArray(product?.images) && product.images.length
      ? product.images
      : (product?.imagePath ? [product.imagePath] : [])
    const out = imgs.filter(Boolean).map((u, idx) => ({ type: 'image', url: String(u), position: idx }))
    const v = product?.video || ''
    if (v) out.push({ type: 'video', url: String(v), position: out.length })
    return out
  })()

  const imageMedia = orderedMedia.filter((m) => String(m.type) === 'image')
  const rawImages = imageMedia.map((m) => m.url)

  // If no images but has video, we'll handle it specially
  const hasNoImages = rawImages.length === 0
  const images = hasNoImages ? [] : rawImages.map(resolveImageUrl)

  // Video URL
  const firstVideo = orderedMedia.find((m) => String(m.type) === 'video')
  const videoUrl = firstVideo?.url ? resolveImageUrl(firstVideo.url) : (product.video ? resolveImageUrl(product.video) : null)

  // Combined media (images + video for gallery)
  const hasVideo = !!videoUrl
  const mediaItems = hasVideo ? [...images, { type: 'video', url: videoUrl }] : images.map(img => ({ type: 'image', url: img }))
  const isVideoSelected = hasVideo && selectedImage === images.length

  const waNumber = sanitizeWhatsAppNumber(product?.whatsappNumber)
  const waImage = toAbsoluteUrl((images && images.length ? images[0] : resolveImageUrl(product?.imagePath)) || '')
  const waProductUrl = (() => {
    try { return window.location.href } catch { return '' }
  })()
  const waText = (() => {
    try {
      return encodeURIComponent(`Product: ${product?.name || ''}\nImage: ${waImage || ''}\nLink: ${waProductUrl || ''}`)
    } catch {
      return ''
    }
  })()
  const waUrl = waNumber ? `https://wa.me/${waNumber}?text=${waText}` : ''

  // Price calculation - use salePrice if it exists and is less than regular price
  const basePrice = Number(product.price) || 0
  const salePrice = Number(product.salePrice) || 0
  const hasActiveSale = salePrice > 0 && salePrice < basePrice
  const displayPrice = hasActiveSale ? salePrice : basePrice
  const originalPrice = hasActiveSale ? basePrice : null
  const discountPercentage = originalPrice && originalPrice > displayPrice
    ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
    : 0

  return (
    <div className="min-h-screen font-sans text-gray-900" style={{ backgroundColor: '#f4f4f4' }}>
      <Header onCartClick={() => setIsCartOpen(true)} />

      {loading ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(244,244,244,0.65)',
            backdropFilter: 'blur(2px)',
            zIndex: 50,
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600 font-medium">Loading…</span>
          </div>
        </div>
      ) : null}

      {/* Breadcrumb - Single Line */}
      <div className="px-4 py-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            try {
              if (window.history.length > 1) navigate(-1)
              else navigate('/catalog')
            } catch {
              navigate('/catalog')
            }
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-orange-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <p className="text-[11px] text-gray-400">
          <Link to="/" className="hover:text-orange-500">Home</Link>
          <span className="mx-1">/</span>
          <Link to="/catalog" className="hover:text-orange-500">All Products</Link>
          {product.category && (
            <>
              <span className="mx-1">/</span>
              <span className="capitalize">{product.category}</span>
            </>
          )}
          <span className="mx-1">/</span>
          <span className="text-gray-600">{product.name?.split(' ').slice(0, 2).join(' ')}...</span>
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          <div className="lg:col-span-7">
            {/* Mobile Swipable Gallery */}
            <div className="lg:hidden relative">
              <div
                className="overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                ref={mobileGalleryRef}
                onScroll={(e) => {
                  const scrollLeft = e.target.scrollLeft
                  const width = e.target.offsetWidth
                  const totalItems = hasVideo ? Math.max(images.length, 0) + 1 : Math.max(images.length, 1)
                  const newIndex = Math.round(scrollLeft / width)

                  if (newIndex !== selectedImage && newIndex >= 0 && newIndex < totalItems) {
                    setSelectedImage(newIndex)
                  }
                }}
              >
                <div className="flex w-max">
                  {images.length > 0 ? images.map((img, idx) => (
                    <div key={idx} className="w-screen flex-shrink-0 snap-center">
                      <div className="aspect-square bg-white mx-4 rounded-2xl overflow-hidden border border-gray-100">
                        <img
                          src={img}
                          alt={`Product ${idx + 1}`}
                          className="w-full h-full object-contain p-4"
                          onError={(e) => { e.target.src = '/placeholder-product.svg' }}
                        />
                      </div>
                    </div>
                  )) : !hasVideo && (
                    <div className="w-screen flex-shrink-0 snap-center">
                      <div className="aspect-square bg-gray-100 mx-4 rounded-2xl overflow-hidden border border-gray-100 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-6xl mb-2">📦</div>
                          <p className="text-gray-400">No image</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Video slide for mobile */}
                  {hasVideo && (
                    <div className="w-screen flex-shrink-0 snap-center">
                      <div className="aspect-square bg-black mx-4 rounded-2xl overflow-hidden border border-gray-100 flex items-center justify-center">
                        <video
                          src={videoUrl}
                          controls
                          loop
                          playsInline
                          className="w-full h-full object-contain"
                          poster={images.length > 0 ? images[0] : undefined}
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Image/Video Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                {(isVideoSelected || (hasNoImages && hasVideo)) && <span>🎬</span>}
                {selectedImage + 1} / {hasVideo ? Math.max(images.length, 0) + 1 : Math.max(images.length, 1)}
              </div>

              {/* Sale Badge */}
              {hasActiveSale && !isVideoSelected && (
                <div className="absolute top-8 left-8 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded shadow-sm">
                  {discountPercentage}% OFF
                </div>
              )}
            </div>

            {(images.length > 1 || hasVideo) && (
              <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide lg:hidden">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(idx)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border bg-white flex-shrink-0 transition-all ${
                      selectedImage === idx && !isVideoSelected ? 'border-orange-500 ring-1 ring-orange-500' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Product thumbnail ${idx + 1}`}
                      className="w-full h-full object-contain p-2"
                      onError={(e) => { e.target.src = '/placeholder-product.svg' }}
                    />
                  </button>
                ))}
                {hasVideo && (
                  <button
                    type="button"
                    onClick={() => setSelectedImage(images.length)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border bg-gray-900 flex-shrink-0 transition-all ${
                      isVideoSelected ? 'border-orange-500 ring-1 ring-orange-500' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    aria-label="Product video"
                    title="Product video"
                  >
                    <div className="w-full h-full grid place-items-center">
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                  </button>
                )}
              </div>
            )}

            {/* Desktop Gallery */}
            <div className="hidden lg:flex flex-col-reverse lg:flex-row gap-4 h-[600px]">
              {/* Vertical Thumbnails */}
              {(images.length > 0 || hasVideo) && (
                <div className="hidden lg:flex flex-col gap-3 w-20 overflow-y-auto scrollbar-hide flex-shrink-0">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`relative w-20 h-24 rounded-lg overflow-hidden border transition-all duration-200 ${
                        selectedImage === idx && !isVideoSelected ? 'border-orange-500 ring-1 ring-orange-500' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Product ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = '/placeholder-product.svg' }}
                      />
                    </button>
                  ))}
                  {/* Video Thumbnail */}
                  {hasVideo && (
                    <button
                      onClick={() => setSelectedImage(images.length)}
                      className={`relative w-20 h-24 rounded-lg overflow-hidden border transition-all duration-200 bg-gray-900 ${
                        isVideoSelected ? 'border-orange-500 ring-1 ring-orange-500' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                        <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                          <svg className="w-4 h-4 text-orange-500 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        </div>
                      </div>
                      {images.length > 0 ? (
                        <img
                          src={images[0]}
                          alt="Video thumbnail"
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Main Image or Video */}
              <div className="flex-1 relative bg-white rounded-2xl overflow-hidden border border-gray-100 h-full group">
                {isVideoSelected || (hasNoImages && hasVideo) ? (
                  <video
                    src={videoUrl}
                    controls
                    loop
                    playsInline
                    className="w-full h-full object-contain bg-black"
                    poster={images.length > 0 ? images[0] : undefined}
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : images.length > 0 ? (
                  <img
                    src={images[selectedImage] || images[0]}
                    alt={product.name}
                    className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105 cursor-zoom-in"
                    onError={(e) => { e.target.src = '/placeholder-product.svg' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <div className="text-6xl mb-2">📦</div>
                      <p className="text-gray-400">No image available</p>
                    </div>
                  </div>
                )}

                {hasActiveSale && !isVideoSelected && (
                  <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded shadow-sm">
                    {discountPercentage}% OFF
                  </div>
                )}
              </div>
            </div>

            {/* Product Video Section (shown below gallery if video exists) */}
            {hasVideo && !isVideoSelected && (
              <div className="mt-6 lg:hidden">
                <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                  Product Video
                </h3>
                <div className="rounded-2xl overflow-hidden border border-gray-100 bg-black">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full max-h-[400px]"
                    poster={images[0]}
                    preload="metadata"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-4">
            <div>
              {/* Ultra Minimalist Product Title */}
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-snug mb-4">
                {product.name?.split(' ').slice(0, 6).join(' ')}
              </h1>

              {/* Ultra Premium Minimalist Pricing */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl sm:text-3xl font-bold text-orange-500">
                  {formatPrice(
                    convertPrice(displayPrice, product.baseCurrency || 'SAR', getDisplayCurrency()),
                    getDisplayCurrency()
                  )}
                </span>
                {originalPrice && (
                  <span className="text-base text-gray-300 line-through">
                    {formatPrice(
                      convertPrice(originalPrice, product.baseCurrency || 'SAR', getDisplayCurrency()),
                      getDisplayCurrency()
                    )}
                  </span>
                )}
                {hasActiveSale && (
                  <span className="text-xs font-semibold text-white bg-red-500 px-2 py-0.5 rounded">
                    -{discountPercentage}%
                  </span>
                )}
                {isCustomer && (
                  <button
                    onClick={onToggleWishlist}
                    disabled={wishBusy}
                    className={`ml-auto w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                      wishlisted ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-200 text-gray-500 hover:text-orange-600'
                    } ${wishBusy ? 'opacity-70 cursor-not-allowed' : ''}`}
                    aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {product.variants && Object.keys(product.variants).length > 0 && (
                <div className="mb-6 space-y-4">
                  {Object.entries(normalizeVariants(product.variants)).map(([name, options]) => (
                    <div key={name}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-900 capitalize">{name}:</span>
                        <span className="text-sm text-gray-500">{selectedVariants[name] || 'Select'}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(options) && options.map((opt, idx) => {
                          const value = String(opt?.value || '')
                          const stockQty = Number(opt?.stockQty)
                          const disabled = Number.isFinite(stockQty) ? stockQty <= 0 : false
                          const isColor = String(name || '').toLowerCase() === 'color'
                          return (
                            isColor ? (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  if (disabled) return
                                  setSelectedVariants((prev) => ({ ...prev, [name]: value }))
                                  try {
                                    if (opt?.image) {
                                      const abs = resolveImageUrl(opt.image)
                                      const imgIdx = images.findIndex((u) => u === abs)
                                      if (imgIdx >= 0) setSelectedImage(imgIdx)
                                    }
                                  } catch {}
                                }}
                                disabled={disabled}
                                title={value}
                                className={`relative w-11 h-11 rounded-lg border transition-all overflow-hidden ${
                                  selectedVariants[name] === value
                                    ? 'border-orange-500 ring-2 ring-orange-500'
                                    : disabled
                                      ? 'border-gray-200 opacity-40 cursor-not-allowed'
                                      : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                {opt?.image ? (
                                  <img
                                    src={resolveImageUrl(opt.image)}
                                    alt={value}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div
                                    className="w-full h-full"
                                    style={{ backgroundColor: (typeof opt?.swatch === 'string' && opt.swatch) ? opt.swatch : '#f3f4f6' }}
                                  />
                                )}
                              </button>
                            ) : (
                              <button
                                key={idx}
                                onClick={() => {
                                  if (disabled) return
                                  setSelectedVariants(prev => ({ ...prev, [name]: value }))
                                  try {
                                    if (opt?.image) {
                                      const abs = resolveImageUrl(opt.image)
                                      const imgIdx = images.findIndex((u) => u === abs)
                                      if (imgIdx >= 0) setSelectedImage(imgIdx)
                                    }
                                  } catch {}
                                }}
                                disabled={disabled}
                                className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                                  selectedVariants[name] === value
                                    ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium'
                                    : disabled
                                      ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
                                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                }`}
                              >
                                {value}
                              </button>
                            )
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border border-gray-100 rounded-xl p-4 flex items-start gap-3 bg-gray-50/50 mb-6">
                <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                <div className="text-sm">
                  <p className="font-medium text-gray-700">Buyer Protection</p>
                  <p className="text-gray-500 text-xs mt-0.5">Full refund if you don't receive your order. Refund or keep items not as described.</p>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center gap-4 mb-6">
                <span className="text-sm font-medium text-gray-700">Quantity:</span>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                  </button>
                  <span className="w-12 h-10 flex items-center justify-center font-semibold text-gray-900 border-x border-gray-200">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                </div>
                {product.stockQty > 0 && (
                  <span className="text-xs text-gray-400">{product.stockQty} available</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  className="w-full py-3.5 px-6 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Add to Cart
                </button>

                {waUrl ? (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 px-6 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 hover:shadow-green-500/30"
                    aria-label="Chat on WhatsApp"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    WhatsApp
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16">
          {/* Tabs Navigation */}
          <div className="flex border-b border-gray-200 mb-8 overflow-x-auto scrollbar-hide">
            {[
              { id: 'description', label: 'Description' },
              { id: 'reviews', label: `Buyer Review (${reviews.length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 px-6 font-semibold text-base transition-all relative whitespace-nowrap ${
                  activeTab === tab.id ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900"></span>}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-3">

              {activeTab === 'description' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">

                  {/* Ultra Premium Specs Grid */}
                  {product.descriptionBlocks && product.descriptionBlocks.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {product.descriptionBlocks.map((block, idx) => (
                        <div key={idx} className="group relative bg-white p-4 rounded-xl border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all duration-300">
                          <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300" />
                          <p className="relative text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-1.5">{block.label}</p>
                          <p className="relative text-gray-900 font-semibold text-sm leading-snug">{block.value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Premium Main Description */}
                  {product.description && (
                    <div className="bg-white rounded-xl p-6 border border-gray-100">
                      <p className="text-gray-700 leading-[1.8] text-[15px] whitespace-pre-line">
                        {product.description}
                      </p>
                    </div>
                  )}

                  {/* Premium Overview Section */}
                  {product.overview && (
                    <div className="relative overflow-hidden rounded-xl">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-amber-50/80 to-orange-50/60" />
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-400 to-amber-400" />
                      <div className="relative p-6">
                        <p className="text-gray-800 leading-[1.85] whitespace-pre-line text-[15px]">
                          {product.overview}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Premium Specifications */}
                  {product.specifications && (
                    <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-100">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-5 bg-gradient-to-b from-gray-400 to-gray-300 rounded-full" />
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.15em]">Specifications</p>
                      </div>
                      <p className="text-gray-600 leading-[1.75] whitespace-pre-line text-sm">
                        {product.specifications}
                      </p>
                    </div>
                  )}

                  {/* Empty state */}
                  {!product.description && !product.overview && !product.specifications && (!product.descriptionBlocks || product.descriptionBlocks.length === 0) && (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-400 font-medium">No description available</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-gray-900">Customer Reviews</h3>
                    <button
                      onClick={() => setShowReviewForm(!showReviewForm)}
                      className="text-orange-600 font-semibold hover:underline"
                    >
                      Write a Review
                    </button>
                  </div>

                  {showReviewForm && (
                    <form onSubmit={handleReviewSubmit} className="bg-gray-50 p-6 rounded-xl mb-8 border border-gray-200 animate-in fade-in slide-in-from-top-2">
                      <div className="grid gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Rating:</span>
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                              className={`text-2xl transition-transform hover:scale-110 ${star <= newReview.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                            >★</button>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Your Name"
                          value={newReview.name}
                          onChange={e => setNewReview(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          required
                        />
                        <textarea
                          placeholder="Share your thoughts..."
                          value={newReview.comment}
                          onChange={e => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          rows="4"
                          required
                        />
                        <div className="flex gap-3">
                          <button type="submit" className="bg-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors">Submit</button>
                          <button type="button" onClick={() => setShowReviewForm(false)} className="text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
                        </div>
                      </div>
                    </form>
                  )}

                  <div className="space-y-6">
                    {reviews.length > 0 ? reviews.map(review => (
                      <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{review.name}</span>
                            {review.verified && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Verified</span>}
                          </div>
                          <span className="text-sm text-gray-400">{review.date}</span>
                        </div>
                        <div className="flex items-center mb-2">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <p className="text-gray-600 leading-relaxed">{review.comment}</p>
                      </div>
                    )) : (
                      <div className="text-center py-12 bg-gray-50 rounded-2xl">
                        <p className="text-gray-500 mb-4">No reviews yet. Be the first to share your thoughts!</p>
                        <button onClick={() => setShowReviewForm(true)} className="text-orange-600 font-semibold hover:underline">Write a Review</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {images.length > 1 && (
          <div className="mt-16">
            <div className="flex items-end justify-between gap-4 mb-4">
              <h3 className="text-lg sm:text-xl font-extrabold text-gray-900">Product Images</h3>
              <button
                type="button"
                onClick={() => {
                  try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
                }}
                className="text-xs font-bold text-gray-500 hover:text-orange-600"
              >
                Back to top
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedImage(idx)
                    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
                  }}
                  className={`w-full h-[70vh] sm:h-auto sm:aspect-square rounded-3xl overflow-hidden border bg-white transition-all ${
                    selectedImage === idx && !isVideoSelected ? 'border-orange-500 ring-1 ring-orange-500' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Product image ${idx + 1}`}
                    className="w-full h-full object-contain p-6 sm:p-8"
                    loading="lazy"
                    onError={(e) => { e.target.src = '/placeholder-product.svg' }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <div className="flex items-end justify-between gap-4 mb-4">
              <h3 className="text-lg sm:text-xl font-extrabold text-gray-900">You May Also Like</h3>
              <Link to="/catalog" className="text-xs font-bold text-orange-600 hover:underline">View all</Link>
            </div>

            <div className="grid grid-cols-5 gap-2 lg:hidden">
              {relatedProducts.slice(0, 5).map((p) => {
                const pImg = (p.images && p.images[0]) || p.imagePath || '/placeholder-product.svg'
                const pImgUrl = resolveImageUrl(pImg)
                const pPrice = p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price
                const shortName = String(p.name || '').split(' ').filter(Boolean).slice(0, 5).join(' ')

                return (
                  <Link
                    key={p._id}
                    to={`/product/${p._id}`}
                    className="group bg-white/80 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all overflow-hidden flex flex-col h-full"
                  >
                    <div className="w-full aspect-square bg-gray-50 grid place-items-center">
                      <img
                        src={pImgUrl}
                        alt={p.name}
                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                        loading="lazy"
                        onError={(e) => { e.target.src = '/placeholder-product.svg' }}
                      />
                    </div>
                    <div className="p-2 flex flex-col flex-1">
                      <div className="text-[10px] font-semibold text-gray-900/90 line-clamp-1 leading-snug">{shortName}</div>
                      <div className="mt-auto pt-1 text-gray-900 font-extrabold text-[11px] whitespace-nowrap tabular-nums leading-none">
                        {formatPrice(
                          convertPrice(pPrice, p.baseCurrency || 'SAR', getDisplayCurrency()),
                          getDisplayCurrency()
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            <div className="hidden lg:grid grid-cols-5 gap-4">
              {relatedProducts.slice(0, 5).map((p) => {
                const pImg = (p.images && p.images[0]) || p.imagePath || '/placeholder-product.svg'
                const pImgUrl = resolveImageUrl(pImg)
                const pPrice = p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price
                const shortName = String(p.name || '').split(' ').filter(Boolean).slice(0, 5).join(' ')

                return (
                  <Link
                    key={p._id}
                    to={`/product/${p._id}`}
                    className="group bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition-all overflow-hidden"
                  >
                    <div className="w-full aspect-square bg-gray-50 grid place-items-center">
                      <img
                        src={pImgUrl}
                        alt={p.name}
                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                        loading="lazy"
                        onError={(e) => { e.target.src = '/placeholder-product.svg' }}
                      />
                    </div>
                    <div className="p-4">
                      <div className="text-sm font-semibold text-gray-900 line-clamp-1 leading-snug">{shortName}</div>
                      <div className="mt-2 text-orange-600 font-extrabold">
                        {formatPrice(
                          convertPrice(pPrice, p.baseCurrency || 'SAR', getDisplayCurrency()),
                          getDisplayCurrency()
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

      </div>

      <ShoppingCart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />

      {/* Ultra Premium Product Bottom Navigation - Mobile Only */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 md:hidden safe-area-bottom">
        <div className="flex items-center h-16 px-2 gap-2">
          {/* Profile Button */}
          <button 
            onClick={() => navigate('/customer')}
            className="flex flex-col items-center justify-center w-14 h-full text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[10px] mt-0.5">Profile</span>
          </button>

          {/* Add to Cart Button */}
          <button 
            onClick={handleAddToCart}
            className="flex-1 h-11 bg-white border-2 border-orange-500 text-orange-500 font-semibold rounded-full flex items-center justify-center gap-1.5 text-sm hover:bg-orange-50 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Add to Cart
          </button>

          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-11 bg-green-500 text-white rounded-full flex items-center justify-center shadow-sm"
              aria-label="Chat on WhatsApp"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
          ) : null}

          {/* Dropship Button */}
          <button 
            onClick={() => navigate('/dropshipper/signup')}
            className="flex flex-col items-center justify-center w-14 h-full text-blue-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-[10px] mt-0.5">Dropship</span>
          </button>
        </div>
      </div>

      {/* Spacer for fixed bottom nav */}
      <div className="h-20 md:hidden" />

      <style jsx>{`
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0);
        }
      `}</style>
      
    </div>
  )
}

export default ProductDetail