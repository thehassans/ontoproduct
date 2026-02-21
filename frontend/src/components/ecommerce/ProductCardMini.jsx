import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { mediaUrl } from '../../api.js'
import { getCurrencyConfig, convert as fxConvert, currencySymbol, formatMoney } from '../../util/currency'
import SarIcon from '../ui/SarIcon'
import { readWishlistIds, toggleWishlist } from '../../util/wishlist'
import { useToast } from '../../ui/Toast'
import { resolveWarehouse } from '../../utils/warehouse'
import { getProductRating, getStarArray } from '../../utils/autoReviews'
import { getCountryPrice } from '../../utils/countryPrice'

// Rotating info ticker — cycles rating / sold / free delivery with slide-down fade
const RotatingInfo = memo(function RotatingInfo({ productId, salesCount }) {
  const [idx, setIdx] = useState(0)
  const { rating, reviewCount } = getProductRating(productId)
  const stars = getStarArray(rating)

  useEffect(() => {
    const t = setInterval(() => setIdx(p => (p + 1) % 3), 3000)
    return () => clearInterval(t)
  }, [])

  const items = [
    <span key="r" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {stars.map((s, i) => (
        <svg key={i} width="10" height="10" viewBox="0 0 20 20" fill={s === 'empty' ? '#e5e7eb' : '#facc15'}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span style={{ fontSize: 10, fontWeight: 700, color: '#333', marginLeft: 2 }}>{rating.toFixed(1)}</span>
      <span style={{ fontSize: 9, color: '#999' }}>({reviewCount})</span>
    </span>,
    <span key="s" style={{ fontSize: 11, color: '#999' }}>{salesCount} sold</span>,
    <span key="d" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 18h14M5 18l1-6h12l1 6M7 12V8a5 5 0 0110 0v4"/></svg>
      Free Delivery
    </span>
  ]

  return (
    <div className="rotating-info-wrap">
      {items.map((it, i) => (
        <div key={i} className={`rotating-info-item${i === idx ? ' ri-active' : ' ri-hidden'}`}>{it}</div>
      ))}
    </div>
  )
})

// Taobao-style product card - compact with red prices and sales count
// Wrapped with memo for performance - prevents unnecessary re-renders
const ProductCardMini = memo(function ProductCardMini({ product, selectedCountry = 'SA', showVideo = false, showActions = false }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [ccyCfg, setCcyCfg] = useState(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [addingToCart, setAddingToCart] = useState(false)
  const videoRef = useRef(null)
  const isCustomer = useMemo(() => {
    try {
      const token = localStorage.getItem('token')
      if (!token || token === 'null') return false
      const me = JSON.parse(localStorage.getItem('me') || 'null')
      return !!me && me.role === 'customer'
    } catch {
      return false
    }
  }, [])
  const [wishlisted, setWishlisted] = useState(() => {
    try {
      return readWishlistIds().includes(String(product?._id || ''))
    } catch {
      return false
    }
  })
  const [wishBusy, setWishBusy] = useState(false)
  
  useEffect(() => {
    let alive = true
    getCurrencyConfig().then(cfg => { if (alive) setCcyCfg(cfg) }).catch(() => {})
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const update = () => {
      try {
        setWishlisted(readWishlistIds().includes(String(product?._id || '')))
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
  }, [product?._id])

  const COUNTRY_TO_CURRENCY = {
    'AE': 'AED', 'OM': 'OMR', 'SA': 'SAR', 'BH': 'BHD', 'IN': 'INR', 'KW': 'KWD', 'QA': 'QAR',
    'PK': 'PKR', 'JO': 'JOD', 'US': 'USD', 'GB': 'GBP', 'CA': 'CAD', 'AU': 'AUD',
  }

  const getDisplayCurrency = () => COUNTRY_TO_CURRENCY[selectedCountry] || 'SAR'
  const convertPrice = (value, fromCurrency, toCurrency) => fxConvert(value, fromCurrency || 'SAR', toCurrency || getDisplayCurrency(), ccyCfg)

  const formatPrice = (price, currency = 'SAR') => {
    return formatMoney(Number(price || 0), currency)
  }

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null
    if (typeof imagePath !== 'string') return null
    const u = String(imagePath).replace(/\\/g, '/').trim()
    if (!u) return null
    if (u.startsWith('/') && !u.startsWith('/uploads/') && !u.startsWith('/api/uploads/')) return u
    const out = mediaUrl(u)
    return out || null
  }

  const orderedMedia = useMemo(() => {
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

    const out = imgs
      .filter(Boolean)
      .map((u, idx) => ({ type: 'image', url: String(u), position: idx }))

    const v = product?.video || product?.videoUrl || (Array.isArray(product?.videos) ? product.videos[0] : '')
    if (v) out.push({ type: 'video', url: String(v), position: out.length })
    return out
  }, [product])

  const primaryImagePath = useMemo(() => {
    const firstImage = orderedMedia.find((m) => String(m.type) === 'image')
    if (firstImage?.url) return firstImage.url
    const firstAny = orderedMedia[0]
    return firstAny?.url || (product?.images?.[0] || product?.imagePath || '')
  }, [orderedMedia, product])

  // Get the image URL, fallback to imagePath, then to null
  const imageUrl = getImageUrl(primaryImagePath)

  // Country-specific pricing
  const countryPricing = getCountryPrice(product, selectedCountry, convertPrice)
  const basePrice = countryPricing.price
  const salePriceVal = countryPricing.salePrice
  const hasActiveSale = salePriceVal > 0 && salePriceVal < basePrice
  const finalPrice = hasActiveSale ? salePriceVal : basePrice
  const displayCurrency = countryPricing.isCountrySpecific ? countryPricing.currency : getDisplayCurrency()
  const convertedPrice = countryPricing.isCountrySpecific ? finalPrice : convertPrice(finalPrice, product.baseCurrency || 'SAR', displayCurrency)
  const showDiscount = hasActiveSale && basePrice > finalPrice

  const primaryVideoPath = useMemo(() => {
    const firstVideo = orderedMedia.find((m) => String(m.type) === 'video')
    return firstVideo?.url || (product?.video || product?.videoUrl || (Array.isArray(product?.videos) ? product.videos[0] : ''))
  }, [orderedMedia, product])

  const hasVideo = !!primaryVideoPath
  const videoUrl = hasVideo ? getImageUrl(primaryVideoPath) : null
  const hasNoImages = !imageUrl

  // Handle video play/pause
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying && hasVideo) {
        videoRef.current.play().catch(() => {})
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying, hasVideo])

  // Stop video when mouse leaves
  useEffect(() => {
    if (!isHovered && isPlaying) {
      setIsPlaying(false)
      if (videoRef.current) {
        videoRef.current.currentTime = 0
      }
    }
  }, [isHovered])
  
  // Cleanup: stop video on unmount (prevents audio continuing after navigation)
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.currentTime = 0
      }
    }
  }, [])
  
  // Handle play button click
  const handlePlayClick = (e) => {
    e.stopPropagation()
    setIsPlaying(prev => !prev)
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

  const waNumber = sanitizeWhatsAppNumber(product?.whatsappNumber)
  const waImage = toAbsoluteUrl(imageUrl || '')
  const waProductUrl = (() => {
    try { return `${window.location.origin}/product/${product?._id}` } catch { return '' }
  })()
  const waText = (() => {
    try {
      return encodeURIComponent(`Product: ${product?.name || ''}\nImage: ${waImage || ''}\nLink: ${waProductUrl || ''}`)
    } catch {
      return ''
    }
  })()
  const waUrl = waNumber ? `https://wa.me/${waNumber}?text=${waText}` : ''

  const handleAddToCart = useCallback((e) => {
    e.stopPropagation()
    if (addingToCart) return
    setAddingToCart(true)

    try {
      const savedCart = localStorage.getItem('shopping_cart')
      let cartItems = []
      if (savedCart) cartItems = JSON.parse(savedCart)

      // Use country-specific price when available
      const cp = getCountryPrice(product, selectedCountry, convertPrice)
      const unitPrice = (cp.salePrice > 0 && cp.salePrice < cp.price) ? cp.salePrice : cp.price
      const cartCcy = cp.isCountrySpecific ? cp.currency : (product.baseCurrency || 'SAR')
      const addQty = 1
      const max = Number(product?.stockQty || 0)

      const wh = resolveWarehouse(product, selectedCountry, addQty)

      const existingItemIndex = cartItems.findIndex(item => item.id === product._id)
      if (existingItemIndex >= 0) {
        const current = Number(cartItems[existingItemIndex].quantity || 0)
        const candidate = current + addQty
        if (max > 0 && candidate > max) cartItems[existingItemIndex].quantity = max
        else cartItems[existingItemIndex].quantity = candidate

        const wh2 = resolveWarehouse(product, selectedCountry, cartItems[existingItemIndex].quantity)
        cartItems[existingItemIndex].price = unitPrice
        cartItems[existingItemIndex].currency = cartCcy
        cartItems[existingItemIndex].warehouseType = wh2.type
        cartItems[existingItemIndex].etaMinDays = wh2.etaMinDays
        cartItems[existingItemIndex].etaMaxDays = wh2.etaMaxDays
        cartItems[existingItemIndex].warehouseCountry = selectedCountry
        cartItems[existingItemIndex].productId = product._id
      } else {
        cartItems.push({
          id: product._id,
          productId: product._id,
          name: product.name,
          price: unitPrice,
          currency: cartCcy,
          image: (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : (product.imagePath || '')),
          quantity: addQty,
          maxStock: product.stockQty,
          variants: {},
          stockByCountry: product.stockByCountry || {},
          warehouseType: wh.type,
          etaMinDays: wh.etaMinDays,
          etaMaxDays: wh.etaMaxDays,
          warehouseCountry: selectedCountry
        })
      }

      localStorage.setItem('shopping_cart', JSON.stringify(cartItems))
      try { localStorage.setItem('last_added_product', String(product._id)) } catch {}
      window.dispatchEvent(new CustomEvent('cartUpdated'))
      toast.success('Added to Cart')
    } catch (err) {
      console.error('Error adding to cart:', err)
      toast.error('Failed to add item to cart')
    } finally {
      setTimeout(() => setAddingToCart(false), 250)
    }
  }, [addingToCart, product, selectedCountry, toast])
  
  // Handle card click - always navigate to product page
  const handleCardClick = () => {
    navigate(`/product/${product._id}`)
  }

  const onToggleWishlist = async (e) => {
    e.stopPropagation()
    if (wishBusy) return
    setWishBusy(true)
    try {
      const ids = await toggleWishlist(product._id)
      setWishlisted(Array.isArray(ids) ? ids.includes(String(product._id)) : !wishlisted)
    } finally {
      setWishBusy(false)
    }
  }

  // Generate a pseudo-random sales count based on product ID for consistency
  const salesCount = useMemo(() => {
    if (product.salesCount) return product.salesCount
    // Generate consistent number from product ID
    let hash = 0
    const id = product._id || ''
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i)
      hash = hash & hash
    }
    return Math.abs(hash % 900) + 100 // 100-999 range
  }, [product._id, product.salesCount])

  // Calculate discount percentage
  const discountPercent = useMemo(() => {
    if (!hasActiveSale || basePrice <= 0) return 0
    return Math.round(((basePrice - finalPrice) / basePrice) * 100)
  }, [hasActiveSale, basePrice, finalPrice])

  return (
    <div 
      className="product-card-taobao"
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="image-container">
        {isCustomer && (
          <button
            className={`wishlist-btn ${wishlisted ? 'active' : ''}`}
            onClick={onToggleWishlist}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <svg viewBox="0 0 24 24" fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        )}
        {/* Video element - only render when playing to prevent preloading many videos */}
        {showVideo && hasVideo && videoUrl && isPlaying && (
          <video
            ref={videoRef}
            src={videoUrl}
            loop
            muted
            playsInline
            preload="none"
            poster={imageUrl || undefined}
            className={`video-player ${isPlaying ? 'visible' : ''}`}
          />
        )}
        
        {/* Image */}
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={product.name}
            loading="lazy"
            className={showVideo && isPlaying && hasVideo ? 'hidden' : ''}
            onError={(e) => {
              e.target.onerror = null
              e.target.src = '/placeholder-product.svg'
            }}
          />
        ) : (
          <div className="no-image-placeholder">
            <div className="placeholder-icon">📦</div>
          </div>
        )}
        
        {/* Play/Pause buttons when showVideo is true */}
        {showVideo && hasVideo && !isPlaying && (
          <button 
            className="video-play-btn"
            onClick={handlePlayClick}
            aria-label="Play video"
          >
            <svg viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        )}
        {showVideo && hasVideo && isPlaying && (
          <button 
            className="video-pause-btn"
            onClick={handlePlayClick}
            aria-label="Pause video"
          >
            <svg viewBox="0 0 24 24" fill="white">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          </button>
        )}

        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="discount-badge">
            <span>-{discountPercent}%</span>
          </div>
        )}

        {/* Video indicator */}
        {hasVideo && !showVideo && (
          <div className="video-indicator">
            <svg viewBox="0 0 24 24" fill="white" width="14" height="14">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        
        <div className="price-section">
          <div className="price-row">
            <span className="currency-symbol">{displayCurrency === 'SAR' ? <SarIcon size={13} /> : currencySymbol(displayCurrency)}</span>
            <span className="price-main">{convertedPrice.toFixed(2).split('.')[0]}</span>
            <span className="price-decimal">.{convertedPrice.toFixed(2).split('.')[1]}</span>
            {showDiscount && (
              <span className="original-price">
                {(countryPricing.isCountrySpecific ? basePrice : convertPrice(basePrice, product.baseCurrency || 'SAR', displayCurrency)).toFixed(0)}
              </span>
            )}
          </div>
          <RotatingInfo productId={product._id} salesCount={salesCount} />
        </div>

        {showActions ? (
          <div className="actions-row">
            <button
              type="button"
              className={`mini-add-btn ${addingToCart ? 'adding' : ''}`}
              onClick={handleAddToCart}
              disabled={addingToCart}
            >
              {addingToCart ? 'Adding…' : 'Add'}
            </button>
            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mini-wa-btn"
                onClick={(e) => e.stopPropagation()}
                aria-label="Chat on WhatsApp"
                title="WhatsApp"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .product-card-taobao {
          background: white;
          border-radius: 0;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s ease;
          margin: 2px;
        }

        .product-card-taobao:active {
          transform: scale(0.98);
        }

        .image-container {
          position: relative;
          aspect-ratio: 1;
          background: #f5f5f5;
          overflow: hidden;
        }

        .wishlist-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(6px);
          display: grid;
          place-items: center;
          z-index: 20;
          color: #ea580c;
          cursor: pointer;
          transition: transform 0.15s ease, background 0.15s ease;
        }

        .wishlist-btn:hover {
          transform: translateY(-1px);
          background: rgba(255,247,237,0.98);
        }

        .wishlist-btn svg {
          width: 18px;
          height: 18px;
        }

        .wishlist-btn.active {
          background: rgba(255,237,213,0.98);
          border-color: rgba(234,88,12,0.18);
        }

        .image-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }

        .image-container img.hidden {
          opacity: 0;
        }

        .video-player {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 1;
        }

        .video-player.visible {
          opacity: 1;
        }

        .video-play-btn,
        .video-pause-btn {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          background: rgba(0,0,0,0.5);
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
        }

        .video-play-btn svg,
        .video-pause-btn svg {
          width: 18px;
          height: 18px;
          margin-left: 2px;
        }

        .discount-badge {
          position: absolute;
          top: 0;
          left: 0;
          background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
          color: white;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 0 0 8px 0;
        }

        .video-indicator {
          position: absolute;
          bottom: 6px;
          right: 6px;
          width: 22px;
          height: 22px;
          background: rgba(0,0,0,0.5);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .video-indicator svg {
          margin-left: 1px;
        }

        .no-image-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
        }

        .placeholder-icon {
          font-size: 40px;
          opacity: 0.3;
        }

        .product-info {
          padding: 8px 10px 10px;
        }

        .actions-row {
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mini-add-btn {
          flex: 1;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: #ea580c;
          color: white;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .mini-add-btn.adding {
          background: #10b981;
        }

        .mini-add-btn:disabled {
          opacity: 0.8;
          cursor: not-allowed;
        }

        .mini-wa-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #22c55e;
          color: white;
          text-decoration: none;
          flex: 0 0 auto;
        }

        .mini-wa-btn svg {
          width: 18px;
          height: 18px;
        }

        .mini-wa-btn.disabled {
          background: #e5e7eb;
        }

        .product-name {
          font-size: 13px;
          font-weight: 400;
          color: #333;
          margin: 0 0 4px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.4;
        }

        .rotating-info-wrap {
          height: 18px;
          overflow: hidden;
          position: relative;
        }

        .rotating-info-item {
          height: 18px;
          display: flex;
          align-items: center;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          opacity: 0;
          transform: translateY(-8px);
          transition: opacity 0.7s ease, transform 0.7s ease;
          pointer-events: none;
        }

        .rotating-info-item.ri-active {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .rotating-info-item.ri-hidden {
          opacity: 0;
          transform: translateY(8px);
        }

        .price-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .price-row {
          display: flex;
          align-items: center;
          gap: 2px;
          flex-wrap: wrap;
        }

        .currency-symbol {
          display: inline-flex;
          align-items: center;
          line-height: 1;
          font-size: 24px;
          font-weight: 600;
          color: #ff4d4f;
        }

        .price-main {
          font-size: 18px;
          font-weight: 700;
          color: #ff4d4f;
          line-height: 1;
        }

        .price-decimal {
          font-size: 12px;
          font-weight: 600;
          color: #ff4d4f;
        }

        .original-price {
          font-size: 11px;
          color: #999;
          text-decoration: line-through;
          margin-left: 6px;
        }

        /* Responsive adjustments */
        @media (max-width: 480px) {
          .product-card-taobao {
            margin: 2px;
          }
          
          .product-info {
            padding: 6px 8px 8px;
          }
          
          .product-name {
            font-size: 12px;
          }
          
          .price-main {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  )
})

export default ProductCardMini
