import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { apiGet, apiPost, mediaUrl } from '../../api'
import { detectCountryCode } from '../../utils/geo'
import { useToast } from '../../ui/Toast'
import Header from '../../components/layout/Header'

import ShoppingCart from '../../components/ecommerce/ShoppingCart'
import { trackPageView, trackProductView, trackAddToCart } from '../../utils/analytics'
import { getCurrencyConfig, convert as fxConvert, formatMoney } from '../../util/currency'
import FormattedPrice from '../../components/ui/FormattedPrice'
import { resolveWarehouse, getLocalStockByCountry } from '../../utils/warehouse'
import { readWishlistIds, toggleWishlist } from '../../util/wishlist'
import { getProductRating, getProductReviews, getStarArray } from '../../utils/autoReviews'

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
  const [cartSuccessModal, setCartSuccessModal] = useState(null)
  const [cartCount, setCartCount] = useState(() => { try { const c = JSON.parse(localStorage.getItem('shopping_cart') || '[]'); return c.reduce((s, i) => s + (i.quantity || 1), 0) } catch { return 0 } })
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

  useEffect(() => {
    const updateCart = () => { try { const c = JSON.parse(localStorage.getItem('shopping_cart') || '[]'); setCartCount(c.reduce((s, i) => s + (i.quantity || 1), 0)) } catch { setCartCount(0) } }
    window.addEventListener('cartUpdated', updateCart); window.addEventListener('storage', updateCart)
    return () => { window.removeEventListener('cartUpdated', updateCart); window.removeEventListener('storage', updateCart) }
  }, [])

  const COUNTRY_TO_CURRENCY = {
    AE: 'AED', OM: 'OMR', SA: 'SAR', BH: 'BHD', IN: 'INR',
    KW: 'KWD', QA: 'QAR', PK: 'PKR', JO: 'JOD', US: 'USD',
    GB: 'GBP', CA: 'CAD', AU: 'AUD',
  }

  const getDisplayCurrency = () => COUNTRY_TO_CURRENCY[selectedCountry] || 'SAR'
  const convertPrice = (value, fromCurrency, toCurrency) => fxConvert(value, fromCurrency || 'SAR', toCurrency || getDisplayCurrency(), ccyCfg)
  const formatPrice = (price, currency) => formatMoney(Number(price || 0), currency || getDisplayCurrency())

  const normalizeVariants = (rawVariants) => {
    const out = {}
    const v = rawVariants && typeof rawVariants === 'object' && !Array.isArray(rawVariants) ? rawVariants : {}
    for (const [k, opts] of Object.entries(v)) {
      if (!Array.isArray(opts)) continue
      const norm = opts.map((opt) => {
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
      }).filter(Boolean)
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
    } catch { return '' }
  }

  const [isCustomer] = useState(() => {
    try {
      const token = localStorage.getItem('token')
      if (!token || token === 'null') return false
      const me = JSON.parse(localStorage.getItem('me') || 'null')
      return !!me && me.role === 'customer'
    } catch { return false }
  })

  useEffect(() => {
    if (product) {
      const pageTitle = product.metaTitle || product.seoTitle || product.name || 'Product'
      document.title = pageTitle
      const metaDesc = product.metaDescription || product.seoDescription || product.description?.slice(0, 160) || ''
      if (metaDesc) {
        let metaTag = document.querySelector('meta[name="description"]')
        if (!metaTag) { metaTag = document.createElement('meta'); metaTag.setAttribute('name', 'description'); document.head.appendChild(metaTag) }
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
      if (product.category) loadRelatedProducts(product.category)
    }
  }, [product, id])

  const loadRelatedProducts = async (category) => {
    try {
      const response = await apiGet(`/api/products/public?category=${encodeURIComponent(category)}&limit=10&country=${encodeURIComponent(selectedCountry)}`)
      if (response?.products) {
        setRelatedProducts(response.products.filter(p => p._id !== product._id).slice(0, 6))
      }
    } catch (error) { console.error('Error loading related products:', error) }
  }

  const loadProduct = async () => {
    try {
      setLoading(true)
      const response = await apiGet(`/api/products/public/${id}`)
      if (response?.product) {
        setProduct({ ...response.product, images: response.product.images || [response.product.imagePath || '/placeholder-product.svg'] })
      } else { toast.error('Product not found'); navigate('/catalog') }
    } catch (error) { console.error('Error loading product:', error); toast.error('Failed to load product'); navigate('/catalog') }
    finally { setLoading(false) }
  }

  const loadReviews = async () => {
    try {
      const response = await apiGet(`/api/reviews/product/${id}`)
      if (response?.reviews) {
        setReviews(response.reviews.map(r => ({ id: r._id, name: r.customerName, rating: r.rating, comment: r.comment, date: new Date(r.createdAt).toLocaleDateString(), verified: r.isVerifiedPurchase })))
      }
    } catch (error) { console.error('Error loading reviews:', error) }
  }

  useEffect(() => { if (!id) return; setSelectedImage(0); setQuantity(1); loadProduct(); loadReviews(); try { window.scrollTo({ top: 0, behavior: 'instant' }) } catch {} }, [id])

  // Inject <link rel="preload"> for first product image the moment we know the URL — starts
  // browser fetch one full API round-trip earlier than waiting for the <img> to render
  useEffect(() => {
    if (!product) return
    const raw = (() => {
      const seq = Array.isArray(product.mediaSequence) ? product.mediaSequence : []
      const first = seq.find(m => m && typeof m === 'object' && String(m.type || 'image') === 'image' && String(m.url || '').trim())
      if (first) return String(first.url).trim()
      const imgs = Array.isArray(product.images) && product.images.length ? product.images : []
      return imgs[0] ? String(imgs[0]) : ''
    })()
    if (!raw) return
    const src = raw.startsWith('http') ? raw : (mediaUrl(raw) || '')
    if (!src || src === '/placeholder-product.svg') return
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = src
    link.setAttribute('fetchpriority', 'high')
    document.head.appendChild(link)
    return () => { try { document.head.removeChild(link) } catch {} }
  }, [product?._id])


  const handleAddToCart = () => {
    if (!product) return
    try {
      const savedCart = localStorage.getItem('shopping_cart')
      let cartItems = savedCart ? JSON.parse(savedCart) : []
      const normalizedVariants2 = normalizeVariants(product.variants)
      let variantMax = Number.POSITIVE_INFINITY
      for (const [k, opts] of Object.entries(normalizedVariants2)) {
        const selectedVal = String(selectedVariants?.[k] || '').trim()
        if (!selectedVal) continue
        const hit = Array.isArray(opts) ? opts.find((o) => String(o?.value) === selectedVal) : null
        if (hit && Number.isFinite(Number(hit.stockQty))) variantMax = Math.min(variantMax, Math.max(0, Number(hit.stockQty)))
      }
      let fallbackMax = Number(product?.stockQty || 0)
      if (fallbackMax <= 0 && product?.stockByCountry && typeof product.stockByCountry === 'object') {
        const localStock = getLocalStockByCountry(product.stockByCountry, selectedCountry)
        if (localStock > 0) { fallbackMax = localStock }
        else {
          const totalStock = Object.values(product.stockByCountry).reduce((s, v) => s + Math.max(0, Number(v) || 0), 0)
          if (totalStock > 0) fallbackMax = totalStock
        }
      }
      const max = variantMax !== Number.POSITIVE_INFINITY ? variantMax : fallbackMax
      if (Number.isFinite(Number(max)) && Number(max) <= 0) { toast.error('Selected option is out of stock'); return }
      const basePriceVal = Number(product?.price) || 0
      const salePriceVal = Number(product?.salePrice) || 0
      const hasSale = salePriceVal > 0 && salePriceVal < basePriceVal
      const unitPrice = hasSale ? salePriceVal : basePriceVal
      const addQty = Math.max(1, Math.floor(Number(quantity) || 1))
      const wh = resolveWarehouse(product, selectedCountry, addQty)
      const variantSignature = buildVariantSignature(selectedVariants)
      const cartItemId = variantSignature ? `${product._id}::${variantSignature}` : String(product._id)
      const existingItemIndex = cartItems.findIndex(item => String(item.id) === String(cartItemId))
      const cartItem = { id: cartItemId, productId: product._id, name: product.name, price: unitPrice, currency: product.baseCurrency || 'SAR', image: (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : (product.imagePath || '')), quantity: addQty, maxStock: max, variants: selectedVariants, stockByCountry: product.stockByCountry || {}, warehouseType: wh.type, etaMinDays: wh.etaMinDays, etaMaxDays: wh.etaMaxDays, warehouseCountry: selectedCountry }
      if (existingItemIndex >= 0) {
        const current = Number(cartItems[existingItemIndex].quantity || 0)
        const candidate = current + addQty
        cartItems[existingItemIndex].quantity = (max > 0 && candidate > max) ? max : candidate
        cartItems[existingItemIndex].variants = selectedVariants
        cartItems[existingItemIndex].productId = product._id
        cartItems[existingItemIndex].maxStock = max
        const wh2 = resolveWarehouse(product, selectedCountry, cartItems[existingItemIndex].quantity)
        Object.assign(cartItems[existingItemIndex], { stockByCountry: product.stockByCountry || cartItems[existingItemIndex].stockByCountry || {}, warehouseType: wh2.type, etaMinDays: wh2.etaMinDays, etaMaxDays: wh2.etaMaxDays, warehouseCountry: selectedCountry })
      } else { cartItems.push(cartItem) }
      const cartJson = JSON.stringify(cartItems)
      localStorage.setItem('shopping_cart', cartJson)
      try { sessionStorage.setItem('shopping_cart_bak', cartJson) } catch {}
      try { localStorage.setItem('last_added_product', String(product._id)) } catch {}
      trackAddToCart(product._id, product.name, addQty, unitPrice)
      window.dispatchEvent(new CustomEvent('cartUpdated'))
      setCartSuccessModal({ image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : (product.imagePath || ''), name: product.name, qty: addQty })
    } catch (error) { console.error('Error adding to cart:', error); toast.error('Failed to add item to cart') }
  }

  const handleReviewSubmit = async (e) => { e.preventDefault(); toast.info('Reviews can only be submitted after receiving your order.'); setShowReviewForm(false) }
  const calculateAverageRating = () => { if (reviews.length === 0) return 0; return (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) }
  const handleBuyNow = () => { handleAddToCart(); setTimeout(() => navigate('/cart'), 100) }

  useEffect(() => {
    const update = () => { try { setWishlisted(readWishlistIds().includes(String(id || ''))) } catch { setWishlisted(false) } }
    update()
    try { window.addEventListener('wishlistUpdated', update); window.addEventListener('storage', update) } catch {}
    return () => { try { window.removeEventListener('wishlistUpdated', update); window.removeEventListener('storage', update) } catch {} }
  }, [id])

  const onToggleWishlist = async () => {
    if (!id || wishBusy) return
    setWishBusy(true)
    try {
      const ids = await toggleWishlist(id)
      const next = Array.isArray(ids) ? ids.includes(String(id)) : !wishlisted
      setWishlisted(next)
      if (next) toast.success('Added to wishlist'); else toast.info('Removed from wishlist')
    } catch {} finally { setWishBusy(false) }
  }

  // Loading state
  if (loading && !product) {
    return (
      <div className="min-h-screen bg-[#F8F9FC]">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse"><div className="grid grid-cols-1 lg:grid-cols-2 gap-12"><div className="bg-gray-100 rounded-[40px] h-[500px]" /><div className="space-y-6"><div className="h-8 bg-gray-100 rounded-2xl w-3/4" /><div className="h-6 bg-gray-100 rounded-2xl w-1/4" /><div className="h-24 bg-gray-100 rounded-2xl w-full" /><div className="h-14 bg-gray-100 rounded-2xl w-1/2" /></div></div></div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F8F9FC]">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
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
  const sanitizeWhatsAppNumber = (n) => String(n || '').replace(/[^0-9]/g, '')
  const toAbsoluteUrl = (u) => { const s = String(u || ''); if (!s) return ''; if (s.startsWith('http://') || s.startsWith('https://')) return s; if (!s.startsWith('/')) return s; try { return `${window.location.origin}${s}` } catch { return s } }

  const orderedMedia = (() => {
    const seq = Array.isArray(product?.mediaSequence) ? product.mediaSequence : []
    const cleaned = seq.filter(m => m && typeof m === 'object' && typeof m.url === 'string' && String(m.url).trim()).map(m => ({ type: String(m.type || 'image'), url: String(m.url || '').trim(), position: Number.isFinite(Number(m.position)) ? Number(m.position) : 0 })).sort((a, b) => a.position - b.position)
    if (cleaned.length) return cleaned
    const imgs = Array.isArray(product?.images) && product.images.length ? product.images : (product?.imagePath ? [product.imagePath] : [])
    const out = imgs.filter(Boolean).map((u, idx) => ({ type: 'image', url: String(u), position: idx }))
    const v = product?.video || ''
    if (v) out.push({ type: 'video', url: String(v), position: out.length })
    return out
  })()

  const imageMedia = orderedMedia.filter(m => String(m.type) === 'image')
  const rawImages = imageMedia.map(m => m.url)
  const hasNoImages = rawImages.length === 0
  const images = hasNoImages ? [] : rawImages.map(resolveImageUrl)
  const firstVideo = orderedMedia.find(m => String(m.type) === 'video')
  const videoUrl = firstVideo?.url ? resolveImageUrl(firstVideo.url) : (product.video ? resolveImageUrl(product.video) : null)
  const hasVideo = !!videoUrl
  const isVideoSelected = hasVideo && selectedImage === images.length

  const waNumber = sanitizeWhatsAppNumber(product?.whatsappNumber)
  const waImage = toAbsoluteUrl((images && images.length ? images[0] : resolveImageUrl(product?.imagePath)) || '')
  const waProductUrl = (() => { try { return window.location.href } catch { return '' } })()
  const waText = (() => { try { return encodeURIComponent(`Product: ${product?.name || ''}\nImage: ${waImage}\nLink: ${waProductUrl}`) } catch { return '' } })()
  const waUrl = waNumber ? `https://wa.me/${waNumber}?text=${waText}` : ''

  const basePrice = Number(product.price) || 0
  const salePrice2 = Number(product.salePrice) || 0
  const hasActiveSale = salePrice2 > 0 && salePrice2 < basePrice
  const displayPrice = hasActiveSale ? salePrice2 : basePrice
  const originalPrice = hasActiveSale ? basePrice : null
  const discountPercentage = originalPrice && originalPrice > displayPrice ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : 0

  const normalizedVars = normalizeVariants(product.variants)
  const variantColorOpts = (() => { for (const [k, opts] of Object.entries(normalizedVars)) { if (String(k).toLowerCase() === 'color') return opts } return [] })()

  const goBack = () => { try { if (window.history.length > 1) navigate(-1); else navigate('/catalog') } catch { navigate('/catalog') } }

  const handleShare = async () => {
    const shareData = { title: product?.name || 'Product', text: product?.name || '', url: window.location.href }
    try {
      if (navigator.share) { await navigator.share(shareData) }
      else { await navigator.clipboard.writeText(window.location.href); toast.success('Link copied') }
    } catch (err) { if (err.name !== 'AbortError') { try { await navigator.clipboard.writeText(window.location.href); toast.success('Link copied') } catch {} } }
  }

  const scrollToImage = (idx) => {
    setSelectedImage(idx)
    if (mobileGalleryRef.current) {
      const w = mobileGalleryRef.current.offsetWidth
      mobileGalleryRef.current.scrollTo({ left: w * idx, behavior: 'smooth' })
    }
  }

  const onVariantClick = (name, value, opt) => {
    setSelectedVariants(prev => ({ ...prev, [name]: value }))
    try { if (opt?.image) { const abs = resolveImageUrl(opt.image); const imgIdx = images.findIndex(u => u === abs); if (imgIdx >= 0) setSelectedImage(imgIdx) } } catch {}
  }

  // Shared price display (numeric values for FormattedPrice)
  const priceConverted = convertPrice(displayPrice, product.baseCurrency || 'SAR', getDisplayCurrency())
  const origPriceConverted = originalPrice ? convertPrice(originalPrice, product.baseCurrency || 'SAR', getDisplayCurrency()) : null
  const dispCcy = getDisplayCurrency()
  // Legacy string fallbacks for places that still use text
  const priceDisplay = formatPrice(priceConverted, dispCcy)
  const origPriceDisplay = origPriceConverted ? formatPrice(origPriceConverted, dispCcy) : null

  // --- Variant Selector Component ---
  const VariantSelector = ({ excludeColor }) => {
    if (!product.variants || Object.keys(normalizedVars).length === 0) return null
    return (
      <div className="space-y-4">
        {Object.entries(normalizedVars).map(([name, options]) => {
          const isColor = String(name).toLowerCase() === 'color'
          if (excludeColor && isColor) return null
          if (isColor) return (
            <div key={name}>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">{name}: <span className="text-gray-900">{selectedVariants[name] || ''}</span></label>
              <div className="flex flex-wrap gap-2">
                {options.map((opt, idx) => {
                  const val = String(opt?.value || ''); const dis = Number.isFinite(Number(opt?.stockQty)) ? Number(opt.stockQty) <= 0 : false
                  return <button key={idx} onClick={() => !dis && onVariantClick(name, val, opt)} disabled={dis} title={val} className={`w-10 h-10 rounded-full border-2 transition-all overflow-hidden ${selectedVariants[name] === val ? 'border-orange-500 scale-110 shadow-md' : dis ? 'border-gray-200 opacity-30 cursor-not-allowed' : 'border-gray-200 hover:border-gray-400 hover:scale-105'}`}>
                    {opt?.image ? <img src={resolveImageUrl(opt.image)} alt={val} className="w-full h-full object-cover" /> : <div className="w-full h-full" style={{ backgroundColor: opt?.swatch || '#e5e7eb' }} />}
                  </button>
                })}
              </div>
            </div>
          )
          return (
            <div key={name}>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">{name}</label>
              <div className="flex flex-wrap gap-2">
                {options.map((opt, idx) => {
                  const val = String(opt?.value || ''); const dis = Number.isFinite(Number(opt?.stockQty)) ? Number(opt.stockQty) <= 0 : false
                  return <button key={idx} onClick={() => !dis && onVariantClick(name, val, opt)} disabled={dis} className={`px-5 py-2.5 rounded-2xl text-sm font-medium transition-all ${selectedVariants[name] === val ? 'bg-gray-900 text-white shadow-lg scale-105' : dis ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{val}</button>
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // --- Auto-generated rating ---
  const autoRating = product ? getProductRating(product._id || id) : { rating: 4.5, reviewCount: 30 }
  const autoReviews = product ? getProductReviews(product._id || id) : []
  const allReviews = [...reviews, ...autoReviews]
  const displayRating = autoRating.rating
  const displayReviewCount = allReviews.length

  const StarRating = ({ rating, size = 'sm' }) => {
    const stars = getStarArray(rating)
    const sz = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
    return (
      <div className="flex items-center gap-0.5">
        {stars.map((s, i) => (
          <svg key={i} className={`${sz} ${s === 'empty' ? 'text-gray-200' : 'text-yellow-400'}`} fill="currentColor" viewBox="0 0 20 20">
            {s === 'half' ? (
              <><defs><linearGradient id={`hg${i}`}><stop offset="50%" stopColor="currentColor" /><stop offset="50%" stopColor="#e5e7eb" /></linearGradient></defs><path fill={`url(#hg${i})`} d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></>
            ) : (
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            )}
          </svg>
        ))}
      </div>
    )
  }

  // --- Tabs Content ---
  const TabsContent = () => (
    <div className="mt-6">
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-5">
        {[{ id: 'description', label: 'Details' }, { id: 'reviews', label: `Reviews (${displayReviewCount})` }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{tab.label}</button>
        ))}
      </div>
      {activeTab === 'description' && (
        <div className="space-y-4">
          {product.descriptionBlocks?.length > 0 && <div className="grid grid-cols-2 gap-2">{product.descriptionBlocks.map((b, i) => <div key={i} className="bg-white rounded-2xl p-3 shadow-sm"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{b.label}</p><p className="text-gray-900 font-semibold text-sm">{b.value}</p></div>)}</div>}
          {product.description && <div className="bg-white rounded-2xl p-5 shadow-sm"><p className="text-gray-600 leading-relaxed text-sm whitespace-pre-line">{product.description}</p></div>}
          {product.overview && <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5"><p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">{product.overview}</p></div>}
          {product.specifications && <div className="bg-white rounded-2xl p-5 shadow-sm"><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Specifications</p><p className="text-gray-600 text-sm whitespace-pre-line leading-relaxed">{product.specifications}</p></div>}
          {!product.description && !product.overview && !product.specifications && !product.descriptionBlocks?.length && <div className="text-center py-12 text-gray-400">No description available</div>}
        </div>
      )}
      {activeTab === 'reviews' && (
        <div className="space-y-3">
          {/* Rating summary */}
          <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 mb-2">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{displayRating.toFixed(1)}</div>
              <StarRating rating={displayRating} size="md" />
              <div className="text-xs text-gray-400 mt-1">{displayReviewCount} reviews</div>
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map(star => {
                const count = allReviews.filter(r => Math.floor(r.rating) === star).length
                const pct = displayReviewCount > 0 ? Math.round((count / displayReviewCount) * 100) : 0
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500 w-3">{star}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} /></div>
                    <span className="text-gray-400 w-7 text-right">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
          {allReviews.length > 0 ? allReviews.slice(0, 30).map(r => (
            <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{r.name}</span>
                  {r.countryFlag && <span className="text-xs">{r.countryFlag}</span>}
                  {r.verified && <span className="bg-green-100 text-green-700 text-[9px] px-2 py-0.5 rounded-full font-bold">VERIFIED</span>}
                </div>
                <span className="text-xs text-gray-400">{r.date ? new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
              </div>
              <div className="flex mb-1"><StarRating rating={r.rating} /></div>
              <p className="text-gray-600 text-sm">{r.comment}</p>
              {r.country && <p className="text-[11px] text-gray-400 mt-1">Purchased from {r.country}</p>}
            </div>
          )) : <div className="text-center py-10 bg-white rounded-2xl shadow-sm text-gray-400 text-sm">No reviews yet</div>}
        </div>
      )}
    </div>
  )

  // --- Related Products ---
  const RelatedSection = ({ cols = 'flex' }) => {
    if (relatedProducts.length === 0) return null
    return (
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3"><h3 className="text-lg font-bold text-gray-900">You May Also Like</h3><Link to="/catalog" className="text-xs font-bold text-orange-600">View all</Link></div>
        <div className={cols === 'grid' ? 'grid grid-cols-4 gap-4' : 'flex gap-3 overflow-x-auto scrollbar-hide pb-2'}>
          {relatedProducts.slice(0, cols === 'grid' ? 4 : 6).map(p => {
            const pImg = resolveImageUrl((p.images && p.images[0]) || p.imagePath || '/placeholder-product.svg')
            const pPrice = p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price
            return (
              <Link key={p._id} to={`/product/${p._id}`} className={`bg-white rounded-2xl shadow-sm overflow-hidden group ${cols === 'grid' ? '' : 'flex-shrink-0 w-36'}`}>
                <div className="w-full aspect-square bg-gray-50 grid place-items-center"><img src={pImg} alt={p.name} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform" loading="lazy" onError={e => { e.target.src = '/placeholder-product.svg' }} /></div>
                <div className="p-3"><div className="text-xs font-semibold text-gray-900 line-clamp-1">{p.name}</div><div className="text-orange-600 font-bold text-sm mt-1">{formatPrice(convertPrice(pPrice, p.baseCurrency || 'SAR', getDisplayCurrency()), getDisplayCurrency())}</div></div>
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  // WhatsApp SVG path
  const waPath = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"

  return (
    <div className="min-h-screen bg-[#F8F9FC] font-sans text-gray-900">
      {/* ===== MOBILE (lg:hidden) — no Header, image starts from top ===== */}
      <div className="lg:hidden">
        {/* Hero Image */}
        <div className="relative">
          <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide" ref={mobileGalleryRef} onScroll={e => { const idx = Math.round(e.target.scrollLeft / e.target.offsetWidth); const total = hasVideo ? images.length + 1 : Math.max(images.length, 1); if (idx !== selectedImage && idx >= 0 && idx < total) setSelectedImage(idx) }}>
            <div className="flex w-max">
              {images.length > 0 ? images.map((img, idx) => (
                <div key={idx} className="w-screen flex-shrink-0 snap-center">
                  <div className="relative bg-[#f0f0f2] w-full" style={{ height: '60vh' }}>
                    <img src={img} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" loading={idx === 0 ? 'eager' : 'lazy'} fetchPriority={idx === 0 ? 'high' : 'auto'} onError={e => { e.target.src = '/placeholder-product.svg' }} />
                  </div>
                </div>
              )) : !hasVideo ? (
                <div className="w-screen flex-shrink-0 snap-center"><div className="bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center" style={{ minHeight: '55vh' }}><div className="text-center text-gray-300"><div className="text-6xl mb-2">📦</div><p>No image</p></div></div></div>
              ) : null}
              {hasVideo && <div className="w-screen flex-shrink-0 snap-center"><div className="bg-black flex items-center justify-center" style={{ minHeight: '55vh' }}><video src={videoUrl} controls loop playsInline className="w-full h-full object-contain" style={{ maxHeight: '55vh' }} poster={images[0]} /></div></div>}
            </div>
          </div>

          {/* Floating Controls - large white circles like Blue Velvet */}
          <div className="absolute top-6 left-5 z-20">
            <button onClick={goBack} className="bg-white w-12 h-12 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.12)] flex items-center justify-center hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
          </div>
          <div className="absolute top-6 right-5 z-20 flex gap-2">
            <button onClick={handleShare} className="bg-white/80 backdrop-blur-md w-10 h-10 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.08)] flex items-center justify-center hover:scale-110 active:scale-95 transition-transform">
              <svg className="w-[17px] h-[17px] text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            </button>
            <button onClick={onToggleWishlist} disabled={wishBusy} className={`w-10 h-10 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.08)] flex items-center justify-center hover:scale-110 active:scale-95 transition-transform ${wishlisted ? 'bg-orange-500 text-white' : 'bg-white/80 backdrop-blur-md text-gray-700'}`}>
              <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            </button>
            <button onClick={() => navigate('/cart')} className="bg-white/80 backdrop-blur-md w-10 h-10 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.08)] flex items-center justify-center hover:scale-110 active:scale-95 transition-transform relative">
              <svg className="w-[17px] h-[17px] text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">{cartCount > 99 ? '99+' : cartCount}</span>}
            </button>
          </div>

          {/* Floating color swatches */}
          {variantColorOpts.length > 1 && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3 bg-white/60 backdrop-blur-md p-2 rounded-full shadow-xl">
              {variantColorOpts.map((opt, idx) => { const val = String(opt?.value || ''); return <button key={idx} onClick={() => onVariantClick('color', val, opt)} className={`w-7 h-7 rounded-full border-2 transition-all ${selectedVariants.color === val ? 'border-orange-500 scale-125' : 'border-white/80 hover:scale-110'}`} style={{ backgroundColor: opt?.swatch || '#e5e7eb' }} title={val} /> })}
            </div>
          )}

          {hasActiveSale && !isVideoSelected && <div className="absolute top-8 left-20 z-20 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">-{discountPercentage}%</div>}

          {/* Glassmorphism Thumbnails - INSIDE the hero image, scrollable */}
          {(images.length > 1 || hasVideo) && (
            <div className="absolute bottom-5 left-3 right-3 z-20 flex justify-center">
              <div className="flex gap-2 bg-white/40 backdrop-blur-xl px-3 py-2 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/50 overflow-x-auto scrollbar-hide max-w-full">
                {images.map((img, idx) => (
                  <button key={idx} onClick={() => scrollToImage(idx)} className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 transition-all bg-white/70 ${selectedImage === idx && !isVideoSelected ? 'ring-2 ring-orange-500 scale-110 shadow-md bg-white' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}>
                    <img src={img} alt="" className="w-full h-full object-contain p-0.5" onError={e => { e.target.src = '/placeholder-product.svg' }} />
                  </button>
                ))}
                {hasVideo && (
                  <button onClick={() => scrollToImage(images.length)} className={`w-12 h-12 rounded-xl bg-gray-900/80 grid place-items-center flex-shrink-0 transition-all ${isVideoSelected ? 'ring-2 ring-orange-500 scale-110 shadow-md' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}>
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Product Info */}
        <div className="px-4 pb-28">
          {product.category && <span className="inline-block px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-semibold tracking-wide uppercase mb-2">{product.category}</span>}
          <h1 className="text-xl font-bold text-gray-900 leading-snug mb-1.5 line-clamp-2">{product.name}</h1>
          <div className="flex items-center gap-2 mb-3">
            <StarRating rating={displayRating} />
            <span className="text-sm font-semibold text-gray-700">{displayRating.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({displayReviewCount})</span>
          </div>
          {product.description && <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-3">{product.description}</p>}

          <div className="mb-5"><VariantSelector excludeColor /></div>


          <div className="rounded-2xl p-4 flex items-start gap-3 bg-white shadow-sm mb-5">
            <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
            <div className="text-sm"><p className="font-semibold text-gray-800">Buyer Protection</p><p className="text-gray-500 text-xs mt-0.5">Full refund if item not received or not as described.</p></div>
          </div>

          <TabsContent />


          <RelatedSection />
        </div>

        {/* Mobile Bottom Bar - Glassmorphism */}
        <div className="fixed bottom-0 left-0 right-0 z-50" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)', touchAction: 'manipulation' }}>
          <div className="bg-white/80 backdrop-blur-xl mx-2 mb-2 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-white/60 px-2.5 py-2 flex items-center gap-1.5">
            {/* Qty selector */}
            <div className="flex items-center bg-gray-100/80 rounded-lg flex-shrink-0">
              <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ touchAction: 'manipulation' }} className="w-7 h-8 grid place-items-center text-gray-600 active:bg-gray-200 rounded-l-lg"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg></button>
              <span className="w-6 h-8 grid place-items-center font-bold text-xs text-gray-900">{quantity}</span>
              <button type="button" onClick={() => setQuantity(quantity + 1)} style={{ touchAction: 'manipulation' }} className="w-7 h-8 grid place-items-center text-gray-600 active:bg-gray-200 rounded-r-lg"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg></button>
            </div>
            {/* Price */}
            <div className="flex-shrink-0 min-w-0 truncate">
              <FormattedPrice amount={priceConverted} currency={dispCcy} size={12} className="text-gray-900 font-bold text-sm tabular-nums" />
              {origPriceConverted && <span className="text-gray-400 text-[9px] line-through ml-0.5"><FormattedPrice amount={origPriceConverted} currency={dispCcy} size={8} /></span>}
            </div>
            {/* Add to cart + WhatsApp */}
            <div className="flex-1 flex gap-1 justify-end min-w-0">
              <button type="button" onClick={handleAddToCart} style={{ touchAction: 'manipulation' }} className="flex-1 min-w-0 max-w-[130px] bg-gradient-to-r from-orange-500 to-orange-400 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-1 text-xs">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <span className="truncate">Add to cart</span>
              </button>
              {waUrl && <a href={waUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-green-500 text-white rounded-xl grid place-items-center shadow-lg flex-shrink-0"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d={waPath} /></svg></a>}
            </div>
          </div>
        </div>
      </div>

      {/* ===== DESKTOP ===== */}
      <div className="hidden lg:block">
        <Header onCartClick={() => setIsCartOpen(true)} />
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center gap-2 mb-6 text-sm text-gray-400">
            <Link to="/" className="hover:text-orange-500">Home</Link><span>/</span>
            <Link to="/catalog" className="hover:text-orange-500">Products</Link><span>/</span>
            {product.category && <><span className="capitalize">{product.category}</span><span>/</span></>}
            <span className="text-gray-600 truncate max-w-[200px]">{product.name}</span>
          </div>

          <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-row min-h-[700px]">
            {/* LEFT 60% */}
            <div className="w-[60%] relative bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8">
              <div className="absolute top-8 left-8 z-10"><button onClick={goBack} className="bg-white p-3.5 rounded-full shadow-lg hover:scale-110 transition-transform"><svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button></div>
              <div className="absolute top-8 right-8 z-10 flex gap-3">
                {isCustomer && <button onClick={onToggleWishlist} disabled={wishBusy} className={`p-3.5 rounded-full shadow-lg hover:scale-110 transition-transform ${wishlisted ? 'bg-orange-500 text-white' : 'bg-white text-gray-700'}`}><svg className="w-5 h-5" viewBox="0 0 24 24" fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg></button>}
              </div>
              {hasActiveSale && !isVideoSelected && <div className="absolute top-8 left-24 z-10 bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">-{discountPercentage}%</div>}

              <div className="relative z-0 group w-full h-full flex items-center justify-center">
                {isVideoSelected || (hasNoImages && hasVideo) ? <video src={videoUrl} controls loop playsInline className="max-w-full max-h-[580px] object-contain bg-black rounded-3xl" poster={images[0]} />
                : images.length > 0 ? <img src={images[selectedImage] || images[0]} alt={product.name} className="max-w-full max-h-[580px] object-contain drop-shadow-[0_35px_35px_rgba(0,0,0,0.12)] transition-transform duration-700 group-hover:scale-105" onError={e => { e.target.src = '/placeholder-product.svg' }} />
                : <div className="text-center text-gray-300"><div className="text-7xl mb-3">📦</div><p className="text-lg">No image</p></div>}
              </div>

              {variantColorOpts.length > 1 && (
                <div className="absolute right-8 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3 bg-white/60 backdrop-blur-md p-2.5 rounded-full shadow-xl">
                  {variantColorOpts.map((opt, idx) => { const val = String(opt?.value || ''); return <button key={idx} onClick={() => onVariantClick('color', val, opt)} className={`w-8 h-8 rounded-full border-2 transition-all ${selectedVariants.color === val ? 'border-orange-500 scale-125' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: opt?.swatch || '#e5e7eb' }} title={val} /> })}
                </div>
              )}

              {(images.length > 1 || hasVideo) && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-3 bg-white/70 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl">
                  {images.map((img, idx) => <button key={idx} onClick={() => setSelectedImage(idx)} className={`w-14 h-14 rounded-xl overflow-hidden transition-all ${selectedImage === idx && !isVideoSelected ? 'ring-2 ring-orange-500 scale-110' : 'opacity-60 hover:opacity-100'}`}><img src={img} alt="" className="w-full h-full object-contain" onError={e => { e.target.src = '/placeholder-product.svg' }} /></button>)}
                  {hasVideo && <button onClick={() => setSelectedImage(images.length)} className={`w-14 h-14 rounded-xl bg-gray-900 grid place-items-center transition-all ${isVideoSelected ? 'ring-2 ring-orange-500 scale-110' : 'opacity-60 hover:opacity-100'}`}><svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg></button>}
                </div>
              )}
            </div>

            {/* RIGHT 40% */}
            <div className="w-[40%] bg-white p-12 flex flex-col justify-center overflow-y-auto">
              {product.category && <span className="inline-block px-4 py-1.5 rounded-full bg-orange-50 text-orange-600 text-sm font-semibold uppercase mb-4 self-start">{product.category}</span>}
              <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">{product.name}</h1>
              <div className="flex items-end gap-4 mb-8">
                <FormattedPrice amount={priceConverted} currency={dispCcy} size={28} className="text-4xl font-bold text-gray-900" />
                {origPriceConverted && <span className="text-lg text-gray-400 line-through mb-1"><FormattedPrice amount={origPriceConverted} currency={dispCcy} size={14} /></span>}
                {hasActiveSale && <span className="text-sm font-bold text-red-500 mb-1">-{discountPercentage}%</span>}
              </div>
              {product.description && <p className="text-gray-500 leading-relaxed mb-8 text-base line-clamp-4">{product.description}</p>}

              <div className="mb-8"><VariantSelector /></div>

              <div className="flex items-center gap-4 mb-8">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quantity</label>
                <div className="flex items-center bg-gray-100 rounded-2xl">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-11 h-11 grid place-items-center text-gray-600 hover:bg-gray-200 rounded-l-2xl"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg></button>
                  <span className="w-12 h-11 grid place-items-center font-bold text-lg">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="w-11 h-11 grid place-items-center text-gray-600 hover:bg-gray-200 rounded-r-2xl"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
                </div>
                {(() => { const sq = Number(product.stockQty || 0); const lc = getLocalStockByCountry(product.stockByCountry, selectedCountry); const avail = sq > 0 ? sq : lc > 0 ? lc : 0; return avail > 0 ? <span className="text-xs text-gray-400">{avail} available</span> : null })()}
              </div>

              <div className="mt-auto flex gap-4">
                <div className="flex-1">
                  <button onClick={handleAddToCart} className="w-full bg-gradient-to-r from-orange-500 to-orange-400 text-white text-lg font-bold py-4 rounded-[20px] shadow-xl shadow-orange-200 hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    Add to Cart
                  </button>
                </div>
                {waUrl && <a href={waUrl} target="_blank" rel="noopener noreferrer" className="bg-green-500 hover:bg-green-600 p-4 rounded-[20px] text-white shadow-lg transition-all hover:scale-105"><svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d={waPath} /></svg></a>}
              </div>
            </div>
          </div>

          {/* Desktop below-card content */}
          <div className="max-w-4xl mx-auto mt-12 pb-16">
            <TabsContent />
            <RelatedSection cols="grid" />
          </div>
        </div>
      </div>

      <ShoppingCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* ===== ULTRA PREMIUM CART SUCCESS MODAL ===== */}
      {cartSuccessModal && (
        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCartSuccessModal(null)} style={{ animation: 'cartBdIn 0.3s ease both' }} />
          {/* Card */}
          <div className="relative bg-white w-full sm:max-w-sm rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden" style={{ animation: 'cartModalIn 0.55s cubic-bezier(0.16,1,0.3,1) both' }}>
            {/* Top gradient bar */}
            <div className="h-1.5 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400" />
            <div className="px-6 pt-8 pb-8 text-center">
              {/* Animated product image with ring */}
              <div className="flex justify-center mb-5">
                <div className="relative">
                  <div className="absolute inset-[-6px] rounded-full border-4 border-green-400 opacity-60" style={{ animation: 'ringPulse 2s ease-in-out infinite' }} />
                  <div className="absolute inset-[-12px] rounded-full border-2 border-green-300 opacity-30" style={{ animation: 'ringPulse 2s 0.4s ease-in-out infinite' }} />
                  <div className="w-28 h-28 rounded-full border-4 border-green-500 overflow-hidden bg-gray-50 shadow-xl shadow-green-200">
                    <img
                      src={(() => { const p = cartSuccessModal.image || ''; if (!p) return '/placeholder-product.svg'; if (String(p).startsWith('http')) return p; return mediaUrl(p) || '/placeholder-product.svg' })()} 
                      alt={cartSuccessModal.name}
                      className="w-full h-full object-cover"
                      onError={e => { e.target.src = '/placeholder-product.svg' }}
                    />
                  </div>
                  {/* Animated checkmark badge */}
                  <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-400/50" style={{ animation: 'checkPop 0.5s 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: 'drawCheck 0.45s 0.65s ease forwards' }} />
                    </svg>
                  </div>
                </div>
              </div>
              {/* Floating sparkles */}
              <div className="relative h-0 pointer-events-none overflow-visible">
                {[{ x: -70, y: -110, s: '✨', d: 0 }, { x: 70, y: -115, s: '⭐', d: 0.1 }, { x: -50, y: -130, s: '🎉', d: 0.2 }, { x: 55, y: -130, s: '✨', d: 0.15 }, { x: 0, y: -140, s: '⭐', d: 0.05 }].map((p, i) => (
                  <span key={i} className="absolute text-sm" style={{ left: p.x, top: p.y, animation: `sparklePop 0.6s ${p.d}s cubic-bezier(0.34,1.56,0.64,1) both` }}>{p.s}</span>
                ))}
              </div>
              {/* Text */}
              <p className="text-green-600 text-xs font-bold tracking-widest uppercase mb-1" style={{ animation: 'fadeSlideUp 0.4s 0.2s ease both' }}>Successfully Added!</p>
              <h3 className="font-bold text-gray-900 text-[17px] leading-snug line-clamp-2 mb-1" style={{ animation: 'fadeSlideUp 0.4s 0.3s ease both' }}>{cartSuccessModal.name}</h3>
              {cartSuccessModal.qty > 1 && <p className="text-gray-400 text-sm mb-4" style={{ animation: 'fadeSlideUp 0.4s 0.35s ease both' }}>Qty: {cartSuccessModal.qty}</p>}
              {/* Buttons */}
              <div className="flex gap-3 mt-5" style={{ animation: 'fadeSlideUp 0.4s 0.4s ease both' }}>
                <button type="button" onClick={() => setCartSuccessModal(null)} className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-700 font-bold text-sm hover:border-gray-300 hover:bg-gray-50 active:scale-95 transition-all">
                  CONTINUE SHOPPING
                </button>
                <button type="button" onClick={() => { setCartSuccessModal(null); navigate('/cart') }} className="flex-1 py-3.5 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/25 hover:bg-blue-700 active:scale-95 transition-all">
                  VIEW CART
                </button>
              </div>
            </div>
          </div>
          <style>{`
            @keyframes cartBdIn { from { opacity:0 } to { opacity:1 } }
            @keyframes cartModalIn { from { opacity:0; transform:translateY(60px) scale(0.92) } to { opacity:1; transform:translateY(0) scale(1) } }
            @keyframes ringPulse { 0%,100% { transform:scale(1); opacity:0.6 } 50% { transform:scale(1.15); opacity:0 } }
            @keyframes checkPop { from { opacity:0; transform:scale(0) rotate(-45deg) } to { opacity:1; transform:scale(1) rotate(0deg) } }
            @keyframes drawCheck { from { stroke-dashoffset:30 } to { stroke-dashoffset:0 } }
            @keyframes sparklePop { from { opacity:0; transform:scale(0) translateY(8px) } to { opacity:1; transform:scale(1) translateY(0) } }
            @keyframes fadeSlideUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
          `}</style>
        </div>
      )}
    </div>
  )
}

export default ProductDetail
