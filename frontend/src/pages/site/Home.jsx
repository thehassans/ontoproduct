import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/layout/Header'
import { apiGet, mediaUrl } from '../../api'
import ProductCardMini from '../../components/ecommerce/ProductCardMini'
import ShoppingCart from '../../components/ecommerce/ShoppingCart'
import { detectCountryCode } from '../../utils/geo'
import PremiumHeroBanner from '../../components/ecommerce/PremiumHeroBanner'
import MobileBottomNav from '../../components/ecommerce/MobileBottomNav'
import QuickCategories from '../../components/ecommerce/QuickCategories'
import HorizontalProductSection from '../../components/ecommerce/HorizontalProductSection'
import PremiumFooter from '../../components/layout/PremiumFooter'

export default function Home(){
  const [loading, setLoading] = useState(true)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [categoryCounts, setCategoryCounts] = useState({})
  const [homeHeadline, setHomeHeadline] = useState({
    enabled: true,
    badge: 'Premium Shopping',
    title: 'Discover premium products, delivered fast',
    subtitle: 'Curated collections, trusted quality, and seamless shopping across the Gulf.',
    chips: [],
    speed: 18,
    bg1: '#0b5ed7',
    bg2: '#f97316',
    textColor: '#ffffff'
  })
  const [selectedCountry, setSelectedCountry] = useState(() => {
    try { return localStorage.getItem('selected_country') || 'GB' } catch { return 'GB' }
  })
  const [displayedProducts, setDisplayedProducts] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [productsPage, setProductsPage] = useState(1)
  const [productsTotal, setProductsTotal] = useState(0)
  const [hotSellingCategories, setHotSellingCategories] = useState([])
  const productsPerPage = 20
  const loaderRef = useRef(null)

  const mixByCategory = useCallback((list) => {
    const rows = Array.isArray(list) ? list : []
    const buckets = new Map()
    const order = []
    for (const p of rows) {
      const cat = String(p?.category || 'Other')
      if (!buckets.has(cat)) {
        buckets.set(cat, [])
        order.push(cat)
      }
      buckets.get(cat).push(p)
    }
    const idx = Object.fromEntries(order.map((c) => [c, 0]))
    const out = []
    let added = true
    while (added) {
      added = false
      for (const c of order) {
        const arr = buckets.get(c) || []
        const i = idx[c] || 0
        if (i < arr.length) {
          out.push(arr[i])
          idx[c] = i + 1
          added = true
        }
      }
    }
    return out
  }, [])

  const rotateToAvoidSameCategory = useCallback((prevLast, nextList) => {
    const next = Array.isArray(nextList) ? nextList : []
    if (!next.length || !prevLast) return next
    const lastCat = String(prevLast?.category || 'Other')
    const firstCat = String(next[0]?.category || 'Other')
    if (!lastCat || lastCat !== firstCat) return next
    const idx = next.findIndex((p) => String(p?.category || 'Other') !== lastCat)
    if (idx <= 0) return next
    return [...next.slice(idx), ...next.slice(0, idx)]
  }, [])

  // Infinite scroll observer
  const fetchProductsPage = useCallback(async (pageNum) => {
    const qs = new URLSearchParams()
    qs.set('page', String(pageNum))
    qs.set('limit', String(productsPerPage))
    qs.set('sort', 'newest')
    if (selectedCountry) qs.set('country', String(selectedCountry))
    return await apiGet(`/api/products/public?${qs.toString()}`)
  }, [productsPerPage, selectedCountry])

  const loadMoreProducts = useCallback(() => {
    if (loadingMore || !hasMore) return
    const nextPage = productsPage + 1
    setLoadingMore(true)
    fetchProductsPage(nextPage)
      .then((res) => {
        const list = Array.isArray(res?.products) ? res.products : []
        const mixed = mixByCategory(list)
        const pages = Number(res?.pagination?.pages) || 1
        const total = Number(res?.pagination?.total) || 0
        setDisplayedProducts((prev) => {
          const rotated = rotateToAvoidSameCategory(prev?.[prev.length - 1], mixed)
          return [...prev, ...rotated]
        })
        setProductsTotal(total)
        setProductsPage(nextPage)
        setHasMore(nextPage < pages)
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }, [loadingMore, hasMore, productsPage, fetchProductsPage, mixByCategory, rotateToAvoidSameCategory])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreProducts()
        }
      },
      { threshold: 0.1, rootMargin: '800px 0px' }
    )
    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loadMoreProducts])

  useEffect(()=>{
    let alive = true
    ;(async()=>{
      try{
        setLoading(true)
        const res = await fetchProductsPage(1)
        const list = Array.isArray(res?.products) ? res.products : []
        const mixed = mixByCategory(list)
        const pages = Number(res?.pagination?.pages) || 1
        const total = Number(res?.pagination?.total) || 0
        if (alive) {
          setDisplayedProducts(mixed)
          setProductsPage(1)
          setProductsTotal(total)
          setHasMore(1 < pages)
        }
      }catch{
        if (alive) {
          setDisplayedProducts([])
          setProductsPage(1)
          setProductsTotal(0)
          setHasMore(false)
        }
      }finally{ if (alive) setLoading(false) }
    })()
    return ()=>{ alive = false }
  },[fetchProductsPage, mixByCategory])

  // Persist selected country
  useEffect(()=>{
    try { localStorage.setItem('selected_country', selectedCountry) } catch {}
  },[selectedCountry])

  // Listen for country changes from Header
  useEffect(() => {
    const handleCountryChange = (e) => {
      if (e.detail?.code) {
        setSelectedCountry(e.detail.code)
      }
    }
    window.addEventListener('countryChanged', handleCountryChange)
    return () => window.removeEventListener('countryChanged', handleCountryChange)
  }, [])

  // On first visit, auto-detect country if none saved
  useEffect(() => {
    (async () => {
      try {
        const saved = localStorage.getItem('selected_country')
        if (!saved) {
          const code = await detectCountryCode()
          setSelectedCountry(code)
          try { localStorage.setItem('selected_country', code) } catch {}
        }
      } catch {}
    })()
  }, [])

  // Load category usage counts for hiding empty categories
  useEffect(() => {
    let alive = true
    ;(async()=>{
      try{
        const res = await apiGet(`/api/products/public/categories-usage?country=${encodeURIComponent(selectedCountry)}`)
        if (alive) setCategoryCounts(res?.counts || {})
      }catch{
        if (alive) setCategoryCounts({})
      }
    })()
    return ()=>{ alive = false }
  }, [selectedCountry])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await apiGet('/api/settings/website/content?page=home')
        const elements = Array.isArray(res?.content?.elements) ? res.content.elements : []
        const getText = (id, fallback = '') => {
          const el = elements.find((e) => e?.id === id)
          return typeof el?.text === 'string' ? el.text : fallback
        }

        const enabledRaw = getText('homeHeadline_enabled', 'true')
        const enabled = String(enabledRaw).toLowerCase() !== 'false'
        const badge = getText('homeHeadline_badge', homeHeadline.badge)
        const title = getText('homeHeadline_title', homeHeadline.title)
        const subtitle = getText('homeHeadline_subtitle', homeHeadline.subtitle)
        const chip1 = getText('homeHeadline_chip1', homeHeadline.chips?.[0] || '')
        const chip2 = getText('homeHeadline_chip2', homeHeadline.chips?.[1] || '')
        const chip3 = getText('homeHeadline_chip3', homeHeadline.chips?.[2] || '')
        const chip4 = getText('homeHeadline_chip4', homeHeadline.chips?.[3] || '')
        const speedRaw = getText('homeHeadline_speed', String(homeHeadline.speed ?? 18))
        const bg1 = getText('homeHeadline_bg1', homeHeadline.bg1)
        const bg2 = getText('homeHeadline_bg2', homeHeadline.bg2)
        const textColor = getText('homeHeadline_textColor', homeHeadline.textColor || '#ffffff')

        const hasTickerConfig = elements.some((e) =>
          e?.id === 'homeHeadline_speed' ||
          e?.id === 'homeHeadline_bg1' ||
          e?.id === 'homeHeadline_bg2' ||
          e?.id === 'homeHeadline_textColor'
        )

        const legacyDefaultSet = new Set(['Trending', 'Categories', 'Super Deals', 'Discover'])
        const rawChips = [chip1, chip2, chip3, chip4].filter(Boolean)
        const chips = hasTickerConfig
          ? rawChips
          : rawChips.filter((c) => !legacyDefaultSet.has(String(c).trim()))

        const speedNum = Number(speedRaw)
        const speed = Number.isFinite(speedNum) && speedNum > 0 ? speedNum : (homeHeadline.speed ?? 18)

        if (alive) {
          setHomeHeadline({
            enabled,
            badge,
            title,
            subtitle,
            chips,
            speed,
            bg1,
            bg2,
            textColor
          })
        }
      } catch (_err) {
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const entries = Object.entries(categoryCounts || {}).filter(([_, count]) => Number(count) > 0)
    entries.sort((a, b) => {
      if (a[0] === 'Other') return 1
      if (b[0] === 'Other') return -1
      return Number(b[1]) - Number(a[1])
    })
    const top4 = entries.slice(0, 4).map(([name]) => String(name))
    if (!top4.length) {
      setHotSellingCategories([])
      return undefined
    }
    ;(async () => {
      try {
        const results = await Promise.all(
          top4.map(async (name) => {
            try {
              const qs = new URLSearchParams()
              qs.set('page', '1')
              qs.set('limit', '3')
              qs.set('sort', 'newest')
              qs.set('category', name)
              if (selectedCountry) qs.set('country', String(selectedCountry))
              const res = await apiGet(`/api/products/public?${qs.toString()}`)
              const products = Array.isArray(res?.products) ? res.products : []
              return { name, products }
            } catch {
              return { name, products: [] }
            }
          })
        )
        if (alive) setHotSellingCategories(results)
      } catch {
        if (alive) setHotSellingCategories([])
      }
    })()
    return () => {
      alive = false
    }
  }, [categoryCounts])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f4f4' }}>
      <Header onCartClick={() => setIsCartOpen(true)} />

      <h1 className="sr-only">BuySial Commerce</h1>

      {/* Hero Banner */}
      <PremiumHeroBanner />

      {homeHeadline?.enabled ? (
        <section className="max-w-7xl mx-auto px-1 sm:px-2 lg:px-4">
          <div
            className="relative overflow-hidden rounded-2xl shadow-xl border border-white"
            style={{
              background: `linear-gradient(90deg, ${homeHeadline?.bg1 || '#0b5ed7'}, ${homeHeadline?.bg2 || '#f97316'})`,
            }}
          >
            <div className="homeHeadlineMarqueeViewport">
              <div
                className="homeHeadlineMarqueeTrack"
                style={{
                  animationDuration: `${Math.max(5, Math.min(300, Number(homeHeadline?.speed) || 18))}s`,
                }}
              >
                <div className="homeHeadlineMarqueeGroup" style={{ color: homeHeadline?.textColor || '#ffffff' }}>
                  {[homeHeadline?.badge, homeHeadline?.title, homeHeadline?.subtitle, ...(homeHeadline?.chips || [])]
                    .map((t) => (typeof t === 'string' ? t.trim() : ''))
                    .filter(Boolean)
                    .map((t, idx) => (
                      <span key={`a-${idx}`} className="homeHeadlineMarqueeItem">{t}</span>
                    ))}
                </div>
                <div className="homeHeadlineMarqueeGroup" aria-hidden="true" style={{ color: homeHeadline?.textColor || '#ffffff' }}>
                  {[homeHeadline?.badge, homeHeadline?.title, homeHeadline?.subtitle, ...(homeHeadline?.chips || [])]
                    .map((t) => (typeof t === 'string' ? t.trim() : ''))
                    .filter(Boolean)
                    .map((t, idx) => (
                      <span key={`b-${idx}`} className="homeHeadlineMarqueeItem">{t}</span>
                    ))}
                </div>
              </div>
            </div>
            <style jsx>{`
              .homeHeadlineMarqueeViewport {
                overflow: hidden;
                white-space: nowrap;
                padding: 10px 14px;
              }
              .homeHeadlineMarqueeTrack {
                display: inline-flex;
                gap: 0;
                will-change: transform;
                animation-name: homeHeadlineMarquee;
                animation-timing-function: linear;
                animation-iteration-count: infinite;
              }
              .homeHeadlineMarqueeGroup {
                display: inline-flex;
                align-items: center;
                gap: 18px;
                padding-right: 18px;
                font-weight: 700;
                font-size: 13px;
                letter-spacing: 0.2px;
              }
              .homeHeadlineMarqueeItem {
                display: inline-flex;
                align-items: center;
                gap: 10px;
              }
              .homeHeadlineMarqueeItem::after {
                content: "|";
                opacity: 0.75;
                margin-left: 18px;
              }
              .homeHeadlineMarqueeGroup .homeHeadlineMarqueeItem:last-child::after {
                content: "";
                margin-left: 0;
              }
              @keyframes homeHeadlineMarquee {
                0% {
                  transform: translateX(0);
                }
                100% {
                  transform: translateX(-50%);
                }
              }
            `}</style>
          </div>
        </section>
      ) : null}

      {/* Quick Categories - Mobile Style */}
      <QuickCategories />

      {hotSellingCategories.length ? (
        <section className="px-1 sm:px-2 lg:px-4 max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ margin: '4px 0' }}>
            <div
              className="px-4 py-3"
              style={{
                background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ width: 34 }} />
              <div
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: 13,
                  letterSpacing: 0.2,
                  textAlign: 'center',
                  boxShadow: '0 10px 24px rgba(249,115,22,0.25)'
                }}
              >
                Hot Selling Categories
              </div>
              <Link
                to="/catalog"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  border: '1px solid rgba(249,115,22,0.25)',
                  background: 'rgba(255,255,255,0.8)',
                  display: 'grid',
                  placeItems: 'center',
                  textDecoration: 'none',
                  color: '#ea580c'
                }}
                aria-label="View all categories"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 p-2">
              {hotSellingCategories.map((cat) => (
                <Link
                  key={cat.name}
                  to={`/catalog?category=${encodeURIComponent(cat.name)}`}
                  className="rounded-2xl border transition-colors"
                  style={{ textDecoration: 'none', background: '#fff7ed', borderColor: '#fed7aa' }}
                >
                  <div className="p-3" style={{ display: 'grid', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div className="text-sm font-bold text-orange-500" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', width: '100%' }}>
                          {cat.name}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {cat.products.slice(0, 3).map((p) => (
                        <div key={p._id} style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#ffffff' }}>
                          <img
                            src={mediaUrl(p?.images?.[0] || p?.imagePath || '') || '/placeholder-product.svg'}
                            alt={p?.name || cat.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              e.target.onerror = null
                              e.target.src = '/placeholder-product.svg'
                            }}
                          />
                        </div>
                      ))}
                      {cat.products.length === 0 ? (
                        <div className="text-xs text-gray-500">No products yet</div>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className="px-1 sm:px-2 lg:px-4 max-w-7xl mx-auto">
        <HorizontalProductSection
          title="BuySial Recommendations"
          filter="recommended"
          bgGradient="from-blue-500 to-orange-500"
          selectedCountry={selectedCountry}
          limit={20}
          centerHeader={true}
          showTitleIcon={false}
          headerVariant="pill"
          pillSize="sm"
          autoScrollSpeed={0.5}
        />
      </div>

      {/* Video Products */}
      <div className="px-1 sm:px-2 lg:px-4 max-w-7xl mx-auto">
        <HorizontalProductSection 
          title="Video Products"
          bgGradient="from-blue-600 to-orange-500"
          selectedCountry={selectedCountry}
          limit={50}
          showVideo={true}
          centerHeader={true}
          showTitleIcon={false}
          headerVariant="pill"
          pillSize="sm"
          autoScrollSpeed={0.5}
        />
      </div>

      {/* Stats Section - Hidden on mobile */}
      <section className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {[
            { number: '10,000+', label: 'Products', icon: '📦', color: 'from-orange-500 to-orange-600' },
            { number: '50,000+', label: 'Monthly Orders', icon: '🛒', color: 'from-blue-500 to-blue-600' },
            { number: '500+', label: 'Active Brands', icon: '⭐', color: 'from-purple-500 to-purple-600' },
            { number: '10+', label: 'Countries', icon: '🌍', color: 'from-green-500 to-green-600' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-all hover:-translate-y-1 border border-gray-100">
              <div className="text-4xl mb-3">{stat.icon}</div>
              <div className={`text-3xl sm:text-4xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-1`}>
                {stat.number}
              </div>
              <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>


      {/* All Products with Pagination */}
      <section className="py-8 md:py-16" style={{ backgroundColor: '#f4f4f4' }}>
        <div className="max-w-7xl mx-auto px-1 sm:px-2 lg:px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl md:text-3xl font-bold text-gray-900">All Products</h2>
              <p className="text-sm md:text-base text-gray-500 mt-1">Browse our complete collection</p>
            </div>
            <Link 
              to="/catalog" 
              className="text-orange-500 text-sm font-medium flex items-center gap-1 hover:text-orange-600"
            >
              View All
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📦</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No products available</h3>
              <p className="text-gray-600">Check back soon for new arrivals!</p>
            </div>
          ) : (
            <>
              <div className="taobao-grid">
                {displayedProducts.map((p) => (
                  <ProductCardMini key={p._id} product={p} selectedCountry={selectedCountry} showVideo={true} />
                ))}
              </div>
              <style jsx>{`
                .taobao-grid {
                  display: grid;
                  grid-template-columns: repeat(2, 1fr);
                  gap: 4px;
                  padding: 0;
                  background: #f4f4f4;
                }
                @media (min-width: 640px) {
                  .taobao-grid {
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                  }
                }
                @media (min-width: 1024px) {
                  .taobao-grid {
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                  }
                }
                @media (min-width: 1280px) {
                  .taobao-grid {
                    grid-template-columns: repeat(5, 1fr);
                  }
                }
              `}</style>
              
              {/* Infinite Scroll Loader */}
              <div ref={loaderRef} className="flex justify-center py-8">
                {loadingMore && hasMore && (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-600">Loading more products...</span>
                  </div>
                )}
                {!loadingMore && hasMore && displayedProducts.length > 0 && (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg border-2 border-orange-500 text-orange-500 font-semibold hover:bg-orange-50 transition-all"
                    onClick={loadMoreProducts}
                  >
                    Load More
                  </button>
                )}
                {!hasMore && displayedProducts.length > 0 && (
                  <div className="text-center">
                    <p className="text-gray-500 text-sm mb-4">You've seen all {productsTotal || displayedProducts.length} products</p>
                    <Link 
                      to="/catalog" 
                      className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg border-2 border-orange-500 text-orange-500 font-semibold hover:bg-orange-50 transition-all"
                    >
                      Browse Catalog
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <PremiumFooter />

      {/* Shopping Cart Sidebar */}
      <ShoppingCart 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onCartClick={() => setIsCartOpen(true)} />
    </div>
  )
}
