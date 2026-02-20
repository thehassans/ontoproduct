import React, { useEffect, useState, useRef, memo, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../../api'
import ProductCardMini from './ProductCardMini'

// Simple in-memory cache for API responses
const apiCache = new Map()
const CACHE_TTL = 60000 // 1 minute cache

const cachedApiGet = async (endpoint) => {
  const cached = apiCache.get(endpoint)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  const data = await apiGet(endpoint)
  apiCache.set(endpoint, { data, timestamp: Date.now() })
  return data
}

export default memo(function HorizontalProductSection({ 
  title, 
  filter, // 'trending', 'superDeals', 'topSelling'
  apiEndpoint, // custom endpoint if needed
  bgGradient = 'from-orange-400 to-orange-500',
  selectedCountry,
  limit = 10,
  showVideo = false,
  autoScroll = true, // Enable auto-scrolling by default
  autoScrollSpeed = 1,
  centerHeader = false,
  showTitleIcon = true,
  headerVariant = 'bar',
  pillSize = 'md'
}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const sectionRef = useRef(null)
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const canScrollLeftRef = useRef(false)
  const canScrollRightRef = useRef(true)
  const scrollCheckRafRef = useRef(0)
  const loopEnabledRef = useRef(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [isPageVisible, setIsPageVisible] = useState(true)

  const prefersReducedMotion = useMemo(() => {
    try {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
      return window.matchMedia('(prefers-reduced-motion: reduce)')?.matches
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const qs = new URLSearchParams()
        qs.set('page', '1')
        qs.set('limit', String(limit))
        if (filter) qs.set('filter', filter)
        if (!apiEndpoint && selectedCountry) qs.set('country', String(selectedCountry))
        
        const endpoint = apiEndpoint || `/api/products/public?${qs.toString()}`
        const res = await cachedApiGet(endpoint)
        let list = Array.isArray(res?.products) ? res.products : []
        
        // Filter for video products if showVideo is true
        if (showVideo) {
          list = list.filter(p => p.video || p.videoUrl || p.videos?.length > 0)
        }
        
        // Remix products so same category not back to back
        if (list.length > 2) {
          const remixed = []
          const byCategory = {}
          list.forEach(p => {
            const cat = p.category || 'Other'
            if (!byCategory[cat]) byCategory[cat] = []
            byCategory[cat].push(p)
          })
          const categories = Object.keys(byCategory)
          let catIndex = 0
          while (remixed.length < list.length) {
            const cat = categories[catIndex % categories.length]
            if (byCategory[cat].length > 0) {
              remixed.push(byCategory[cat].shift())
            }
            catIndex++
            // Prevent infinite loop if one category is empty
            if (categories.every(c => byCategory[c].length === 0)) break
          }
          list = remixed
        }
        
        if (alive) setProducts(list)
      } catch {
        if (alive) setProducts([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [filter, limit, apiEndpoint, showVideo, selectedCountry])

  const loopEnabled = useMemo(() => {
    return Boolean(autoScroll) && !loading && products.length > 4
  }, [autoScroll, loading, products.length])

  useEffect(() => {
    loopEnabledRef.current = loopEnabled
    if (loopEnabled) {
      canScrollLeftRef.current = true
      canScrollRightRef.current = true
      setCanScrollLeft(true)
      setCanScrollRight(true)
    }
  }, [loopEnabled])

  const checkScrollImmediate = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    if (loopEnabledRef.current) {
      if (!canScrollLeftRef.current) {
        canScrollLeftRef.current = true
        setCanScrollLeft(true)
      }
      if (!canScrollRightRef.current) {
        canScrollRightRef.current = true
        setCanScrollRight(true)
      }
      return
    }
    const { scrollLeft, scrollWidth, clientWidth } = el
    const nextCanLeft = scrollLeft > 10
    const nextCanRight = scrollLeft < scrollWidth - clientWidth - 10

    if (nextCanLeft !== canScrollLeftRef.current) {
      canScrollLeftRef.current = nextCanLeft
      setCanScrollLeft(nextCanLeft)
    }
    if (nextCanRight !== canScrollRightRef.current) {
      canScrollRightRef.current = nextCanRight
      setCanScrollRight(nextCanRight)
    }
  }, [])

  const scheduleCheckScroll = useCallback(() => {
    if (scrollCheckRafRef.current) return
    scrollCheckRafRef.current = requestAnimationFrame(() => {
      scrollCheckRafRef.current = 0
      checkScrollImmediate()
    })
  }, [checkScrollImmediate])

  useEffect(() => {
    scheduleCheckScroll()
    const el = scrollRef.current
    if (!el) return

    const onScroll = () => scheduleCheckScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (scrollCheckRafRef.current) cancelAnimationFrame(scrollCheckRafRef.current)
      scrollCheckRafRef.current = 0
    }
  }, [products.length, scheduleCheckScroll])

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setIsInView(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries?.[0]
        setIsInView(Boolean(e?.isIntersecting))
      },
      { threshold: 0.15 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const onVis = () => {
      try {
        setIsPageVisible(document.visibilityState !== 'hidden')
      } catch {}
    }
    try {
      document.addEventListener('visibilitychange', onVis)
      onVis()
      return () => document.removeEventListener('visibilitychange', onVis)
    } catch {
      return undefined
    }
  }, [])

  // Auto-scroll effect
  useEffect(() => {
    if (!autoScroll || loading || products.length === 0 || isPaused) return
    if (!isInView || !isPageVisible || prefersReducedMotion) return
    
    const el = scrollRef.current
    if (!el) return

    const speed = Math.max(0.2, Math.min(6, Number(autoScrollSpeed) || 1))
    let animationId
    let lastTs = 0
    let carry = 0

    const animate = (ts) => {
      if (!lastTs) lastTs = ts
      const delta = ts - lastTs
      lastTs = ts
      const step = (delta / 16.67) * speed

      carry += step
      const px = Math.trunc(carry)
      carry -= px

      if (!px) {
        animationId = requestAnimationFrame(animate)
        return
      }

      if (loopEnabled) {
        const half = Math.floor(el.scrollWidth / 2)
        el.scrollLeft += px
        if (el.scrollLeft >= half) {
          el.scrollLeft -= half
        }
      } else {
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 1) {
          el.scrollLeft = 0
        } else {
          el.scrollLeft += px
        }
      }
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [autoScroll, loading, products.length, isPaused, isInView, isPageVisible, prefersReducedMotion, autoScrollSpeed, loopEnabled])

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 340
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  const headerClass = headerVariant === 'pill'
    ? `section-header pill ${pillSize === 'sm' ? 'pill-sm' : ''}`
    : `section-header bg-gradient-to-r ${bgGradient}`

  const renderList = loopEnabled ? [...products, ...products] : products

  if (products.length === 0 && !loading) return null

  return (
    <section ref={sectionRef} className="horizontal-product-section">
      {/* Ultra Premium Header */}
      <div className={headerClass}>
        <div className={`header-content ${centerHeader ? 'centered' : ''}`}>
          {headerVariant === 'pill' ? (
            <div className={`title-wrapper ${centerHeader ? 'centered' : ''}`}>
              <div className="title-pill">
                <h2 className="section-title">{title}</h2>
              </div>
            </div>
          ) : (
            <div className={`title-wrapper ${centerHeader ? 'centered' : ''}`}>
              {showTitleIcon ? (
                <span className="title-icon">
                  {title === 'Trending Products' && '🔥'}
                  {title === 'Super Deals' && '⚡'}
                  {title === 'Top Selling' && '🏆'}
                </span>
              ) : null}
              <h2 className="section-title">{title}</h2>
            </div>
          )}
          <p className="section-subtitle">
            {title === 'Trending Products' && 'Hot items everyone loves'}
            {title === 'Super Deals' && 'Limited time offers'}
            {title === 'Top Selling' && 'Best sellers this week'}
            {title === 'BuySial Recommendations' && 'Handpicked picks from BuySial'}
            {title === 'Video Products' && 'Watch, explore, and shop instantly'}
          </p>
        </div>
        <button 
          className="scroll-arrow right-arrow"
          onClick={() => scroll('right')}
          style={{ opacity: canScrollRight ? 1 : 0.3 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Products Container */}
      <div 
        className="products-wrapper"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setTimeout(() => setIsPaused(false), 2000)}
      >
        {/* Left Arrow */}
        {(loopEnabled || canScrollLeft) && (
          <button className="nav-arrow left" onClick={() => scroll('left')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Products Scroll */}
        <div className="products-scroll" ref={scrollRef}>
          {loading ? (
            <div className="loading-state">
              {[1,2,3,4].map(i => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-image"></div>
                  <div className="skeleton-text"></div>
                  <div className="skeleton-price"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="products-row">
              {renderList.map((p, idx) => (
                <div key={`${p._id}-${idx}`} className="product-item">
                  <ProductCardMini 
                    product={p} 
                    selectedCountry={selectedCountry}
                    showVideo={showVideo}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Arrow */}
        {(loopEnabled || canScrollRight) && !loading && (
          <button className="nav-arrow right" onClick={() => scroll('right')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      <style jsx>{`
        .horizontal-product-section {
          margin: 4px 0;
          background: #f4f4f4;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: none;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          color: white;
          border-radius: 16px 16px 0 0;
        }

        .section-header.pill {
          background: linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%);
          color: #111827;
          border-bottom: 1px solid rgba(249, 115, 22, 0.22);
          box-shadow: 0 10px 24px rgba(234, 88, 12, 0.10);
          position: relative;
          justify-content: center;
        }

        .header-content {
          flex: 1;
          width: 100%;
        }

        .header-content.centered {
          text-align: center;
        }

        .title-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .title-wrapper.centered {
          justify-content: center;
        }

        .title-icon {
          font-size: 20px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }

        .section-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
          text-shadow: 0 2px 4px rgba(0,0,0,0.15);
          letter-spacing: -0.3px;
        }

        .section-header.pill .section-title {
          font-weight: 800;
          font-size: 19px;
          text-shadow: 0 2px 0 rgba(0,0,0,0.14);
        }

        .title-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 9px 22px;
          border-radius: 999px;
          background: linear-gradient(180deg, #fb923c 0%, #ea580c 100%);
          box-shadow: 0 8px 18px rgba(234, 88, 12, 0.22), inset 0 1px 0 rgba(255,255,255,0.35);
          border: 1px solid rgba(255,255,255,0.55);
        }

        .section-header.pill .section-title {
          color: rgba(255,255,255,0.96);
        }

        .section-subtitle {
          font-size: 12px;
          margin: 4px 0 0 0;
          opacity: 0.9;
          font-weight: 400;
        }

        .section-header.pill .section-subtitle {
          opacity: 1;
          font-weight: 600;
          color: rgba(17, 24, 39, 0.7);
          text-shadow: none;
        }

        .scroll-arrow {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255,255,255,0.25);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .section-header.pill .scroll-arrow {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
        }

        .section-header.pill .scroll-arrow {
          background: rgba(255,255,255,0.96);
          border: 1px solid rgba(234, 88, 12, 0.28);
        }

        .section-header.pill.pill-sm .title-pill {
          padding: 5px 12px;
        }

        .section-header.pill.pill-sm .section-title {
          font-size: 13px;
        }

        .section-header.pill.pill-sm .section-subtitle {
          font-size: 10px;
        }

        .scroll-arrow:hover {
          background: rgba(255,255,255,0.4);
        }

        .scroll-arrow svg {
          width: 18px;
          height: 18px;
          color: white;
        }

        .section-header.pill .scroll-arrow svg {
          color: #ea580c;
        }

        .products-wrapper {
          position: relative;
          padding: 8px 0;
        }

        .nav-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: white;
          border: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          transition: all 0.2s;
        }

        .nav-arrow:hover {
          transform: translateY(-50%) scale(1.1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .nav-arrow.left {
          left: 8px;
        }

        .nav-arrow.right {
          right: 8px;
        }

        .nav-arrow svg {
          width: 20px;
          height: 20px;
          color: #f97316;
        }

        .products-scroll {
          overflow-x: auto;
          scroll-behavior: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 0 8px;
        }

        .products-scroll::-webkit-scrollbar {
          display: none;
        }

        .products-row {
          display: flex;
          gap: 6px;
          padding: 0;
        }

        .product-item {
          flex: 0 0 140px;
          min-width: 140px;
        }

        .loading-state {
          display: flex;
          gap: 6px;
          padding: 0;
        }

        .skeleton-card {
          flex: 0 0 140px;
          background: #f8fafc;
          border-radius: 12px;
          overflow: hidden;
        }

        .skeleton-image {
          height: 140px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        .skeleton-text {
          height: 12px;
          margin: 10px 10px 6px;
          background: #e2e8f0;
          border-radius: 4px;
        }

        .skeleton-price {
          height: 14px;
          width: 60%;
          margin: 0 10px 10px;
          background: #e2e8f0;
          border-radius: 4px;
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @media (min-width: 768px) {
          .product-item {
            flex: 0 0 180px;
            min-width: 180px;
          }

          .section-title {
            font-size: 18px;
          }
        }
      `}</style>
    </section>
  )
})
