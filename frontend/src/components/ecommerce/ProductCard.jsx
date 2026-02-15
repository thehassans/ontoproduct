import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../ui/Toast'
import { trackProductView, trackAddToCart } from '../../utils/analytics'
import { mediaUrl } from '../../api.js'
import { getCurrencyConfig, convert as fxConvert, formatMoney } from '../../util/currency'
import { resolveWarehouse } from '../../utils/warehouse'

export default function ProductCard({ product, onAddToCart, selectedCountry = 'SA', selectionEnabled = false, selected = false, onToggleSelect }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [isHovered, setIsHovered] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [addingToCart, setAddingToCart] = useState(false)

  const [ccyCfg, setCcyCfg] = useState(null)
  useEffect(()=>{ let alive=true; getCurrencyConfig().then(cfg=>{ if(alive) setCcyCfg(cfg) }).catch(()=>{}); return ()=>{alive=false} },[])

  const COUNTRY_TO_CURRENCY = {
    'AE': 'AED', 'OM': 'OMR', 'SA': 'SAR', 'BH': 'BHD', 'IN': 'INR', 'KW': 'KWD', 'QA': 'QAR',
    'PK': 'PKR', 'JO': 'JOD', 'US': 'USD', 'GB': 'GBP', 'CA': 'CAD', 'AU': 'AUD',
  }

  const convertPrice = (value, fromCurrency, toCurrency) => fxConvert(value, fromCurrency||'SAR', toCurrency||getDisplayCurrency(), ccyCfg)
  const getDisplayCurrency = () => COUNTRY_TO_CURRENCY[selectedCountry] || 'SAR'
  const getConvertedPrice = (price) => convertPrice(price, product.baseCurrency || 'SAR', getDisplayCurrency())

  const handleProductClick = () => {
    if (selectionEnabled) {
      try { onToggleSelect && onToggleSelect() } catch {}
      return
    }
    trackProductView(product._id, product.name, product.category, product.price)
    navigate(`/product/${product._id}`)
  }

  const formatPrice = (price, currency = 'SAR') => {
    return formatMoney(Number(price||0), currency)
  }

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '/placeholder-product.svg'
    if (typeof imagePath !== 'string') return '/placeholder-product.svg'
    const u = String(imagePath).replace(/\\/g,'/').trim()
    if (!u) return '/placeholder-product.svg'
    if (u.startsWith('/') && !u.startsWith('/uploads/') && !u.startsWith('/api/uploads/')) return u
    return mediaUrl(u) || '/placeholder-product.svg'
  }

  const handleAddToCart = (e) => {
    e.stopPropagation()

    // 1. Strict Auth Check Removed - Allowing Guest Cart
    // const token = localStorage.getItem('token')
    // if (!token) {
    //   toast.info('Please log in to shop')
    //   // Save intent (optional, but good UX)
    //   try {
    //     sessionStorage.setItem('pending_cart_product', product._id)
    //   } catch {}
    //   navigate('/customer/login')
    //   return
    // }

    setAddingToCart(true)
    
    // Instant cart update for responsiveness
    try {
        const basePrice = Number(product?.price) || 0
        const salePriceVal = Number(product?.salePrice) || 0
        const hasSale = salePriceVal > 0 && salePriceVal < basePrice
        const discounted = Number(product?.discount) > 0 ? basePrice * (1 - Number(product.discount) / 100) : basePrice
        const unitPrice = hasSale ? salePriceVal : discounted
        const addQty = 1
        const savedCart = localStorage.getItem('shopping_cart')
        let cartItems = savedCart ? JSON.parse(savedCart) : []

        const existingItemIndex = cartItems.findIndex(item => item.id === product._id)
        const max = Number(product.stockQty || 0)
        
        if (existingItemIndex > -1) {
          const current = Number(cartItems[existingItemIndex].quantity || 0)
          const candidate = current + addQty
          if (max > 0 && candidate > max) {
            cartItems[existingItemIndex].quantity = max
            toast.info(`Only ${max} in stock`)
          } else {
            cartItems[existingItemIndex].quantity = candidate
          }
          const wh = resolveWarehouse(product, selectedCountry, cartItems[existingItemIndex].quantity)
          cartItems[existingItemIndex].price = unitPrice
          cartItems[existingItemIndex].currency = product.baseCurrency || 'SAR'
          cartItems[existingItemIndex].maxStock = product.stockQty
          cartItems[existingItemIndex].stockByCountry = product.stockByCountry || cartItems[existingItemIndex].stockByCountry || {}
          cartItems[existingItemIndex].warehouseType = wh.type
          cartItems[existingItemIndex].etaMinDays = wh.etaMinDays
          cartItems[existingItemIndex].etaMaxDays = wh.etaMaxDays
          cartItems[existingItemIndex].warehouseCountry = selectedCountry
        } else {
          const wh = resolveWarehouse(product, selectedCountry, addQty)
          cartItems.push({
            id: product._id,
            name: product.name,
            price: unitPrice,
            currency: product.baseCurrency || 'SAR',
            image: product.images?.[0] || '',
            quantity: addQty,
            maxStock: product.stockQty,
            stockByCountry: product.stockByCountry || {},
            warehouseType: wh.type,
            etaMinDays: wh.etaMinDays,
            etaMaxDays: wh.etaMaxDays,
            warehouseCountry: selectedCountry,
          })
        }
        
        localStorage.setItem('shopping_cart', JSON.stringify(cartItems))
        try { localStorage.setItem('last_added_product', String(product._id)) } catch {}
        trackAddToCart(product._id, product.name, unitPrice, addQty)
        window.dispatchEvent(new CustomEvent('cartUpdated'))
        
        // Premium Success Feedback
        createPremiumRipple(e) // Visual effect
        toast.success('Added to Cart!')
        
        if (typeof onAddToCart === 'function') {
          try { onAddToCart(product) } catch {}
        }
      } catch (error) {
        console.error('Error adding to cart:', error)
      }
      setTimeout(() => setAddingToCart(false), 300)
  }

  // Helper for generic particle effect (embedded here for portability)
  const createPremiumRipple = (event) => {
    const btn = event?.currentTarget
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const circle = document.createElement('span')
    const diameter = Math.max(rect.width, rect.height)
    const radius = diameter / 2
    
    // Position relative to click
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    circle.style.width = circle.style.height = `${diameter}px`
    circle.style.left = `${x - radius}px`
    circle.style.top = `${y - radius}px`
    circle.classList.add('premium-ripple')
    
    const existing = btn.getElementsByClassName('premium-ripple')[0]
    if (existing) existing.remove()
    
    btn.appendChild(circle)
  }

  const images = Array.isArray(product?.images) && product.images.length > 0
    ? product.images
    : (product?.imagePath ? [product.imagePath] : [])
  const mainImagePath = images[0] || ''
  const hoverImagePath = images[1] || images[0] || ''
  const hasDiscount = (product.discount || 0) > 0
  const isOutOfStock = !product.inStock || product.stockQty === 0
  
  // Sale price logic: show sale price if salePrice exists and is less than price
  const hasSalePrice = product.salePrice != null && Number(product.salePrice) > 0 && Number(product.salePrice) < Number(product.price)
  const displayPrice = hasSalePrice ? Number(product.salePrice) : (hasDiscount ? product.price * (1 - product.discount / 100) : Number(product.price))
  const originalPrice = (hasSalePrice || hasDiscount) ? Number(product.price) : null
  const discountPercent = originalPrice ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : 0

  return (
    <>
      <div 
        className="product-card-ultra"
        onClick={handleProductClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-selected={selected}
      >
        {/* Image Container */}
        <div className="product-image-container">
          {/* Skeleton loader */}
          {!imageLoaded && (
            <div className="product-skeleton">
              <div className="skeleton-shimmer"></div>
            </div>
          )}
          
          {/* Main Image */}
          <img
            src={getImageUrl(mainImagePath)}
            alt={product.name}
            className={`product-image-main ${imageLoaded ? 'loaded' : ''}`}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => { e.target.src = '/placeholder-product.svg'; setImageLoaded(true) }}
          />
          
          {/* Hover Image */}
          {hoverImagePath && hoverImagePath !== mainImagePath && (
            <img
              src={getImageUrl(hoverImagePath)}
              alt={`${product.name} alt`}
              className="product-image-hover"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          )}

          {/* Discount Badge */}
          {hasDiscount && (
            <div className="discount-badge">
              <span className="discount-value">-{product.discount}%</span>
            </div>
          )}

          {/* Premium E-commerce Badges */}
          <div className="premium-badges-stack">
            {product.salePrice > 0 && Number(product.salePrice) < Number(product.price) && (
              <div className="premium-badge sale-badge">
                <span className="badge-text">
                  {Math.round(((Number(product.price) - Number(product.salePrice)) / Number(product.price)) * 100)}% OFF
                </span>
              </div>
            )}
            {product.sellByBuysial && (
              <div className="premium-badge buysial-badge">
                <span className="badge-text">🏪 Sell by Buysial</span>
              </div>
            )}
            {product.isBestSelling && (
              <div className="premium-badge bestseller-badge">
                <span className="badge-text">🔥 Best Seller</span>
              </div>
            )}
            {product.isFeatured && (
              <div className="premium-badge featured-badge">
                <span className="badge-text">⭐ Featured</span>
              </div>
            )}
            {product.isLimitedStock && (
              <div className="premium-badge limited-badge">
                <span className="badge-text">⏰ Limited</span>
              </div>
            )}
          </div>

          {/* Selection Checkbox */}
          {selectionEnabled && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSelect && onToggleSelect() }}
              className={`selection-checkbox ${selected ? 'selected' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}

          {/* Image Count Indicator */}
          {images.length > 1 && (
            <div className="image-count">
              <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                <path d="M4 4h16v16H4V4zm2 2v12h12V6H6z"/>
              </svg>
              <span>{images.length}</span>
            </div>
          )}

          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="out-of-stock-overlay">
              <span>Out of Stock</span>
            </div>
          )}

          {/* Quick Add Button - Shows on hover (desktop) */}
          {!isOutOfStock && (
            <button 
              className={`quick-add-btn ${addingToCart ? 'adding' : ''}`}
              onClick={handleAddToCart}
              disabled={addingToCart}
            >
              {addingToCart ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Product Info - Minimal */}
        <div className="product-info">
          {/* Product Name - Simple */}
          <h3 className="product-name-minimal">{product.name}</h3>

          {/* Price Section - Minimal */}
          <div className="price-section-minimal">
            <span className="price-minimal">
              {formatPrice(getConvertedPrice(displayPrice), getDisplayCurrency())}
            </span>
            {originalPrice && (
              <span className="price-original-minimal">
                {formatPrice(getConvertedPrice(originalPrice), getDisplayCurrency())}
              </span>
            )}
          </div>

          {/* Mobile Add to Cart */}
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock || addingToCart}
            className={`add-to-cart-btn ${addingToCart ? 'adding' : ''}`}
          >
            {addingToCart ? (
              <div className="spinner-small"></div>
            ) : isOutOfStock ? (
              'Sold Out'
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Add to Cart
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .product-card-ultra {
          position: relative;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        
        .product-card-ultra:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.12);
        }
        
        .product-card-ultra[data-selected="true"] {
          box-shadow: 0 0 0 3px #f97316;
        }

        /* Image Container */
        .product-image-container {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }

        .product-skeleton {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          overflow: hidden;
        }

        .skeleton-shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .product-image-main {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          opacity: 0;
        }

        .product-image-main.loaded {
          opacity: 1;
        }

        .product-card-ultra:hover .product-image-main {
          transform: scale(1.08);
        }

        .product-image-hover {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 0.4s ease;
        }

        .product-card-ultra:hover .product-image-hover {
          opacity: 1;
        }

        /* Discount Badge */
        .discount-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(239,68,68,0.4);
          animation: pulse-badge 2s infinite;
        }

        @keyframes pulse-badge {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        /* Selection Checkbox */
        .selection-checkbox {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 2px solid #d1d5db;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .selection-checkbox svg {
          width: 16px;
          height: 16px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .selection-checkbox.selected {
          background: #f97316;
          border-color: #f97316;
        }

        .selection-checkbox.selected svg {
          opacity: 1;
          color: white;
        }

        /* Image Count */
        .image-count {
          position: absolute;
          bottom: 12px;
          right: 12px;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* Out of Stock Overlay */
        .out-of-stock-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .out-of-stock-overlay span {
          background: white;
          color: #1f2937;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
        }

        /* Quick Add Button (Desktop Hover) */
        .quick-add-btn {
          position: absolute;
          bottom: 12px;
          left: 12px;
          right: 12px;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(8px);
          color: white;
          padding: 12px;
          border-radius: 12px;
          border: none;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .quick-add-btn {
          display: none;
        }

        .quick-add-btn svg {
          width: 18px;
          height: 18px;
        }

        @media (min-width: 768px) {
          .quick-add-btn {
            display: flex;
          }
          
          .product-card-ultra:hover .quick-add-btn {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .quick-add-btn:hover {
          background: #f97316;
        }

        .quick-add-btn.adding {
          background: #f97316;
        }

        /* Product Info */
        .product-info {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        .product-name-minimal {
          font-size: 13px;
          font-weight: 400;
          color: #374151;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin: 0;
        }

        /* Price Section - Minimal Design */
        .price-section-minimal {
          display: flex;
          align-items: baseline;
          gap: 6px;
          margin-top: 4px;
        }

        .price-minimal {
          font-size: 14px;
          font-weight: 500;
          color: #111827;
        }

        .price-original-minimal {
          font-size: 11px;
          color: #9ca3af;
          text-decoration: line-through;
        }

        .in-stock, .out-stock {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .in-stock {
          color: #10b981;
        }

        .out-stock {
          color: #ef4444;
        }

        .stock-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          animation: pulse-dot 2s infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Add to Cart Button (Mobile) */
        .add-to-cart-btn {
          margin-top: auto;
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(249,115,22,0.3);
        }

        .add-to-cart-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(249,115,22,0.4);
        }

        .add-to-cart-btn:active:not(:disabled) {
          transform: scale(0.98);
        }

        .add-to-cart-btn:disabled {
          background: #d1d5db;
          box-shadow: none;
          cursor: not-allowed;
        }

        .add-to-cart-btn svg {
          width: 18px;
          height: 18px;
        }

        .add-to-cart-btn.adding {
          background: #10b981;
          box-shadow: 0 4px 12px rgba(16,185,129,0.3);
        }

        /* Spinners */
        .spinner, .spinner-small {
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          animation: spin 0.8s linear infinite;
        }

        .spinner {
          width: 20px;
          height: 20px;
        }

        .spinner-small {
          width: 18px;
          height: 18px;
        }

        /* Spinner */
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Premium Ripple Animation */
        .premium-ripple {
          position: absolute;
          border-radius: 50%;
          transform: scale(0);
          animation: ripple 0.6s linear;
          background-color: rgba(255, 255, 255, 0.7);
          pointer-events: none;
        }

        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }

        /* Desktop style */
        @media (min-width: 768px) {
          .product-card-ultra {
            border-radius: 20px;
          }

          .product-info {
            padding: 20px;
            gap: 10px;
          }

          .product-name {
            font-size: 16px;
          }

          .price-current {
            font-size: 22px;
          }

          .add-to-cart-btn {
            padding: 12px 16px;
            font-size: 13px;
          }

          .quick-add-btn {
            display: flex;
          }
        }

        /* Small mobile */
        @media (max-width: 380px) {
          .product-info {
            padding: 12px;
          }

          .product-name {
            font-size: 13px;
          }

          .price-current {
            font-size: 16px;
          }

          .add-to-cart-btn {
            padding: 12px;
            font-size: 13px;
          }
        }

        /* Premium E-commerce Badges */
        .premium-badges-stack {
          position: absolute;
          top: 48px;
          left: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          z-index: 3;
          max-width: calc(100% - 16px);
        }

        .premium-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          backdrop-filter: blur(8px);
          animation: slideInLeft 0.4s ease-out;
          width: fit-content;
          max-width: 100%;
        }

        .badge-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sale-badge {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        .buysial-badge {
          background: linear-gradient(135deg, #f97316, #ea580c);
          color: white;
        }

        .bestseller-badge {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
        }

        .featured-badge {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
        }

        .limited-badge {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* Mobile adjustments for badges */
        @media (max-width: 768px) {
          .premium-badges-stack {
            top: 40px;
            left: 6px;
            gap: 4px;
          }

          .premium-badge {
            padding: 3px 8px;
            font-size: 9px;
          }
        }

        @media (max-width: 380px) {
          .premium-badge {
            font-size: 8px;
            padding: 2px 6px;
          }
        }
      `}</style>
    </>
  )
}